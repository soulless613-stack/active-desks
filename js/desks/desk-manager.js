/**
 * @file desk-manager.js
 * @description Universal workbench coordinator, card renderer, and desk swapper for Active Desks v3.0.
 * Orchestrates the active 4-desk display cap, renders all built-in and emergent domain cards from a
 * single declarative schema, and manages real-time desk selection.
 */

import {
  state,
  subscribe,
  setActiveDeskIds,
  updateDesk,
  CANONICAL_DESK_MAP,
  escapeHtml,
  capitalize,
  renderExternalLinksHtml
} from '../state.js';
import { openCaptureDetailModal } from '../captures/drawer.js';
import { saveDoc } from '../firebase.js';

export { CANONICAL_DESK_MAP };

/**
 * Declarative workbench specifications for built-in domains.
 * Customization is driven strictly by data properties on top of the universal card skeleton.
 */
const DESK_CONFIG = {
  reading: {
    domain: 'book',
    tagLabel: 'Book',
    deskName: 'Reading Nook',
    trayLabel: '📚 Up Next / TBR',
    defaultTitle: 'Untitled Book',
    progress: {
      currentKey: 'currentPage',
      totalKey: 'totalPages',
      clampMax: true,
      syncCapture: true,
      showPageFooter: true,
      steppers: [
        { step: 1, label: '+1' },
        { step: 5, label: '+5' },
        { step: 10, label: '+10' }
      ]
    },
    toDeskPatch: (cap) => ({
      activeCaptureId: cap.id,
      title: cap.title || 'Untitled Book',
      author: cap.creator || '',
      currentPage: cap.currentPage || 0,
      totalPages: cap.totalPages || 100,
      storygraphUrl: cap.sourceUrl || ''
    }),
    toFallbackCapture: (desk) => ({
      id: desk.activeCaptureId || 'default',
      domain: 'book',
      title: desk.title || 'Oathbringer',
      creator: desk.author || '',
      currentPage: desk.currentPage || 0,
      totalPages: desk.totalPages || 100,
      sourceUrl: desk.storygraphUrl || ''
    })
  },
  kitchen: {
    domain: 'recipe',
    tagLabel: 'Kitchen',
    deskName: 'Kitchen Shelf',
    trayLabel: '🍲 Saved Recipes',
    carousel: true
  },
  gaming: {
    domain: 'game',
    tagLabel: 'Gaming',
    deskName: 'Gaming Rig',
    trayLabel: '🎮 Backlog & Watchlist',
    defaultTitle: 'No Active Game',
    badgeKey: 'platform',
    defaultBadge: 'PC',
    focusLabel: 'Current Quest:',
    focusColor: 'var(--accent-purple)',
    focusKey: 'quest',
    defaultFocus: 'None set',
    toDeskPatch: (cap) => ({
      activeCaptureId: cap.id,
      title: cap.title || 'Untitled Game',
      quest: cap.quest || cap.summary || cap.topic || 'Active quest',
      platform: cap.platform || 'PC',
      linkUrl: cap.sourceUrl || ''
    }),
    toFallbackCapture: (desk) => ({
      id: desk.activeCaptureId || 'gaming-active',
      title: desk.title || 'Baldurs Gate 3',
      domain: 'game',
      topic: 'Gaming',
      summary: desk.quest || '',
      sourceUrl: desk.linkUrl || '',
      platform: desk.platform || 'PC',
      quest: desk.quest || ''
    })
  },
  fiber: {
    domain: 'fiber',
    tagLabel: 'Fiber',
    deskName: 'Fiber Arts',
    trayLabel: '🧶 Project Queue',
    defaultTitle: 'Knitting Project',
    progress: {
      currentKey: 'rows',
      totalKey: 'targetRows',
      barGradient: 'linear-gradient(90deg, var(--accent-rose), var(--accent-purple))',
      steppers: [
        { step: -1, label: '-1 Row' },
        { step: 1, label: '+1 Row' }
      ]
    },
    toDeskPatch: (cap) => ({
      activeCaptureId: cap.id,
      name: cap.title || 'Fiber Project',
      type: cap.topic || 'Knitting / Crochet',
      specs: cap.summary || 'Standard Pattern',
      linkUrl: cap.sourceUrl || '',
      rows: cap.rows || 0,
      targetRows: cap.targetRows || 100
    }),
    toFallbackCapture: (desk) => ({
      id: desk.activeCaptureId || 'fiber-active',
      title: desk.name || desk.title || 'Autumn Cardigan',
      domain: 'fiber',
      topic: desk.type || 'Knitting / Crochet',
      summary: desk.specs || 'Standard Pattern',
      sourceUrl: desk.linkUrl || '',
      rows: desk.rows || 0,
      targetRows: desk.targetRows || 100
    })
  },
  tech: {
    domain: 'tech',
    tagLabel: 'Tech',
    deskName: 'Tech Workbench',
    trayLabel: '💻 Tools & Repos',
    defaultTitle: 'Untitled Project',
    badgeKey: 'stack',
    defaultBadge: 'Development',
    focusLabel: 'Current Focus:',
    focusColor: 'var(--domain-tech)',
    focusKey: 'focus',
    defaultFocus: 'Active sprint',
    toDeskPatch: (cap) => ({
      activeCaptureId: cap.id,
      title: cap.title || 'Untitled Project',
      focus: cap.focus || cap.summary || cap.topic || 'Active sprint',
      stack: cap.stack || cap.topic || 'Development',
      linkUrl: cap.sourceUrl || ''
    }),
    toFallbackCapture: (desk) => ({
      id: desk.activeCaptureId || 'tech-active',
      title: desk.title || 'PressPrint Lab Parametric Boxes',
      domain: 'tech',
      topic: desk.stack || 'Development',
      summary: desk.focus || '',
      sourceUrl: desk.linkUrl || '',
      stack: desk.stack || 'Development',
      focus: desk.focus || ''
    })
  }
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

  // Delegated click handler for 1-tap "Set Active" from universal collapsible projection trays
  const gridEl = document.getElementById('workbench-grid');
  if (gridEl) {
    gridEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('.btn-set-active');
      if (!btn) return;
      const deskId = btn.getAttribute('data-desk');
      const capId = btn.getAttribute('data-cap-id');
      const cap = (state.captures || []).find(c => String(c.id) === String(capId));
      if (!cap) return;

      if (deskId === 'kitchen') {
        const recipeCaptures = (state.captures || []).filter(c => (c.domain || '').toLowerCase() === 'recipe');
        const targetIdx = recipeCaptures.findIndex(r => String(r.id) === String(cap.id));
        await updateDesk('kitchen', {
          activeCaptureId: cap.id,
          selectedIndex: targetIdx !== -1 ? targetIdx : 0
        });
        return;
      }

      const cfg = DESK_CONFIG[deskId];
      const patch = cfg?.toDeskPatch
        ? cfg.toDeskPatch(cap)
        : {
            activeCaptureId: cap.id,
            title: cap.title || `${capitalize(deskId)} Desk`,
            linkUrl: cap.sourceUrl || ''
          };
      await updateDesk(deskId, patch);
    });
  }

  // Subscribe to changes in active selection, desks, or captures
  subscribe('activeDeskIds', renderWorkbenchGrid);
  subscribe('desks', renderWorkbenchGrid);
  subscribe('captures', renderWorkbenchGrid);

  renderWorkbenchGrid();
}

