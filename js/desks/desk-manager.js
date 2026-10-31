/**
 * @file desk-manager.js
 * @description Dynamic workbench coordinator and desk swapper for Active Desks v3.0.
 * Orchestrates the active 4-desk display cap, renders domain cards, provisions generic emergent
 * workbenches, and manages real-time desk selection.
 */

import { state, subscribe, setActiveDeskIds, updateDesk } from '../state.js';
import { openCaptureDetailModal } from '../captures/drawer.js';
import { renderReadingDesk, bindReadingEvents } from './reading.js';
import { renderKitchenDesk, bindKitchenEvents } from './kitchen.js';
import { renderGamingDesk, bindGamingEvents } from './gaming.js';
import { renderFiberDesk, bindFiberEvents } from './fiber.js';
import { renderTechDesk, bindTechEvents } from './tech.js';

export const CANONICAL_DESK_MAP = {
  book: 'reading',
  recipe: 'kitchen',
  game: 'gaming',
  fiber: 'fiber',
  tech: 'tech'
};

const DESK_RENDERERS = {
  reading: { render: renderReadingDesk, bind: bindReadingEvents },
  kitchen: { render: renderKitchenDesk, bind: bindKitchenEvents },
  gaming: { render: renderGamingDesk, bind: bindGamingEvents },
  fiber: { render: renderFiberDesk, bind: bindFiberEvents },
  tech: { render: renderTechDesk, bind: bindTechEvents }
};

/**
 * Initializes the workbench manager, mounts the 4-desk grid, and wires swap modal.
 * 
 * @purpose Bootstraps the workbench grid and listens to reactive state.
 * @inputs None.
 * @outputs {void}
 */
export function initDeskManager() {
  const swapBtn = document.getElementById('btn-open-swap-modal');
  if (swapBtn) {
    swapBtn.addEventListener('click', () => openSwapModal());
  }

  // Close buttons for swap modal
  document.querySelectorAll('[data-close-modal="workbench-swap-modal"]').forEach(btn => {
    btn.addEventListener('click', closeSwapModal);
  });

  const modal = document.getElementById('workbench-swap-modal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeSwapModal();
    });
  }

  // Sanitize activeDeskIds on startup: deduplicate and map legacy capture domains (e.g. 'book')
  // to canonical specialized desks (e.g. 'reading'), strictly preserving the desk with the progress bar.
  if (Array.isArray(state.activeDeskIds)) {
    const sanitized = [];
    for (const rawId of state.activeDeskIds) {
      const canonicalId = CANONICAL_DESK_MAP[rawId] || rawId;
      if (!sanitized.includes(canonicalId)) {
        sanitized.push(canonicalId);
      }
    }
    if (sanitized.length > 0 && JSON.stringify(sanitized) !== JSON.stringify(state.activeDeskIds)) {
      setActiveDeskIds(sanitized);
    }
  }

  // Subscribe to changes in active selection or desks
  subscribe('activeDeskIds', renderWorkbenchGrid);
  subscribe('desks', renderWorkbenchGrid);
  subscribe('captures', renderWorkbenchGrid);

  renderWorkbenchGrid();
}

/**
 * Renders the active 4 workbench cards into the grid.
 * Falls back to generic workbench renderer for newly emerged domains.
 * 
 * @purpose Synchronously updates DOM grid from in-memory state.
 * @inputs None.
 * @outputs {void}
 */
export function renderWorkbenchGrid() {
  const gridEl = document.getElementById('workbench-grid');
  if (!gridEl) return;

  const rawActiveIds = state.activeDeskIds || ['reading', 'kitchen', 'gaming', 'fiber'];
  const activeIds = [];
  for (const rawId of rawActiveIds) {
    const canonicalId = CANONICAL_DESK_MAP[rawId] || rawId;
    if (!activeIds.includes(canonicalId)) {
      activeIds.push(canonicalId);
    }
  }
  const deskMap = state.desks || {};

  let html = '';
  for (const id of activeIds) {
    const desk = deskMap[id] || { id, title: `${capitalize(id)} Desk`, domain: id };
    const renderer = DESK_RENDERERS[id];
    if (renderer) {
      html += renderer.render(desk);
    } else {
      html += renderGenericDesk(id, desk);
    }
  }

  gridEl.innerHTML = html;

  // Bind interactive events for each card
  for (const id of activeIds) {
    const cardEl = gridEl.querySelector(`[data-desk-id="${id}"]`);
    const renderer = DESK_RENDERERS[id];
    if (cardEl) {
      if (renderer?.bind) {
        renderer.bind(cardEl, deskMap[id] || { id });
      } else {
        bindGenericDeskEvents(cardEl, id, deskMap[id] || { id });
      }
    }
  }
}

