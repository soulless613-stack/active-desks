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
      targetRows: 120,
      specs: 'US 7 (4.5mm) • DK Weight',
      linkText: 'Open Ravelry',
      linkUrl: 'https://www.ravelry.com',
      lastUpdated: null
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
          blogUrl: "https://obsessedcakes.com/recipes/chocolate-chip-cookie-donut-loaf",
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
          blogUrl: "https://12tomatoes.com/viral-donut-bread-pudding/",
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
        },
        {
          id: 'creamy-one-pot-garlic-herb-pasta',
          title: "15-Minute Creamy One-Pot Garlic Herb Pasta",
          source: "Mariam (@baiti_ana)",
          url: "https://www.instagram.com/reel/DdWrPaJA6Bb/",
          yield: "4 Servings (Quick Weeknight Meal)",
          calories: "670 kcal",
          protein: "15g",
          carbs: "50g",
          fat: "47g",
          highlight: "Velvety, rich one-pot pasta where dry noodles cook directly in broth and cream with herbs and mozzarella for zero strainer cleanup.",
          ingredients: [
            "250g (about 3 cups) dry pasta (penne, rotini, or rigatoni)",
            "360ml (1 1/2 cups) whipping cream (or heavy cream)",
            "360ml (1 1/2 cups) chicken broth (or water + 1 chicken bouillon cube)",
            "16g (1 tbsp) tomato paste",
            "60g (1/4 cup) garlic & herbs cream cheese (or grated Parmesan)",
            "28g (2 tbsp) butter (or olive oil)",
            "1/2 tsp fine sea salt",
            "1/4 tsp black pepper",
            "1/4 tsp chili flakes (to taste)",
            "1 tsp dried oregano",
            "1 tsp garlic powder",
            "60g (1/2 cup) shredded mozzarella cheese",
            "2 tbsp fresh parsley, chopped"
          ],
          steps: [
            "Add dry pasta, butter, tomato paste, garlic & herb cream cheese, salt, pepper, chili flakes, oregano, garlic powder, broth, and cream into a single pot. Ensure pasta is submerged.",
            "Cover with lid and bring to a bubble over medium-high heat. Reduce to low and simmer covered for ~15 mins until pasta is tender and sauce is rich.",
            "Stir thoroughly, top evenly with mozzarella and parsley, cover for 2–3 mins until cheese melts, and serve warm!"
          ]
        },
        {
          id: 'viral-korean-salt-bread',
          title: "Viral Korean Salt Bread (Sogeum-ppang)",
          source: "Erin's Cozy Kitchen (@erins_cozykitchen)",
          url: "https://www.instagram.com/reel/DQRzg3MDnma/?vrfl=M25meXIxYjk2dzY4",
          yield: "12 Rolls",
          calories: "245 kcal",
          protein: "5g",
          carbs: "32g",
          fat: "11g",
          highlight: "Crispy and buttery golden bottom, pillowy soft crumb, and a signature hollow buttery center rolled with cold salted butter.",
          ingredients: [
            "400g (3 1/3 cups) bread flour",
            "120g (1 cup) cake flour",
            "365ml (1 1/2 cups + 1 tbsp) cold water",
            "25g (2 tbsp) granulated sugar",
            "10g (1 3/4 tsp) fine sea salt",
            "25g (1/4 cup) nonfat dry milk powder",
            "40g (3 tbsp) cold unsalted butter",
            "7g (2 1/4 tsp) instant yeast",
            "12 pieces cold salted butter (about 14g / 1 tbsp each)",
            "1 tbsp coarse flaky sea salt (Maldon), for sprinkling"
          ],
          steps: [
            "Whisk bread flour, cake flour, sugar, salt, milk powder, and instant yeast in a bowl. Add cold water and mix into a dough.",
            "Add cold unsalted butter and knead vigorously for 8–10 minutes until smooth, glossy, and elastic.",
            "Cover and let rise in a warm spot until doubled in volume (approx. 60 minutes).",
            "Divide dough into 12 equal portions (~78g each), shape into balls, and rest covered for 15 minutes.",
            "Roll each portion into a tapered cone, then roll flat into a long 12-inch triangle.",
            "Place a piece of cold salted butter at the wide base and roll up tightly toward the narrow tip into a crescent roll.",
            "Place rolls seam-side down on a parchment-lined baking sheet and proof until puffy (45–60 minutes).",
            "Preheat oven to 450°F (230°C). Mist rolls lightly with water and sprinkle flaky sea salt on top.",
            "Reduce oven immediately to 400°F (200°C) and bake for 12–15 minutes until tops are golden and the butter pools sizzle to fry the bottom crust.",
            "Rest 5 minutes on a wire rack and serve warm to experience the crispy bottom and buttery hollow center!"
          ]
        },
        {
          id: 'classic-syracuse-salt-potatoes',
          title: "Classic Syracuse Salt Potatoes",
          source: "Home Cook (@instagram)",
          url: "https://www.instagram.com/reel/DJ5DABYxHug/?obrf=cWpmaHFscnB4aGhp",
          yield: "6 Servings",
          calories: "250 kcal",
          protein: "3g",
          carbs: "27g",
          fat: "15g",
          highlight: "Boiled in a concentrated brine, whole baby potatoes develop an extraordinarily creamy interior encased in a paper-thin, delicate salt crust. Dipped directly into warm melted butter, they deliver an irresistible contrast of rich butterfat and earthy sweetness.",
          ingredients: [
            "907g (2 lbs) bite-sized baby potatoes (such as baby Yukon Gold or small red potatoes), unpeeled and whole",
            "290g (1 cup) fine sea salt",
            "1890ml (8 cups) water",
            "113g (1/2 cup) unsalted butter, melted",
            "2g (1 tbsp) fresh chives, finely chopped"
          ],
          steps: [
            "Rinse the baby potatoes thoroughly under cool running water, checking that their skins remain intact with no cuts or punctures so the interior stays creamy rather than overly salty.",
            "In a large pot, combine the water and the fine sea salt. Stir briefly until the salt begins to dissolve.",
            "Add the whole potatoes into the salted water, making sure they are fully submerged.",
            "Place the pot over high heat and bring the liquid to a rolling boil.",
            "Once boiling, reduce the heat slightly to medium-high to maintain a steady, active boil. Cook uncovered for 15 to 20 minutes, until a fork or skewer slides easily into the center of a potato without resistance.",
            "Carefully pour the potatoes into a colander to drain away all the cooking brine. Do not rinse the potatoes.",
            "Return the hot, drained potatoes to the empty pot or arrange them on a wire rack for 3 to 5 minutes; as steam and residual surface moisture evaporate, a characteristic light powdery salt crust will form over the skins.",
            "Transfer the hot salt potatoes to a warm serving bowl, scatter with chopped chives if desired, and serve immediately alongside small bowls of warm melted butter for generous dipping."
          ]
        },
        {
          id: 'homemade-cinnamon-gifflar',
          title: "Homemade Cinnamon Gifflar",
          source: "Dee | Food for everyone (@mumsfoodies)",
          url: "https://www.instagram.com/reel/DepW0lxIqW6/?vrfl=cXB3MGwwNDZtZnJx",
          blogUrl: null,
          yield: "36 Mini Rolls",
          calories: "135 kcal",
          protein: "2.5g",
          carbs: "20g",
          fat: "5g",
          highlight: "Soft, pillowy Swedish-style cinnamon mini-rolls layered with buttery spiced brown sugar, baked golden, and brushed with hot glossy sugar syrup.",
          ingredients: [
            "260ml (1 cup + 1 tbsp) lukewarm milk (38–40°C / 100–104°F)",
            "7g (2 1/4 tsp / 1 packet) instant yeast",
            "20g (1 1/2 tbsp) granulated sugar",
            "1 large egg (or substitute +50ml milk to skip egg)",
            "500g (4 cups) bread flour or all-purpose flour (min 12% protein)",
            "6g (1 tsp) fine salt",
            "100g (7 tbsp) unsalted butter, softened",
            "100g (1/2 cup packed) light brown sugar",
            "100g (7 tbsp) unsalted butter, softened (for filling)",
            "16g (2 tbsp) ground cinnamon",
            "1 egg yolk + 5ml (1 tsp) milk (for egg wash)",
            "60ml (1/4 cup) water (for sugar syrup)",
            "60g (1/4 cup + 1 tbsp) brown sugar (for sugar syrup)",
            "40g (3 tbsp) unsalted butter (for sugar syrup)"
          ],
          steps: [
            "Whisk lukewarm milk (38–40°C) and instant yeast in a bowl. Whisk in sugar and egg until frothy.",
            "Add flour, salt, and softened butter. Mix thoroughly with a spatula or floured hands into a dough.",
            "Fold the dough over itself in the bowl 10–20 times until smooth and elastic without lumps.",
            "Cover and rest in a warm spot for 1 hour until doubled in volume.",
            "Cream together softened butter, brown sugar, and ground cinnamon until smooth.",
            "Roll risen dough on a floured surface into a large 12x18\" rectangle. Spread cinnamon filling evenly right to the edges.",
            "Slice width-wise into 3 long strips. Roll each strip tightly into a cylinder seam-side down, flatten slightly, and cut into 2-inch mini bun pieces.",
            "Arrange on 2 parchment-lined baking sheets, cover, and proof for 20 minutes.",
            "Preheat oven to 350°F (175°C). Brush buns with egg wash and bake for 12–15 minutes until golden brown.",
            "Boil water, brown sugar, and butter in a small pan into a glossy syrup. Brush generously over the hot buns straight out of the oven!"
          ]
        },
        {
          id: 'crispy-overnight-no-knead-focaccia',
          title: "Crispy Overnight No-Knead Focaccia",
          source: "Cowboy (@cowboy_cooks)",
          url: "https://www.instagram.com/reel/DGq7FwPSGIV/",
          blogUrl: null,
          yield: "8-10 Servings (9x13-inch pan)",
          calories: 275,
          protein: 7,
          carbs: 41,
          fat: 10,
          highlight: "Simple overnight cold fermentation yields an airy, deeply bubbly crumb with a delightfully crispy, olive-oil-fried crust.",
          ingredients: [
            "500 g bread flour (approx. 4 cups)",
            "2 tsp kosher salt (6 g)",
            "7 g instant yeast (2 1/4 tsp / 1 standard packet)",
            "350 g warm water (approx. 1 1/2 cups)",
            "2 tbsp olive oil (30 ml)",
            "Generous olive oil (for coating 9x13 pan and drizzling top)",
            "Flaky sea salt (Maldon or coarse salt, to taste)",
            "Optional toppings of choice (fresh rosemary, garlic, cherry tomatoes, or olives)"
          ],
          steps: [
            "In a large mixing bowl, combine 500 g bread flour, 2 tsp kosher salt, 7 g instant yeast, 350 g warm water, and 2 tbsp olive oil.",
            "Mix thoroughly with a spatula or wooden spoon until completely combined and a wet, sticky dough forms.",
            "Cover the bowl tightly with plastic wrap and place in the refrigerator to cold ferment for 12 to 24 hours until doubled in size and visibly bubbly.",
            "The next day, preheat your oven to 450°F (232°C). Coat a 9x13-inch metal baking pan generously with olive oil along the bottom and sides to prevent sticking.",
            "Gently pour the chilled dough into the prepared pan and ease it outward toward the edges and corners until it mostly covers the bottom.",
            "Cover loosely and let proof at room temperature for 1 to 2 hours until puffed and billowy.",
            "Lightly wet your fingers with water to prevent sticking, then press firmly straight down into the dough with your thumbs, pointer, and middle fingers to create deep dimples throughout.",
            "Generously drizzle olive oil over the surface, ensuring oil pools into the dimples, and finish with a liberal sprinkle of flaky sea salt and any desired toppings.",
            "Bake at 450°F (232°C) for 20 to 25 minutes, or until the top and bottom are deep golden brown and crisp.",
            "Let cool in the pan on a wire rack for 10 to 20 minutes before slicing and serving."
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
      linkText: "Game Wiki",
      linkUrl: "https://bg3.wiki",
      lastUpdated: null
    }
  },
  captures: [],
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
        // Prune obsolete recipes if present in existing storage
        parsed.desks.recipe.recipes = parsed.desks.recipe.recipes.filter(r => r.id !== 'creamy-garlic-chicken-and-rice' && r.id !== 'slow-cooker-butter-chicken-mac-n-cheese');

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

      // Ensure fiber defaults
      if (parsed.desks && parsed.desks.fiber) {
        if (parsed.desks.fiber.targetRows === undefined) parsed.desks.fiber.targetRows = 120;
      }

      // Ensure gaming defaults
      if (parsed.desks && !parsed.desks.gaming) {
        parsed.desks.gaming = JSON.parse(JSON.stringify(DEFAULT_STATE.desks.gaming));
      }

      // Ensure captures array exists and prune obsolete sample and test-seeded items
      if (!Array.isArray(parsed.captures)) {
        parsed.captures = [];
      } else {
        parsed.captures = parsed.captures.filter(c => 
          c && !(c.id === 1 && String(c.text).includes("yarn stash")) &&
               !(c.id === 2 && String(c.text).includes("FAGE Greek yogurt")) &&
               !(c.id >= 1792000000010 && c.id <= 1792000000035)
        );
      }

      // Reset stale test desk suggestions if present
      if (Array.isArray(parsed.deskSuggestions)) {
        parsed.deskSuggestions = parsed.deskSuggestions.filter(s => s && s.id !== 'sug-finance');
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
      updateHeaderSyncStatus();
    }, 400);
  }
}

