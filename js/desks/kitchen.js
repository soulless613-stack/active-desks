/**
 * @file kitchen.js
 * @description Kitchen Shelf workbench renderer for Active Desks v3.0.
 * Cycles through recipe captures with next/prev arrows and opens the 3-tier detail view.
 */

import { state, updateDesk } from '../state.js';
import { openCaptureDetailModal } from '../captures/drawer.js';
import { renderDeskSwitcherHtml } from './desk-manager.js';

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
    id: 'default',
    title: 'No Recipes Saved Yet',
    summary: 'Drop a recipe reel, TikTok, or food blog link into the capture bar!',
    source: ''
  };

  return `
    <div class="desk-card" data-desk-id="kitchen">
      <div class="desk-card-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="desk-domain-tag recipe">Kitchen</span>
          ${renderDeskSwitcherHtml('kitchen', 'recipe', recipe.id, allRecipes, recipe.title || 'Butter Chicken Mac')}
        </div>
        <span style="font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono);">
          ${allRecipes.length > 0 ? `${activeIdx + 1}/${allRecipes.length}` : '0/0'}
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
        <div style="display: flex; gap: 6px; align-items: center;">
          <button type="button" class="desk-action-btn btn-kitchen-prev" ${activeIdx <= 0 ? 'disabled style="opacity: 0.3;"' : ''}>← Prev</button>
          <button type="button" class="desk-action-btn btn-kitchen-next" ${activeIdx >= allRecipes.length - 1 ? 'disabled style="opacity: 0.3;"' : ''}>Next →</button>
          <button type="button" class="desk-action-btn btn-desk-open-card" data-desk="kitchen">📋 Details</button>
        </div>
        <div style="display: flex; gap: 6px; align-items: center;">
          ${recipe.blogUrl && recipe.blogUrl !== recipe.sourceUrl ? `<a href="${recipe.blogUrl}" target="_blank" rel="noopener noreferrer" class="desk-action-btn" style="color: var(--accent-cyan); font-weight: 600;">Blog ↗</a>` : ''}
          ${recipe.sourceUrl || (recipe.source && recipe.source.startsWith('http') ? recipe.source : '') ? `<a href="${recipe.sourceUrl || recipe.source}" target="_blank" rel="noopener noreferrer" class="desk-action-btn">Source ↗</a>` : ''}
        </div>
      </div>
    </div>
  `;
}

/**
 * Binds click events for kitchen navigation and detail modal trigger.
 * 
 * @purpose Handles carousel arrows, dropdown selection, and opens 3-tier recipe modal.
 * @inputs {HTMLElement} root - Desk container.
 * @inputs {object} desk - Kitchen desk state.
 * @outputs {void}
 */
export function bindKitchenEvents(root, desk) {
  const recipeCaptures = (state.captures || []).filter(c => (c.domain || '').toLowerCase() === 'recipe');
  const allRecipes = recipeCaptures.length > 0 ? recipeCaptures : (desk.recipes || []);
  const activeIdx = Math.max(0, Math.min(allRecipes.length - 1, desk.selectedIndex || 0));

  const select = root.querySelector('.desk-item-select[data-desk="kitchen"]');
  if (select) {
    select.addEventListener('change', async (e) => {
      const val = e.target.value;
      const targetIdx = allRecipes.findIndex(r => String(r.id) === String(val));
      if (targetIdx !== -1) {
        await updateDesk('kitchen', { selectedIndex: targetIdx, activeCaptureId: val });
      } else if (val === 'default') {
        await updateDesk('kitchen', { selectedIndex: 0, activeCaptureId: 'default' });
      }
    });
  }

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

  const viewBtn = root.querySelector('.btn-desk-open-card[data-desk="kitchen"]') || root.querySelector('.btn-kitchen-view');
  if (viewBtn) {
    viewBtn.addEventListener('click', () => {
      const activeRecipe = allRecipes[activeIdx];
      if (activeRecipe) {
        openCaptureDetailModal(activeRecipe);
      }
    });
  }
}
