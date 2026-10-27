/**
 * @file anchors.js
 * @description Daily 3 Anchors rhythm renderer and event controller (Home, Body, Spark).
 */

import { state, toggleAnchor } from '../state.js';

/**
 * Initializes and binds click handlers for the Daily 3 Anchors banner.
 * 
 * @purpose Mounts the anchor banner interactions and renders the initial checked states.
 * @inputs None.
 * @outputs {void}
 * @sideEffects Attaches click and keydown listeners to DOM cards.
 */
export function initAnchors() {
  const buckets = ['home', 'body', 'spark'];

  buckets.forEach(key => {
    const el = document.getElementById(`bucket-${key}`);
    if (el) {
      el.addEventListener('click', () => toggleAnchor(key));
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleAnchor(key);
        }
      });
    }
  });

  renderAnchors();
}

/**
 * Renders the checked state and completion summary tag.
 * 
 * @purpose Updates anchor UI elements based on state.anchors.
 * @inputs None. Reads directly from in-memory state.anchors.
 * @outputs {void}
 * @sideEffects Mutates DOM element classes and textContent.
 */
export function renderAnchors() {
  const a = state.anchors;
  const count = [a.home, a.body, a.spark].filter(Boolean).length;

  const statusTag = document.getElementById('bucket-status-tag');
  if (statusTag) {
    statusTag.textContent = count === 3 ? '🎉 3/3 Perfect Day!' : `${count}/3 Done`;
    statusTag.classList.toggle('complete', count === 3);
  }

  const updateCard = (key) => {
    const card = document.getElementById(`bucket-${key}`);
    const check = document.getElementById(`check-${key}`);
    if (card && check) {
      card.classList.toggle('checked', !!a[key]);
      check.textContent = a[key] ? '✓' : '';
    }
  };

  updateCard('home');
  updateCard('body');
  updateCard('spark');
}
