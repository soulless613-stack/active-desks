# Active Desks v2.0 — Architecture & Specifications Blueprint

> **Status**: Conceptual Design & Planning  
> **Philosophy**: Zero-Bloat, Local-First, Zero-Maintenance, Privacy-Centric Personal Launchpad.  
> **Target Devices**: Mobile (Google Pixel Fold) & Desktop (Chrome/Edge/Firefox/Safari).

---

## 1. Executive Summary & Goals

Active Desks v1.0 proved the core product loops (Daily 3 Anchors, Reading Nook, Kitchen Shelf, Fiber Arts, Game Rig, Tech Workbench, and Universal Capture). However, its implementation relied on an ad-hoc architecture: a single 3,000-line monolithic script (`app.js`), blocking `localStorage`, and Git commits over the GitHub REST API acting as a pseudo-database. This created deployment fragility, race conditions, and CI/CD rebuild storms.

**Active Desks v2.0** rebuilds the application from the ground up as a legitimate, shareable, single-user standalone application. It requires zero cloud infrastructure maintenance from the creator, incurs \$0.00 in hosting or server costs, operates 100% offline-first, preserves the refined 4-workbench concentration architecture with zero data loss dormancy, and gives users flexible, private synchronization options.

---

## 2. Core Architectural Pillars

### 1. Pure Vanilla ES6+ & Native Modules (Zero-Build)
* **No Build Pipelines**: Zero Node.js runtime, Webpack, Vite, npm scripts, or frontend framework dependencies.
* **Native ES Modules**: Written using standard browser `<script type="module">` syntax (`import` / `export`). Modules load asynchronously and natively in all modern browsers.
* **Component Sizing**: No single file exceeds ~250–350 lines, maximizing maintainability and drastically reducing AI context consumption.

### 2. Local-First Asynchronous Storage (`IndexedDB`)
* **Deprecate `localStorage`**: Replace blocking, 5MB-limited `localStorage` with native browser `IndexedDB`.
* **Zero UI Lag**: All reads/writes happen asynchronously off the main UI thread.
* **Structured Data**: Stores rich JSON objects, binary images, and capture payloads without serialized `JSON.stringify`/`JSON.parse` overhead.
* **Indexed Queries**: Fast domain and topic filtering directly via database indexes (e.g., query captures where `domain === 'recipe'`).

### 3. Decoupled Code vs. Data Lifecycles
* **Static Asset Hosting**: Application code is hosted as a static Progressive Web App (GitHub Pages, Cloudflare Pages, or local web server). Code deploys *only* when application features change.
* **Zero CI/CD Rebuild Storms**: User data updates (incrementing rows, toggling anchors, rotating active desks, capturing thoughts) **never** trigger repository commits or site rebuilds.

### 4. 4-Workbench Concentration & Zero Data Loss Dormancy
* **4-Desk Focus Cap**: The main dashboard strictly caps active rendering to **4 workbenches** in a 2x2 grid (`state.activeDeskIds`) to preserve intentional focus on mobile and desktop.
* **Pluggable Workbench Registry**: Unlimited registered workbenches (e.g. Reading, Kitchen, Game Rig, Fiber Arts, Tech, plus future user-defined desks).
* **Dormancy with Zero Data Loss**: Swapping a desk out into dormancy leaves its state (counters, reading page, active quests, backlog trays) intact in IndexedDB.
* **Contextual Projection Trays**: Desks pull domain-specific backlogs dynamically from the capture stream (e.g. `captures` where `domain === 'book'` or `'tech'`) with 1-tap `Set Active` triggers.

