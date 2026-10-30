/**
 * @file tech.js
 * @description Tech & 3D Printing Workbench card renderer for Active Desks v3.0.
 * Tracks CAD/software project focus, stack, and repository link.
 */

import { updateDesk } from '../state.js';

export function renderTechDesk(desk) {
  return `
    <div class="desk-card" data-desk-id="tech">
      <div class="desk-card-header">
        <span class="desk-domain-tag tech">Tech &amp; 3D Print</span>
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
