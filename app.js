/**
 * Active Desks - Mobile-First PWA State & UI Engine
 */

const STORAGE_KEY = 'active_desks_data_v1';

// Default State loaded with user's real context & recipes
const DEFAULT_STATE = {
  date: new Date().toISOString().split('T')[0],
  buckets: {
    home: { name: 'Home Anchor', sub: 'Family event & chores', checked: false },
    body: { name: 'Body Anchor', sub: 'Walk, stretch, or gym', checked: false },
    spark: { name: 'Spark Anchor', sub: 'Breakfast audiobook & hobbies', checked: false }
  },
  desks: {
    fiber: {
      name: 'Autumn Cardigan',
      type: 'Knitting WIP',
      rows: 44,
      specs: 'US 7 (4.5mm) • DK Weight',
      linkText: 'Open Ravelry',
      linkUrl: 'https://www.ravelry.com'
    },
    recipe: {
      selectedIndex: 0,
      recipes: [
        {
          id: 'butter-chicken-mac',
          title: "Butter Chicken Mac N’ Cheese",
          source: "Tom Walsh (@stealth_health_life)",
          url: "https://www.instagram.com/reel/Da_Eq6axAzl/",
          yield: "10 Servings (Meal Prep)",
          calories: "545 kcal",
          protein: "42g",
          carbs: "58g",
          fat: "17g",
          highlight: "Slow cooker chicken base folded into high-protein Greek yogurt & cheddar mac.",
          ingredients: [
            "900g (32 oz) chicken breast, diced",
            "2 yellow onions, diced & sautéed until browned",
            "30g (2 tbsp) butter",
            "30g (2 tbsp) tomato paste & 30g garlic paste",
            "15g (1 tbsp) ginger paste",
            "400g (14 oz) fire-roasted tomatoes (blended)",
            "15g (1 tbsp) sweetener / sugar",
            "Spice blend: 2 tbsp paprika, 1 tbsp chili powder, 1 tbsp curry, 2 tsp cumin, 1 tbsp salt",
            "672g shell pasta (boiled to 50% box time)",
            "1 cup reserved starchy pasta water",
            "400g plain 0% Greek yogurt (FAGE)",
            "120g 1/3-fat cream cheese",
            "227g extra sharp cheddar + 80g mozzarella",
            "1 tsp garam masala + fresh cilantro & green onions"
          ],
          steps: [
            "Sauté onions until browned, then add to slow cooker with chicken, butter, tomato paste, garlic, ginger, and blended fire-roasted tomatoes.",
            "Stir in the spice blend. Cook on HIGH for 2–3 hours or LOW for 3–4 hours.",
            "Boil pasta shells for only half of the package time; reserve 1 cup pasta water before draining.",
            "Shred cooked chicken in the sauce. Stir in pasta water, Greek yogurt, cream cheese, cheddar, mozzarella, and garam masala until creamy.",
            "Fold in pasta and fresh herbs. Rest 10 minutes to absorb sauce, then divide into 10 containers!"
          ]
        },
        {
          id: 'crispy-potato-meatballs',
          title: "Crispy Potato Meatballs (كرات البطاطا)",
          source: "Abir El Saghir (@abiresag)",
          url: "https://www.instagram.com/reel/DbLqdYjI2-U/",
          yield: "Appetizer / Dinner",
          calories: "Crispy & Savory",
          protein: "Spiced Beef",
          carbs: "Potato Dough",
          fat: "Golden Fried",
          highlight: "Turmeric potato dough stuffed with spiced ground beef and deep fried until golden.",
          ingredients: [
            "3 large potatoes, boiled and mashed smooth",
            "1 cup cornstarch",
            "1 tbsp turmeric & 1 tsp garlic powder",
            "1 tbsp salt",
            "½ kg (~1.1 lbs) ground beef",
            "2 onions, finely chopped",
            "1 cup chopped fresh parsley",
            "1 tsp paprika, 1 tsp mixed 7-spices, 1 tsp cinnamon",
            "Cooking oil for sautéing & deep frying"
          ],
          steps: [
            "Sauté chopped onions and ground beef until browned. Season with salt, paprika, mixed spices, and cinnamon. Stir in fresh parsley and let cool.",
            "Mash boiled potatoes thoroughly while warm. Knead in cornstarch, turmeric, garlic powder, and salt into a smooth dough.",
            "Flatten a ball of potato dough in your palm, add a spoonful of spiced meat, and seal into a smooth ball.",
            "Deep fry in hot oil (350°F / 175°C) for 4–5 minutes until golden and crackly crispy. Drain and serve hot!"
          ]
        }
      ]
    },
    reading: {
      title: "Dune Messiah",
      author: "Frank Herbert",
      format: "Audiobook (Breakfast routine)",
      currentChapter: 8,
      totalChapters: 24,
      linkText: "Open Audiobook",
      linkUrl: "https://www.audible.com"
    },
    gaming: {
      title: "Baldur's Gate 3",
      platform: "PC / Steam",
      quest: "Underdark: Forge the Adamantine armor & find Grymforge secrets.",
      linkText: "View Quest Wiki",
      linkUrl: "https://bg3.wiki"
    }
  },
  captures: [
    { id: 1, text: "Check yarn stash for 4.5mm circular needles with 32-inch cord", time: "Sep 12" },
    { id: 2, text: "Buy extra FAGE Greek yogurt and sharp cheddar for meal prep", time: "Sep 12" }
  ]
};

