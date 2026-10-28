/**
 * @file capture-dock.js
 * @description Quick-capture bottom dock controller.
 */

import { processCaptureIntake } from './intake.js';
import { openCapturesDrawer, renderCapturesDrawer } from './drawer.js';

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

      try {
        await processCaptureIntake(val);
        openCapturesDrawer();
        renderCapturesDrawer();
      } catch (err) {
        console.error('Capture intake failed:', err);
      }
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
