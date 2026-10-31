/**
 * @file drawer.js
 * @description Centered Universal Captures Stream and 3-Tier Detail Modal for Active Desks v3.0.
 * Recreates the centered modal viewport from v1 while retaining Firestore real-time synchronization,
 * dynamic scoped topic sub-filtering, anti-squish pill geometry, autonomous Rule of 3 topic notices,
 * dynamic domain discovery, and scoped detail modal editing.
 */

import { state, subscribe, updateDesk } from '../state.js';
import { deleteDocById, saveDoc } from '../firebase.js';
import { runTopicCohesionEvaluation, activeTopicEvolutionNotice } from './taxonomy.js';

let activeDomainFilter = 'all';
let activeTopicFilter = 'all';
let searchQuery = '';

/**
 * Initializes the centered captures modal, filter pills, search, and detail modal listeners.
 * 
 * @purpose Sets up capture interactions and subscribes to Firestore captures updates.
 * @inputs None.
 * @outputs {void}
 */
export function initCapturesDrawer() {
  const toggleBtn = document.getElementById('btn-toggle-captures');
  const modal = document.getElementById('captures-modal');
  const searchInput = document.getElementById('drawer-search-input');
  const tidyBtn = document.getElementById('btn-tidy-topics');

  if (toggleBtn) toggleBtn.addEventListener('click', toggleCapturesModal);

  // Close when clicking modal backdrop or close button
  document.querySelectorAll('[data-close-modal="captures-modal"]').forEach(btn => {
    btn.addEventListener('click', closeCapturesModal);
  });

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeCapturesModal();
    });
  }

  // Wire search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').trim().toLowerCase();
      renderCapturesList();
    });
  }

  // Wire AI Topic Tidy button
  if (tidyBtn) {
    tidyBtn.addEventListener('click', async () => {
      tidyBtn.disabled = true;
      tidyBtn.textContent = 'Analyzing Topics...';
      try {
        await runTopicCohesionEvaluation(activeDomainFilter);
      } finally {
        tidyBtn.disabled = false;
        tidyBtn.textContent = '✨ Tidy Topics';
        renderDrawerEvolutionNotice();
        renderDomainFilterBar();
        renderCapturesList();
      }
    });
  }

  // Subscribe to captures updates from Firestore
  subscribe('captures', () => {
    updateBadgeCount();
    renderDomainFilterBar();
    renderDrawerEvolutionNotice();
    renderCapturesList();
  });

  updateBadgeCount();
  renderDomainFilterBar();
  renderDrawerEvolutionNotice();
  renderCapturesList();
}

/**
 * Toggles the centered captures modal open or closed.
 */
export function toggleCapturesModal() {
  const modal = document.getElementById('captures-modal');
  if (modal) {
    if (modal.classList.contains('active')) closeCapturesModal();
    else openCapturesModal();
  }
}

/**
 * Opens the centered captures modal.
 */
export function openCapturesModal() {
  const modal = document.getElementById('captures-modal');
  if (modal) modal.classList.add('active');
  renderDomainFilterBar();
  renderDrawerEvolutionNotice();
  renderCapturesList();
}

/**
 * Closes the centered captures modal.
 */
export function closeCapturesModal() {
  const modal = document.getElementById('captures-modal');
  if (modal) modal.classList.remove('active');
}

/**
 * Updates the counter badge in the centered captures modal header and domain filter pills.
 * 
 * @purpose Keeps item counts on modal header and domain pills synchronized with Firestore state.
 * @inputs None.
 * @outputs {void}
 */
function updateBadgeCount() {
  const allCaptures = state.captures || [];
  const badge = document.getElementById('captures-count-badge');
  if (badge) {
    badge.textContent = `${allCaptures.length} Items`;
  }
}

/**
 * Dynamically renders the domain filter bar with base domains plus any custom emerged domains.
 * 
 * @purpose Discovers new domains from captures so they appear with anti-squish geometry and live count badges.
 * @inputs None.
 * @outputs {void}
 */
