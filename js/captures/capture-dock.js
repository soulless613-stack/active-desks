/**
 * @file capture-dock.js
 * @description Quick-capture bottom dock controller.
 */

import { processCaptureIntake, processStage3Offline, extractUrl } from './intake.js';
import { openCapturesDrawer, renderCapturesDrawer } from './drawer.js';
import { state } from '../state.js';
import * as db from '../db.js';

/**
 * Initializes the bottom quick-capture dock listeners.
 * 
 * @purpose Binds form submission and drawer trigger buttons.
 * @inputs None.
 * @outputs {void}
 * @sideEffects Attaches submit and click handlers to DOM elements.
 */
export function initCaptureDock() {
  const form = document.getElementById('quick-capture-form');
  const input = document.getElementById('quick-capture-input');
  const streamBtn = document.getElementById('dock-stream-btn');
  const headerDrawerBtn = document.getElementById('btn-open-drawer');

  if (form && input) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;

      input.value = '';
      input.blur();

      const foundUrl = extractUrl(val);
      const hasApiKey = !!state.settings?.gemini_api_key?.trim();

      // If plain text note or no API key, process immediately
      if (!foundUrl || !hasApiKey) {
        try {
          await processCaptureIntake(val);
          await openCapturesDrawer();
        } catch (err) {
          console.error('Capture intake failed:', err);
        }
        return;
      }

      // Optimistic Intake for Web Links:
      // Persist immediate placeholder into IndexedDB and pop open drawer (<100ms)
      const placeholder = processStage3Offline(val, foundUrl);
      placeholder.status = 'processing';
      placeholder.summary = '⏳ Extracting details, creator, and takeaways via Gemini...';

      try {
        await db.put('captures', placeholder);
        await openCapturesDrawer();
      } catch (dbErr) {
        console.error('Failed to write optimistic placeholder:', dbErr);
      }

      // Execute deep background extraction asynchronously
      processCaptureIntake(val, placeholder.id, placeholder)
        .catch(err => {
          console.warn('Background capture extraction failed:', err);
        })
        .finally(() => {
          renderCapturesDrawer();
        });
    });
  }

  if (streamBtn) {
    streamBtn.addEventListener('click', () => {
      openCapturesDrawer();
    });
  }

  if (headerDrawerBtn) {
    headerDrawerBtn.addEventListener('click', () => {
      openCapturesDrawer();
    });
  }
}
