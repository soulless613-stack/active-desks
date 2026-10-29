/**
 * @file app.js
 * @description Main application entry point for Active Desks v2.0.
 * Orchestrates IndexedDB startup, state initialization, and component mounting.
 */

import { loadInitialState, subscribe, APP_VERSION } from './state.js';
import { initAnchors, renderAnchors } from './desks/anchors.js';
import { initDeskManager, renderActiveDesks } from './desks/desk-manager.js';
import { initCaptureDock } from './captures/capture-dock.js';
import { closeCapturesDrawer } from './captures/drawer.js';
import { initSyncManager } from './sync/sync-manager.js';
import { initSettingsModal } from './settings-modal.js';

/**
 * Boots the application on DOM ready.
 */
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Initialize Date Header
    const dateEl = document.getElementById('current-date');
    if (dateEl) {
      const now = new Date();
      dateEl.textContent = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    }

    // 2. Load IndexedDB State into memory (seeds defaults if first run)
    await loadInitialState();

    // 3. Mount UI Components
    initAnchors();
    initDeskManager();
    initCaptureDock();
    initSyncManager();
    initSettingsModal();

    // 4. Wire Reactive Subscriptions
    subscribe('anchors', () => renderAnchors());
    subscribe('activeDeskIds', () => renderActiveDesks());
    subscribe('desks', () => renderActiveDesks());

    // 5. Global Modal & Drawer Backdrop Dismissal
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
      }
      if (e.target.classList.contains('drawer-overlay')) {
        closeCapturesDrawer();
      }
    });

    // Global Escape Key Dismissal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.active, .drawer-overlay.active').forEach(el => {
          el.classList.remove('active');
        });
      }
    });

    // Close buttons with data-close attribute
    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-close');
        const targetEl = document.getElementById(targetId);
        targetEl?.classList.remove('active');
      });
    });

    // 6. Register Service Worker for Offline PWA Support
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
          console.log('📦 Service Worker registered successfully:', registration.scope);
        })
        .catch((err) => {
          console.warn('⚠️ Service Worker registration failed:', err);
        });
    }

    console.log('✨ Active Desks v2.0 booted cleanly (IndexedDB + Native ES Modules).');

  } catch (err) {
    console.error('Fatal initialization error:', err);
  }
});
