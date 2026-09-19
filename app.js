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
        },
        {
          id: 'cheesy-garlic-sourdough-focaccia',
          title: "Cheesy Garlic Sourdough Focaccia",
          source: "Amy Coyne (@amybakesbread)",
          url: "https://www.instagram.com/reel/DE23ak3pGsq/",
          yield: "16 Slices (9x13 Pan / 12\" Skillet)",
          calories: "349 kcal",
          protein: "14g",
          carbs: "33g",
          fat: "17g",
          highlight: "Crispy, bubbly sourdough focaccia loaded with herb-tossed cheddar, mozzarella, jack, parmesan, and bubbling garlic butter.",
          ingredients: [
            "100g bubbly active sourdough starter (or levain)",
            "425g warm water (approx. 1 ¾ cups)",
            "500g bread flour (approx. 3 ½ cups)",
            "13g fine salt (approx. 2 tsp)",
            "150g shredded mozzarella cheese (1 ½ cups)",
            "100g shredded sharp cheddar cheese (1 cup)",
            "100g shredded Monterey Jack cheese (1 cup)",
            "70g shredded parmesan cheese (½ cup)",
            "55g extra virgin olive oil (¼ cup)",
            "35g unsalted butter, melted (2 ½ tbsp)",
            "2 cloves fresh garlic, finely minced",
            "3g garlic powder (1 tsp) + 2g salt (¼ tsp)",
            "4g dried oregano (1 tbsp) + 4g dried basil (1 tbsp)"
          ],
          steps: [
            "Mix Levain & Dough: Whisk active sourdough starter, warm water, salt, and bread flour until a shaggy dough forms. Rest covered for 30 minutes.",
            "Coil Fold #1: With wet hands, reach under dough, stretch upwards and fold under itself 4–6 times. Rest covered for 30 minutes.",
            "Cheese Inclusions (Coil Folds #2–4): Toss cheeses with dried herbs. During Coil Fold #2, gently fold in half the cheese. Perform Coil Folds #3 & #4 at 30-minute intervals.",
            "Bulk Ferment: Cover and rest at ~78°F for 1.5–2 hours until puffy, domed, and aerated (30–40% volume rise).",
            "Garlic Herb Oil & Pan Prep: Whisk olive oil, melted butter, garlic powder, salt, and dried herbs. Coat bottom of a 9x13\" metal pan (or 12\" skillet) with half the garlic butter oil.",
            "Pan Stretch & Second Proof: Transfer dough into pan, gently stretch toward corners, and pour remaining garlic oil on top. Proof at 78–80°F for 3–5 hours until doubled, puffy, and jiggly.",
            "Dimple & Top: Preheat oven to 425°F. Scatter minced fresh garlic and reserved cheese over surface. Dimple deeply with oiled fingers all over.",
            "Bake: Bake at 425°F for 25–30 minutes until golden, crispy, and bubbling (internal temp 200°F). Cool 10 minutes, slice into 16 cheesy squares!"
          ]
        },
        {
          id: 'chocolate-chip-cookie-donut-loaf',
          title: "Chocolate Chip Cookie Donut Loaf",
          source: "Angela Heckler (@obsessedwithcashews)",
          url: "https://www.instagram.com/reel/DcbhSQLNA4N/",
          yield: "10 Slices (9x5\" Pan)",
          calories: "395 kcal",
          protein: "5g",
          carbs: "59g",
          fat: "16g",
          highlight: "Old-fashioned cake donut loaf with soft vanilla crumb, mini chocolate chips, buttery cookie streusel, and crackly glaze.",
          ingredients: [
            "Streusel: 60g (1/2 cup) all-purpose flour",
            "Streusel: 32g (2 tbsp + 1 3/4 tsp) granulated sugar",
            "Streusel: 16g (1 tbsp + 1/2 tsp) light brown sugar",
            "Streusel: 1/4 tsp fine sea salt",
            "Streusel: 45g (3 tbsp + 1/2 tsp) cold butter, cubed",
            "Streusel: 1/4 tsp vanilla bean paste",
            "Streusel: 48g (1/4 cup) mini chocolate chips",
            "Optional: 1 tbsp coarse sanding sugar (for crunchy top)",
            "Batter: 208g (1 3/4 cups) all-purpose flour",
            "Batter: 12g (1 tbsp + 2 1/4 tsp) cornstarch",
            "Batter: 1 1/2 tsp baking powder & 1/4 tsp baking soda",
            "Batter: 3/4 tsp fine sea salt",
            "Donut Spice: 1/4 tsp freshly ground nutmeg",
            "Wet: 175g (7/8 cup) granulated sugar",
            "Wet: 96g (3/8 cup) neutral vegetable oil",
            "Wet: 160g (2/3 cup) plain unsweetened yogurt",
            "Wet: 108g (1/2 cup) whole milk, room temp",
            "Wet: 2 1/2 tsp vanilla bean paste",
            "Wet: 1/2 tsp apple cider vinegar",
            "Inclusions: 100g–120g mini semi-sweet chocolate chips",
            "Glaze: 250g (2 cups) powdered sugar, sifted",
            "Glaze: 60g (1/4 cup) whole milk, warm",
            "Glaze: 1 tsp vanilla bean paste & pinch of salt",
            "Finishing: Flaky Maldon sea salt"
          ],
          steps: [
            "Cut cold butter into flour, sugars, salt, and vanilla until clumpy pea-sized crumbs form. Stir in mini chips and refrigerate.",
            "Whisk sugar, oil, yogurt, milk, vanilla, and cider vinegar until smooth and emulsified.",
            "Sift in flour, cornstarch, baking powder, baking soda, salt, and nutmeg. Whisk gently just until combined, then fold in mini chocolate chips.",
            "Pour into greased, parchment-lined 9x5\" loaf pan. Scatter chilled streusel on top (and coarse sugar if desired).",
            "Bake at 350°F (175°C) for 50–65 mins (tent with foil at 45m). Loaf is done when skewer comes out clean (internal temp ~205°F).",
            "Sprinkle with flaky sea salt immediately. Cool 25 mins in pan, then transfer to rack. Drizzle crackly vanilla glaze over warm loaf!"
          ]
        },
        {
          id: 'savory-pizza-cinnamon-rolls',
          title: "Savory Pizza Cinnamon Rolls",
          source: "Lauren Ketterman (@barefoot.mimosas)",
          url: "https://www.instagram.com/reel/DcjzA-vgND-/",
          yield: "12 Rolls (12\" Skillet / 9x13\" Pan)",
          calories: "285 kcal",
          protein: "12g",
          carbs: "26g",
          fat: "14g",
          highlight: "Fluffy yeast dough rolled with marinara, mozzarella, parmesan, and pepperoni, baked golden and brushed with garlic herb butter.",
          ingredients: [
            "Dough: 360g (3 cups) bread flour or all-purpose flour",
            "Dough: 7g (2 1/4 tsp / 1 packet) active dry or instant yeast",
            "Dough: 240ml (1 cup) warm whole milk (105°F–110°F)",
            "Dough: 25g (2 tbsp) olive oil or melted butter",
            "Dough: 15g (1 tbsp) sugar or honey",
            "Dough: 6g (1 tsp) fine sea salt",
            "Dough Seasoning: 1/2 tsp garlic powder",
            "Dough Seasoning: 1/2 tsp dried oregano",
            "Filling: 180g (3/4 cup) thick pizza sauce or crushed marinara",
            "Filling: 250g (2 1/2 cups) whole milk mozzarella, shredded",
            "Filling: 40g (1/2 cup) grated Parmesan or Romano cheese",
            "Filling: 120g (~40–50 slices) pepperoni, roughly chopped",
            "Filling: 1 tsp Italian herb seasoning",
            "Optional: 1/4 tsp crushed red pepper flakes",
            "Glaze: 30g (2 tbsp) unsalted butter, melted",
            "Glaze: 2 cloves fresh garlic, finely minced",
            "Glaze: 1 tbsp fresh parsley or Italian herbs, chopped",
            "Serving: Warm marinara sauce for dipping"
          ],
          steps: [
            "Mix warm milk, honey, and yeast until frothy. Knead in flour, oil, salt, garlic powder, and oregano into a smooth dough. Rise 60 mins until doubled.",
            "Punch down and roll into a 12x18\" rectangle. Spread pizza sauce, then scatter mozzarella, parmesan, pepperoni, and Italian seasoning.",
            "Roll up tightly into an 18-inch cylinder. Slice into 12 rolls using unflavored floss or a sharp knife.",
            "Arrange in a greased 12\" skillet or 9x13\" pan. Rise 30 mins until puffy.",
            "Brush with garlic herb butter, top with extra mozzarella and pepperoni.",
            "Bake at 375°F (190°C) for 22–28 mins until bubbling and golden. Brush with remaining garlic butter and serve warm!"
          ]
        },
        {
          id: 'glazed-donut-bread-pudding',
          title: "Glazed Donut Bread Pudding",
          source: "12 Tomatoes (@12_tomatoes)",
          url: "https://www.instagram.com/reel/DdRs-Ofj5uI/",
          yield: "12 Servings (9x13\" Dish)",
          calories: "455 kcal",
          protein: "7g",
          carbs: "65g",
          fat: "19g",
          highlight: "Dump-and-bake dessert layering glazed donut holes, evaporated & condensed milk, vanilla cake mix, cinnamon, and butter.",
          ingredients: [
            "24 glazed or old-fashioned donut holes",
            "1 can (12 oz / 354ml) evaporated milk",
            "1 can (14 oz / 396g) sweetened condensed milk",
            "1 box (13.25 oz / 375g) French vanilla cake mix (dry)",
            "2 tsp ground cinnamon",
            "1/2 cup (1 stick / 115g) unsalted butter, cubed into small pats",
            "Optional: Vanilla ice cream or whipped cream (for serving)"
          ],
          steps: [
            "Preheat oven to 350°F (175°C) and lightly grease a 9x13-inch baking dish.",
            "Arrange all 24 donut holes in an even single layer across the bottom of the dish.",
            "Pour the evaporated milk and sweetened condensed milk evenly over the donut holes.",
            "Sprinkle dry French vanilla cake mix evenly across the top, followed by 2 tsp cinnamon.",
            "Distribute cubed butter pats evenly over the cake mix layer.",
            "Bake at 350°F (175°C) for 35–45 minutes until golden brown and bubbly. Rest 10 minutes and serve warm!"
          ]
        }
      ]
    },
    reading: {
      title: "Dune Messiah",
      author: "Frank Herbert",
      currentPage: 8,
      totalPages: 24,
      unit: "chapters",
      storygraphUrl: "https://app.thestorygraph.com/profile/soulless613",
      lastUpdated: new Date().toISOString()
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
  ],
  recipeInbox: []
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

      // Migration for reading state
      if (parsed.desks && parsed.desks.reading) {
        if (!parsed.desks.reading.storygraphUrl) {
          parsed.desks.reading.storygraphUrl = "https://app.thestorygraph.com/profile/soulless613";
        }
        if (parsed.desks.reading.currentPage === undefined) {
          parsed.desks.reading.currentPage = 8;
          parsed.desks.reading.totalPages = 24;
          parsed.desks.reading.unit = "chapters";
        }
      }

      // Sync recipes to ensure newly added default recipes exist in state & updates reflect immediately
      if (parsed.desks && parsed.desks.recipe && Array.isArray(parsed.desks.recipe.recipes)) {
        DEFAULT_STATE.desks.recipe.recipes.forEach(defRecipe => {
          const idx = parsed.desks.recipe.recipes.findIndex(r => r.id === defRecipe.id);
          if (idx === -1) {
            parsed.desks.recipe.recipes.push(defRecipe);
          } else {
            // Refresh recipe fields so ingredient checklist updates reflect immediately in existing storage
            parsed.desks.recipe.recipes[idx] = { ...defRecipe };
          }
        });
      }

      // Ensure recipeInbox exists
      if (!Array.isArray(parsed.recipeInbox)) {
        parsed.recipeInbox = [];
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

  // 3. Render Captures & Recipe Inbox
  renderCaptures();
  renderRecipeInbox();
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
  
  // Render recipe select dropdown options
  const selectEl = document.getElementById('recipe-select');
  if (selectEl) {
    selectEl.innerHTML = rState.recipes.map((rec, idx) => `
      <option value="${idx}" ${idx === rState.selectedIndex ? 'selected' : ''}>
        🍽️ ${rec.title}
      </option>
    `).join('');
    selectEl.value = rState.selectedIndex;
  }

  // Update recipe counts and category
  const pillCount = document.getElementById('recipe-pill-count');
  if (pillCount) pillCount.textContent = `${rState.recipes.length} Saved`;

  const footerCount = document.getElementById('recipe-footer-count');
  if (footerCount) footerCount.textContent = `${rState.recipes.length} recipes saved`;

  const categoryEl = document.getElementById('recipe-category');
  if (categoryEl) {
    categoryEl.textContent = activeRecipe.id.includes('focaccia') ? 'Baking' : (activeRecipe.id.includes('mac') ? 'Slow Cooker' : 'Savory');
  }
}