/**
 * Renders the active 4 workbench cards into the grid using the universal desk renderer.
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

  gridEl.innerHTML = activeIds.map(id => {
    const desk = deskMap[id] || { id, title: `${capitalize(id)} Desk`, domain: id };
    return renderUniversalDeskCard(id, desk);
  }).join('');

  for (const id of activeIds) {
    const cardEl = gridEl.querySelector(`[data-desk-id="${id}"]`);
    if (cardEl) {
      bindUniversalDeskEvents(cardEl, id, deskMap[id] || { id });
    }
  }
}

/**
 * Universal workbench card renderer supporting progress bars, recipe carousels, focus desks,
 * and emergent custom domains through a single card template.
 * 
 * @purpose Renders any workbench card from declarative configuration and capture data.
 * @inputs {string} id - Canonical desk identifier.
 * @inputs {object} desk - Desk state record.
 * @outputs {string} HTML string.
 */
export function renderUniversalDeskCard(id, desk) {
  const cfg = DESK_CONFIG[id];

  // 1. Carousel Workbench (Kitchen Shelf)
  if (cfg?.carousel) {
    const recipeCaptures = (state.captures || []).filter(c => (c.domain || '').toLowerCase() === 'recipe');
    const allRecipes = recipeCaptures.length > 0 ? recipeCaptures : (desk.recipes || []);
    const activeIdx = Math.max(0, Math.min(allRecipes.length - 1, desk.selectedIndex || 0));
    const recipe = allRecipes[activeIdx] || {
      id: 'default',
      title: 'No Recipes Saved Yet',
      summary: 'Drop a recipe reel, TikTok, or food blog link into the capture bar!',
      source: ''
    };
    const creator = recipe.creator || recipe.source || '';
    const summary = recipe.summary || recipe.highlight || 'No summary available.';
    const sourceUrl = recipe.sourceUrl || (recipe.source && recipe.source.startsWith('http') ? recipe.source : '');

    return `
      <div class="desk-card" data-desk-id="${id}">
        <div class="desk-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="desk-domain-tag ${cfg.domain}">${cfg.tagLabel}</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">${cfg.deskName}</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
            ${allRecipes.length > 0 ? `${activeIdx + 1}/${allRecipes.length}` : '0/0'}
          </span>
        </div>

        <div>
          <div class="desk-card-title">${escapeHtml(recipe.title || 'Untitled Recipe')}</div>
          <div class="desk-card-meta" style="margin-top: 4px;">
            ${creator ? `<span style="color: var(--accent-cyan);">by ${escapeHtml(creator)}</span> · ` : ''}
            ${escapeHtml(summary)}
          </div>
          ${renderProjectionTrayHtml(id, cfg.domain, recipe.id)}
        </div>

        <div class="desk-card-footer">
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="desk-action-btn btn-kitchen-prev" ${activeIdx <= 0 ? 'disabled style="opacity: 0.3;"' : ''}>← Prev</button>
            <button type="button" class="desk-action-btn btn-kitchen-next" ${activeIdx >= allRecipes.length - 1 ? 'disabled style="opacity: 0.3;"' : ''}>Next →</button>
            <button type="button" class="desk-action-btn btn-desk-open-card" data-desk="${id}">📋 Details</button>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${renderExternalLinksHtml(recipe.blogUrl, sourceUrl)}
          </div>
        </div>
      </div>
    `;
  }

  // 2. Progress Workbenches (Reading Nook & Fiber Arts)
  if (cfg?.progress) {
    const p = cfg.progress;
    const current = desk[p.currentKey] || 0;
    const total = desk[p.totalKey] || 1;
    const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
    const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId));
    const sourceUrl = activeCap?.sourceUrl || desk.storygraphUrl || desk.linkUrl;
    const title = desk.title || desk.name || cfg.defaultTitle;
    const metaText = id === 'reading'
      ? `by ${escapeHtml(desk.author || 'Unknown Author')}`
      : `${escapeHtml(desk.type || 'WIP')} · ${escapeHtml(desk.specs || 'Standard Weight')}`;
    const headerRight = id === 'reading'
      ? `<span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-cyan);">${pct}%</span>`
      : `<span style="font-size: 0.75rem; font-weight: 700; color: var(--accent-rose);">${pct}% (${current}/${total})</span>`;

    return `
      <div class="desk-card" data-desk-id="${id}">
        <div class="desk-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="desk-domain-tag ${cfg.domain}">${cfg.tagLabel}</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">${cfg.deskName}</span>
          </div>
          ${headerRight}
        </div>

        <div>
          <div class="desk-card-title">${escapeHtml(title)}</div>
          <div class="desk-card-meta">${metaText}</div>

          <div class="progress-bar-bg" style="margin-top: 10px;">
            <div class="progress-bar-fill" style="width: ${pct}%;${p.barGradient ? ` background: ${p.barGradient};` : ''}"></div>
          </div>

          ${p.showPageFooter ? `
            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
              <span>Page ${current} of ${total}</span>
              <span>${total - current > 0 ? `${total - current} pages left` : 'Finished!'}</span>
            </div>
          ` : ''}

          ${renderProjectionTrayHtml(id, cfg.domain, desk.activeCaptureId)}
        </div>

        <div class="desk-card-footer">
          <div style="display: flex; gap: 6px; align-items: center;">
            ${p.steppers.map(s => `<button type="button" class="desk-action-btn btn-desk-step" data-step="${s.step}">${s.label}</button>`).join('')}
            <button type="button" class="desk-action-btn btn-desk-open-card" data-desk="${id}">✏️ Details</button>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${renderExternalLinksHtml(activeCap?.blogUrl, sourceUrl)}
          </div>
        </div>
      </div>
    `;
  }

  // 3. Built-In Focus Workbenches (Gaming Rig & Tech Workbench)
  if (cfg) {
    const activeCap = (state.captures || []).find(c => String(c.id) === String(desk.activeCaptureId));
    const sourceUrl = activeCap?.sourceUrl || desk.linkUrl;
    return `
      <div class="desk-card" data-desk-id="${id}">
        <div class="desk-card-header">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="desk-domain-tag ${cfg.domain}">${cfg.tagLabel}</span>
            <span style="font-size: 0.82rem; font-weight: 700; color: var(--text-secondary);">${cfg.deskName}</span>
          </div>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(desk[cfg.badgeKey] || cfg.defaultBadge)}</span>
        </div>

        <div>
          <div class="desk-card-title">${escapeHtml(desk.title || cfg.defaultTitle)}</div>
          <div class="desk-card-meta" style="margin-top: 6px;">
            <strong style="color: ${cfg.focusColor};">${cfg.focusLabel}</strong> ${escapeHtml(desk[cfg.focusKey] || cfg.defaultFocus)}
          </div>
          ${renderProjectionTrayHtml(id, cfg.domain, desk.activeCaptureId)}
        </div>

        <div class="desk-card-footer">
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="desk-action-btn btn-desk-open-card" data-desk="${id}">✏️ Details</button>
          </div>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${renderExternalLinksHtml(activeCap?.blogUrl, sourceUrl)}
          </div>
        </div>
      </div>
    `;
  }

  // 4. Emergent / Custom Domain Workbenches
  const domain = (desk.domain || id).toLowerCase();
  const matchingCaptures = (state.captures || []).filter(c => (c.domain || '').toLowerCase() === domain);
  const activeCap = matchingCaptures.find(c => String(c.id) === String(desk.activeCaptureId)) || matchingCaptures[0];
  const title = activeCap?.title || desk.title || `${capitalize(domain)} Desk`;
  const summary = activeCap?.summary || 'Focus area active. Open details to inspect or select from backlog below.';
  const topic = activeCap?.topic ? `· ${activeCap.topic}` : '';

  return `
    <div class="desk-card" data-desk-id="${id}">
      <div class="desk-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="desk-domain-tag ${domain}">${escapeHtml(domain)}</span>
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
        ${renderProjectionTrayHtml(id, domain, activeCap?.id)}
      </div>

      <div class="desk-card-footer">
        <div style="display: flex; gap: 6px; align-items: center;">
          ${activeCap ? `<button type="button" class="desk-action-btn btn-desk-open-card" data-desk="${id}" data-generic-cap-id="${activeCap.id}">📋 Details</button>` : ''}
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${renderExternalLinksHtml(activeCap?.blogUrl, activeCap?.sourceUrl)}
        </div>
      </div>
    </div>
  `;
}

