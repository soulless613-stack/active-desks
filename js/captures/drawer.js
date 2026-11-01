/**
 * @file drawer.js
 * @description Centered Universal Captures Stream and 3-Tier Detail Modal for Active Desks v3.0.
 * Recreates the centered modal viewport from v1 while retaining Firestore real-time synchronization,
 * dynamic scoped topic sub-filtering, anti-squish pill geometry, autonomous Rule of 3 topic notices,
 * dynamic domain discovery, and scoped detail modal editing.
 */

import {
  state,
  subscribe,
  updateDesk,
  CANONICAL_DESK_MAP,
  escapeHtml,
  capitalize,
  renderExternalLinksHtml
} from '../state.js';
import { deleteDocById, saveDoc } from '../firebase.js';
import { runTopicCohesionEvaluation, activeTopicEvolutionNotice, clearTopicEvolutionNotice } from './taxonomy.js';
import { dispatchExtractionWorker } from './capture-dock.js';

let activeDomainFilter = 'all';
let activeTopicFilter = 'all';
let searchQuery = '';

const EXTRACTION_DURATION_SEC = 180;
const extractionTimers = new Map();
let countdownIntervalId = null;

/**
 * Declarative schema for domain-specific workbench editors inside the 3-tier detail modal.
 */
const MODAL_WORKBENCH_CONFIG = {
  book: {
    type: 'progress',
    domain: 'book',
    heading: '📖 Reading Progress',
    color: 'var(--domain-book)',
    bg: 'rgba(56, 189, 248, 0.05)',
    border: 'rgba(56, 189, 248, 0.2)',
    currentKey: 'currentPage',
    currentLabel: 'Current Page',
    currentInputId: 'modal-card-page-input',
    totalKey: 'totalPages',
    totalLabel: 'Total Pages',
    totalInputId: 'modal-card-total-input',
    steps: [-10, -1, 1, 10]
  },
  fiber: {
    type: 'progress',
    domain: 'fiber',
    heading: '🧶 Fiber WIP Tracker',
    color: 'var(--domain-fiber)',
    bg: 'rgba(236, 72, 153, 0.05)',
    border: 'rgba(236, 72, 153, 0.2)',
    currentKey: 'rows',
    currentLabel: 'Current Rows',
    currentInputId: 'modal-card-rows-input',
    totalKey: 'targetRows',
    totalLabel: 'Target Rows',
    totalInputId: 'modal-card-target-rows-input',
    steps: [-1, 1]
  },
  game: {
    type: 'focus',
    domain: 'game',
    heading: '🎮 Active Quest & Platform',
    color: 'var(--domain-game)',
    bg: 'rgba(168, 85, 247, 0.05)',
    border: 'rgba(168, 85, 247, 0.2)',
    firstKey: 'platform',
    firstLabel: 'Platform',
    firstInputId: 'modal-card-platform-input',
    firstDefault: 'PC',
    secondKey: 'quest',
    secondFallbackKey: 'summary',
    secondLabel: 'Current Quest / Objective',
    secondInputId: 'modal-card-quest-input'
  },
  tech: {
    type: 'focus',
    domain: 'tech',
    heading: '💻 Tech Focus & Stack',
    color: 'var(--domain-tech)',
    bg: 'rgba(16, 185, 129, 0.05)',
    border: 'rgba(16, 185, 129, 0.2)',
    firstKey: 'stack',
    firstFallbackKey: 'topic',
    firstLabel: 'Tech Stack / Tools',
    firstInputId: 'modal-card-stack-input',
    firstDefault: 'Development',
    secondKey: 'focus',
    secondFallbackKey: 'summary',
    secondLabel: 'Current Focus / Sprint Task',
    secondInputId: 'modal-card-focus-input'
  }
};

/**
 * Initializes the centered captures modal, filter pills, search, and detail modal listeners.
 * 
 * @purpose Sets up capture interactions and subscribes to Firestore captures updates.
 * @inputs None.
 * @outputs {void}
 */
