/**
 * @file kitchen.js
 * @description Kitchen Shelf workbench renderer.
 * Automatically pulls saved recipes from the Universal Captures store.
 */

import { state, updateDesk } from '../state.js';
import { openCaptureDetailModal } from '../captures/drawer.js';

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

  const recipes = Array.isArray(deskData.recipes) && deskData.recipes.length > 0
    ? deskData.recipes
    : [];

  const selectedIdx = Math.max(0, Math.min(recipes.length - 1, deskData.selectedIndex || 0));
  const activeRecipe = recipes[selectedIdx] || {
    title: deskData.title || 'Butter Chicken Mac N Cheese',
    creator: deskData.creator || '',
    summary: 'No recipes saved in captures yet. Drop any recipe reel or blog link into the capture bar!',
    servings: deskData.servings || 4,
    prepTime: deskData.prepTime || '25 mins',
    cookTime: deskData.cookTime || '30 mins'
  };

  const metaText = activeRecipe.creator 
    ? `by ${activeRecipe.creator}` 
    : `${activeRecipe.servings || 4} Servings · ${activeRecipe.prepTime || '20m'} Prep · ${activeRecipe.cookTime || '25m'} Cook`;

  card.innerHTML = `
    <div class="desk-top">
      <span class="desk-badge kitchen">🍳 Kitchen Shelf</span>
      <div style="display: flex; gap: 6px; align-items: center;">
        <span style="font-size: 0.72rem; color: var(--text-muted);">${recipes.length > 0 ? recipes.length + ' Saved' : 'Quick Prep'}</span>
        <button type="button" class="desk-action-btn" data-action="edit-kitchen">✏️ Update</button>
      </div>
    </div>

    <div>
      <h2 class="desk-title">${escapeText(activeRecipe.title)}</h2>
      <div class="desk-meta">${escapeText(metaText)}</div>
    </div>

    <div style="background: rgba(0,0,0,0.25); border-radius: var(--radius-md); padding: 10px;">
      <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.3;">
        ${escapeText(activeRecipe.summary || activeRecipe.highlight || 'Drop a recipe link into the quick-capture bar below.')}
      </div>
    </div>

    <div class="desk-footer">
      ${recipes.length > 1 ? `
        <button type="button" class="desk-action-btn" data-action="cycle-recipe" style="color: #38bdf8;">Next (${selectedIdx + 1}/${recipes.length}) ➔</button>
      ` : `
        <span style="color: var(--accent-recipe); font-weight: 600;">Active Recipe</span>
      `}
      ${activeRecipe.body ? `
        <button type="button" class="desk-link" data-action="view-recipe" style="background: none; border: none; cursor: pointer; font-size: 0.78rem;">Full Recipe ↗</button>
      ` : (activeRecipe.sourceUrl ? `
        <a href="${escapeText(activeRecipe.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="desk-link">Source ↗</a>
      ` : `<span style="color: var(--text-muted); font-size: 0.72rem;">Local DB</span>`)}
    </div>
  `;

  // Attach cycle recipe listener
  const cycleBtn = card.querySelector('[data-action="cycle-recipe"]');
  if (cycleBtn) {
    cycleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nextIdx = (selectedIdx + 1) % recipes.length;
      updateDesk('kitchen', { selectedIndex: nextIdx });
    });
  }

  // Attach full recipe detail viewer
  const viewBtn = card.querySelector('[data-action="view-recipe"]');
  if (viewBtn) {
    viewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCaptureDetailModal(activeRecipe);
    });
  }

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