function selectRecipe(index) {
  state.desks.recipe.selectedIndex = parseInt(index, 10) || 0;
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
// Recipe Inbox & Link Queue
// --------------------------------------------------------------------------
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function openRecipeInboxModal() {
  renderRecipeInbox();
  document.getElementById('recipe-inbox-modal').classList.add('active');
  const urlInput = document.getElementById('inbox-url-input');
  if (urlInput) setTimeout(() => urlInput.focus(), 150);
}

function renderRecipeInbox() {
  const inbox = state.recipeInbox || [];
  const countEl = document.getElementById('inbox-count');
  if (countEl) countEl.textContent = inbox.length;

  const badgeEl = document.getElementById('inbox-pending-badge');
  if (badgeEl) badgeEl.textContent = `${inbox.length} queued`;

  const listEl = document.getElementById('recipe-inbox-list');
  if (!listEl) return;

  if (inbox.length === 0) {
    listEl.innerHTML = `
      <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 0.84rem; background: rgba(15, 23, 42, 0.4); border-radius: var(--radius-sm); border: 1px dashed var(--border-subtle);">
        <span>✨ Inbox is empty!</span><br>
        <span style="font-size: 0.76rem; color: var(--text-secondary); margin-top: 4px; display: inline-block;">
          Paste an Instagram Reel or recipe link above to queue it for batch extraction.
        </span>
      </div>
    `;
    return;
  }

  listEl.innerHTML = inbox.map(item => `
    <div class="inbox-item">
      <div class="inbox-item-content">
        <span class="inbox-item-title">${escapeHtml(item.note || 'Queued Recipe Link')}</span>
        <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="inbox-item-url" title="${escapeHtml(item.url)}">
          🔗 ${escapeHtml(item.url)}
        </a>
      </div>
      <button class="inbox-item-del-btn" onclick="removeQueuedRecipe(${item.id})" title="Remove from queue">✕</button>
    </div>
  `).join('');
}

async function handleQueueRecipe(e) {
  if (e) e.preventDefault();
  const urlInput = document.getElementById('inbox-url-input');
  const noteInput = document.getElementById('inbox-note-input');
  const submitBtn = document.getElementById('inbox-submit-btn');

  const url = urlInput ? urlInput.value.trim() : '';
  const note = noteInput ? noteInput.value.trim() : '';
  if (!url) return;

  if (!state.recipeInbox) state.recipeInbox = [];

  const newItem = {
    id: Date.now(),
    url: url,
    note: note,
    addedAt: new Date().toISOString()
  };

  state.recipeInbox.unshift(newItem);
  saveState();
  renderRecipeInbox();

  if (urlInput) urlInput.value = '';
  if (noteInput) noteInput.value = '';

  showToast('Recipe queued in inbox!', '📥');

  // Sync to GitHub repo if token configured
  const token = localStorage.getItem('active_desks_github_token');
  if (token) {
    const originalText = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>⏳ Syncing Queue...</span>';
    }
    updateHeaderSyncStatus('syncing');
    try {
      await commitRecipeInboxToGithub(state.recipeInbox, token);
      addSyncLog({
        target: 'recipe-inbox.json',
        action: 'commit',
        status: 'success',
        message: `Synced recipe inbox (${state.recipeInbox.length} queued)`
      });
      showToast('Queue synced to GitHub!', '☁️');
      commitSyncLogToGithub(token).catch(() => {});
    } catch (err) {
      console.warn('Could not sync recipe inbox to GitHub:', err);
      addSyncLog({
        target: 'recipe-inbox.json',
        action: 'commit',
        status: 'error',
        message: 'Failed to sync recipe inbox to GitHub',
        details: err.message
      });
      showToast('Recipe queued locally; GitHub sync error', '⚠️');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
      }
      updateHeaderSyncStatus();
    }
  } else {
    addSyncLog({
      target: 'recipe-inbox.json',
      action: 'commit',
      status: 'warning',
      message: 'Recipe queued locally; no GitHub token configured'
    });
  }
}

