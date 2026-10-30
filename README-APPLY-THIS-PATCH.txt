# Birthday Card Store — UI redesign patch

This ZIP contains the redesigned frontend files only. It intentionally does not include backend, Supabase, authentication, cart, order, payment, database, or configuration files.

## Apply to your existing repository

1. Download/extract your current `BirthdayCardSelling_FullStack` repository.
2. Extract this ZIP into the repository root.
3. Allow Windows to merge the `src` folder and replace files when asked.
4. Commit and push the updated `src` folder to GitHub.

## Files included

- `src/pages/Home.tsx`
- `src/pages/Shop.tsx`
- `src/components/Layout.tsx`
- `src/components/ProductCard.tsx`
- `src/index.css`

No npm packages or Tailwind configuration changes are required. Existing route paths, state, effects, API calls, handlers, props and product data usage have been retained in these files.

Run locally:
```bash
npm install
npm run build
```