/**
 * Generic workbench renderer for any emergent or custom domain.
 * 
 * @param {string} id - Desk identifier.
 * @param {object} desk - Desk state.
 * @returns {string} HTML string.
 */
export function renderGenericDesk(id, desk) {
  const domain = (desk.domain || id).toLowerCase();
  const matchingCaptures = (state.captures || []).filter(c => (c.domain || '').toLowerCase() === domain);
  const activeCap = matchingCaptures.find(c => String(c.id) === String(desk.activeCaptureId)) || matchingCaptures[0];
  const title = activeCap?.title || desk.title || `${capitalize(domain)} Workbench`;
  const summary = activeCap?.summary || 'Focus area active. Select a card from the dropdown or open details to inspect.';
  const topic = activeCap?.topic ? `· ${activeCap.topic}` : '';

  return `
    <div class="desk-card" data-desk-id="${id}">
      <div class="desk-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="desk-domain-tag ${domain}">${escapeHtml(domain)}</span>
          ${renderDeskSwitcherHtml(id, domain, desk.activeCaptureId, state.captures, title)}
        </div>
        <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); font-weight: 600;">
          ${matchingCaptures.length} Cards
        </span>
      </div>

      <div class="desk-card-body" style="margin-top: 10px;">
        <div class="desk-card-title">${escapeHtml(title)}</div>
        <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 2px;">
          ${topic ? `<span style="color: var(--accent-cyan); font-weight: 600;">${escapeHtml(topic)}</span>` : ''}
          ${activeCap?.creator ? ` <span>by ${escapeHtml(activeCap.creator)}</span>` : ''}
        </div>
        <div class="desk-card-summary" style="margin-top: 6px; font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4;">
          ${escapeHtml(summary)}
        </div>
      </div>

      <div class="desk-card-footer" style="margin-top: 12px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; gap: 6px; align-items: center;">
          ${activeCap ? `<button type="button" class="desk-action-btn btn-generic-view-details" data-generic-cap-id="${activeCap.id}">📋 Details</button>` : ''}
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${activeCap?.blogUrl && activeCap.blogUrl !== activeCap.sourceUrl ? `<a href="${activeCap.blogUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn" style="color: var(--accent-cyan); font-weight: 600;">Blog ↗</a>` : ''}
          ${activeCap?.sourceUrl ? `<a href="${activeCap.sourceUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">Source ↗</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Binds interactive events for generic emergent workbenches.
 * 
 * @param {HTMLElement} cardEl - Card container element.
 * @param {string} id - Desk ID.
 * @param {object} desk - Desk state.
 */
export function bindGenericDeskEvents(cardEl, id, desk) {
  const domain = (desk.domain || id).toLowerCase();
  const select = cardEl.querySelector(`.desk-item-select[data-desk="${id}"]`);
  if (select) {
    select.addEventListener('change', async (e) => {
      const val = e.target.value;
      if (val === 'default') {
        await updateDesk(id, { activeCaptureId: 'default' });
      } else {
        const cap = (state.captures || []).find(c => String(c.id) === String(val));
        if (cap) {
          await updateDesk(id, {
            activeCaptureId: cap.id,
            title: cap.title || `${capitalize(domain)} Workbench`
          });
        }
      }
    });
  }

  const viewBtn = cardEl.querySelector('.btn-generic-view-details');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      const capId = viewBtn.getAttribute('data-generic-cap-id');
      const cap = (state.captures || []).find(c => String(c.id) === String(capId));
      if (cap) openCaptureDetailModal(cap);
    });
  }
}

/**
 * Opens the Workbench Swap Modal allowing the user to select which 4 desks are active.
 * Discovers built-in desks and any newly emerged domains.
 * 
 * @param {string} [targetId] - Optional desk ID to highlight or focus.
 * @outputs {void}
 */
