# Extraction Playbook: Bypassing Social Media Login Walls

Instagram Reels cannot be fetched directly using client-side or unauthorized HTTP requests due to login walls and JavaScript hydration shells. Use this multi-tiered playbook to reliably obtain recipe ingredients, exact gram measurements, and instructions.

---

## Tier 1: The Reel Shortcode Query
Extract the 11-character alphanumeric shortcode from the reel URL:
- Example URL: `https://www.instagram.com/reel/DcbhSQLNA4N/`
- Shortcode: `DcbhSQLNA4N`

Run ripgrep or web searches for:
1. `"<shortcode>"` (e.g. `"DcbhSQLNA4N"`) on DuckDuckGo / Bing.
2. Instagram aggregators, repost mirrors, and Facebook video mirrors often index the full caption verbatim.

---

## Tier 2: Creator Cross-Platform Search
Food content creators almost always cross-post to multiple platforms and maintain a central link hub:
1. **TikTok Mirror**:
   - Query: `site:tiktok.com "@<creator_handle>" <recipe keywords>`
   - TikTok captions often list the ingredients in the description or comments.
2. **YouTube Shorts / Community**:
   - Query: `site:youtube.com "<creator name>" <recipe keywords>`
   - YouTube video descriptions typically have the complete un-truncated ingredient list.
3. **Pinterest / Lemon8**:
   - Creators upload rich pins with ingredient cards and high-res steps.

---

## Tier 3: Creator's Food Blog & Linkinbio (Gold Standard)
Bakers and meal prep creators (e.g., @obsessedwithcashews, @amybakesbread, @stealth_health_life) publish the full, high-precision recipes on their websites with metric gram weights:
1. Search for the creator's website:
   - Query: `"<creator handle>" website` or `"<creator handle>" blog`
2. Fetch the recipe post on their website:
   - Contains exact metric grams, oven temperatures, pan dimensions, and chef tips.
   - Example: `obsessedcakes.com/recipes/chocolate-chip-cookie-donut-loaf`

---

## Tier 4: Gemini Multimodal Audio/Visual Extraction
If the caption is brief and only says *"Full recipe on my site / in video"*:
1. Use Bing / DuckDuckGo video search or direct video fetch to find video transcripts.
2. If text was on-screen in the video, transcribe on-screen text overlays for measurements.
