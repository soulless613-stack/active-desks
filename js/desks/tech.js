/**
 * @file tech.js
 * @description Tech & 3D Printing Workbench card renderer for Active Desks v3.0.
 * Tracks CAD/software project focus, stack, and repository link.
 */

import { state, updateDesk } from '../state.js';
import { renderDeskSwitcherHtml } from './desk-manager.js';
import { openCaptureDetailModal } from '../captures/drawer.js';

export function renderTechDesk(desk) {
  const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId));
  const blogUrl = activeCap?.blogUrl;
  const sourceUrl = activeCap?.sourceUrl || desk.linkUrl;

  return `
    <div class="desk-card" data-desk-id="tech">
      <div class="desk-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="desk-domain-tag tech">Tech</span>
          ${renderDeskSwitcherHtml('tech', 'tech', desk.activeCaptureId, state.captures, desk.title || 'PressPrint Lab Parametric Boxes')}
        </div>
        <span style="font-size: 0.75rem; color: var(--text-muted);">${desk.stack || 'Development'}</span>
      </div>

      <div>
        <div class="desk-card-title">${desk.title || 'Untitled Project'}</div>
        <div class="desk-card-meta" style="margin-top: 6px;">
          <strong style="color: var(--domain-tech);">Current Focus:</strong> ${desk.focus || 'Active sprint'}
        </div>
      </div>

      <div class="desk-card-footer">
        <div style="display: flex; gap: 6px; align-items: center;">
          <button type="button" class="desk-action-btn btn-desk-open-card" data-desk="tech">✏️ Details</button>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${blogUrl && blogUrl !== sourceUrl ? `<a href="${blogUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn" style="color: var(--accent-cyan); font-weight: 600;">Blog ↗</a>` : ''}
          ${sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">Source ↗</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function bindTechEvents(root, desk) {
  const select = root.querySelector('.desk-item-select[data-desk="tech"]');
  if (select) {
    select.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val === 'default') {
        await updateDesk('tech', { activeCaptureId: 'default' });
        return;
      }
      const cap = (state.captures || []).find(c => String(c.id) === String(val));
      if (cap) {
        await updateDesk('tech', {
          activeCaptureId: cap.id,
          title: cap.title || 'Untitled Project',
          focus: cap.summary || cap.topic || 'Active sprint',
          stack: cap.topic || desk.stack || 'Development',
          linkUrl: cap.sourceUrl || desk.linkUrl || ''
        });
      }
    });
  }

  const detailsBtn = root.querySelector('.btn-desk-open-card[data-desk="tech"]');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => {
      const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId));
      if (activeCap) {
        openCaptureDetailModal(activeCap);
      } else {
        openCaptureDetailModal({
          id: desk.activeCaptureId || 'tech-active',
          title: desk.title || 'PressPrint Lab Parametric Boxes',
          domain: 'tech',
          topic: desk.stack || 'Development',
          summary: desk.focus || '',
          sourceUrl: desk.linkUrl || '',
          stack: desk.stack || 'Development',
          focus: desk.focus || ''
        });
      }
    });
  }
}
