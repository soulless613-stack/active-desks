/**
 * @file gaming.js
 * @description Gaming Workbench card renderer for Active Desks v3.0.
 * Tracks active video game, platform, and quest focus.
 */

import { updateDesk } from '../state.js';

export function renderGamingDesk(desk) {
  return `
    <div class="desk-card" data-desk-id="gaming">
      <div class="desk-card-header">
        <span class="desk-domain-tag game">Gaming</span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${desk.platform || 'PC'}</span>
      </div>

      <div>
        <div class="desk-card-title">${desk.title || 'No Active Game'}</div>
        <div class="desk-card-meta" style="margin-top: 6px;">
          <strong style="color: var(--accent-purple);">Current Quest:</strong> ${desk.quest || 'None set'}
        </div>
      </div>

      <div class="desk-card-footer">
        <button type="button" class="desk-action-btn btn-gaming-edit">✏️ Update Quest</button>
        ${desk.linkUrl ? `<a href="${desk.linkUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">Wiki ↗</a>` : ''}
      </div>
    </div>
  `;
}

export function bindGamingEvents(root, desk) {
  const editBtn = root.querySelector('.btn-gaming-edit');
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      const newQuest = prompt('Update current game quest objective:', desk.quest || '');
      if (newQuest !== null) {
        await updateDesk('gaming', { quest: newQuest.trim() });
      }
    });
  }
}
