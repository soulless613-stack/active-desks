/**
 * @file kitchen.js
 * @description Kitchen Shelf workbench renderer for Active Desks v3.0.
 * Cycles through recipe captures with next/prev arrows and opens the 3-tier detail view.
 */

import { state, updateDesk } from '../state.js';
import { openCaptureDetailModal } from '../captures/drawer.js';

/**
 * Generates the HTML string for the Kitchen workbench card.
 * 
 * @purpose Renders the active recipe card with navigation arrows and details trigger.
 * @inputs {object} desk - Kitchen desk state.
 * @outputs {string} HTML string.
 */
export function renderKitchenDesk(desk) {
  // Aggregate recipes from captures store + seed recipes
  const recipeCaptures = (state.captures || []).filter(c => (c.domain || '').toLowerCase() === 'recipe');
  const allRecipes = recipeCaptures.length > 0 ? recipeCaptures : (desk.recipes || []);
  const activeIdx = Math.max(0, Math.min(allRecipes.length - 1, desk.selectedIndex || 0));
  const recipe = allRecipes[activeIdx] || {
    title: 'No Recipes Saved Yet',
    summary: 'Drop a recipe reel, TikTok, or food blog link into the capture bar!',
    source: ''
  };

  return `
    <div class="desk-card" data-desk-id="kitchen">
      <div class="desk-card-header">
        <span class="desk-domain-tag recipe">Kitchen Shelf</span>
        <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
          ${allRecipes.length > 0 ? `${activeIdx + 1} of ${allRecipes.length}` : 'Empty'}
        </span>
      </div>

      <div>
        <div class="desk-card-title">${recipe.title || 'Untitled Recipe'}</div>
        <div class="desk-card-meta" style="margin-top: 4px;">
          ${recipe.creator || recipe.source ? `<span style="color: var(--accent-cyan);">by ${recipe.creator || recipe.source}</span> · ` : ''}
          ${recipe.summary || recipe.highlight || 'No summary available.'}
        </div>
      </div>

      <div class="desk-card-footer">
        <div style="display: flex; gap: 6px;">
          <button type="button" class="desk-action-btn btn-kitchen-prev" ${activeIdx <= 0 ? 'disabled style="opacity: 0.3;"' : ''}>← Prev</button>
          <button type="button" class="desk-action-btn btn-kitchen-next" ${activeIdx >= allRecipes.length - 1 ? 'disabled style="opacity: 0.3;"' : ''}>Next →</button>
        </div>
        <button type="button" class="desk-action-btn btn-kitchen-view" data-recipe-id="${recipe.id || ''}">📋 View Details</button>
      </div>
    </div>
  `;
}

/**
 * Binds click events for kitchen navigation and detail modal trigger.
 * 
 * @purpose Handles carousel arrows and opens 3-tier recipe modal.
 * @inputs {HTMLElement} root - Desk container.
 * @inputs {object} desk - Kitchen desk state.
 * @outputs {void}
 */
export function bindKitchenEvents(root, desk) {
  const recipeCaptures = (state.captures || []).filter(c => (c.domain || '').toLowerCase() === 'recipe');
  const allRecipes = recipeCaptures.length > 0 ? recipeCaptures : (desk.recipes || []);
  const activeIdx = Math.max(0, Math.min(allRecipes.length - 1, desk.selectedIndex || 0));

  const prevBtn = root.querySelector('.btn-kitchen-prev');
  if (prevBtn && activeIdx > 0) {
    prevBtn.addEventListener('click', async () => {
      await updateDesk('kitchen', { selectedIndex: activeIdx - 1 });
    });
  }

  const nextBtn = root.querySelector('.btn-kitchen-next');
  if (nextBtn && activeIdx < allRecipes.length - 1) {
    nextBtn.addEventListener('click', async () => {
      await updateDesk('kitchen', { selectedIndex: activeIdx + 1 });
    });
  }

  const viewBtn = root.querySelector('.btn-kitchen-view');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      const activeRecipe = allRecipes[activeIdx];
      if (activeRecipe) {
        openCaptureDetailModal(activeRecipe);
      }
    });
  }
}
