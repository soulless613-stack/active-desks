/**
 * @file capture-dock.js
 * @description Quick capture dock and optimistic intake processor for Active Desks v3.0.
 * Writes placeholder cards to Firestore instantly (<50ms) and dispatches the
 * autonomous server-side GitHub Action extraction worker.
 */

import { saveDoc } from '../firebase.js';
import { state } from '../state.js';
import { openCapturesDrawer } from './drawer.js';

/**
 * Initializes the bottom capture bar input and submission handlers.
 * 
 * @purpose Binds Enter key and submit button.
 * @inputs None.
 * @outputs {void}
 */
export function initCaptureDock() {
  const inputEl = document.getElementById('capture-input');
  const submitBtn = document.getElementById('btn-capture-submit');

  if (submitBtn && inputEl) {
    submitBtn.addEventListener('click', () => handleCaptureSubmission(inputEl));
    inputEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCaptureSubmission(inputEl);
      }
    });
  }
}

/**
 * Handles incoming capture URL submissions with optimistic intake.
 * 
 * @purpose Creates instant Firestore placeholder and dispatches autonomous extractor.
 * @inputs {HTMLInputElement} inputEl - Target input DOM element.
 * @outputs {Promise<void>}
 */
async function handleCaptureSubmission(inputEl) {
  const rawUrl = (inputEl.value || '').trim();
  if (!rawUrl) return;

  // Basic URL validation
  if (!/^https?:\/\//i.test(rawUrl)) {
    alert('Please enter a valid URL (starting with http:// or https://)');
    return;
  }

  inputEl.value = '';
  inputEl.blur();

  const captureId = String(Date.now());
  const domain = inferDomainFromUrl(rawUrl);

  // 1. Optimistic Intake: Save placeholder to Firestore
  const placeholder = {
    id: captureId,
    domain,
    topic: 'Incoming Capture',
    title: `Extracting: ${rawUrl.slice(0, 45)}...`,
    summary: 'Autonomous cloud extraction worker dispatched. Gathering media & transcript...',
    sourceUrl: rawUrl,
    status: 'extracting',
    createdAt: new Date().toISOString()
  };

  try {
    await saveDoc('captures', captureId, placeholder);
    // 2. Open drawer immediately to show progress badge (<50ms)
    openCapturesDrawer();

    // 3. Dispatch Autonomous Extraction Worker
    await dispatchExtractionWorker(captureId, rawUrl);
  } catch (err) {
    console.error('Failed to register capture:', err);
    alert('Could not submit capture: ' + err.message);
  }
}

/**
 * Dispatches the autonomous server-side extractor via GitHub Actions repository_dispatch.
 * 
 * @purpose Triggers ubuntu-latest runner with yt-dlp & ffmpeg to bypass Instagram login walls.
 * @inputs {string} captureId - Firestore document ID.
 * @inputs {string} url - Target reel or blog URL.
 * @outputs {Promise<void>}
 */
async function dispatchExtractionWorker(captureId, url) {
  const token = (state.settings?.github_token || localStorage.getItem('active_desks_github_token') || '').trim();

  // If a GitHub PAT is configured, trigger the server-side runner
  if (token) {
    try {
      const res = await fetch('https://api.github.com/repos/soulless613-stack/active-desks/dispatches', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          event_type: 'extract_capture',
          client_payload: {
            captureId,
            url
          }
        })
      });

      if (res.ok) {
        console.log(`⚡ Dispatched GitHub Actions extraction worker for capture [${captureId}]`);
        return;
      } else {
        console.warn(`GitHub Actions dispatch returned HTTP ${res.status}`);
      }
    } catch (e) {
      console.warn('Could not dispatch GitHub Actions worker:', e);
    }
  }

  // Fallback: If no GitHub PAT or dispatch failed, check if Gemini key is present for client-side heuristic
  const geminiKey = (state.settings?.gemini_api_key || localStorage.getItem('active_desks_gemini_key') || '').trim();
  if (geminiKey) {
    triggerClientFallback(captureId, url, geminiKey);
  }
}

/**
 * Client-side heuristic fallback for standard blog posts or when offline.
 */
async function triggerClientFallback(captureId, url, apiKey) {
  try {
    const prompt = `Analyze this URL for Active Desks: ${url}. Return JSON with { domain: "recipe"|"book"|"tech"|"game"|"fiber"|"misc", topic: string, title: string, summary: string, creator: string }`;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        const parsed = JSON.parse(rawText);
        await saveDoc('captures', captureId, {
          ...parsed,
          status: 'ready'
        });
      }
    }
  } catch (err) {
    console.warn('Client fallback extraction error:', err);
  }
}

/**
 * Heuristically infers initial domain from URL.
 */
function inferDomainFromUrl(url) {
  const lower = url.toLowerCase();
  if (lower.includes('recipe') || lower.includes('food') || lower.includes('cook') || lower.includes('stealth_health') || lower.includes('kitchen')) {
    return 'recipe';
  }
  if (lower.includes('goodreads') || lower.includes('thestorygraph') || lower.includes('book')) {
    return 'book';
  }
  if (lower.includes('github') || lower.includes('printables') || lower.includes('thingiverse') || lower.includes('cad')) {
    return 'tech';
  }
  if (lower.includes('ravelry') || lower.includes('knit') || lower.includes('crochet')) {
    return 'fiber';
  }
  if (lower.includes('steam') || lower.includes('ign') || lower.includes('wiki') || lower.includes('fandom')) {
    return 'game';
  }
  return 'misc';
}