// ==========================================================================
// UNIFIED GITHUB CLOUD SYNC & DIRTY TRACKING ENGINE
// ==========================================================================
const pendingDirtyFiles = new Set();
let isFlushingSync = false;
let lastTabRefreshTime = 0;
const MIN_REFRESH_INTERVAL_MS = 15000; // Throttle to max once every 15s

let lastLoadedCommitSha = null;
let isCheckingLiveness = false;

async function checkRemoteCommitLiveness() {
  if (isCheckingLiveness) return;
  const token = localStorage.getItem('active_desks_github_token');
  if (!token) return;

  isCheckingLiveness = true;
  try {
    const res = await fetch('https://api.github.com/repos/soulless613-stack/active-desks/commits/main', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      },
      cache: 'no-store'
    });
    if (res.ok) {
      const data = await res.json();
      const remoteSha = (data.sha || '').substring(0, 7);

      if (lastLoadedCommitSha && remoteSha !== lastLoadedCommitSha) {
        console.warn(`[SyncGuard] Remote commit moved ahead (${lastLoadedCommitSha} -> ${remoteSha}). Refreshing state from remote...`);
        pendingDirtyFiles.clear(); // Discard stale local queue so background tab doesn't overwrite
        lastLoadedCommitSha = remoteSha;

        // Fetch fresh captures from remote
        const remoteCaptures = await githubGet('captures.json');
        if (Array.isArray(remoteCaptures)) {
          state.captures = remoteCaptures;
          saveState();
          renderCaptures();
        }

        // Also refresh active desks
        await refreshActiveTab();
        updateCommitTag();
        showToast('Synced with latest changes ✨', '🔄');
      } else {
        lastLoadedCommitSha = remoteSha;
      }
    }
  } catch (e) {
    console.warn('[SyncGuard] Liveness check notice:', e);
  } finally {
    isCheckingLiveness = false;
  }
}

function markDirty(filename) {
  pendingDirtyFiles.add(filename);
  updateHeaderSyncStatus('pending');
}

async function githubPut(filePath, data, commitMsg, maxRetries = 3) {
  const token = localStorage.getItem('active_desks_github_token');
  if (!token) throw new Error('No GitHub token configured');

  const repo = 'soulless613-stack/active-desks';
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
      // File may not exist yet on repo
    }

    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const base64Content = btoa(unescape(encodeURIComponent(jsonString)));

    const putBody = {
      message: commitMsg || `Update ${filePath}`,
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

    if (putRes.ok) return true;

    if (putRes.status === 409 && attempt < maxRetries) {
      console.warn(`GitHub SHA collision on ${filePath} (attempt ${attempt + 1}), retrying...`);
      await new Promise(r => setTimeout(r, (attempt + 1) * 800));
      continue;
    }

    const errText = await putRes.text();
    throw new Error(`GitHub API ${putRes.status}: ${errText}`);
  }
}

