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
    if (parsed.hostname.includes('instagram.com') && parsed.pathname.includes('/reel/')) {
      parsed.search = '';
    } else {
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'igshid', 'mdxt', 'srtk'];
      trackingParams.forEach(p => parsed.searchParams.delete(p));
    }
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
 * @inputs {number | null} existingId - Optional existing ID to update in-place.
 * @outputs {object} UniversalCapture compliant record.
 */
export function processStage3Offline(rawInput, foundUrl, existingId = null) {
  const now = new Date().toISOString();
  const id = existingId ? existingId : Date.now();

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
 * @inputs {number | null} existingId - Optional existing ID to update in-place rather than generating a new record.
 * @inputs {object | null} existingContext - Optional existing card object for retaining hints during re-analysis.
 * @outputs {Promise<object>} Resolves with the saved UniversalCapture record.
 * @sideEffects Writes the record directly into IndexedDB 'captures' store.
 */
export async function processCaptureIntake(rawInput, existingId = null, existingContext = null) {
  const text = (rawInput || '').trim();
  if (!text) {
    throw new Error('Input text is empty');
  }

  const foundUrl = extractUrl(text);
  const apiKey = state.settings?.gemini_api_key?.trim();
  const groundingEnabled = !!state.settings?.search_grounding_enabled;

  let captureRecord = null;
  let lastError = null;

  // Determine stage execution
  if (apiKey && groundingEnabled && foundUrl) {
    // Stage 1: Grounded Gemini extraction
    try {
      captureRecord = await runStage1Grounded(text, foundUrl, apiKey, existingId, existingContext);
    } catch (err) {
      lastError = err;
      console.warn('Stage 1 Grounded extraction failed, falling back to Stage 2:', err);
    }
  }

  if (!captureRecord && apiKey && foundUrl) {
    // Stage 2: Standard Gemini non-grounded (Strict anti-hallucination)
    try {
      captureRecord = await runStage2Ungrounded(text, foundUrl, apiKey, existingId);
    } catch (err) {
      lastError = err;
      console.warn('Stage 2 Ungrounded extraction failed, falling back to Stage 3:', err);
    }
  }

  // If this is an existing capture being re-analyzed and extraction failed:
  if (existingId && !captureRecord) {
    // If this was an optimistic processing placeholder, finalize into clean offline fallback
    if (existingContext?.status === 'processing') {
      captureRecord = processStage3Offline(text, foundUrl, existingId);
      captureRecord.status = 'processed';
      captureRecord.summary = 'Deep web extraction was unavailable. Tap 🔄 Analyze on this card to retry.';
      await db.put('captures', captureRecord);
      return captureRecord;
    }
    // For manual re-analyses on established cards, preserve existing data and throw error
    throw (lastError || new Error('Extraction failed to retrieve data from Gemini API'));
  }

  if (!captureRecord) {
    // Stage 3: Offline deterministic fallback (for brand new captures added without keys)
    captureRecord = processStage3Offline(text, foundUrl, existingId);
  }

  // Persist record to IndexedDB
  await db.put('captures', captureRecord);
  return captureRecord;
}

/**
 * Unified Gemini API Invoker supporting both modern Interactions API (v1beta/interactions)
 * and legacy generateContent with automatic fallback.
 */
async function callGemini(promptText, useSearch, apiKey) {
  let model = state.settings?.gemini_model || 'gemini-3.5-flash-lite';
  if (model === 'gemini-3.8-flash-lite' || /omni|tts/i.test(model)) {
    model = 'gemini-3.5-flash-lite';
  }

  // 1. Try Interactions API first (required for Gemini 3.8 / 4.x models)
  try {
    const intBody = {
      model,
      input: promptText
    };
    if (useSearch) {
      intBody.tools = [{ type: 'google_search' }];
    }

    const intResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/interactions?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(intBody)
    });

    if (intResp.ok) {
      const data = await intResp.json();

      // A. Check output_text sugar property
      if (typeof data.output_text === 'string' && data.output_text.trim()) {
        return data.output_text.trim();
      }

      // B. Check outputs array (legacy interactions schema)
      if (Array.isArray(data.outputs)) {
        const textOut = data.outputs.find(o => o.text || (o.type === 'text' && o.text));
        if (textOut?.text) return textOut.text.trim();
      }

      // C. Check steps array (structured timeline schema)
      if (Array.isArray(data.steps)) {
        const modelStep = data.steps.find(s => s.type === 'model_output' || s.step_type === 'model_output');
        if (modelStep?.content) {
          for (const block of modelStep.content) {
            if (block.type === 'text' && block.text) return block.text.trim();
            if (typeof block === 'string') return block.trim();
          }
        }
      }
    } else {
      const errData = await intResp.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${intResp.status}`;
      console.warn(`Interactions API returned error: ${errMsg}`);
    }
  } catch (err) {
    console.warn('Interactions API call exception, trying generateContent fallback:', err);
  }

  // 2. Fallback to generateContent API
  const gcBody = {
    contents: [{ parts: [{ text: promptText }] }]
  };
  if (useSearch) {
    gcBody.tools = [{ google_search: {} }];
  }

  const gcResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(gcBody)
  });

  if (!gcResp.ok) {
    const err = await gcResp.json().catch(() => ({}));
    throw new Error(`Gemini API HTTP ${gcResp.status}: ${err.error?.message || gcResp.statusText}`);
  }

  const gcData = await gcResp.json();
  const resText = gcData.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!resText) {
    throw new Error('Gemini API returned empty response');
  }
  return resText.trim();
}

/**
 * Fetches OpenGraph social metadata (title, author, caption) from CORS-enabled Microlink.
 * 
 * @purpose Bypasses Instagram/TikTok login redirects when search grounding hits a login wall.
 * @inputs {string} url - Target social media URL.
 * @outputs {Promise<{ title: string|null, description: string|null, author: string|null }|null>}
 */
async function fetchSocialMetadata(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`, {
      signal: controller.signal
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === 'success' && json.data) {
      return {
        title: json.data.title || null,
        description: json.data.description || null,
        author: json.data.author || null
      };
    }
  } catch (err) {
    console.warn('Social metadata fetch skipped or timed out:', err);
  }
  return null;
}

