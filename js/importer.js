/**
 * @file importer.js
 * @description Non-destructive migration adapter converting legacy Active Desks v1.0
 * localStorage structures and static JSON files into the v2.0 IndexedDB 3-Tier Universal Schema.
 */

import { bulkPut, put } from './db.js';

/**
 * Normalizes a legacy v1 capture into the 3-Tier Universal Schema format.
 * 
 * @purpose Maps unstructured or legacy capture payloads into predictable Tier 1/2/3 shapes.
 * @inputs {object} raw - Raw capture object from v1 localStorage or captures.json.
 * @outputs {object} Normalized UniversalCapture record conforming to docs/universal-capture-schema.md.
 * @sideEffects Pure transformation function; no side effects.
 */
export function normalizeLegacyCapture(raw) {
  const id = typeof raw.id === 'number' ? raw.id : (parseInt(raw.id, 10) || Date.now());
  const domain = (raw.domain || 'misc').toLowerCase();
  const topic = raw.topic || (domain === 'book' ? 'Reading' : 'General');
  const title = (raw.title || raw.text || raw.rawText || 'Untitled Capture').trim();
  const summary = (raw.summary || raw.note || raw.highlight || title).trim();
  const creator = raw.creator || raw.source || raw.author || null;
  const sourceUrl = raw.sourceUrl || raw.url || null;
  const createdAt = raw.createdAt || (raw.time ? new Date().toISOString() : new Date().toISOString());
  const status = raw.status === 'processed' ? 'processed' : 'pending';

  // Map legacy mediaStatus
  let mediaStatus = 'text_images';
  if (raw.mediaStatus) {
    mediaStatus = raw.mediaStatus;
  } else if (!sourceUrl) {
    mediaStatus = 'text_images';
  } else if (raw.videoExtracted || raw.status === 'video_extracted') {
    mediaStatus = 'video_extracted';
  }

  // Build Tier 2 Meta Badges dynamically from available properties
  const meta = [];
  const payload = raw.payload || {};

  if (payload.author || raw.author) {
    meta.push({ label: 'Author', value: String(payload.author || raw.author) });
  }
  if (payload.platform || raw.platform) {
    meta.push({ label: 'Platform', value: String(payload.platform || raw.platform) });
  }
  if (payload.yield || raw.yield) {
    meta.push({ label: 'Yield', value: String(payload.yield || raw.yield) });
  }
  if (payload.genre) {
    meta.push({ label: 'Genre', value: String(payload.genre) });
  }
  if (payload.calories) {
    meta.push({ label: 'Calories', value: String(payload.calories) });
  }

  // Build Tier 3 Adaptive Body: detect collection vs guide vs note
  let body = { format: 'note', takeaways: [], highlight: null };

  // Detection A: Curated Collection (e.g. tools, listicle of books/games)
  if (Array.isArray(payload.items) && payload.items.length > 0) {
    body = {
      format: 'collection',
      items: payload.items.map(it => ({
        title: it.title || it.name || 'Untitled Item',
        subtitle: it.subtitle || it.transform || '',
        detail: it.detail || it.purpose || it.description || '',
        linkUrl: it.linkUrl || it.url || null
      }))
    };
  } else if (Array.isArray(payload.books) && payload.books.length > 0) {
    body = {
      format: 'collection',
      items: payload.books.map(b => ({
        title: b.title || 'Untitled Book',
        subtitle: b.author ? `by ${b.author}` : '',
        detail: b.blurb || b.summary || b.highlight || '',
        linkUrl: b.url || null
      }))
    };
  }
  // Detection B: Guide / Recipe (checklist + sequential steps)
  else if (Array.isArray(raw.ingredients) || Array.isArray(payload.ingredients) || Array.isArray(payload.ingredientSections)) {
    const rawIngs = payload.ingredients || raw.ingredients || [];
    const rawSteps = payload.steps || raw.steps || [];

    const checklist = rawIngs.map(ing => ({
      text: typeof ing === 'string' ? ing : (ing.text || String(ing)),
      checked: false
    }));

    const steps = rawSteps.map((st, idx) => ({
      stepNumber: idx + 1,
      instruction: typeof st === 'string' ? st : (st.instruction || String(st))
    }));

    body = {
      format: 'guide',
      checklist,
      steps
    };
  }
  // Detection C: Note (single book, game, raw thought, or ungrounded link)
  else {
    const takeaways = Array.isArray(payload.keyTakeaways)
      ? payload.keyTakeaways
      : (Array.isArray(raw.takeaways) ? raw.takeaways : []);

    body = {
      format: 'note',
      takeaways: takeaways.length > 0 ? takeaways : [summary],
      highlight: payload.highlight || payload.questOrGoal || raw.highlight || null
    };
  }

  return {
    id,
    domain,
    topic,
    title,
    summary,
    creator,
    sourceUrl,
    createdAt,
    status,
    mediaStatus,
    searchPerformed: raw.searchPerformed !== undefined ? !!raw.searchPerformed : (status === 'processed'),
    meta,
    body
  };
}