export function initCapturesDrawer() {
  const toggleBtn = document.getElementById('btn-toggle-captures');
  const searchInput = document.getElementById('drawer-search-input');
  const tidyBtn = document.getElementById('btn-tidy-topics');

  if (toggleBtn) toggleBtn.addEventListener('click', toggleCapturesModal);

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
      clearTopicEvolutionNotice();
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
    tickExtractionCountdowns();
    return;
  }

  listEl.innerHTML = filtered.map(c => {
    const domain = (c.domain || 'misc').toLowerCase();
    const isExtracting = c.status === 'extracting';
    const idKey = String(c.id);
    if (isExtracting) {
      if (!extractionTimers.has(idKey)) {
        extractionTimers.set(idKey, EXTRACTION_DURATION_SEC);
      }
    } else {
      extractionTimers.delete(idKey);
    }
    const isFallback = !isExtracting && (c.mediaStatus === 'fallback_text' || c.status === 'fallback');
    return `
      <div class="capture-card" data-capture-id="${c.id}">
        <div class="capture-card-header">
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <span class="desk-domain-tag ${domain}">${escapeHtml(domain)}</span>
            ${c.topic ? `<span style="font-size: 0.78rem; color: var(--text-muted); font-weight: 500;">· ${escapeHtml(c.topic)}</span>` : ''}
            ${isExtracting ? `<span class="brand-badge" data-countdown-id="${idKey}" style="background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-color: rgba(251, 191, 36, 0.3); font-family: var(--font-mono);">${formatCountdown(extractionTimers.get(idKey))}</span>` : ''}
          </div>
          <button type="button" class="btn-delete-capture" data-delete-id="${c.id}" title="Delete capture">🗑️</button>
        </div>

        <div class="capture-card-title">${escapeHtml(c.title || 'Untitled Capture')}</div>
        <div class="capture-card-summary" ${isExtracting ? 'style="color: var(--accent-cyan); font-style: italic;"' : ''}>
          ${escapeHtml(c.summary || (isExtracting ? 'Autonomous extraction worker active...' : 'No summary.'))}
        </div>

        ${isFallback ? `
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 10px; border-radius: 6px; background: rgba(245, 158, 11, 0.14); border: 1px solid rgba(245, 158, 11, 0.35); color: #fbbf24; font-size: 0.76rem; font-weight: 600;">
            <span>⚠️ Video Skipped (Text Fallback)</span>
            <button type="button" class="btn-rerun-extraction" data-rerun-id="${c.id}" style="padding: 2px 7px; font-size: 0.72rem;">🔄 Re-run</button>
          </div>
        ` : ''}

        <div class="capture-card-footer">
          <span>${c.creator ? `by ${escapeHtml(c.creator)}` : ''}</span>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${renderExternalLinksHtml(c.blogUrl, c.sourceUrl, true)}
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

  // Wire stream card fallback re-run button
  listEl.querySelectorAll('[data-rerun-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.getAttribute('data-rerun-id');
      const target = allCaptures.find(c => String(c.id) === String(id));
      if (!target || !target.sourceUrl) return;
      extractionTimers.set(String(id), EXTRACTION_DURATION_SEC);
      await saveDoc('captures', id, { status: 'extracting', mediaStatus: null });
      target.status = 'extracting';
      target.mediaStatus = null;
      await dispatchExtractionWorker(id, target.sourceUrl);
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
        extractionTimers.delete(String(id));
        await deleteDocById('captures', id);
      }
    });
  });

  tickExtractionCountdowns();
}

/**
 * Opens and populates the 3-Tier Detail Modal for a capture.
 * 
 * @purpose Displays complete structured payload (ingredients, steps, specs) with domain reassignment & inline topic editing.
 * @inputs {object} capture - Capture record.
 * @inputs {object} [options={}] - Optional display flags (e.g. { isDuplicate: true }).
 * @outputs {void}
 */
export function openCaptureDetailModal(capture, options = {}) {
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

  const fallbackEl = document.getElementById('modal-extraction-fallback-notice');
  if (fallbackEl) {
    if (options.isDuplicate) {
      fallbackEl.style.display = 'flex';
      fallbackEl.className = 'modal-fallback-alert';
      fallbackEl.style.cssText = 'display: flex;';
      fallbackEl.innerHTML = `
        <span>🔁 <strong>Duplicate URL:</strong> This link was already saved. Opened your existing card.</span>
      `;
    } else if (capture.mediaStatus === 'fallback_text' || capture.status === 'fallback') {
      fallbackEl.className = 'modal-fallback-alert';
      fallbackEl.style.cssText = 'display: flex;';
      fallbackEl.innerHTML = `
        <span>⚠️ Video skipped/throttled. Using caption &amp; search grounding.</span>
        <button type="button" class="btn-rerun-extraction">🔄 Re-run</button>
      `;
      const rerunBtn = fallbackEl.querySelector('.btn-rerun-extraction');
      if (rerunBtn) {
        rerunBtn.onclick = async () => {
          extractionTimers.set(String(capture.id), EXTRACTION_DURATION_SEC);
          await saveDoc('captures', capture.id, { status: 'extracting', mediaStatus: null });
          capture.status = 'extracting';
          capture.mediaStatus = null;
          fallbackEl.innerHTML = '<span>⏳ Re-extraction dispatched to cloud runner...</span>';
          await dispatchExtractionWorker(capture.id, capture.sourceUrl);
        };
      }
    } else if (capture.sourceUrl && capture.mediaStatus === 'video_extracted') {
      fallbackEl.className = '';
      fallbackEl.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-size: 0.76rem; font-weight: 600; width: fit-content;';
      fallbackEl.innerHTML = '<span>🎬 Media: Video &amp; Audio Analyzed (720p OCR + Voiceover)</span>';
    } else if (capture.sourceUrl && capture.mediaStatus === 'audio_extracted') {
      fallbackEl.className = '';
      fallbackEl.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: rgba(99, 102, 241, 0.14); border: 1px solid rgba(99, 102, 241, 0.35); color: #a5b4fc; font-size: 0.76rem; font-weight: 600; width: fit-content;';
      fallbackEl.innerHTML = '<span>🎙️ Media: Voiceover Audio Verified</span>';
    } else if (capture.sourceUrl && capture.mediaStatus === 'text_images') {
      fallbackEl.className = '';
      fallbackEl.style.cssText = 'display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); color: #7dd3fc; font-size: 0.76rem; font-weight: 600; width: fit-content;';
      fallbackEl.innerHTML = '<span>📚 Format: Static Text &amp; Images</span>';
    } else {
      fallbackEl.style.display = 'none';
      fallbackEl.innerHTML = '';
    }
  }

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
    
    // Auto-fit height to text content with a solid 76px floor
    const resizeSummary = () => {
      summaryInput.style.height = 'auto';
      summaryInput.style.height = `${Math.max(76, summaryInput.scrollHeight)}px`;
    };
    resizeSummary();
    summaryInput.oninput = resizeSummary;

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
    const wbCfg = MODAL_WORKBENCH_CONFIG[domain];
    if (wbCfg?.type === 'progress') {
      renderModalProgressSection(workbenchFieldsEl, capture, wbCfg);
    } else if (wbCfg?.type === 'focus') {
      renderModalFocusSection(workbenchFieldsEl, capture, wbCfg);
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

    // Domain-Aware Primary List (Recipe Instructions / Recommended Books / Action Steps)
    if (Array.isArray(capture.steps) && capture.steps.length > 0) {
      const stepsHeading = domain === 'book'
        ? '📚 Recommended Books'
        : domain === 'recipe'
          ? '👨‍🍳 Instructions'
          : '🛠️ Steps & Action Items';
      payloadHtml += `
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--accent-cyan); margin-bottom: 8px;">${stepsHeading}</div>
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
 * Renders a 2-column numeric progress tracker section inside the 3-tier detail modal.
 * 
 * @purpose Provides unified current/total numeric inputs and quick steppers for progress-based domains.
 * @inputs {HTMLElement} container - Target DOM mount container.
 * @inputs {object} capture - Active capture record.
 * @inputs {object} cfg - Progress editor configuration from MODAL_WORKBENCH_CONFIG.
 * @outputs {void}
 */
function renderModalProgressSection(container, capture, cfg) {
  const curVal = capture[cfg.currentKey] || 0;
  const totVal = capture[cfg.totalKey] || 100;
  container.innerHTML = `
    <div style="background: ${cfg.bg}; border: 1px solid ${cfg.border}; border-radius: var(--radius-md); padding: 10px 14px;">
      <div style="font-size: 0.75rem; font-weight: 700; color: ${cfg.color}; text-transform: uppercase; margin-bottom: 6px;">${escapeHtml(cfg.heading)}</div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-items: center;">
        <div>
          <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">${escapeHtml(cfg.currentLabel)}</label>
          <input type="number" id="${cfg.currentInputId}" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${curVal}" min="0">
          <div class="btn-stepper-group" style="margin-top: 4px;">
            ${cfg.steps.map(s => `<button type="button" class="btn-stepper-pill modal-progress-step" data-step="${s}">${s > 0 ? `+${s}` : s}</button>`).join('')}
          </div>
        </div>
        <div>
          <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">${escapeHtml(cfg.totalLabel)}</label>
          <input type="number" id="${cfg.totalInputId}" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${totVal}" min="1">
        </div>
      </div>
    </div>
  `;

  const curInput = document.getElementById(cfg.currentInputId);
  const totInput = document.getElementById(cfg.totalInputId);
  const saveProgress = async () => {
    const c = parseInt(curInput?.value || '0', 10);
    const t = parseInt(totInput?.value || '100', 10);
    const patch = { [cfg.currentKey]: c, [cfg.totalKey]: t };
    await saveDoc('captures', capture.id, patch);
    Object.assign(capture, patch);
    await syncActiveDesk(cfg.domain, patch);
  };

  if (curInput) curInput.onchange = saveProgress;
  if (totInput) totInput.onchange = saveProgress;
  container.querySelectorAll('.modal-progress-step').forEach(btn => {
    btn.addEventListener('click', async () => {
      const step = parseInt(btn.getAttribute('data-step') || '0', 10);
      const currentVal = parseInt(curInput?.value || '0', 10);
      if (curInput) curInput.value = Math.max(0, currentVal + step);
      await saveProgress();
    });
  });
}

/**
 * Renders a 2-field text focus editor section inside the 3-tier detail modal.
 * 
 * @purpose Provides unified platform/stack and quest/focus text inputs for focus-based domains.
 * @inputs {HTMLElement} container - Target DOM mount container.
 * @inputs {object} capture - Active capture record.
 * @inputs {object} cfg - Focus editor configuration from MODAL_WORKBENCH_CONFIG.
 * @outputs {void}
 */
function renderModalFocusSection(container, capture, cfg) {
  const firstVal = capture[cfg.firstKey] || (cfg.firstFallbackKey ? capture[cfg.firstFallbackKey] : '') || cfg.firstDefault;
  const secondVal = capture[cfg.secondKey] || (cfg.secondFallbackKey ? capture[cfg.secondFallbackKey] : '') || '';
  container.innerHTML = `
    <div style="background: ${cfg.bg}; border: 1px solid ${cfg.border}; border-radius: var(--radius-md); padding: 10px 14px;">
      <div style="font-size: 0.75rem; font-weight: 700; color: ${cfg.color}; text-transform: uppercase; margin-bottom: 6px;">${escapeHtml(cfg.heading)}</div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <div>
          <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">${escapeHtml(cfg.firstLabel)}</label>
          <input type="text" id="${cfg.firstInputId}" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${escapeHtml(firstVal)}">
        </div>
        <div>
          <label style="font-size: 0.72rem; color: var(--text-muted); display: block; margin-bottom: 2px;">${escapeHtml(cfg.secondLabel)}</label>
          <input type="text" id="${cfg.secondInputId}" class="capture-input" style="width: 100%; padding: 4px 8px; font-size: 0.85rem;" value="${escapeHtml(secondVal)}">
        </div>
      </div>
    </div>
  `;

  const firstInput = document.getElementById(cfg.firstInputId);
  const secondInput = document.getElementById(cfg.secondInputId);
  const saveFocus = async () => {
    const v1 = firstInput?.value.trim() || cfg.firstDefault;
    const v2 = secondInput?.value.trim() || '';
    const patch = { [cfg.firstKey]: v1, [cfg.secondKey]: v2 };
    await saveDoc('captures', capture.id, patch);
    Object.assign(capture, patch);
    await syncActiveDesk(cfg.domain, patch);
  };

  if (firstInput) firstInput.onchange = saveFocus;
  if (secondInput) secondInput.onchange = saveFocus;
}

/**
 * Synchronizes capture property changes with active workbench state if currently mounted.
 * 
 * @param {string} deskDomain - Domain ('book', 'recipe', 'game', 'fiber', 'tech').
 * @param {object} patch - Fields to sync to desk state.
 */
async function syncActiveDesk(deskDomain, patch) {
  const deskId = CANONICAL_DESK_MAP[deskDomain] || deskDomain;
  if (state.desks?.[deskId]) {
    await updateDesk(deskId, patch);
  }
}

/**
 * Formats an ephemeral countdown value (seconds) into M:SS badge text.
 * 
 * @purpose Renders a live 2-minute countdown label while a card is extracting.
 * @inputs {number} [seconds=120] - Remaining seconds.
 * @outputs {string} Formatted badge label.
 */
function formatCountdown(seconds = EXTRACTION_DURATION_SEC) {
  const rem = Math.max(0, seconds);
  const mins = Math.floor(rem / 60);
  const secs = String(rem % 60).padStart(2, '0');
  return `⏳ Extracting · ${mins}:${secs}`;
}

/**
 * Starts or stops the ephemeral 1-second interval updating extracting card countdown badges.
 * 
 * @purpose Decrements active in-memory 2-minute countdown clocks and clears when none remain.
 * @inputs None.
 * @outputs {void}
 */
function tickExtractionCountdowns() {
  const badges = document.querySelectorAll('[data-countdown-id]');
  if (badges.length === 0) {
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId);
      countdownIntervalId = null;
    }
    return;
  }

  if (!countdownIntervalId) {
    countdownIntervalId = setInterval(() => {
      const activeBadges = document.querySelectorAll('[data-countdown-id]');
      if (activeBadges.length === 0) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
        return;
      }
      activeBadges.forEach(el => {
        const id = el.getAttribute('data-countdown-id');
        const nextSec = Math.max(0, (extractionTimers.get(id) ?? EXTRACTION_DURATION_SEC) - 1);
        extractionTimers.set(id, nextSec);
        el.textContent = formatCountdown(nextSec);
      });
    }, 1000);
  }
}
