/**
 * @file gaming.js
 * @description Game Rig workbench renderer.
 */

/**
 * Creates the HTML element for the Game Rig card.
 * 
 * @purpose Generates the DOM representation of the gaming desk.
 * @inputs {object} deskData - Gaming desk state slice.
 * @outputs {HTMLElement} The constructed <article> card element.
 * @sideEffects Pure DOM creation.
 */
export function createGamingDeskElement(deskData = {}) {
  const card = document.createElement('article');
  card.className = 'desk-card';
  card.id = 'desk-card-gaming';
  card.setAttribute('aria-label', 'Gaming Rig');

  card.innerHTML = `
    <div class="desk-top">
      <span class="desk-badge gaming">🎮 Game Rig</span>
      <div style="display: flex; gap: 6px; align-items: center;">
        <span style="font-size: 0.72rem; padding: 2px 6px; border-radius: var(--radius-sm); background: rgba(255,255,255,0.06); color: var(--text-secondary);">${escapeText(deskData.platform || 'PC')}</span>
        <button type="button" class="desk-action-btn" data-action="edit-gaming">✏️ Update</button>
      </div>
    </div>

    <div>
      <h2 class="desk-title">${escapeText(deskData.title || 'Active Playthrough')}</h2>
      <div class="desk-meta">Active Quest Focus</div>
    </div>

    <div style="background: rgba(0,0,0,0.25); border-radius: var(--radius-md); padding: 10px; display: flex; gap: 8px;">
      <span style="font-size: 1.1rem;">⚔️</span>
      <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3;">
        ${escapeText(deskData.quest || 'No active quest goal set.')}
      </div>
    </div>

    <div class="desk-footer" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <a href="${escapeText(deskData.linkUrl || '#')}" target="_blank" rel="noopener noreferrer" class="desk-link" style="color: #38bdf8;">
        <span>${escapeText(deskData.linkText || 'Game Wiki')}</span> ↗
      </a>
      <button type="button" class="desk-action-btn" data-action="view-gaming-details" style="font-size: 0.76rem; padding: 4px 10px;">🔍 Notes & Details</button>
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