// State Store
let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Auto-reset 3-buckets if day changed, without guilt
      const today = new Date().toISOString().split('T')[0];
      if (parsed.date !== today) {
        parsed.date = today;
        parsed.buckets.home.checked = false;
        parsed.buckets.body.checked = false;
        parsed.buckets.spark.checked = false;
      }
      return parsed;
    }
  } catch (e) {
    console.error("Failed to load state", e);
  }
  return JSON.parse(JSON.stringify(DEFAULT_STATE));
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  render();
  triggerSyncIndicator();
}

function triggerSyncIndicator() {
  const dot = document.querySelector('.sync-dot');
  const text = document.querySelector('.sync-text');
  if (dot && text) {
    dot.className = 'sync-dot syncing';
    text.textContent = 'Saving...';
    setTimeout(() => {
      dot.className = 'sync-dot';
      text.textContent = 'Synced';
    }, 400);
  }
}

// Format today's date for display
function getFormattedDate() {
  const options = { weekday: 'short', month: 'short', day: 'numeric' };
  return new Date().toLocaleDateString(undefined, options);
}

// ==========================================================================
// RENDER UI
// ==========================================================================
function render() {
  // Update Date
  const dateEl = document.getElementById('current-date');
  if (dateEl) dateEl.textContent = getFormattedDate();

  // 1. Render 3-Bucket Banner
  renderBuckets();

  // 2. Render Desks
  renderFiberDesk();
  renderRecipeDesk();
  renderReadingDesk();
  renderGamingDesk();

  // 3. Render Captures
  renderCaptures();
}

function renderBuckets() {
  const b = state.buckets;
  const count = [b.home.checked, b.body.checked, b.spark.checked].filter(Boolean).length;
  
  const statusEl = document.getElementById('bucket-status-tag');
  if (statusEl) {
    statusEl.textContent = count === 3 ? '🎉 3/3 Perfect Day!' : `${count}/3 Anchors Done`;
    statusEl.className = count === 3 ? 'bucket-status-tag complete' : 'bucket-status-tag';
  }

  const setCard = (id, key, cls) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = `bucket-card ${cls} ${b[key].checked ? 'checked' : ''}`;
    const indicator = el.querySelector('.bucket-check-indicator');
    if (indicator) indicator.textContent = b[key].checked ? '✓' : '';
  };

  setCard('bucket-home', 'home', 'home');
  setCard('bucket-body', 'body', 'body');
  setCard('bucket-spark', 'spark', 'spark');
}

function toggleBucket(key) {
  state.buckets[key].checked = !state.buckets[key].checked;
  saveState();
}

// --------------------------------------------------------------------------
// Fiber Arts Desk
// --------------------------------------------------------------------------
function renderFiberDesk() {
  const f = state.desks.fiber;
  document.getElementById('fiber-title').textContent = f.name;
  document.getElementById('fiber-type').textContent = f.type;
  document.getElementById('fiber-specs').textContent = f.specs;
  document.getElementById('fiber-rows').textContent = f.rows;
  
  const link = document.getElementById('fiber-link');
  if (link) {
    link.textContent = f.linkText || 'Open Pattern';
    link.href = f.linkUrl || '#';
  }
}

function changeRows(delta) {
  state.desks.fiber.rows = Math.max(0, state.desks.fiber.rows + delta);
  saveState();
}

// --------------------------------------------------------------------------
// Recipes Shelf Desk
// --------------------------------------------------------------------------
function renderRecipeDesk() {
  const rState = state.desks.recipe;
  const activeRecipe = rState.recipes[rState.selectedIndex] || rState.recipes[0];
  
  document.getElementById('recipe-title').textContent = activeRecipe.title;
  document.getElementById('recipe-source').textContent = activeRecipe.source;
  document.getElementById('recipe-highlight').textContent = activeRecipe.highlight;
  
  // Render recipe switcher tabs
  const tabsContainer = document.getElementById('recipe-tabs');
  if (tabsContainer) {
    tabsContainer.innerHTML = rState.recipes.map((rec, idx) => `
      <button class="recipe-tab ${idx === rState.selectedIndex ? 'active' : ''}" onclick="selectRecipe(${idx})">
        ${rec.title.split(' ')[0]} ${rec.title.split(' ')[1] || ''}
      </button>
    `).join('');
  }
}

