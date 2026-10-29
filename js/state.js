/**
 * @file state.js
 * @description Lightweight reactive state bus and observer registry for Active Desks v2.0.
 * Decouples IndexedDB asynchronous persistence from 0ms in-memory UI renders.
 */

import * as db from './db.js';

/** Active bundle cache identifier */
export const APP_VERSION = 'active-desks-v2-1.1.2';

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
  settings: {
    gemini_api_key: '',
    gemini_model: 'gemini-3.5-flash-lite',
    search_grounding_enabled: true,
    sync_provider: 'local'
  }
};

/** @type {Map<string, Set<Function>>} Registered reactive subscribers */
const subscribers = new Map();

/**
 * Subscribes a listener to changes on a specific state slice.
 * 
 * @purpose Enables targeted component re-rendering without full page redraws.
 * @inputs {string} key - State slice identifier ('anchors', 'desks', 'activeDeskIds', etc.).
 * @inputs {Function} callback - Invoked when the slice updates.
 * @outputs {Function} Unsubscribe teardown function.
 * @sideEffects Registers the callback in the internal subscriber map.
 */
export function subscribe(key, callback) {
  if (!subscribers.has(key)) {
    subscribers.set(key, new Set());
  }
  subscribers.get(key).add(callback);

  return () => {
    subscribers.get(key)?.delete(callback);
  };
}

/**
 * Emits an update event to all registered subscribers for a slice.
 * 
 * @purpose Dispatches notifications to subscribed UI renderers.
 * @inputs {string} key - State slice identifier.
 * @outputs {void}
 * @sideEffects Invokes callback functions synchronously.
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
 * Loads the initial state from IndexedDB into memory, seeding defaults if empty.
 * 
 * @purpose Boots the reactive cache on startup before UI mounting.
 * @inputs None.
 * @outputs {Promise<void>} Resolves when in-memory state is synchronized with IndexedDB.
 * @sideEffects Reads and writes to IndexedDB stores.
 */
export async function loadInitialState() {
  await db.openDB();

  // 1. Load or Seed Active Desk Selection
  const activeSelectionRecord = await db.get('desks', 'active_selection');
  if (activeSelectionRecord && Array.isArray(activeSelectionRecord.activeDeskIds)) {
    state.activeDeskIds = activeSelectionRecord.activeDeskIds;
  } else {
    // Seed default selection
    await db.put('desks', {
      id: 'active_selection',
      activeDeskIds: state.activeDeskIds,
      lastUpdated: new Date().toISOString()
    });
  }

  // 2. Load or Seed Desks
  const allDesks = await db.getAll('desks');
  const deskMap = {};
  for (const d of allDesks) {
    if (d.id !== 'active_selection') {
      deskMap[d.id] = d;
    }
  }

  // Seed default 5 desks if empty
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
      await db.put('desks', seed);
    }
  }
  state.desks = deskMap;

  // 2b. Connect Recipe Captures to Kitchen Shelf Desk
  const recipeCaptures = await db.getAll('captures', 'by_domain', 'recipe');
  if (state.desks.kitchen) {
    state.desks.kitchen.recipes = recipeCaptures;
  }

  // 3. Load or Seed Daily 3 Anchors (Midnight reset aware)
  const today = new Date().toISOString().split('T')[0];
  const todayAnchors = await db.get('anchors', today);
  if (todayAnchors) {
    state.anchors = todayAnchors;
  } else {
    state.anchors = {
      date: today,
      home: false,
      body: false,
      spark: false,
      updatedAt: new Date().toISOString()
    };
    await db.put('anchors', state.anchors);
  }

  // 4. Load Settings & sanitize obsolete or non-existent models
  const allSettings = await db.getAll('settings');
  for (const s of allSettings) {
    if (s.key && s.value !== undefined) {
      state.settings[s.key] = s.value;
    }
  }

  // Auto-migrate non-existent model name or expensive omni/tts models
  if (!state.settings.gemini_model ||
      state.settings.gemini_model === 'gemini-3.8-flash-lite' ||
      /omni|tts/i.test(state.settings.gemini_model)) {
    state.settings.gemini_model = 'gemini-3.5-flash-lite';
    await db.put('settings', { key: 'gemini_model', value: 'gemini-3.5-flash-lite', updatedAt: new Date().toISOString() });
  }
}

/**
 * Updates a specific workbench in memory and persists to IndexedDB.
 * 
 * @purpose Modifies desk data with zero UI lag and updates subscribers.
 * @inputs {string} deskId - Target workbench ID.
 * @inputs {object} patch - Partial object to merge into the desk record.
 * @outputs {Promise<void>}
 * @sideEffects Mutates in-memory state and performs asynchronous IndexedDB write.
 */
export async function updateDesk(deskId, patch) {
  if (!state.desks[deskId]) {
    state.desks[deskId] = { id: deskId };
  }
  Object.assign(state.desks[deskId], patch, { lastUpdated: new Date().toISOString() });
  emit('desks');

  // Asynchronous background persistence
  await db.put('desks', state.desks[deskId]);
}

/**
 * Updates the 4 active workbench IDs.
 * 
 * @purpose Swaps or rotates active workbenches while enforcing the 4-desk display cap.
 * @inputs {Array<string>} newActiveIds - Exactly 4 workbench IDs to display.
 * @outputs {Promise<void>}
 * @sideEffects Mutates activeDeskIds, notifies subscribers, and updates IndexedDB.
 */
export async function setActiveDeskIds(newActiveIds) {
  state.activeDeskIds = newActiveIds.slice(0, 4);
  emit('activeDeskIds');

  await db.put('desks', {
    id: 'active_selection',
    activeDeskIds: state.activeDeskIds,
    lastUpdated: new Date().toISOString()
  });
}

/**
 * Toggles a daily anchor check.
 * 
 * @purpose Updates Home, Body, or Spark completion state.
 * @inputs {'home' | 'body' | 'spark'} key - Target anchor bucket.
 * @outputs {Promise<void>}
 * @sideEffects Mutates state.anchors, emits 'anchors', and writes to IndexedDB.
 */
export async function toggleAnchor(key) {
  if (state.anchors[key] === undefined) return;
  state.anchors[key] = !state.anchors[key];
  state.anchors.updatedAt = new Date().toISOString();
  emit('anchors');

  await db.put('anchors', state.anchors);
}
