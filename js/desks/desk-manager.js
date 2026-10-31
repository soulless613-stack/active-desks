/**
 * @file desk-manager.js
 * @description Dynamic workbench coordinator and desk swapper for Active Desks v3.0.
 * Orchestrates the active 4-desk display cap, renders domain cards, and manages desk selection.
 */

import { state, subscribe, setActiveDeskIds } from '../state.js';
import { renderReadingDesk, bindReadingEvents } from './reading.js';
import { renderKitchenDesk, bindKitchenEvents } from './kitchen.js';
import { renderGamingDesk, bindGamingEvents } from './gaming.js';
import { renderFiberDesk, bindFiberEvents } from './fiber.js';
import { renderTechDesk, bindTechEvents } from './tech.js';

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
    swapBtn.addEventListener('click', openSwapModal);
  }

  // Subscribe to changes in active selection or desks
  subscribe('activeDeskIds', renderWorkbenchGrid);
  subscribe('desks', renderWorkbenchGrid);
  subscribe('captures', renderWorkbenchGrid); // Kitchen desk reacts to captures

  renderWorkbenchGrid();
}

/**
 * Renders the active 4 workbench cards into the grid.
 * 
 * @purpose Synchronously updates DOM grid from in-memory state.
 * @inputs None.
 * @outputs {void}
 */
export function renderWorkbenchGrid() {
  const gridEl = document.getElementById('workbench-grid');
  if (!gridEl) return;

  const activeIds = state.activeDeskIds || ['reading', 'kitchen', 'gaming', 'fiber'];
  const deskMap = state.desks || {};

  let html = '';
  for (const id of activeIds) {
    const desk = deskMap[id] || { id, title: `Desk ${id}` };
    const renderer = DESK_RENDERERS[id];
    if (renderer) {
      html += renderer.render(desk);
    }
  }

  gridEl.innerHTML = html;

  // Bind interactive events for each card
  for (const id of activeIds) {
    const cardEl = gridEl.querySelector(`[data-desk-id="${id}"]`);
    const renderer = DESK_RENDERERS[id];
    if (cardEl && renderer?.bind) {
      renderer.bind(cardEl, deskMap[id] || { id });
    }
  }
}

/**
 * Opens the Workbench Swap Modal allowing the user to select which 4 desks are active.
 * 
 * @purpose Renders the available workbenches with checkboxes.
 * @inputs None.
 * @outputs {void}
 */
function openSwapModal() {
  const modal = document.getElementById('workbench-swap-modal');
  const listEl = document.getElementById('swap-modal-list');
  if (!modal || !listEl) return;

  const allDeskKeys = Object.keys(state.desks || DESK_RENDERERS);
  const activeSet = new Set(state.activeDeskIds || []);

  listEl.innerHTML = allDeskKeys.map(key => {
    const desk = state.desks[key] || { id: key, title: key };
    const isChecked = activeSet.has(key);
    return `
      <label style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: rgba(255,255,255,0.02); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); cursor: pointer;">
        <div>
          <div style="font-weight: 700; font-size: 0.95rem;">${desk.title || desk.name || key}</div>
          <div style="font-size: 0.78rem; color: var(--text-muted); text-transform: capitalize;">${desk.domain || key} Workbench</div>
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
        alert('You can select a maximum of 4 active workbenches.');
        return;
      }
      await setActiveDeskIds(selected);
    });
  });

  modal.classList.add('active');
}

/**
 * Escapes special HTML characters for injection into templates.
 * 
 * @param {string} str - Raw text.
 * @returns {string} Sanitized string.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders a standardized <select class="desk-item-select"> populated with all captures matching the desk's domain.
 * 
 * @param {string} deskId - Target workbench identifier ('reading', 'kitchen', 'gaming', 'fiber', 'tech').
 * @param {string} domain - Domain filter ('book', 'recipe', 'game', 'fiber', 'tech').
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
