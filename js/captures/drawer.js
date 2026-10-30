/**
 * @file drawer.js
 * @description Centered Universal Captures Stream and 3-Tier Detail Modal for Active Desks v3.0.
 * Recreates the centered modal viewport from v1 while retaining Firestore real-time synchronization.
 */

import { state, subscribe } from '../state.js';
import { deleteDocById } from '../firebase.js';

let activeDomainFilter = 'all';
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

  // Wire domain filter pills
  const filterPills = document.querySelectorAll('.filter-pill');
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeDomainFilter = pill.getAttribute('data-domain') || 'all';
      renderCapturesList();
    });
  });

  // Wire search input
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = (e.target.value || '').trim().toLowerCase();
      renderCapturesList();
    });
  }

  // Subscribe to captures updates from Firestore
  subscribe('captures', () => {
    updateBadgeCount();
    renderCapturesList();
  });

  updateBadgeCount();
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
 * Updates the counter badge in the centered captures modal.
 */
function updateBadgeCount() {
  const badge = document.getElementById('captures-count-badge');
  if (badge) {
    const count = (state.captures || []).length;
    badge.textContent = `${count} Items`;
  }
}

/**
 * Renders the filtered capture cards inside the modal list.
 */
export function renderCapturesList() {
  const listEl = document.getElementById('drawer-captures-list');
  if (!listEl) return;

  const allCaptures = (state.captures || []).slice().sort((a, b) => {
    const tA = new Date(b.createdAt || b.updatedAt || 0).getTime();
    const tB = new Date(a.createdAt || a.updatedAt || 0).getTime();
    return tA - tB;
  });

  const filtered = allCaptures.filter(c => {
    const domainMatch = activeDomainFilter === 'all' || (c.domain || 'misc').toLowerCase() === activeDomainFilter;
    if (!domainMatch) return false;
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
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="desk-domain-tag ${domain}">${domain}</span>
            ${isExtracting ? `<span class="brand-badge" style="background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-color: rgba(251, 191, 36, 0.3);">⏳ Extracting...</span>` : ''}
          </div>
          <button type="button" class="btn-delete-capture" data-delete-id="${c.id}" title="Delete capture">🗑️</button>
        </div>

        <div class="capture-card-title">${escapeHtml(c.title || 'Untitled Capture')}</div>
        <div class="capture-card-summary" ${isExtracting ? 'style="color: var(--accent-cyan); font-style: italic;"' : ''}>
          ${escapeHtml(c.summary || (isExtracting ? 'Autonomous extraction worker active...' : 'No summary.'))}
        </div>

        <div class="capture-card-footer">
          <span>${c.creator ? `by ${escapeHtml(c.creator)}` : (c.topic || '')}</span>
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
        // Firestore real-time listener will trigger automatic UI re-render!
      }
    });
  });
}

/**
 * Opens and populates the 3-Tier Detail Modal for a capture.
 * 
 * @purpose Displays complete structured payload (ingredients, steps, specs).
 * @inputs {object} capture - Capture record.
 * @outputs {void}
 */
export function openCaptureDetailModal(capture) {
  const modal = document.getElementById('capture-detail-modal');
  if (!modal) return;

  const domain = (capture.domain || 'misc').toLowerCase();
  const domainBadge = document.getElementById('modal-capture-domain-badge');
  const creatorEl = document.getElementById('modal-capture-creator');
  const titleEl = document.getElementById('modal-capture-title');
  const summaryEl = document.getElementById('modal-capture-summary');
  const tier3El = document.getElementById('modal-capture-tier3');
  const sourceLink = document.getElementById('modal-capture-source-link');
  const blogLink = document.getElementById('modal-capture-blog-link');
  const deleteBtn = document.getElementById('btn-modal-delete-capture');

  if (domainBadge) {
    domainBadge.className = `desk-domain-tag ${domain}`;
    domainBadge.textContent = domain;
  }
  if (creatorEl) creatorEl.textContent = capture.creator ? `by ${capture.creator}` : '';
  if (titleEl) titleEl.textContent = capture.title || 'Untitled Capture';
  if (summaryEl) summaryEl.textContent = capture.summary || '';

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
    // Recipe Ingredients with Exact Gram Weights
    if (Array.isArray(capture.ingredients) && capture.ingredients.length > 0) {
      payloadHtml += `
        <div style="font-weight: 700; font-size: 0.85rem; color: var(--accent-cyan); margin-bottom: 8px;">🥣 Ingredients (Exact Grams)</div>
        <ul style="list-style: none; display: flex; flex-direction: column; gap: 4px; font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 12px;">
          ${capture.ingredients.map(ing => `
            <li style="display: flex; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.03); padding: 2px 0;">
              <span>${escapeHtml(typeof ing === 'string' ? ing : ing.item || '')}</span>
              <span style="font-family: var(--font-mono); color: var(--text-primary); font-weight: 600;">${ing.grams ? `${ing.grams}g` : (ing.amount || '')}</span>
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