### 5. Multi-Domain Capture Intelligence & Universal 3-Tier Schema
* **Equal Footing Across Domains**: Captures are no longer treated as a "recipe inbox with thoughts attached." Recipes, books, games, tech CAD/repos, fiber patterns, and notes share an equal, first-class intake stream.
* **Polymorphic / Adaptive Document Schema**: Avoids brittle, domain-specific column schemas. All captures in `IndexedDB` follow a single, universal 3-tier envelope that cleanly represents any link, listicle, or thought without breaking:
  - **Tier 1: Core Envelope (Uniform across all items)**:
    - `id`, `domain` (`tech` | `book` | `game` | `recipe` | `fiber` | `misc`), `topic`, `title`, `summary`, `creator`, `sourceUrl`, `createdAt`, `status`.
  - **Tier 2: Universal Meta Badges (Key-Value Array)**:
    - Array of `{ label, value }` rendering as neat glassmorphic pills in the detail modal (e.g. `Author: Brandon Sanderson`, `Yield: 10 Servings`, `Platform: Steam`, `Category: Dev Tools`).
  - **Tier 3: Adaptive Body (Strictly 3 Universal Shapes)**:
    - `body.format: "collection"`: For listicles, curated toolkits (e.g. 10 GitHub URL tricks), multi-book reading lists, or multi-part setups (`items: [{ title, subtitle, detail }]`).
    - `body.format: "guide"`: For recipes, 3D print guides, crafting workflows (`checklist: [...]`, `steps: [...]`).
    - `body.format: "note"`: For single books, games, thoughts, or ungrounded links (`takeaways: [...]`, `highlight: "..."`).
* **UI & Rendering Simplicity**: `js/captures/drawer.js` only requires 3 small rendering templates corresponding to the 3 body formats, preventing bloated modal code and eliminating AI schema hallucinations.

---

## 3. Modular Codebase Architecture (Native ES Modules)

```text
active-desks-v2/
├── index.html                  # Minimal HTML shell + Modal templates
├── styles.css                  # CSS custom properties, glassmorphism, responsive grid
├── manifest.json               # PWA configuration
├── sw.js                       # Network-First Service Worker
├── js/
│   ├── app.js                  # Entry point; bootstrapper & event wiring (~150 lines)
│   ├── db.js                   # IndexedDB wrapper (CRUD, stores, indexes) (~200 lines)
│   ├── state.js                # In-memory reactive state manager & observer bus (~200 lines)
│   ├── sync/
│   │   ├── sync-manager.js     # Unified sync orchestrator & debounce engine (~180 lines)
│   │   ├── drive-provider.js   # Google Drive AppData REST sync provider (~220 lines)
│   │   └── p2p-provider.js     # WebRTC / Local peer-to-peer encrypted provider (~250 lines)
│   ├── desks/
│   │   ├── desk-manager.js     # 4-workbench rotation, swapping modal & dormancy (~180 lines)
│   │   ├── anchors.js          # Daily 3 rhythm tracker (~120 lines)
│   │   ├── reading.js          # Reading Nook & StoryGraph tracking (~180 lines)
│   │   ├── kitchen.js          # Recipe shelf, metrics & modal (~220 lines)
│   │   ├── gaming.js           # Active playthrough & backlog (~140 lines)
│   │   ├── fiber.js            # WIP row counter & project specs (~140 lines)
│   │   └── tech.js             # 3D printing, CAD & dev tools workbench (~150 lines)
│   ├── captures/
│   │   ├── capture-dock.js     # Universal bottom dock & quick intake (~150 lines)
│   │   ├── drawer.js           # Stream drawer, 2-tier filtering & detail modal (~250 lines)
│   │   └── taxonomy.js         # Client-side Rule of 3/5 clustering heuristics (~160 lines)
│   └── ai/
│       └── gemini-client.js    # Client-side Gemini API client (BYOK) with Search Grounding (~200 lines)
└── assets/
    └── icons/                  # PWA SVGs and icons
```

---

## 4. Multi-Tier Synchronization Options (User-Selectable)

Users choose their sync method in **Settings $\rightarrow$ Device Sync**:

```text
┌────────────────────────────────────────────────────────┐
│  Choose Your Sync Method                               │
│                                                        │
│  ○ Google Drive Sync (Recommended)                     │
│    Syncs across phone and PC anytime via your personal │
│    Google account. Always up-to-date even if devices   │
│    are asleep.                                         │
│    [ Connect Google Drive ]                            │
│                                                        │
│  ○ Private Local Sync (Peer-to-Peer)                   │
│    Zero cloud. Syncs directly between your devices     │
│    over Wi-Fi using end-to-end encryption.             │
│    [ Pair with QR Code ]                               │
│                                                        │
│  ○ Offline Only                                        │
│    Keep all data strictly on this device.              │
└────────────────────────────────────────────────────────┘
```