async function githubGet(filePath) {
  const token = localStorage.getItem('active_desks_github_token');
  const repo = 'soulless613-stack/active-desks';
  if (token) {
    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });
      if (res.ok) {
        const fileInfo = await res.json();
        if (fileInfo && fileInfo.content) {
          const rawContent = decodeURIComponent(escape(atob(fileInfo.content.replace(/\s/g, ''))));
          return JSON.parse(rawContent);
        }
      }
    } catch (apiErr) {
      console.warn(`Direct GitHub API read for ${filePath} failed, falling back to local static:`, apiErr);
    }
  }
  const res = await fetch(`./${filePath}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function flushDirtySync(isManual = false) {
  if (isFlushingSync) return;
  const token = localStorage.getItem('active_desks_github_token');

  if (pendingDirtyFiles.size === 0) {
    if (isManual) {
      showToast('All changes are already in sync!', '✨');
    }
    return;
  }

  if (!token) {
    if (isManual) {
      showToast('GitHub token not set. Open Sync menu to configure.', '⚠️');
    }
    updateHeaderSyncStatus('warning');
    return;
  }

  // Pre-write guard: verify remote repository has not advanced
  await checkRemoteCommitLiveness();
  if (pendingDirtyFiles.size === 0) {
    isFlushingSync = false;
    updateHeaderSyncStatus('synced');
    return;
  }

  isFlushingSync = true;
  updateHeaderSyncStatus('syncing');

  const filesToSync = Array.from(pendingDirtyFiles);
  let successCount = 0;
  let hasError = false;

  for (const file of filesToSync) {
    try {
      let dataToCommit = null;
      let commitMessage = `Update ${file}`;

      if (file === 'fiber.json') {
        dataToCommit = state.desks.fiber;
        commitMessage = `Update fiber progress: ${dataToCommit.name} (Row ${dataToCommit.rows})`;
      } else if (file === 'gaming.json') {
        dataToCommit = state.desks.gaming;
        commitMessage = `Update game quest: ${dataToCommit.title} (${dataToCommit.platform})`;
      } else if (file === 'anchors.json') {
        const count = [state.buckets.home.checked, state.buckets.body.checked, state.buckets.spark.checked].filter(Boolean).length;
        dataToCommit = {
          date: new Date().toISOString().split('T')[0],
          home: !!state.buckets.home.checked,
          body: !!state.buckets.body.checked,
          spark: !!state.buckets.spark.checked,
          lastUpdated: new Date().toISOString()
        };
        commitMessage = `Update daily anchors: ${dataToCommit.date} (${count}/3)`;
      } else if (file === 'reading.json') {
        dataToCommit = state.desks.reading;
        commitMessage = `Update reading progress: ${dataToCommit.title} (${dataToCommit.unit} ${dataToCommit.currentPage}/${dataToCommit.totalPages})`;
      } else if (file === 'captures.json') {
        dataToCommit = state.captures;
        commitMessage = `Update captured thoughts (${dataToCommit.length} notes)`;
      } else if (file === 'recipe-inbox.json') {
        dataToCommit = state.recipeInbox;
        commitMessage = `Update recipe inbox (${dataToCommit.length} pending)`;
      }

      if (dataToCommit) {
        await githubPut(file, dataToCommit, commitMessage);
        pendingDirtyFiles.delete(file);
        successCount++;
        addSyncLog({
          target: file,
          action: 'commit',
          status: 'success',
          message: commitMessage
        });
      }
    } catch (err) {
      console.warn(`Failed to flush ${file} to GitHub:`, err);
      hasError = true;
      addSyncLog({
        target: file,
        action: 'commit',
        status: 'error',
        message: `Failed to commit ${file}`,
        details: err.message
      });
    }
  }

  // Once all dirty files have flushed, commit updated sync-log.json once
  if (successCount > 0 || hasError) {
    try {
      await githubPut('sync-log.json', getSyncLogs(), `Update sync & error log (${getSyncLogs().length} events)`);
    } catch (logErr) {
      console.warn('Could not push sync-log.json:', logErr);
    }
  }

  isFlushingSync = false;
  updateHeaderSyncStatus(hasError ? 'error' : (pendingDirtyFiles.size > 0 ? 'pending' : 'synced'));

  if (isManual) {
    if (!hasError) {
      showToast('All changes synced to GitHub!', '☁️');
    } else {
      showToast('Sync completed with errors (see log)', '⚠️');
    }
  }
}

async function refreshActiveTab() {
  const now = Date.now();
  if (now - lastTabRefreshTime < MIN_REFRESH_INTERVAL_MS) return;
  lastTabRefreshTime = now;

  let changed = false;

  if (!pendingDirtyFiles.has('reading.json')) {
    try {
      const data = await githubGet('reading.json');
      if (data && data.title && data.lastUpdated !== state.desks.reading.lastUpdated) {
        Object.assign(state.desks.reading, data);
        changed = true;
      }
    } catch (e) {}
  }

  if (!pendingDirtyFiles.has('fiber.json')) {
    try {
      const data = await githubGet('fiber.json');
      if (data && data.name && data.lastUpdated !== state.desks.fiber.lastUpdated) {
        Object.assign(state.desks.fiber, data);
        changed = true;
      }
    } catch (e) {}
  }

  if (!pendingDirtyFiles.has('gaming.json')) {
    try {
      const data = await githubGet('gaming.json');
      if (data && data.title && data.lastUpdated !== state.desks.gaming.lastUpdated) {
        Object.assign(state.desks.gaming, data);
        changed = true;
      }
    } catch (e) {}
  }

  if (!pendingDirtyFiles.has('anchors.json')) {
    try {
      const data = await githubGet('anchors.json');
      const today = new Date().toISOString().split('T')[0];
      if (data && data.date === today && data.lastUpdated !== state.buckets.home.lastUpdated) {
        state.buckets.home.checked = !!data.home;
        state.buckets.body.checked = !!data.body;
        state.buckets.spark.checked = !!data.spark;
        changed = true;
      }
    } catch (e) {}
  }

  if (!pendingDirtyFiles.has('captures.json')) {
    try {
      const data = await githubGet('captures.json');
      if (Array.isArray(data)) {
        if (mergeCaptures(data)) {
          changed = true;
        }
      }
    } catch (e) {}
  }

  if (!pendingDirtyFiles.has('recipe-inbox.json')) {
    try {
      const data = await githubGet('recipe-inbox.json');
      if (Array.isArray(data) && JSON.stringify(data) !== JSON.stringify(state.recipeInbox)) {
        state.recipeInbox = data;
        changed = true;
      }
    } catch (e) {}
  }

  if (changed) {
    saveState();
    render();
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

  // 2. Render Desks & Emergent Evolution Nudges
  renderDeskEvolutionBanner();
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
  markDirty('anchors.json');
}

async function fetchAnchorsFromRepo() {
  try {
    const data = await githubGet('anchors.json');
    const today = new Date().toISOString().split('T')[0];
    if (data && data.date === today) {
      state.buckets.home.checked = !!data.home;
      state.buckets.body.checked = !!data.body;
      state.buckets.spark.checked = !!data.spark;
      saveState();
      renderBuckets();
    }
  } catch (e) {
    console.log('Using local anchors state (offline or local server)');
  }
}

// --------------------------------------------------------------------------
// Fiber Arts Desk (Zero Timers — Exit Flush on Inactive)
// --------------------------------------------------------------------------
function renderFiberDesk() {
  const f = state.desks.fiber;
  const titleEl = document.getElementById('fiber-title');
  const typeEl = document.getElementById('fiber-type');
  const specsEl = document.getElementById('fiber-specs');
  const rowsEl = document.getElementById('fiber-rows');
  const linkEl = document.getElementById('fiber-link');
  const syncStatusEl = document.getElementById('fiber-sync-status');

  if (titleEl) titleEl.textContent = f.name;
  if (typeEl) typeEl.textContent = f.type;
  if (specsEl) specsEl.textContent = f.specs;
  if (rowsEl) rowsEl.textContent = f.rows;
  
  if (linkEl) {
    linkEl.textContent = f.linkText || 'Open Ravelry';
    linkEl.href = f.linkUrl || '#';
  }

  if (syncStatusEl) {
    if (pendingDirtyFiles.has('fiber.json')) {
      syncStatusEl.textContent = 'Unsynced (exits to sync)';
      syncStatusEl.style.color = 'var(--accent-spark)';
    } else if (f.lastUpdated) {
      const timeStr = new Date(f.lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      syncStatusEl.textContent = `Updated ${timeStr}`;
      syncStatusEl.style.color = 'var(--text-muted)';
    } else {
      syncStatusEl.textContent = 'Synced';
      syncStatusEl.style.color = 'var(--text-muted)';
    }
  }
}

function changeRows(delta) {
  state.desks.fiber.rows = Math.max(0, state.desks.fiber.rows + delta);
  state.desks.fiber.lastUpdated = new Date().toISOString();
  saveState();
  markDirty('fiber.json');
  renderFiberDesk();
}

async function fetchFiberFromRepo() {
  try {
    const data = await githubGet('fiber.json');
    if (data && data.name) {
      Object.assign(state.desks.fiber, data);
      saveState();
      renderFiberDesk();
    }
  } catch (e) {
    console.log('Using local fiber state (offline or local server)');
  }
}

function openFiberModal() {
  const f = state.desks.fiber;
  document.getElementById('edit-fiber-title').value = f.name || '';
  document.getElementById('edit-fiber-type').value = f.type || '';
  document.getElementById('edit-fiber-specs').value = f.specs || '';
  document.getElementById('edit-fiber-rows').value = f.rows !== undefined ? f.rows : 0;
  document.getElementById('edit-fiber-target').value = f.targetRows || '';
  document.getElementById('edit-fiber-link').value = f.linkUrl || '';
  document.getElementById('fiber-modal').classList.add('active');
}

function handleFiberSave(e) {
  if (e) e.preventDefault();
  const title = document.getElementById('edit-fiber-title').value.trim();
  const type = document.getElementById('edit-fiber-type').value.trim();
  const specs = document.getElementById('edit-fiber-specs').value.trim();
  const rows = parseInt(document.getElementById('edit-fiber-rows').value, 10) || 0;
  const targetVal = document.getElementById('edit-fiber-target').value.trim();
  const targetRows = targetVal ? (parseInt(targetVal, 10) || null) : null;
  const linkUrl = document.getElementById('edit-fiber-link').value.trim();

  state.desks.fiber.name = title;
  state.desks.fiber.type = type;
  state.desks.fiber.specs = specs;
  state.desks.fiber.rows = rows;
  state.desks.fiber.targetRows = targetRows;
  if (linkUrl) state.desks.fiber.linkUrl = linkUrl;
  state.desks.fiber.lastUpdated = new Date().toISOString();

  saveState();
  markDirty('fiber.json');
  closeModal('fiber-modal');
  showToast('Fiber project updated!', '🧶');
  renderFiberDesk();
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

function openRecipeModal(targetRecipeOrId) {
  const rState = state.desks.recipe;
  let rec = null;
  if (targetRecipeOrId) {
    if (typeof targetRecipeOrId === 'object') {
      rec = targetRecipeOrId;
    } else if (typeof targetRecipeOrId === 'string') {
      rec = rState.recipes.find(r => r.id === targetRecipeOrId);
    } else if (typeof targetRecipeOrId === 'number') {
      rec = rState.recipes[targetRecipeOrId];
    }
  }
  if (!rec) {
    rec = rState.recipes[rState.selectedIndex] || rState.recipes[0];
  }
  if (!rec) return;
  
  document.getElementById('modal-recipe-title').textContent = rec.title;
  document.getElementById('modal-recipe-source').textContent = rec.source;
  
  const reelLinkEl = document.getElementById('modal-recipe-link');
  if (reelLinkEl) reelLinkEl.href = rec.url;

  const blogLinkEl = document.getElementById('modal-recipe-blog-link');
  if (blogLinkEl) {
    if (rec.blogUrl && rec.blogUrl !== rec.url) {
      blogLinkEl.href = rec.blogUrl;
      blogLinkEl.style.display = 'inline-flex';
    } else {
      blogLinkEl.style.display = 'none';
    }
  }
  
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

function handleQueueRecipe(e) {
  if (e) e.preventDefault();
  const urlInput = document.getElementById('inbox-url-input');
  const noteInput = document.getElementById('inbox-note-input');
  const url = urlInput ? urlInput.value.trim() : '';
  const note = noteInput ? noteInput.value.trim() : '';
  if (!url) return;

  if (!state.recipeInbox) state.recipeInbox = [];
  state.recipeInbox.unshift({
    id: Date.now(),
    url: url,
    note: note,
    addedAt: new Date().toISOString()
  });
  saveState();
  renderRecipeInbox();
  markDirty('recipe-inbox.json');

  if (urlInput) urlInput.value = '';
  if (noteInput) noteInput.value = '';
  showToast('Recipe queued in inbox!', '📥');
}

function removeQueuedRecipe(id) {
  if (!state.recipeInbox) return;
  state.recipeInbox = state.recipeInbox.filter(item => item.id !== id);
  saveState();
  renderRecipeInbox();
  markDirty('recipe-inbox.json');
  showToast('Removed from queue', '🗑️');
}

async function fetchRecipeInboxFromRepo() {
  try {
    const data = await githubGet('recipe-inbox.json');
    if (Array.isArray(data)) {
      state.recipeInbox = data;
      saveState();
      renderRecipeInbox();
    }
  } catch (e) {
    console.log('Using local recipe inbox (offline or local server)');
  }
}

function syncRecipeInboxManually() {
  flushDirtySync(true);
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

  // Projected TBR / Up Next Tray (from captures.json where domain === 'book')
  const tbrCountEl = document.getElementById('reading-tbr-count');
  const tbrListEl = document.getElementById('reading-tbr-list');
  if (tbrListEl) {
    const bookCaptures = (Array.isArray(state.captures) ? state.captures : [])
      .filter(c => (c.domain || '').toLowerCase() === 'book');

    if (tbrCountEl) tbrCountEl.textContent = bookCaptures.length;

    if (bookCaptures.length === 0) {
      tbrListEl.innerHTML = `
        <div style="text-align: center; padding: 12px 8px; color: var(--text-muted); font-size: 0.78rem;">
          No books queued yet. Drop a book title or StoryGraph link in Universal Capture below!
        </div>
      `;
    } else {
      tbrListEl.innerHTML = bookCaptures.map(c => `
        <div class="projection-item">
          <div class="projection-item-main">
            <div class="projection-item-title" title="${escapeHtml(c.title)}">${escapeHtml(c.title)}</div>
            <div class="projection-item-meta">
              <span class="projection-item-tag">${escapeHtml(c.topic || 'Book')}</span>
              ${c.creator ? `<span>by ${escapeHtml(c.creator)}</span>` : ''}
            </div>
          </div>
          <button type="button" class="projection-action-btn" onclick="setActiveReadFromCapture(${c.id})" title="Set as currently reading">
            📖 Set Active
          </button>
        </div>
      `).join('');
    }
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

async function testGitHubConnection() {
  const token = localStorage.getItem('active_desks_github_token');
  if (!token) return;
  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    if (res.ok) {
      const u = await res.json();
      showToast(`GitHub connected as @${u.login}`, '☁️');
    }
  } catch (e) {}
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

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${geminiKey}`;
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
function handleReadingSave(e) {
  if (e) e.preventDefault();
  const title = document.getElementById('edit-reading-title').value.trim();
  const author = document.getElementById('edit-reading-author').value.trim();
  const currentPage = parseInt(document.getElementById('edit-reading-current').value, 10) || 0;
  const totalPages = parseInt(document.getElementById('edit-reading-total').value, 10) || 100;
  const now = new Date().toISOString();

  state.desks.reading.title = title;
  state.desks.reading.author = author;
  state.desks.reading.currentPage = currentPage;
  state.desks.reading.totalPages = totalPages;
  state.desks.reading.unit = totalPages <= 50 ? 'chapters' : 'pages';
  state.desks.reading.lastUpdated = now;

  saveState();
  markDirty('reading.json');
  closeModal('reading-modal');
  showToast('Reading progress updated!', '📖');
  renderReadingDesk();
}

// --------------------------------------------------------------------------
// Gaming Rig Desk (Cross-Device Cloud Sync)
// --------------------------------------------------------------------------
function renderGamingDesk() {
  const g = state.desks.gaming;
  const titleEl = document.getElementById('gaming-title');
  const platformEl = document.getElementById('gaming-platform');
  const questEl = document.getElementById('gaming-quest');
  const linkEl = document.getElementById('gaming-link');
  const updatedTag = document.getElementById('gaming-updated-tag');

  if (titleEl) titleEl.textContent = g.title;
  if (platformEl) platformEl.textContent = g.platform;
  if (questEl) questEl.textContent = g.quest;
  
  if (linkEl) {
    linkEl.textContent = g.linkText || 'Game Wiki';
    linkEl.href = g.linkUrl || '#';
  }

  if (updatedTag && g.lastUpdated) {
    const timeStr = new Date(g.lastUpdated).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    updatedTag.textContent = `Updated ${timeStr}`;
  }

  // Projected Gaming Backlog / Watchlist Tray (from captures.json where domain === 'game')
  const backlogCountEl = document.getElementById('gaming-backlog-count');
  const backlogListEl = document.getElementById('gaming-backlog-list');
  if (backlogListEl) {
    const gameCaptures = (Array.isArray(state.captures) ? state.captures : [])
      .filter(c => (c.domain || '').toLowerCase() === 'game');

    if (backlogCountEl) backlogCountEl.textContent = gameCaptures.length;

    if (gameCaptures.length === 0) {
      backlogListEl.innerHTML = `
        <div style="text-align: center; padding: 12px 8px; color: var(--text-muted); font-size: 0.78rem;">
          No games in backlog yet. Drop game titles or Steam links in Universal Capture below!
        </div>
      `;
    } else {
      backlogListEl.innerHTML = gameCaptures.map(c => `
        <div class="projection-item">
          <div class="projection-item-main">
            <div class="projection-item-title" title="${escapeHtml(c.title)}">${escapeHtml(c.title)}</div>
            <div class="projection-item-meta">
              <span class="projection-item-tag">${escapeHtml(c.topic || 'Game')}</span>
              ${c.summary ? `<span>${escapeHtml(c.summary).slice(0, 36)}...</span>` : ''}
            </div>
          </div>
          <button type="button" class="projection-action-btn" onclick="setActiveGameFromCapture(${c.id})" title="Set as active playthrough">
            🎮 Set Active
          </button>
        </div>
      `).join('');
    }
  }
}

function openGamingModal() {
  const g = state.desks.gaming;
  document.getElementById('edit-gaming-title').value = g.title || '';
  document.getElementById('edit-gaming-platform').value = g.platform || '';
  document.getElementById('edit-gaming-quest').value = g.quest || '';
  document.getElementById('edit-gaming-link').value = g.linkUrl || '';
  document.getElementById('gaming-modal').classList.add('active');
}

function handleGamingSave(e) {
  if (e) e.preventDefault();
  const title = document.getElementById('edit-gaming-title').value.trim();
  const platform = document.getElementById('edit-gaming-platform').value.trim();
  const quest = document.getElementById('edit-gaming-quest').value.trim();
  const linkUrl = document.getElementById('edit-gaming-link').value.trim();
  const now = new Date().toISOString();

  state.desks.gaming.title = title;
  state.desks.gaming.platform = platform;
  state.desks.gaming.quest = quest;
  if (linkUrl) state.desks.gaming.linkUrl = linkUrl;
  state.desks.gaming.lastUpdated = now;

  saveState();
  markDirty('gaming.json');
  closeModal('gaming-modal');
  showToast('Game quest updated!', '🎮');
  renderGamingDesk();
}

async function fetchGamingFromRepo() {
  try {
    const data = await githubGet('gaming.json');
    if (data && data.title) {
      Object.assign(state.desks.gaming, data);
      saveState();
      renderGamingDesk();
    }
  } catch (e) {
    console.log('Using local gaming state (offline or local server)');
  }
}

// --------------------------------------------------------------------------
// Universal Capture & Adaptive Stream Engine
// --------------------------------------------------------------------------
let activeCaptureDomainFilter = 'all';
let activeCaptureTopicFilter = 'all';

function setCaptureDomainFilter(domain) {
  activeCaptureDomainFilter = domain;
  activeCaptureTopicFilter = 'all';
  renderCaptures();
}

function setCaptureTopicFilter(topic) {
  activeCaptureTopicFilter = topic;
  renderCaptures();
}

function handleQuickCapture(e) {
  if (e) e.preventDefault();
  const input = document.getElementById('quick-capture-input');
  const text = input ? input.value.trim() : '';
  if (!text) return;

  const urlMatch = text.match(/https?:\/\/[^\s]+/i);
  const foundUrl = urlMatch ? urlMatch[0] : null;

  const newCapture = {
    id: Date.now(),
    domain: null, // to be classified by cloud agent
    topic: null,
    title: text,
    summary: null,
    sourceUrl: foundUrl,
    time: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    status: 'pending',
    rawText: text,
    payload: null
  };

  if (!Array.isArray(state.captures)) state.captures = [];
  state.captures.unshift(newCapture);

  // If a URL was captured, keep recipeInbox synced as well for backward compatibility
  if (foundUrl) {
    if (!Array.isArray(state.recipeInbox)) state.recipeInbox = [];
    state.recipeInbox.unshift({
      id: newCapture.id,
      url: foundUrl,
      note: text.replace(foundUrl, '').trim() || 'Universal capture URL',
      addedAt: new Date().toISOString()
    });
    markDirty('recipe-inbox.json');
  }

  if (input) input.value = '';
  saveState();
  renderCaptures();
  markDirty('captures.json');
  openBrainDumpModal();

  if (foundUrl) {
    showToast('Link captured! ⚡ Queued for smart extraction', '📥');
  } else {
    showToast('Thought captured! 💡 Queued for smart sorting', '🧠');
  }

  flushDirtySync(); // Push to GitHub immediately in background if connected
}

function getDomainEmoji(domain) {
  const map = {
    recipe: '🍳',
    book: '📚',
    game: '🎮',
    fiber: '🧶',
    travel: '✈️',
    home: '🏡',
    finance: '💰',
    writing: '✍️',
    tech: '💻',
    thought: '💡',
    misc: '📌'
  };
  return map[domain] || '📌';
}

function renderCaptures() {
  const list = document.getElementById('captures-list');
  const filterBar = document.getElementById('captures-filter-bar');
  if (!list) return;

  const captures = (Array.isArray(state.captures) ? state.captures : [])
    .slice()
    .sort((a, b) => (b.id || 0) - (a.id || 0));

  // 1. Render Domain Filter Pills
  if (filterBar) {
    const domainCounts = {};
    captures.forEach(c => {
      const d = (c.domain || 'pending').toLowerCase();
      domainCounts[d] = (domainCounts[d] || 0) + 1;
    });

    const domains = Object.keys(domainCounts).sort();
    
    let pillsHtml = `
      <button type="button" class="capture-filter-pill ${activeCaptureDomainFilter === 'all' ? 'active' : ''}" onclick="setCaptureDomainFilter('all')">
        <span>All</span>
        <span class="capture-pill-count">${captures.length}</span>
      </button>
    `;

    domains.forEach(d => {
      const label = d === 'pending' ? '⏳ Pending' : `${getDomainEmoji(d)} ${d.charAt(0).toUpperCase() + d.slice(1)}`;
      pillsHtml += `
        <button type="button" class="capture-filter-pill ${activeCaptureDomainFilter === d ? 'active' : ''}" onclick="setCaptureDomainFilter('${escapeHtml(d)}')">
          <span>${label}</span>
          <span class="capture-pill-count">${domainCounts[d]}</span>
        </button>
      `;
    });

    filterBar.innerHTML = pillsHtml;
  }

  // 1b. Render Scoped Topic Filter Pills (only when a domain is selected AND has >= 2 topics)
  const topicFilterBar = document.getElementById('captures-topic-filter-bar');
  if (topicFilterBar) {
    if (activeCaptureDomainFilter === 'all') {
      topicFilterBar.style.display = 'none';
      topicFilterBar.innerHTML = '';
    } else {
      const domainCaptures = captures.filter(c => ((c.domain || 'pending').toLowerCase()) === activeCaptureDomainFilter);
      const topicCounts = {};
      domainCaptures.forEach(c => {
        const t = c.topic || 'General';
        topicCounts[t] = (topicCounts[t] || 0) + 1;
      });

      const topics = Object.keys(topicCounts).sort();

      // Only display the secondary topic bar if the domain has >= 2 distinct topics
      if (topics.length < 2) {
        topicFilterBar.style.display = 'none';
        topicFilterBar.innerHTML = '';
      } else {
        topicFilterBar.style.display = 'flex';
        let topicHtml = `
          <button type="button" class="capture-topic-pill ${activeCaptureTopicFilter === 'all' ? 'active' : ''}" onclick="setCaptureTopicFilter('all')">
            <span>All Topics</span>
            <span class="capture-topic-count">${domainCaptures.length}</span>
          </button>
        `;

        topics.forEach(t => {
          topicHtml += `
            <button type="button" class="capture-topic-pill ${activeCaptureTopicFilter === t ? 'active' : ''}" onclick="setCaptureTopicFilter('${escapeHtml(t)}')">
              <span>${escapeHtml(t)}</span>
              <span class="capture-topic-count">${topicCounts[t]}</span>
            </button>
          `;
        });

        topicFilterBar.innerHTML = topicHtml;
      }
    }
  }

  // 1c. Render Drawer Evolution Notice & Fallback Alert
  renderDrawerEvolutionNotice(captures);
  renderDrawerFallbackBanner(captures);

  // 2. Filter Items by Domain AND Topic
  const filtered = captures.filter(c => {
    const matchDomain = activeCaptureDomainFilter === 'all' || ((c.domain || 'pending').toLowerCase()) === activeCaptureDomainFilter;
    const matchTopic = activeCaptureTopicFilter === 'all' || ((c.topic || 'General').toLowerCase()) === activeCaptureTopicFilter.toLowerCase();
    return matchDomain && matchTopic;
  });

  if (filtered.length === 0) {
    list.innerHTML = `
      <div style="text-align: center; padding: 24px 12px; color: var(--text-muted); font-size: 0.88rem; background: rgba(15, 23, 42, 0.4); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
        <span>✨ No items found under this filter.</span><br>
        <span style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 6px; display: inline-block;">
          Drop any link (recipe, book, game) or raw thought in the bar below!
        </span>
      </div>
    `;
    return;
  }

  // 3. Render Capture Cards
  list.innerHTML = filtered.map(c => {
    const isPending = c.status === 'pending' || !c.domain || c.domain === 'pending';
    const domainClass = isPending ? 'tag-domain-pending' : `tag-domain-${(c.domain || 'misc').toLowerCase()}`;
    const badgeText = isPending 
      ? `⏳ Processing...`
      : `[${escapeHtml(c.domain)}] · ${escapeHtml(c.topic || 'General')}`;

    const titleText = escapeHtml(c.title || c.text || c.rawText || 'Untitled Capture');
    const summaryText = c.summary && c.summary !== c.title ? escapeHtml(c.summary) : '';

    // Media extraction status badge (placed at bottom of card, above separator)
    let mediaBadgeHtml = '';
    if (c.sourceUrl) {
      if (c.mediaStatus === 'audio_extracted') {
        mediaBadgeHtml = `
          <div class="capture-card-media-status audio-success" title="Voiceover audio was downloaded and analyzed by Gemini">
            <span>🎙️ Voiceover Audio Verified</span>
          </div>
        `;
      } else if (c.mediaStatus === 'fallback_text') {
        mediaBadgeHtml = `
          <div class="capture-card-media-status text-fallback" title="Video download could not be completed; extracted using creator caption & web search">
            <span>⚠️ Text &amp; Search Fallback (Video Skipped)</span>
          </div>
        `;
      }
    }

    return `
      <div class="capture-card" onclick="openCaptureDetailModal(${c.id})">
        <div class="capture-card-header">
          <div class="capture-badge-group">
            <span class="tag-two-tier ${domainClass}">${badgeText}</span>
            <span style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(c.time || '')}</span>
          </div>
          <button class="capture-del-btn" onclick="event.stopPropagation(); deleteCapture(${c.id})" title="Delete capture" aria-label="Delete">✕</button>
        </div>

        <div class="capture-card-title">${titleText}</div>
        ${summaryText ? `<div class="capture-card-summary">${summaryText}</div>` : ''}

        ${mediaBadgeHtml}

        <div class="capture-card-footer">
          <div class="capture-card-actions">
            ${c.sourceUrl ? `
              <a href="${escapeHtml(c.sourceUrl)}" target="_blank" rel="noopener noreferrer" class="capture-link-btn" onclick="event.stopPropagation();">
                🔗 Source Link
              </a>
            ` : ''}
            <button type="button" class="capture-pin-btn" onclick="event.stopPropagation(); openPinToDeskModal(${c.id})" title="Assign to a desk or domain">
              📌 Desk
            </button>
          </div>
          ${c.creator ? `<span style="font-size: 0.74rem; color: var(--text-muted);">${escapeHtml(c.creator)}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
}

function openCaptureDetailModal(captureId) {
  const c = (state.captures || []).find(item => item.id === captureId);
  if (!c) return;

  // Populate Header
  const domainTagEl = document.getElementById('capture-modal-domain-tag');
  const timeEl = document.getElementById('capture-modal-time');
  const titleEl = document.getElementById('capture-modal-title');
  const creatorEl = document.getElementById('capture-modal-creator');
  const summaryEl = document.getElementById('capture-modal-summary');
  const payloadEl = document.getElementById('capture-modal-payload');
  const sourceBtn = document.getElementById('capture-modal-source-btn');
  const pinBtn = document.getElementById('capture-modal-pin-btn');

  const domain = (c.domain || 'misc').toLowerCase();
  if (domainTagEl) {
    domainTagEl.className = `tag-two-tier tag-domain-${domain}`;
    domainTagEl.textContent = `[${c.domain || 'thought'}] · ${c.topic || 'General'}`;
  }

  if (timeEl) {
    timeEl.textContent = c.time || '';
  }

  if (titleEl) {
    titleEl.textContent = c.title || c.text || c.rawText || 'Untitled Capture';
  }

  if (creatorEl) {
    if (c.creator) {
      creatorEl.innerHTML = `<span>👤</span> <span>${escapeHtml(c.creator)}</span>`;
      creatorEl.style.display = 'inline-flex';
    } else {
      creatorEl.style.display = 'none';
    }
  }

  if (summaryEl) {
    summaryEl.textContent = c.summary && c.summary !== c.title ? c.summary : '';
  }

  // Source Link button
  if (sourceBtn) {
    if (c.sourceUrl) {
      sourceBtn.href = c.sourceUrl;
      sourceBtn.style.display = 'inline-flex';
    } else {
      sourceBtn.style.display = 'none';
    }
  }

  // Pin button
  if (pinBtn) {
    pinBtn.onclick = () => {
      closeModal('capture-detail-modal');
      openPinToDeskModal(c.id);
    };
  }

  // Build Dynamic Payload Sections
  if (payloadEl) {
    let payloadHtml = '';
    const p = c.payload;

    if (p && typeof p === 'object') {
      // 1. Meta Badges (Platform, Genre, Author, Series, Developer, Yield)
      const chips = [];
      if (c.sourceUrl) {
        if (c.mediaStatus === 'audio_extracted') {
          chips.push({ label: 'Media', val: '🎙️ Voiceover Verified' });
        } else if (c.mediaStatus === 'fallback_text') {
          chips.push({ label: 'Extraction', val: '⚠️ Text & Web Fallback' });
        }
      }
      if (p.platform) chips.push({ label: 'Platform', val: p.platform });
      if (p.genre) chips.push({ label: 'Genre', val: p.genre });
      if (p.author) chips.push({ label: 'Author', val: p.author });
      if (p.series) chips.push({ label: 'Series', val: p.series });
      if (p.developer) chips.push({ label: 'Developer', val: p.developer });
      if (p.yield) chips.push({ label: 'Yield', val: p.yield });
      if (p.calories) chips.push({ label: 'Calories', val: `${p.calories} kcal` });
      if (p.protein) chips.push({ label: 'Protein', val: typeof p.protein === 'number' ? `${p.protein}g` : p.protein });

      if (chips.length > 0) {
        payloadHtml += `
          <div class="payload-chips-container">
            ${chips.map(chip => `
              <div class="payload-chip">
                <span class="payload-chip-label">${escapeHtml(chip.label)}:</span>
                <span>${escapeHtml(chip.val)}</span>
              </div>
            `).join('')}
          </div>
        `;
      }

      // 2. Ingredients List (for Recipe Captures)
      if (Array.isArray(p.ingredientSections) && p.ingredientSections.length > 0) {
        payloadHtml += `
          <div>
            <div class="payload-section-title">🛒 Ingredients</div>
            ${p.ingredientSections.map(sec => `
              <div style="font-size: 0.78rem; font-weight: 700; color: #fb923c; margin: 6px 0 3px;">${escapeHtml(sec.sectionTitle || '')}</div>
              <ul class="payload-takeaways-list" style="margin-bottom: 6px;">
                ${(sec.ingredients || []).map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
              </ul>
            `).join('')}
          </div>
        `;
      } else if (Array.isArray(p.ingredients) && p.ingredients.length > 0) {
        payloadHtml += `
          <div>
            <div class="payload-section-title">🛒 Ingredients</div>
            <ul class="payload-takeaways-list">
              ${p.ingredients.map(ing => `<li>${escapeHtml(ing)}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      // 3. Key Takeaways (Bullet List)
      if (Array.isArray(p.keyTakeaways) && p.keyTakeaways.length > 0) {
        payloadHtml += `
          <div>
            <div class="payload-section-title">✨ Key Takeaways</div>
            <ul class="payload-takeaways-list">
              ${p.keyTakeaways.map(t => `<li>${escapeHtml(t)}</li>`).join('')}
            </ul>
          </div>
        `;
      }

      // 3. Highlight Quote
      if (p.highlight) {
        payloadHtml += `
          <div>
            <div class="payload-section-title">💡 Highlight</div>
            <div class="payload-highlight-card">
              "${escapeHtml(p.highlight)}"
            </div>
          </div>
        `;
      }

      // 4. Suggested Quest / Goal Callout
      if (p.questOrGoal) {
        payloadHtml += `
          <div>
            <div class="payload-section-title">🎯 Backlog Focus</div>
            <div class="payload-goal-card">
              ${escapeHtml(p.questOrGoal)}
            </div>
          </div>
        `;
      }
    }

    payloadEl.innerHTML = payloadHtml;
  }

  document.getElementById('capture-detail-modal').classList.add('active');
}

// --------------------------------------------------------------------------
// Desk Quick-Attach & Projection Activation Handlers
// --------------------------------------------------------------------------
let activePinCaptureId = null;

function openPinToDeskModal(captureId) {
  activePinCaptureId = captureId;
  const c = (state.captures || []).find(item => item.id === captureId);
  if (!c) return;

  const titleEl = document.getElementById('pin-modal-capture-title');
  const topicInput = document.getElementById('pin-modal-topic-input');

  if (titleEl) {
    titleEl.textContent = (c.title || c.text || c.rawText || 'Capture Item').slice(0, 60);
  }
  if (topicInput) {
    topicInput.value = c.topic || '';
  }

  // Highlight active domain button
  const currentDomain = (c.domain || '').toLowerCase();
  document.querySelectorAll('.desk-attach-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(`'${currentDomain}'`));
  });

  document.getElementById('pin-to-desk-modal').classList.add('active');
}

function applyDeskAssignment(newDomain) {
  if (!activePinCaptureId) return;
  const c = (state.captures || []).find(item => item.id === activePinCaptureId);
  if (!c) {
    closeModal('pin-to-desk-modal');
    return;
  }

  const topicInput = document.getElementById('pin-modal-topic-input');
  const customTopic = topicInput ? topicInput.value.trim() : '';

  c.domain = newDomain;
  if (customTopic) {
    c.topic = customTopic;
  } else if (!c.topic) {
    c.topic = newDomain.charAt(0).toUpperCase() + newDomain.slice(1);
  }
  c.status = 'processed';

  saveState();
  markDirty('captures.json');
  flushDirtySync();
  closeModal('pin-to-desk-modal');

  const domainName = newDomain.charAt(0).toUpperCase() + newDomain.slice(1);
  showToast(`Assigned to ${domainName} desk!`, getDomainEmoji(newDomain));
}

function setActiveReadFromCapture(captureId) {
  const c = (state.captures || []).find(item => item.id === captureId);
  if (!c) return;

  state.desks.reading.title = c.title || 'Untitled Book';
  if (c.creator) state.desks.reading.author = c.creator;
  state.desks.reading.currentPage = 0;
  state.desks.reading.totalPages = 100;
  state.desks.reading.unit = 'chapters';
  state.desks.reading.lastUpdated = new Date().toISOString();

  saveState();
  markDirty('reading.json');
  flushDirtySync();
  renderReadingDesk();
  showToast(`Active Read set to: "${c.title}"!`, '📖');
}

function setActiveGameFromCapture(captureId) {
  const c = (state.captures || []).find(item => item.id === captureId);
  if (!c) return;

  state.desks.gaming.title = c.title || 'Untitled Game';
  if (c.summary) {
    state.desks.gaming.quest = c.summary;
  }
  state.desks.gaming.lastUpdated = new Date().toISOString();

  saveState();
  markDirty('gaming.json');
  flushDirtySync();
  renderGamingDesk();
  showToast(`Active Game set to: "${c.title}"!`, '🎮');
}

// --------------------------------------------------------------------------
// Phase 3: Emergent Desk Evolution Nudge Engine (Rule of 5)
// --------------------------------------------------------------------------
const DISMISSED_SUGGESTIONS_KEY = 'active_desks_dismissed_suggestions';
let currentActiveDeskSuggestion = null;

function getDismissedSuggestions() {
  try {
    const raw = localStorage.getItem(DISMISSED_SUGGESTIONS_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function renderDeskEvolutionBanner() {
  const banner = document.getElementById('desk-evolution-banner');
  if (!banner) return;

  const dismissed = getDismissedSuggestions();
  const ACTIVE_DESK_DOMAINS = ['book', 'recipe', 'game', 'fiber'];

  // 1. Find candidates from captures where domain has >= 5 items outside active desks
  const nonDeskCounts = {};
  (state.captures || []).forEach(c => {
    if (!c || !c.domain) return;
    const d = c.domain.toLowerCase();
    if (!ACTIVE_DESK_DOMAINS.includes(d) && d !== 'misc') {
      nonDeskCounts[d] = (nonDeskCounts[d] || 0) + 1;
    }
  });

  // Find first domain reaching threshold that hasn't been dismissed
  let candidateDomain = null;
  let candidateCount = 0;

  for (const [d, count] of Object.entries(nonDeskCounts)) {
    if (count >= 5 && !dismissed.has(d)) {
      candidateDomain = d;
      candidateCount = count;
      break;
    }
  }

  // Also check state.deskSuggestions if fetched from repo
  if (!candidateDomain && Array.isArray(state.deskSuggestions)) {
    const sug = state.deskSuggestions.find(s => s.domain && !dismissed.has(s.domain.toLowerCase()));
    if (sug) {
      candidateDomain = sug.domain.toLowerCase();
      candidateCount = sug.itemCount || 5;
    }
  }

  if (!candidateDomain) {
    banner.style.display = 'none';
    currentActiveDeskSuggestion = null;
    return;
  }

  currentActiveDeskSuggestion = candidateDomain;
  const domainLabel = candidateDomain.charAt(0).toUpperCase() + candidateDomain.slice(1);
  const domainEmoji = getDomainEmoji(candidateDomain);

  const titleEl = document.getElementById('evolution-banner-title');
  const countEl = document.getElementById('evolution-banner-count');
  const msgEl = document.getElementById('evolution-banner-msg');

  if (titleEl) titleEl.textContent = `${domainEmoji} Emergent Workbench: ${domainLabel}`;
  if (countEl) countEl.textContent = `${candidateCount} Items`;
  if (msgEl) {
    msgEl.textContent = `You've captured ${candidateCount} items about ${domainLabel} recently. Ready to spin up an active desk to focus on this?`;
  }

  banner.style.display = 'block';
}

function acceptDeskEvolutionSuggestion() {
  if (!currentActiveDeskSuggestion) return;
  const domain = currentActiveDeskSuggestion;
  const domainLabel = domain.charAt(0).toUpperCase() + domain.slice(1);

  // Open Universal Drawer filtered to this domain
  openBrainDumpModal();
  setCaptureDomainFilter(domain);

  showToast(`Focusing on your ${domainLabel} captures! 💡`, getDomainEmoji(domain));
}

function dismissDeskEvolutionSuggestion() {
  if (!currentActiveDeskSuggestion) return;
  const domain = currentActiveDeskSuggestion;

  try {
    const dismissed = Array.from(getDismissedSuggestions());
    if (!dismissed.includes(domain)) {
      dismissed.push(domain);
      localStorage.setItem(DISMISSED_SUGGESTIONS_KEY, JSON.stringify(dismissed));
    }
  } catch (e) {}

  const banner = document.getElementById('desk-evolution-banner');
  if (banner) banner.style.display = 'none';

  showToast('Suggestion dismissed. Calm focus maintained. ✨', '🌿');
}

async function fetchDeskSuggestionsFromRepo() {
  try {
    const res = await fetch('./desk-suggestions.json?t=' + Date.now());
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        state.deskSuggestions = data;
        renderDeskEvolutionBanner();
      }
    }
  } catch (e) {}
}

// --------------------------------------------------------------------------
// Drawer Evolution Change Notices (Actionable & Dismissible)
// --------------------------------------------------------------------------
const DISMISSED_EVOLUTION_NOTICES_KEY = 'active_desks_dismissed_evolution_notices';

function getDismissedEvolutionNotices() {
  try {
    const raw = localStorage.getItem(DISMISSED_EVOLUTION_NOTICES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function renderDrawerEvolutionNotice(captures) {
  const insightsEl = document.getElementById('drawer-evolution-insights');
  if (!insightsEl) return;

  const dismissed = getDismissedEvolutionNotices();

  // Check for active sub-genre re-clustering events (e.g. 3+ books clustered into LitRPG)
  const litRpgBooks = (captures || []).filter(c => 
    (c.domain || '').toLowerCase() === 'book' && 
    (c.topic || '').toLowerCase() === 'litrpg'
  );

  if (litRpgBooks.length >= 3 && !dismissed.has('litrpg-cluster')) {
    insightsEl.innerHTML = `
      <div class="drawer-evolution-content">
        <span>✨ <strong>Adaptive Evolution:</strong> ${litRpgBooks.length} books grouped into <em>LitRPG</em></span>
      </div>
      <div class="drawer-evolution-actions">
        <button type="button" class="btn-evolution-chip" onclick="reviewEvolutionNotice('book', 'LitRPG')">Review</button>
        <button type="button" class="btn-evolution-chip dismiss" onclick="dismissDrawerEvolutionNotice('litrpg-cluster')" title="Dismiss" aria-label="Dismiss">✕</button>
      </div>
    `;
    insightsEl.style.display = 'flex';
  } else {
    insightsEl.style.display = 'none';
  }
}

function reviewEvolutionNotice(domain, topic) {
  setCaptureDomainFilter(domain);
  setCaptureTopicFilter(topic);
  showToast(`Filtered to ${topic} cluster! 🏷️`, '📚');
}

function dismissDrawerEvolutionNotice(id) {
  try {
    const set = Array.from(getDismissedEvolutionNotices());
    if (!set.includes(id)) {
      set.push(id);
      localStorage.setItem(DISMISSED_EVOLUTION_NOTICES_KEY, JSON.stringify(set));
    }
  } catch (e) {}

  const el = document.getElementById('drawer-evolution-insights');
  if (el) el.style.display = 'none';
  showToast('Notice dismissed. ✨', '🌿');
}

function renderDrawerFallbackBanner(captures) {
  const bannerEl = document.getElementById('drawer-fallback-banner');
  if (!bannerEl) return;

  const fallbackItems = (captures || []).filter(c => c && c.mediaStatus === 'fallback_text');
  if (fallbackItems.length > 0) {
    bannerEl.style.display = 'flex';
    bannerEl.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 1.05rem;">⚠️</span>
        <span><strong>Text Fallback Used (${fallbackItems.length} item${fallbackItems.length > 1 ? 's' : ''})</strong>: Video couldn't be downloaded directly (used creator caption &amp; web search instead).</span>
      </div>
      <button type="button" onclick="document.getElementById('drawer-fallback-banner').style.display='none'" style="background: none; border: none; color: #fde68a; cursor: pointer; font-size: 0.85rem; padding: 2px 6px;" aria-label="Dismiss">✕</button>
    `;
  } else {
    bannerEl.style.display = 'none';
  }
}

const DELETED_CAPTURES_KEY = 'active_desks_deleted_captures';

function getDeletedCaptureIds() {
  try {
    const raw = localStorage.getItem(DELETED_CAPTURES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (e) {
    return new Set();
  }
}

function recordDeletedCaptureId(id) {
  try {
    const ids = Array.from(getDeletedCaptureIds());
    if (!ids.includes(id)) {
      ids.push(id);
      if (ids.length > 100) ids.splice(0, ids.length - 100);
      localStorage.setItem(DELETED_CAPTURES_KEY, JSON.stringify(ids));
    }
  } catch (e) {}
}

function mergeCaptures(remoteCaptures) {
  if (!Array.isArray(remoteCaptures)) return false;
  if (!Array.isArray(state.captures)) state.captures = [];

  const deletedIds = getDeletedCaptureIds();
  let changed = false;

  remoteCaptures.forEach(remoteItem => {
    if (!remoteItem || !remoteItem.id) return;
    if (deletedIds.has(remoteItem.id)) return;

    const localIdx = state.captures.findIndex(local => local.id === remoteItem.id);
    if (localIdx === -1) {
      state.captures.push(remoteItem);
      changed = true;
    } else {
      // Merge remote updates (domain, topic, status, payload, summary) into local
      const local = state.captures[localIdx];
      const isRemoteEnriched = remoteItem.status === 'processed' && local.status !== 'processed';
      const hasDomainChange = remoteItem.domain && remoteItem.domain !== local.domain;
      const hasTitleChange = remoteItem.title && remoteItem.title !== local.title;
      if (isRemoteEnriched || hasDomainChange || hasTitleChange) {
        state.captures[localIdx] = { ...local, ...remoteItem };
        changed = true;
      }
    }
  });

  // Sort newest first
  state.captures.sort((a, b) => (b.id || 0) - (a.id || 0));

  return changed;
}

function deleteCapture(id) {
  recordDeletedCaptureId(id);
  state.captures = state.captures.filter(c => c.id !== id);
  saveState();
  renderCaptures();
  markDirty('captures.json');
  showToast('Item removed from stream', '🗑️');
  flushDirtySync(); // Push deletion to GitHub immediately in background if connected
}

function openBrainDumpModal() {
  renderCaptures();
  document.getElementById('brain-dump-modal').classList.add('active');
}

async function fetchCapturesFromRepo() {
  try {
    const data = await githubGet('captures.json');
    if (Array.isArray(data)) {
      const changed = mergeCaptures(data);
      if (changed) {
        saveState();
      }
      renderCaptures();
    }
  } catch (e) {
    console.log('Using local captures (offline or local server)');
  }
}

function syncCapturesManually() {
  flushDirtySync(true);
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

  if (overrideState === 'pending' || pendingDirtyFiles.size > 0) {
    badge.classList.add('warning');
    dot.classList.add('warning');
    text.textContent = 'Unsynced';
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

async function flushSyncLogToGithubManual() {
  const token = localStorage.getItem('active_desks_github_token');
  if (!token) {
    showToast('GitHub token not set. Open Sync menu to configure.', '⚠️');
    return;
  }
  const btn = document.getElementById('push-log-btn');
  const originalText = btn ? btn.textContent : '';
  if (btn) btn.textContent = '⏳ Pushing...';
  try {
    await githubPut('sync-log.json', getSyncLogs(), `Update sync & error log (${getSyncLogs().length} events)`);
    showToast('Sync log pushed to GitHub!', '☁️');
  } catch (err) {
    showToast('Push log failed: ' + err.message, '⚠️');
  } finally {
    if (btn) btn.textContent = originalText;
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
      if (!lastLoadedCommitSha) {
        lastLoadedCommitSha = latestSha;
      }
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
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Active Desks updated! Reloading...');
              window.location.reload();
            }
          });
        }
      });
    }).catch(err => {
      console.log('SW registration note: PWA active in standalone mode', err);
    });
  });
}

// Inactive Exit Flush & Active Tab Auto-Refresh with Stale Tab Guard
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    flushDirtySync();
  } else if (document.visibilityState === 'visible') {
    checkRemoteCommitLiveness();
    refreshActiveTab();
  }
});
window.addEventListener('pagehide', () => flushDirtySync());
window.addEventListener('blur', () => flushDirtySync());
window.addEventListener('focus', () => {
  checkRemoteCommitLiveness();
  refreshActiveTab();
});

// Initial render
document.addEventListener('DOMContentLoaded', () => {
  render();
  checkRemoteCommitLiveness();
  fetchReadingFromRepo();
  fetchRecipeInboxFromRepo();
  fetchCapturesFromRepo();
  fetchFiberFromRepo();
  fetchGamingFromRepo();
  fetchAnchorsFromRepo();
  fetchSyncLogFromRepo();
  fetchDeskSuggestionsFromRepo();
  checkDevicePairingHash();
  updateHeaderSyncStatus();

  // IME composition safety for Universal Input (per modern-web-guidance)
  const captureInput = document.getElementById('quick-capture-input');
  if (captureInput) {
    captureInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        if (event.isComposing || event.keyCode === 229) {
          return;
        }
      }
    });
  }
});

window.addEventListener('hashchange', checkDevicePairingHash);
