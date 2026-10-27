/**
 * @file desk-manager.js
 * @description The 4-Workbench Concentration Engine, Swapping Controller & Open Registry.
 * Enforces the strict 4-desk display cap while supporting an unlimited registry of dormant desks.
 */

import { state, setActiveDeskIds } from '../state.js';
import { createReadingDeskElement } from './reading.js';
import { createKitchenDeskElement } from './kitchen.js';
import { createGamingDeskElement } from './gaming.js';
import { createFiberDeskElement } from './fiber.js';
import { createTechDeskElement } from './tech.js';

/**
 * Registry of desk factory renderers by domain/id.
 * Open registry: new emergent desks (e.g. 'woodworking') can register dynamic card factories here.
 */
const DESK_FACTORIES = {
  reading: createReadingDeskElement,
  kitchen: createKitchenDeskElement,
  gaming: createGamingDeskElement,
  fiber: createFiberDeskElement,
  tech: createTechDeskElement
};

/**
 * Registers a new dynamic workbench factory into the open registry.
 * 
 * @purpose Allows Rule of 5 and emergent domains to plug new workbenches into the app dynamically.
 * @inputs {string} id - Unique workbench ID.
 * @inputs {Function} factoryFn - Function(deskData) returning an HTMLElement.
 * @outputs {void}
 * @sideEffects Mutates the DESK_FACTORIES registry map.
 */
export function registerDeskFactory(id, factoryFn) {
  DESK_FACTORIES[id] = factoryFn;
}

/**
 * Generic fallback renderer for emergent or dynamic workbenches.
 */
function createGenericDeskElement(deskData = {}) {
  const card = document.createElement('article');
  card.className = 'desk-card';
  card.id = `desk-card-${deskData.id || 'custom'}`;
  card.setAttribute('aria-label', deskData.title || 'Workbench');

  const domain = deskData.domain || 'tech';
  const title = deskData.title || 'Dynamic Workbench';
  const meta = deskData.stack || deskData.meta || 'Active Projects';
  const focus = deskData.focus || 'Active workbench focus item.';

  card.innerHTML = `
    <div class="desk-top">
      <span class="desk-badge ${domain}">🌱 ${escapeText(title)}</span>
      <button type="button" class="desk-action-btn" data-action="edit-${deskData.id}">✏️ Update</button>
    </div>

    <div>
      <h2 class="desk-title">${escapeText(title)}</h2>
      <div class="desk-meta">${escapeText(meta)}</div>
    </div>

    <div style="background: rgba(0,0,0,0.25); border-radius: var(--radius-md); padding: 10px;">
      <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3;">
        ${escapeText(focus)}
      </div>
    </div>

    <div class="desk-footer">
      <span style="color: var(--text-secondary);">Workbench</span>
      <span style="color: var(--text-muted); font-size: 0.72rem;">Local DB</span>
    </div>
  `;

  return card;
}

/**
 * Mounts the 4 active workbenches on the main dashboard grid.
 * 
 * @purpose Renders the 4 active desks according to state.activeDeskIds.
 * @inputs None. Reads state.activeDeskIds and state.desks.
 * @outputs {void}
 * @sideEffects Replaces children of #desks-grid in the DOM.
 */
export function renderActiveDesks() {
  const grid = document.getElementById('desks-grid');
  if (!grid) return;

  grid.innerHTML = '';
  const activeIds = state.activeDeskIds || [];

  activeIds.forEach(id => {
    const data = state.desks[id] || { id };
    const factory = DESK_FACTORIES[id] || createGenericDeskElement;
    const cardEl = factory(data);
    grid.appendChild(cardEl);
  });
}

/**
 * Initializes workbench swapping modal triggers and event listeners.
 * 
 * @purpose Binds the ⚙️ Swap Desks button and close interactions.
 * @inputs None.
 * @outputs {void}
 * @sideEffects Attaches listeners to DOM elements.
 */
export function initDeskManager() {
  const swapBtn = document.getElementById('btn-swap-desks');
  const modal = document.getElementById('swap-desk-modal');

  if (swapBtn && modal) {
    swapBtn.addEventListener('click', () => {
      openSwapModal();
    });
  }

  // Bind close buttons with data-close
  document.querySelectorAll('[data-close="swap-desk-modal"]').forEach(btn => {
    btn.addEventListener('click', () => {
      modal?.classList.remove('active');
    });
  });

  // Render initial active desks
  renderActiveDesks();
}