async function removeQueuedRecipe(id) {
  if (!state.recipeInbox) return;
  state.recipeInbox = state.recipeInbox.filter(item => item.id !== id);
  saveState();
  renderRecipeInbox();
  showToast('Removed from queue', '🗑️');

  const token = localStorage.getItem('active_desks_github_token');
  if (token) {
    updateHeaderSyncStatus('syncing');
    try {
      await commitRecipeInboxToGithub(state.recipeInbox, token);
      addSyncLog({
        target: 'recipe-inbox.json',
        action: 'commit',
        status: 'success',
        message: `Updated recipe queue deletion on GitHub (${state.recipeInbox.length} remaining)`
      });
      commitSyncLogToGithub(token).catch(() => {});
    } catch (err) {
      console.warn('Could not sync queue deletion to GitHub:', err);
      addSyncLog({
        target: 'recipe-inbox.json',
        action: 'commit',
        status: 'error',
        message: 'Failed to sync recipe queue deletion to GitHub',
        details: err.message
      });
    } finally {
      updateHeaderSyncStatus();
    }
  }
}

async function fetchRecipeInboxFromRepo() {
  try {
    const res = await fetch('./recipe-inbox.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        state.recipeInbox = data;
        saveState();
        renderRecipeInbox();
      }
    }
  } catch (e) {
    console.log('Using local recipe inbox (offline or local server)');
  }
}