### Option A: Google Drive AppData Sync (Asynchronous)
* **Mechanism**: Uses the Google Drive REST API with `https://www.googleapis.com/auth/drive.appdata` scope.
* **Security & Privacy**: The app only has access to a hidden configuration folder inside the user's personal Google Drive. It cannot see personal files, photos, or documents.
* **Workflow**:
  1. Local edit occurs $\rightarrow$ saved to `IndexedDB` immediately (0ms).
  2. Debounce timer (2.5 seconds) triggers in background.
  3. Uploads compressed `active-desks-state.json` with revision timestamp.
  4. Any other active device compares remote vs. local revision timestamps and quietly merges updates.
* **Hosting Cost**: \$0.00 (managed entirely by user's personal Google account).

### Option B: Local Peer-to-Peer Sync (WebRTC & Web Crypto)
* **Mechanism**: Uses native browser WebRTC DataChannels paired with local Web Crypto API (AES-GCM 256-bit).
* **Setup**: One-time QR scan. PC generates a pairing payload containing ephemeral room coordinates and encryption key. Mobile scans QR code; keys persist to `IndexedDB`.
* **Workflow**:
  1. Whenever both devices are open on the same local network or internet connection, they open a direct, encrypted data tunnel.
  2. Incremental changes sync device-to-device.
  3. No central database holds user data.
* **Hosting Cost**: \$0.00.

### Option C: Standalone Manual Backup
* **One-Click Export/Import**: Users can download a full timestamped JSON backup at any time or restore an existing backup file.
* **File System Access API**: On supported desktop browsers, allows saving directly to a local directory or Obsidian vault folder.

---

## 5. Client-Side Multimodal Intelligence (Bring-Your-Own-Key)

In v1.0, data extraction was originally conceived around food reels and recipes, which required a cloud-hosted GitHub Actions runner with `yt-dlp` and `ffmpeg`. In v2.0, capture intake is generalized equally across all supported domains: intelligence is handled client-side or via direct API calls:

* **Direct Gemini Client (BYOK & Graceful Degradation)**:
  * Users enter their Google Gemini API key once in settings (stored securely in `IndexedDB`).
  * **Configurable Web Search Grounding**: Includes a toggle checkbox in Settings:
    ```text
    ☑ Enable Live Web Search Grounding
      Allows Gemini to look up books, Steam games, CAD specs, and creator recipes from web links.
      (Requires a Gemini API key with billing linked; first 5,000 searches/mo are free).
    ```
  * **Graceful Degradation**:
    - **Checked / Billing-Enabled Key**: Gemini utilizes the `google_search` grounding tool to scrape creator blogs, metric gram weights, Goodreads/StoryGraph book blurbs, Steam game genres, and 3D printing tolerances automatically.
    - **Unchecked / Pure Free-Tier Key**: Automatically bypasses the `google_search` tool to prevent API errors. Operates on local link metadata, user prompt context, and linkless raw thought classification cleanly.
  * Eliminates the old recipe-only bias: books extract blurbs, authors, series, and reading lists; games extract platforms, genres, and quest goals; tech extracts repos, CAD/3D specs, and tools; recipes extract ingredients, grams, and instructions.
* **3-Stage Capture Intake & Taxonomy Pipeline**:
  * **Stage 1: Primary Attempt (Gemini with Search Grounding Active)**:
    - Executes full web-grounded multimodal extraction.
    - Fits extracted data into the **Universal 3-Tier Schema** (`collection`, `guide`, or `note`).
    - Produces a genuine, content-verified **`[Domain] · [Topic]`** (e.g. `[Book] · LitRPG`, `[Tech] · Developer Tools`, `[Recipe] · Sourdough`) with complete payload specs.
    - Media badge: `🎬 Video & Audio Analyzed` or `📚 Text & Images`.
  * **Stage 2: Standard Gemini Attempt (Free-Tier API Key / Non-Grounded — Strict Anti-Hallucination Scope)**:
    - **Zero Invention Policy**: Gemini is strictly prohibited from inventing recipes, ingredients, measurements, plot summaries, or specs. If data is not explicitly written in the user's note or URL string, it must remain `null`.
    - **Adaptive Body Default**: Automatically populates `body.format: "note"` with verified facts only.
    - **Allowed Scope on Intake**:
      1. Strips tracking parameters, affiliate tags, and URL bloat (`?utm_source=...`).
      2. For URLs with user notes: extracts title and broad macro-domain (`book`, `game`, `tech`, `recipe`, `fiber`).
      3. For linkless raw thoughts: parses raw notes into clean titles and domains.
    - **Strict Topic Rule**: The sub-topic is **strictly assigned `Link`** (e.g. `[Book] · Link` or `[Tech] · Link`).
    - **Status Notice**: Displays a clear in-card note: *"This link was not searched against."*
  * **Stage 3: Explicit Fallback (Offline / No API Key Configured)**:
    - Operates purely offline without any external network calls.
    - Body strictly defaults to `body.format: "note"` with raw link text.
    - Categorization is strictly marked as **`[Unchecked] · [Link]`** (or matched against well-known static domains to `[Domain] · [Link]`).
    - Status Notice: Displays: *"This link was not searched against."*
  * **Context-Aware `[ 🔄 Analyze ]` Button Rule**:
    - The `[ 🔄 Analyze ]` button **ONLY renders if**:
      1. The capture's topic is currently `Link` or `Unchecked`, **AND**
      2. The user has an active Gemini API key configured in Settings.
    - If no API key exists, the button is completely hidden to prevent user confusion, dead clicks, or unwanted setup prompts.
  * **Unified Media Classification Badges**:
    - `🎬 Video & Audio Analyzed` (`video_extracted` via companion or direct stream)
    - `🎙️ Voiceover Audio Verified` (`audio_extracted`)
    - `📚 Text & Images` (`text_images` for photo carousels, articles, blogs)
    - `⚠️ Video Skipped (Text Fallback)` (`fallback_text` with 1-tap in-app retry)
    - `📌 Link Only` (`fallback_link` indicating the link was not searched against; conditionally shows `[ 🔄 Analyze ]` if an API key is present)
* **Lightweight Desktop Companion (Optional)**:
  * For power users wanting local video frame parsing, an optional zero-dependency local Node/Python script can run in the background to handle `yt-dlp` if desired, communicating with the PWA over localhost WebSocket.

---

## 6. Service Worker Strategy & Cache Invalidation

Replace the problematic `stale-while-revalidate` cache trap with a reliable strategy based on *Jake Archibald's Offline Cookbook*:

* **Application Shell (`index.html`, `styles.css`, `js/**`)**:
  * **Network-First with Cache Fallback**: When connected, always fetch fresh assets immediately. If offline, instantly serve the cached bundle.
  * Eliminates version skew and the need to manually increment version numbers (`active-desks-v50`) in code.
* **Data Requests (`drive.googleapis.com`, WebRTC, Gemini API)**:
  * Completely bypassed by the Service Worker; managed strictly by application logic and `IndexedDB`.

---

## 7. Migration Roadmap (v1.0 $\rightarrow$ v2.0)

1. **Phase 1: Database & Storage Engine**
   * Implement `js/db.js` with IndexedDB stores: `desks`, `captures`, `anchors`, `settings`.
   * Create automated v1.0 `localStorage` importer to migrate existing reading progress, row counts, tech goals, and captures seamlessly.
2. **Phase 2: Modular UI Shell & Workbench Swapping**
   * Convert `app.js` into modular components under `js/desks/` and `js/captures/`.
   * Implement `desk-manager.js` for the 4-workbench concentration rule and `#swap-desk-modal`.
   * Wire components to reactive state manager (`js/state.js`).
3. **Phase 3: Sync Engine Implementation**
   * Build `drive-provider.js` with Google Drive AppData OAuth integration.
   * Build `p2p-provider.js` with WebRTC DataChannel pairing.
   * Implement conflict resolution (Last-Write-Wins based on field-level ISO timestamps).
4. **Phase 4: Service Worker Hardening & PWA Audit**
   * Refactor `sw.js` to Network-First.
   * Verify zero-bloat Lighthouse audit (100 Performance, 100 PWA, 100 Best Practices).
