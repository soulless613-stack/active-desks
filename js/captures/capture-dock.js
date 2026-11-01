/**
 * @file capture-dock.js
 * @description Universal capture dock for Active Desks v3.0.
 * Ingests BOTH raw text thoughts/notes and web links (reels, blogs, books) with 0ms UI response.
 * Saves raw thoughts directly and dispatches the autonomous server-side worker for links.
 */

import { saveDoc } from '../firebase.js';
import { state, getSetting, callGeminiJson } from '../state.js';
import { openCapturesModal, openCaptureDetailModal } from './drawer.js';

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
 * Handles incoming capture text or URL submissions.
 * 
 * @purpose Creates instant Firestore document for raw thoughts or links.
 * @inputs {HTMLInputElement} inputEl - Target input DOM element.
 * @outputs {Promise<void>}
 */
async function handleCaptureSubmission(inputEl) {
  const rawInput = (inputEl.value || '').trim();
  if (!rawInput) return;

  inputEl.value = '';
  inputEl.blur();

  const captureId = String(Date.now());
  const isUrl = /^https?:\/\//i.test(rawInput);

  if (isUrl) {
    // 1A-0. Duplicate URL Check across sourceUrl and blogUrl
    const targetNorm = normalizeUrlForDedup(rawInput);
    const existing = (state.captures || []).find(c =>
      (c.sourceUrl && normalizeUrlForDedup(c.sourceUrl) === targetNorm) ||
      (c.blogUrl && normalizeUrlForDedup(c.blogUrl) === targetNorm)
    );

    if (existing) {
      openCaptureDetailModal(existing, { isDuplicate: true });
      return;
    }

    // 1A. URL Link Intake: Save placeholder and trigger extraction worker
    const domain = inferDomainFromUrl(rawInput);
    const placeholder = {
      id: captureId,
      domain,
      topic: 'Incoming Link',
      title: `Extracting: ${rawInput.slice(0, 45)}...`,
      summary: 'Autonomous cloud extraction worker dispatched. Gathering media & transcript...',
      sourceUrl: rawInput,
      status: 'extracting',
      createdAt: new Date().toISOString()
    };

    try {
      await saveDoc('captures', captureId, placeholder);
      openCapturesModal();
      await dispatchExtractionWorker(captureId, rawInput);
    } catch (err) {
      console.error('Failed to register URL capture:', err);
      alert('Could not submit capture: ' + err.message);
    }
  } else {
    // 1B. Raw Text Thought / Note Intake: Save immediately as a ready capture
    const domain = inferDomainFromText(rawInput);
    const title = rawInput.length > 55 ? `${rawInput.slice(0, 52)}...` : rawInput;

    const thoughtRecord = {
      id: captureId,
      domain,
      topic: 'Raw Thought',
      title,
      summary: rawInput,
      sourceUrl: '',
      status: 'ready',
      createdAt: new Date().toISOString()
    };

    try {
      await saveDoc('captures', captureId, thoughtRecord);
      openCapturesModal();
    } catch (err) {
      console.error('Failed to save thought capture:', err);
      alert('Could not save note: ' + err.message);
    }
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
export async function dispatchExtractionWorker(captureId, url) {
  const token = getSetting('github_token', 'active_desks_github_token');

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
          client_payload: { captureId, url }
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

  // Fallback: If no GitHub PAT or dispatch failed, use client-side Gemini heuristic
  const prompt = `Analyze this URL for Active Desks: ${url}. Return JSON with { domain: "recipe"|"book"|"tech"|"game"|"fiber"|"misc", topic: string, title: string, summary: string, creator: string }`;
  const parsed = await callGeminiJson(prompt);
  if (parsed) {
    await saveDoc('captures', captureId, { ...parsed, status: 'ready' });
  }
}

/**
 * Heuristically infers domain from raw text.
 */
function inferDomainFromText(text) {
  const lower = text.toLowerCase();
  if (/recipe|cook|bake|chicken|dinner|lunch|breakfast|calories|protein|bread|focaccia/i.test(lower)) return 'recipe';
  if (/book|read|chapter|author|sanderson|pages|novel/i.test(lower)) return 'book';
  if (/game|quest|steam|boss|rpg|baldurs|bg3|playstation|nintendo/i.test(lower)) return 'game';
  if (/knit|crochet|yarn|stitch|rows|pattern|ravelry/i.test(lower)) return 'fiber';
  if (/3d print|cad|stl|filament|code|git|api|hardware|arduino|esp32/i.test(lower)) return 'tech';
  return 'misc';
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

/**
 * Normalizes a URL for duplicate comparison by stripping tracking parameters, www, and trailing slashes.
 * 
 * @purpose Prevents duplicate captures when social links include tracking query params (e.g. ?igsh=...).
 * @inputs {string} rawUrl - Unnormalized URL string.
 * @outputs {string} Canonical URL key.
 */
export function normalizeUrlForDedup(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl.trim());
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/reels\//i, '/reel/').replace(/\/+$/, '');
    const stripParams = new Set([
      'igsh', 'igshid', 'utm_source', 'utm_medium', 'utm_campaign',
      'utm_term', 'utm_content', 'fbclid', 'si', 'feature',
      'is_from_webapp', 'sender_device'
    ]);
    const keptParams = [];
    u.searchParams.forEach((val, key) => {
      if (!stripParams.has(key.toLowerCase())) {
        keptParams.push(`${key.toLowerCase()}=${val}`);
      }
    });
    keptParams.sort();
    const query = keptParams.length > 0 ? `?${keptParams.join('&')}` : '';
    return `${host}${path}${query}`;
  } catch (e) {
    return rawUrl.trim().toLowerCase().replace(/\/+$/, '');
  }
}
