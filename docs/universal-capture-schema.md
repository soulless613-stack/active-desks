# Active Desks v2.0 — Universal Capture Document Schema

> **Standard**: Polymorphic 3-Tier Document Envelope  
> **Storage Target**: IndexedDB (`captures` object store)  
> **Primary Use**: Normalizes diverse web captures (recipes, book listicles, developer tools, CAD specs, and raw thoughts) into a single, predictable structure with zero schema breakage.

---

## 1. High-Level Architecture Overview

Instead of maintaining brittle domain-specific tables (which break whenever a user captures an unpredicted content type), every capture record adheres to a **3-Tier Universal Envelope**:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Tier 1: Core Envelope                                           │
│ (id, domain, topic, title, summary, creator, sourceUrl, dates)  │
├─────────────────────────────────────────────────────────────────┤
│ Tier 2: Universal Meta Badges                                   │
│ Array of { label, value } (Platform, Author, Yield, Category)   │
├─────────────────────────────────────────────────────────────────┤
│ Tier 3: Adaptive Body (Strictly One of Three Shapes)            │
│                                                                 │
│   ├── Shape A: "collection" (Listicles, Multi-Tools, Backlogs)  │
│   │   └── items: [{ title, subtitle, detail, linkUrl }]         │
│   │                                                             │
│   ├── Shape B: "guide" (Recipes, 3D Print Guides, Workflows)    │
│   │   ├── checklist: [{ text, checked }]                        │
│   │   └── steps: [{ stepNumber, instruction }]                  │
│   │                                                             │
│   └── Shape C: "note" (Single Books, Games, Raw Thoughts)       │
│       ├── takeaways: [ string ]                                 │
│       └── highlight: string | null                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. TypeScript / JSDoc Type Definition

```typescript
/** Valid macro-domains across Active Desks */
export type CaptureDomain =
  | 'tech'
  | 'book'
  | 'game'
  | 'recipe'
  | 'fiber'
  | 'home'
  | 'finance'
  | 'writing'
  | 'misc'
  | 'link';

/** Media and processing audit state */
export type CaptureMediaStatus =
  | 'video_extracted' // Gemini OCR + Audio voiceover analyzed
  | 'audio_extracted' // Audio track voiceover analyzed
  | 'text_images'     // Static photo carousels, blogs, articles
  | 'fallback_text'   // Video download throttled/skipped; search fallback used
  | 'fallback_link';  // Link was not searched; broad domain or unindexed

export interface MetaBadge {
  label: string;      // e.g. "Author", "Platform", "Yield", "Category"
  value: string;      // e.g. "Frank Herbert", "Steam / PC", "10 Slices"
}

/** Shape A: Curated collections, tool lists, book series */
export interface CollectionBody {
  format: 'collection';
  items: Array<{
    title: string;          // e.g. "GitReverse"
    subtitle?: string;      // e.g. "github.com -> gitreverse.com"
    detail: string;        // e.g. "Reverse-engineers repo into AI build prompt."
    linkUrl?: string;       // Direct target link if different from sourceUrl
  }>;
}

/** Shape B: Recipes, 3D print parameters, step-by-step guides */
export interface GuideBody {
  format: 'guide';
  checklist: Array<{
    section?: string;       // e.g. "Dough" or "Streusel" (optional)
    text: string;           // e.g. "500g bread flour"
    checked: boolean;       // Interactive state in UI modal
  }>;
  steps: Array<{
    stepNumber: number;     // 1, 2, 3...
    instruction: string;    // e.g. "Bulk ferment at 78°F for 2 hours."
  }>;
}

/** Shape C: Single books, games, ungrounded links, raw thoughts */
export interface NoteBody {
  format: 'note';
  takeaways?: string[];     // Bullet points or key lessons
  highlight?: string;       // Memorable quote, premise, or active starter quest
}

/** The Master Universal Capture Record */
export interface UniversalCapture {
  // Tier 1: Core Envelope
  id: number;               // Timestamp Unix Epoch (e.g. 1793056385577)
  domain: CaptureDomain;
  topic: string;            // Micro-context (e.g. "Developer Tools", "LitRPG", "Link")
  title: string;
  summary: string;          // 1-2 sentence core digest
  creator: string | null;   // e.g. "@louis_rlee", "Brandon Sanderson", null
  sourceUrl: string | null; // Canonical web link or null for raw thoughts
  createdAt: string;        // ISO 8601 string (e.g. "2026-10-27T04:28:00.000Z")
  status: 'processed' | 'pending';
  mediaStatus: CaptureMediaStatus;
  searchPerformed: boolean; // True if Google Search Grounding was active

  // Tier 2: Universal Meta Badges
  meta: MetaBadge[];

  // Tier 3: Adaptive Body
  body: CollectionBody | GuideBody | NoteBody;
}
```

---

## 3. Concrete Production Examples

### Example 1: Developer Tools Collection (Shape A: `collection`)
*Referenced from `docs/github-url-adjustments.md`*

