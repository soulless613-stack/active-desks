/**
 * @file app.js
 * @description Main application entry point for Active Desks v3.0.
 * Orchestrates Firebase Firestore initialization, real-time collection listeners,
 * QR setup consumption, component mounting, and service worker registration.
 */

import { initFirebase, onCollection, onDoc } from './firebase.js';
import { state, emit, seedDefaultDesksIfEmpty } from './state.js';
import { initAnchors } from './anchors.js';
import { initDeskManager } from './desks/desk-manager.js';
import { initCaptureDock } from './captures/capture-dock.js';
import { initCapturesDrawer } from './captures/drawer.js';
import { initTaxonomyScanner } from './captures/taxonomy.js';
import { initSettingsModal, consumeSetupHashIfPresent } from './settings-modal.js';

/**
 * Boots the Active Desks v3 runtime.
 */
async function bootApp() {
  console.log('🚀 Booting Active Desks v3.0 (Firebase Engine)...');

  // 1. Consume QR Setup Hash if scanned from mobile camera
  consumeSetupHashIfPresent();

  // Load existing credentials from localStorage into state
  state.settings.gemini_api_key = localStorage.getItem('active_desks_gemini_key') || '';
  state.settings.github_token = localStorage.getItem('active_desks_github_token') || '';

  // 2. Mount UI Components
  initAnchors();
  initDeskManager();
  initCaptureDock();
  initCapturesDrawer();
  initTaxonomyScanner();
  initSettingsModal();

  // 3. Connect to Firebase Firestore
  const syncPill = document.getElementById('header-sync-pill');
  const syncDot = document.getElementById('header-sync-dot');
  const syncText = document.getElementById('header-sync-text');

  try {
    await initFirebase();
    if (syncDot) syncDot.style.background = '#34d399';
    if (syncText) syncText.textContent = 'Live';

    // 4. Subscribe to Real-Time Firestore Collections
    // A. Desks Collection
    onCollection('desks', async (desks) => {
      if (desks.length === 0) {
        await seedDefaultDesksIfEmpty([]);
        return;
      }

      const activeRecord = desks.find(d => d.id === 'active_selection');
      if (activeRecord && Array.isArray(activeRecord.activeDeskIds)) {
        state.activeDeskIds = activeRecord.activeDeskIds;
        emit('activeDeskIds');
      }

      const deskMap = {};
      for (const d of desks) {
        if (d.id !== 'active_selection') {
          deskMap[d.id] = d;
        }
      }
      state.desks = deskMap;
      emit('desks');
    });

    // B. Captures Collection
    onCollection('captures', (captures) => {
      state.captures = captures;
      emit('captures');
    });

    // C. Daily 3 Anchors (Today's date)
    const today = new Date().toISOString().split('T')[0];
    onDoc('anchors', today, (anchorData) => {
      if (anchorData) {
        state.anchors = anchorData;
      } else {
        state.anchors = {
          date: today,
          home: false,
          body: false,
          spark: false
        };
      }
      emit('anchors');
    });

  } catch (err) {
    console.error('Failed to connect to Firestore:', err);
    if (syncDot) syncDot.style.background = '#f87171';
    if (syncText) syncText.textContent = 'Offline';
  }

  // 5. Register PWA Service Worker
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    try {
      await navigator.serviceWorker.register('./sw.js');
      console.log('✓ Service Worker active (v3.0.0)');
    } catch (e) {
      console.warn('Service worker registration skipped:', e);
    }
  }
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootApp);
} else {
  bootApp();
}
