/**
 * @file anchors.js
 * @description Daily 3 Rhythm Anchors UI controller for Active Desks v3.0.
 * Tracks completion of Home, Body, and Spark with midnight-reset awareness.
 */

import { state, subscribe, toggleAnchor } from './state.js';

/**
 * Initializes the Daily 3 Anchors click listeners and reactive subscription.
 * 
 * @purpose Mounts the anchor interaction handlers and synchronizes UI state.
 * @inputs None.
 * @outputs {void}
 */
export function initAnchors() {
  const chips = document.querySelectorAll('.anchor-chip');
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const key = chip.getAttribute('data-anchor');
      if (key) toggleAnchor(key);
    });
  });

  // Re-render UI whenever state.anchors changes
  subscribe('anchors', renderAnchors);
  renderAnchors(state.anchors);
}

/**
 * Renders the active/inactive visual state for the 3 anchor chips.
 * 
 * @purpose Updates CSS classes on DOM chips.
 * @inputs {object} [anchors=state.anchors] - Current anchor completion map.
 * @outputs {void}
 */
export function renderAnchors(anchors = state.anchors) {
  if (!anchors) return;

  const homeChip = document.getElementById('anchor-home');
  const bodyChip = document.getElementById('anchor-body');
  const sparkChip = document.getElementById('anchor-spark');

  if (homeChip) homeChip.classList.toggle('active', !!anchors.home);
  if (bodyChip) bodyChip.classList.toggle('active', !!anchors.body);
  if (sparkChip) sparkChip.classList.toggle('active', !!anchors.spark);
}
