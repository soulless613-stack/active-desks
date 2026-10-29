/**
 * @file drawer.js
 * @description Universal Captures Drawer UI, 2-Tier Filter Navigation, and Detail Modal Renderer.
 * Implements the Universal 3-Tier Schema visual contracts (collection, guide, note).
 */

import * as db from '../db.js';
import { state } from '../state.js';
import { processCaptureIntake } from './intake.js';

let activeDomainFilter = 'all';
let activeTopicFilter = 'all';

/**
 * Opens and renders the captures slide-over drawer.
 */
export async function openCapturesDrawer() {
  const drawer = document.getElementById('captures-drawer');
  if (drawer) {
    drawer.classList.add('active');
    await renderCapturesDrawer();
  }
}

/**
 * Closes the captures slide-over drawer.
 */
export function closeCapturesDrawer() {
  const drawer = document.getElementById('captures-drawer');
  if (drawer) {
    drawer.classList.remove('active');
  }
}

/**
 * Renders the full drawer content (filter pills, topic pills, and card list).
 */
export async function renderCapturesDrawer() {
  const allCaptures = (await db.getAll('captures')).sort((a, b) => (b.id || 0) - (a.id || 0));
  renderFilterPills(allCaptures);
  renderTopicFilterPills(allCaptures);
  renderCaptureCards(allCaptures);
}

/**
 * Renders domain filter pills.
 */
function renderFilterPills(captures) {
  const container = document.getElementById('drawer-filter-bar');
  if (!container) return;

  const counts = { all: captures.length };
  captures.forEach(c => {
    const d = (c.domain || 'misc').toLowerCase();
    counts[d] = (counts[d] || 0) + 1;
  });

  const domains = ['all', ...Object.keys(counts).filter(d => d !== 'all').sort()];

  container.innerHTML = domains.map(d => `
    <button type="button" class="capture-filter-pill ${activeDomainFilter === d ? 'active' : ''}" data-filter="${d}">
      <span>${d === 'all' ? 'All' : getDomainEmoji(d) + ' ' + getDomainLabel(d)}</span>
      <span class="pill-count">${counts[d]}</span>
    </button>
  `).join('');

  container.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeDomainFilter = btn.getAttribute('data-filter');
      activeTopicFilter = 'all';
      renderCapturesDrawer();
    });
  });
}

/**
 * Renders secondary scoped topic filter pills when a specific domain is selected.
 * Only displayed if activeDomainFilter !== 'all' and there are >= 2 distinct topics.
 */
function renderTopicFilterPills(captures) {
  const topicBar = document.getElementById('drawer-topic-filter-bar');
  if (!topicBar) return;

  if (activeDomainFilter === 'all') {
    topicBar.style.display = 'none';
    topicBar.innerHTML = '';
    return;
  }

  const domainCaptures = captures.filter(c => (c.domain || 'misc').toLowerCase() === activeDomainFilter);
  const topicCounts = { all: domainCaptures.length };
  domainCaptures.forEach(c => {
    const t = c.topic || 'General';
    topicCounts[t] = (topicCounts[t] || 0) + 1;
  });

  const distinctTopics = Object.keys(topicCounts).filter(t => t !== 'all');
  if (distinctTopics.length < 2) {
    topicBar.style.display = 'none';
    topicBar.innerHTML = '';
    return;
  }

  topicBar.style.display = 'flex';
  const topics = ['all', ...distinctTopics.sort()];

  topicBar.innerHTML = topics.map(t => `
    <button type="button" class="capture-topic-pill ${activeTopicFilter === t ? 'active' : ''}" data-topic="${escapeText(t)}">
      <span>${t === 'all' ? 'All Topics' : escapeText(t)}</span>
      <span class="pill-count" style="font-size: 0.68rem; opacity: 0.7;">${topicCounts[t]}</span>
    </button>
  `).join('');

  topicBar.querySelectorAll('[data-topic]').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTopicFilter = btn.getAttribute('data-topic');
      renderCapturesDrawer();
    });
  });
}

/**
 * Renders capture cards adhering to Tier 1 metadata and badges.
 */
