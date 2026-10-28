/**
 * @file desk-manager.js
 * @description The 4-Workbench Concentration Engine, Swapping Controller & Open Registry.
 * Enforces the strict 4-desk display cap while supporting an unlimited registry of dormant desks.
 */

import * as db from '../db.js';
import { state, setActiveDeskIds, updateDesk } from '../state.js';
import { openCaptureDetailModal } from '../captures/drawer.js';
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

let selectedIncomingDormantId = null;

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
 * @purpose Renders the 4 active desks according to state.activeDeskIds and wires edit buttons.
 * @inputs None. Reads state.activeDeskIds and state.desks.
 * @outputs {void}
 * @sideEffects Replaces children of #desks-grid in the DOM and binds edit events.
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

  // Attach edit button click listeners to all rendered cards
  grid.querySelectorAll('[data-action^="edit-"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const deskId = btn.getAttribute('data-action').replace('edit-', '');
      openEditDeskModal(deskId);
    });
  });

  // Attach view notes & details click listeners to workbench cards
  grid.querySelectorAll('[data-action^="view-"][data-action$="-details"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const deskId = btn.getAttribute('data-action').replace('view-', '').replace('-details', '');
      const deskData = state.desks[deskId] || { id: deskId };

      const allCaptures = await db.getAll('captures');
      const targetTitle = (deskData.title || deskData.name || '').toLowerCase();
      const matched = allCaptures.find(c => c.title && c.title.toLowerCase() === targetTitle);

      if (matched) {
        openCaptureDetailModal(matched);
      } else {
        openCaptureDetailModal({
          domain: deskData.domain || deskId,
          topic: deskData.specs || deskData.platform || deskData.stack || deskData.format || 'Workbench',
          title: deskData.title || deskData.name || capitalize(deskId),
          summary: deskData.quest || deskData.focus || `${deskData.author ? 'Author: ' + deskData.author + ' · ' : ''}${deskData.currentPage ? deskData.currentPage + '/' + deskData.totalPages + ' pages' : ''}`,
          creator: deskData.author || '',
          meta: [
            ...(deskData.author ? [{ label: 'Author', value: deskData.author }] : []),
            ...(deskData.format ? [{ label: 'Format', value: deskData.format }] : []),
            ...(deskData.platform ? [{ label: 'Platform', value: deskData.platform }] : []),
            ...(deskData.specs ? [{ label: 'Specs', value: deskData.specs }] : []),
            ...(deskData.tool ? [{ label: 'Tool', value: deskData.tool }] : [])
          ],
          body: {
            format: 'note',
            takeaways: deskData.quest ? [deskData.quest] : (deskData.focus ? [deskData.focus] : []),
            highlight: deskData.focus || deskData.quest || deskData.specs || ''
          },
          sourceUrl: deskData.linkUrl || deskData.storygraphUrl,
          foundUrl: deskData.foundUrl || null
        });
      }
    });
  });
}