async function commitRecipeInboxToGithub(inboxData, token, maxRetries = 3) {
  const repo = 'soulless613-stack/active-desks';
  const filePath = 'recipe-inbox.json';
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let currentSha = null;
    try {
      const getRes = await fetch(`${apiUrl}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        currentSha = fileInfo.sha;
      }
    } catch (e) {
      console.warn('Could not fetch recipe-inbox.json SHA', e);
    }

    const jsonString = JSON.stringify(inboxData, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    const putBody = {
      message: `Update recipe inbox (${inboxData.length} pending)`,
      content: base64Content
    };
    if (currentSha) {
      putBody.sha = currentSha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (putRes.ok) {
      return true;
    }

    // If 409 Conflict (SHA collision on rapid updates), wait and retry with fresh SHA
    if (putRes.status === 409 && attempt < maxRetries) {
      console.warn(`GitHub SHA collision (attempt ${attempt + 1}), retrying in ${(attempt + 1) * 800}ms...`);
      await new Promise(r => setTimeout(r, (attempt + 1) * 800));
      continue;
    }

    const errText = await putRes.text();
    throw new Error(`GitHub API ${putRes.status}: ${errText}`);
  }
}

async function syncRecipeInboxManually() {
  const token = localStorage.getItem('active_desks_github_token');
  if (!token) {
    addSyncLog({
      target: 'recipe-inbox.json',
      action: 'commit',
      status: 'warning',
      message: 'Manual recipe sync skipped: no GitHub token configured'
    });
    showToast('GitHub token not set. Open Sync menu to configure.', '⚠️');
    return;
  }
  const syncBtn = document.getElementById('inbox-manual-sync-btn');
  if (syncBtn) syncBtn.textContent = '⏳ Syncing...';
  updateHeaderSyncStatus('syncing');
  try {
    await commitRecipeInboxToGithub(state.recipeInbox || [], token);
    addSyncLog({
      target: 'recipe-inbox.json',
      action: 'commit',
      status: 'success',
      message: `Manually synced recipe inbox (${(state.recipeInbox || []).length} queued) to GitHub`
    });
    showToast('Queue synced to GitHub!', '☁️');
    commitSyncLogToGithub(token).catch(() => {});
  } catch (err) {
    console.error('Manual queue sync failed:', err);
    addSyncLog({
      target: 'recipe-inbox.json',
      action: 'commit',
      status: 'error',
      message: 'Manual recipe queue sync failed',
      details: err.message
    });
    showToast('Sync failed: check connection', '⚠️');
  } finally {
    if (syncBtn) syncBtn.textContent = '🔄 Sync to GitHub';
    updateHeaderSyncStatus();
  }
}


// --------------------------------------------------------------------------
// Reading Nook Desk (Display-Centric & Cross-Device Sync)
// --------------------------------------------------------------------------
function renderReadingDesk() {
  const b = state.desks.reading;
  const titleEl = document.getElementById('reading-title');
  const authorEl = document.getElementById('reading-author');
  const labelEl = document.getElementById('reading-progress-label');
  const barEl = document.getElementById('reading-progress-bar');
  const linkEl = document.getElementById('reading-link');
  const updatedTag = document.getElementById('reading-updated-tag');

  if (titleEl) titleEl.textContent = b.title || 'No Book Selected';
  if (authorEl) authorEl.textContent = b.author ? `by ${b.author}` : 'The StoryGraph';
  
  const total = Math.max(1, b.totalPages || 1);
  const current = Math.max(0, Math.min(total, b.currentPage || 0));
  const pct = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
  const unitLabel = b.unit === 'chapters' ? 'Ch.' : 'Page';

  if (labelEl) {
    labelEl.textContent = `${unitLabel} ${current} of ${total} (${pct}%)`;
  }
  if (barEl) {
    barEl.style.width = `${pct}%`;
  }
  if (linkEl) {
    linkEl.href = b.storygraphUrl || 'https://app.thestorygraph.com/profile/soulless613';
  }
  if (updatedTag && b.lastUpdated) {
    const timeStr = new Date(b.lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    updatedTag.textContent = `Updated ${timeStr}`;
  }
}

// Fetch shared reading data from repository on startup
async function fetchReadingFromRepo() {
  try {
    const res = await fetch('./reading.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        state.desks.reading.title = data.title;
        if (data.author) state.desks.reading.author = data.author;
        if (data.currentPage !== undefined) state.desks.reading.currentPage = data.currentPage;
        if (data.totalPages !== undefined) state.desks.reading.totalPages = data.totalPages;
        if (data.unit) state.desks.reading.unit = data.unit;
        if (data.storygraphUrl) state.desks.reading.storygraphUrl = data.storygraphUrl;
        if (data.lastUpdated) state.desks.reading.lastUpdated = data.lastUpdated;
        saveState();
      }
    }
  } catch (e) {
    console.log('Using local reading state (offline or local server)');
  }
}

// Modal Handlers & Quick Adjustments
function openReadingModal() {
  const b = state.desks.reading;
  document.getElementById('edit-reading-title').value = b.title || '';
  document.getElementById('edit-reading-author').value = b.author || '';
  document.getElementById('edit-reading-current').value = b.currentPage || 0;
  document.getElementById('edit-reading-total').value = b.totalPages || 100;

  // Load saved keys from localStorage
  const geminiKey = localStorage.getItem('active_desks_gemini_key') || '';
  const githubToken = localStorage.getItem('active_desks_github_token') || '';
  const geminiInput = document.getElementById('cfg-gemini-key');
  const githubInput = document.getElementById('cfg-github-token');
  if (geminiInput) geminiInput.value = geminiKey;
  if (githubInput) githubInput.value = githubToken;

  const statusEl = document.getElementById('reading-scan-status');
  if (statusEl) {
    statusEl.textContent = 'Take a screenshot of StoryGraph, tap to auto-extract book & page.';
    statusEl.style.color = 'var(--text-muted)';
  }

  document.getElementById('reading-modal').classList.add('active');
}

function adjustCurrentPage(delta) {
  const curInput = document.getElementById('edit-reading-current');
  const totInput = document.getElementById('edit-reading-total');
  let cur = parseInt(curInput.value, 10) || 0;
  let tot = parseInt(totInput.value, 10) || 100;
  cur = Math.max(0, Math.min(tot, cur + delta));
  curInput.value = cur;
}

function saveApiKeys() {
  const geminiKey = document.getElementById('cfg-gemini-key').value.trim();
  const githubToken = document.getElementById('cfg-github-token').value.trim();
  if (geminiKey) localStorage.setItem('active_desks_gemini_key', geminiKey);
  else localStorage.removeItem('active_desks_gemini_key');
  if (githubToken) localStorage.setItem('active_desks_github_token', githubToken);
  else localStorage.removeItem('active_desks_github_token');
  updateHeaderSyncStatus();
  showToast('API keys saved locally on this device!', '💾');
  if (githubToken) {
    testGitHubConnection();
  }
}

// --------------------------------------------------------------------------
// On-Screen QR Code Device Pairing
// --------------------------------------------------------------------------
function generatePairingUrl() {
  const geminiKey = document.getElementById('cfg-gemini-key')?.value.trim() || localStorage.getItem('active_desks_gemini_key') || '';
  const githubToken = document.getElementById('cfg-github-token')?.value.trim() || localStorage.getItem('active_desks_github_token') || '';

  if (!geminiKey && !githubToken) {
    return null;
  }

  const payload = {
    gemini: geminiKey,
    github: githubToken
  };

  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const base = window.location.origin + window.location.pathname;
  return `${base}#setup=${encoded}`;
}

function showPairingModal() {
  const url = generatePairingUrl();
  if (!url) {
    alert('Please enter at least your Gemini API Key or GitHub Token first before pairing.');
    return;
  }

  const canvas = document.getElementById('qr-canvas');
  if (!canvas) return;

  if (typeof QRious === 'undefined') {
    alert('QR code generator library is still loading. Please try again in a moment.');
    return;
  }

  new QRious({
    element: canvas,
    value: url,
    size: 220,
    level: 'M'
  });

  canvas.dataset.pairingUrl = url;

  // Close any open modals and show QR modal
  closeModal('reading-modal');
  closeModal('sync-modal');
  document.getElementById('qr-pair-modal').classList.add('active');
}

function copyPairingLink() {
  const canvas = document.getElementById('qr-canvas');
  const url = canvas?.dataset?.pairingUrl || generatePairingUrl();
  if (!url) return;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('copy-pair-btn');
      if (btn) {
        const originalText = btn.innerHTML;
        btn.innerHTML = '✅ Copied to Clipboard!';
        setTimeout(() => { btn.innerHTML = originalText; }, 2500);
      }
    }).catch(() => {
      prompt('Copy this setup link:', url);
    });
  } else {
    prompt('Copy this setup link:', url);
  }
}