function selectRecipe(index) {
  state.desks.recipe.selectedIndex = index;
  saveState();
}

function openRecipeModal() {
  const rState = state.desks.recipe;
  const rec = rState.recipes[rState.selectedIndex] || rState.recipes[0];
  
  document.getElementById('modal-recipe-title').textContent = rec.title;
  document.getElementById('modal-recipe-source').textContent = rec.source;
  document.getElementById('modal-recipe-link').href = rec.url;
  
  // Render nutrition / stats
  const statsContainer = document.getElementById('modal-recipe-stats');
  statsContainer.innerHTML = `
    <span class="recipe-stat-badge">🍽️ ${rec.yield}</span>
    <span class="recipe-stat-badge">🔥 ${rec.calories}</span>
    <span class="recipe-stat-badge">🥩 ${rec.protein}</span>
    <span class="recipe-stat-badge">🥖 ${rec.carbs}</span>
    <span class="recipe-stat-badge">🥑 ${rec.fat}</span>
  `;

  // Render Ingredients with interactive checkboxes
  const ingContainer = document.getElementById('modal-recipe-ingredients');
  ingContainer.innerHTML = rec.ingredients.map((ing, i) => `
    <label class="ingredient-item" onclick="toggleIngredientCheck(this)">
      <input type="checkbox">
      <span>${ing}</span>
    </label>
  `).join('');

  // Render Steps
  const stepsContainer = document.getElementById('modal-recipe-steps');
  stepsContainer.innerHTML = rec.steps.map((step, i) => `
    <div class="instruction-step">
      <div class="step-num">${i + 1}</div>
      <div>${step}</div>
    </div>
  `).join('');

  document.getElementById('recipe-modal').classList.add('active');
}

function toggleIngredientCheck(labelEl) {
  const checkbox = labelEl.querySelector('input[type="checkbox"]');
  labelEl.classList.toggle('checked', checkbox.checked);
}

// --------------------------------------------------------------------------
// Reading Nook Desk
// --------------------------------------------------------------------------
function renderReadingDesk() {
  const b = state.desks.reading;
  document.getElementById('reading-title').textContent = b.title;
  document.getElementById('reading-author').textContent = `by ${b.author}`;
  document.getElementById('reading-format').textContent = b.format;
  
  const pct = Math.min(100, Math.round((b.currentChapter / b.totalChapters) * 100));
  document.getElementById('reading-progress-label').textContent = `Ch. ${b.currentChapter} of ${b.totalChapters} (${pct}%)`;
  document.getElementById('reading-progress-bar').style.width = `${pct}%`;
  
  const link = document.getElementById('reading-link');
  if (link) {
    link.textContent = b.linkText || 'Open Book';
    link.href = b.linkUrl || '#';
  }
}

function changeChapter(delta) {
  const b = state.desks.reading;
  b.currentChapter = Math.max(1, Math.min(b.totalChapters, b.currentChapter + delta));
  saveState();
}

// --------------------------------------------------------------------------
// Gaming Rig Desk
// --------------------------------------------------------------------------
function renderGamingDesk() {
  const g = state.desks.gaming;
  document.getElementById('gaming-title').textContent = g.title;
  document.getElementById('gaming-platform').textContent = g.platform;
  document.getElementById('gaming-quest').textContent = g.quest;
  
  const link = document.getElementById('gaming-link');
  if (link) {
    link.textContent = g.linkText || 'Game Wiki';
    link.href = g.linkUrl || '#';
  }
}

// --------------------------------------------------------------------------
// Quick-Capture Brain Dump
// --------------------------------------------------------------------------
function handleQuickCapture(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('quick-capture-input');
  const text = input.value.trim();
  if (!text) return;
  
  state.captures.unshift({
    id: Date.now(),
    text: text,
    time: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  });
  
  input.value = '';
  saveState();
  openBrainDumpModal();
}

function renderCaptures() {
  const list = document.getElementById('captures-list');
  if (!list) return;
  
  if (state.captures.length === 0) {
    list.innerHTML = `<p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px;">No quick thoughts captured yet. Type in the bar below anytime!</p>`;
    return;
  }

  list.innerHTML = state.captures.map(c => `
    <div class="capture-item">
      <span>${c.text}</span>
      <button class="capture-del-btn" onclick="deleteCapture(${c.id})" title="Delete">✕</button>
    </div>
  `).join('');
}

function deleteCapture(id) {
  state.captures = state.captures.filter(c => c.id !== id);
  saveState();
}

function openBrainDumpModal() {
  document.getElementById('brain-dump-modal').classList.add('active');
}

// --------------------------------------------------------------------------
// Sync / Pair Devices Modal
// --------------------------------------------------------------------------
function openSyncModal() {
  document.getElementById('sync-modal').classList.add('active');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('active');
}

// Close modals on backdrop click
window.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.log('SW registration note: PWA active in standalone mode', err);
    });
  });
}

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  render();
});