function renderCaptureCards(captures) {
  const listEl = document.getElementById('drawer-captures-list');
  if (!listEl) return;

  let filtered = activeDomainFilter === 'all'
    ? captures
    : captures.filter(c => (c.domain || 'misc').toLowerCase() === activeDomainFilter);

  if (activeDomainFilter !== 'all' && activeTopicFilter !== 'all') {
    filtered = filtered.filter(c => (c.topic || 'General') === activeTopicFilter);
  }

  if (filtered.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 32px 16px; color: var(--text-muted); font-size: 0.85rem;">
        No captures found under this filter.
      </div>
    `;
    return;
  }

  const hasApiKey = !!state.settings?.gemini_api_key?.trim();

  listEl.innerHTML = filtered.map(c => {
    const domain = (c.domain || 'misc').toLowerCase();
    const topic = c.topic || 'General';
    const isLinkOnly = topic.toLowerCase() === 'link' || domain === 'link' || c.status === 'pending' || c.searchPerformed === false || c.mediaStatus === 'fallback_link';
    const showAnalyze = isLinkOnly && hasApiKey;
    const hasFoundUrl = c.foundUrl && c.foundUrl !== c.sourceUrl;

    // Body format indicator badge
    let formatBadge = '';
    if (c.body?.format === 'collection') {
      formatBadge = `<span class="format-badge">📦 ${c.body.items?.length || 0} Items</span>`;
    } else if (c.body?.format === 'guide') {
      formatBadge = `<span class="format-badge">📋 Guide (${c.body.checklist?.length || 0} items)</span>`;
    }

    return `
      <div class="capture-card" data-capture-id="${c.id}">
        <div class="capture-card-header" style="display: flex; justify-content: space-between; align-items: center;">
          <span class="desk-badge ${domain}">[${capitalize(domain)}] · ${escapeText(topic)}</span>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 0.72rem; color: var(--text-muted);">${formatDate(c.createdAt)}</span>
            <button type="button" class="btn-delete-capture" data-delete-id="${c.id}" style="background: none; border: none; cursor: pointer; padding: 2px 4px; font-size: 0.8rem; color: var(--text-muted); opacity: 0.6; line-height: 1;" title="Delete Capture" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.6'">🗑️</button>
          </div>
        </div>

        <div class="capture-card-title">${escapeText(c.title)}</div>
        <div class="capture-card-summary">${escapeText(c.summary)}</div>

        ${formatBadge}

        <div class="capture-card-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            ${renderMediaStatusBadge(c.mediaStatus)}
            ${showAnalyze ? `<button type="button" class="btn-analyze-inline" data-analyze-id="${c.id}">🔄 Analyze</button>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            ${hasFoundUrl ? `<a href="${escapeText(c.foundUrl)}" target="_blank" rel="noopener noreferrer" class="desk-link" style="color: #38bdf8; font-weight: 600;" onclick="event.stopPropagation()">🌐 Found Page ↗</a>` : ''}
            ${c.sourceUrl ? `<a href="${escapeText(c.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="desk-link" style="color: var(--text-secondary);" onclick="event.stopPropagation()">🔗 Source ↗</a>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach card click handlers for detail modal
  listEl.querySelectorAll('.capture-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = parseInt(card.getAttribute('data-capture-id'), 10);
      const target = captures.find(c => c.id === id);
      if (target) openCaptureDetailModal(target);
    });
  });

  // Attach inline delete click handlers
  listEl.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-delete-id'), 10);
      const target = captures.find(c => c.id === id);
      const title = target?.title || 'this capture';
      if (confirm(`Delete "${title.slice(0, 40)}"?`)) {
        await db.remove('captures', id);
        await renderCapturesDrawer();
      }
    });
  });

  // Attach inline analyze click handlers
  listEl.querySelectorAll('[data-analyze-id]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = parseInt(btn.getAttribute('data-analyze-id'), 10);
      const target = captures.find(c => c.id === id);
      if (!target || !target.sourceUrl) return;

      btn.textContent = '⏳ ...';
      try {
        await processCaptureIntake(target.sourceUrl, target.id);
        await renderCapturesDrawer();
      } catch (err) {
        console.error('Analyze failed:', err);
        btn.textContent = '⚠️ Failed';
        alert('Analysis failed: ' + (err.message || 'Unknown error'));
        setTimeout(() => { btn.textContent = '🔄 Analyze'; }, 3000);
      }
    });
  });
}

/**
 * Opens and renders the 3-Tier Detail Modal for a single capture record.
 */
