/**
 * @file reading.js
 * @description Reading Nook workbench renderer.
 */

import { state } from '../state.js';

/**
 * Creates the HTML element for the Reading Nook card.
 * 
 * @purpose Generates the DOM representation of the reading desk.
 * @inputs {object} deskData - Reading desk state slice.
 * @outputs {HTMLElement} The constructed <article> card element.
 * @sideEffects Pure DOM creation.
 */
export function createReadingDeskElement(deskData = {}) {
  const card = document.createElement('article');
  card.className = 'desk-card';
  card.id = 'desk-card-reading';
  card.setAttribute('aria-label', 'Reading Nook');

  const total = Math.max(1, deskData.totalPages || 1);
  const current = Math.max(0, Math.min(total, deskData.currentPage || 0));
  const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
  const unitLabel = deskData.unit === 'chapters' ? 'Ch.' : 'Page';

  card.innerHTML = `
    <div class="desk-top">
      <span class="desk-badge reading">📚 Reading Nook</span>
      <button type="button" class="desk-action-btn" data-action="edit-reading">✏️ Update</button>
    </div>

    <div>
      <h2 class="desk-title">${escapeText(deskData.title || 'Untitled Book')}</h2>
      <div class="desk-meta">${deskData.author ? 'by ' + escapeText(deskData.author) : 'Active Read'}</div>
    </div>

    <div class="progress-box">
      <div class="progress-labels">
        <span>Reading Progress</span>
        <span style="font-weight: 700; color: var(--text-primary);">${unitLabel} ${current} of ${total} (${pct}%)</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${pct}%;"></div>
      </div>
    </div>

    <div class="desk-footer">
      <a href="${escapeText(deskData.storygraphUrl || '#')}" target="_blank" rel="noopener noreferrer" class="desk-link">
        <span>The StoryGraph</span> ↗
      </a>
      <span style="color: var(--text-muted); font-size: 0.72rem;">Local DB</span>
    </div>
  `;

  return card;
}

function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
