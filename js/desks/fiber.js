/**
 * @file fiber.js
 * @description Fiber Arts workbench renderer with instant local row steppers.
 */

import { state, updateDesk } from '../state.js';

/**
 * Creates the HTML element for the Fiber Arts workbench card.
 * 
 * @purpose Generates the DOM representation of the fiber arts desk with +/- steppers.
 * @inputs {object} deskData - Fiber desk state slice.
 * @outputs {HTMLElement} The constructed <article> card element.
 * @sideEffects Pure DOM creation.
 */
export function createFiberDeskElement(deskData = {}) {
  const card = document.createElement('article');
  card.className = 'desk-card';
  card.id = 'desk-card-fiber';
  card.setAttribute('aria-label', 'Fiber Arts Workbench');

  const rows = deskData.rows || 0;
  const targetRows = deskData.targetRows ? ` / ${deskData.targetRows}` : '';

  card.innerHTML = `
    <div class="desk-top">
      <span class="desk-badge fiber">🧶 Fiber Arts</span>
      <button type="button" class="desk-action-btn" data-action="edit-fiber">✏️ Update</button>
    </div>

    <div>
      <h2 class="desk-title">${escapeText(deskData.name || 'WIP Project')}</h2>
      <div class="desk-meta">${escapeText(deskData.specs || deskData.type || 'Knitting WIP')}</div>
    </div>

    <div class="counter-box">
      <div>
        <div style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Current Row</div>
        <div class="counter-number">${rows}<span style="font-size: 0.85rem; color: var(--text-muted); font-weight: 500;">${targetRows}</span></div>
      </div>
      <div class="counter-buttons">
        <button type="button" class="btn-counter" data-action="fiber-step-down" title="Decrease row" aria-label="Decrease row">−</button>
        <button type="button" class="btn-counter" data-action="fiber-step-up" title="Increase row" aria-label="Increase row">+</button>
      </div>
    </div>

    <div class="desk-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <a href="${escapeText(deskData.linkUrl || '#')}" target="_blank" rel="noopener noreferrer" class="desk-link" style="color: #38bdf8;">
        <span>${escapeText(deskData.linkText || 'Open Pattern')}</span> ↗
      </a>
      <button type="button" class="desk-action-btn" data-action="view-fiber-details" style="font-size: 0.76rem; padding: 4px 10px;">🔍 Notes & Details</button>
    </div>
  `;

  // Delegate stepper button clicks directly
  const btnDown = card.querySelector('[data-action="fiber-step-down"]');
  const btnUp = card.querySelector('[data-action="fiber-step-up"]');

  if (btnDown) {
    btnDown.addEventListener('click', () => {
      const current = state.desks.fiber?.rows || 0;
      updateDesk('fiber', { rows: Math.max(0, current - 1) });
    });
  }

  if (btnUp) {
    btnUp.addEventListener('click', () => {
      const current = state.desks.fiber?.rows || 0;
      updateDesk('fiber', { rows: current + 1 });
    });
  }

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
