/**
 * @file intake.js
 * @description The 3-Stage Capture Intake Pipeline for Active Desks v2.0.
 * Routes inputs through:
 *   Stage 1: Primary Attempt (Gemini with Google Search Grounding)
 *   Stage 2: Standard Gemini (Free-Tier / Non-Grounded — Strict Anti-Hallucination)
 *   Stage 3: Explicit Fallback (Offline / No API Key Configured)
 */

import { state } from '../state.js';
import * as db from '../db.js';

/** Built-in regex lookup for well-known web services (Stage 3 domain matching) */
const DOMAIN_RULES = [
  { match: /(?:goodreads\.com|thestorygraph\.com|audible\.com)/i, domain: 'book' },
  { match: /(?:store\.steampowered\.com|ign\.com|nexusmods\.com)/i, domain: 'game' },
  { match: /(?:allrecipes\.com|seriouseats\.com|kingarthurbaking\.com|epicurious\.com)/i, domain: 'recipe' },
  { match: /(?:github\.com|printables\.com|makerworld\.com|thingiverse\.com|stackoverflow\.com)/i, domain: 'tech' },
  { match: /(?:ravelry\.com|knittingfool\.com)/i, domain: 'fiber' }
];

/**
 * Extracts a URL from a raw text string if present.
 * 
 * @purpose Isolates web links from surrounding notes or share-sheet text.
 * @inputs {string} text - Raw input string.
 * @outputs {string | null} Extracted URL or null if no web link is found.
 */
export function extractUrl(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

/**
 * Strips tracking parameters, affiliate tokens, and URL junk.
 * 
 * @purpose Sanitizes web URLs before persistence.
 * @inputs {string} urlString - Raw URL string.
 * @outputs {string} Cleaned URL string.
 */
export function sanitizeUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'igshid'];
    trackingParams.forEach(p => parsed.searchParams.delete(p));
    return parsed.toString();
  } catch (e) {
    return urlString;
  }
}

/**
 * Executes Stage 3: Offline / No API Key domain matching.
 * 
 * @purpose Deterministic 0ms local capture processing with strict 'No Assumed Topics' rule.
 * @inputs {string} rawInput - User input text.
 * @inputs {string | null} foundUrl - Extracted URL or null.
 * @outputs {object} UniversalCapture compliant record.
 */
function processStage3Offline(rawInput, foundUrl) {
  const now = new Date().toISOString();
  const id = Date.now();

  // Scenario A: Raw Linkless Thought
  if (!foundUrl) {
    return {
      id,
      domain: 'misc',
      topic: 'Thought',
      title: rawInput.trim().slice(0, 80),
      summary: rawInput.trim(),
      creator: null,
      sourceUrl: null,
      createdAt: now,
      status: 'processed',
      mediaStatus: 'text_images',
      searchPerformed: false,
      meta: [{ label: 'Format', value: 'Quick Thought' }],
      body: {
        format: 'note',
        takeaways: [rawInput.trim()],
        highlight: null
      }
    };
  }

  // Scenario B: Web URL without search grounding
  const cleanUrl = sanitizeUrl(foundUrl);
  const userNote = rawInput.replace(foundUrl, '').trim();

  let matchedDomain = 'link';
  for (const rule of DOMAIN_RULES) {
    if (rule.match.test(cleanUrl)) {
      matchedDomain = rule.domain;
      break;
    }
  }

  const title = userNote || cleanUrl.replace(/^https?:\/\/(?:www\.)?/, '').slice(0, 60);

  return {
    id,
    domain: matchedDomain,
    topic: 'Link', // Strictly assigned 'Link' per contract
    title,
    summary: 'This link was not searched against.',
    creator: null,
    sourceUrl: cleanUrl,
    createdAt: now,
    status: 'processed',
    mediaStatus: 'fallback_link',
    searchPerformed: false,
    meta: [
      { label: 'Domain', value: matchedDomain.toUpperCase() },
      { label: 'Status', value: 'Unsearched Link' }
    ],
    body: {
      format: 'note',
      takeaways: userNote ? [userNote] : ['Link captured offline. Deep web extraction was not performed.'],
      highlight: null
    }
  };
}

/**
 * Main intake router executing the 3-Stage Capture Pipeline.
 * 
 * @purpose Ingests user input, evaluates active credentials and grounding settings, and routes to appropriate stage.
 * @inputs {string} rawInput - Input string from the capture dock or mobile share sheet.
 * @outputs {Promise<object>} Resolves with the saved UniversalCapture record.
 * @sideEffects Writes the record directly into IndexedDB 'captures' store.
 */