function showToast(msg, icon = '✨') {
  const toast = document.getElementById('pair-toast');
  const toastMsg = document.getElementById('pair-toast-msg');
  const toastIcon = document.getElementById('pair-toast-icon');
  if (!toast) return;

  if (toastMsg) toastMsg.textContent = msg;
  if (toastIcon) toastIcon.textContent = icon;
  toast.classList.add('active');

  setTimeout(() => {
    toast.classList.remove('active');
  }, 4000);
}

function checkDevicePairingHash() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#setup=')) return;

  try {
    const encoded = hash.replace(/^#setup=/, '');
    const jsonString = decodeURIComponent(escape(atob(encoded)));
    const payload = JSON.parse(jsonString);

    let updated = false;
    if (payload.gemini) {
      localStorage.setItem('active_desks_gemini_key', payload.gemini);
      const cfgGemini = document.getElementById('cfg-gemini-key');
      if (cfgGemini) cfgGemini.value = payload.gemini;
      updated = true;
    }
    if (payload.github) {
      localStorage.setItem('active_desks_github_token', payload.github);
      const cfgGithub = document.getElementById('cfg-github-token');
      if (cfgGithub) cfgGithub.value = payload.github;
      updated = true;
    }

    if (updated) {
      // Clean URL hash so credentials aren't visible or kept in history
      history.replaceState(null, '', window.location.pathname + window.location.search);
      showToast('Device paired successfully! Keys saved locally on this device.', '📱');
    }
  } catch (err) {
    console.error('Error parsing device pairing setup hash:', err);
  }
}


// Option A: Gemini Vision Screenshot Scanning
function triggerScreenshotPicker() {
  const geminiKey = localStorage.getItem('active_desks_gemini_key');
  if (!geminiKey) {
    const entered = prompt('Enter your Google Gemini API Key for screenshot scanning:\n(Free key available at aistudio.google.com/app/api-keys)');
    if (entered && entered.trim()) {
      localStorage.setItem('active_desks_gemini_key', entered.trim());
      const cfgInput = document.getElementById('cfg-gemini-key');
      if (cfgInput) cfgInput.value = entered.trim();
    } else {
      return;
    }
  }
  document.getElementById('reading-screenshot-input').click();
}

