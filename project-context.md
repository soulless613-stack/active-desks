# Active Desks & Reading Automation — Project Context & Handoff

> **CRITICAL INSTRUCTION FOR THE ANTIGRAVITY IDE & AGENTS**:  
> **DO NOT modify any code or files in this project without presenting the finalized low-level plan and getting EXPLICIT user confirmation to execute.** Directional feedback, design agreements, or comments like "include this" or "I like that" mean update the plan—NOT start coding. Always present the finalized low-level plan and wait for the user's explicit green light so they have space to review and catch errors.  
> **Always ask the user about creating a granular, low-level implementation plan** before moving forward from a high-level conceptual plan into execution. Because monolithic files (`app.js`, `index.html`) can cause excessive analysis turns and context compactions, a low-level implementation plan with exact file anchors, DOM line numbers, and function signatures ensures efficient, one-shot implementation. Maintain the minimal, clean, zero-bloat philosophy.

> [!NOTE]
> **SYSTEM STATUS SNAPSHOT (Cache Version: `active-desks-v50`)**
> - **4-Workbench Concentration**: Main dashboard strictly maintains focus on **4 active workbenches** in the 2x2 grid (`state.activeDeskIds`).
> - **5 Registered Workbenches**: Reading Nook (`reading`), Kitchen Shelf (`recipe`), Game Rig (`gaming`), Fiber Arts (`fiber`), and Tech Workbench (`tech`).
> - **Zero Data Loss Dormancy**: Resting desks retain all row counters, reading bookmarks, active quests, and backlog trays in `localStorage` and remote JSON sync.
> - **1-Tap Workbench Swapping**: Header button `⚙️ Swap Desks` opens `#swap-desk-modal` to rotate workbenches on demand.
> - **Emergent Desk Evolution**: Rule of 5 banner dynamically checks against active domains and pre-targets emergent workbenches (e.g. `tech`) in the swap modal.
> - **Contextual Projection Trays**: Reading, Game Rig, and Tech desks feature collapsible backlog trays pulling directly from `captures.json` with 1-tap `Set Active` buttons.
> - **Autonomous Multimodal Cloud Agent**: 4-tier media taxonomy (`video_extracted`, `audio_extracted`, `text_images`, `fallback_text`) with on-demand mobile retry.
> - **Stale Tab Guard**: Background tabs check remote commit SHA (`checkRemoteCommitLiveness()`) and discard stale queues to prevent overwriting newer cloud commits.

---

## 1. Project Infrastructure & Repositories

