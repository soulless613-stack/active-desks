# Active Desks Recipe Schema & Formatting Reference

## 1. Ingredient Formatting Standards

### Strict Single-Ingredient Rule
Each ingredient checklist item in the UI must represent **one single ingredient**.
Checklist items should never contain multiple comma-separated or ampersand-separated ingredients.

#### Bad Examples:
- ❌ `"2 tbsp tomato paste & 2 tbsp garlic paste"`
- ❌ `"1 1/2 tsp baking powder, 1/4 tsp baking soda"`
- ❌ `"Salt, pepper, and garlic powder to taste"`

#### Good Examples:
- ✅ `"30g (2 tbsp) tomato paste"`
- ✅ `"30g (2 tbsp) garlic paste"`
- ✅ `"1 1/2 tsp baking powder"`
- ✅ `"1/4 tsp baking soda"`
- ✅ `"1 tsp fine sea salt"`
- ✅ `"1/2 tsp freshly ground black pepper"`

### Dual Measurement Rule
Whenever possible, provide metric weight (grams) first, followed by US customary volume in parentheses:
- ✅ `"900g (32 oz) boneless skinless chicken breast, diced"`
- ✅ `"360g (3 cups) unbleached bread flour"`
- ✅ `"240ml (1 cup) whole milk, room temperature"`
- ✅ `"115g (1/2 cup / 1 stick) unsalted butter, cubed"`

---

## 2. JavaScript State Object Reference (`app.js`)

```javascript
{
  id: 'crispy-potato-meatballs',
  title: "Crispy Potato Meatballs",
  source: "Chef John (@foodwishes)",
  url: "https://www.instagram.com/reel/...",
  yield: "4 Servings (16 Meatballs)",
  calories: "410 kcal",
  protein: "32g",
  carbs: "28g",
  fat: "18g",
  highlight: "Mashed potato and ground sirloin meatballs with a crispy panko herb crust.",
  ingredients: [
    "450g (1 lb) 90/10 ground beef sirloin",
    "300g (2 medium) russet potatoes, peeled and boiled",
    "1 large egg, beaten",
    "40g (1/2 cup) grated Parmigiano-Reggiano",
    "2 cloves garlic, finely minced",
    "1 tsp kosher salt",
    "1/2 tsp freshly cracked black pepper",
    "1/4 tsp ground nutmeg",
    "60g (1/2 cup) seasoned panko breadcrumbs",
    "2 tbsp extra virgin olive oil (for baking)"
  ],
  steps: [
    "Mash boiled potatoes until completely smooth and allow to cool to room temperature.",
    "Gently fold ground beef, mashed potatoes, beaten egg, parmesan, garlic, salt, pepper, and nutmeg together until uniform.",
    "Shape into 16 equal meatballs (~45g each) and roll in panko breadcrumbs to coat.",
    "Arrange on a parchment-lined baking sheet and drizzle with olive oil.",
    "Bake at 425°F (220°C) for 18–22 minutes until deeply golden brown and crisp (internal temp 160°F)."
  ]
}
```

---

## 3. Macro Estimation Guidelines
If macros are not provided by the creator:
1. Estimate total calories and macronutrients based on raw ingredient weights using standard USDA values:
   - Protein: 4 kcal/g
   - Carbohydrates: 4 kcal/g
   - Fat: 9 kcal/g
2. Divide by the total recipe yield to compute single-serving values.
3. State the yield clearly (e.g. `10 Servings (Meal Prep)` or `12 Slices`).
