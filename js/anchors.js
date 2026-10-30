/**
 * @file anchors.js
 * @description Daily 3 Rhythm Anchors UI controller for Active Desks v3.0.
 * Tracks completion of Home, Body, and Spark with tactile 3-card grid from v1.
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
  const cards = document.querySelectorAll('.bucket-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const key = card.getAttribute('data-anchor');
      if (key) toggleAnchor(key);
    });
  });

  // Re-render UI whenever state.anchors changes
  subscribe('anchors', renderAnchors);
  renderAnchors(state.anchors);
}

/**
 * Renders the checked state and counter for Today's 3 Anchors.
 * 
 * @purpose Updates CSS classes and counter tag on DOM cards.
 * @inputs {object} [anchors=state.anchors] - Current anchor completion map.
 * @outputs {void}
 */
export function renderAnchors(anchors = state.anchors) {
  if (!anchors) return;

  const homeCard = document.getElementById('bucket-home');
  const bodyCard = document.getElementById('bucket-body');
  const sparkCard = document.getElementById('bucket-spark');
  const statusTag = document.getElementById('bucket-status-tag');

  if (homeCard) homeCard.classList.toggle('checked', !!anchors.home);
  if (bodyCard) bodyCard.classList.toggle('checked', !!anchors.body);
  if (sparkCard) sparkCard.classList.toggle('checked', !!anchors.spark);

  const doneCount = [anchors.home, anchors.body, anchors.spark].filter(Boolean).length;
  if (statusTag) {
    statusTag.textContent = `${doneCount}/3 Anchors Done`;
    statusTag.style.color = doneCount === 3 ? 'var(--accent-emerald)' : 'var(--accent-cyan)';
  }
}
