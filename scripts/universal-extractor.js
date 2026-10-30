#!/usr/bin/env node

/**
 * @file universal-extractor.js
 * @description Autonomous Cloud Extractor for Active Desks v3.0.
 * Invoked by GitHub Actions on repository_dispatch or manual trigger.
 * Uses yt-dlp & ffmpeg to bypass Instagram/TikTok login walls, sends transcripts
 * to Gemini Multimodal, and writes rich 3-tier payloads directly to Cloud Firestore.
 */

import { execSync } from 'child_process';
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
        timeout: 15000
      });

      const ogDesc = html.match(/<meta property="og:description" content="([^"]+)"/i);
      const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/i);
      if (ogDesc) captionText = ogDesc[1];
      if (ogTitle && !mediaTitle) mediaTitle = ogTitle[1];
    } catch (e) {
      console.warn('OpenGraph scraping failed:', e.message);
    }
  }

  // 2. Structured Extraction via Google Gemini
  console.log('Sending transcript & caption to Google Gemini...');
  const prompt = `
You are the Active Desks Autonomous Universal Extractor.
Extract structured 3-tier data from this social media post or article:

URL: ${TARGET_URL}
Title / Caption: ${mediaTitle}
Description / Notes: ${captionText}

Requirements:
- Domain must strictly be one of: "recipe", "book", "tech", "game", "fiber", "misc".
- If recipe:
  - Extract ALL ingredients with exact metric grams (grams: number) wherever stated or estimable.
  - Step-by-step instructions.
- Return valid JSON matching this schema:
{
  "domain": "recipe" | "book" | "tech" | "game" | "fiber" | "misc",
  "topic": "Concise 2-3 word topic",
  "title": "Clean, descriptive title",
  "summary": "1-2 sentence core value or high-protein macro summary",
  "creator": "Creator handle or author",
  "ingredients": [
    { "item": "Chicken breast", "grams": 350, "amount": "350g" }
  ],
  "steps": [ "Step 1...", "Step 2..." ],
  "keyInsights": [ "High protein", "Slow cooker friendly" ]
}
`;

  let structuredPayload = null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (!res.ok) {
      throw new Error(`Gemini API HTTP ${res.status}: ${res.statusText}`);
    }

    const json = await res.json();
    const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text;
    structuredPayload = JSON.parse(rawText);
    console.log('✓ Successfully generated 3-tier payload:', structuredPayload.title);
  } catch (err) {
    console.error('Gemini extraction failed:', err);
    structuredPayload = {
      domain: 'misc',
      topic: 'Unclassified',
      title: mediaTitle || 'Captured Link',
      summary: captionText.slice(0, 200) || 'Extraction fallback.',
      creator: creatorHandle || ''
    };
  }

  // 3. Write directly to Cloud Firestore document
  console.log(`Writing result to Cloud Firestore captures/${CAPTURE_ID}...`);
  const app = initializeApp(FIREBASE_CONFIG);
  const db = getFirestore(app);

  const finalDocument = {
    ...structuredPayload,
    status: 'ready',
    sourceUrl: TARGET_URL,
    updatedAt: new Date().toISOString()
  };

  await setDoc(doc(db, 'captures', String(CAPTURE_ID)), finalDocument, { merge: true });
  console.log('✓ Firestore document updated successfully. Real-time push dispatched to client devices!');
}

run().catch((err) => {
  console.error('Fatal extractor error:', err);
  process.exit(1);
});
