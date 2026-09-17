# Active Desks & Reading Automation — Project Context & Handoff

> **CRITICAL INSTRUCTION FOR THE ANTIGRAVITY IDE & AGENTS**:  
> **DO NOT modify any code or files in this project without presenting your plan and getting explicit user approval first.** The user strictly requires review and sign-off on all proposed changes before implementation. Maintain the minimal, clean, zero-bloat philosophy.

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

### 1. Daily 3 Anchors (Top Banner)
* Tracks three daily core rhythms: **Home** (Family/Chores), **Body** (Walk/Workout), **Spark** (Hobbies/Audiobook).
* Tap to mark complete. Automatically resets on calendar-day change without guilt streaks or punitive mechanics.

### 2. Kitchen & Recipe Shelf Desk
* **Recipe Selector**: Compact `<select id="recipe-select">` dropdown list selector with custom chevron styling. Effortlessly scales from 3 to 30+ recipes without crowding mobile screens.
* **Recipe Inbox & Link Queue (`recipe-inbox.json`)**:
  * Tap **"📥 Queue"** in the Kitchen Shelf header to quickly drop Instagram Reel or recipe links from mobile or desktop.
  * Links are stored in `state.recipeInbox` and synced to `recipe-inbox.json` on GitHub via REST API.
  * In the Antigravity IDE, saying *"Process my recipe inbox"* batch-extracts queued links using Gemini, generates slug-case `recipes/<slug>.md` markdown files, registers them into `app.js`, and clears the queue.
* **Bundled Recipes** (Markdown source files stored in [`active-desks/recipes/`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/)):
  1. [`butter-chicken-mac-n-cheese.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/butter-chicken-mac-n-cheese.md) — 480 kcal, 45g P, 38g C, 16g F.
  2. [`crispy-potato-meatballs.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/crispy-potato-meatballs.md) — 410 kcal, 32g P, 28g C, 18g F.
  3. [`cheesy-garlic-sourdough-focaccia.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/cheesy-garlic-sourdough-focaccia.md) — 349 kcal, 14g P, 33g C, 17g F (by Amy Coyne @amybakesbread).
  4. [`chocolate-chip-cookie-donut-loaf.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/chocolate-chip-cookie-donut-loaf.md) — 395 kcal, 5g P, 59g C, 16g F (by Angela Heckler @obsessedwithcashews).
  5. [`savory-pizza-cinnamon-rolls.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/savory-pizza-cinnamon-rolls.md) — 285 kcal, 12g P, 26g C, 14g F (by Lauren Ketterman @barefoot.mimosas).
  6. [`glazed-donut-bread-pudding.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/glazed-donut-bread-pudding.md) — 455 kcal, 7g P, 65g C, 19g F (by 12 Tomatoes @12_tomatoes).
* **Interactive Modal**: Tapping "View Ingredients & Steps" opens a glassmorphic sheet with macro badges, an interactive checklist of ingredients, step-by-step instructions, and original creator links.
* **Auto-Sync Migration & Robust Queue Sync**:
  * `loadState()` in `app.js` merges default recipes into existing user `localStorage` if new recipes are added in code.
  * `commitRecipeInboxToGithub()` features automatic 409-conflict retries with exponential backoff and `no-store` cache-busting to prevent SHA collisions during rapid successive mobile queues.
  * Includes a **"🔄 Sync to GitHub"** button in the Recipe Inbox modal for on-demand manual pushes.

### 3. Fiber Arts Desk
* Knitting WIP tracker (US 7 / 4.5mm needles, worsted yarn).
* Large, thumb-friendly `+` and `−` row counter with quick-reset dialog.

### 4. Reading Nook Desk & Cross-Device Sync
* **Current State**: Tracking *Oathbringer* by Brandon Sanderson (pages 1119/1243, 90%).
* **Gemini Vision Screenshot Parsing**:
  * Uploading a screenshot of The StoryGraph or Kindle triggers client-side OCR via `gemini-3.6-flash:generateContent`.
  * *Model Note*: Google AI Studio retired `gemini-2.5-flash` (returns 404). Always use `gemini-3.6-flash`.
  * Prompts the model to return structured JSON: `{ title, author, current_progress, total_progress, unit, percentage }`.
* **Cross-Device Repository Sync (`reading.json`)**:
  * Reads and commits reading progress directly to `reading.json` on `main` via GitHub REST API (`GET`/`PUT /repos/soulless613-stack/active-desks/contents/reading.json`).
  * Both desktop and mobile remain synchronized in real time.
* **On-Screen QR Code Device Pairing**:
  * Embedded local library [`qrious.min.js`](file:///c:/Users/chris/Documents/antigravity/active-desks/qrious.min.js) (~17KB, zero CDN reliance).
  * Clicking "Show Mobile Pairing QR Code" generates a QR code encoding `#setup=<base64-json>` containing the Gemini Key and GitHub PAT.
  * Scanning the PC monitor with the Google Pixel camera opens the live PWA, imports the keys into `localStorage`, erases the hash from the browser URL via `history.replaceState` for privacy, and displays a success toast.
* **Commit Verification Tag**:
  * The `#sync-modal` header displays the running commit hash (`#ea2ab15` / `#...`) in grey monospace next to "Phone & Device Sync". This allows instant verification of whether mobile has reloaded the latest deployment or is still serving a cached Service Worker bundle.

### 5. Game Rig Desk
* Current game: *Baldur's Gate 3* with active quest tracker and wiki quick-link.

### 6. Quick Capture Bar & Cross-Device Sync (`captures.json`)
* Always-available quick note capture dock storing stray thoughts directly into `localStorage` and syncing across devices via GitHub REST API.
* Stored in [`active-desks/captures.json`](file:///c:/Users/chris/Documents/antigravity/active-desks/captures.json) on `main`.
* Features deduplicating merge on page/modal load (`fetchCapturesFromRepo()`), automatic background push on capture or delete (`commitCapturesToGithub()`) with 409-conflict retry handling, and a manual "🔄 Sync to GitHub" button in the modal header.

### 7. Dual-Layer Sync & Error Activity Log (`sync-log.json`)
* **Live Status Badge**: Header `.sync-badge` reflects real-time status: Green (`Synced`), Pulsing Blue (`Syncing...`), Red (`Sync Error`), Amber (`No Token` / `Warning`).
* **On-Device Logging**: All commit/fetch operations across `reading.json`, `recipe-inbox.json`, and `captures.json` log detailed timestamps, target files, status codes, and error bodies into `localStorage['active_desks_sync_log']` (ring buffer of 50 entries).
* **Repository Sync (`sync-log.json`)**: Whenever connected and authorized, background sync flushes recent events to [`active-desks/sync-log.json`](file:///c:/Users/chris/Documents/antigravity/active-desks/sync-log.json) via GitHub REST API so error logs can be inspected directly in the Antigravity IDE.
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
   * If modifying `index.html`, `app.js`, or `styles.css`, increment `CACHE_NAME` in [`sw.js`](file:///c:/Users/chris/Documents/antigravity/active-desks/sw.js) (e.g. `active-desks-v5`).
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
