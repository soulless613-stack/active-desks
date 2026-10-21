#!/usr/bin/env node

/**
 * Autonomous Universal Extractor & Classifier Cloud Agent
 * 
 * Invoked by GitHub Actions when captures.json or recipe-inbox.json is modified, or run locally.
 * 1. Checks captures.json for pending items (!domain or status === 'pending') and recipe-inbox.json.
 * 2. If URL present: scrapes OpenGraph & creator captions via facebookexternalhit/1.1.
 * 3. Uses Gemini to classify into strictly [Domain] · [Topic].
 * 4. Extracts rich payloads:
 *    - recipe: 1-ingredient-per-item, metric grams, macros, markdown, app.js registration.
 *    - book: title, author, series, genre, blurb, store/goodreads link.
 *    - game: title, platform, genre, developer, summary, quest/backlog context.
 *    - other domains (travel, home, finance, writing, tech): clean title, 1-sentence summary, actionable context.
 * 5. If Raw Thought (no URL): directly classifies into [Domain] · [Topic] with clean title & takeaway.
 * 6. Updates captures.json as the Single Source of Truth.
 * 7. Clears recipe-inbox.json to [].
 * 8. Increments service worker cache version in sw.js.
 * 9. Records audit log in sync-log.json.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const CAPTURES_PATH = path.join(ROOT_DIR, 'captures.json');
const INBOX_PATH = path.join(ROOT_DIR, 'recipe-inbox.json');
const RECIPES_DIR = path.join(ROOT_DIR, 'recipes');
const APP_JS_PATH = path.join(ROOT_DIR, 'app.js');
const SW_JS_PATH = path.join(ROOT_DIR, 'sw.js');
const SYNC_LOG_PATH = path.join(ROOT_DIR, 'sync-log.json');
const SUGGESTIONS_PATH = path.join(ROOT_DIR, 'desk-suggestions.json');
const PROJECT_CONTEXT_PATH = path.join(ROOT_DIR, 'project-context.md');

// Supported Gemini models with search grounding support in order of preference
const CANDIDATE_MODELS = [
  'gemini-3.8-flash',
  'gemini-3-flash-preview',
  'gemini-2.5-flash'
];

export async function runUniversalExtractor() {
  console.log('=== Starting Autonomous Universal Extractor & Classifier ===');

  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (!apiKey) {
    const msg = 'CRITICAL: GEMINI_API_KEY secret is missing or empty in environment.';
    console.error(msg);
    recordFailureLog(msg);
    process.exit(1);
  }

  // 1. Read captures.json
  let captures = [];
  if (fs.existsSync(CAPTURES_PATH)) {
    try {
      const raw = fs.readFileSync(CAPTURES_PATH, 'utf8').trim();
      captures = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Error parsing captures.json:', e.message);
      recordFailureLog('Error parsing captures.json: ' + e.message);
      process.exit(1);
    }
  }

  // 2. Read recipe-inbox.json (for legacy / direct queue support)
  let inbox = [];
  if (fs.existsSync(INBOX_PATH)) {
    try {
      const raw = fs.readFileSync(INBOX_PATH, 'utf8').trim();
      inbox = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('Warning parsing recipe-inbox.json:', e.message);
    }
  }

  // Migrate any inbox items into pending captures if not already present
  let inboxMigratedCount = 0;
  if (Array.isArray(inbox) && inbox.length > 0) {
    inbox.forEach(item => {
      const alreadyInCaptures = captures.some(c => 
        (c.sourceUrl && c.sourceUrl === item.url) || 
        (c.id && c.id === item.id)
      );
      if (!alreadyInCaptures) {
        captures.unshift({
          id: item.id || Date.now(),
          domain: null,
          topic: null,
          title: item.note || 'Queued Recipe Link',
          summary: null,
          sourceUrl: item.url,
          time: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          status: 'pending',
          rawText: item.note || item.url,
          payload: null
        });
        inboxMigratedCount++;
      }
    });
    if (inboxMigratedCount > 0) {
      console.log(`-> Migrated ${inboxMigratedCount} item(s) from recipe-inbox.json into captures stream.`);
    }
  }

  // Identify items needing classification / extraction
  const pendingIndices = [];
  captures.forEach((c, idx) => {
    const isPending = c.status === 'pending' || !c.domain || c.domain === 'pending';
    if (isPending) {
      pendingIndices.push(idx);
    }
  });

  const forceRecluster = process.argv.includes('--recluster') || process.argv.includes('--evolve');
  if (pendingIndices.length === 0 && !forceRecluster) {
    runDeskEvolutionDetectionOnly(captures);
    console.log('No pending captures to classify. Desk evolution suggestions checked.');
    // Still clear recipe-inbox.json if items were already migrated
    if (Array.isArray(inbox) && inbox.length > 0) {
      fs.writeFileSync(INBOX_PATH, '[]\n', 'utf8');
    }
    process.exit(0);
  }

  console.log(`Found ${pendingIndices.length} pending capture item(s) to classify & extract.`);

  const errorLogList = [];
  const processedItems = [];

  for (let i = 0; i < pendingIndices.length; i++) {
    const idx = pendingIndices[i];
    const item = captures[idx];
    const sourceUrl = item.sourceUrl || item.url || extractUrlFromText(item.rawText || item.text);
    const itemText = item.rawText || item.text || item.title || '';

    console.log(`\n[${i + 1}/${pendingIndices.length}] Processing capture ID: ${item.id}`);
    if (sourceUrl) console.log(`  Source URL: ${sourceUrl}`);
    console.log(`  Raw Text: "${itemText.substring(0, 80)}"`);

    try {
      let classification = null;

      if (sourceUrl) {
        // --- MODALITY A: URL LINK EXTRACTION ---
        const metadata = await fetchPostMetadata(sourceUrl);
        if (metadata?.caption) {
          console.log(`  -> Scraped creator caption (${metadata.caption.length} chars)`);
        }

        classification = await extractUrlWithGemini({
          url: sourceUrl,
          note: itemText,
          metadata
        }, apiKey, errorLogList);

        if (!classification) {
          console.warn(`  Could not classify/extract URL: ${sourceUrl}. Leaving pending.`);
          continue;
        }

        // If domain is recipe, enforce recipes/<slug>.md and app.js registration
        if (classification.domain === 'recipe' && classification.recipeData) {
          const recipeData = classification.recipeData;
          const slug = slugify(recipeData.slug || recipeData.title);
          recipeData.slug = slug;

          const mdPath = path.join(RECIPES_DIR, `${slug}.md`);
          const mdContent = formatRecipeMarkdown(recipeData);
          fs.writeFileSync(mdPath, mdContent, 'utf8');
          console.log(`  -> Created markdown: recipes/${slug}.md`);

          const registered = registerRecipeInAppJs(recipeData);
          if (registered) {
            console.log(`  -> Registered "${recipeData.title}" into app.js DEFAULT_STATE`);
          }
          updateProjectContext(recipeData);
        }

      } else {
        // --- MODALITY B: RAW LINKLESS THOUGHT EXTRACTION ---
        classification = await classifyThoughtWithGemini(itemText, apiKey, errorLogList);

        if (!classification) {
          console.warn(`  Could not classify thought. Leaving pending.`);
          continue;
        }
      }

      // Update capture item with two-tier tags and rich metadata
      captures[idx] = {
        id: item.id || Date.now(),
        domain: (classification.domain || 'thought').toLowerCase(),
        topic: classification.topic || 'General',
        title: classification.title || itemText,
        summary: classification.summary || itemText,
        creator: classification.creator || null,
        sourceUrl: sourceUrl || null,
        blogUrl: classification.blogUrl || null,
        time: item.time || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        status: 'processed',
        rawText: itemText,
        payload: classification.payload || classification.recipeData || null
      };

      processedItems.push(captures[idx]);
      console.log(`  -> Tagged as: [${captures[idx].domain}] · ${captures[idx].topic}`);
      console.log(`  -> Title: "${captures[idx].title}"`);

    } catch (err) {
      console.error(`  Failed processing item ${item.id}:`, err);
      errorLogList.push({ id: item.id, exception: err.message });
    }
  }

  if (processedItems.length === 0) {
    const msg = `Failed to process any pending items.`;
    console.error(`CRITICAL: ${msg}`);
    recordFailureLog(msg, { errorLogList });
    process.exit(1);
  }

  // 3. Phase 3: Adaptive Intelligence (Rule of 3 Re-clustering & Rule of 5 Evolution)
  await runSemanticReclusteringAndEvolution(captures, apiKey);

  // 4. Save updated captures.json
  fs.writeFileSync(CAPTURES_PATH, JSON.stringify(captures, null, 2) + '\n', 'utf8');
  console.log(`\n-> Successfully saved ${captures.length} item(s) to captures.json`);

  // 5. Clear recipe-inbox.json to []
  if (fs.existsSync(INBOX_PATH)) {
    fs.writeFileSync(INBOX_PATH, '[]\n', 'utf8');
    console.log('-> Cleared recipe-inbox.json to []');
  }

  // 6. Bump Service Worker cache version
  bumpServiceWorkerCache();

  // 7. Append audit log to sync-log.json
  appendSyncLog(processedItems);

  console.log(`=== Completed successfully: ${processedItems.length} item(s) processed and classified! ===`);
}

/**
 * Extract URL from raw text string if present
 */
