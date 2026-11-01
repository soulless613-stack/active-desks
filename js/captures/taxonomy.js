/**
 * @file taxonomy.js
 * @description Autonomous Adaptive Intelligence Engine for Active Desks v3.0.
 * Implements:
 *   - Rule of 5: Emergent Domain Promotion (detects topics with >= 5 cards, re-topics them via Gemini,
 *     and spins up a dedicated Domain & Workbench).
 *   - Rule of 3: Autonomous Topic Cohesion & Notification (detects 3+ card cluster breakouts,
 *     re-evaluates 1-off strays for genuine semantic fit, writes to Firestore, and notifies user).
 */

import { state, subscribe, setActiveDeskIds, escapeHtml, capitalize, getSetting, callGeminiJson } from '../state.js';
import { saveDoc } from '../firebase.js';

const DISMISSED_PROMOTIONS_KEY = 'active_desks_dismissed_promotions';

/** Active topic evolution event for notification banner */
export let activeTopicEvolutionNotice = null;

/**
 * Clears the active topic evolution notice state so dismissed banners do not reappear.
 * 
 * @purpose Resets activeTopicEvolutionNotice to null upon user dismissal.
 * @inputs None.
 * @outputs {void}
 */
export function clearTopicEvolutionNotice() {
  activeTopicEvolutionNotice = null;
}

/**
 * Initializes the taxonomy scanner and binds reactive state updates.
 * 
 * @purpose Evaluates captures on change to detect emerging domains and topics.
 * @inputs None.
 * @outputs {void}
 */
export function initTaxonomyScanner() {
  subscribe('captures', evaluateRuleOf5);
  subscribe('activeDeskIds', evaluateRuleOf5);
  evaluateRuleOf5();
}

/**
 * Retrieves dismissed promotion identifiers from localStorage.
 * 
 * @returns {Set<string>} Set of "domain::topic" keys.
 */