* **Project Name**: Active Desks
* **Local Directory**: [`c:/Users/chris/Documents/antigravity/active-desks`](file:///c:/Users/chris/Documents/antigravity/active-desks)
* **Parent Workspace**: [`c:/Users/chris/Documents/antigravity`](file:///c:/Users/chris/Documents/antigravity)
* **Live GitHub Pages URL**: [https://soulless613-stack.github.io/active-desks/](https://soulless613-stack.github.io/active-desks/)
* **GitHub Repository**: [https://github.com/soulless613-stack/active-desks](https://github.com/soulless613-stack/active-desks)
* **Git Branch**: `main` (clean, synchronized with `origin/main`)
* **Local Dev Server**: Zero-dependency PowerShell HTTP server:
  ```powershell
  powershell -ExecutionPolicy Bypass -File .\serve.ps1
  ```
  Runs on `http://localhost:8080/`.

---

## 2. Architectural Principles & Technology Stack

1. **Zero-Bloat Philosophy**:
   * Pure **Vanilla HTML5**, modern **CSS3** (glassmorphic dark UI, CSS custom properties, responsive container queries), and **Vanilla ES6 JavaScript**.
   * **Zero build pipelines**: No Vite, Webpack, Node.js packages, npm scripts, or frontend frameworks (React/Vue/Svelte).
   * Assets run directly in standard browsers and GitHub Pages.
2. **Progressive Web App (PWA)**:
   * [`manifest.json`](file:///c:/Users/chris/Documents/antigravity/active-desks/manifest.json) — App metadata and icons for home screen installability on mobile (Google Pixel 11 Pro Fold) and desktop.
   * [`sw.js`](file:///c:/Users/chris/Documents/antigravity/active-desks/sw.js) — Service worker providing offline capabilities with `stale-while-revalidate` caching strategy.
   * **Service Worker Caching Rule**: Whenever core assets (`index.html`, `app.js`, `styles.css`) are changed, **increment `CACHE_NAME`** in `sw.js` (e.g. `active-desks-v4` $\rightarrow$ `active-desks-v5`).
3. **Security & Secrets Management**:
   * Google Gemini API keys and GitHub Personal Access Tokens (PAT) live **strictly in browser `localStorage`**.
   * **NEVER** commit API keys, personal access tokens, or private secrets into tracked files (`app.js`, `reading.json`, etc.).
   * The repository is public on GitHub; client-side repository sync reads from and commits to `reading.json` using the user's PAT stored exclusively on the user's devices.

---

## 3. Current Feature Catalog & Implementation Details

### 1. Daily 3 Anchors (Top Banner & `anchors.json`)
* Tracks three daily core rhythms: **Home** (Family/Chores), **Body** (Walk/Workout), **Spark** (Hobbies/Audiobook).
* Tap to mark complete. Automatically resets on calendar-day change without guilt streaks or punitive mechanics.
* **Cross-Device Repository Sync (`anchors.json`)**:
  * Check/uncheck states sync to `anchors.json` on GitHub with 1.5s debounce.
  * Date-aware: on startup (`fetchAnchorsFromRepo()`), if the remote record is from a previous calendar day, the local midnight reset is preserved.

### 2. Reading Nook Desk & Cross-Device Sync (`reading.json`)
* **Gemini Vision Screenshot Parsing**:
  * Uploading a screenshot of The StoryGraph or Kindle triggers client-side OCR via the latest Gemini Flash model (`generateContent`).
  * Prompts the model to return structured JSON: `{ title, author, current_progress, total_progress, unit, percentage }`.
* **📚 Up Next / TBR Projection Tray (`#reading-tbr-tray`)**:
  * Dynamically filters `captures.json` where `domain === 'book'`.
  * Displays title, author/curator, and subgenre tag (e.g. `LitRPG`, `Progression Fantasy`).
  * Features a 1-tap **`📖 Set Active`** button that instantly promotes the queued book into the active reading spot, resetting progress to 0, persisting locally, and marking `reading.json` dirty for cloud sync.
* **Cross-Device Repository Sync (`reading.json`)**:
  * Reads and commits reading progress directly via unified `githubGet`/`githubPut` engine.
  * Manual edits and screenshot parses save locally instantly and mark `reading.json` dirty.
* **On-Screen QR Code Device Pairing**:
  * Embedded local library [`qrious.min.js`](file:///c:/Users/chris/Documents/antigravity/active-desks/qrious.min.js) (~17KB, zero CDN reliance).
  * Clicking "Show Mobile Pairing QR Code" generates a QR code encoding `#setup=<base64-json>` containing the Gemini Key and GitHub PAT.
  * Scanning the PC monitor with the Google Pixel camera opens the live PWA, imports the keys into `localStorage`, erases the hash from the browser URL via `history.replaceState` for privacy, and displays a success toast.
* **Commit Verification Tag**:
  * The `#sync-modal` header displays the running commit hash (`#6bf5deb` / `#...`) in grey monospace next to "Phone & Device Sync". This allows instant verification of whether mobile has reloaded the latest deployment or is still serving a cached Service Worker bundle.

### 3. Kitchen & Recipe Shelf Desk
* **Recipe Selector**: Compact `<select id="recipe-select">` dropdown list selector with custom chevron styling. Effortlessly scales from 3 to 30+ recipes without crowding mobile screens.
* **Recipe Inbox & Autonomous Cloud Agent (`recipe-inbox.json` & `.github/workflows/recipe-extractor.yml`)**:
  * Tap **"📥 Queue"** in the Kitchen Shelf header to quickly drop Instagram Reel or recipe links from mobile or desktop.
  * Links are stored in `state.recipeInbox` and synced to `recipe-inbox.json` on GitHub via REST API.
  * **Autonomous Cloud Agent (GitHub Actions)**: Whenever `recipe-inbox.json` is updated on GitHub, `.github/workflows/recipe-extractor.yml` executes [`scripts/extract-recipes.js`](file:///c:/Users/chris/Documents/antigravity/active-desks/scripts/extract-recipes.js) in a free cloud runner. The runner queries Gemini 2.5 Flash with Google Search Grounding to find creator blogs, exact gram weights, and nutritional macros, generates `recipes/<slug>.md`, registers the recipe in `app.js`, bumps the service worker cache, and deploys to GitHub Pages in ~45 seconds—completely hands-free without turning on the computer.
  * **IDE Manual Fallback**: In the Antigravity IDE, saying *"Process my recipe inbox"* activates the [`active-desks-recipe-extractor`](file:///c:/Users/chris/Documents/antigravity/active-desks/.agents/skills/active-desks-recipe-extractor/SKILL.md) skill to run local extraction on-demand.
* **Bundled Recipes** (Markdown source files stored in [`active-desks/recipes/`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/)):
  1. [`butter-chicken-mac-n-cheese.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/butter-chicken-mac-n-cheese.md) — 545 kcal, 42g P, 58g C, 17g F (by Tom Walsh @stealth_health_life).
  2. [`crispy-potato-meatballs.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/crispy-potato-meatballs.md) — Spiced beef & turmeric potato dough (by Abir El Saghir @abiresag).
  3. [`cheesy-garlic-sourdough-focaccia.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/cheesy-garlic-sourdough-focaccia.md) — 349 kcal, 14g P, 33g C, 17g F (by Amy Coyne @amybakesbread).
  4. [`chocolate-chip-cookie-donut-loaf.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/chocolate-chip-cookie-donut-loaf.md) — 395 kcal, 5g P, 59g C, 16g F (by Angela Heckler @obsessedwithcashews).
  5. [`savory-pizza-cinnamon-rolls.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/savory-pizza-cinnamon-rolls.md) — 285 kcal, 12g P, 26g C, 14g F (by Lauren Ketterman @barefoot.mimosas).
  6. [`glazed-donut-bread-pudding.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/glazed-donut-bread-pudding.md) — 455 kcal, 7g P, 65g C, 19g F (by 12 Tomatoes @12_tomatoes).
  7. [`creamy-one-pot-garlic-herb-pasta.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/creamy-one-pot-garlic-herb-pasta.md) — 670 kcal, 15g P, 50g C, 47g F (by Mariam @baiti_ana).
  8. [`viral-korean-salt-bread.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/viral-korean-salt-bread.md) — 245 kcal, 5g P, 32g C, 11g F (by Erin's Cozy Kitchen @erins_cozykitchen).
  9. [`classic-syracuse-salt-potatoes.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/classic-syracuse-salt-potatoes.md) — 250 kcal, 3g P, 27g C, 15g F.
  10. [`homemade-cinnamon-gifflar.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/homemade-cinnamon-gifflar.md) — 135 kcal, 2.5g P, 20g C, 5g F (by Dee | Food for everyone @mumsfoodies).
  11. [`crispy-overnight-no-knead-focaccia.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/crispy-overnight-no-knead-focaccia.md) — 275 kcal, 7g P, 41g C, 10g F (by Cowboy @cowboy_cooks).
  12. [`overnight-focaccia.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/overnight-focaccia.md) — Cold-fermented bubbly artisan focaccia.
* **Interactive Modal**: Tapping "View Ingredients & Steps" opens a glassmorphic sheet with macro badges, an interactive checklist of ingredients, step-by-step instructions, and dual external creator links: "📱 View Reel ↗" and "🌐 Full Recipe Blog ↗" (when an external blog article exists).
* **Auto-Sync Migration & Robust Queue Sync**:
  * `loadState()` in `app.js` merges default recipes into existing user `localStorage` if new recipes are added in code.
  * `commitRecipeInboxToGithub()` features automatic 409-conflict retries with exponential backoff and `no-store` cache-busting to prevent SHA collisions during rapid successive mobile queues.
  * Includes a **"🔄 Sync to GitHub"** button in the Recipe Inbox modal for on-demand manual pushes.

### 4. Game Rig Desk (`gaming.json`)
* Tracks active playthrough (*Baldur's Gate 3*), gaming platform (PC / Steam, Switch, PS5), active quest/secrets goal, and wiki link.
* **🎮 Backlog / Watchlist Projection Tray (`#gaming-backlog-tray`)**:
  * Dynamically filters `captures.json` where `domain === 'game'`.
  * Displays title, topic/genre tag (e.g. `RPG`, `Roguelike`, `Co-op`), and blurb.
  * Features a 1-tap **`🎮 Set Active`** button that instantly promotes the queued game to the active title, sets initial quest focus, and marks `gaming.json` dirty for cloud sync.
* **✏️ Update Modal**: Modal allows updating game title, platform, active quest note, and wiki link with instant local save and optional immediate sync button.

### 5. Fiber Arts Desk (`fiber.json`)
* Knitting & crochet WIP tracker with row counter, target row goals, needle/yarn specs, and pattern links.
* **Instant Local Row Changes**: Tapping `+`/`−` immediately persists to `localStorage`, re-renders the UI with zero delay, and marks `fiber.json` dirty for background batch sync.
* **✏️ Update Modal**: Modal allows editing project title, WIP type, yarn/needle specs, target rows, and pattern link. Features instant local save (`💾 Save Changes`) and on-demand cloud sync (`🔄 Sync to GitHub`).

### 6. Tech Workbench Desk (`#desk-card-tech` & `tech.json`)
* Dedicated workbench for **3D Printing, Parametric CAD, Software Engineering, and AI Tools**.
* Displays active project title (*PressPrint Lab Parametric Boxes*), tool/stack category (*3D Printing & Parametric CAD*), current focus note (*Parametric hinged boxes with customized compartment grids & embossed lids*), external tool link, and sync status.
* **💻 Tech Tools & Backlog Projection Tray (`#tech-backlog-tray`)**:
  * Dynamically filters `captures.json` where `domain === 'tech'`.
  * Surfaces queued repositories, cloud automation workflows (e.g., *Oracle Free Tier Agent Setup*), local agent harnesses (*DeepSeek Harness*), and 3D printing STL/CAD designs (*PressPrint Lab Hinged Boxes*, *Wing Folding Fan*).
  * Features a 1-tap **`💻 Set Active`** button that promotes any queued tech tool or repository into the active workbench focus.
* **✏️ Update Modal (`#tech-modal`)**:
  * Allows updating project title, tool/stack, focus/goal, and external tool link.
  * Saves locally instantly and queues `tech.json` for background cloud sync.
* **Cross-Device Repository Sync (`tech.json`)**:
  * Reads and commits tech workbench state directly to `tech.json` on GitHub via the unified sync engine.

### 7. Dynamic Desk Concentration & Workbench Swapping Engine (`#swap-desk-modal` & `state.activeDeskIds`)
* **4-Workbench Concentration Rule**: The main dashboard enforces a strict focus cap of **4 active workbenches** in the 2×2 grid (`state.activeDeskIds`), preventing visual and cognitive clutter.
* **Zero Data Loss Dormancy Architecture**:
  * When a workbench is swapped out into dormancy (e.g. swapping Fiber Arts out to activate Tech Workbench), its state, counters, reading progress, and backlogs are never wiped.
  * Inactive cards remain dormant in the DOM (`display: none`) and persist safely in `localStorage` and remote JSON files.
* **`⚙️ Swap Desks` Dashboard Trigger**:
  * A subtle, glassmorphic button in `.desks-section-header` on the main dashboard opens `#swap-desk-modal`.
* **1-Tap Swap Interaction**:
  * The modal displays the 4 currently active workbenches and all resting dormant workbenches.
  * Tapping **`Swap with [Desk] ➔`** rotates the workbenches in 1 tap, updates `state.activeDeskIds`, and persists to `localStorage`.
* **Emergent Desk Evolution Integration**:
  * When 5+ items in an unassigned domain accumulate (e.g. 7 tech items), the Rule of 5 banner (`#desk-evolution-banner`) appears.
  * Tapping **"✨ Focus Desk Captures"** directly opens `#swap-desk-modal` with the emergent workbench pre-selected to swap into any active slot.
  * Active domains are dynamically excluded from evolution checks so active workbenches never generate redundant evolution banners.

### 8. Universal Capture Stream, Multimodal Video & Adaptive Intelligence (`captures.json` & `scripts/universal-extractor.js`)
* **Dual-Modality Intake**: Exactly one bottom capture dock handling both URLs (Instagram reels, TikToks, GoodReads, Steam, web articles) and linkless raw thoughts (0ms local save, 100% offline).
* **Two-Tier Tag Rule**: Every item is categorized into strictly two tags:
  1. `[Domain]` (Macro-Anchor: `recipe`, `book`, `game`, `fiber`, `travel`, `home`, `finance`, `writing`, `tech`, `misc`).
  2. `[Topic]` (Micro-Context: `Baking`, `Sci-Fi`, `RPG`, `3D Printing`, `HVAC`, `Investing`, etc.).
* **Single Master Stream (`captures.json`)**: All captured thoughts, links, and recipes reside in `captures.json` as the Single Source of Truth.
* **Autonomous Multimodal Cloud Agent (`scripts/universal-extractor.js` & `.github/workflows/recipe-extractor.yml`)**:
  * Triggered via GitHub Actions on changes to `captures.json` or `recipe-inbox.json`.
  * **Tiered Multimodal Pipeline (`fetchMediaBuffer`)**:
    - **Tier 1 (Full Video `.mp4` $\le$ 20MB)**: Uses `yt-dlp` in the GitHub Actions runner to download compressed 720p/480p `.mp4` video. Passes base64 video directly to Gemini via `inlineData: { mimeType: 'video/mp4' }`. Gemini **watches visual frames** (reading on-screen text overlays, title cards, book covers, board game boxes, 3D printer slicer temps/speeds/tolerances, ingredient graphics) while **simultaneously listening to the spoken voiceover**. Tagged with `mediaStatus: "video_extracted"`.
    - **Tier 2 (Audio Only `.mp3` $\le$ 15MB)**: If video download is throttled or exceeds 20MB, extracts the voiceover audio track for verbal narration listening. Tagged with `mediaStatus: "audio_extracted"`.
    - **Tier 3 (Text & Search Fallback)**: If media download fails or is blocked, falls back to OpenGraph/caption scraping via `facebookexternalhit/1.1` and live Google Search grounding. Tagged with `mediaStatus: "fallback_text"`.
    - **Static Content Bypass (`text_images`)**: Links identified as static media (Instagram photo carousels `/p/`, articles, blogs, GoodReads) bypass `yt-dlp` download completely, saving runner bandwidth and tagging cleanly as `mediaStatus: "text_images"`.
  * **Rich Domain Payloads**:
    - `recipe`: strict 1-ingredient-per-item checklists with metric gram weights, nutrition macros, markdown generation in `recipes/<slug>.md`, and registration in `app.js`.
    - `book`: single books or listicles (`payload.books` with title, author, series, summary, and highlight).
    - `game`: platform, genre, developer, summary, initial quest backlog goal.
    - `tech` / `home` / `finance` / `fiber`: concise summary + key takeaways (e.g. 3D printer tolerances, temperatures, needle sizes).
  * **Linkless Thoughts**: Bypasses scrapers and prompts Gemini directly into `[Domain] · [Topic]`.
* **Card Media Badges (4-Tier Taxonomy)**:
  * Placed at the **bottom of each capture card**, directly **above the footer separator line**:
    - `🎬 Video & Audio Analyzed` (purple badge, `video_extracted`): Full `.mp4` video frames inspected by Gemini OCR + spoken voiceover transcribed.
    - `🎙️ Voiceover Audio Verified` (cyan badge, `audio_extracted`): Voiceover `.mp3` extracted and analyzed by Gemini narration listening.
    - `📚 Text & Images` (slate calm badge, `text_images`): Static post (Instagram photo carousels `/p/`, articles, blogs) where no video stream was needed. Extraction succeeded normally!
    - `⚠️ Video Skipped (Text Fallback)` (amber badge, `fallback_text`): Video reel download was skipped or blocked by platform rate-limits; contains a live `<button class="btn-badge-rerun">🔄 Re-run</button>` to retry on-demand from any mobile or desktop browser without touching a computer.
* **Mobile On-Demand Re-Run Engine (`retryCaptureExtraction(id)`)**:
  * Tapping `[ 🔄 Re-run ]` on the fallback badge (or inside `#capture-detail-modal`) immediately resets the capture item to `pending` and pushes `captures.json` to GitHub via REST API (`flushDirtySync(true)`).
  * Automatically triggers the GitHub Actions cloud runner to re-attempt video download and Gemini multimodal analysis hands-free!
* **Drawer Fallback Alert Banner (`#drawer-fallback-banner`)**:
  * Dismissible amber alert banner at the top of the Universal Captures Drawer displaying the count of any items that required text fallback due to video download blocks (`text_images` items never trigger this banner).
* **Unified Capture Detail Modal (`#capture-detail-modal`)**:
  * Clicking *any* card in the Universal Captures Drawer opens `#capture-detail-modal` with glassmorphic styling, media badge chip, metadata chips (Platform, Genre, Author, Series, Developer, Yield), ingredient checklists, takeaways, highlights, and multi-book carousels (`payload.books`).
* **Desk Assignment & Pinning Modal (`#pin-to-desk-modal`)**:
  * Tapping the pin icon on any capture in the drawer allows 1-tap reassignment to any desk/domain (`book`, `game`, `recipe`, `fiber`, `home`, `finance`, `writing`, `tech`, `thought`) and sets the Tier 2 topic tag.
* **Adaptive Intelligence (Phase 3 Taxonomy)**:
  * **Rule of 3 (Topic Crystallization & Domain Harmonization)**: Automatically re-clusters topics when $\ge$3 items share a specific sub-genre (e.g., grouping into `LitRPG` under `book`), or promotes linkless raw thoughts into macro domains. Includes dismissible change notice chips in the drawer.
  * **Rule of 5 (Emergent Desk Evolution Nudges)**: Detects when $\ge$5 items gather in an unassigned domain (e.g. `tech` with 3D Printing), writing to `desk-suggestions.json` and rendering an actionable banner prompting the user to spin up an emergent workbench.
* **Zombie Deletion Tombstone Guard (`DELETED_CAPTURES_KEY`)**:
  * Deletions in the drawer record IDs into `localStorage['active_desks_deleted_captures']` (up to 100 entries), preventing background repo sync merges from resurrecting deleted cards.

### 9. Unified Cloud Sync Engine, Exit Flush, Stale Tab Guard & Diagnostics (`sync-log.json`)
* **Generic GitHub Engine**: Centralized `githubPut(filePath, data, commitMsg)` and `githubGet(filePath)` with automatic Base64 encoding/decoding, SHA tracking, 409-conflict re-fetch/retry, and uniform error diagnostics.
* **Dirty-Set Batching (`pendingDirtyFiles`)**: Modals, row steppers, anchor toggles, and quick captures save locally instantly with zero network wait time, queueing modified files in a dirty set.
* **Exit Flush on Inactive**:
  * Listens to `visibilitychange: hidden`, `window.blur`, and `pagehide` (locking phone screen, switching apps, or changing browser tabs).
  * Automatically flushes all pending dirty files sequentially, followed by committing `sync-log.json` once per session to prevent log spam.
* **Stale Tab Guard & Remote Commit Liveness (`checkRemoteCommitLiveness()`)**:
  * When returning to an active tab (`visibilitychange: visible` or `window.focus`, throttled to 15s), the client probes GitHub API to check the latest commit SHA on `main`.
  * If the remote repository has advanced (e.g., an automated cloud extraction completed or changes were made on another device), the local pending dirty queue is cleared (`pendingDirtyFiles.clear()`) to prevent stale background tabs from overwriting newer remote commits.
  * Silently fetches the latest remote JSON files (`reading.json`, `captures.json`, `fiber.json`, `gaming.json`, `tech.json`, `anchors.json`) to keep all tabs updated without requiring full page reloads.
* **Live Status Badge**: Header `.sync-badge` reflects real-time status: Green (`Synced`), Pulsing Blue (`Syncing...`), Amber (`Unsynced`), Red (`Sync Error`), Gray (`Offline` / `No Token`).
* **On-Device Logging & Cloud Observability**: All sync operations log to `localStorage['active_desks_sync_log']` (ring buffer of 50 entries) and sync to [`active-desks/sync-log.json`](file:///c:/Users/chris/Documents/antigravity/active-desks/sync-log.json) so runtime activity and errors can be monitored directly in the Antigravity IDE.
* **Diagnostics UI**: The `#sync-modal` provides an on-screen log viewer, a "🔌 Test Connection" button to probe GitHub PAT permissions and rate limits, a "☁️ Push Log to GitHub" button, and "📋 Copy Log" / "🗑️ Clear Log" tools.

---

## 4. Reading Log & StoryGraph Integration: Research, Status & IDE Handoff

### Motivation for Moving Back to the Antigravity IDE
The user tested and verified the screenshot vision pipeline, QR pairing, and GitHub sync on their Google Pixel 11 Pro Fold. **Technically, everything works.** However, the user explicitly shared their feedback:
> *"I still think there is a better way we can pull the info from storygraph but i get that it isn't in the cards right now. I have tried using this interface but I don't think I enjoy it. Can you update PROJECT_CONTEXT.md with all the relavent info need to move back to the antigravity IDE?"*

The manual friction of taking a screenshot, opening the web app, and uploading the file is cumbersome. The user wants to explore better, lower-friction alternatives inside the Antigravity IDE.

### Technical Realities & Constraints Discovered
1. **No Public APIs**:
   * Neither **The StoryGraph** nor **Amazon Kindle** provides an official, public API for programmatic read/write sync.
2. **Cloudflare Turnstile Bot Protection**:
   * The StoryGraph employs Cloudflare Turnstile anti-bot protection. Direct scraping, curl, headless browsers, or public CORS proxies fail or are blocked.
3. **Data Sources**:
   * **Kindle Reading Insights**: Available at `https://www.amazon.com/kindle/reading/insights`.
   * **Audible Library**: Can be exported via the free [Audible Library Extractor](https://audible-library-extractor.github.io/) browser extension.
   * **Kindle Telemetry**: Exact minutes read are only stored internally in Amazon's telemetry database (`Kindle.ReadingSession.csv` via Amazon Privacy request); StoryGraph does not accept minute backfills anyway.

### Exploration Vectors for Future IDE Development
When exploring better StoryGraph/reading sync workflows in the Antigravity IDE, consider these approaches:

1. **Authenticated Browser Bookmarklet / UserScript**:
   * Runs directly inside the user's authenticated desktop or mobile browser tab on `app.thestorygraph.com/currently-reading`.
   * Completely bypasses Cloudflare bot protection because the user is already authenticated in their browser.
   * A single click extracts the current book title, page count, and progress, and can dispatch an authenticated `fetch()` directly to GitHub API to update `reading.json`.
2. **Android MacroDroid Automation (Google Pixel 11 Pro Fold)**:
   * The user reads via the Kindle app (with Assistive Reader / TTS) and listens on Audible on their Pixel Fold.
   * MacroDroid trigger options:
     - **Kindle App Closed**: Triggers when the Kindle app is swiped away.
     - **Assistive Reader Paused**: Triggers when audio stops while Kindle is in foreground/background.
     - Action: Pop a rich notification: *"Reading paused: Log progress?"* with 1-tap deep link to `https://app.thestorygraph.com/currently-reading`.
3. **Lightweight Companion Script or Webhook**:
   * A local CLI tool or background companion script that allows quick command-line logging or hotkey progress entry.
4. **Streamlined Manual Quick-Input**:
   * An ultra-fast, 1-tap numeric stepper or percentage slider directly on the Active Desks Reading card, avoiding the need for screenshot uploads altogether.

---

## 5. Development & Deployment Playbook

1. **Making Changes**:
   * Always present an implementation plan and obtain user approval first.
   * Test locally with `serve.ps1`.
   * If modifying `index.html`, `app.js`, or `styles.css`, increment `CACHE_NAME` in [`sw.js`](file:///c:/Users/chris/Documents/antigravity/active-desks/sw.js) (e.g. `active-desks-v50` $\rightarrow$ `active-desks-v51`).
2. **Deploying to GitHub Pages**:
   ```bash
   git add .
   git commit -m "feat/fix: description"
   git pull --rebase origin main && git push origin main
   ```
   * Checking remote and rebasing first prevents push rejections caused by real-time mobile sync (`reading.json` and `recipe-inbox.json`).
   * GitHub Pages builds and deploys within ~1–2 minutes.
3. **Verifying on Mobile**:
   * Open `https://soulless613-stack.github.io/active-desks/`.
   * Open the Sync Modal and verify that the commit hash tag matches the latest git commit.
   * If an older commit is shown, refresh the page or close and re-open the PWA to let the new Service Worker activate.