function extractUrlFromText(text) {
  if (!text) return null;
  const match = text.match(/https?:\/\/[^\s]+/i);
  return match ? match[0] : null;
}

/**
 * Scrape Instagram / TikTok post caption and OpenGraph metadata directly using social crawler user agents
 */
async function fetchPostMetadata(url) {
  let caption = null;
  let title = null;
  let author = null;

  try {
    if (url.includes('instagram.com')) {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const html = await res.text();
        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/>/i)
          || html.match(/<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']\s*\/>/i);
        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([\s\S]*?)["']\s*\/>/i)
          || html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([\s\S]*?)["']\s*\/>/i);

        if (descMatch) {
          caption = decodeHtmlEntities(descMatch[1]);
        }
        if (titleMatch) {
          title = decodeHtmlEntities(titleMatch[1]);
          const authorMatch = title.match(/\(@([A-Za-z0-9_.]+)\)/);
          if (authorMatch) author = `@${authorMatch[1]}`;
        }
      }
    } else {
      // General web URL metadata fetch
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ActiveDesksBot/2.0)' },
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const html = await res.text();
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
          || html.match(/<meta\s+property=["']og:title["']\s+content=["']([\s\S]*?)["']\s*\/>/i);
        const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/>/i)
          || html.match(/<meta\s+property=["']og:description["']\s+content=["']([\s\S]*?)["']\s*\/>/i);
        if (titleMatch) title = decodeHtmlEntities(titleMatch[1].trim());
        if (descMatch) caption = decodeHtmlEntities(descMatch[1].trim());
      }
    }
  } catch (err) {
    console.warn('Direct metadata scrape warning:', err.message);
  }

  // Fallback to oEmbed if no caption found
  if (!caption) {
    const oembed = await fetchOembedData(url);
    if (oembed) {
      title = title || oembed.title;
      author = author || oembed.author_name;
    }
  }

  return { caption, title, author };
}

function decodeHtmlEntities(str) {
  if (!str) return '';
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#xb0;/g, '°');
}

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
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ActiveDesksBot/2.0)' },
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
    // Non-fatal
  }
  return null;
}

