/**
 * @file taxonomy.js
 * @description Offline Adaptive Intelligence engine for Active Desks v2.0.
 * Implements:
 *   - Rule of 5: Emergent Desk Evolution Nudge (detects >= 5 items outside active desks)
 *   - Rule of 3: Topic Crystallization heuristics
 */

import * as db from '../db.js';
import { state } from '../state.js';

/**
 * Scans IndexedDB captures for emergent desk evolution opportunities (Rule of 5).
 * 
 * @purpose Evaluates if any unassigned domain reaches >= 5 items to prompt spinning up an active desk.
 * @inputs None. Reads directly from IndexedDB 'captures' and in-memory state.activeDeskIds.
 * @outputs {Promise<{ domain: string, count: number } | null>} Returns emergent candidate or null.
 * @sideEffects Pure calculation; reads from database without mutation.
 */
export async function evaluateRuleOf5() {
  const allCaptures = await db.getAll('captures');
  const activeIds = new Set(state.activeDeskIds || []);

  const countsByDomain = {};

  allCaptures.forEach(c => {
    if (!c.domain || c.domain === 'misc' || c.domain === 'link') return;
    const d = c.domain.toLowerCase();

    // Only count domains that are NOT currently in the active 4-workbench concentration
    if (!activeIds.has(d)) {
      countsByDomain[d] = (countsByDomain[d] || 0) + 1;
    }
  });

  for (const [domain, count] of Object.entries(countsByDomain)) {
    if (count >= 5) {
      return { domain, count };
    }
  }

  return null;
}