/**
 * Binds interactive events (steppers, carousel arrows, and detail modal openers) for any workbench card.
 * 
 * @purpose Attaches event listeners to a rendered workbench card element.
 * @inputs {HTMLElement} cardEl - Card DOM element.
 * @inputs {string} id - Canonical desk ID.
 * @inputs {object} desk - Desk state object.
 * @outputs {void}
 */
export function bindUniversalDeskEvents(cardEl, id, desk) {
  const cfg = DESK_CONFIG[id];

  // 1. Kitchen Carousel Controls
  if (cfg?.carousel) {
    const recipeCaptures = (state.captures || []).filter(c => (c.domain || '').toLowerCase() === 'recipe');
    const allRecipes = recipeCaptures.length > 0 ? recipeCaptures : (desk.recipes || []);
    const activeIdx = Math.max(0, Math.min(allRecipes.length - 1, desk.selectedIndex || 0));

    const prevBtn = cardEl.querySelector('.btn-kitchen-prev');
    if (prevBtn && activeIdx > 0) {
      prevBtn.addEventListener('click', () => updateDesk('kitchen', { selectedIndex: activeIdx - 1 }));
    }

    const nextBtn = cardEl.querySelector('.btn-kitchen-next');
    if (nextBtn && activeIdx < allRecipes.length - 1) {
      nextBtn.addEventListener('click', () => updateDesk('kitchen', { selectedIndex: activeIdx + 1 }));
    }

    const viewBtn = cardEl.querySelector('.btn-desk-open-card');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        if (allRecipes[activeIdx]) openCaptureDetailModal(allRecipes[activeIdx]);
      });
    }
    return;
  }

  // 2. Progress Stepper Controls (Reading & Fiber)
  if (cfg?.progress) {
    const p = cfg.progress;
    cardEl.querySelectorAll('.btn-desk-step').forEach(btn => {
      btn.addEventListener('click', async () => {
        const step = parseInt(btn.getAttribute('data-step') || '1', 10);
        const cur = desk[p.currentKey] || 0;
        const maxVal = p.clampMax ? (desk[p.totalKey] || 9999) : Infinity;
        const nextVal = Math.max(0, Math.min(maxVal, cur + step));
        await updateDesk(id, { [p.currentKey]: nextVal });
        if (p.syncCapture && desk.activeCaptureId && desk.activeCaptureId !== 'default') {
          await saveDoc('captures', desk.activeCaptureId, { [p.currentKey]: nextVal });
        }
      });
    });
  }

  // 3. Universal Details Modal Opener
  const detailsBtn = cardEl.querySelector('.btn-desk-open-card');
  if (detailsBtn) {
    detailsBtn.addEventListener('click', () => {
      const capId = detailsBtn.getAttribute('data-generic-cap-id') || desk.activeCaptureId;
      const activeCap = (state.captures || []).find(c => String(c.id) === String(capId));
      if (activeCap) {
        openCaptureDetailModal(activeCap);
      } else if (cfg?.toFallbackCapture) {
        openCaptureDetailModal(cfg.toFallbackCapture(desk));
      }
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
 * Renders a standardized collapsible projection tray for any workbench domain.
 * 
 * @param {string} deskId - Target workbench identifier.
 * @param {string} domain - Domain filter.
 * @param {string} activeId - Currently selected captureId or 'default'.
 * @returns {string} HTML string.
 */
export function renderProjectionTrayHtml(deskId, domain, activeId) {
  const matches = (state.captures || []).filter(c => 
    (c.domain || '').toLowerCase() === domain.toLowerCase() && String(c.id) !== String(activeId)
  );

  const label = DESK_CONFIG[deskId]?.trayLabel || `📋 ${capitalize(domain)} Backlog`;
  if (matches.length === 0) return '';

  return `
    <details class="desk-projection-tray" data-tray-desk="${deskId}">
      <summary class="projection-summary">
        <span style="display: flex; align-items: center; gap: 6px;">
          <span>${label}</span>
          <span class="projection-badge">${matches.length}</span>
        </span>
        <span class="projection-summary-arrow">▾</span>
      </summary>
      <div class="projection-items-list">
        ${matches.map(c => `
          <div class="projection-item">
            <div style="display: flex; flex-direction: column; min-width: 0; flex: 1;">
              <span style="font-size: 0.8rem; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">${escapeHtml(c.title || 'Untitled')}</span>
              <span style="font-size: 0.7rem; color: var(--text-muted);">${escapeHtml(c.creator ? `by ${c.creator}` : (c.topic || ''))}</span>
            </div>
            <button type="button" class="btn-set-active" data-desk="${deskId}" data-cap-id="${c.id}">Set Active</button>
          </div>
        `).join('')}
      </div>
    </details>
  `;
}