/**
 * Opens and renders the 4-Workbench Swapping Modal.
 * 
 * @purpose Displays active vs dormant workbenches and attaches 1-tap swap handlers.
 * @inputs None.
 * @outputs {void}
 * @sideEffects Mutates the DOM inside #swap-desk-modal and sets the 'active' class.
 */
export function openSwapModal() {
  const modal = document.getElementById('swap-desk-modal');
  const activeList = document.getElementById('swap-active-list');
  const dormantList = document.getElementById('swap-dormant-list');
  if (!modal || !activeList || !dormantList) return;

  activeList.innerHTML = '';
  dormantList.innerHTML = '';

  const activeIds = new Set(state.activeDeskIds || []);
  const allDeskIds = Object.keys(state.desks || {});

  // 1. Render Active Desks (with domain badge and title)
  activeIds.forEach(id => {
    const d = state.desks[id] || { id };
    const row = document.createElement('div');
    row.className = 'swap-item-row';
    row.innerHTML = `
      <div class="swap-item-left">
        <span class="desk-badge ${d.domain || id}">${getDeskEmoji(id)} ${escapeText(d.title || d.name || id)}</span>
      </div>
      <span style="font-size: 0.72rem; color: #34d399; font-weight: 700;">ACTIVE</span>
    `;
    activeList.appendChild(row);
  });

  // 2. Render Dormant Desks (with 1-tap Swap-In buttons)
  const dormantIds = allDeskIds.filter(id => !activeIds.has(id));

  if (dormantIds.length === 0) {
    dormantList.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-muted); padding: 8px;">
        All registered workbenches are currently active.
      </div>
    `;
  } else {
    dormantIds.forEach(dormantId => {
      const d = state.desks[dormantId] || { id: dormantId };
      const row = document.createElement('div');
      row.className = 'swap-item-row';

      const selectOptions = Array.from(activeIds).map(actId => {
        const actDesk = state.desks[actId] || { id: actId };
        return `<option value="${actId}">Replace ${escapeText(actDesk.title || actDesk.name || actId)}</option>`;
      }).join('');

      row.innerHTML = `
        <div class="swap-item-left">
          <span class="desk-badge ${d.domain || dormantId}">${getDeskEmoji(dormantId)} ${escapeText(d.title || d.name || dormantId)}</span>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <select class="swap-replace-select" data-dormant="${dormantId}" style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); color: var(--text-primary); border-radius: var(--radius-sm); font-size: 0.72rem; padding: 3px 6px;">
            ${selectOptions}
          </select>
          <button type="button" class="desk-action-btn" data-swap-in="${dormantId}" style="color: #38bdf8;">Swap In ➔</button>
        </div>
      `;

      const swapBtn = row.querySelector(`[data-swap-in="${dormantId}"]`);
      const selectEl = row.querySelector(`[data-dormant="${dormantId}"]`);

      if (swapBtn && selectEl) {
        swapBtn.addEventListener('click', () => {
          const replaceTargetId = selectEl.value;
          swapWorkbenches(dormantId, replaceTargetId);
          modal.classList.remove('active');
        });
      }

      dormantList.appendChild(row);
    });
  }

  modal.classList.add('active');
}

/**
 * Swaps a dormant workbench into an active slot, enforcing the 4-desk cap.
 * 
 * @purpose Rotates workbench visibility with zero data loss.
 * @inputs {string} newActiveId - The dormant workbench to activate.
 * @inputs {string} oldActiveId - The active workbench to put into dormancy.
 * @outputs {void}
 * @sideEffects Mutates activeDeskIds, re-renders the dashboard grid, and persists to IndexedDB.
 */
export function swapWorkbenches(newActiveId, oldActiveId) {
  const current = [...(state.activeDeskIds || [])];
  const idx = current.indexOf(oldActiveId);

  if (idx !== -1) {
    current[idx] = newActiveId;
  } else {
    current[0] = newActiveId;
  }

  setActiveDeskIds(current);
}

function getDeskEmoji(id) {
  const map = {
    reading: '📚',
    kitchen: '🍳',
    gaming: '🎮',
    fiber: '🧶',
    tech: '💻'
  };
  return map[id] || '🌱';
}

function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
