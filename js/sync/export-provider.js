/**
 * @file export-provider.js
 * @description Standalone manual JSON backup export and restore adapter for Active Desks v2.0.
 * Zero cloud dependency; operates 100% locally in the browser.
 */

import * as db from '../db.js';

/**
 * Compiles all IndexedDB stores into a single timestamped JSON backup object and triggers browser download.
 * 
 * @purpose Creates a complete, portable offline snapshot of the user's data.
 * @inputs None.
 * @outputs {Promise<void>}
 * @sideEffects Triggers browser file download dialog.
 */
export async function exportFullBackup() {
  const [desks, anchors, captures, settings] = await Promise.all([
    db.getAll('desks'),
    db.getAll('anchors'),
    db.getAll('captures'),
    db.getAll('settings')
  ]);

  // Strip private secrets from backup if present for security
  const sanitizedSettings = settings.map(s => {
    if (s.key === 'gemini_api_key') {
      return { ...s, value: '' };
    }
    return s;
  });

  const payload = {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    stores: {
      desks,
      anchors,
      captures,
      settings: sanitizedSettings
    }
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  const dateTag = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `active-desks-v2-backup-${dateTag}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Ingests a JSON backup file and restores records into IndexedDB stores.
 * 
 * @purpose Restores state from an exported backup file.
 * @inputs {File} file - User-selected JSON backup file.
 * @outputs {Promise<{ desks: number, anchors: number, captures: number }>} Counts of restored records.
 * @sideEffects Mutates all IndexedDB stores.
 */
export async function importFullBackup(file) {
  if (!file) throw new Error('No file provided');

  const text = await file.text();
  const data = JSON.parse(text);

  if (!data.stores) {
    throw new Error('Invalid Active Desks backup format: missing stores envelope');
  }

  const results = { desks: 0, anchors: 0, captures: 0 };

  if (Array.isArray(data.stores.desks) && data.stores.desks.length > 0) {
    results.desks = await db.bulkPut('desks', data.stores.desks);
  }

  if (Array.isArray(data.stores.anchors) && data.stores.anchors.length > 0) {
    results.anchors = await db.bulkPut('anchors', data.stores.anchors);
  }

  if (Array.isArray(data.stores.captures) && data.stores.captures.length > 0) {
    results.captures = await db.bulkPut('captures', data.stores.captures);
  }

  return results;
}
