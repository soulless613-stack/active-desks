/**
 * @file fiber.js
 * @description Fiber & Knitting Workbench card renderer for Active Desks v3.0.
 * Tracks knitting/crochet WIP rows, target rows, specs, and Ravelry pattern links.
 */

import { updateDesk } from '../state.js';

export function renderFiberDesk(desk) {
  const current = desk.rows || 0;
  const target = desk.targetRows || 1;
  const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));

  return `
    <div class="desk-card" data-desk-id="fiber">
      <div class="desk-card-header">
        <span class="desk-domain-tag fiber">Fiber Arts</span>
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-rose);">${pct}% (${current}/${target} rows)</span>
      </div>

      <div>
        <div class="desk-card-title">${desk.name || 'Knitting Project'}</div>
        <div class="desk-card-meta">${desk.type || 'WIP'} · ${desk.specs || 'Standard Weight'}</div>
        
        <div class="progress-bar-bg" style="margin-top: 10px;">
          <div class="progress-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, var(--accent-rose), var(--accent-purple));"></div>
        </div>
      </div>

      <div class="desk-card-footer">
        <div style="display: flex; gap: 6px;">
          <button type="button" class="desk-action-btn btn-fiber-add-row">+1 Row</button>
          <button type="button" class="desk-action-btn btn-fiber-edit">✏️ Edit</button>
        </div>
        ${desk.linkUrl ? `<a href="${desk.linkUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">Ravelry ↗</a>` : ''}
      </div>
    </div>
  `;
}

export function bindFiberEvents(root, desk) {
  const addBtn = root.querySelector('.btn-fiber-add-row');
  if (addBtn) {
    addBtn.addEventListener('click', async () => {
      await updateDesk('fiber', { rows: (desk.rows || 0) + 1 });
    });
  }

  const editBtn = root.querySelector('.btn-fiber-edit');
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      const input = prompt('Enter current row number:', String(desk.rows || 0));
      if (input !== null) {
        const parsed = parseInt(input, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          await updateDesk('fiber', { rows: parsed });
        }
      }
    });
  }
}