/**
 * Migrates data from legacy Active Desks v1 structures into v2 IndexedDB.
 * 
 * @purpose Ingests v1 state snapshots and populates 'captures', 'desks', 'anchors', and 'settings'.
 * @inputs {object} v1Snapshot - Object containing legacy desks, captures, buckets/anchors, or raw localStorage dump.
 * @outputs {Promise<{ capturesCount: number, desksCount: number, anchorsCount: number }>} Summary of imported records.
 * @sideEffects Writes records into IndexedDB across multiple stores. Leaves source inputs untouched.
 */
export async function migrateFromV1(v1Snapshot = {}) {
  const result = {
    capturesCount: 0,
    desksCount: 0,
    anchorsCount: 0
  };

  // 1. Ingest Captures
  const rawCaptures = Array.isArray(v1Snapshot.captures)
    ? v1Snapshot.captures
    : (Array.isArray(v1Snapshot.captureStream) ? v1Snapshot.captureStream : []);

  if (rawCaptures.length > 0) {
    const normalizedCaptures = rawCaptures.map(normalizeLegacyCapture);
    result.capturesCount = await bulkPut('captures', normalizedCaptures);
  }

  // 2. Ingest Desks (Reading, Kitchen, Gaming, Fiber, Tech, Active Selection)
  const legacyDesks = v1Snapshot.desks || {};
  const deskRecords = [];

  // Reading Desk
  if (legacyDesks.reading || v1Snapshot.reading) {
    const r = legacyDesks.reading || v1Snapshot.reading;
    deskRecords.push({
      id: 'reading',
      title: r.title || 'Untitled Book',
      author: r.author || '',
      currentPage: r.currentPage || 0,
      totalPages: r.totalPages || 100,
      unit: r.unit || 'pages',
      storygraphUrl: r.storygraphUrl || '',
      lastUpdated: r.lastUpdated || new Date().toISOString()
    });
  }

  // Fiber Arts Desk
  if (legacyDesks.fiber || v1Snapshot.fiber) {
    const f = legacyDesks.fiber || v1Snapshot.fiber;
    deskRecords.push({
      id: 'fiber',
      name: f.name || 'WIP Project',
      type: f.type || 'Knitting WIP',
      rows: f.rows || 0,
      targetRows: f.targetRows || null,
      specs: f.specs || '',
      linkUrl: f.linkUrl || '',
      linkText: f.linkText || 'Open Pattern',
      lastUpdated: f.lastUpdated || new Date().toISOString()
    });
  }

  // Game Rig Desk
  if (legacyDesks.gaming || v1Snapshot.gaming) {
    const g = legacyDesks.gaming || v1Snapshot.gaming;
    deskRecords.push({
      id: 'gaming',
      title: g.title || 'Active Playthrough',
      platform: g.platform || 'PC / Steam',
      quest: g.quest || '',
      linkUrl: g.linkUrl || '',
      lastUpdated: g.lastUpdated || new Date().toISOString()
    });
  }

  // Tech Workbench
  if (legacyDesks.tech || v1Snapshot.tech) {
    const t = legacyDesks.tech || v1Snapshot.tech;
    deskRecords.push({
      id: 'tech',
      title: t.title || 'Tech Workbench',
      stack: t.stack || '3D Printing & Dev',
      focus: t.focus || '',
      linkUrl: t.linkUrl || '',
      lastUpdated: t.lastUpdated || new Date().toISOString()
    });
  }

  // Kitchen Desk
  if (legacyDesks.recipe || v1Snapshot.recipe) {
    const k = legacyDesks.recipe || v1Snapshot.recipe;
    deskRecords.push({
      id: 'kitchen',
      selectedIndex: k.selectedIndex || 0,
      recipes: Array.isArray(k.recipes) ? k.recipes : [],
      lastUpdated: new Date().toISOString()
    });
  }

  // Active Desk Concentration Selection (4-Workbench cap)
  const activeIds = Array.isArray(v1Snapshot.activeDeskIds)
    ? v1Snapshot.activeDeskIds
    : ['reading', 'kitchen', 'gaming', 'fiber'];

  deskRecords.push({
    id: 'active_selection',
    activeDeskIds: activeIds,
    lastUpdated: new Date().toISOString()
  });

  if (deskRecords.length > 0) {
    result.desksCount = await bulkPut('desks', deskRecords);
  }

  // 3. Ingest Anchors
  if (v1Snapshot.buckets || v1Snapshot.anchors) {
    const b = v1Snapshot.buckets || v1Snapshot.anchors;
    const today = (v1Snapshot.date || new Date().toISOString()).split('T')[0];
    const anchorRecord = {
      date: today,
      home: !!(b.home?.checked ?? b.home),
      body: !!(b.body?.checked ?? b.body),
      spark: !!(b.spark?.checked ?? b.spark),
      updatedAt: new Date().toISOString()
    };
    await put('anchors', anchorRecord);
    result.anchorsCount = 1;
  }

  return result;
}
