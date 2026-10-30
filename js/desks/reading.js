/**
 * @file reading.js
 * @description Reading Workbench card renderer for Active Desks v3.0.
 * Tracks book progress, pages read, completion percentage, and StoryGraph link.
 */

import { updateDesk } from '../state.js';

/**
 * Generates the HTML string for the Reading workbench card.
 * 
 * @purpose Renders the current book card with live progress bar and controls.
 * @inputs {object} desk - Desk state record.
 * @outputs {string} HTML string.
 */
export function renderReadingDesk(desk) {
  const current = desk.currentPage || 0;
  const total = desk.totalPages || 1;
  const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));

  return `
    <div class="desk-card" data-desk-id="reading">
      <div class="desk-card-header">
        <span class="desk-domain-tag book">Book</span>
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-cyan);">${pct}% complete</span>
      </div>

      <div>
        <div class="desk-card-title">${desk.title || 'Untitled Book'}</div>
        <div class="desk-card-meta">by ${desk.author || 'Unknown Author'}</div>
        
        <div class="progress-bar-bg" style="margin-top: 10px;">
          <div class="progress-bar-fill" style="width: ${pct}%;"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
          <span>Page ${current} of ${total}</span>
          <span>${total - current > 0 ? `${total - current} pages left` : 'Finished!'}</span>
        </div>
      </div>

      <div class="desk-card-footer">
        <div style="display: flex; gap: 6px;">
          <button type="button" class="desk-action-btn btn-reading-step" data-step="5">+5 pgs</button>
          <button type="button" class="desk-action-btn btn-reading-step" data-step="10">+10</button>
          <button type="button" class="desk-action-btn btn-reading-edit">✏️ Edit</button>
        </div>
        ${desk.storygraphUrl ? `<a href="${desk.storygraphUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">StoryGraph ↗</a>` : ''}
      </div>
    </div>
  `;
}

/**
 * Binds click events for reading desk progress incrementers.
 * 
 * @purpose Handles quick page adds and inline page prompt.
 * @inputs {HTMLElement} root - Desk container.
 * @inputs {object} desk - Reading desk state.
 * @outputs {void}
 */
export function bindReadingEvents(root, desk) {
  root.querySelectorAll('.btn-reading-step').forEach(btn => {
    btn.addEventListener('click', async () => {
      const step = parseInt(btn.getAttribute('data-step') || '5', 10);
      const newPage = Math.min(desk.totalPages || 9999, (desk.currentPage || 0) + step);
      await updateDesk('reading', { currentPage: newPage });
    });
  });

  const editBtn = root.querySelector('.btn-reading-edit');
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      const input = prompt('Enter current page number:', String(desk.currentPage || 0));
      if (input !== null) {
        const parsed = parseInt(input, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          await updateDesk('reading', { currentPage: parsed });
        }
      }
    });
  }
}