async function handleScreenshotUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const btn = document.getElementById('reading-scan-btn');
  const btnText = document.getElementById('reading-scan-btn-text');
  const statusEl = document.getElementById('reading-scan-status');

  if (btn) btn.classList.add('scanning');
  if (btnText) btnText.textContent = 'Analyzing Screenshot...';
  if (statusEl) {
    statusEl.textContent = 'Gemini Vision is extracting book title, author, and progress...';
    statusEl.style.color = 'var(--accent-spark)';
  }

  try {
    const base64Data = await fileToBase64(file);
    const geminiKey = localStorage.getItem('active_desks_gemini_key');

    const promptText = "Examine this screenshot from StoryGraph or a reading app. Extract the currently reading book's details. Return ONLY valid JSON matching this schema: {\"title\": \"string\", \"author\": \"string\", \"currentPage\": number, \"totalPages\": number}. If represented as chapters, provide chapter numbers. Return ONLY valid JSON, no markdown, no explanation.";

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${geminiKey}`;
    const payload = {
      contents: [{
        parts: [
          { text: promptText },
          { inlineData: { mimeType: file.type || 'image/jpeg', data: base64Data } }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json'
      }
    };

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Gemini API error (${res.status}): ${errBody}`);
    }

    const resJson = await res.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(rawText);

    if (parsed) {
      if (parsed.title) document.getElementById('edit-reading-title').value = parsed.title;
      if (parsed.author) document.getElementById('edit-reading-author').value = parsed.author;
      if (parsed.currentPage !== undefined) document.getElementById('edit-reading-current').value = parsed.currentPage;
      if (parsed.totalPages !== undefined) document.getElementById('edit-reading-total').value = parsed.totalPages;

      if (statusEl) {
        statusEl.textContent = `✨ Auto-filled: "${parsed.title}" (Page ${parsed.currentPage} of ${parsed.totalPages})! Review below and tap Save.`;
        statusEl.style.color = 'var(--accent-fiber)';
      }
    }
  } catch (err) {
    console.error('Screenshot scanning error:', err);
    if (statusEl) {
      statusEl.textContent = 'Scan error: ' + err.message + '. You can still adjust manually below.';
      statusEl.style.color = '#ef4444';
    }
  } finally {
    if (btn) btn.classList.remove('scanning');
    if (btnText) btnText.textContent = 'Scan Screenshot (Auto-Fill)';
    event.target.value = '';
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Save locally and commit to GitHub reading.json
async function handleReadingSave(e) {
  if (e) e.preventDefault();

  const title = document.getElementById('edit-reading-title').value.trim();
  const author = document.getElementById('edit-reading-author').value.trim();
  const currentPage = parseInt(document.getElementById('edit-reading-current').value, 10) || 0;
  const totalPages = parseInt(document.getElementById('edit-reading-total').value, 10) || 100;
  const now = new Date().toISOString();

  // 1. Immediate local UI & state update
  state.desks.reading.title = title;
  state.desks.reading.author = author;
  state.desks.reading.currentPage = currentPage;
  state.desks.reading.totalPages = totalPages;
  state.desks.reading.unit = totalPages <= 50 ? 'chapters' : 'pages';
  state.desks.reading.lastUpdated = now;
  saveState();

  const saveBtn = document.getElementById('reading-save-btn');
  const originalText = saveBtn ? saveBtn.innerHTML : '';
  if (saveBtn) saveBtn.innerHTML = '<span>⏳ Syncing to GitHub...</span>';

  // 2. Commit to GitHub repo if token is configured
  const githubToken = localStorage.getItem('active_desks_github_token');
  if (githubToken) {
    updateHeaderSyncStatus('syncing');
    try {
      await commitReadingToGithub({
        title,
        author,
        currentPage,
        totalPages,
        unit: state.desks.reading.unit,
        storygraphUrl: state.desks.reading.storygraphUrl || 'https://app.thestorygraph.com/profile/soulless613',
        lastUpdated: now
      }, githubToken);
      addSyncLog({
        target: 'reading.json',
        action: 'commit',
        status: 'success',
        message: `Synced reading progress: ${title} (${currentPage}/${totalPages} ${state.desks.reading.unit})`
      });
      showToast('Reading synced to GitHub!', '☁️');
      commitSyncLogToGithub(githubToken).catch(() => {});
    } catch (err) {
      console.error('GitHub commit error:', err);
      addSyncLog({
        target: 'reading.json',
        action: 'commit',
        status: 'error',
        message: 'Failed to sync reading progress to GitHub',
        details: err.message
      });
      showToast('Reading saved locally; GitHub sync error', '⚠️');
    } finally {
      updateHeaderSyncStatus();
    }
  } else {
    addSyncLog({
      target: 'reading.json',
      action: 'commit',
      status: 'warning',
      message: 'Reading saved locally; no GitHub token configured'
    });
  }

  if (saveBtn) saveBtn.innerHTML = originalText;
  closeModal('reading-modal');
}

async function commitReadingToGithub(readingData, token) {
  const repo = 'soulless613-stack/active-desks';
  const filePath = 'reading.json';
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  // Step 1: Get current file SHA
  let currentSha = null;
  try {
    const getRes = await fetch(`${apiUrl}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    if (getRes.ok) {
      const fileInfo = await getRes.json();
      currentSha = fileInfo.sha;
    }
  } catch (e) {
    console.warn('Could not fetch existing SHA', e);
  }

  // Step 2: PUT updated file
  const jsonString = JSON.stringify(readingData, null, 2);
  const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

  const putBody = {
    message: `Update reading progress: ${readingData.title} (${readingData.unit} ${readingData.currentPage}/${readingData.totalPages})`,
    content: base64Content
  };
  if (currentSha) {
    putBody.sha = currentSha;
  }

  const putRes = await fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(putBody)
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`GitHub API ${putRes.status}: ${errText}`);
  }
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
// Quick-Capture Brain Dump (Cross-Device GitHub Sync)
// --------------------------------------------------------------------------
async function handleQuickCapture(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('quick-capture-input');
  const text = input.value.trim();
  if (!text) return;
  
  const newCapture = {
    id: Date.now(),
    text: text,
    time: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  };

  state.captures.unshift(newCapture);
  input.value = '';
  saveState();
  openBrainDumpModal();
  showToast('Thought captured!', '💡');

  const token = localStorage.getItem('active_desks_github_token');
  if (token) {
    updateHeaderSyncStatus('syncing');
    try {
      await commitCapturesToGithub(state.captures, token);
      addSyncLog({
        target: 'captures.json',
        action: 'commit',
        status: 'success',
        message: `Synced ${state.captures.length} captured thoughts to GitHub`
      });
      showToast('Thoughts synced to GitHub!', '☁️');
      commitSyncLogToGithub(token).catch(() => {});
    } catch (err) {
      console.warn('Could not sync captures to GitHub:', err);
      addSyncLog({
        target: 'captures.json',
        action: 'commit',
        status: 'error',
        message: 'Failed to sync captured thoughts to GitHub',
        details: err.message
      });
      showToast('Thought saved locally; GitHub sync error', '⚠️');
    } finally {
      updateHeaderSyncStatus();
    }
  } else {
    addSyncLog({
      target: 'captures.json',
      action: 'commit',
      status: 'warning',
      message: 'Thought saved locally; no GitHub token configured'
    });
  }
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

async function deleteCapture(id) {
  state.captures = state.captures.filter(c => c.id !== id);
  saveState();
  renderCaptures();
  showToast('Thought removed', '🗑️');

  const token = localStorage.getItem('active_desks_github_token');
  if (token) {
    updateHeaderSyncStatus('syncing');
    try {
      await commitCapturesToGithub(state.captures, token);
      addSyncLog({
        target: 'captures.json',
        action: 'commit',
        status: 'success',
        message: `Updated captured thoughts on GitHub (${state.captures.length} remaining)`
      });
      commitSyncLogToGithub(token).catch(() => {});
    } catch (err) {
      console.warn('Could not sync capture deletion to GitHub:', err);
      addSyncLog({
        target: 'captures.json',
        action: 'commit',
        status: 'error',
        message: 'Failed to sync capture deletion to GitHub',
        details: err.message
      });
    } finally {
      updateHeaderSyncStatus();
    }
  }
}

function openBrainDumpModal() {
  document.getElementById('brain-dump-modal').classList.add('active');
  fetchCapturesFromRepo();
}

async function fetchCapturesFromRepo() {
  try {
    const res = await fetch('./captures.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        state.captures = data;
        saveState();
        renderCaptures();
      }
    }
  } catch (e) {
    console.log('Using local captures (offline or local server)');
  }
}

async function commitCapturesToGithub(capturesData, token, maxRetries = 3) {
  const repo = 'soulless613-stack/active-desks';
  const filePath = 'captures.json';
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let currentSha = null;
    try {
      const getRes = await fetch(`${apiUrl}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        currentSha = fileInfo.sha;
      }
    } catch (e) {
      console.warn('Could not fetch captures.json SHA', e);
    }

    const jsonString = JSON.stringify(capturesData, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    const putBody = {
      message: `Update captured thoughts (${capturesData.length} items)`,
      content: base64Content
    };
    if (currentSha) {
      putBody.sha = currentSha;
    }

    const putRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(putBody)
    });

    if (putRes.ok) {
      return true;
    }

    if (putRes.status === 409 && attempt < maxRetries) {
      console.warn(`GitHub SHA collision for captures (attempt ${attempt + 1}), retrying in ${(attempt + 1) * 800}ms...`);
      await new Promise(r => setTimeout(r, (attempt + 1) * 800));
      continue;
    }

    const errText = await putRes.text();
    throw new Error(`GitHub API ${putRes.status}: ${errText}`);
  }
}

