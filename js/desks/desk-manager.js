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
