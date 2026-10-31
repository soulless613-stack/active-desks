/**
 * @file state.js
 * @description Lightweight reactive state bus and in-memory cache for Active Desks v3.0.
 * Bridges Firestore real-time snapshot streams to UI components for 0ms render latency.
 */

import { saveDoc, deleteDocById } from './firebase.js';

export const APP_VERSION = 'v3.0.15';

export const CANONICAL_DESK_MAP = {
  book: 'reading',
  recipe: 'kitchen',
  game: 'gaming',
  fiber: 'fiber',
  tech: 'tech'
};

const CANDIDATE_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite'];

/**
 * In-memory global state cache.
 */
export const state = {
  activeDeskIds: ['reading', 'kitchen', 'gaming', 'fiber'],
  desks: {},
  anchors: {
    date: new Date().toISOString().split('T')[0],
    home: false,
    body: false,
    spark: false
  },
  captures: [],
  settings: {
    gemini_api_key: '',
    github_token: '',
    gemini_model: 'gemini-2.5-flash'
  }
};

/** @type {Map<string, Set<Function>>} Registered reactive subscribers */
const subscribers = new Map();

/**
 * Subscribes a listener to a state slice.
 * 
 * @purpose Enables fine-grained component re-rendering without full page redraws.
 * @inputs {string} key - Slice name ('anchors', 'desks', 'activeDeskIds', 'captures', 'settings').
 * @inputs {Function} callback - Invoked when slice updates.
 * @outputs {Function} Unsubscribe teardown handle.
 */
export function subscribe(key, callback) {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key).add(callback);
  return () => subscribers.get(key)?.delete(callback);
}

/**
 * Dispatches a reactive update notification to all subscribers of a slice.
 * 
 * @purpose Synchronously alerts listeners to re-render.
 * @inputs {string} key - State slice identifier.
 * @outputs {void}
 */
export function emit(key) {
  subscribers.get(key)?.forEach(fn => {
    try {
      fn(state[key]);
    } catch (err) {
      console.error(`Error in state subscriber for [${key}]:`, err);
    }
  });
}

/**
 * Updates or creates a workbench and writes to Firestore.
 * 
 * @purpose Mutates desk data with zero UI lag and persists remotely.
 * @inputs {string} deskId - Target workbench ID.
 * @inputs {object} patch - Changes to apply.
 * @outputs {Promise<void>}
 */
export async function updateDesk(deskId, patch) {
  if (!state.desks[deskId]) {
    state.desks[deskId] = { id: deskId };
  }
  Object.assign(state.desks[deskId], patch, { lastUpdated: new Date().toISOString() });
  emit('desks');

  await saveDoc('desks', deskId, state.desks[deskId]);
}

/**
 * Updates the 4 active workbench IDs.
 * 
 * @purpose Swaps or rotates the 4 displayed workbenches.
 * @inputs {Array<string>} newActiveIds - Exactly 4 desk IDs to display.
 * @outputs {Promise<void>}
 */
export async function setActiveDeskIds(newActiveIds) {
  state.activeDeskIds = newActiveIds.slice(0, 4);
  emit('activeDeskIds');

  await saveDoc('desks', 'active_selection', {
    activeDeskIds: state.activeDeskIds,
    lastUpdated: new Date().toISOString()
  });
}

/**
 * Toggles a daily rhythm anchor.
 * 
 * @purpose Updates Home, Body, or Spark completion state.
 * @inputs {'home' | 'body' | 'spark'} key - Anchor key.
 * @outputs {Promise<void>}
 */
export async function toggleAnchor(key) {
  if (state.anchors[key] === undefined) return;
  state.anchors[key] = !state.anchors[key];
  state.anchors.updatedAt = new Date().toISOString();
  emit('anchors');

  const today = state.anchors.date || new Date().toISOString().split('T')[0];
  await saveDoc('anchors', today, state.anchors);
}

/**
 * Seeds default workbenches if the desks collection is uninitialized.
 * 
 * @purpose Provides out-of-the-box workbenches on first launch.
 * @inputs {Array<object>} existingDesks - Existing desks returned from Firestore.
 * @outputs {Promise<void>}
 */