async function syncCapturesManually() {
  const token = localStorage.getItem('active_desks_github_token');
  if (!token) {
    addSyncLog({
      target: 'captures.json',
      action: 'commit',
      status: 'warning',
      message: 'Manual captures sync skipped: no GitHub token configured'
    });
    showToast('GitHub token not set. Open Sync menu to configure.', '⚠️');
    return;
  }
  const syncBtn = document.getElementById('captures-manual-sync-btn');
  if (syncBtn) syncBtn.textContent = '⏳ Syncing...';
  updateHeaderSyncStatus('syncing');
  try {
    await commitCapturesToGithub(state.captures || [], token);
    addSyncLog({
      target: 'captures.json',
      action: 'commit',
      status: 'success',
      message: `Manually synced ${(state.captures || []).length} captured thoughts to GitHub`
    });
    showToast('Thoughts synced to GitHub!', '☁️');
    commitSyncLogToGithub(token).catch(() => {});
  } catch (err) {
    console.error('Manual captures sync failed:', err);
    addSyncLog({
      target: 'captures.json',
      action: 'commit',
      status: 'error',
      message: 'Manual captures sync failed',
      details: err.message
    });
    showToast('Sync failed: check connection', '⚠️');
  } finally {
    if (syncBtn) syncBtn.textContent = '🔄 Sync to GitHub';
    updateHeaderSyncStatus();
  }
}

