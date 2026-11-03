#!/usr/bin/env node

/**
 * @file universal-extractor.js
 * @description Autonomous Cloud Extractor for Active Desks v3.0.
 * Invoked by GitHub Actions on repository_dispatch or manual trigger.
 * 
 * Features 4-Stage Multi-Turn Agentic Pipeline with 3-Strikes Critic:
 *   Stage 1: Raw Extraction (Sensory Ingestion - Transcript, OCR, Claims)
 *   Stage 2: Deep Grounding & Investigation (Live Search past bait/funnels)
 *   Stage 3: Composition (Synthesize into Universal Card Schema)
 *   Stage 4: Critic & Verification (Network probe + Semantic truth check + 3 Strikes Out)
 * 
 * Saves final card payload + full pipelineStages audit trail directly to Cloud Firestore.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync, execFileSync } from 'child_process';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, getDocs } from 'firebase/firestore';

const FIREBASE_CONFIG = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCEZkpK58N93cpExYcycGPW1sOyUNM2OAg",
  authDomain: "active-desks-v3.firebaseapp.com",
  projectId: "active-desks-v3",
  storageBucket: "active-desks-v3.firebasestorage.app",
  messagingSenderId: "947262879848",
  appId: "1:947262879848:web:0d351c547fa43669c7e3dd"
};

const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const TARGET_URL = process.env.TARGET_URL || process.argv[2] || '';
const CAPTURE_ID = process.env.CAPTURE_ID || process.argv[3] || '';

/**
 * Safely parses JSON from Gemini responses, handling markdown code fences and partial text.
 * 
 * @param {string} text - Raw model response text.
 * @returns {object|null}
 */
function parseJsonFromResponse(text) {
  if (!text) return null;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonStr = match ? match[1] : text;

  try {
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose > firstOpen) {
      try {
        return JSON.parse(text.substring(firstOpen, lastClose + 1));
      } catch (err2) {
        // Failed fallback parsing
      }
    }
  }
  return null;
}

/**
 * Determines whether a target URL points to a video stream (Reels, TikTok, YouTube).
 */
function isVideoLink(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('instagram.com/reel/') || url.includes('instagram.com/reels/') || url.includes('instagram.com/tv/')) {
    return true;
  }
  if (url.includes('tiktok.com') || url.includes('youtube.com') || url.includes('youtu.be')) {
    return true;
  }
  return false;
}

/**
 * Tiered Media Downloader via yt-dlp & ffmpeg.
 */
