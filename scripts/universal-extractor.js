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
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
    mediaNotice = 'Attached Media Track: FULL VIDEO (.mp4 video attached). Watch visual frames closely (read on-screen text overlays, title cards, book covers, board game boxes, 3D printer slicer temps/speeds/tolerances, ingredient measurement graphics) and simultaneously listen to the spoken voiceover narration.';
  } else if (mediaStatus === 'audio_extracted') {
    mediaNotice = 'Attached Media Track: AUDIO ONLY (.mp3 audio attached). Listen closely to transcribe all spoken recommendations, book titles/authors, rules, tolerances, and measurements.';
  } else if (mediaStatus === 'text_images') {
    mediaNotice = 'Attached Media Track: STATIC CONTENT (Post / Photo Carousel / Web Article). Extract information accurately from the post caption and Google Search grounding.';
  } else {
    mediaNotice = 'Attached Media Track: URL STREAM OR WEB GROUNDING (If video stream is attached via fileData, watch visual frames and listen to spoken audio closely; otherwise rely on creator captions and live Google Search grounding).';
  }

  // 2. Structured Extraction & Live Search Grounding via Google Gemini
  console.log(`Sending payload (${mediaStatus}) & caption to Google Gemini...`);
  const prompt = `
You are the Active Desks Autonomous Universal Extractor & Knowledge Grounding Engine.
Extract rich, structured 3-tier data from this social media post or article:

URL: ${TARGET_URL}
Title / Caption: ${mediaTitle}
Creator: ${creatorHandle}
Description / Notes: ${captionText}
${mediaNotice}

CRITICAL MULTIMODAL, ANTI-BAIT & LIVE SEARCH GROUNDING INSTRUCTIONS:
1. MULTIMODAL COMPREHENSION (CRITICAL):
   - IF FULL VIDEO IS ATTACHED:
     * READ ON-SCREEN TEXT (OCR): Look closely at on-screen text overlays, title cards, book covers held up or displayed, board game boxes, 3D printer slicer settings, yarn labels, and ingredient lists shown on screen.
     * LISTEN TO SPOKEN VOICEOVER: Transcribe and integrate all spoken recommendations, book titles, authors, ingredient amounts, and creator tips.
   - IF AUDIO IS ATTACHED:
     * Listen closely to the speaker's voiceover for crucial details missing from captions (book titles, authors, rules, tolerances, exact measurements).

2. INTERACTION BAIT RESOLUTION:
   - Creators frequently use engagement bait (e.g. "Comment RECIPE/LINK to get the link in your DMs", "Link in broadcast channel", "DM for guide", "Link in bio").
   - DO NOT leave the user with an incomplete teaser or placeholder!
   - Use Google Search grounding to search for the creator's actual food blog, GitHub repository, project site, Substack, or documentation.
   - If found, extract the FULL authentic recipe, code, steps, or article directly from the grounded web results and set "blogUrl" to the real destination URL.

3. DOMAIN & METRIC ACCURACY:
   - Domain must strictly be one of: "recipe", "book", "tech", "game", "fiber", "misc".
   - If recipe:
     * Extract ALL ingredients with exact metric gram weights (grams: number) wherever stated or estimable.
     * Step-by-step cooking instructions in "steps".
     * Realistic macros (calories, protein, carbs, fat) if available.
   - If book:
     * Extract EVERY book recommended, shown on screen, or spoken in the voiceover into "steps" (formatted as "'Book Title' by Author — 1-sentence reason why it is recommended").
     * Do NOT substitute generic web recommendations if specific books are shown or spoken in the attached media.
   - If tech / tool / game / fiber:
     * Extract specific tools, steps, commands, and actionable insights into "steps" and "keyInsights".

Return ONLY a valid JSON object matching this schema (enclosed in \`\`\`json ... \`\`\`):
{
  "domain": "recipe" | "book" | "tech" | "game" | "fiber" | "misc",
  "topic": "Concise 2-3 word topic",
  "title": "Clean, descriptive title",
  "summary": "1-2 sentence core value or high-protein macro summary",
  "creator": "Creator handle or author",
  "blogUrl": "Direct destination link/URL or null",
  "ingredients": [
    { "item": "Chicken breast", "grams": 350, "amount": "350g" }
  ],
  "steps": [ "Step 1 or Book 1...", "Step 2 or Book 2..." ],
  "keyInsights": [ "Key takeaway 1", "Key takeaway 2" ]
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
            if (!structuredPayload.blogUrl) {
              structuredPayload.blogUrl = groundedWeb[0];
            }
          }

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
  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);

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