/**
 * Universal Gemini Classifier for URLs (with Google Search Grounding)
 */
async function extractUrlWithGemini(input, apiKey, errorLogList = []) {
  const { url, note, metadata } = input;
  let shortcode = '';
  const reelMatch = url.match(/reel\/([A-Za-z0-9_-]+)/);
  if (reelMatch) shortcode = reelMatch[1];

  const prompt = `You are an expert autonomous knowledge classifier and data extractor for a personal Progressive Web App called Active Desks.
The user saved a link: "${url}"
${shortcode ? `- Instagram Reel Shortcode: "${shortcode}"` : ''}
${note ? `- User Note: "${note}"` : ''}
${metadata?.title ? `- Post Title / Author: "${metadata.title}"` : ''}
${metadata?.author ? `- Author Handle: "${metadata.author}"` : ''}
${metadata?.caption ? `- Full Creator Post Caption:\n"""\n${metadata.caption}\n"""` : ''}

INSTRUCTIONS:
1. Determine the item's DOMAIN. Choose the single most appropriate macro domain from this list:
   - "recipe": Cooking, baking, meal prep, drinks, food dishes.
   - "book": Book recommendation, book review, TBR reading list, literature, author.
   - "game": Video game, tabletop RPG, board game, gaming rig backlog.
   - "fiber": Knitting, crochet, spinning, embroidery, sewing, fiber arts.
   - "travel": Destination guides, kissaten/coffee shops, places to visit, trip ideas.
   - "home": Home repair, DIY, furniture, HVAC, plants, gardening.
   - "finance": Personal finance, budgeting, investing, index funds, retirement.
   - "writing": Creative writing, worldbuilding, storytelling, blog ideas.
   - "tech": Software, development, computer hardware, electronics.
   - "misc": Anything else.

2. Determine the item's TOPIC: Exactly ONE specific micro-topic descriptor (e.g. "Baking", "Sci-Fi", "RPG", "Embroidery", "Kyoto", "HVAC", "Investing", "React").

3. EXTRACT RICH PAYLOAD:
   - IF DOMAIN IS "recipe":
     * Title: Clean descriptive recipe title.
     * Creator: Full name & handle (e.g. "Dee | Food for everyone (@mumsfoodies)").
     * Yield: e.g. "36 Mini Rolls" or "6 Servings (Meal Prep)".
     * Calories, Protein, Carbs, Fat: Realistic per serving macros.
     * Highlight: 1-2 sentence compelling summary of flavor, texture, and technique.
     * Ingredients (CRITICAL): STRICT 1 INGREDIENT PER CHECKBOX. Never combine two ingredients. Include metric gram weights alongside US customary volumes wherever possible.
     * Steps: Numbered sequential preparation instructions.
     * BlogUrl: Authentic food blog URL if verified, or the exact source URL.
   - IF DOMAIN IS "book":
     * Title: Book title.
     * Author: Author name.
     * Series: Series name / book # or null.
     * Genre: e.g. "Space Opera", "Progression Fantasy", "Historical Fiction".
     * Summary: 2-3 sentence engaging blurb.
     * Highlight: Why it is recommended / what makes it compelling.
     * LinkUrl: StoryGraph, Goodreads, Audible, or Amazon link if known, or source URL.
   - IF DOMAIN IS "game":
     * Title: Game title.
     * Platform: e.g. "PC / Steam", "Nintendo Switch", "PS5".
     * Genre: e.g. "Cozy Farm Sim", "Action RPG", "Metroidvania".
     * Developer: Studio / developer name or null.
     * Summary: 1-2 sentence gameplay summary.
     * QuestOrGoal: Suggested initial goal or quest backlog entry.
   - FOR ALL OTHER DOMAINS (travel, home, finance, writing, tech, misc):
     * Title: Concise descriptive headline.
     * Summary: 1-2 sentence core takeaway / bookmark summary.
     * KeyTakeaways: Array of 1-3 crisp bullet takeaways or actionable tips.

ANTI-HALLUCINATION RULE:
- Never fabricate fake blog URLs.

Return ONLY a valid JSON object matching this exact schema:
{
  "domain": "recipe|book|game|fiber|travel|home|finance|writing|tech|misc",
  "topic": "MicroTopic",
  "title": "Clean Title",
  "summary": "1-2 sentence clear summary",
  "creator": "Creator Name (@handle) or null",
  "blogUrl": "URL or null",
  "recipeData": { ... only if domain is recipe, with slug, creator, sourceUrl, blogUrl, tags, yield, calories, protein, carbs, fat, highlight, ingredientSections, steps ... },
  "payload": { ... structured domain data for book, game, travel, etc. ... }
}`;

  for (const model of CANDIDATE_MODELS) {
    const toolModes = [
      { name: 'googleSearch', tools: [{ googleSearch: {} }] },
      { name: 'google_search', tools: [{ google_search: {} }] },
      { name: 'no-tools', tools: [] }
    ];

    for (const toolCfg of toolModes) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const payload = { contents: [{ parts: [{ text: prompt }] }] };
        if (toolCfg.tools.length > 0) payload.tools = toolCfg.tools;

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errText = await res.text();
          errorLogList.push({ model, toolMode: toolCfg.name, status: res.status, error: errText.substring(0, 200) });
          continue;
        }

        const resData = await res.json();
        const candidate = resData.candidates?.[0];
        const parts = candidate?.content?.parts || [];
        const nonThoughtParts = parts.filter(p => !p.thought && p.text);
        const rawText = nonThoughtParts.length > 0
          ? nonThoughtParts.map(p => p.text).join('\n')
          : parts.map(p => p.text || '').join('\n');

        if (!rawText.trim()) continue;

        const parsed = parseJsonFromResponse(rawText);
        if (parsed && parsed.domain && parsed.title) {
          return parsed;
        }
      } catch (e) {
        errorLogList.push({ model, toolMode: toolCfg.name, exception: e.message });
      }
    }
  }

  return null;
}

