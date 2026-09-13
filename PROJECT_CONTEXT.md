# Active Desks & Reading Automation — Project Context & Handoff

> **For Antigravity 2.0 Agent**: Read this document first to get up to speed on the user's project, current architecture, recent implementation decisions, and pending tasks.

---

## 1. Project Overview & Infrastructure

* **Project Name**: Active Desks
* **Location**: [`c:/Users/chris/Documents/antigravity/active-desks`](file:///c:/Users/chris/Documents/antigravity/active-desks)
* **Parent Workspace**: [`c:/Users/chris/Documents/antigravity`](file:///c:/Users/chris/Documents/antigravity)
* **Live GitHub Pages URL**: [https://soulless613-stack.github.io/active-desks/](https://soulless613-stack.github.io/active-desks/)
* **GitHub Repository**: [https://github.com/soulless613-stack/active-desks](https://github.com/soulless613-stack/active-desks)
* **Local Git Branch**: `main` (clean, synchronized with `origin/main`)

### Technology Stack
* **Architecture**: Mobile-first Progressive Web App (PWA) with offline capabilities.
* **Core Code**: Vanilla HTML5, modern CSS3 (glassmorphic dark UI, CSS variables), Vanilla JavaScript (ES6 reactive state manager). Zero external runtime dependencies.
* **PWA Assets**:
  * [`manifest.json`](file:///c:/Users/chris/Documents/antigravity/active-desks/manifest.json) — App metadata and icons for home screen installability.
  * [`sw.js`](file:///c:/Users/chris/Documents/antigravity/active-desks/sw.js) — Service worker caching assets for offline use.
  * [`serve.ps1`](file:///c:/Users/chris/Documents/antigravity/active-desks/serve.ps1) — Local zero-dependency PowerShell static web server.

---

## 2. Implemented Features in Active Desks

1. **Daily 3 Anchors (Top Banner)**:
   * Tracks daily rhythms: **Home** (Family/Chores), **Body** (Walk/Workout), **Spark** (Hobbies/Audiobook).
   * Tap to mark complete; non-guilt daily auto-reset based on local calendar day.
2. **Kitchen & Recipe Shelf Desk**:
   * Replaced previous D&D section with user's saved Instagram cooking reels.
   * Modals with interactive ingredient checklist and step-by-step instructions.
   * Recipes housed in [`active-desks/recipes/`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/):
     - [`butter-chicken-mac-n-cheese.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/butter-chicken-mac-n-cheese.md)
     - [`crispy-potato-meatballs.md`](file:///c:/Users/chris/Documents/antigravity/active-desks/recipes/crispy-potato-meatballs.md)
3. **Fiber Arts Desk**:
   * Knitting WIP tracker (US 7 / 4.5mm needles, worsted yarn).
   * Large, thumb-friendly `+` and `−` row counter.
4. **Reading Nook Desk**:
   * Currently tracks *Dune Messiah* audiobook (Ch. 8 of 24 progress bar).
5. **Game Rig Desk**:
   * Current game: *Baldur's Gate 3* with active quest tracker and wiki quick-link.
6. **Quick Capture Bar (Sticky Bottom)**:
   * Fast brain-dump input field storing stray thoughts into local storage.

---

## 3. Reading Log & StoryGraph Integration: Research & Decisions

### The Goal
The user reads on their **Google Pixel (Android)** using the **Kindle app** (with Assistive Reader / TTS) and listens to **Audible**, and wants their reading logs and progress tracked in **The StoryGraph**.

### Technical Realities & Constraints
1. **No Public APIs**: Neither StoryGraph nor Amazon/Kindle provides a public write/sync API for real-time progress syncing.
2. **Where Data Lives**:
   * **Kindle Books & Dates**: Visible in [Amazon Manage Your Content](https://www.amazon.com/hz/mycd/digital-console/contentlist/booksAll/dateDsc/) and [Amazon Reading Insights](https://www.amazon.com/kindle/reading/insights).
   * **Audible Library**: Can be exported via the free [Audible Library Extractor](https://audible-library-extractor.github.io/) browser extension to CSV.
   * **Granular Minutes/Pages**: Amazon only records exact reading minutes in its backend telemetry database, exportable via [Amazon Privacy Data Request](https://www.amazon.com/hz/privacy-central/data-requests/preview.html) (`Kindle.ReadingSession.csv`). StoryGraph does not accept historical minute backfills anyway—it imports books, dates finished, and ratings.

### Android Automation Solution (Google Pixel)
To solve the issue of getting interrupted while reading/listening on Android, the user is configuring **MacroDroid** on their Pixel:

1. **Trigger 1: Kindle App Closed / Swiped Away**
   * *Trigger*: Applications $\rightarrow$ Application Closed $\rightarrow$ Kindle.
   * *Action*: Show notification or open The StoryGraph (`https://app.thestorygraph.com/currently-reading`).
2. **Trigger 2: Assistive Reader Paused / Interrupted**
   * *Trigger*: Media $\rightarrow$ **Music/Sound Playing** $\rightarrow$ **Music / Sound Stopped Playing** (or **Media Button Pressed** $\rightarrow$ Play/Pause).
   * *Constraint*: Applications $\rightarrow$ Application Running in Foreground or Background $\rightarrow$ **Kindle** (prevents triggering when pausing Spotify/YouTube).
   * *Action*: Display high-priority notification: `"📖 Reading Paused — Interrupted? Tap to log progress in StoryGraph"`.

---

## 4. Pending / Next Steps for Antigravity 2.0

1. **Upgrade Active Desks Reading Nook**:
   * Add a 1-tap **"📖 Open Kindle"** launcher button.
   * Add a 1-tap **"📊 Log to StoryGraph"** button deep-linking directly to `https://app.thestorygraph.com/currently-reading`.
   * Support toggling between active **Kindle Book** and **Audible Audiobook**.
2. **Sync Code & Push**:
   * Verify changes locally, commit to git, and push to GitHub so GitHub Pages automatically updates for the user's phone.
3. **MacroDroid Assistance**:
   * Confirm the user's MacroDroid trigger on their Pixel is working smoothly for the Assistive Reader pause state.
