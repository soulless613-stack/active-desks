---
name: active-desks-recipe-extractor
description: >-
  Extracts recipes from the Active Desks recipe inbox queue (recipe-inbox.json), searches for creator food blogs, captions, and exact gram weights, generates clean individual markdown files, registers the recipes into app.js, clears the inbox queue, bumps the service worker cache, and deploys to GitHub. Use this skill whenever the user says "process my recipe inbox", "extract recipes from queue", "batch extract recipes", or asks to process queued reels/recipes.
---

# Active Desks Recipe Extractor & Processor Runbook

This skill automates the complete end-to-end workflow for processing queued recipes in Active Desks without requiring user monitoring or manual intervention.

## Trigger Phrases
Activate this skill whenever the user requests:
- *"Process my recipe inbox"*
- *"Extract recipes from queue"*
- *"Batch extract recipes"*
- *"Check/process queued recipes"*

---

## Autonomous 8-Step Execution Workflow

Execute these 8 steps sequentially and autonomously from start to finish:

### Step 1: Pull Latest Remote State
Run a rebase pull to ensure any recipes queued from mobile or other devices are present:
```powershell
git -C "c:/Users/chris/Documents/antigravity/active-desks" pull --rebase origin main
```

### Step 2: Inspect the Queue
Read [`active-desks/recipe-inbox.json`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipe-inbox.json):
- If the array is empty (`[]`), notify the user: *"Your recipe inbox is already empty. No recipes to extract."* and stop.
- If items are present, loop through each queued item `{ id, url, note, addedAt }`.

### Step 3: Deep Recipe Extraction
For each queued URL:
1. **Identify the Source & Shortcode**:
   - Extract the Reel/Post ID (e.g. `https://www.instagram.com/reel/DcbhSQLNA4N/` $\rightarrow$ `DcbhSQLNA4N`).
2. **Overcoming Instagram Walls via Multi-Angle Web Search**:
   - Instagram blocks direct unauthorized curl/fetch. Search the web using DuckDuckGo, Bing, or Google for:
     - The exact reel shortcode (e.g. `"DcbhSQLNA4N"`).
     - The creator handle + recipe keywords (e.g. `"obsessedwithcashews" "donut loaf"`).
     - The creator's official website, food blog, Linktree, or TikTok mirror where full gram weights and instructions are published.
3. **Extract Structured Information**:
   - **Title**: Clean descriptive recipe title (e.g. "Chocolate Chip Cookie Donut Loaf").
   - **Creator / Source**: Full name and handle (e.g. "Angela Heckler (@obsessedwithcashews)").
   - **Yield**: Number of servings / container count (e.g. "10 Slices (9x5\" Pan)" or "6 Servings (Meal Prep)").
   - **Macros (Per Serving)**: Calories (kcal), Protein (g), Carbs (g), Fat (g).
   - **Highlight**: 1-2 sentence compelling summary of the texture, flavor, and technique.
   - **Ingredients (CRITICAL RULE)**:
     > [!IMPORTANT]
     > **STRICT 1 INGREDIENT PER CHECKBOX**: NEVER combine multiple ingredients into one checkbox or array item!
     > - ❌ WRONG: `"1 1/2 tsp baking powder & 1/4 tsp baking soda"`
     > - ✅ RIGHT: `"1 1/2 tsp baking powder"` and `"1/4 tsp baking soda"` as separate items.
     > - ❌ WRONG: `"Salt and pepper to taste"`
     > - ✅ RIGHT: `"1/2 tsp fine sea salt"` and `"1/4 tsp black pepper"` as separate items.
     > Always include metric gram weights alongside US customary volumes wherever possible (e.g. `"900g (32 oz) chicken breast"`).
   - **Instructions / Steps**: Clear numbered sequential steps.

### Step 4: Generate Markdown Recipe File
Save the recipe as [`active-desks/recipes/<slug>.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/) using standard format:
```markdown
# [Recipe Title]

**Source**: [Instagram Reel by [Creator Name] (@[handle])]([URL])  
**Tags**: #[tag1] #[tag2] #[tag3]  
**Yield**: [Yield]  

### 📊 Nutrition (Per Serving)
- **Calories**: [N] kcal
- **Protein**: [N]g
- **Carbs**: [N]g
- **Fat**: [N]g

---

## 🥣 [Component 1]
- [ ] [Single ingredient with grams & volume]
- [ ] [Single ingredient with grams & volume]

## 🍳 [Component 2]
- [ ] [Single ingredient with grams & volume]

---

## 🧑‍🍳 Instructions

### 1. [Step Name]
1. [Step instruction]
2. [Step instruction]
```

### Step 5: Register Recipe into `app.js`
In [`active-desks/app.js`](file:///c:/Users/chris/Documents/antigravity/active-desks/app.js):
1. Append the new recipe object to `DEFAULT_STATE.desks.recipe.recipes`:
   ```javascript
   {
     id: '<slug>',
     title: "<Title>",
     source: "<Creator> (@<handle>)",
     url: "<Reel URL>",
     yield: "<Yield>",
     calories: "<N> kcal",
     protein: "<N>g",
     carbs: "<N>g",
     fat: "<N>g",
     highlight: "<Highlight>",
     ingredients: [
       "<1 ingredient per item>",
       ...
     ],
     steps: [
       "<Step 1>",
       ...
     ]
   }
   ```
2. Note: `loadState()` in `app.js` automatically merges new recipes into existing `localStorage` on any user device upon load.

### Step 6: Clear the Inbox Queue & Log
1. Set [`active-desks/recipe-inbox.json`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipe-inbox.json) to `[]`.
2. Add an audit entry to [`active-desks/sync-log.json`](file:///c:/Users/chris/Documents/antigravity/active-desks/sync-log.json) recording the batch extraction.

### Step 7: Invalidate Service Worker Cache & Update Docs
1. Increment `CACHE_NAME` in [`active-desks/sw.js`](file:///c:/Users/chris/Documents/antigravity/active-desks/sw.js) (e.g. `active-desks-v12` $\rightarrow$ `active-desks-v13`).
2. Update [`active-desks/project-context.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/project-context.md) under the Kitchen & Recipe Shelf Desk feature catalog to list the new recipe.

### Step 8: Validate & Deploy to GitHub
1. Validate syntax:
   ```powershell
   node -c "c:/Users/chris/Documents/antigravity/active-desks/app.js"
   ```
2. Commit, rebase, and push to GitHub `main`:
   ```powershell
   cmd /c 'git add . && git commit -m "feat(recipes): extract <Recipe Title> from inbox queue" && git pull --rebase origin main && git push origin main'
   ```
3. Present the walkthrough summary to the user with the recipe details, macros, and deployment status.