/**
 * Fast Gemini Classifier for Linkless Raw Thoughts (No Search Grounding Needed)
 */
async function classifyThoughtWithGemini(thoughtText, apiKey, errorLogList = []) {
  const prompt = `You are the knowledge classifier for Active Desks, an intentional productivity PWA.
The user captured this raw thought / idea:
"""
${thoughtText}
"""

Instructions:
1. Classify this into strictly TWO tags:
   - "domain": Macro life area. Must be one of: "home", "finance", "writing", "tech", "travel", "recipe", "book", "game", "fiber", "misc".
   - "topic": Exactly ONE specific micro-topic descriptor (e.g. "HVAC", "Retirement", "Sci-Fi", "App Idea", "Woodworking", "Investing", "Baking").
2. Generate a clean, human-readable "title" (3–8 words).
3. Generate a 1-sentence "summary" capturing the core insight, reminder, or context.
4. If there are actionable checklist items, extract them into "checklist": ["item 1", "item 2"].

Return ONLY valid JSON matching this schema:
{
  "domain": "home|finance|writing|tech|travel|recipe|book|game|fiber|misc",
  "topic": "MicroTopic",
  "title": "Clean Human-Readable Title",
  "summary": "1-sentence core takeaway or context",
  "payload": {
    "checklist": []
  }
}`;

  for (const model of CANDIDATE_MODELS) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const payload = { contents: [{ parts: [{ text: prompt }] }] };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) continue;

      const resData = await res.json();
      const candidate = resData.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      const nonThoughtParts = parts.filter(p => !p.thought && p.text);
      const rawText = nonThoughtParts.length > 0
        ? nonThoughtParts.map(p => p.text).join('\n')
        : parts.map(p => p.text || '').join('\n');

      if (!rawText.trim()) continue;

      const parsed = parseJsonFromResponse(rawText);
      if (parsed && parsed.domain && parsed.title) {
        return parsed;
      }
    } catch (e) {
      errorLogList.push({ model, thoughtError: e.message });
    }
  }

  return null;
}

