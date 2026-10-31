/**
 * @file gaming.js
 * @description Gaming Workbench card renderer for Active Desks v3.0.
 * Tracks active video game, platform, and quest focus.
 */

import { state, updateDesk } from '../state.js';
import { renderDeskSwitcherHtml } from './desk-manager.js';
import { openCaptureDetailModal } from '../captures/drawer.js';

export function renderGamingDesk(desk) {
  const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId));
  const blogUrl = activeCap?.blogUrl;
  const sourceUrl = activeCap?.sourceUrl || desk.linkUrl;

  return `
    <div class="desk-card" data-desk-id="gaming">
      <div class="desk-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="desk-domain-tag game">Gaming</span>
          ${renderDeskSwitcherHtml('gaming', 'game', desk.activeCaptureId, state.captures, desk.title || 'Baldurs Gate 3')}
        </div>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${desk.platform || 'PC'}</span>
      </div>

      <div>
        <div class="desk-card-title">${desk.title || 'No Active Game'}</div>
        <div class="desk-card-meta" style="margin-top: 6px;">
          <strong style="color: var(--accent-purple);">Current Quest:</strong> ${desk.quest || 'None set'}
        </div>
      </div>

      <div class="desk-card-footer">
        <div style="display: flex; gap: 6px; align-items: center;">
          <button type="button" class="desk-action-btn btn-desk-open-card" data-desk="gaming">✏️ Details</button>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${blogUrl && blogUrl !== sourceUrl ? `<a href="${blogUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn" style="color: var(--accent-cyan); font-weight: 600;">Blog ↗</a>` : ''}
          ${sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">Source ↗</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function bindGamingEvents(root, desk) {
  const select = root.querySelector('.desk-item-select[data-desk="gaming"]');
  if (select) {
    select.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val === 'default') {
        await updateDesk('gaming', { activeCaptureId: 'default' });
        return;
      }
      const cap = (state.captures || []).find(c => String(c.id) === String(val));
      if (cap) {
        await updateDesk('gaming', {
          activeCaptureId: cap.id,
          title: cap.title || 'Untitled Game',
          quest: cap.summary || cap.topic || 'Active quest',
          platform: cap.platform || desk.platform || 'PC',
          linkUrl: cap.sourceUrl || desk.linkUrl || ''
        });
      }
    });
  }

  const detailsBtn = root.querySelector('.btn-desk-open-card[data-desk="gaming"]');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => {
      const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId));
      if (activeCap) {
        openCaptureDetailModal(activeCap);
      } else {
        openCaptureDetailModal({
          id: desk.activeCaptureId || 'gaming-active',
          title: desk.title || 'Baldurs Gate 3',
          domain: 'game',
          topic: 'Gaming',
          summary: desk.quest || '',
          sourceUrl: desk.linkUrl || '',
          platform: desk.platform || 'PC',
          quest: desk.quest || ''
        });
      }
    });
  }
}
