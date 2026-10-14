#!/usr/bin/env node

/**
 * Autonomous Recipe Extractor Cloud Agent
 * 
 * Invoked by GitHub Actions when recipe-inbox.json is modified, or run locally.
 * 1. Checks recipe-inbox.json for queued recipe URLs.
 * 2. Uses Gemini Flash API with Google Search Grounding to extract rich recipe details.
 * 3. Enforces 1-ingredient-per-item rule, metric gram weights, and nutritional macros.
 * 4. Generates recipes/<slug>.md.
 * 5. Registers the recipe into app.js DEFAULT_STATE.
 * 6. Increments service worker cache version in sw.js.
 * 7. Records an audit entry in sync-log.json.
 * 8. Clears recipe-inbox.json to [].
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const INBOX_PATH = path.join(ROOT_DIR, 'recipe-inbox.json');
const RECIPES_DIR = path.join(ROOT_DIR, 'recipes');
const APP_JS_PATH = path.join(ROOT_DIR, 'app.js');
const SW_JS_PATH = path.join(ROOT_DIR, 'sw.js');
const SYNC_LOG_PATH = path.join(ROOT_DIR, 'sync-log.json');
const PROJECT_CONTEXT_PATH = path.join(ROOT_DIR, 'project-context.md');

// Supported Gemini models with search grounding support in order of preference
const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.6-flash',
  'gemini-2.0-flash'
];

async function main() {
  console.log('--- Starting Autonomous Recipe Extractor ---');

  if (!fs.existsSync(INBOX_PATH)) {
    console.log('recipe-inbox.json does not exist. Nothing to process.');
    process.exit(0);
  }

  let inbox = [];
  try {
    const raw = fs.readFileSync(INBOX_PATH, 'utf8').trim();
    inbox = raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('Error parsing recipe-inbox.json:', err.message);
    process.exit(1);
  }

  if (!Array.isArray(inbox) || inbox.length === 0) {
    console.log('recipe-inbox.json is empty. No recipes queued. Exiting.');
    process.exit(0);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('CRITICAL: GEMINI_API_KEY environment variable is missing.');
    console.error('Please configure the GEMINI_API_KEY secret in repository settings.');
    process.exit(1);
  }

  console.log(`Found ${inbox.length} recipe(s) queued in inbox.`);

  const extractedRecipes = [];

  for (let i = 0; i < inbox.length; i++) {
    const item = inbox[i];
    console.log(`\n[${i + 1}/${inbox.length}] Processing URL: ${item.url}`);
    if (item.note) console.log(`Note: ${item.note}`);

    try {
      // 1. Attempt optional oEmbed metadata retrieval
      const oembedData = await fetchOembedData(item.url);

      // 2. Call Gemini with Search Grounding
      const recipeData = await extractWithGemini(item, oembedData, apiKey);
      if (!recipeData) {
        console.warn(`Could not extract recipe data for ${item.url}. Skipping.`);
        continue;
      }

      // Ensure slug uniqueness and format
      const slug = slugify(recipeData.slug || recipeData.title);
      recipeData.slug = slug;

      // 3. Write recipes/<slug>.md
      const mdPath = path.join(RECIPES_DIR, `${slug}.md`);
      const mdContent = formatRecipeMarkdown(recipeData);
      fs.writeFileSync(mdPath, mdContent, 'utf8');
      console.log(`-> Created markdown: recipes/${slug}.md`);

      // 4. Register in app.js DEFAULT_STATE
      const appJsUpdated = registerRecipeInAppJs(recipeData);
      if (appJsUpdated) {
        console.log(`-> Registered "${recipeData.title}" into app.js DEFAULT_STATE`);
      } else {
        console.log(`-> Recipe already present or pattern not matched in app.js`);
      }

      // 5. Update project-context.md
      updateProjectContext(recipeData);

      extractedRecipes.push(recipeData);
    } catch (err) {
      console.error(`Failed processing ${item.url}:`, err);
    }
  }

  if (extractedRecipes.length === 0) {
    console.log('No new recipes were successfully extracted. Inbox remains unchanged.');
    process.exit(0);
  }

  // 6. Bump Service Worker cache version
  bumpServiceWorkerCache();

  // 7. Clear recipe-inbox.json to []
  fs.writeFileSync(INBOX_PATH, '[]\n', 'utf8');
  console.log('-> Cleared recipe-inbox.json to []');

  // 8. Append to sync-log.json
  appendSyncLog(extractedRecipes);

  console.log(`\n--- Completed successfully: ${extractedRecipes.length} recipe(s) extracted & deployed! ---`);
}

/**
 * Fetch public oEmbed data for Instagram / TikTok if available
 */