function fetchMediaBuffer(url) {
  if (!url || typeof url !== 'string' || !isVideoLink(url)) return null;

  const cleanUrl = url.split('?')[0];

  // Tier 1: Full Video (.mp4 <= 20MB, 720p)
  const tempVideoFile = path.join(os.tmpdir(), `media-vid-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.mp4`);
  try {
    console.log(`-> [Tier 1] Attempting 720p video+audio extraction via yt-dlp: ${cleanUrl}`);
    execFileSync('yt-dlp', [
      '-S', 'res:720,ext:mp4:m4a',
      '-f', 'bv*[height<=720][ext=mp4]+ba[ext=m4a]/b[height<=720][ext=mp4]/bestvideo[height<=720]+bestaudio/best',
      '--max-filesize', '20M',
      '--no-playlist',
      '--no-warnings',
      '-o', tempVideoFile,
      cleanUrl
    ], { timeout: 45000, stdio: ['ignore', 'pipe', 'pipe'] });

    if (fs.existsSync(tempVideoFile)) {
      const stats = fs.statSync(tempVideoFile);
      if (stats.size > 1000 && stats.size <= 20 * 1024 * 1024) {
        const videoBuffer = fs.readFileSync(tempVideoFile);
        fs.unlinkSync(tempVideoFile);
        console.log(`✓ [Tier 1 Success] Extracted full video (.mp4, ${Math.round(videoBuffer.length / 1024)} KB).`);
        return {
          mimeType: 'video/mp4',
          data: videoBuffer.toString('base64'),
          status: 'video_extracted'
        };
      }
      fs.unlinkSync(tempVideoFile);
    }
  } catch (err) {
    console.warn(`Tier 1 video download skipped/failed (${err.message}). Trying Tier 2 audio fallback...`);
    if (fs.existsSync(tempVideoFile)) {
      try { fs.unlinkSync(tempVideoFile); } catch (e) {}
    }
  }

  // Tier 2: Audio Only (.mp3 <= 15MB)
  const tempAudioFile = path.join(os.tmpdir(), `media-aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.mp3`);
  try {
    console.log(`-> [Tier 2] Attempting audio-only extraction via yt-dlp: ${cleanUrl}`);
    execFileSync('yt-dlp', [
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
      '--no-playlist',
      '--no-warnings',
      '-o', tempAudioFile,
      cleanUrl
    ], { timeout: 35000, stdio: ['ignore', 'pipe', 'pipe'] });

    if (fs.existsSync(tempAudioFile)) {
      const stats = fs.statSync(tempAudioFile);
      if (stats.size > 500 && stats.size <= 15 * 1024 * 1024) {
        const audioBuffer = fs.readFileSync(tempAudioFile);
        fs.unlinkSync(tempAudioFile);
        console.log(`✓ [Tier 2 Success] Extracted voiceover audio (.mp3, ${Math.round(audioBuffer.length / 1024)} KB).`);
        return {
          mimeType: 'audio/mp3',
          data: audioBuffer.toString('base64'),
          status: 'audio_extracted'
        };
      }
      fs.unlinkSync(tempAudioFile);
    }
  } catch (err) {
    console.warn(`Tier 2 audio extraction skipped/failed (${err.message}).`);
    if (fs.existsSync(tempAudioFile)) {
      try { fs.unlinkSync(tempAudioFile); } catch (e) {}
    }
  }

  return null;
}

/**
 * Queries Cloud Firestore to discover all built-in and user-promoted domain slugs.
 */
async function fetchAvailableDomains(db) {
  const baseDomains = ['recipe', 'book', 'tech', 'game', 'fiber', 'misc'];
  const domainSet = new Set(baseDomains);
  const canonicalReverse = {
    reading: 'book',
    kitchen: 'recipe',
    gaming: 'game',
    fiber: 'fiber',
    tech: 'tech'
  };

  try {
    const desksSnap = await getDocs(collection(db, 'desks'));
    desksSnap.forEach(docSnap => {
      if (docSnap.id === 'active_selection') return;
      const data = docSnap.data() || {};
      const raw = (data.domain || docSnap.id || '').toLowerCase().trim();
      const slug = canonicalReverse[raw] || raw;
      if (slug && slug !== 'link') domainSet.add(slug);
    });

    const capturesSnap = await getDocs(collection(db, 'captures'));
    capturesSnap.forEach(docSnap => {
      const data = docSnap.data() || {};
      const raw = (data.domain || '').toLowerCase().trim();
      if (raw && raw !== 'link') domainSet.add(raw);
    });
  } catch (err) {
    console.warn('Could not query dynamic domains from Firestore; using base domains:', err.message);
  }

  return Array.from(domainSet);
}

/**
 * Centralized fresh-context caller for Gemini 3.8 Flash.
 * Ensures each call has zero memory leakage from previous prompts.
 */