export function renderDomainFilterBar() {
  const container = document.getElementById('captures-domain-filters');
  if (!container) return;

  const baseDomains = ['all', 'recipe', 'book', 'tech', 'game', 'fiber', 'misc'];
  const allDomains = new Set(baseDomains);
  (state.captures || []).forEach(c => {
    const d = (c.domain || 'misc').toLowerCase();
    if (d && d !== 'link') allDomains.add(d);
  });

  const allCaptures = state.captures || [];

  container.innerHTML = Array.from(allDomains).map(d => {
    const isActive = activeDomainFilter === d;
    const count = d === 'all'
      ? allCaptures.length
      : allCaptures.filter(c => (c.domain || 'misc').toLowerCase() === d).length;
    return `
      <button type="button" class="filter-pill ${isActive ? 'active' : ''}" data-domain="${d}">
        ${capitalize(d)} <span class="capture-pill-count" data-count-domain="${d}">${count}</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      container.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeDomainFilter = pill.getAttribute('data-domain') || 'all';
      activeTopicFilter = 'all';
      renderCapturesList();
    });
  });
}

/**
 * Renders the Rule of 3 topic evolution notice banner inside the drawer if an event is active.
 */
export function renderDrawerEvolutionNotice() {
  const noticeContainer = document.getElementById('drawer-evolution-insights');
  if (!noticeContainer) return;

  if (!activeTopicEvolutionNotice) {
    noticeContainer.style.display = 'none';
    noticeContainer.innerHTML = '';
    return;
  }

  const { domain, text, cardIds } = activeTopicEvolutionNotice;
  noticeContainer.innerHTML = `
    <span>✨ <strong>Topic Evolution:</strong> ${escapeHtml(text)}</span>
    <div style="display: flex; gap: 6px; align-items: center;">
      <button type="button" class="evolution-action-chip btn-view-cluster">View Cards</button>
      <button type="button" class="evolution-action-chip dismiss btn-dismiss-cluster" title="Dismiss">✕</button>
    </div>
  `;
  noticeContainer.style.display = 'flex';

  const viewBtn = noticeContainer.querySelector('.btn-view-cluster');
  if (viewBtn) {
    viewBtn.onclick = () => {
      if (domain && domain !== 'all') {
        activeDomainFilter = domain;
        activeTopicFilter = 'all';
        renderDomainFilterBar();
      }
      if (cardIds && cardIds.length > 0) {
        const firstCard = (state.captures || []).find(c => c.id === cardIds[0]);
        if (firstCard?.topic) {
          activeTopicFilter = firstCard.topic;
        }
      }
      renderCapturesList();
    };
  }

  const dismissBtn = noticeContainer.querySelector('.btn-dismiss-cluster');
  if (dismissBtn) {
    dismissBtn.onclick = () => {
      noticeContainer.style.display = 'none';
      noticeContainer.innerHTML = '';
    };
  }
}

/**
 * Renders dynamic row-2 topic sub-filter pills scoped to the currently active domain.
 * 
 * @purpose Allows granular topic browsing within a domain without leaving the modal.
 * @inputs {Array<object>} domainCaptures - Captures belonging to the active domain filter.
 * @outputs {void}
 */
function renderTopicFilterBar(domainCaptures) {
  const topicBar = document.getElementById('captures-topic-filter-bar');
  if (!topicBar) return;

  // Only display topic sub-filters when a specific domain is active and contains topics
  if (activeDomainFilter === 'all') {
    topicBar.style.display = 'none';
    topicBar.innerHTML = '';
    return;
  }

  const topicCounts = {};
  domainCaptures.forEach(c => {
    const rawTopic = (c.topic || '').trim();
    if (rawTopic) {
      topicCounts[rawTopic] = (topicCounts[rawTopic] || 0) + 1;
    }
  });

  const topics = Object.keys(topicCounts).sort((a, b) => a.localeCompare(b));

  if (topics.length === 0) {
    topicBar.style.display = 'none';
    topicBar.innerHTML = '';
    return;
  }

  topicBar.style.display = 'flex';
  topicBar.innerHTML = `
    <button type="button" class="topic-filter-pill ${activeTopicFilter === 'all' ? 'active' : ''}" data-topic="all">
      All Topics <span class="topic-pill-count">${domainCaptures.length}</span>
    </button>
    ${topics.map(topic => `
      <button type="button" class="topic-filter-pill ${activeTopicFilter.toLowerCase() === topic.toLowerCase() ? 'active' : ''}" data-topic="${escapeHtml(topic)}">
        ${escapeHtml(topic)} <span class="topic-pill-count">${topicCounts[topic]}</span>
      </button>
    `).join('')}
  `;

  topicBar.querySelectorAll('.topic-filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      topicBar.querySelectorAll('.topic-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeTopicFilter = pill.getAttribute('data-topic') || 'all';
      renderCapturesList();
    });
  });
}

/**
 * Renders the filtered capture cards inside the modal list, keeping cards read-only with vibrant color coding.
 * 
 * @purpose Displays cards with color-coded domain tags, topic labels, and detail modal openers.
 * @inputs None.
 * @outputs {void}
 */
export function renderCapturesList() {
  const listEl = document.getElementById('drawer-captures-list');
  if (!listEl) return;

  const allCaptures = (state.captures || []).slice().sort((a, b) => {
    const tA = new Date(b.createdAt || b.updatedAt || 0).getTime();
    const tB = new Date(a.createdAt || a.updatedAt || 0).getTime();
    return tA - tB;
  });

  // Step 1: Filter by domain
  const domainCaptures = allCaptures.filter(c => {
    return activeDomainFilter === 'all' || (c.domain || 'misc').toLowerCase() === activeDomainFilter;
  });

  // Step 2: Render dynamic topic sub-filter bar based on domain scoped items
  renderTopicFilterBar(domainCaptures);

  // Step 3: Filter by topic and search query
  const filtered = domainCaptures.filter(c => {
    if (activeTopicFilter !== 'all') {
      const topic = (c.topic || '').trim().toLowerCase();
      if (topic !== activeTopicFilter.toLowerCase()) return false;
    }
    if (!searchQuery) return true;

    const haystack = `${c.title || ''} ${c.creator || ''} ${c.topic || ''} ${c.summary || ''}`.toLowerCase();
    return haystack.includes(searchQuery);
  });

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 0.85rem;">
        No captures found under this filter.
      </div>
    `;
    return;
  }

  listEl.innerHTML = filtered.map(c => {
    const domain = (c.domain || 'misc').toLowerCase();
    const isExtracting = c.status === 'extracting';
    return `
      <div class="capture-card" data-capture-id="${c.id}">
        <div class="capture-card-header">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="desk-domain-tag ${domain}">${escapeHtml(domain)}</span>
            ${c.topic ? `<span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">· ${escapeHtml(c.topic)}</span>` : ''}
            ${isExtracting ? `<span class="brand-badge" style="background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-color: rgba(251, 191, 36, 0.3);">⏳ Extracting...</span>` : ''}
          </div>
          <button type="button" class="btn-delete-capture" data-delete-id="${c.id}" title="Delete capture">🗑️</button>
        </div>

        <div class="capture-card-title">${escapeHtml(c.title || 'Untitled Capture')}</div>
        <div class="capture-card-summary" ${isExtracting ? 'style="color: var(--accent-cyan); font-style: italic;"' : ''}>
          ${escapeHtml(c.summary || (isExtracting ? 'Autonomous extraction worker active...' : 'No summary.'))}
        </div>

        <div class="capture-card-footer">
          <span>${c.creator ? `by ${escapeHtml(c.creator)}` : ''}</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${c.blogUrl && c.blogUrl !== c.sourceUrl ? `<a href="${c.blogUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn" style="color: var(--accent-cyan); font-weight: 600;" onclick="event.stopPropagation()">Blog ↗</a>` : ''}
            ${c.sourceUrl ? `<a href="${c.sourceUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn" onclick="event.stopPropagation()">Source ↗</a>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Wire card click for detail modal
  listEl.querySelectorAll('.capture-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-capture-id');
      const target = allCaptures.find(c => String(c.id) === String(id));
      if (target) openCaptureDetailModal(target);
    });
  });

  // Wire delete button (atomic Firestore delete)
  listEl.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-delete-id');
      const target = allCaptures.find(c => String(c.id) === String(id));
      const title = target?.title || 'this capture';
      if (confirm(`Delete "${title.slice(0, 40)}"?`)) {
        await deleteDocById('captures', id);
      }
    });
  });
}

/**
 * Opens and populates the 3-Tier Detail Modal for a capture.
 * 
 * @purpose Displays complete structured payload (ingredients, steps, specs) with domain reassignment & inline topic editing.
 * @inputs {object} capture - Capture record.
 * @outputs {void}
 */
export function openCaptureDetailModal(capture) {
  const modal = document.getElementById('capture-detail-modal');
  if (!modal) return;

  const domain = (capture.domain || 'misc').toLowerCase();
  const domainSelect = document.getElementById('modal-capture-domain-select');
  const topicInput = document.getElementById('modal-capture-topic-input');
  const creatorEl = document.getElementById('modal-capture-creator');
  const titleInput = document.getElementById('modal-capture-title-input');
  const summaryInput = document.getElementById('modal-capture-summary-input');
  const workbenchFieldsEl = document.getElementById('modal-capture-workbench-fields');
  const tier3El = document.getElementById('modal-capture-tier3');
  const sourceLink = document.getElementById('modal-capture-source-link');
  const blogLink = document.getElementById('modal-capture-blog-link');
  const deleteBtn = document.getElementById('btn-modal-delete-capture');

  if (domainSelect) {
    const baseDomains = ['recipe', 'book', 'tech', 'game', 'fiber', 'misc'];
    const allDomains = new Set(baseDomains);
    (state.captures || []).forEach(c => {
      if (c.domain) allDomains.add(c.domain.toLowerCase());
    });
    if (capture.domain) allDomains.add(capture.domain.toLowerCase());

    domainSelect.innerHTML = Array.from(allDomains).map(d => `
      <option value="${d}" ${d === domain ? 'selected' : ''}>${capitalize(d)}</option>
    `).join('');

    domainSelect.value = domain;
    domainSelect.className = `domain-reassign-select ${domain}`;
    domainSelect.onchange = async () => {
      const newDomain = domainSelect.value;
      domainSelect.className = `domain-reassign-select ${newDomain}`;
      await saveDoc('captures', capture.id, { domain: newDomain });
      capture.domain = newDomain;
    };
  }

  if (topicInput) {
    topicInput.value = capture.topic || '';
    topicInput.onchange = async () => {
      const newTopic = topicInput.value.trim();
      if (newTopic !== (capture.topic || '')) {
        await saveDoc('captures', capture.id, { topic: newTopic });
        capture.topic = newTopic;
      }
    };
    topicInput.onkeydown = (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        topicInput.blur();
      }
    };
  }

  if (creatorEl) creatorEl.textContent = capture.creator ? `by ${capture.creator}` : '';

  if (titleInput) {
    titleInput.value = capture.title || '';
    titleInput.onchange = async () => {
      const newTitle = titleInput.value.trim();
      if (newTitle !== (capture.title || '')) {
        await saveDoc('captures', capture.id, { title: newTitle });
        capture.title = newTitle;
        await syncActiveDesk(domain, { title: newTitle });
      }
    };
    titleInput.onkeydown = (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        titleInput.blur();
      }
    };
  }

  if (summaryInput) {
    summaryInput.value = capture.summary || '';
    summaryInput.onchange = async () => {
      const newSummary = summaryInput.value.trim();
      if (newSummary !== (capture.summary || '')) {
        await saveDoc('captures', capture.id, { summary: newSummary });
        capture.summary = newSummary;
        await syncActiveDesk(domain, { summary: newSummary });
      }
    };
  }

  // Populate dynamic workbench fields based on domain
  if (workbenchFieldsEl) {
    workbenchFieldsEl.innerHTML = '';
    if (domain === 'book') {
      const curPage = capture.currentPage || 0;
      const totPages = capture.totalPages || 100;
      workbenchFieldsEl.innerHTML = `
        <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: var(--radius-md); padding: 10px 14px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--domain-book); text-transform: uppercase; margin-bottom: 6px;">📖 Reading Progress</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center;">
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Current Page</label>
              <input type="number" id="modal-card-page-input" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${curPage}" min="0">
              <div class="btn-stepper-group" style="margin-top: 4px;">
                <button type="button" class="btn-stepper-pill modal-page-step" data-step="-10">-10</button>
                <button type="button" class="btn-stepper-pill modal-page-step" data-step="-1">-1</button>
                <button type="button" class="btn-stepper-pill modal-page-step" data-step="1">+1</button>
                <button type="button" class="btn-stepper-pill modal-page-step" data-step="10">+10</button>
              </div>
            </div>
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Total Pages</label>
              <input type="number" id="modal-card-total-input" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${totPages}" min="1">
            </div>
          </div>
        </div>
      `;

      const pInput = document.getElementById('modal-card-page-input');
      const tInput = document.getElementById('modal-card-total-input');
      const savePages = async () => {
        const p = parseInt(pInput?.value || '0', 10);
        const t = parseInt(tInput?.value || '100', 10);
        await saveDoc('captures', capture.id, { currentPage: p, totalPages: t });
        capture.currentPage = p;
        capture.totalPages = t;
        await syncActiveDesk('book', { currentPage: p, totalPages: t });
      };

      if (pInput) pInput.onchange = savePages;
      if (tInput) tInput.onchange = savePages;
      workbenchFieldsEl.querySelectorAll('.modal-page-step').forEach(btn => {
        btn.addEventListener('click', async () => {
          const step = parseInt(btn.getAttribute('data-step') || '0', 10);
          const currentVal = parseInt(pInput?.value || '0', 10);
          const newVal = Math.max(0, currentVal + step);
          if (pInput) pInput.value = newVal;
          await savePages();
        });
      });
    } else if (domain === 'fiber') {
      const curRows = capture.rows || 0;
      const totRows = capture.targetRows || 100;
      workbenchFieldsEl.innerHTML = `
        <div style="background: rgba(236, 72, 153, 0.05); border: 1px solid rgba(236, 72, 153, 0.2); border-radius: var(--radius-md); padding: 10px 14px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--domain-fiber); text-transform: uppercase; margin-bottom: 6px;">🧶 Fiber WIP Tracker</div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center;">
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Current Rows</label>
              <input type="number" id="modal-card-rows-input" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${curRows}" min="0">
              <div class="btn-stepper-group" style="margin-top: 4px;">
                <button type="button" class="btn-stepper-pill modal-row-step" data-step="-1">-1</button>
                <button type="button" class="btn-stepper-pill modal-row-step" data-step="1">+1</button>
              </div>
            </div>
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Target Rows</label>
              <input type="number" id="modal-card-target-rows-input" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${totRows}" min="1">
            </div>
          </div>
        </div>
      `;

      const rInput = document.getElementById('modal-card-rows-input');
      const trInput = document.getElementById('modal-card-target-rows-input');
      const saveRows = async () => {
        const r = parseInt(rInput?.value || '0', 10);
        const tr = parseInt(trInput?.value || '100', 10);
        await saveDoc('captures', capture.id, { rows: r, targetRows: tr });
        capture.rows = r;
        capture.targetRows = tr;
        await syncActiveDesk('fiber', { rows: r, targetRows: tr });
      };

      if (rInput) rInput.onchange = saveRows;
      if (trInput) trInput.onchange = saveRows;
      workbenchFieldsEl.querySelectorAll('.modal-row-step').forEach(btn => {
        btn.addEventListener('click', async () => {
          const step = parseInt(btn.getAttribute('data-step') || '0', 10);
          const currentVal = parseInt(rInput?.value || '0', 10);
          const newVal = Math.max(0, currentVal + step);
          if (rInput) rInput.value = newVal;
          await saveRows();
        });
      });
    } else if (domain === 'game') {
      workbenchFieldsEl.innerHTML = `
        <div style="background: rgba(168, 85, 247, 0.05); border: 1px solid rgba(168, 85, 247, 0.2); border-radius: var(--radius-md); padding: 10px 14px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--domain-game); text-transform: uppercase; margin-bottom: 6px;">🎮 Active Quest &amp; Platform</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Platform</label>
              <input type="text" id="modal-card-platform-input" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${escapeHtml(capture.platform || 'PC')}">
            </div>
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Current Quest / Objective</label>
              <input type="text" id="modal-card-quest-input" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${escapeHtml(capture.quest || capture.summary || '')}">
            </div>
          </div>
        </div>
      `;

      const platInput = document.getElementById('modal-card-platform-input');
      const questInput = document.getElementById('modal-card-quest-input');
      const saveGaming = async () => {
        const platform = platInput?.value.trim() || 'PC';
        const quest = questInput?.value.trim() || '';
        await saveDoc('captures', capture.id, { platform, quest });
        capture.platform = platform;
        capture.quest = quest;
        await syncActiveDesk('game', { platform, quest });
      };

      if (platInput) platInput.onchange = saveGaming;
      if (questInput) questInput.onchange = saveGaming;
    } else if (domain === 'tech') {
      workbenchFieldsEl.innerHTML = `
        <div style="background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-md); padding: 10px 14px;">
          <div style="font-size: 0.75rem; font-weight: 700; color: var(--domain-tech); text-transform: uppercase; margin-bottom: 6px;">💻 Tech Focus &amp; Stack</div>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Tech Stack / Tools</label>
              <input type="text" id="modal-card-stack-input" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${escapeHtml(capture.stack || capture.topic || 'Development')}">
            </div>
            <div>
              <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">Current Focus / Sprint Task</label>
              <input type="text" id="modal-card-focus-input" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${escapeHtml(capture.focus || capture.summary || '')}">
            </div>
          </div>
        </div>
      `;

      const stackInput = document.getElementById('modal-card-stack-input');
      const focusInput = document.getElementById('modal-card-focus-input');
      const saveTech = async () => {
        const stack = stackInput?.value.trim() || 'Development';
        const focus = focusInput?.value.trim() || '';
        await saveDoc('captures', capture.id, { stack, focus });
        capture.stack = stack;
        capture.focus = focus;
        await syncActiveDesk('tech', { stack, focus });
      };

      if (stackInput) stackInput.onchange = saveTech;
      if (focusInput) focusInput.onchange = saveTech;
    }
  }

  if (blogLink) {
    if (capture.blogUrl && capture.blogUrl !== capture.sourceUrl) {
      blogLink.href = capture.blogUrl;
      blogLink.style.display = 'inline-flex';
    } else {
      blogLink.style.display = 'none';
    }
  }

  if (sourceLink) {
    if (capture.sourceUrl) {
      sourceLink.href = capture.sourceUrl;
      sourceLink.style.display = 'inline-flex';
    } else {
      sourceLink.style.display = 'none';
    }
  }

  // Render Tier 3 payload if present
  if (tier3El) {
    let payloadHtml = '';
    // Recipe Ingredients with Exact Gram Weights & Checklists
    if (Array.isArray(capture.ingredients) && capture.ingredients.length > 0) {
      payloadHtml += `
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--accent-cyan); margin-bottom: 8px;">🥣 Ingredients (Check to Strike)</div>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 12px;">
          ${capture.ingredients.map(ing => `
            <li class="ingredient-check-item" style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding: 4px 0;">
              <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1;">
                <input type="checkbox" class="ingredient-checkbox">
                <span class="ingredient-label">${escapeHtml(typeof ing === 'string' ? ing : ing.item || '')}</span>
              </label>
              <span style="font-family: var(--font-mono); color: var(--text-primary); font-weight: 600; margin-left: 8px;">${ing.grams ? `${ing.grams}g` : (ing.amount || '')}</span>
            </li>
          `).join('')}
        </ul>
      `;
    }

    // Recipe Steps
    if (Array.isArray(capture.steps) && capture.steps.length > 0) {
      payloadHtml += `
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--accent-cyan); margin-bottom: 8px;">👨‍🍳 Instructions</div>
        <ol style="padding-left: 18px; display: flex; flex-direction: column; gap: 6px; font-size: 0.82rem; color: var(--text-secondary);">
          ${capture.steps.map(step => `<li>${escapeHtml(step)}</li>`).join('')}
        </ol>
      `;
    }

    // Key Insights / Tags
    if (Array.isArray(capture.keyInsights) && capture.keyInsights.length > 0) {
      payloadHtml += `
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--accent-cyan); margin-bottom: 8px;">💡 Key Insights</div>
        <ul style="padding-left: 18px; display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; color: var(--text-secondary);">
          ${capture.keyInsights.map(ins => `<li>${escapeHtml(ins)}</li>`).join('')}
        </ul>
      `;
    }

    if (payloadHtml) {
      tier3El.innerHTML = payloadHtml;
      tier3El.style.display = 'block';
    } else {
      tier3El.style.display = 'none';
    }
  }

  // Wire Modal Delete
  if (deleteBtn) {
    deleteBtn.onclick = async () => {
      const title = capture.title || 'this capture';
      if (confirm(`Permanently delete "${title.slice(0, 40)}"?`)) {
        await deleteDocById('captures', capture.id);
        modal.classList.remove('active');
      }
    };
  }

  modal.classList.add('active');
}

/**
 * Synchronizes capture property changes with active workbench state if currently mounted.
 * 
 * @param {string} deskDomain - Domain ('book', 'recipe', 'game', 'fiber', 'tech').
 * @param {object} patch - Fields to sync to desk state.
 */
async function syncActiveDesk(deskDomain, patch) {
  const deskIdMap = { book: 'reading', recipe: 'kitchen', game: 'gaming', fiber: 'fiber', tech: 'tech' };
  const deskId = deskIdMap[deskDomain] || deskDomain;
  if (state.desks?.[deskId]) {
    await updateDesk(deskId, patch);
  }
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Escapes unsafe HTML characters to prevent XSS.
 * 
 * @purpose HTML sanitization helper for user-generated capture strings.
 * @inputs {string} str - Unsanitized string.
 * @outputs {string} Sanitized string safe for DOM interpolation.
 */
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
