/**
 * @file fiber.js
 * @description Fiber & Knitting Workbench card renderer for Active Desks v3.0.
 * Tracks knitting/crochet WIP rows, target rows, specs, and Ravelry pattern links.
 */

import { state, updateDesk } from '../state.js';
import { renderDeskSwitcherHtml } from './desk-manager.js';
import { openCaptureDetailModal } from '../captures/drawer.js';

export function renderFiberDesk(desk) {
  const current = desk.rows || 0;
  const target = desk.targetRows || 1;
  const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
  const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId));
  const blogUrl = activeCap?.blogUrl;
  const sourceUrl = activeCap?.sourceUrl || desk.linkUrl;

  return `
    <div class="desk-card" data-desk-id="fiber">
      <div class="desk-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="desk-domain-tag fiber">Fiber</span>
          ${renderDeskSwitcherHtml('fiber', 'fiber', desk.activeCaptureId, state.captures, desk.name || 'Autumn Cardigan')}
        </div>
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-rose);">${pct}% (${current}/${target})</span>
      </div>

      <div>
        <div class="desk-card-title">${desk.name || 'Knitting Project'}</div>
        <div class="desk-card-meta">${desk.type || 'WIP'} · ${desk.specs || 'Standard Weight'}</div>
        
        <div class="progress-bar-bg" style="margin-top: 10px;">
          <div class="progress-bar-fill" style="width: ${pct}%; background: linear-gradient(90deg, var(--accent-rose), var(--accent-purple));"></div>
        </div>
      </div>

      <div class="desk-card-footer">
        <div style="display: flex; gap: 5px; align-items: center;">
          <button type="button" class="desk-action-btn btn-fiber-step" data-step="-1">-1 Row</button>
          <button type="button" class="desk-action-btn btn-fiber-step" data-step="1">+1 Row</button>
          <button type="button" class="desk-action-btn btn-desk-open-card" data-desk="fiber">✏️ Details</button>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${blogUrl && blogUrl !== sourceUrl ? `<a href="${blogUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn" style="color: var(--accent-cyan); font-weight: 600;">Blog ↗</a>` : ''}
          ${sourceUrl ? `<a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">Source ↗</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

export function bindFiberEvents(root, desk) {
  root.querySelectorAll('.btn-fiber-step').forEach(btn => {
    btn.addEventListener('click', async () => {
      const step = parseInt(btn.getAttribute('data-step') || '1', 10);
      const newRows = Math.max(0, (desk.rows || 0) + step);
      await updateDesk('fiber', { rows: newRows });
    });
  });

  const select = root.querySelector('.desk-item-select[data-desk="fiber"]');
  if (select) {
    select.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val === 'default') {
        await updateDesk('fiber', { activeCaptureId: 'default' });
        return;
      }
      const cap = (state.captures || []).find(c => String(c.id) === String(val));
      if (cap) {
        await updateDesk('fiber', {
          activeCaptureId: cap.id,
          name: cap.title || 'Fiber Project',
          type: cap.topic || 'Knitting / Crochet',
          specs: cap.summary || 'Standard Pattern',
          linkUrl: cap.sourceUrl || ''
        });
      }
    });
  }

  const detailsBtn = root.querySelector('.btn-desk-open-card[data-desk="fiber"]');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => {
      const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId));
      if (activeCap) {
        openCaptureDetailModal(activeCap);
      } else {
        openCaptureDetailModal({
          id: desk.activeCaptureId || 'fiber-active',
          title: desk.name || 'Autumn Cardigan',
          domain: 'fiber',
          topic: desk.type || 'Knitting / Crochet',
          summary: desk.specs || 'Standard Pattern',
          sourceUrl: desk.linkUrl || '',
          rows: desk.rows || 0,
          targetRows: desk.targetRows || 100
        });
      }
    });
  }
}