/**
 * Extract JSON block from LLM output
 */
function parseJsonFromResponse(text) {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const jsonStr = match ? match[1] : text;

  try {
    return JSON.parse(jsonStr.trim());
  } catch (e) {
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    if (firstOpen !== -1 && lastClose > firstOpen) {
      try {
        return JSON.parse(text.substring(firstOpen, lastClose + 1));
      } catch (err2) {
        // failed
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

  if (content.includes(`id: '${recipe.slug}'`) || content.includes(`id: "${recipe.slug}"`)) {
    return false;
  }

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
          blogUrl: ${recipe.blogUrl && recipe.blogUrl !== recipe.sourceUrl ? JSON.stringify(recipe.blogUrl) : 'null'},
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
 * Update project-context.md catalog
 */
function updateProjectContext(recipe) {
  if (!fs.existsSync(PROJECT_CONTEXT_PATH)) return;

  try {
    let ctx = fs.readFileSync(PROJECT_CONTEXT_PATH, 'utf8');
    const catalogHeader = '#### Current Available Recipes in App:';
    if (!ctx.includes(catalogHeader)) return;

    if (ctx.includes(`- **${recipe.title}**`)) return;

    const newEntry = `- **${recipe.title}** (\`${recipe.slug}.md\`): ${recipe.highlight || recipe.yield}`;
    ctx = ctx.replace(catalogHeader, `${catalogHeader}\n- ${newEntry}`);
    fs.writeFileSync(PROJECT_CONTEXT_PATH, ctx, 'utf8');
    console.log(`-> Updated project-context.md with recipe entry.`);
  } catch (e) {
    console.warn('Could not update project-context.md:', e.message);
  }
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
function appendSyncLog(items) {
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

    items.forEach(item => {
      logs.unshift({
        id: `${Date.now()}${Math.random().toString(36).substring(2, 6)}`,
        time: now.toISOString(),
        displayTime: displayTime,
        device: 'cloud-agent',
        target: 'captures.json',
        action: 'universal-extract-and-classify',
        status: 'success',
        message: `Classified [${item.domain}] · ${item.topic}: ${item.title}`,
        details: {
          domain: item.domain,
          topic: item.topic,
          title: item.title,
          sourceUrl: item.sourceUrl
        }
      });
    });

    if (logs.length > 150) logs.splice(150);
    fs.writeFileSync(SYNC_LOG_PATH, JSON.stringify(logs, null, 2) + '\n', 'utf8');
    console.log(`-> Appended ${items.length} entry/entries to sync-log.json`);
  } catch (e) {
    console.warn('Could not update sync-log.json:', e.message);
  }
}

function recordFailureLog(message, details = null) {
  if (!fs.existsSync(SYNC_LOG_PATH)) return;

  try {
    let logs = [];
    const raw = fs.readFileSync(SYNC_LOG_PATH, 'utf8').trim();
    logs = raw ? JSON.parse(raw) : [];

    const now = new Date();
    logs.unshift({
      id: `${Date.now()}err`,
      time: now.toISOString(),
      displayTime: now.toLocaleTimeString('en-US'),
      device: 'cloud-agent',
      target: 'captures.json',
      action: 'universal-extract-and-classify',
      status: 'error',
      message: message,
      details: details
    });

    if (logs.length > 150) logs.splice(150);
    fs.writeFileSync(SYNC_LOG_PATH, JSON.stringify(logs, null, 2) + '\n', 'utf8');
  } catch (e) {}
}

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Phase 3: Adaptive Intelligence
 * 1. Rule of 3: Semantic Re-clustering (Topic Sharpening) & Domain Harmonization (for non-desk thoughts).
 * 2. Rule of 5: Emergent Desk Evolution Nudges (noticing clusters outside active desks).
 */
export async function runSemanticReclusteringAndEvolution(captures, apiKey) {
  console.log('\n--- Evaluating Adaptive Taxonomy (Rule of 3 & Rule of 5) ---');

  if (!Array.isArray(captures) || captures.length === 0) {
    console.log('No captures found for taxonomy analysis.');
    return { reclusteredCount: 0, newSuggestionsCount: 0 };
  }

  let reclusteredCount = 0;

  // 1. RULE OF 3: Check for semantic clusters needing topic sharpening or domain elevation
  const processedCaptures = captures.filter(c => c && c.status === 'processed' && c.domain);

  const byDomain = {};
  processedCaptures.forEach(c => {
    const d = c.domain.toLowerCase();
    if (!byDomain[d]) byDomain[d] = [];
    byDomain[d].push({
      id: c.id,
      title: c.title,
      currentTopic: c.topic,
      summary: c.summary,
      rawText: c.rawText
    });
  });

  const candidateDomains = Object.keys(byDomain).filter(d => byDomain[d].length >= 3);

  if (candidateDomains.length > 0 && apiKey) {
    try {
      const candidatesToAnalyze = candidateDomains.flatMap(d => 
        byDomain[d].map(item => ({ ...item, currentDomain: d }))
      );

      const prompt = `You are the adaptive taxonomy engine for Active Desks, an intentional productivity PWA.
The user collects bookmarks, recipes, books, games, and raw thoughts.
Review these items:
${JSON.stringify(candidatesToAnalyze, null, 2)}

TASK: Apply the RULE OF 3 for Topic Crystallization & Domain Harmonization:
1. Topic Crystallization: When 3 or more items in the same domain share a narrower, more specific sub-genre or micro-topic (e.g., inside domain "book", 3 or more items are specifically "LitRPG" rather than general "Fantasy" or "Sci-Fi"; or inside domain "recipe", 3 or more items are specifically "Sourdough" or "Slow Cooker"), assign them that specific "newTopic".
2. Domain Harmonization (Non-Desk Thoughts): If 3 or more items currently under domain "thought" or "misc" share a clear life domain (such as "finance", "travel", "home", "writing", "tech"), elevate their "newDomain" to that macro domain.

RULES:
- Only return items that actually need a change. Do NOT change items that already have accurate, specific topics.
- Require at least 3 items to justify creating or switching to a sub-genre cluster.
- Return ONLY a valid JSON array:
[
  {
    "id": 1234567,
    "newDomain": "finance" | null,
    "newTopic": "LitRPG" | null,
    "reason": "Brief reason for cluster adjustment"
  }
]
If no items need re-clustering, return an empty array [].`;

      const candidateModels = ['gemini-3.8-flash', 'gemini-2.5-flash'];
      for (const model of candidateModels) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          });

          if (!res.ok) continue;

          const resData = await res.json();
          const rawText = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const updates = parseJsonFromResponse(rawText);

          if (Array.isArray(updates) && updates.length > 0) {
            updates.forEach(u => {
              const target = captures.find(c => c.id === u.id);
              if (target) {
                let changed = false;
                if (u.newDomain && u.newDomain.toLowerCase() !== target.domain) {
                  target.domain = u.newDomain.toLowerCase();
                  changed = true;
                }
                if (u.newTopic && u.newTopic !== target.topic) {
                  target.topic = u.newTopic;
                  changed = true;
                }
                if (changed) {
                  reclusteredCount++;
                  console.log(`  🌱 Re-clustered [${target.id}] "${target.title}": [${target.domain}] · ${target.topic} (${u.reason || 'Rule of 3'})`);
                }
              }
            });
          }
          break;
        } catch (err) {
          console.warn(`Re-clustering attempt with ${model} failed:`, err.message);
        }
      }
    } catch (err) {
      console.warn('Semantic re-clustering error:', err.message);
    }
  }

  // 2. RULE OF 5: Detect Emergent Desk Evolution Nudges
  const newSuggestionsCount = runDeskEvolutionDetectionOnly(captures);

  console.log(`--- Adaptive Taxonomy Complete: ${reclusteredCount} item(s) re-clustered ---`);
  return { reclusteredCount, newSuggestionsCount };
}