// --------------------------------------------------------------------------
// Sync & Error Activity Logging Engine (sync-log.json)
// --------------------------------------------------------------------------
const SYNC_LOG_STORAGE_KEY = 'active_desks_sync_log';

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getSyncLogs() {
  try {
    const raw = localStorage.getItem(SYNC_LOG_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveSyncLogs(logs) {
  try {
    const trimmed = (logs || []).slice(0, 50);
    localStorage.setItem(SYNC_LOG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Could not save sync logs to localStorage', e);
  }
}

function addSyncLog({ target, action, status, message, details = null }) {
  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  const now = new Date();
  const entry = {
    id: Date.now() + Math.random().toString(36).substring(2, 6),
    time: now.toISOString(),
    displayTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    device: isMobile ? 'mobile' : 'desktop',
    target: target || 'system',
    action: action || 'sync',
    status: status || 'info', // 'success', 'error', 'warning', 'info'
    message: message || '',
    details: details ? (typeof details === 'object' ? JSON.stringify(details) : String(details)) : null
  };

  const logs = getSyncLogs();
  logs.unshift(entry);
  saveSyncLogs(logs);

  updateHeaderSyncStatus();
  renderSyncLogs();
  return entry;
}

function updateHeaderSyncStatus(overrideState) {
  const badge = document.getElementById('header-sync-badge');
  const dot = document.getElementById('header-sync-dot');
  const text = document.getElementById('header-sync-text');
  if (!badge || !dot || !text) return;

  badge.classList.remove('syncing', 'error', 'warning');
  dot.classList.remove('syncing', 'error', 'warning', 'offline');

  if (overrideState === 'syncing') {
    badge.classList.add('syncing');
    dot.classList.add('syncing');
    text.textContent = 'Syncing...';
    return;
  }

  if (!navigator.onLine) {
    dot.classList.add('offline');
    text.textContent = 'Offline';
    return;
  }

  const token = localStorage.getItem('active_desks_github_token');
  if (!token) {
    badge.classList.add('warning');
    dot.classList.add('warning');
    text.textContent = 'No Token';
    return;
  }

  const logs = getSyncLogs();
  if (logs.length > 0 && logs[0].status === 'error') {
    badge.classList.add('error');
    dot.classList.add('error');
    text.textContent = 'Sync Error';
    return;
  }

  text.textContent = 'Synced';
}

function renderSyncLogs() {
  const listEl = document.getElementById('sync-log-list');
  const badgeEl = document.getElementById('sync-log-summary-badge');
  if (!listEl) return;

  const logs = getSyncLogs();

  if (badgeEl) {
    const errorCount = logs.filter(l => l.status === 'error').length;
    const token = localStorage.getItem('active_desks_github_token');
    if (!token) {
      badgeEl.style.background = 'rgba(245, 158, 11, 0.15)';
      badgeEl.style.color = '#fbbf24';
      badgeEl.textContent = 'No Token';
    } else if (errorCount > 0) {
      badgeEl.style.background = 'rgba(239, 68, 68, 0.15)';
      badgeEl.style.color = '#f87171';
      badgeEl.textContent = `${errorCount} Error${errorCount === 1 ? '' : 's'}`;
    } else {
      badgeEl.style.background = 'rgba(52, 211, 153, 0.15)';
      badgeEl.style.color = '#34d399';
      badgeEl.textContent = 'All Healthy';
    }
  }

  if (logs.length === 0) {
    listEl.innerHTML = '<div class="sync-log-empty">No sync events recorded yet.</div>';
    return;
  }

  listEl.innerHTML = logs.map(log => `
    <div class="sync-log-entry ${escapeHtml(log.status)}">
      <div class="sync-log-header">
        <div class="sync-log-meta">
          <span class="sync-log-target">${escapeHtml(log.target)}</span>
          <span class="sync-log-time">${escapeHtml(log.displayTime)}</span>
        </div>
        <span class="sync-log-status-pill ${escapeHtml(log.status)}">${escapeHtml(log.status)}</span>
      </div>
      <div class="sync-log-msg">${escapeHtml(log.message)}</div>
      ${log.details ? `<div class="sync-log-details">${escapeHtml(log.details)}</div>` : ''}
    </div>
  `).join('');
}

function clearSyncLogs() {
  saveSyncLogs([]);
  renderSyncLogs();
  updateHeaderSyncStatus();
  showToast('Sync log cleared', '🗑️');
}

function copySyncLogs() {
  const logs = getSyncLogs();
  if (logs.length === 0) {
    showToast('No logs to copy', 'ℹ️');
    return;
  }

  const text = logs.map(l => {
    let line = `[${l.displayTime || l.time}] [${(l.status || 'INFO').toUpperCase()}] [${l.target}] ${l.message}`;
    if (l.details) line += ` | Details: ${l.details}`;
    return line;
  }).join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast('Sync log copied to clipboard!', '📋');
    }).catch(() => {
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast('Sync log copied to clipboard!', '📋');
  } catch (e) {
    showToast('Could not copy log', '⚠️');
  }
  document.body.removeChild(ta);
}

async function testGitHubConnection() {
  const btn = document.getElementById('test-connection-btn');
  const originalText = btn ? btn.textContent : '';
  if (btn) btn.textContent = '⏳ Testing...';

  const token = localStorage.getItem('active_desks_github_token');
  if (!token) {
    addSyncLog({
      target: 'auth',
      action: 'test',
      status: 'error',
      message: 'No GitHub token configured on this device',
      details: 'Save a GitHub Personal Access Token in Reading Settings or pair via QR.'
    });
    showToast('No GitHub token found', '⚠️');
    if (btn) btn.textContent = originalText;
    return;
  }

  try {
    const res = await fetch('https://api.github.com/repos/soulless613-stack/active-desks', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });

    const rateRemaining = res.headers.get('x-ratelimit-remaining');

    if (res.ok) {
      const data = await res.json();
      const pushAccess = data.permissions && data.permissions.push;
      addSyncLog({
        target: 'auth',
        action: 'test',
        status: 'success',
        message: `GitHub token verified! Connected to ${data.full_name}`,
        details: `Write permission: ${pushAccess ? 'YES' : 'NO'}. API calls remaining: ${rateRemaining || 'N/A'}`
      });
      showToast('GitHub token verified!', '✅');
    } else {
      const errText = await res.text();
      addSyncLog({
        target: 'auth',
        action: 'test',
        status: 'error',
        message: `GitHub test failed: HTTP ${res.status}`,
        details: errText.substring(0, 200)
      });
      showToast(`GitHub error: HTTP ${res.status}`, '⚠️');
    }
  } catch (err) {
    addSyncLog({
      target: 'auth',
      action: 'test',
      status: 'error',
      message: 'Network connection failed during GitHub test',
      details: err.message
    });
    showToast('Connection test failed', '⚠️');
  } finally {
    if (btn) btn.textContent = originalText;
  }
}

async function commitSyncLogToGithub(token, maxRetries = 2) {
  if (!token) token = localStorage.getItem('active_desks_github_token');
  if (!token) return false;

  const repo = 'soulless613-stack/active-desks';
  const filePath = 'sync-log.json';
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
  const logs = getSyncLogs();

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let currentSha = null;
    try {
      const getRes = await fetch(`${apiUrl}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if (getRes.ok) {
        const fileInfo = await getRes.json();
        currentSha = fileInfo.sha;
      }
    } catch (e) {
      // Continue without SHA if file doesn't exist yet
    }

    const jsonString = JSON.stringify(logs, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    const putBody = {
      message: `Update sync & error log (${logs.length} events)`,
      content: base64Content
    };
    if (currentSha) {
      putBody.sha = currentSha;
    }

    try {
      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      });

      if (putRes.ok) {
        return true;
      }

      if (putRes.status === 409 && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 800));
        continue;
      }
    } catch (netErr) {
      return false;
    }
  }
  return false;
}

async function flushSyncLogToGithubManual() {
  const token = localStorage.getItem('active_desks_github_token');
  if (!token) {
    showToast('GitHub token not set. Open Sync menu to configure.', '⚠️');
    return;
  }
  const btn = document.getElementById('push-log-btn');
  if (btn) btn.textContent = '⏳ Pushing...';
  try {
    const ok = await commitSyncLogToGithub(token);
    if (ok) {
      showToast('Sync log pushed to GitHub!', '☁️');
    } else {
      showToast('Could not push log to GitHub', '⚠️');
    }
  } catch (err) {
    showToast('Push log failed', '⚠️');
  } finally {
    if (btn) btn.textContent = '☁️ Push Log to GitHub';
  }
}

async function fetchSyncLogFromRepo() {
  try {
    const res = await fetch('./sync-log.json?t=' + Date.now(), { cache: 'no-store' });
    if (res.ok) {
      const remoteLogs = await res.json();
      if (Array.isArray(remoteLogs)) {
        const localLogs = getSyncLogs();
        let changed = false;
        remoteLogs.forEach(r => {
          if (!localLogs.some(l => l.id === r.id || (l.time === r.time && l.message === r.message))) {
            localLogs.push(r);
            changed = true;
          }
        });
        if (changed) {
          localLogs.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
          saveSyncLogs(localLogs);
        }
        renderSyncLogs();
        updateHeaderSyncStatus();
      }
    }
  } catch (e) {
    // Offline or local server
  }
}

// --------------------------------------------------------------------------
// Sync / Pair Devices Modal
// --------------------------------------------------------------------------
const APP_VERSION = '285493e';

async function updateCommitTag() {
  const tag = document.getElementById('app-commit-tag');
  if (!tag) return;
  tag.textContent = `#${APP_VERSION}`;

  try {
    const token = localStorage.getItem('active_desks_github_token');
    const headers = { 'Accept': 'application/vnd.github+json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch('https://api.github.com/repos/soulless613-stack/active-desks/commits/main', { headers });
    if (res.ok) {
      const data = await res.json();
      const latestSha = data.sha.substring(0, 7);
      tag.textContent = `#${latestSha}`;
    }
  } catch (e) {
    // If offline or network error, fallback to APP_VERSION
  }
}

function openSyncModal() {
  updateCommitTag();
  renderSyncLogs();
  updateHeaderSyncStatus();
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
  fetchReadingFromRepo();
  fetchRecipeInboxFromRepo();
  fetchCapturesFromRepo();
  fetchSyncLogFromRepo();
  checkDevicePairingHash();
  updateHeaderSyncStatus();
});

window.addEventListener('hashchange', checkDevicePairingHash);