async function callFreshGemini(requestParts, tools = [], responseMimeType = null, model = 'gemini-3.8-flash') {
  const bodyPayload = {
    contents: [{ parts: requestParts }]
  };
  if (tools.length > 0) {
    bodyPayload.tools = tools;
  }
  if (responseMimeType) {
    bodyPayload.generationConfig = { responseMimeType };
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(bodyPayload)
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errorBody}`);
  }

  const json = await res.json();
  const candidate = json.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('\n');
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
  const groundedUrls = groundingChunks.map(c => c.web?.uri).filter(Boolean);

  return { text, groundedUrls, raw: candidate };
}

/**
 * Tests whether a URL resolves and returns an HTTP 200 within 5 seconds.
 */
async function testUrlReachability(url) {
  if (!url || typeof url !== 'string' || !url.startsWith('http')) {
    return { ok: false, status: 0, reason: 'Invalid URL format' };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      redirect: 'follow',
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.status >= 200 && res.status < 400) {
      const text = await res.text().catch(() => '');
      return { ok: true, status: res.status, text: text.slice(0, 5000), finalUrl: res.url };
    }
    return { ok: false, status: res.status, reason: `HTTP error status ${res.status}` };
  } catch (err) {
    return { ok: false, status: 0, reason: err.message };
  }
}

/**
 * STAGE 1: Raw Extraction (Sensory Ingestion)
 * Completely objective transcription and cataloging of claims, on-screen text, and captions.
 */
async function runStage1_RawExtraction(mediaResult, targetUrl, mediaTitle, creatorHandle, captionText) {
  console.log('-> [Stage 1: Raw Extraction] Ingesting media and transcripts verbatim...');
  const parts = [];

  if (mediaResult && mediaResult.data) {
    parts.push({
      inlineData: {
        mimeType: mediaResult.mimeType,
        data: mediaResult.data
      }
    });
  } else if (isVideoLink(targetUrl)) {
    // Attempt direct URL stream
    parts.push({
      fileData: {
        fileUri: targetUrl,
        mimeType: 'video/mp4'
      }
    });
  }

  const prompt = `
You are the Sensory Ingestion Agent for Active Desks.
Your sole job is to objectively document EVERYTHING presented in this post without summarizing or formatting into a final card.

Post Metadata:
- URL: ${targetUrl}
- Title / Headline: ${mediaTitle || 'None'}
- Creator: ${creatorHandle || 'Unknown'}
- Scraped Caption / Description: ${captionText || 'None'}

TASKS:
1. AUDIO / SPEECH: Transcribe everything spoken or narrated verbatim or in high detail.
2. VISUAL / OCR: Read all on-screen text overlays, title cards, book covers, diagrams, tool names, commands, and code snippets shown.
3. CLAIMS & ENTITIES: List every subject, book, anime, paper, tool, or product specifically named or showcased.
4. ENGAGEMENT / BAIT: Identify any calls to action, teasers, or promises (e.g. "Comment X to get Y", "Link in bio for full recipe", "Available at domain.com").

Return ONLY a clean JSON object (enclosed in \`\`\`json ... \`\`\`):
{
  "transcript": "Detailed spoken transcript...",
  "ocrText": "All text visible on screen...",
  "identifiedEntities": ["Subject 1", "Subject 2"],
  "creatorClaims": ["Claim or teaching 1", "Claim or teaching 2"],
  "teasersAndCallsToAction": ["Teaser 1", "Teaser 2"]
}
`;
  parts.push({ text: prompt });

  try {
    const res = await callFreshGemini(parts, [], 'application/json');
    const parsed = parseJsonFromResponse(res.text);
    return parsed || { rawText: res.text };
  } catch (err) {
    console.warn('Stage 1 fallback error:', err.message);
    return {
      transcript: captionText,
      ocrText: mediaTitle,
      identifiedEntities: [mediaTitle],
      creatorClaims: [captionText],
      teasersAndCallsToAction: []
    };
  }
}

/**
 * STAGE 2: Deep Grounding & Investigation (Live Search)
 * Investigates the raw claims using Google Search grounding, looking past bait/funnels.
 */
async function runStage2_Investigation(stage1Data, targetUrl, criticFeedback = null) {
  console.log(`-> [Stage 2: Deep Grounding] Searching web for ground truth${criticFeedback ? ' (handling critic feedback)' : ''}...`);

  const feedbackDirective = criticFeedback
    ? `\nPREVIOUS CRITIQUE / REJECTION:
${criticFeedback}
The previous candidate destination or claims failed verification. You MUST actively search for the authentic underlying source, repository, paper, or recipe, OR conclude that no public destination exists.`
    : '';

  const prompt = `
You are the Ground Truth Research Agent for Active Desks.
Your job is to investigate the raw claims from a social media post and find the authentic underlying source material.

RAW INGESTION DOSSIER:
- URL: ${targetUrl}
- Entities: ${JSON.stringify(stage1Data.identifiedEntities || [])}
- Claims: ${JSON.stringify(stage1Data.creatorClaims || [])}
- Teasers / Bait: ${JSON.stringify(stage1Data.teasersAndCallsToAction || [])}
- Transcript & Notes: ${(stage1Data.transcript || '').slice(0, 1000)}
${feedbackDirective}

INVESTIGATION DIRECTIVES:
1. GET PAST BAIT & FUNNELS: Creators often tease content ("Comment for link", "DM me"). Use Google Search grounding to search for the creator's actual open source material, recipe blog, GitHub repo, scientific paper (arXiv), official anime/book listing, or documentation.
2. DO NOT GUESS DOMAINS: Never extrapolate or invent URLs from usernames (e.g. do not guess 'user.io' or 'user.gumroad.com'). Every candidate URL MUST be a real, grounded web result found via search.
3. IDENTIFY CORE WORK: If the post shows an anime clip, game, book, or tech pattern without naming it, search to identify the real work, artist/author, and where it is found.

Return ONLY a clean JSON object (enclosed in \`\`\`json ... \`\`\`):
{
  "investigatedSubject": "True identity of the subject being discussed or recommended",
  "verifiedFacts": ["Fact 1", "Fact 2", "Fact 3"],
  "candidateDestinationUrl": "Direct URL to the real destination article/recipe/repo or null",
  "searchSummary": "1-2 sentence explanation of what was verified via live search"
}
`;

  try {
    const res = await callFreshGemini([{ text: prompt }], [{ googleSearch: {} }]);
    const parsed = parseJsonFromResponse(res.text);
    const candidateUrl = parsed?.candidateDestinationUrl || (res.groundedUrls.length > 0 ? res.groundedUrls[0] : null);

    return {
      investigatedSubject: parsed?.investigatedSubject || stage1Data.identifiedEntities?.[0] || 'Unknown',
      verifiedFacts: parsed?.verifiedFacts || stage1Data.creatorClaims || [],
      candidateDestinationUrl: candidateUrl && candidateUrl.startsWith('http') ? candidateUrl : null,
      groundedSources: res.groundedUrls,
      searchSummary: parsed?.searchSummary || 'Investigated via Google Search.'
    };
  } catch (err) {
    console.warn('Stage 2 search error:', err.message);
    return {
      investigatedSubject: stage1Data.identifiedEntities?.[0] || 'Unknown',
      verifiedFacts: stage1Data.creatorClaims || [],
      candidateDestinationUrl: null,
      groundedSources: [],
      searchSummary: 'Search skipped due to network/model limit.'
    };
  }
}

/**
 * STAGE 3: Composition (Synthesize into Card Schema)
 * Pure synthesis of Stage 1 + Stage 2 into the universal sections schema.
 */
async function runStage3_Composition(stage1Data, stage2Data, availableDomains, targetUrl) {
  console.log('-> [Stage 3: Composition] Synthesizing into universal card schema...');

  const domainUnion = availableDomains.map(d => `"${d}"`).join(' | ');

  const prompt = `
You are the Composition Agent for Active Desks.
Synthesize the verified research into a clean, structured personal card.

SOURCE DOSSIER:
- Source URL: ${targetUrl}
- Investigated Subject: ${stage2Data.investigatedSubject}
- Verified Facts: ${JSON.stringify(stage2Data.verifiedFacts)}
- Raw Claims: ${JSON.stringify(stage1Data.creatorClaims || [])}
- Transcript Excerpt: ${(stage1Data.transcript || '').slice(0, 800)}
- Candidate Destination URL: ${stage2Data.candidateDestinationUrl || 'None'}

COMPOSITION DIRECTIVES:
1. INTENT FIRST: Focus on what the user actually wants when looking back at this card (the actual recommendations, recipe, code, steps, or review).
2. REMOVE SOLICITATIONS: Discard any requests to comment, DM, join private paid communities (Skool, Gumroad, Stan, Discord), or purchase templates.
3. DOMAIN: Must be one of: ${domainUnion}. If none fit, use "misc" with a specific 1-3 word "topic".
4. SECTIONS: Create 1 to 3 logical sections matching how the information is best consumed:
   - "checklist": Checkable supplies, ingredients (with metric gram weights in "detail", e.g. "350g"), or setup prerequisites.
   - "numbered": Sequential instructions, ranked top-N lists, or step-by-step guides.
   - "bullets": Reviews, series/media overviews, takeaways, or specifications.

Return ONLY a valid JSON object matching this schema (enclosed in \`\`\`json ... \`\`\`):
{
  "domain": ${domainUnion},
  "topic": "Concise 1-3 word subject",
  "title": "Clean, descriptive title",
  "summary": "1-2 sentence core takeaway explaining why this was saved",
  "creator": "Creator handle or author",
  "destinationUrl": ${stage2Data.candidateDestinationUrl ? `"${stage2Data.candidateDestinationUrl}"` : "null"},
  "sections": [
    {
      "heading": "Section heading with emoji",
      "style": "checklist" | "numbered" | "bullets",
      "items": [
        { "text": "Primary item, step, or takeaway", "detail": "Optional context, measurement, or spec" }
      ]
    }
  ]
}
`;

  const res = await callFreshGemini([{ text: prompt }], [], 'application/json');
  return parseJsonFromResponse(res.text);
}

/**
 * STAGE 4: Critic & Verification (Automated Truth Audit)
 * 1. Network probe: Tests if candidate URL resolves (HTTP 200).
 * 2. Semantic check: Verifies if the page contains the actual topic vs. generic sales funnel.
 * 3. Content audit: Verifies sections don't contain commercial sales pitch.
 */
async function runStage4_Critic(draftCard, targetUrl) {
  console.log('-> [Stage 4: Critic & Verification] Auditing card against ground truth...');
  const candidateUrl = draftCard?.destinationUrl;

  // 1. If candidate URL provided, test network reachability
  if (candidateUrl && candidateUrl.startsWith('http')) {
    const netTest = await testUrlReachability(candidateUrl);
    if (!netTest.ok) {
      return {
        passed: false,
        strikeReason: `Candidate destination URL "${candidateUrl}" failed network verification (${netTest.reason || 'Dead link/DNS error'}).`
      };
    }

    // 2. Semantic alignment check: Does the destination page match the card?
    const checkPrompt = `
You are the Truth Verification Critic.
Verify whether an external webpage matches the content of an informational card, or if it is an unrelated sales funnel.

CARD TITLE: "${draftCard.title}"
CARD TOPIC: "${draftCard.topic}"
CANDIDATE DESTINATION URL: ${candidateUrl}
FETCHED WEBPAGE CONTENT EXCERPT:
${(netTest.text || '').slice(0, 2500)}

AUDIT QUESTIONS:
1. Does this webpage actually contain the educational article, open recipe, repository, or documentation discussed in the card?
2. Or is it merely a generic commercial landing page, paywall, digital marketing checkout, or gated community sign-up?

Return ONLY a JSON object (enclosed in \`\`\`json ... \`\`\`):
{
  "isAuthenticMatch": true | false,
  "reason": "Brief explanation of why it is an authentic match or a commercial mismatch"
}
`;
    try {
      const semRes = await callFreshGemini([{ text: checkPrompt }], [], 'application/json');
      const parsed = parseJsonFromResponse(semRes.text);
      if (parsed && parsed.isAuthenticMatch === false) {
        return {
          passed: false,
          strikeReason: `Destination page "${candidateUrl}" is a commercial funnel or mismatch: ${parsed.reason}`
        };
      }
    } catch (e) {
      console.warn('Semantic check skipped due to model error:', e.message);
    }
  }

  // 3. Section CTA Check: Ensure no commercial bait survived into sections
  const hasCommercialBait = (draftCard.sections || []).some(s =>
    (s.items || []).some(item => {
      const str = `${item.text || ''} ${item.detail || ''}`.toLowerCase();
      return str.includes('skool') || str.includes('gumroad') || str.includes('comment to get') || str.includes('dm for template');
    })
  );

  if (hasCommercialBait) {
    return {
      passed: false,
      strikeReason: 'Card sections contain commercial sales funnel or call-to-action references instead of pure technical/educational content.'
    };
  }

  return { passed: true, strikeReason: null };
}

/**
 * Main Orchestration Loop with 3-Strikes Enforcement
 */
async function run() {
  console.log('=== Starting Active Desks v3 Multi-Turn Autonomous Extractor ===');
  console.log(`Target URL: ${TARGET_URL}`);
  console.log(`Capture ID: ${CAPTURE_ID}`);

  if (!GEMINI_API_KEY || !TARGET_URL || !CAPTURE_ID) {
    console.error('CRITICAL: GEMINI_API_KEY, TARGET_URL, and CAPTURE_ID are required.');
    process.exit(1);
  }

  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);
  const availableDomains = await fetchAvailableDomains(db);
  console.log(`Available domains: ${availableDomains.join(', ')}`);

  // Gather Media Metadata & Captions via yt-dlp / curl
  let captionText = '';
  let mediaTitle = '';
  let creatorHandle = '';

  try {
    const rawMeta = execSync(`yt-dlp --dump-json --no-warnings "${TARGET_URL}"`, {
      encoding: 'utf8',
      timeout: 30000
    });
    const meta = JSON.parse(rawMeta);
    mediaTitle = meta.title || '';
    captionText = meta.description || '';
    creatorHandle = meta.uploader || meta.channel || '';
    console.log(`✓ Scraped metadata: "${mediaTitle.slice(0, 40)}" by ${creatorHandle}`);
  } catch (err) {
    console.warn('yt-dlp note:', err.message);
  }

  if (!captionText) {
    try {
      const html = execSync(`curl -sL -A "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)" "${TARGET_URL}"`, {
        encoding: 'utf8',
        timeout: 15000,
        maxBuffer: 10 * 1024 * 1024
      });
      const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/i);
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (ogDesc) captionText = ogDesc[1];
      if (ogTitle && !mediaTitle) mediaTitle = ogTitle[1];
    } catch (e) {
      console.warn('OpenGraph scraping failed:', e.message);
    }
  }

  // Determine Media Track
  const isVideo = isVideoLink(TARGET_URL);
  let mediaResult = null;
  let mediaStatus = 'text_images';
  let extractionNote = 'Static post / article format; extracted from post text & metadata.';

  if (isVideo) {
    mediaResult = fetchMediaBuffer(TARGET_URL);
    if (mediaResult?.status === 'video_extracted') {
      mediaStatus = 'video_extracted';
      extractionNote = '720p video frames (OCR) and voiceover audio analyzed by Gemini Multimodal.';
    } else if (mediaResult?.status === 'audio_extracted') {
      mediaStatus = 'audio_extracted';
      extractionNote = 'Voiceover audio track extracted and transcribed by Gemini Multimodal.';
    } else {
      mediaStatus = 'web_grounded';
      extractionNote = 'Direct media download blocked by host; extracted via Google Search Grounding.';
    }
  }

  // --- STAGE 1: RAW INGESTION ---
  const stage1Output = await runStage1_RawExtraction(mediaResult, TARGET_URL, mediaTitle, creatorHandle, captionText);

  // --- 3-STRIKES MULTI-TURN LOOP (Stages 2, 3, 4) ---
  let strikeCount = 0;
  let criticFeedback = null;
  let finalCard = null;
  const auditTrail = [];
  let stage2Output = null;

  while (strikeCount < 3) {
    console.log(`\n--- Verification Turn (Strike Count: ${strikeCount}) ---`);

    // Stage 2: Deep Grounding
    stage2Output = await runStage2_Investigation(stage1Output, TARGET_URL, criticFeedback);

    // Stage 3: Composition
    finalCard = await runStage3_Composition(stage1Output, stage2Output, availableDomains, TARGET_URL);

    if (!finalCard || !finalCard.title) {
      strikeCount++;
      criticFeedback = 'Stage 3 failed to compose a valid JSON card.';
      auditTrail.push({ strike: strikeCount, reason: criticFeedback });
      continue;
    }

    // Stage 4: Critic & Verification
    const criticRes = await runStage4_Critic(finalCard, TARGET_URL);

    if (criticRes.passed) {
      console.log('✓ Stage 4 Verification PASSED! Card verified.');
      auditTrail.push({ strike: strikeCount, passed: true, reason: 'All checks passed.' });
      break;
    } else {
      strikeCount++;
      criticFeedback = criticRes.strikeReason;
      console.warn(`⚠️ STRIKE ${strikeCount}: ${criticFeedback}`);
      auditTrail.push({ strike: strikeCount, passed: false, reason: criticFeedback });
    }
  }

  // 3-Strikes Out Enforcement
  if (strikeCount >= 3) {
    console.warn('❌ 3 STRIKES REACHED: Dropping unverified destination URL and commercial claims.');
    if (finalCard) {
      finalCard.destinationUrl = null;
      finalCard.blogUrl = null;
      finalCard.strikeCount = 3;

      // Clean out any items mentioning commercial bait
      if (Array.isArray(finalCard.sections)) {
        finalCard.sections = finalCard.sections.map(sec => ({
          ...sec,
          items: (sec.items || []).filter(item => {
            const str = `${item.text || ''} ${item.detail || ''}`.toLowerCase();
            return !str.includes('skool') && !str.includes('gumroad') && !str.includes('comment') && !str.includes('dm for');
          })
        }));
      }
    }
  } else if (finalCard) {
    finalCard.strikeCount = 0;
    finalCard.blogUrl = finalCard.destinationUrl || null;
  }

  // Construct Full Firestore Document (Card + Silent Pipeline Stages Dossier)
  const pipelineStages = {
    stage1_raw: stage1Output,
    stage2_investigation: {
      investigatedSubject: stage2Output?.investigatedSubject,
      verifiedFacts: stage2Output?.verifiedFacts,
      groundedSources: stage2Output?.groundedSources || []
    },
    stage3_composition: {
      draftTitle: finalCard?.title,
      draftSummary: finalCard?.summary,
      draftSectionsCount: finalCard?.sections?.length || 0
    },
    stage4_verification: {
      strikeCount,
      verified: strikeCount < 3,
      auditTrail
    }
  };

  const finalDocument = {
    ...(finalCard || {
      domain: 'misc',
      topic: 'Unclassified',
      title: mediaTitle || 'Captured Link',
      summary: captionText.slice(0, 200) || 'Extraction fallback.',
      creator: creatorHandle || ''
    }),
    status: 'ready',
    mediaStatus,
    extractionNote,
    sourceUrl: TARGET_URL,
    pipelineStages,
    updatedAt: new Date().toISOString()
  };

  console.log(`Writing result to Cloud Firestore captures/${CAPTURE_ID} (strikeCount: ${finalDocument.strikeCount})...`);
  await setDoc(doc(db, 'captures', String(CAPTURE_ID)), finalDocument, { merge: true });
  console.log('✓ Firestore document updated successfully with full 4-stage research dossier!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal extractor error:', err);
  process.exit(1);
});