export async function processCaptureIntake(rawInput) {
  const text = (rawInput || '').trim();
  if (!text) {
    throw new Error('Input text is empty');
  }

  const foundUrl = extractUrl(text);
  const apiKey = state.settings?.gemini_api_key?.trim();
  const groundingEnabled = !!state.settings?.search_grounding_enabled;

  let captureRecord = null;

  // Determine stage execution
  if (apiKey && groundingEnabled && foundUrl) {
    // Stage 1: Grounded Gemini extraction
    try {
      captureRecord = await runStage1Grounded(text, foundUrl, apiKey);
    } catch (err) {
      console.warn('Stage 1 Grounded extraction failed, falling back to Stage 2:', err);
    }
  }

  if (!captureRecord && apiKey && foundUrl) {
    // Stage 2: Standard Gemini non-grounded (Strict anti-hallucination)
    try {
      captureRecord = await runStage2Ungrounded(text, foundUrl, apiKey);
    } catch (err) {
      console.warn('Stage 2 Ungrounded extraction failed, falling back to Stage 3:', err);
    }
  }

  if (!captureRecord) {
    // Stage 3: Offline deterministic fallback
    captureRecord = processStage3Offline(text, foundUrl);
  }

  // Persist record to IndexedDB
  await db.put('captures', captureRecord);
  return captureRecord;
}

/**
 * Stage 1: Grounded Gemini Multimodal API Runner.
 */
async function runStage1Grounded(rawText, foundUrl, apiKey) {
  const cleanUrl = sanitizeUrl(foundUrl);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `You are the content analyzer for Active Desks.
Extract structured metadata from this link using Google Search Grounding:
Target URL: ${cleanUrl}
User note: ${rawText}

Return strictly a valid JSON object matching this schema:
{
  "domain": "tech" | "book" | "game" | "recipe" | "fiber" | "misc",
  "topic": "specific micro topic (e.g. 3D Printing, LitRPG, Sourdough)",
  "title": "Clean concise title",
  "summary": "1-2 sentence core takeaway",
  "creator": "Author, creator, or developer name",
  "meta": [{ "label": string, "value": string }],
  "body": {
    "format": "collection" | "guide" | "note",
    "items": [{ "title": string, "subtitle": string, "detail": string }] (only if format is collection),
    "checklist": [{ "text": string, "checked": false }] (only if format is guide),
    "steps": [{ "stepNumber": number, "instruction": string }] (only if format is guide),
    "takeaways": [string] (only if format is note),
    "highlight": string | null (only if format is note)
  }
}
Do not include markdown code fences (\`\`\`json). Return raw JSON only.`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = JSON.parse(rawResponseText.replace(/```json\n?|```/g, '').trim());

  return {
    id: Date.now(),
    domain: (parsed.domain || 'tech').toLowerCase(),
    topic: parsed.topic || 'General',
    title: parsed.title || cleanUrl,
    summary: parsed.summary || rawText,
    creator: parsed.creator || null,
    sourceUrl: cleanUrl,
    createdAt: new Date().toISOString(),
    status: 'processed',
    mediaStatus: 'text_images',
    searchPerformed: true,
    meta: Array.isArray(parsed.meta) ? parsed.meta : [],
    body: parsed.body || { format: 'note', takeaways: [parsed.summary || rawText], highlight: null }
  };
}

/**
 * Stage 2: Ungrounded Gemini Runner with Strict Anti-Hallucination Scope.
 */
async function runStage2Ungrounded(rawText, foundUrl, apiKey) {
  const cleanUrl = sanitizeUrl(foundUrl);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const prompt = `Analyze this link without web searching:
URL: ${cleanUrl}
User Note: ${rawText}

Rules:
1. Do NOT invent ingredients, measurements, or plot details.
2. Determine broad macro domain: "tech" | "book" | "game" | "recipe" | "fiber" | "misc".
3. Extract clean title from URL or user note.
4. Set topic strictly to "Link".

Return strictly raw JSON:
{
  "domain": string,
  "title": string,
  "userTakeaways": [string]
}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP ${response.status}`);
  }

  const data = await response.json();
  const rawResponseText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = JSON.parse(rawResponseText.replace(/```json\n?|```/g, '').trim());

  return {
    id: Date.now(),
    domain: (parsed.domain || 'link').toLowerCase(),
    topic: 'Link',
    title: parsed.title || cleanUrl,
    summary: 'This link was not searched against.',
    creator: null,
    sourceUrl: cleanUrl,
    createdAt: new Date().toISOString(),
    status: 'processed',
    mediaStatus: 'fallback_link',
    searchPerformed: false,
    meta: [
      { label: 'Domain', value: (parsed.domain || 'link').toUpperCase() },
      { label: 'Status', value: 'Unsearched Link' }
    ],
    body: {
      format: 'note',
      takeaways: Array.isArray(parsed.userTakeaways) && parsed.userTakeaways.length > 0
        ? parsed.userTakeaways
        : ['Web search was not performed. Refer to source link for full details.'],
      highlight: null
    }
  };
}