export function openSwapModal(targetId = null) {
  const modal = document.getElementById('workbench-swap-modal');
  const listEl = document.getElementById('swap-modal-list');
  if (!modal || !listEl) return;

  const knownKeys = new Set(['reading', 'kitchen', 'gaming', 'fiber', 'tech']);
  Object.keys(state.desks || {}).forEach(k => {
    if (k !== 'active_selection') {
      const canonical = CANONICAL_DESK_MAP[k] || k;
      knownKeys.add(canonical);
    }
  });
  (state.captures || []).forEach(c => {
    const d = (c.domain || 'misc').toLowerCase();
    const canonical = CANONICAL_DESK_MAP[d] || d;
    if (canonical !== 'misc' && canonical !== 'link') {
      knownKeys.add(canonical);
    }
  });

  // Ensure active IDs are sanitized through canonical map
  const activeSet = new Set((state.activeDeskIds || []).map(id => CANONICAL_DESK_MAP[id] || id));

  const sortedKeys = Array.from(knownKeys).sort((a, b) => {
    const aActive = activeSet.has(a) ? 1 : 0;
    const bActive = activeSet.has(b) ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    return a.localeCompare(b);
  });

  listEl.innerHTML = sortedKeys.map(key => {
    const desk = state.desks[key] || { id: key, title: `${capitalize(key)} Desk`, domain: key };
    const isChecked = activeSet.has(key);
    const isTarget = targetId && key === targetId;
    const displayTitle = desk.title || desk.name || `${capitalize(key)} Desk`;
    const subtitle = key === 'reading' ? 'Reading Nook · Page Progress Bar' : `${desk.domain || key} Desk`;

    return `
      <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: ${isTarget ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isTarget ? 'var(--accent-cyan)' : 'var(--border-subtle)'}; border-radius: var(--radius-md); cursor: pointer; transition: all 0.2s;">
        <div>
          <div style="font-weight: 700; font-size: 0.95rem;">${escapeHtml(displayTitle)}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: capitalize;">${escapeHtml(subtitle)}</div>
        </div>
        <input type="checkbox" class="swap-desk-checkbox" data-desk-id="${key}" ${isChecked ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-cyan);">
      </label>
    `;
  }).join('');

  // Wire checkbox change handler with 4-cap enforcement
  listEl.querySelectorAll('.swap-desk-checkbox').forEach(cb => {
    cb.addEventListener('change', async () => {
      const selected = Array.from(listEl.querySelectorAll('.swap-desk-checkbox:checked')).map(el => el.getAttribute('data-desk-id'));
      if (selected.length > 4) {
        cb.checked = false;
        alert('You can select a maximum of 4 active desks.');
        return;
      }
      await setActiveDeskIds(selected);
    });
  });

  modal.classList.add('active');
}

/**
 * Closes the Workbench Swap Modal.
 */
export function closeSwapModal() {
  const modal = document.getElementById('workbench-swap-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Renders a standardized <select class="desk-item-select"> populated with all captures matching the desk's domain.
 * 
 * @param {string} deskId - Target workbench identifier.
 * @param {string} domain - Domain filter.
 * @param {string} activeId - Currently selected captureId or 'default'.
 * @param {Array<object>} captures - Global captures array.
 * @param {string} fallbackTitle - Fallback/seeded card title.
 * @returns {string} HTML string.
 */
export function renderDeskSwitcherHtml(deskId, domain, activeId, captures = [], fallbackTitle = 'Default') {
  const matchingCaptures = (captures || []).filter(c => (c.domain || '').toLowerCase() === domain.toLowerCase());
  
  if (matchingCaptures.length === 0) {
    return `
      <select class="desk-item-select" data-desk="${deskId}" title="Select active card">
        <option value="default" selected>${escapeHtml(fallbackTitle.slice(0, 22))}</option>
      </select>
    `;
  }

  const hasDefault = fallbackTitle && !matchingCaptures.some(c => String(c.id) === String(activeId));
  let optionsHtml = '';
  if (hasDefault) {
    optionsHtml += `<option value="default" ${(!activeId || activeId === 'default') ? 'selected' : ''}>${escapeHtml(fallbackTitle.slice(0, 22))}</option>`;
  }

  optionsHtml += matchingCaptures.map(c => {
    const isSelected = String(c.id) === String(activeId);
    const label = (c.title || c.topic || 'Untitled').slice(0, 22);
    return `<option value="${c.id}" ${isSelected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');

  return `
    <select class="desk-item-select" data-desk="${deskId}" title="Select active card">
      ${optionsHtml}
    </select>
  `;
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
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
