/**
 * @file tech.js
 * @description Tech Workbench renderer (3D Printing, CAD, AI Harnesses & Dev Tools).
 */

/**
 * Creates the HTML element for the Tech Workbench card.
 * 
 * @purpose Generates the DOM representation of the tech workbench.
 * @inputs {object} deskData - Tech desk state slice.
 * @outputs {HTMLElement} The constructed <article> card element.
 * @sideEffects Pure DOM creation.
 */
export function createTechDeskElement(deskData = {}) {
  const card = document.createElement('article');
  card.className = 'desk-card';
  card.id = 'desk-card-tech';
  card.setAttribute('aria-label', 'Tech Workbench');

  card.innerHTML = `
    <div class="desk-top">
      <span class="desk-badge tech">💻 Tech Workbench</span>
      <button type="button" class="desk-action-btn" data-action="edit-tech">✏️ Update</button>
    </div>

    <div>
      <h2 class="desk-title">${escapeText(deskData.title || 'Tech Workbench')}</h2>
      <div class="desk-meta">${escapeText(deskData.stack || '3D Printing & Dev')}</div>
    </div>

    <div style="background: rgba(0,0,0,0.25); border-radius: var(--radius-md); padding: 10px; display: flex; gap: 8px;">
      <span style="font-size: 1.1rem;">🛠️</span>
      <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3;">
        ${escapeText(deskData.focus || 'Active technical build or print goal.')}
      </div>
    </div>

    <div class="desk-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <a href="${escapeText(deskData.linkUrl || 'https://github.com')}" target="_blank" rel="noopener noreferrer" class="desk-link" style="color: #38bdf8;">
        <span>${escapeText(deskData.linkText || 'Tool Link')}</span> ↗
      </a>
      <button type="button" class="desk-action-btn" data-action="view-tech-details" style="font-size: 0.76rem; padding: 4px 10px;">🔍 Notes & Details</button>
    </div>
  `;

  return card;
}

function escapeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
