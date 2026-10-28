/**
 * @file sync-manager.js
 * @description Unified Synchronization Manager for Active Desks v2.0.
 * Orchestrates the 2.5-second debounce queue, compiles database snapshots,
 * and delegates to the active sync provider (Google Drive, P2P, or Offline).
 */

import * as db from '../db.js';
import { state } from '../state.js';
import { uploadToDrive, fetchFromDrive, isDriveConnected } from './drive-provider.js';

let debounceTimer = null;
const DEBOUNCE_DELAY_MS = 2500;
let syncStatus = 'synced'; // 'synced' | 'pending' | 'syncing' | 'error'

/**
 * Triggers a debounced sync request after any local mutation.
 * 
 * @purpose Batches rapid micro-taps into a single calm background upload.
 * @inputs None.
 * @outputs {void}
 */
export function queueSync() {
  const provider = state.settings?.sync_provider || 'offline';
  if (provider === 'offline') return;

  setSyncBadge('pending', 'Unsynced');

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    await performSync();
  }, DEBOUNCE_DELAY_MS);
}

/**
 * Executes the immediate synchronization flush.
 */
export async function performSync() {
  const provider = state.settings?.sync_provider || 'offline';
  if (provider === 'offline') {
    setSyncBadge('synced', 'Offline');
    return;
  }

  setSyncBadge('syncing', 'Syncing...');

  try {
    if (provider === 'drive' && isDriveConnected()) {
      const payload = await compileSyncPayload();
      await uploadToDrive(payload);
      setSyncBadge('synced', 'Synced');
    } else {
      setSyncBadge('synced', 'Local');
    }
  } catch (err) {
    console.error('Sync failed:', err);
    setSyncBadge('error', 'Sync Error');
  }
}

/**
 * Compiles a serialized snapshot of IndexedDB stores for transport.
 */
async function compileSyncPayload() {
  const [desks, anchors, captures] = await Promise.all([
    db.getAll('desks'),
    db.getAll('anchors'),
    db.getAll('captures')
  ]);

  return {
    version: '2.0',
    syncedAt: new Date().toISOString(),
    stores: {
      desks,
      anchors,
      captures
    }
  };
}

/**
 * Updates the header sync status badge.
 */
export function setSyncBadge(status, text) {
  syncStatus = status;
  const dot = document.getElementById('header-sync-dot');
  const label = document.getElementById('header-sync-text');

  if (dot && label) {
    label.textContent = text;
    dot.className = 'sync-dot';

    if (status === 'syncing') dot.style.background = '#38bdf8';
    else if (status === 'pending') dot.style.background = '#fbbf24';
    else if (status === 'error') dot.style.background = '#f87171';
    else dot.style.background = '#34d399';
  }
}

/**
 * Initializes the sync manager listeners.
 */
export function initSyncManager() {
  const provider = state.settings?.sync_provider || 'offline';
  setSyncBadge('synced', provider === 'offline' ? 'Offline' : 'Local');
}