export async function seedDefaultDesksIfEmpty(existingDesks) {
  const deskMap = {};
  for (const d of existingDesks) {
    if (d.id !== 'active_selection') {
      deskMap[d.id] = d;
    }
  }

  const defaultSeeds = [
    {
      id: 'reading',
      domain: 'book',
      title: 'Oathbringer',
      author: 'Brandon Sanderson',
      currentPage: 1119,
      totalPages: 1243,
      unit: 'pages',
      storygraphUrl: 'https://app.thestorygraph.com',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'kitchen',
      domain: 'recipe',
      title: 'Kitchen Shelf',
      selectedIndex: 0,
      recipes: [
        {
          id: 'butter-chicken-mac',
          title: 'Butter Chicken Mac N Cheese',
          source: 'Tom Walsh (@stealth_health_life)',
          highlight: 'High protein slow cooker chicken folded into Greek yogurt & cheddar mac.'
        }
      ],
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'gaming',
      domain: 'game',
      title: 'Baldurs Gate 3',
      platform: 'PC / Steam',
      quest: 'Underdark: Forge Adamantine armor & find Grymforge secrets.',
      linkUrl: 'https://bg3.wiki',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'fiber',
      domain: 'fiber',
      name: 'Autumn Cardigan',
      type: 'Knitting WIP',
      rows: 44,
      targetRows: 120,
      specs: 'US 7 (4.5mm) - DK Weight',
      linkUrl: 'https://www.ravelry.com',
      lastUpdated: new Date().toISOString()
    },
    {
      id: 'tech',
      domain: 'tech',
      title: 'PressPrint Lab Parametric Boxes',
      stack: '3D Printing & Parametric CAD',
      focus: 'Parametric hinged boxes with customized compartment grids & embossed lids.',
      linkUrl: 'https://github.com',
      lastUpdated: new Date().toISOString()
    }
  ];

  for (const seed of defaultSeeds) {
    if (!deskMap[seed.id]) {
      deskMap[seed.id] = seed;
      await saveDoc('desks', seed.id, seed);
    }
  }

  state.desks = deskMap;
  emit('desks');
}

/**
 * Escapes unsafe HTML characters to prevent XSS.
 * 
 * @purpose HTML sanitization helper for user-generated capture and desk strings.
 * @inputs {string} str - Unsanitized string.
 * @outputs {string} Sanitized string safe for DOM interpolation.
 */
export function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

/**
 * Capitalizes the first character of a string.
 * 
 * @purpose Formats domain and label slugs for UI display.
 * @inputs {string} s - Input string.
 * @outputs {string} Capitalized string.
 */
export function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Retrieves a setting from in-memory state or localStorage fallback.
 * 
 * @purpose Centralizes credential and setting lookup across modules.
 * @inputs {string} key - Property name in state.settings.
 * @inputs {string} storageKey - Fallback localStorage key.
 * @outputs {string} Trimmed setting value.
 */
export function getSetting(key, storageKey) {
  return (state.settings?.[key] || localStorage.getItem(storageKey) || '').trim();
}

/**
 * Renders standardized Blog and Source external link buttons for desk and capture cards.
 * 
 * @purpose Provides uniform footer link buttons across all workbenches and capture stream cards.
 * @inputs {string} [blogUrl] - Optional secondary blog/article destination URL.
 * @inputs {string} [sourceUrl] - Primary source URL.
 * @inputs {boolean} [stopProp=false] - Whether to attach onclick="event.stopPropagation()".
 * @outputs {string} HTML string of anchor buttons.
 */
export function renderExternalLinksHtml(blogUrl, sourceUrl, stopProp = false) {
  const stopAttr = stopProp ? ' onclick="event.stopPropagation()"' : '';
  const blogBtn = blogUrl && blogUrl !== sourceUrl
    ? `<a href="${escapeHtml(blogUrl)}" target="_blank" rel="noopener noreferrer" class="desk-action-btn" style="color: var(--accent-cyan); font-weight: 600;"${stopAttr}>Blog ↗</a>`
    : '';
  const sourceBtn = sourceUrl
    ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer" class="desk-action-btn"${stopAttr}>Source ↗</a>`
    : '';
  return `${blogBtn}${sourceBtn}`;
}

/**
 * Queries the Gemini API with automatic model fallback and returns parsed JSON.
 * 
 * @purpose Centralizes client-side Gemini JSON generation for taxonomy and fallback extraction.
 * @inputs {string} prompt - Prompt text instructing JSON output.
 * @inputs {number} [temperature=0.2] - Sampling temperature.
 * @outputs {Promise<object|null>} Parsed JSON response or null if all candidate models fail.
 */
export async function callGeminiJson(prompt, temperature = 0.2) {
  const apiKey = getSetting('gemini_api_key', 'active_desks_gemini_key');
  if (!apiKey) return null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            responseMimeType: 'application/json'
          }
        })
      });

      if (!res.ok) continue;
      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (rawText) {
        return JSON.parse(rawText);
      }
    } catch (err) {
      console.warn(`Gemini model [${model}] fallback error:`, err);
    }
  }
  return null;
}
