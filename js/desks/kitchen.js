/**
 * @file kitchen.js
 * @description Kitchen Shelf workbench renderer.
 */

/**
 * Creates the HTML element for the Kitchen Shelf card.
 * 
 * @purpose Generates the DOM representation of the kitchen desk.
 * @inputs {object} deskData - Kitchen desk state slice.
 * @outputs {HTMLElement} The constructed <article> card element.
 * @sideEffects Pure DOM creation.
 */
export function createKitchenDeskElement(deskData = {}) {
  const card = document.createElement('article');
  card.className = 'desk-card';
  card.id = 'desk-card-kitchen';
  card.setAttribute('aria-label', 'Kitchen Shelf');

  const recipes = Array.isArray(deskData.recipes) ? deskData.recipes : [];
  const selectedIdx = Math.max(0, Math.min(recipes.length - 1, deskData.selectedIndex || 0));
  const activeRecipe = recipes[selectedIdx] || { title: 'No recipes saved yet', source: '', highlight: '' };

  card.innerHTML = `
    <div class="desk-top">
      <span class="desk-badge kitchen">🍳 Kitchen Shelf</span>
      <span style="font-size: 0.72rem; color: var(--text-muted);">${recipes.length} Saved</span>
    </div>

    <div>
      <h2 class="desk-title">${escapeText(activeRecipe.title)}</h2>
      <div class="desk-meta">${escapeText(activeRecipe.source || 'Meal Prep / Recipe')}</div>
    </div>

    <div style="background: rgba(0,0,0,0.25); border-radius: var(--radius-md); padding: 10px;">
      <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3;">
        ${escapeText(activeRecipe.highlight || 'Select or queue recipes from the capture stream.')}
      </div>
    </div>

    <div class="desk-footer">
      <span style="color: var(--accent-recipe); font-weight: 600;">Saved Recipe</span>
      <span style="color: var(--text-muted); font-size: 0.72rem;">Local DB</span>
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
