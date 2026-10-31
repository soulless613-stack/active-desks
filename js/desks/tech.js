/**
 * @file tech.js
 * @description Tech & 3D Printing Workbench card renderer for Active Desks v3.0.
 * Tracks CAD/software project focus, stack, and repository link.
 */

import { state, updateDesk } from '../state.js';
import { renderDeskSwitcherHtml } from './desk-manager.js';

export function renderTechDesk(desk) {
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
        <button type="button" class="desk-action-btn btn-tech-edit">✏️ Update Focus</button>
        ${desk.linkUrl ? `<a href="${desk.linkUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">GitHub ↗</a>` : ''}
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

  const editBtn = root.querySelector('.btn-tech-edit');
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      const newFocus = prompt('Update current project focus:', desk.focus || '');
      if (newFocus !== null) {
        await updateDesk('tech', { focus: newFocus.trim() });
      }
    });
  }
}
