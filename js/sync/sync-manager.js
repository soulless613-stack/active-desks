/**
 * @file sync-manager.js
 * @description Unified Synchronization Manager for Active Desks v2.0.
 * Orchestrates calm background debounce, page lifecycle flush hooks (keepalive),
 * and delegates to the GitHub Cloud Sync provider or offline mode.
 */

import { state } from '../state.js';
import {
  isGitHubConnected,
  pushToGitHub,
  pullFromGitHub
} from './github-provider.js';

let debounceTimer = null;
const DEBOUNCE_DELAY_MS = 3000;
let syncStatus = 'synced'; // 'synced' | 'pending' | 'syncing' | 'error'

/**
 * Triggers a debounced sync request after any local mutation.
 * 
 * @purpose Batches rapid micro-taps into a single calm background commit.
 * @inputs None.
 * @outputs {void}
 */
export function queueSync() {
  const provider = state.settings?.sync_provider || 'offline';
  if (provider !== 'github' || !isGitHubConnected()) return;

  setSyncBadge('pending', 'Unsynced');

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(async () => {
    debounceTimer = null;
    await performSync(false);
  }, DEBOUNCE_DELAY_MS);
}

/**
 * Executes an immediate synchronization push.
 * 
 * @purpose Flushes pending local state to remote repository.
 * @inputs {boolean} [useKeepalive=false] - Whether to use the keepalive flag for tab closure.
 * @outputs {Promise<void>}
 */
export async function performSync(useKeepalive = false) {
  const provider = state.settings?.sync_provider || 'offline';
  if (provider !== 'github' || !isGitHubConnected()) {
    setSyncBadge('synced', provider === 'offline' ? 'Offline' : 'Local');
    return;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  setSyncBadge('syncing', 'Syncing...');

  try {
    await pushToGitHub(useKeepalive);
    setSyncBadge('synced', 'GitHub');
  } catch (err) {
    console.error('GitHub Sync push failed:', err);
    setSyncBadge('error', 'Sync Error');
  }
}

/**
 * Executes a pull from GitHub to ingest remote updates.
 * 
 * @purpose Refreshes local IndexedDB stores when switching to this device.
 * @outputs {Promise<void>}
 */
export async function performPull() {
  const provider = state.settings?.sync_provider || 'offline';
  if (provider !== 'github' || !isGitHubConnected()) return;

  try {
    const result = await pullFromGitHub();
    if (result.status === 'synced' && result.countMerged > 0) {
      console.log(`📥 Merged ${result.countMerged} remote updates from GitHub.`);
    }
    setSyncBadge('synced', 'GitHub');
  } catch (err) {
    console.warn('GitHub Pull failed or skipped:', err);
  }
}

/**
 * Updates the header sync status badge.
 * 
 * @purpose Displays live sync status in the top bar.
 * @inputs {string} status - 'synced' | 'pending' | 'syncing' | 'error'
 * @inputs {string} text - Human-readable label (e.g. 'GitHub', 'Offline', 'Syncing...')
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
 * Initializes the sync manager listeners, lifecycle hooks, and startup pull.
 * 
 * @purpose Sets up automated background sync and pagehide keepalive handlers.
 * @inputs None.
 * @outputs {void}
 */
export function initSyncManager() {
  const provider = state.settings?.sync_provider || 'offline';
  const connected = isGitHubConnected();

  // 1. Initial Badge State
  if (provider === 'github' && connected) {
    setSyncBadge('synced', 'GitHub');
    // Inbound pull on startup to ingest any updates made from other devices
    performPull();
  } else {
    setSyncBadge('synced', 'Offline');
  }

  // 2. Lifecycle Hook: Page Visibility Change
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      // User locked phone or switched apps: flush pending debounce immediately with keepalive
      if (debounceTimer) {
        performSync(true);
      }
    } else if (document.visibilityState === 'visible') {
      // User returned to app: pull latest remote changes
      if (state.settings?.sync_provider === 'github' && isGitHubConnected()) {
        performPull();
      }
    }
  });

  // 3. Lifecycle Hook: Tab Close / Pagehide
  window.addEventListener('pagehide', () => {
    if (debounceTimer) {
      performSync(true);
    }
  });

  // 4. Window Focus Hook: Desktop browser tab focused
  window.addEventListener('focus', () => {
    if (state.settings?.sync_provider === 'github' && isGitHubConnected()) {
      performPull();
    }
  });
}