function getDismissedPromotions() {
  try {
    const raw = localStorage.getItem(DISMISSED_PROMOTIONS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

/**
 * Records a dismissed promotion to localStorage.
 * 
 * @param {string} key - "domain::topic" string.
 */
function recordDismissedPromotion(key) {
  try {
    const set = getDismissedPromotions();
    set.add(key);
    localStorage.setItem(DISMISSED_PROMOTIONS_KEY, JSON.stringify(Array.from(set)));
  } catch (e) {}
}

/**
 * Scans captures and surfaces the Rule of 5 Emergent Domain Promotion banner.
 * Triggers when a topic inside an existing domain reaches >= 5 cards.
 * 
 * @purpose Evaluates topic concentration to suggest spinning off dedicated workbenches.
 * @inputs None.
 * @outputs {void}
 */
export function evaluateRuleOf5() {
  const banner = document.getElementById('desk-suggestion-banner');
  if (!banner) return;

  const captures = state.captures || [];
  const dismissed = getDismissedPromotions();

  // 1. Group captures by domain and topic
  const topicCounts = {};
  for (const c of captures) {
    const domain = (c.domain || 'misc').toLowerCase();
    const topic = (c.topic || '').trim();
    if (!topic) continue;

    const lowerTopic = topic.toLowerCase();
    if (lowerTopic === 'raw thought' || lowerTopic === 'incoming link' || lowerTopic === 'general') {
      continue;
    }

    const key = `${domain}::${lowerTopic}`;
    if (!topicCounts[key]) {
      topicCounts[key] = { domain, rawTopic: topic, count: 0, cards: [] };
    }
    topicCounts[key].count++;
    topicCounts[key].cards.push(c);
  }

  // 2. Find candidate topic with >= 5 cards not yet dismissed
  let candidate = null;
  for (const [key, item] of Object.entries(topicCounts)) {
    if (item.count >= 5 && !dismissed.has(key)) {
      candidate = item;
      break;
    }
  }

  if (!candidate) {
    banner.style.display = 'none';
    banner.innerHTML = '';
    return;
  }

  const { domain, rawTopic, count, cards } = candidate;
  const domainLabel = capitalize(domain);

  banner.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 14px 18px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="font-size: 1.1rem;">✨</span>
          <strong style="font-size: 0.95rem; color: var(--accent-cyan);">Emergent Domain Opportunity: ${escapeHtml(rawTopic)}</strong>
          <span class="brand-badge" style="background: rgba(56, 189, 248, 0.2); color: #38bdf8;">${count} Cards in ${domainLabel}</span>
        </div>
        <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 4px; max-width: 680px; line-height: 1.4;">
          You have ${count} cards in ${domainLabel} centered on <strong>${escapeHtml(rawTopic)}</strong>. Would you like to promote "${escapeHtml(rawTopic)}" into its own top-level Domain with a dedicated Workbench?
        </div>
      </div>
      <div style="display: flex; gap: 8px; align-items: center;">
        <button type="button" id="btn-promote-domain" class="btn-swap-desks" style="background: var(--accent-cyan); color: #090d16; font-weight: 700;">Promote to Domain</button>
        <button type="button" id="btn-dismiss-promotion" class="desk-action-btn">Keep in ${domainLabel}</button>
      </div>
    </div>
  `;
  banner.style.display = 'block';

  // Wire Promote action
  const promoteBtn = document.getElementById('btn-promote-domain');
  if (promoteBtn) {
    promoteBtn.onclick = async () => {
      promoteBtn.disabled = true;
      promoteBtn.textContent = 'Generating Topics...';
      await executeDomainPromotion(domain, rawTopic, cards);
    };
  }

  // Wire Dismiss action
  const dismissBtn = document.getElementById('btn-dismiss-promotion');
  if (dismissBtn) {
    dismissBtn.onclick = () => {
      recordDismissedPromotion(`${domain}::${rawTopic.toLowerCase()}`);
      banner.style.display = 'none';
      banner.innerHTML = '';
    };
  }
}

/**
 * Executes Rule of 5 domain promotion:
 * 1. Prompts Gemini to generate differentiated sub-topics for cards in the new domain.
 * 2. Batch-updates Firestore captures to the new domain with the new sub-topics.
 * 3. Provisions the new workbench document in Firestore.
 * 4. Mounts the workbench or opens the 4-Desk Swapper modal.
 * 
 * @param {string} oldDomain - Originating domain (e.g. 'tech').
 * @param {string} topicName - Promoted topic name (e.g. '3D Printing').
 * @param {Array<object>} cards - List of cards being promoted.
 * @returns {Promise<void>}
 */
export async function executeDomainPromotion(oldDomain, topicName, cards) {
  const newSlug = topicName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-');
  const apiKey = getSetting('gemini_api_key', 'active_desks_gemini_key');

  let subTopicMap = {};
  if (apiKey) {
    try {
      subTopicMap = await generateSubTopicsWithGemini(topicName, cards);
    } catch (err) {
      console.warn('Gemini sub-topic generation failed; using fallback topic names:', err);
    }
  }

  // 1. Batch-update all matching cards in Firestore
  for (const card of cards) {
    const generatedTopic = subTopicMap[card.id] || 'General';
    await saveDoc('captures', card.id, {
      domain: newSlug,
      topic: generatedTopic
    });
  }

  // 2. Provision new workbench record in Firestore
  await saveDoc('desks', newSlug, {
    id: newSlug,
    domain: newSlug,
    title: `${topicName} Workbench`,
    activeCaptureId: cards[0]?.id || 'default',
    lastUpdated: new Date().toISOString()
  });

  // 3. Update active desks (swap into 4th slot if full)
  const currentActive = (state.activeDeskIds || ['reading', 'kitchen', 'gaming', 'fiber']).slice(0, 3);
  currentActive.push(newSlug);
  await setActiveDeskIds(currentActive);

  // 4. Record dismissal of the promotion trigger
  recordDismissedPromotion(`${oldDomain}::${topicName.toLowerCase()}`);

  // 5. Hide banner and set evolution notice in drawer
  const banner = document.getElementById('desk-suggestion-banner');
  if (banner) {
    banner.style.display = 'none';
    banner.innerHTML = '';
  }

  activeTopicEvolutionNotice = {
    domain: newSlug,
    text: `Domain "${topicName}" created with ${cards.length} cards organized into new sub-topics!`,
    cardIds: cards.map(c => c.id)
  };

  alert(`✨ Success! "${topicName}" is now an active Domain and Workbench with dedicated sub-topics.`);
}

/**
 * Calls Gemini to generate differentiated sub-topics for cards moving into an emergent domain.
 * 
 * @param {string} domainTitle - Name of the new domain (e.g. '3D Printing').
 * @param {Array<object>} cards - Cards moving into this domain.
 * @returns {Promise<Record<string, string>>} Map of cardId -> newTopic.
 */
async function generateSubTopicsWithGemini(domainTitle, cards) {
  const cardsSummary = cards.map(c => ({
    id: String(c.id),
    title: c.title || 'Untitled',
    summary: c.summary || ''
  }));

  const prompt = `You are the Adaptive Taxonomy Engine for Active Desks.
The topic "${domainTitle}" has been promoted to its own top-level Domain.
Here are the cards moving into this new domain:
${JSON.stringify(cardsSummary, null, 2)}

Categorize each card into a concise, distinct new sub-topic within "${domainTitle}" (e.g., if the domain is '3D Printing', sub-topics could be 'Slicer Profiles', 'Filaments', 'CAD Modeling', 'Hardware').
Return strictly valid JSON with no markdown formatting:
{
  "cardTopics": [
    { "id": "card_id_string", "newTopic": "Concise Topic Name" }
  ]
}`;

  const parsed = await callGeminiJson(prompt);
  const map = {};
  if (Array.isArray(parsed?.cardTopics)) {
    for (const item of parsed.cardTopics) {
      if (item.id && item.newTopic) {
        map[item.id] = item.newTopic.trim();
      }
    }
  }
  return map;
}

/**
 * Runs the Rule of 3 Topic Cohesion Evaluation on a domain:
 * 1. Collects all cards in the domain.
 * 2. Evaluates cluster breakouts (3+ cards) and re-evaluates 1-off strays for genuine semantic match.
 * 3. Does NOT force consolidation of distinct 1-offs.
 * 4. Autonomously executes the changes in Firestore and surfaces an informative notice for user inspection.
 * 
 * @param {string} domain - Target domain to evaluate ('all' evaluates current active filter or defaults to 'recipe').
 * @returns {Promise<number>} Number of reassignments executed.
 */
export async function runTopicCohesionEvaluation(domain = 'all') {
  const targetDomain = domain === 'all' ? 'recipe' : domain.toLowerCase();
  const apiKey = getSetting('gemini_api_key', 'active_desks_gemini_key');

  if (!apiKey) {
    alert('Please save your Gemini API key in Settings (⚙️) to enable Autonomous Topic Cohesion.');
    return 0;
  }

  const allCaptures = state.captures || [];
  const domainCards = allCaptures.filter(c => (c.domain || 'misc').toLowerCase() === targetDomain && c.status !== 'extracting');

  if (domainCards.length < 3) {
    alert(`Domain "${capitalize(targetDomain)}" has only ${domainCards.length} cards. Minimum 3 cards required to evaluate topic cohesion.`);
    return 0;
  }

  const cardsSummary = domainCards.map(c => ({
    id: String(c.id),
    title: c.title || 'Untitled',
    currentTopic: c.topic || 'General',
    summary: c.summary || ''
  }));

  const prompt = `You are the Adaptive Taxonomy Engine for Active Desks.
Examine the cards in domain "${targetDomain}". Evaluate their topic assignments using the Rule of 3:
1. Cluster Crystallization: If 3 or more cards share a clear, specific sub-genre or focus (e.g., 3 books with LitRPG or Progression Fantasy), assign them to that clear sub-genre topic.
2. 1-Off Stray Re-evaluation: For any card with a unique 1-off topic, determine if it genuinely matches and belongs with other cards in an existing topic. Do NOT force consolidation if the card is conceptually distinct; only reassign if there is a genuine semantic and conceptual fit.
Do not modify cards whose topics are already accurate.

Here is the card list:
${JSON.stringify(cardsSummary, null, 2)}

Return strictly valid JSON with no markdown wrapping:
{
  "changes": [
    {
      "id": "card_id_string",
      "oldTopic": "Previous Topic",
      "newTopic": "New Topic",
      "reason": "Brief reason"
    }
  ]
}`;

  const parsed = await callGeminiJson(prompt);
  const changes = Array.isArray(parsed?.changes) ? parsed.changes : [];

  if (changes.length === 0) {
    alert(`✨ All topics in ${capitalize(targetDomain)} are well-formed and cohesive. Zero changes needed.`);
    return 0;
  }

  // Autonomously execute changes in Firestore
  for (const ch of changes) {
    if (ch.id && ch.newTopic) {
      await saveDoc('captures', ch.id, { topic: ch.newTopic });
    }
  }

  // Format human-readable notification text (rendered by drawer.js finally block)
  const summaryText = changes.length === 1
    ? `1 card re-assigned from "${changes[0].oldTopic}" to "${changes[0].newTopic}"`
    : `${changes.length} cards re-organized into topics: ${[...new Set(changes.map(c => c.newTopic))].join(', ')}`;

  activeTopicEvolutionNotice = {
    domain: targetDomain,
    text: summaryText,
    cardIds: changes.map(ch => ch.id)
  };

  return changes.length;
}