async function fetchOembedData(url) {
  try {
    let oembedUrl = null;
    if (url.includes('instagram.com')) {
      oembedUrl = `https://www.instagram.com/oembed/?url=${encodeURIComponent(url)}`;
    } else if (url.includes('tiktok.com')) {
      oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;
    }

    if (!oembedUrl) return null;

    const res = await fetch(oembedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ActiveDesksBot/1.0)' },
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      return {
        title: data.title || null,
        author_name: data.author_name || null,
        author_url: data.author_url || null
      };
    }
  } catch (e) {
    // Non-fatal, search grounding will handle it
  }
  return null;
}

/**
 * Call Gemini Flash with Google Search Grounding
 */
async function extractWithGemini(item, oembedData, apiKey) {
  const prompt = `You are an expert culinary assistant and recipe data extractor for a personal Progressive Web App.
We need to extract a clean, complete recipe from this queued social media post or recipe link.

Queued Item Details:
- Source URL: ${item.url}
- User Note: ${item.note || 'None'}
${oembedData ? `- Scraped oEmbed metadata: ${JSON.stringify(oembedData)}` : ''}

Instructions:
1. Search Google using your search tool for this exact URL, reel shortcode/ID, creator handle, food blog, or recipe title.
2. Find the true recipe. Creators frequently publish exact measurements, gram weights, and baking temperatures on their food blog, website, Linktree, or video caption.
3. INGREDIENTS FORMATTING RULE (CRITICAL):
   - STRICT 1 INGREDIENT PER ITEM. NEVER combine multiple items into one string (e.g. NEVER "1 tsp salt and pepper" -> separate into "1 tsp salt" and "1/4 tsp black pepper"; NEVER "baking powder & baking soda" -> separate into two items).
   - Include metric gram weights alongside US customary volumes wherever possible (e.g. "900g (32 oz) chicken breast", "208g (1 3/4 cups) all-purpose flour").
4. Provide realistic nutritional macros per serving: Calories (kcal), Protein (g), Carbs (g), Fat (g).
5. Provide clear, numbered, sequential steps.
6. Provide a 1-2 sentence highlight summarizing the dish, technique, and flavor.

Return ONLY a valid JSON object wrapped in \`\`\`json ... \`\`\` matching this exact schema:
{
  "title": "Clean Descriptive Recipe Title",
  "slug": "kebab-case-title",
  "creator": "Creator Name (@handle)",
  "sourceUrl": "${item.url}",
  "blogUrl": "https://creator-food-blog.com/recipe (or same as sourceUrl if none)",
  "tags": ["tag1", "tag2", "tag3"],
  "yield": "10 Servings (Meal Prep)",
  "calories": "450 kcal",
  "protein": "35g",
  "carbs": "45g",
  "fat": "14g",
  "highlight": "Short 1-2 sentence compelling summary of texture and technique.",
  "ingredientSections": [
    {
      "sectionName": "Main Dish",
      "ingredients": [
        "900g (32 oz) chicken breast, diced",
        "2 yellow onions, diced"
      ]
    }
  ],
  "steps": [
    "Step 1 instruction...",
    "Step 2 instruction..."
  ]
}`;

  for (const model of CANDIDATE_MODELS) {
    console.log(`-> Querying Gemini model: ${model} with search grounding...`);
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        tools: [
          { googleSearch: {} }
        ]
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Model ${model} returned HTTP ${res.status}: ${errText.substring(0, 200)}`);
        continue;
      }

      const resData = await res.json();
      const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        console.warn(`No text candidate returned from ${model}`);
        continue;
      }

      const parsed = parseJsonFromResponse(rawText);
      if (parsed && parsed.title && Array.isArray(parsed.steps)) {
        return parsed;
      }
    } catch (e) {
      console.warn(`Exception calling ${model}:`, e.message);
    }
  }

  return null;
}

/**
 * Extract JSON block from LLM output
 */
function parseJsonFromResponse(text) {
  // Try markdown code fence first
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonStr = match ? match[1] : text;

  try {
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    // Try finding first { to last }
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose > firstOpen) {
      try {
        return JSON.parse(text.substring(firstOpen, lastClose + 1));
      } catch (err2) {
        console.error('Failed to parse extracted JSON:', err2.message);
      }
    }
  }
  return null;
}

/**
 * Generate standard Markdown content matching existing recipes
 */
function formatRecipeMarkdown(recipe) {
  const tagsFormatted = (recipe.tags || [])
    .map(t => `#${t.replace(/^#/, '').toLowerCase()}`)
    .join(' ');

  const sourceLink = recipe.blogUrl && recipe.blogUrl !== recipe.sourceUrl
    ? `[${recipe.creator}](${recipe.sourceUrl}) | [Full Recipe Blog](${recipe.blogUrl})`
    : `[${recipe.creator}](${recipe.sourceUrl})`;

  let sectionsMd = '';
  if (Array.isArray(recipe.ingredientSections) && recipe.ingredientSections.length > 0) {
    sectionsMd = recipe.ingredientSections.map(sec => {
      const header = sec.sectionName ? `## 🥣 ${sec.sectionName}` : '## 🥣 Ingredients';
      const items = (sec.ingredients || []).map(ing => `- [ ] ${ing}`).join('\n');
      return `${header}\n${items}`;
    }).join('\n\n');
  } else if (Array.isArray(recipe.ingredients)) {
    sectionsMd = `## 🥣 Ingredients\n${recipe.ingredients.map(ing => `- [ ] ${ing}`).join('\n')}`;
  }

  const stepsMd = (recipe.steps || [])
    .map((step, idx) => `${idx + 1}. ${step}`)
    .join('\n');

  return `# ${recipe.title}

**Source**: ${sourceLink}  
**Tags**: ${tagsFormatted}  
**Yield**: ${recipe.yield || 'Standard Batch'}  

### 📊 Nutrition (Per Serving)
- **Calories**: ${recipe.calories || 'N/A'}
- **Protein**: ${recipe.protein || 'N/A'}
- **Carbs**: ${recipe.carbs || 'N/A'}
- **Fat**: ${recipe.fat || 'N/A'}

---

${sectionsMd}

---

## 🧑‍🍳 Instructions

### Preparation & Cooking
${stepsMd}
`;
}

/**
 * Register the new recipe into app.js DEFAULT_STATE
 */
function registerRecipeInAppJs(recipe) {
  if (!fs.existsSync(APP_JS_PATH)) return false;

  let content = fs.readFileSync(APP_JS_PATH, 'utf8');

  // Check if ID already exists
  if (content.includes(`id: '${recipe.slug}'`) || content.includes(`id: "${recipe.slug}"`)) {
    return false;
  }

  // Flatten ingredients into 1D array
  let allIngredients = [];
  if (Array.isArray(recipe.ingredientSections) && recipe.ingredientSections.length > 0) {
    allIngredients = recipe.ingredientSections.flatMap(s => s.ingredients || []);
  } else if (Array.isArray(recipe.ingredients)) {
    allIngredients = recipe.ingredients;
  }

  const recipeObjString = `        {
          id: '${recipe.slug}',
          title: ${JSON.stringify(recipe.title)},
          source: ${JSON.stringify(recipe.creator)},
          url: ${JSON.stringify(recipe.sourceUrl)},
          yield: ${JSON.stringify(recipe.yield || 'Standard Batch')},
          calories: ${JSON.stringify(recipe.calories || 'N/A')},
          protein: ${JSON.stringify(recipe.protein || 'N/A')},
          carbs: ${JSON.stringify(recipe.carbs || 'N/A')},
          fat: ${JSON.stringify(recipe.fat || 'N/A')},
          highlight: ${JSON.stringify(recipe.highlight || '')},
          ingredients: [
            ${allIngredients.map(ing => JSON.stringify(ing)).join(',\n            ')}
          ],
          steps: [
            ${(recipe.steps || []).map(s => JSON.stringify(s)).join(',\n            ')}
          ]
        }`;

  // Find the closing of DEFAULT_STATE.desks.recipe.recipes
  const marker = '\n      ]\n    },\n    reading: {';
  if (!content.includes(marker)) {
    console.warn('Could not locate end of recipe array in app.js. Insertion skipped.');
    return false;
  }

  content = content.replace(marker, `,\n${recipeObjString}${marker}`);
  fs.writeFileSync(APP_JS_PATH, content, 'utf8');
  return true;
}

/**
 * Increment service worker cache version
 */
function bumpServiceWorkerCache() {
  if (!fs.existsSync(SW_JS_PATH)) return;

  let swContent = fs.readFileSync(SW_JS_PATH, 'utf8');
  const match = swContent.match(/const CACHE_NAME = 'active-desks-v(\d+)';/);
  if (match) {
    const currentVersion = parseInt(match[1], 10);
    const newVersion = currentVersion + 1;
    swContent = swContent.replace(
      `const CACHE_NAME = 'active-desks-v${currentVersion}';`,
      `const CACHE_NAME = 'active-desks-v${newVersion}';`
    );
    fs.writeFileSync(SW_JS_PATH, swContent, 'utf8');
    console.log(`-> Bumped sw.js CACHE_NAME to active-desks-v${newVersion}`);
  }
}

/**
 * Append audit entries to sync-log.json
 */
function appendSyncLog(recipes) {
  if (!fs.existsSync(SYNC_LOG_PATH)) return;

  try {
    let logs = [];
    const raw = fs.readFileSync(SYNC_LOG_PATH, 'utf8').trim();
    logs = raw ? JSON.parse(raw) : [];

    const now = new Date();
    const displayTime = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    recipes.forEach(r => {
      logs.unshift({
        id: `${Date.now()}${Math.random().toString(36).substring(2, 6)}`,
        time: now.toISOString(),
        displayTime: displayTime,
        device: 'cloud-agent',
        target: 'recipe-inbox.json',
        action: 'auto-extract',
        status: 'success',
        message: `Auto-extracted recipe: ${r.title}`,
        details: {
          slug: r.slug,
          yield: r.yield,
          calories: r.calories
        }
      });
    });

    // Cap at 60 entries
    if (logs.length > 60) logs = logs.slice(0, 60);

    fs.writeFileSync(SYNC_LOG_PATH, JSON.stringify(logs, null, 2) + '\n', 'utf8');
    console.log('-> Appended audit entry to sync-log.json');
  } catch (e) {
    console.warn('Could not update sync-log.json:', e.message);
  }
}

/**
 * Update project-context.md recipe list
 */
function updateProjectContext(recipe) {
  if (!fs.existsSync(PROJECT_CONTEXT_PATH)) return;

  try {
    let content = fs.readFileSync(PROJECT_CONTEXT_PATH, 'utf8');
    const entry = `- **${recipe.title}** (\`${recipe.slug}.md\`)`;
    if (!content.includes(recipe.slug)) {
      // Find Kitchen & Recipe Shelf Desk section
      const targetMarker = '### 4. Kitchen & Recipe Shelf Desk';
      if (content.includes(targetMarker)) {
        content = content.replace(targetMarker, `${targetMarker}\n* Recent addition: ${entry}`);
        fs.writeFileSync(PROJECT_CONTEXT_PATH, content, 'utf8');
      }
    }
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Helper to generate kebab-case slug
 */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

main().catch(err => {
  console.error('Fatal unhandled error in extract-recipes:', err);
  process.exit(1);
});
