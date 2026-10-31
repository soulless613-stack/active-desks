/**
 * @file reading.js
 * @description Reading Workbench card renderer for Active Desks v3.0.
 * Tracks book progress, pages read, completion percentage, standardized Source/Blog links,
 * and unified 3-Tier Detail Card opening.
 */

import { state, updateDesk } from '../state.js';
import { renderDeskSwitcherHtml } from './desk-manager.js';
import { openCaptureDetailModal } from '../captures/drawer.js';
import { saveDoc } from '../firebase.js';

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
  const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId));

  return `
    <div class="desk-card" data-desk-id="reading">
      <div class="desk-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="desk-domain-tag book">Book</span>
          ${renderDeskSwitcherHtml('reading', 'book', desk.activeCaptureId, state.captures, desk.title || 'Oathbringer')}
        </div>
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-cyan);">${pct}%</span>
      </div>

      <div>
        <div class="desk-card-title">${escapeHtml(desk.title || 'Untitled Book')}</div>
        <div class="desk-card-meta">by ${escapeHtml(desk.author || 'Unknown Author')}</div>
        
        <div class="progress-bar-bg" style="margin-top: 10px;">
          <div class="progress-bar-fill" style="width: ${pct}%;"></div>
        </div>
        
        <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
          <span>Page ${current} of ${total}</span>
          <span>${total - current > 0 ? `${total - current} pages left` : 'Finished!'}</span>
        </div>
      </div>

      <div class="desk-card-footer">
        <div style="display: flex; gap: 6px; align-items: center;">
          <button type="button" class="desk-action-btn btn-reading-step" data-step="5">+5 pgs</button>
          <button type="button" class="desk-action-btn btn-reading-step" data-step="10">+10</button>
          <button type="button" class="desk-action-btn btn-desk-open-card" data-desk="reading">✏️ Details</button>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${activeCap?.blogUrl && activeCap.blogUrl !== activeCap.sourceUrl ? `<a href="${activeCap.blogUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn" style="color: var(--accent-cyan); font-weight: 600;">Blog ↗</a>` : ''}
          ${activeCap?.sourceUrl || desk.storygraphUrl ? `<a href="${activeCap?.sourceUrl || desk.storygraphUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">Source ↗</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Binds click events for reading desk progress incrementers and card detail opener.
 * 
 * @purpose Handles quick page adds and opens the unified 3-tier card detail modal.
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
      if (desk.activeCaptureId && desk.activeCaptureId !== 'default') {
        await saveDoc('captures', desk.activeCaptureId, { currentPage: newPage });
      }
    });
  });

  const select = root.querySelector('.desk-item-select[data-desk="reading"]');
  if (select) {
    select.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val === 'default') {
        await updateDesk('reading', {
          activeCaptureId: 'default'
        });
        return;
      }
      const cap = (state.captures || []).find(c => String(c.id) === String(val));
      if (cap) {
        await updateDesk('reading', {
          activeCaptureId: cap.id,
          title: cap.title || 'Untitled Book',
          author: cap.creator || '',
          currentPage: cap.currentPage || 0,
          totalPages: cap.totalPages || 100,
          storygraphUrl: cap.sourceUrl || ''
        });
      }
    });
  }

  // Open Unified 3-Tier Card View & Editor
  const detailsBtn = root.querySelector('.btn-desk-open-card[data-desk="reading"]');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => {
      const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId)) || {
        id: desk.activeCaptureId || 'default',
        domain: 'book',
        title: desk.title || 'Oathbringer',
        creator: desk.author || '',
        currentPage: desk.currentPage || 0,
        totalPages: desk.totalPages || 100,
        sourceUrl: desk.storygraphUrl || ''
      };
      openCaptureDetailModal(activeCap);
    });
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}