```json
{
  "id": 1793056385577,
  "domain": "tech",
  "topic": "Developer Tools",
  "title": "10 GitHub Domain Shortcuts & URL Swaps",
  "summary": "Single-word URL adjustments for exploring GitHub repositories without cloning.",
  "creator": "@louis_rlee",
  "sourceUrl": "https://www.instagram.com/reel/De7WIcEogeo/",
  "createdAt": "2026-10-27T04:28:00.000Z",
  "status": "processed",
  "mediaStatus": "text_images",
  "searchPerformed": true,
  "meta": [
    { "label": "Category", "value": "Developer Utilities" },
    { "label": "Format", "value": "10 Shortcuts" },
    { "label": "Scope", "value": "Browser-Only" }
  ],
  "body": {
    "format": "collection",
    "items": [
      {
        "title": "GitReverse",
        "subtitle": "github.com -> gitreverse.com",
        "detail": "Reverse-engineers repository into an AI prompt to rebuild it."
      },
      {
        "title": "GitDiagram",
        "subtitle": "github.com -> gitdiagram.com",
        "detail": "Visual component flowchart and interactive architecture map."
      },
      {
        "title": "GitIngest",
        "subtitle": "github.com -> gitingest.com",
        "detail": "Token-optimized flat text digest for ChatGPT/Claude context."
      },
      {
        "title": "GitHub1s",
        "subtitle": "github1s.com",
        "detail": "Fast, read-only VS Code browser viewer."
      },
      {
        "title": "GitHub.dev",
        "subtitle": "Press '.' on repo",
        "detail": "Official web-based VS Code editor with commit/PR support."
      }
    ]
  }
}
```

---

### Example 2: Recipe / 3D Print Workflow (Shape B: `guide`)

```json
{
  "id": 1793056499120,
  "domain": "recipe",
  "topic": "Sourdough",
  "title": "Cheesy Garlic Sourdough Focaccia",
  "summary": "Crispy, bubbly sourdough focaccia loaded with herb-tossed cheeses and garlic butter.",
  "creator": "Amy Coyne (@amybakesbread)",
  "sourceUrl": "https://www.instagram.com/reel/DE23ak3pGsq/",
  "createdAt": "2026-10-27T04:30:00.000Z",
  "status": "processed",
  "mediaStatus": "video_extracted",
  "searchPerformed": true,
  "meta": [
    { "label": "Yield", "value": "16 Slices (9x13 Pan)" },
    { "label": "Calories", "value": "349 kcal" },
    { "label": "Protein", "value": "14g" },
    { "label": "Carbs", "value": "33g" },
    { "label": "Fat", "value": "17g" }
  ],
  "body": {
    "format": "guide",
    "checklist": [
      { "section": "Dough", "text": "100g active sourdough starter", "checked": false },
      { "section": "Dough", "text": "425g warm water", "checked": false },
      { "section": "Dough", "text": "500g bread flour", "checked": false },
      { "section": "Dough", "text": "13g fine sea salt", "checked": false },
      { "section": "Cheese", "text": "150g shredded mozzarella cheese", "checked": false },
      { "section": "Garlic Butter", "text": "35g melted butter + 2 cloves minced garlic", "checked": false }
    ],
    "steps": [
      { "stepNumber": 1, "instruction": "Whisk starter, warm water, and flour into a shaggy dough. Rest 30 mins." },
      { "stepNumber": 2, "instruction": "Perform 4 coil folds at 30-minute intervals, folding cheeses in on fold #2." },
      { "stepNumber": 3, "instruction": "Transfer into oiled 9x13 metal pan, proof 3-5 hours until jiggly, dimple deeply." },
      { "stepNumber": 4, "instruction": "Bake at 425°F for 25-30 mins until golden and bubbling." }
    ]
  }
}
```

---

### Example 3: Fallback / Ungrounded Intake (Shape C: `note`)

```json
{
  "id": 1793056588211,
  "domain": "book",
  "topic": "Link",
  "title": "Dune Messiah",
  "summary": "This link was not searched against.",
  "creator": null,
  "sourceUrl": "https://thestorygraph.com/books/a9128fe2",
  "createdAt": "2026-10-27T04:32:00.000Z",
  "status": "processed",
  "mediaStatus": "fallback_link",
  "searchPerformed": false,
  "meta": [
    { "label": "Status", "value": "Unsearched Link" },
    { "label": "Domain Matched", "value": "The StoryGraph" }
  ],
  "body": {
    "format": "note",
    "takeaways": [
      "Captured from browser without Search Grounding.",
      "Click [ 🔄 Analyze ] to run deep web extraction if Gemini API key is configured."
    ],
    "highlight": null
  }
}
```

---

## 4. UI Rendering Contracts

The client-side drawer (`js/captures/drawer.js`) enforces the following rendering rules:

1. **Card Display (Dashboard & Drawer View)**:
   - Always displays `title`, `summary`, `[domain] · [topic]` badge, and `mediaStatus` pill.
   - If `body.format === 'collection'`, displays a badge: `📦 ${body.items.length} Items`.
   - If `body.format === 'guide'`, displays a badge: `📋 Guide (${body.checklist.length} items)`.
   - Never overflows card height.

2. **Detail Modal (`#capture-detail-modal`)**:
   - Header renders `meta` badges as glassmorphic pills.
   - Evaluates `body.format`:
     - **`collection`**: Renders item cards or quick reference tables with copy/link triggers.
     - **`guide`**: Renders interactive checkbox list (`toggleChecklist(idx)`) followed by numbered step boxes.
     - **`note`**: Renders bulleted takeaways and styled highlight quote block.