export function openCaptureDetailModal(capture) {
  const modal = document.getElementById('capture-detail-modal');
  if (!modal) return;

  const domain = (capture.domain || 'misc').toLowerCase();

  // Tier 1 Header
  document.getElementById('modal-capture-domain-badge').className = `desk-badge ${domain}`;
  document.getElementById('modal-capture-domain-badge').textContent = `[${capitalize(domain)}] · ${capture.topic || 'General'}`;
  document.getElementById('modal-capture-title').textContent = capture.title;
  document.getElementById('modal-capture-summary').textContent = capture.summary;

  const creatorEl = document.getElementById('modal-capture-creator');
  if (creatorEl) {
    creatorEl.textContent = capture.creator ? `by ${capture.creator}` : '';
    creatorEl.style.display = capture.creator ? 'block' : 'none';
  }

  // Tier 2 Meta Badges
  const metaContainer = document.getElementById('modal-capture-meta-chips');
  if (metaContainer) {
    const metaArray = Array.isArray(capture.meta) ? capture.meta : [];
    metaContainer.innerHTML = metaArray.map(m => `
      <div class="meta-chip">
        <span class="meta-chip-label">${escapeText(m.label)}:</span>
        <span class="meta-chip-val">${escapeText(m.value)}</span>
      </div>
    `).join('');
  }

  // Tier 3 Adaptive Body Rendering (Strictly 3 formats)
  const bodyContainer = document.getElementById('modal-capture-body-content');
  if (bodyContainer) {
    const body = capture.body || { format: 'note' };

    if (body.format === 'collection') {
      const items = Array.isArray(body.items) ? body.items : [];
      bodyContainer.innerHTML = `
        <div class="modal-section-title">📦 Collection (${items.length} items)</div>
        <div class="collection-items-list">
          ${items.map(it => `
            <div class="collection-item-card">
              <div style="font-weight: 700; font-size: 0.9rem; color: #38bdf8;">${escapeText(it.title)}</div>
              ${it.subtitle ? `<div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 4px;">${escapeText(it.subtitle)}</div>` : ''}
              <div style="font-size: 0.82rem; color: var(--text-secondary);">${escapeText(it.detail)}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else if (body.format === 'guide') {
      const checklist = Array.isArray(body.checklist) ? body.checklist : [];
      const steps = Array.isArray(body.steps) ? body.steps : [];

      bodyContainer.innerHTML = `
        <div class="modal-section-title">🛒 Checklist / Materials</div>
        <div class="guide-checklist">
          ${checklist.map((item, idx) => `
            <label class="guide-check-item">
              <input type="checkbox" ${item.checked ? 'checked' : ''} data-check-idx="${idx}">
              <span>${escapeText(item.text)}</span>
            </label>
          `).join('')}
        </div>

        <div class="modal-section-title" style="margin-top: 16px;">🧑‍🍳 Instructions / Steps</div>
        <div class="guide-steps-list">
          ${steps.map(s => `
            <div class="guide-step-card">
              <div class="guide-step-number">${s.stepNumber}</div>
              <div style="font-size: 0.82rem; color: var(--text-secondary); line-height: 1.4;">${escapeText(s.instruction)}</div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      // Default: note format
      const takeaways = Array.isArray(body.takeaways) ? body.takeaways : [];
      bodyContainer.innerHTML = `
        ${takeaways.length > 0 ? `
          <div class="modal-section-title">✨ Key Takeaways</div>
          <ul class="note-takeaways-list">
            ${takeaways.map(t => `<li>${escapeText(t)}</li>`).join('')}
          </ul>
        ` : ''}
        ${body.highlight ? `
          <div class="note-highlight-card">
            "${escapeText(body.highlight)}"
          </div>
        ` : ''}
      `;
    }
  }

  // Found page / blog button
  const foundBtn = document.getElementById('modal-capture-found-btn');
  if (foundBtn) {
    if (capture.foundUrl && capture.foundUrl !== capture.sourceUrl) {
      foundBtn.href = capture.foundUrl;
      foundBtn.style.display = 'inline-flex';
    } else {
      foundBtn.style.display = 'none';
    }
  }

  // Source link button
  const sourceBtn = document.getElementById('modal-capture-link-btn');
  if (sourceBtn) {
    if (capture.sourceUrl) {
      sourceBtn.href = capture.sourceUrl;
      sourceBtn.style.display = 'inline-flex';
    } else {
      sourceBtn.style.display = 'none';
    }
  }

  // Modal Delete Button
  const modalDeleteBtn = document.getElementById('btn-modal-delete-capture');
  if (modalDeleteBtn) {
    modalDeleteBtn.onclick = async () => {
      const title = capture.title || 'this capture';
      if (confirm(`Permanently delete "${title.slice(0, 40)}"?`)) {
        await db.remove('captures', capture.id);
        modal.classList.remove('active');
        await renderCapturesDrawer();
      }
    };
  }

  modal.classList.add('active');
}

function renderMediaStatusBadge(status) {
  const map = {
    video_extracted: '<span class="status-pill purple">🎬 Video Analyzed</span>',
    audio_extracted: '<span class="status-pill cyan">🎙️ Audio Verified</span>',
    text_images: '<span class="status-pill slate">📚 Text & Images</span>',
    fallback_text: '<span class="status-pill amber">⚠️ Video Skipped</span>',
    fallback_link: '<span class="status-pill amber">📌 Link Only (Unchecked)</span>'
  };
  return map[status] || '<span class="status-pill slate">📌 Note</span>';
}

function getDomainLabel(domain) {
  const map = {
    all: 'All',
    book: 'Books',
    recipe: 'Recipes',
    game: 'Games',
    tech: 'Tech',
    fiber: 'Fiber Arts',
    misc: 'Notes',
    home: 'Home'
  };
  return map[domain] || capitalize(domain);
}

function getDomainEmoji(domain) {
  const map = {
    book: '📚',
    game: '🎮',
    recipe: '🍳',
    fiber: '🧶',
    tech: '💻',
    home: '🏡',
    misc: '💡'
  };
  return map[domain] || '📌';
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  return new Date(isoStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