/**
 * Initializes workbench swapping modal triggers and event listeners.
 * 
 * @purpose Binds the ⚙️ Swap Desks button, edit form submission, and close interactions.
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

  // Bind edit desk modal form
  const editForm = document.getElementById('edit-desk-form');
  const editModal = document.getElementById('edit-desk-modal');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const deskId = document.getElementById('edit-desk-id')?.value;
      if (!deskId) return;

      const title = document.getElementById('edit-desk-title-input')?.value.trim();
      const patch = {};
      if (title) patch.title = title;

      if (deskId === 'reading') {
        const page = parseInt(document.getElementById('edit-reading-page')?.value, 10);
        const total = parseInt(document.getElementById('edit-reading-total')?.value, 10);
        const author = document.getElementById('edit-reading-author')?.value.trim();
        const format = document.getElementById('edit-reading-format')?.value.trim();
        const storygraphUrl = document.getElementById('edit-reading-storygraph')?.value.trim();
        const linkUrl = document.getElementById('edit-reading-linkurl')?.value.trim();
        const linkText = document.getElementById('edit-reading-linktext')?.value.trim();
        if (!isNaN(page)) patch.currentPage = page;
        if (!isNaN(total)) patch.totalPages = total;
        if (author) patch.author = author;
        if (format) patch.format = format;
        if (storygraphUrl !== undefined) patch.storygraphUrl = storygraphUrl;
        if (linkUrl !== undefined) patch.linkUrl = linkUrl;
        if (linkText !== undefined) patch.linkText = linkText;
      } else if (deskId === 'fiber') {
        patch.name = title;
        const rows = parseInt(document.getElementById('edit-fiber-rows')?.value, 10);
        const targetRows = parseInt(document.getElementById('edit-fiber-target')?.value, 10);
        const specs = document.getElementById('edit-fiber-specs')?.value.trim();
        const linkUrl = document.getElementById('edit-fiber-linkurl')?.value.trim();
        const linkText = document.getElementById('edit-fiber-linktext')?.value.trim();
        if (!isNaN(rows)) patch.rows = rows;
        if (!isNaN(targetRows)) patch.targetRows = targetRows;
        if (specs) patch.specs = specs;
        if (linkUrl !== undefined) patch.linkUrl = linkUrl;
        if (linkText !== undefined) patch.linkText = linkText;
      } else if (deskId === 'gaming') {
        const platform = document.getElementById('edit-gaming-platform')?.value.trim();
        const quest = document.getElementById('edit-gaming-quest')?.value.trim();
        const linkUrl = document.getElementById('edit-gaming-linkurl')?.value.trim();
        const linkText = document.getElementById('edit-gaming-linktext')?.value.trim();
        if (platform) patch.platform = platform;
        if (quest) patch.quest = quest;
        if (linkUrl !== undefined) patch.linkUrl = linkUrl;
        if (linkText !== undefined) patch.linkText = linkText;
      } else if (deskId === 'tech') {
        const tool = document.getElementById('edit-tech-tool')?.value.trim();
        const focus = document.getElementById('edit-tech-focus')?.value.trim();
        const linkUrl = document.getElementById('edit-tech-linkurl')?.value.trim();
        const linkText = document.getElementById('edit-tech-linktext')?.value.trim();
        if (tool) patch.tool = tool;
        if (focus) patch.focus = focus;
        if (linkUrl !== undefined) patch.linkUrl = linkUrl;
        if (linkText !== undefined) patch.linkText = linkText;
      } else if (deskId === 'kitchen') {
        const servings = parseInt(document.getElementById('edit-kitchen-servings')?.value, 10);
        const prep = document.getElementById('edit-kitchen-prep')?.value.trim();
        const cook = document.getElementById('edit-kitchen-cook')?.value.trim();
        const sourceUrl = document.getElementById('edit-kitchen-sourceurl')?.value.trim();
        if (!isNaN(servings)) patch.servings = servings;
        if (prep) patch.prepTime = prep;
        if (cook) patch.cookTime = cook;
        if (sourceUrl !== undefined) {
          patch.sourceUrl = sourceUrl;
          patch.foundUrl = sourceUrl;
        }
      }

      await updateDesk(deskId, patch);
      renderActiveDesks();
      editModal?.classList.remove('active');
    });
  }

  // Render initial active desks
  renderActiveDesks();
}

/**
 * Opens and renders the 4-Workbench Swapping Modal with interactive 2-step selection.
 */
export function openSwapModal() {
  const modal = document.getElementById('swap-desk-modal');
  if (!modal) return;
  renderSwapModalContent();
  modal.classList.add('active');
}

/**
 * Renders dormant workbenches on top and active target workbenches below.
 */
