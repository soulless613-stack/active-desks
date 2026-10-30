/**
 * @file taxonomy.js
 * @description Emergent workbench evolution engine for Active Desks v3.0.
 * Enforces the "Rule of 5": surfaces automated workbench suggestions when a domain
 * accumulates 5+ captures without having an active workbench slot.
 */

import { state, subscribe, setActiveDeskIds } from '../state.js';

/**
 * Initializes the taxonomy scanner and binds reactive state updates.
 * 
 * @purpose Evaluates captures on change to detect emerging workbench clusters.
 * @inputs None.
 * @outputs {void}
 */
export function initTaxonomyScanner() {
  subscribe('captures', evaluateEmergentDesks);
  subscribe('activeDeskIds', evaluateEmergentDesks);
  evaluateEmergentDesks();
}

/**
 * Scans captures and renders the suggestion banner if the Rule of 5 is met.
 * 
 * @purpose Surfaces smart suggestions to the user without intrusive popups.
 * @inputs None.
 * @outputs {void}
 */
export function evaluateEmergentDesks() {
  const banner = document.getElementById('desk-suggestion-banner');
  if (!banner) return;

  const captures = state.captures || [];
  const activeIds = new Set(state.activeDeskIds || []);

  // Count captures by domain
  const counts = {};
  for (const c of captures) {
    const domain = (c.domain || 'misc').toLowerCase();
    counts[domain] = (counts[domain] || 0) + 1;
  }

  // Find candidate domain: count >= 5 and NOT currently in activeDeskIds
  let candidateDomain = null;
  for (const [domain, count] of Object.entries(counts)) {
    if (count >= 5 && domain !== 'misc' && !activeIds.has(domain)) {
      candidateDomain = domain;
      break;
    }
  }

  if (!candidateDomain) {
    banner.style.display = 'none';
    return;
  }

  const count = counts[candidateDomain];
  banner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div>
        <div style="font-weight: 700; font-size: 0.95rem; color: var(--accent-cyan);">
          ✨ Emergent Workbench Opportunity: ${capitalize(candidateDomain)}
        </div>
        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 2px;">
          You have ${count} ${candidateDomain} captures in your inbox. Would you like to activate the ${capitalize(candidateDomain)} Workbench?
        </div>
      </div>
      <div style="display: flex; gap: 8px;">
        <button type="button" id="btn-activate-emergent" class="btn-swap-desks" style="background: var(--accent-cyan); color: #090d16; font-weight: 700;">Activate Desk</button>
        <button type="button" id="btn-dismiss-emergent" class="desk-action-btn">Dismiss</button>
      </div>
    </div>
  `;
  banner.style.display = 'block';

  // Wire buttons
  const activateBtn = document.getElementById('btn-activate-emergent');
  const dismissBtn = document.getElementById('btn-dismiss-emergent');

  if (activateBtn) {
    activateBtn.onclick = async () => {
      // Replace the 4th desk with candidate
      const current = (state.activeDeskIds || []).slice(0, 3);
      current.push(candidateDomain);
      await setActiveDeskIds(current);
      banner.style.display = 'none';
    };
  }

  if (dismissBtn) {
    dismissBtn.onclick = () => {
      banner.style.display = 'none';
    };
  }
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}
