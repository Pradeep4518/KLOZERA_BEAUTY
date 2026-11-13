# KLOZEVA Beauty Intelligence Platform

AI-assisted beauty kiosk (customer flow) plus retailer portal, built with
React + Vite + Tailwind on the same project layout as the KLOZEVA repo, with Supabase as the optional backend.

The application is the **KLOZEVA_Beauty_Intelligence_Platform** file, split into modules.
No features were changed or added.

## Run it

Requires Node.js 20.

```bash
npm install
npm run dev          # http://localhost:5173
```

That is all you need: with the defaults the app stores its data in the browser (localStorage), exactly like the original file.

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Typecheck + production build into `dist/` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (`src`, `tests`) |
| `npm test` | Vitest unit tests |

## Using

- **Customer Kiosk:** register and consent, camera capture or upload (three sample portraits included),
  skin analysis, inventory-backed recommendations, virtual makeup try-on, shade passport download.
- **Retailer Portal:** login is prefilled with the original demo credentials
  `admin@klozeva.in` / `klozeva2026`. Dashboard with inventory, products, customers and the database schema view.
- **Reset Demo** in the header restores the seed data.

## Supabase (optional backend)

The `supabase/` folder is kept from the KLOZEVA project as it was, with two additive pieces for this app:

- `supabase/migrations/20260301000011_beauty_kiosk_store.sql`: table `beauty_kiosk_store` that holds the app database.
- `supabase/functions/beauty-analyze/`: Edge Function that runs the Gemini 2.5 Vision analysis so the API key stays on the server.

Both are **off by default**. To turn them on, set in `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_BEAUTY_BACKEND=supabase
```

then apply the migration, deploy the function and set its secret (see `docs/DEPLOYMENT.md`).
If Supabase or Gemini is unreachable, the app silently falls back to localStorage and to the built-in
colorimetric analysis, as the original did.

> **Security note:** the Beauty kiosk has no Supabase Auth (the retailer login is a client-side demo login),
> so the migration lets the public anon key read and write the single stored row. Use it for demo data only,
> and add Supabase Auth plus stricter policies before storing real customer data.

## Project structure

```
klozeva/
├── index.html, vite.config.ts, tsconfig.json, tailwind.config.js, postcss.config.js
├── netlify.toml, public/          deployment config and static files (from the KLOZEVA project)
├── .github/workflows/ci.yml       typecheck, lint, test, build
├── docs/DEPLOYMENT.md
├── tests/                         seed data, recommendation engine, Supabase store
├── supabase/                      config, migrations, imports, tests, functions/beauty-analyze
└── src/
    ├── main.tsx, App.jsx, index.css
    ├── lib/
    │   ├── supabase.ts            Supabase client (from the KLOZEVA project)
    │   ├── beautyStore.ts         optional Supabase persistence + Gemini function call
    │   ├── seed.js                9-entity seed database
    │   ├── KLOZEVAContext.jsx     store context + recommendation engine
    │   ├── vision.js              AI vision with colorimetric fallback
    │   ├── portraits.js, useLuxuryFonts.js
    ├── components/ToastBanner.jsx
    └── pages/
        ├── WelcomeScreen.jsx
        ├── customer/              Registration, FacialCapture, ResultsHub, VirtualMakeupTryOnStudio
        └── retailer/              RetailerLoginScreen, RetailerDashboard
```

The UI modules are plain `.jsx` (the original code, untouched); `allowJs` is enabled in `tsconfig.json`.

## Notes

- The virtual try-on loads MediaPipe from a CDN, as in the original, so it needs internet access.
- Camera access requires `localhost` or HTTPS (Netlify provides HTTPS).