function renderSwapModalContent() {
  const modal = document.getElementById('swap-desk-modal');
  const activeList = document.getElementById('swap-active-list');
  const dormantList = document.getElementById('swap-dormant-list');
  if (!modal || !activeList || !dormantList) return;

  activeList.innerHTML = '';
  dormantList.innerHTML = '';

  const activeIds = state.activeDeskIds || [];
  const allDeskIds = Object.keys(state.desks || {});
  const dormantIds = allDeskIds.filter(id => !activeIds.includes(id));

  // 1. Render Resting / Dormant Desks
  if (dormantIds.length === 0) {
    dormantList.innerHTML = `
      <div style="font-size: 0.8rem; color: var(--text-muted); padding: 8px;">
        All registered workbenches are currently active.
      </div>
    `;
    selectedIncomingDormantId = null;
  } else {
    if (!selectedIncomingDormantId || !dormantIds.includes(selectedIncomingDormantId)) {
      selectedIncomingDormantId = dormantIds[0];
    }

    dormantIds.forEach(dormantId => {
      const d = state.desks[dormantId] || { id: dormantId };
      const isSelected = dormantId === selectedIncomingDormantId;
      const row = document.createElement('div');
      row.className = `swap-item-row ${isSelected ? 'dormant-selected' : ''}`;
      row.innerHTML = `
        <div class="swap-item-left">
          <span class="desk-badge ${d.domain || dormantId}">${getDeskEmoji(dormantId)} ${escapeText(d.title || d.name || dormantId)}</span>
        </div>
        <button type="button" class="desk-action-btn" data-select-dormant="${dormantId}" style="${isSelected ? 'background: #38bdf8; color: #080c14; font-weight: 700;' : ''}">
          ${isSelected ? '● Ready to Activate' : 'Select to Activate'}
        </button>
      `;

      row.querySelector(`[data-select-dormant="${dormantId}"]`).addEventListener('click', () => {
        selectedIncomingDormantId = dormantId;
        renderSwapModalContent();
      });

      dormantList.appendChild(row);
    });
  }

  // 2. Render Active Desks with Direct Target Buttons
  const incomingDesk = selectedIncomingDormantId ? (state.desks[selectedIncomingDormantId] || { id: selectedIncomingDormantId }) : null;
  const incomingName = incomingDesk ? (incomingDesk.title || incomingDesk.name || selectedIncomingDormantId) : 'Resting Bench';
  const incomingEmoji = selectedIncomingDormantId ? getDeskEmoji(selectedIncomingDormantId) : '🌱';

  activeIds.forEach(actId => {
    const d = state.desks[actId] || { id: actId };
    const row = document.createElement('div');
    row.className = 'swap-item-row';
    row.innerHTML = `
      <div class="swap-item-left">
        <span class="desk-badge ${d.domain || actId}">${getDeskEmoji(actId)} ${escapeText(d.title || d.name || actId)}</span>
      </div>
      ${selectedIncomingDormantId ? `
        <button type="button" class="desk-action-btn" data-swap-target="${actId}" style="color: #38bdf8; border-color: rgba(56, 189, 248, 0.4);">
          Swap with ${incomingEmoji} ${escapeText(incomingName)} ➔
        </button>
      ` : `
        <span style="font-size: 0.72rem; color: #34d399; font-weight: 700;">ACTIVE</span>
      `}
    `;

    const swapTargetBtn = row.querySelector(`[data-swap-target="${actId}"]`);
    if (swapTargetBtn) {
      swapTargetBtn.addEventListener('click', () => {
        swapWorkbenches(selectedIncomingDormantId, actId);
        modal.classList.remove('active');
      });
    }

    activeList.appendChild(row);
  });
}

/**
 * Swaps a dormant workbench into an active slot, enforcing the 4-desk cap.
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

/**
 * Opens the universal workbench edit modal pre-filled with the target desk's data.
 * 
 * @purpose Provides progressive disclosure editing for any workbench type.
 * @inputs {string} deskId - The target workbench identifier.
 * @outputs {void}
 */
