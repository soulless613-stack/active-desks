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
    const cleanUrl = sanitizeCaptureUrl(rawInput);

    // 1A-0. Duplicate URL Check across sourceUrl, destinationUrl, and blogUrl
    const targetNorm = normalizeUrlForDedup(cleanUrl);
    const existing = (state.captures || []).find(c =>
      (c.sourceUrl && normalizeUrlForDedup(c.sourceUrl) === targetNorm) ||
      (c.destinationUrl && normalizeUrlForDedup(c.destinationUrl) === targetNorm) ||
      (c.blogUrl && normalizeUrlForDedup(c.blogUrl) === targetNorm)
    );

    if (existing) {
      openCaptureDetailModal(existing, { isDuplicate: true });
      return;
    }

    // 1A. URL Link Intake: Save placeholder and trigger extraction worker
    const domain = inferDomainFromUrl(cleanUrl);
    const placeholder = {
      id: captureId,
      domain,
      topic: 'Incoming Link',
      title: `Extracting: ${cleanUrl.slice(0, 45)}...`,
      summary: 'Autonomous cloud extraction worker dispatched. Gathering media & transcript...',
      sourceUrl: cleanUrl,
      status: 'extracting',
      createdAt: new Date().toISOString()
    };

    try {
      await saveDoc('captures', captureId, placeholder);
      openCapturesModal();
      await dispatchExtractionWorker(captureId, cleanUrl);
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
  const prompt = `Identify why a user saved this URL for Active Desks: ${url}. Return JSON with { domain: string, topic: string, title: string, summary: string, creator: string, destinationUrl: string|null, sections: [{ heading: string, style: "checklist"|"numbered"|"bullets", items: [{ text: string, detail: string }] }] }`;
  const parsed = await callGeminiJson(prompt);
  if (parsed) {
    if (parsed.destinationUrl && !parsed.blogUrl) parsed.blogUrl = parsed.destinationUrl;
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
 * Strips tracking parameters, affiliate tokens, and ephemeral session IDs from URLs upon intake.
 *
 * @purpose Ensures clean canonical links in Firestore, avoiding bloated URLs and tracking leakage.
 * @inputs {string} rawUrl - Unsanitized URL string.
 * @outputs {string} Sanitized canonical URL string.
 */
export function sanitizeCaptureUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  try {
    const u = new URL(trimmed);
    const host = u.hostname.toLowerCase();

    // 1. Instagram: Posts, reels, and stories require zero query parameters
    if (host.includes('instagram.com')) {
      u.search = '';
      u.hash = '';
      // Normalize /reels/ -> /reel/
      u.pathname = u.pathname.replace(/\/reels\//i, '/reel/');
      return u.toString();
    }

    // 2. YouTube: Retain video ID (v) and start time (t), strip all share and marketing tracking
    if (host.includes('youtube.com') || host.includes('youtu.be')) {
      const allowedParams = new Set(['v', 't']);
      const kept = new URLSearchParams();
      u.searchParams.forEach((val, key) => {
        if (allowedParams.has(key)) {
          kept.set(key, val);
        }
      });
      u.search = kept.toString() ? `?${kept.toString()}` : '';
      u.hash = '';
      return u.toString();
    }

    // 3. TikTok: Retain clean video path, strip all referral and device tracking
    if (host.includes('tiktok.com')) {
      u.search = '';
      u.hash = '';
      return u.toString();
    }

    // 4. Universal Web: Strip marketing, social, and affiliate tracking parameters
    const universalTrackers = new Set([
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
      'fbclid', 'gclid', 'gclsrc', 'dclid', 'msclkid', 'twclid',
      'igsh', 'igshid', 'rpxt', 'psln', 'srtk', 'vrfl', 'dlrf', 'exln', 'xtok', 'obrf',
      'si', 'feature', 'pp', 'sender_device', 'is_from_webapp', '_r', '_t', 'share_app_id',
      'ref', 'ref_', 'pf_rd_r', 'pf_rd_m', 'pf_rd_p', 'pf_rd_i', 'pf_rd_s', 'pf_rd_t',
      'tag', 'linkcode', 'spm', 'scm', 'pvid'
    ]);

    const cleanParams = new URLSearchParams();
    u.searchParams.forEach((val, key) => {
      const lowerKey = key.toLowerCase();
      if (!universalTrackers.has(lowerKey) && !lowerKey.startsWith('utm_')) {
        cleanParams.set(key, val);
      }
    });

    u.search = cleanParams.toString() ? `?${cleanParams.toString()}` : '';
    u.hash = '';
    return u.toString();
  } catch (err) {
    return trimmed;
  }
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
  const sanitized = sanitizeCaptureUrl(rawUrl);
  try {
    const u = new URL(sanitized);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, '');
    const query = u.search ? u.search : '';
    return `${host}${path}${query}`.toLowerCase();
  } catch (e) {
    return sanitized.toLowerCase().replace(/\/+$/, '');
  }
}
