#!/usr/bin/env node

/**
 * @file universal-extractor.js
 * @description Autonomous Cloud Extractor for Active Desks v3.0.
 * Invoked by GitHub Actions on repository_dispatch or manual trigger.
 * Uses yt-dlp & ffmpeg to bypass Instagram/TikTok login walls, sends video/audio
 * & transcripts to Gemini Multimodal, and writes rich 3-tier payloads directly to Cloud Firestore.
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
 * 
 * @purpose Distinguishes video streams needing yt-dlp extraction from static posts/articles.
 * @inputs {string} url - Target capture URL.
 * @outputs {boolean} True if video stream URL.
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
 * 
 * @purpose Downloads compressed 720p MP4 video (Tier 1) or MP3 voiceover audio (Tier 2) for Gemini Multimodal.
 * @inputs {string} url - Target video URL.
 * @outputs {{ mimeType: string, data: string, status: string } | null} Base64 media payload or null on fallback.
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
        console.log(`✓ [Tier 1 Success] Extracted full video (.mp4, ${Math.round(videoBuffer.length / 1024)} KB). Vision + Audio enabled!`);
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
        console.log(`✓ [Tier 2 Success] Extracted voiceover audio (.mp3, ${Math.round(audioBuffer.length / 1024)} KB). Narration listening enabled!`);
        return {
          mimeType: 'audio/mp3',
          data: audioBuffer.toString('base64'),
          status: 'audio_extracted'
        };
      }
      fs.unlinkSync(tempAudioFile);
    }
  } catch (err) {
    console.warn(`Tier 2 audio extraction skipped/failed (${err.message}). Falling back to Tier 3 text & web search.`);
    if (fs.existsSync(tempAudioFile)) {
      try { fs.unlinkSync(tempAudioFile); } catch (e) {}
    }
  }

  console.log('-> [Tier 3] Relying on scraped creator caption & Google Search grounding.');
  return null;
}

/**
 * Queries Cloud Firestore to discover all built-in and user-promoted domain slugs.
 * 
 * @purpose Ensures Gemini can classify captures into newly promoted domains/desks.
 * @inputs {import('firebase/firestore').Firestore} db - Initialized Firestore instance.
 * @outputs {Promise<Array<string>>} Ordered list of available domain slugs.
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

async function run() {
  console.log('=== Starting Active Desks v3 Autonomous Extractor ===');
  console.log(`Target URL: ${TARGET_URL}`);
  console.log(`Capture ID: ${CAPTURE_ID}`);

  if (!GEMINI_API_KEY) {
    console.error('CRITICAL: GEMINI_API_KEY environment variable is missing.');
    process.exit(1);
  }

  if (!TARGET_URL || !CAPTURE_ID) {
    console.error('CRITICAL: TARGET_URL and CAPTURE_ID are required.');
    process.exit(1);
  }

  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);
  const availableDomains = await fetchAvailableDomains(db);
  const domainUnionStr = availableDomains.map(d => `"${d}"`).join(' | ');
  console.log(`Available domains: ${availableDomains.join(', ')}`);

  // 1. Gather Media Metadata & Captions via yt-dlp
  let captionText = '';
  let mediaTitle = '';
  let creatorHandle = '';

  try {
    console.log('Fetching media metadata via yt-dlp...');
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
    console.warn('yt-dlp extraction note:', err.message);
  }

  // If caption is empty, fallback to curl scraping with facebookexternalhit User-Agent
  if (!captionText) {
    try {
      console.log('Attempting OpenGraph scraping with facebookexternalhit User-Agent...');
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

  // 1b. Download Multimodal Video/Audio Stream if Video Link
  const isVideo = isVideoLink(TARGET_URL);
  let mediaResult = null;
  let mediaStatus = 'text_images';
  let extractionNote = 'Static post / article format (no video to extract); extracted from post text & metadata.';

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
  } else {
    console.log('Static post/article detected. Using text_images modality.');
  }

  let mediaNotice = '';
  if (mediaStatus === 'video_extracted') {
    mediaNotice = 'Attached Media Track: FULL VIDEO (.mp4 video + audio). Watch visual frames, read on-screen text/overlays/credits, and listen to spoken narration.';
  } else if (mediaStatus === 'audio_extracted') {
    mediaNotice = 'Attached Media Track: AUDIO ONLY (.mp3 audio). Listen closely to spoken narration and dialogue.';
  } else if (mediaStatus === 'text_images') {
    mediaNotice = 'Attached Media Track: STATIC CONTENT (Post / Photo Carousel / Web Article). Extract from post text, metadata, and Google Search grounding.';
  } else {
    mediaNotice = 'Attached Media Track: URL STREAM OR WEB GROUNDING (If video stream is attached via fileData, watch visual frames and listen to spoken audio; otherwise rely on creator captions and live Google Search grounding).';
  }

  // 2. Structured Extraction & Live Search Grounding via Google Gemini
  console.log(`Sending payload (${mediaStatus}) & caption to Google Gemini...`);
  const prompt = `
You are the Active Desks Universal Extractor & Knowledge Grounding Engine.
Your goal is to identify WHY a user saved this post and organize the information they will actually want when revisiting this card later.

URL: ${TARGET_URL}
Title / Caption: ${mediaTitle}
Creator: ${creatorHandle}
Description / Notes: ${captionText}
${mediaNotice}

EXTRACTION PRINCIPLES:
1. EXTRACT INTENT, NOT LITERAL SCENE DESCRIPTION:
   - Determine what the post is actually sharing, recommending, reviewing, teaching, or showcasing.
   - NEVER merely describe literal visual scenes or b-roll (e.g., if a clip from an anime, show, movie, game, or song is shown, identify the work itself, what it is about, why it is being recommended or discussed, and where to find/watch/listen to it).
   - Read on-screen text overlays/credits, listen to voiceover narration, and combine with captions and Google Search grounding to identify unnamed media, products, or references.

2. RESOLVE TEASERS & EXTERNAL LINKS:
   - If the creator uses engagement bait ("Comment LINK", "Link in bio", "DM for guide") or references an external article, recipe, repository, or store page, use Google Search grounding to locate the real destination URL ("destinationUrl") and extract the complete underlying content.

3. DOMAIN CLASSIFICATION:
   - Available domains: ${domainUnionStr}.
   - Choose the best matching domain from the available list. If the subject does not fit any existing specific domain, use "misc" and set a clear, specific 1-3 word "topic" (e.g., "Anime", "Music", "Fitness") so related cards cluster together.

4. SELF-STRUCTURING SECTIONS ("sections"):
   - Organize the extracted details into 1 to 3 logical sections whose "heading" (with a fitting emoji) and "style" match how the information is best presented:
     * "checklist": For checkable items, supplies, or ingredients. Put quantities/measurements in "detail" (for culinary ingredients, always include metric gram weights in "detail", e.g. "350g").
     * "numbered": For ordered sequences such as ranked lists, multi-item recommendations, or step-by-step instructions.
     * "bullets": For reviews, media/source identification details, key takeaways, or specifications.

Return ONLY a valid JSON object matching this schema (enclosed in \`\`\`json ... \`\`\`):
{
  "domain": ${domainUnionStr},
  "topic": "Concise 1-3 word subject",
  "title": "Clear title of what is being shared, recommended, or taught",
  "summary": "1-2 sentence takeaway explaining what this is and why it is worth saving",
  "creator": "Creator handle or author",
  "destinationUrl": "Direct external destination URL or null",
  "sections": [
    {
      "heading": "Section heading with emoji",
      "style": "checklist" | "numbered" | "bullets",
      "items": [
        { "text": "Primary item, step, or fact", "detail": "Optional secondary metadata, measurement, or context (or empty string)" }
      ]
    }
  ]
}
`;

  const CANDIDATE_MODELS = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite'
  ];

  let structuredPayload = null;
  let groundedSourcesCount = 0;

  for (const model of CANDIDATE_MODELS) {
    const attempts = (isVideo && !mediaResult)
      ? [
          { name: 'direct-uri-grounded', useFileUri: true, tools: [{ googleSearch: {} }] },
          { name: 'direct-uri', useFileUri: true, tools: [] },
          { name: 'grounded', useFileUri: false, tools: [{ googleSearch: {} }] },
          { name: 'direct', useFileUri: false, tools: [] }
        ]
      : [
          { name: 'grounded', useFileUri: false, tools: [{ googleSearch: {} }] },
          { name: 'direct', useFileUri: false, tools: [] }
        ];

    for (const attempt of attempts) {
      try {
        console.log(`Querying Gemini [${model}] in ${attempt.name} mode (media: ${mediaStatus})...`);
        const requestParts = [];
        if (mediaResult && mediaResult.data) {
          requestParts.push({
            inlineData: {
              mimeType: mediaResult.mimeType,
              data: mediaResult.data
            }
          });
        } else if (attempt.useFileUri) {
          requestParts.push({
            fileData: {
              fileUri: TARGET_URL,
              mimeType: 'video/mp4'
            }
          });
        }
        requestParts.push({ text: prompt });

        const bodyPayload = {
          contents: [{ parts: requestParts }]
        };
        if (attempt.tools.length > 0) {
          bodyPayload.tools = attempt.tools;
        } else {
          bodyPayload.generationConfig = { responseMimeType: 'application/json' };
        }

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload)
        });

        if (!res.ok) {
          const errorBody = await res.text();
          console.warn(`[${model}:${attempt.name}] HTTP ${res.status}: ${errorBody}`);
          continue;
        }

        const json = await res.json();
        const candidate = json.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const rawText = parts.map(p => p.text || '').join('\n');

        const parsed = parseJsonFromResponse(rawText);
        if (parsed && parsed.domain && parsed.title) {
          structuredPayload = parsed;

          // Check for grounding sources
          const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
          const groundedWeb = groundingChunks.map(c => c.web?.uri).filter(Boolean);
          groundedSourcesCount = groundedWeb.length;
          if (groundedWeb.length > 0) {
            console.log(`✓ Grounded in web sources:`, groundedWeb);
          }

          const resolvedDestUrl = structuredPayload.destinationUrl || structuredPayload.blogUrl || groundedWeb[0] || null;
          structuredPayload.destinationUrl = resolvedDestUrl;
          structuredPayload.blogUrl = resolvedDestUrl;

          if (attempt.useFileUri) {
            mediaStatus = 'video_extracted';
            extractionNote = 'Video & audio watched directly by Gemini via URL stream.';
          }

          console.log(`✓ Successfully extracted 3-tier payload via [${model}:${attempt.name}]:`, structuredPayload.title);
          break;
        }
      } catch (err) {
        console.warn(`Model [${model}:${attempt.name}] error:`, err.message);
      }
    }

    if (structuredPayload) break;
  }

  const hasListContent =
    (Array.isArray(structuredPayload?.sections) && structuredPayload.sections.some(s => Array.isArray(s?.items) && s.items.length > 0)) ||
    (Array.isArray(structuredPayload?.ingredients) && structuredPayload.ingredients.length > 0) ||
    (Array.isArray(structuredPayload?.steps) && structuredPayload.steps.length > 0) ||
    (Array.isArray(structuredPayload?.keyInsights) && structuredPayload.keyInsights.length > 0);

  if (!structuredPayload) {
    console.error('All candidate Gemini models failed. Engaging safe fallback payload.');
    mediaStatus = 'failed';
    extractionNote = 'All candidate Gemini models failed to respond or parse.';
    structuredPayload = {
      domain: 'misc',
      topic: 'Unclassified',
      title: mediaTitle || 'Captured Link',
      summary: captionText.slice(0, 200) || 'Extraction fallback.',
      creator: creatorHandle || ''
    };
  } else if (!hasListContent || (!mediaResult && mediaStatus !== 'video_extracted' && !captionText && !mediaTitle && groundedSourcesCount === 0)) {
    mediaStatus = 'failed';
    extractionNote = isVideo
      ? 'Video/audio download was blocked by host, and Google Search found no matching public post.'
      : 'Page text could not be scraped, and Google Search found no matching public page.';
  } else if (mediaStatus === 'text_images' && !captionText && groundedSourcesCount > 0) {
    mediaStatus = 'web_grounded';
    extractionNote = `No media to extract; extracted via Google Search Grounding (${groundedSourcesCount} web source${groundedSourcesCount > 1 ? 's' : ''}).`;
  } else if (mediaStatus === 'web_grounded') {
    extractionNote = groundedSourcesCount > 0
      ? `Direct video stream blocked by host; extracted via Google Search Grounding (${groundedSourcesCount} web source${groundedSourcesCount > 1 ? 's' : ''}).`
      : 'Direct video stream blocked by host; extracted from post metadata & Google Search Grounding.';
  }

  // 3. Write directly to Cloud Firestore document
  console.log(`Writing result to Cloud Firestore captures/${CAPTURE_ID} (mediaStatus: ${mediaStatus})...`);

  const finalDocument = {
    ...structuredPayload,
    status: 'ready',
    mediaStatus,
    extractionNote,
    sourceUrl: TARGET_URL,
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'captures', String(CAPTURE_ID)), finalDocument, { merge: true });
  console.log('✓ Firestore document updated successfully. Real-time push dispatched to client devices!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Fatal extractor error:', err);
  process.exit(1);
});