export function openEditDeskModal(deskId) {
  const modal = document.getElementById('edit-desk-modal');
  const titleEl = document.getElementById('edit-desk-modal-title');
  const idInput = document.getElementById('edit-desk-id');
  const titleInput = document.getElementById('edit-desk-title-input');
  const dynamicContainer = document.getElementById('edit-desk-dynamic-fields');

  if (!modal || !dynamicContainer) return;

  const desk = state.desks[deskId] || { id: deskId };
  idInput.value = deskId;
  const currentTitle = desk.title || desk.name || capitalize(deskId);
  titleInput.value = currentTitle;
  titleEl.textContent = `✏️ Update ${getDeskEmoji(deskId)} ${currentTitle}`;

  let fieldsHtml = '';

  if (deskId === 'reading') {
    fieldsHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Current Page</label>
          <input type="number" id="edit-reading-page" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${desk.currentPage || 0}">
        </div>
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Total Pages</label>
          <input type="number" id="edit-reading-total" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${desk.totalPages || 0}">
        </div>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Author</label>
        <input type="text" id="edit-reading-author" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.author || '')}">
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Reading Format / Routine</label>
        <input type="text" id="edit-reading-format" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.format || '')}">
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">The StoryGraph URL</label>
        <input type="url" id="edit-reading-storygraph" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.storygraphUrl || '')}">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Store / Audio Link URL</label>
          <input type="url" id="edit-reading-linkurl" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.linkUrl || '')}">
        </div>
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Link Button Label</label>
          <input type="text" id="edit-reading-linktext" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.linkText || 'Open Audiobook')}">
        </div>
      </div>
    `;
  } else if (deskId === 'fiber') {
    fieldsHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Current Rows Worked</label>
          <input type="number" id="edit-fiber-rows" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${desk.rows || 0}">
        </div>
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Target Rows</label>
          <input type="number" id="edit-fiber-target" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${desk.targetRows || 0}">
        </div>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Specs / Needle / Gauge</label>
        <input type="text" id="edit-fiber-specs" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.specs || '')}">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Pattern / Ravelry URL</label>
          <input type="url" id="edit-fiber-linkurl" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.linkUrl || '')}">
        </div>
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Link Button Label</label>
          <input type="text" id="edit-fiber-linktext" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.linkText || 'Open Ravelry')}">
        </div>
      </div>
    `;
  } else if (deskId === 'gaming') {
    fieldsHtml = `
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Platform</label>
        <input type="text" id="edit-gaming-platform" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.platform || '')}">
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Active Quest / Objective</label>
        <input type="text" id="edit-gaming-quest" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.quest || '')}">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Wiki / Guide URL</label>
          <input type="url" id="edit-gaming-linkurl" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.linkUrl || '')}">
        </div>
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Link Button Label</label>
          <input type="text" id="edit-gaming-linktext" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.linkText || 'Game Wiki')}">
        </div>
      </div>
    `;
  } else if (deskId === 'tech') {
    fieldsHtml = `
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Developer Tool / Architecture</label>
        <input type="text" id="edit-tech-tool" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.tool || '')}">
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Focus / Breakthrough Topic</label>
        <input type="text" id="edit-tech-focus" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.focus || '')}">
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Tool / Repository URL</label>
          <input type="url" id="edit-tech-linkurl" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.linkUrl || '')}">
        </div>
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Link Button Label</label>
          <input type="text" id="edit-tech-linktext" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.linkText || 'Tool Link')}">
        </div>
      </div>
    `;
  } else if (deskId === 'kitchen') {
    fieldsHtml = `
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-bottom: 12px;">
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Servings</label>
          <input type="number" id="edit-kitchen-servings" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${desk.servings || 4}">
        </div>
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Prep Time</label>
          <input type="text" id="edit-kitchen-prep" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.prepTime || '')}">
        </div>
        <div>
          <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Cook Time</label>
          <input type="text" id="edit-kitchen-cook" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.cookTime || '')}">
        </div>
      </div>
      <div style="margin-bottom: 12px;">
        <label style="display: block; font-size: 0.78rem; color: var(--text-muted); margin-bottom: 4px;">Source Recipe / Blog URL</label>
        <input type="url" id="edit-kitchen-sourceurl" class="quick-capture-input" style="width: 100%; background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 8px 12px;" value="${escapeText(desk.sourceUrl || desk.linkUrl || '')}">
      </div>
    `;
  }

  dynamicContainer.innerHTML = fieldsHtml;
  modal.classList.add('active');
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

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
