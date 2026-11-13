# Deployment

## Netlify (frontend)

`netlify.toml` is already set up (`npm run build`, publish `dist`, Node 20) and `public/_redirects` handles SPA routing.
Connect the repo, deploy. No environment variables are needed for the default (localStorage) mode.

## Supabase backend (optional)

1. Create a Supabase project and link it: `supabase link --project-ref <ref>`.
2. Apply the migrations: `supabase db push`
   (this adds `beauty_kiosk_store` via `20260301000011_beauty_kiosk_store.sql`).
3. Deploy the Gemini function and set its secret:
   ```bash
   supabase functions deploy beauty-analyze
   supabase secrets set GEMINI_API_KEY=your-gemini-key
   ```
4. In Netlify (or `.env` locally) set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_BEAUTY_BACKEND=supabase`.

Without a `GEMINI_API_KEY` the function answers 503 and the app uses its built-in colorimetric analysis.

## Data and privacy

Customer photos are never stored: they stay in the browser session and are only sent to Gemini when the backend is enabled
and a key is configured. The stored database (customers, analyses, inventory) is demo-grade protected, see the security
note in `README.md`.