/**
 * Stage 1: Grounded Gemini Multimodal API Runner.
 */
async function runStage1Grounded(rawText, foundUrl, apiKey, existingId = null, existingContext = null) {
  const cleanUrl = sanitizeUrl(foundUrl);
  const contextCreator = existingContext?.creator || '';
  const contextTitle = existingContext?.title && !existingContext.title.startsWith('http') && !existingContext.title.startsWith('Instagram Reel') ? existingContext.title : '';
  const contextFoundUrl = existingContext?.foundUrl || '';

  const prompt = `You are the content analyzer for Active Desks.
Extract structured metadata from this link using Google Search Grounding:
Target URL: ${cleanUrl}
${contextCreator ? `Creator Hint: ${contextCreator}` : ''}
${contextTitle ? `Title / Subject Hint: ${contextTitle}` : ''}
${contextFoundUrl ? `Associated Link: ${contextFoundUrl}` : ''}
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

  const rawResponseText = await callGemini(prompt, true, apiKey);
  let parsed = JSON.parse(rawResponseText.replace(/```json\n?|```/g, '').trim());

  // Check if Gemini encountered an authentication or login redirect wall or failed to index
  const isAuthBlocked = 
    /could not be retrieved|not accessible|not indexed|private|requires.*authentication|login|sign in|restricted|direct access|http 302|redirect/i.test(
      `${parsed.summary || ''} ${(parsed.body?.takeaways || []).join(' ')} ${parsed.title || ''}`
    ) ||
    ((!parsed.creator || parsed.creator === 'Unknown') && /^Instagram Reel|^TikTok|^Social Media/i.test(parsed.title || ''));

  const isSocialUrl = /(?:instagram\.com|tiktok\.com|threads\.net|x\.com)\//i.test(cleanUrl);

  // Conditional Fallback: If blocked by a login wall, fetch OpenGraph metadata and re-query
  if (isAuthBlocked && isSocialUrl) {
    const socialMeta = await fetchSocialMetadata(cleanUrl);
    if (socialMeta && (socialMeta.description || socialMeta.title)) {
      const unblockedPrompt = `You are the content analyzer for Active Desks.
Analyze this social media content using the provided un-walled post caption:
Target URL: ${cleanUrl}
Author / Creator: ${socialMeta.author || contextCreator || 'Unknown'}
Post Title: ${socialMeta.title || contextTitle || 'Social Post'}
Caption / Content: ${socialMeta.description || ''}
User Note: ${rawText}

Extract structured metadata. If this is a developer tool, recipe, 3D print, or guide, extract its actual steps, tools, ingredients, or takeaways from the caption.
Return strictly a valid JSON object matching this schema:
{
  "domain": "tech" | "book" | "game" | "recipe" | "fiber" | "misc",
  "topic": "specific micro topic",
  "title": "Clean concise title",
  "summary": "1-2 sentence core takeaway",
  "creator": "Author name and handle",
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

      try {
        const fallbackResponseText = await callGemini(unblockedPrompt, false, apiKey);
        const unblockedParsed = JSON.parse(fallbackResponseText.replace(/```json\n?|```/g, '').trim());
        if (unblockedParsed && unblockedParsed.title) {
          parsed = unblockedParsed;
          if ((!parsed.creator || parsed.creator === 'Unknown') && socialMeta.author) {
            parsed.creator = socialMeta.author;
          }
        }
      } catch (fallbackErr) {
        console.warn('Social un-walled analysis fallback failed:', fallbackErr);
      }
    }
  }

  return {
    id: existingId ? existingId : Date.now(),
    domain: (parsed.domain || 'tech').toLowerCase(),
    topic: parsed.topic || 'General',
    title: parsed.title || cleanUrl,
    summary: parsed.summary || rawText,
    creator: parsed.creator || (existingContext?.creator || null),
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
async function runStage2Ungrounded(rawText, foundUrl, apiKey, existingId = null) {
  const cleanUrl = sanitizeUrl(foundUrl);
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

  const rawResponseText = await callGemini(prompt, false, apiKey);
  const parsed = JSON.parse(rawResponseText.replace(/```json\n?|```/g, '').trim());

  return {
    id: existingId ? existingId : Date.now(),
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