/**
 * Fast Rule of 5 Desk Evolution Evaluator (Runs offline in 0ms, zero API cost)
 */
export function runDeskEvolutionDetectionOnly(captures) {
  if (!Array.isArray(captures)) return 0;
  const ACTIVE_DESK_DOMAINS = ['book', 'recipe', 'game', 'fiber'];

  const nonDeskCounts = {};
  captures.forEach(c => {
    if (!c || !c.domain) return;
    const d = c.domain.toLowerCase();
    if (!ACTIVE_DESK_DOMAINS.includes(d) && d !== 'misc') {
      nonDeskCounts[d] = (nonDeskCounts[d] || 0) + 1;
    }
  });

  let existingSuggestions = [];
  if (fs.existsSync(SUGGESTIONS_PATH)) {
    try {
      const raw = fs.readFileSync(SUGGESTIONS_PATH, 'utf8').trim();
      existingSuggestions = raw ? JSON.parse(raw) : [];
    } catch (e) {
      existingSuggestions = [];
    }
  }

  let newCount = 0;
  const updatedSuggestions = [...existingSuggestions];

  for (const [domain, count] of Object.entries(nonDeskCounts)) {
    if (count >= 5) {
      const domainLabel = domain.charAt(0).toUpperCase() + domain.slice(1);
      const existingIdx = updatedSuggestions.findIndex(s => s.domain === domain);

      const suggestionObj = {
        id: `sug-${domain}`,
        domain: domain,
        topic: domainLabel,
        itemCount: count,
        title: `${domainLabel} Workbench`,
        message: `You've captured ${count} items about ${domainLabel} recently. Ready to spin up an active desk to focus on this?`,
        status: 'pending',
        detectedAt: new Date().toISOString()
      };

      if (existingIdx === -1) {
        updatedSuggestions.push(suggestionObj);
        newCount++;
        console.log(`  💡 Emergent Desk Evolution Detected: ${domainLabel} has ${count} items (>= 5 threshold)!`);
      } else {
        updatedSuggestions[existingIdx].itemCount = count;
      }
    }
  }

  try {
    fs.writeFileSync(SUGGESTIONS_PATH, JSON.stringify(updatedSuggestions, null, 2) + '\n', 'utf8');
  } catch (e) {
    console.warn('Could not save desk-suggestions.json:', e.message);
  }

  return newCount;
}

// Direct CLI invocation
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runUniversalExtractor().catch(err => {
    console.error('Fatal unhandled error in universal-extractor:', err);
    process.exit(1);
  });
}
