# KLOZEVA ENTERPRISE MULTI-TENANT PRODUCTION DEPLOYMENT GUIDE

**Document Version:** 2.0.0-production-saas  
**Date:** March 2026 / November 2026  
**Auditor / Architect:** Principal DevSecOps & Cloud Release Engineer  
**Status:** APPROVED PRODUCTION RELEASE SPECIFICATION  

---

## 1. DUAL PRODUCTION ARCHITECTURE

The KLOZEVA AI Beauty Intelligence Engine operates in two production deployment configurations:

### Configuration 1: In-Store Physical Beauty Kiosks
- **Target:** Touchscreen in-store kiosks, retail beauty counter tablets (iPad Pro, Surface Pro, Android kiosks).
- **Runtime:** Vite SPA served from local network cache or static CDN.
- **Compute:** 100% on-device hardware-accelerated computer vision (WASM SIMD / WebGL) running MediaPipe FaceLandmarker and procedural canvas shaders.
- **Data Flow:** Zero cloud network dependency for facial imagery; offline `localStorage` catalog cache.
- **Privacy:** 100% ephemeral client RAM (`Uint8ClampedArray`). Zero biometric persistence.

### Configuration 2: Multi-Tenant Commercial Cloud SaaS
- **Target:** Web-scale multi-brand beauty retail platform, salon chain booking, and e-commerce try-on.
- **Runtime:** Edge CDN (Cloudflare / Netlify / Vercel) fronting Supabase managed PostgreSQL backend.
- **Authentication:** Supabase Auth with TOTP MFA (AAL2) required for store managers.
- **Authorization:** PostgreSQL Row Level Security (RLS) isolating tenants (`businesses`) and shoppers (`profiles`).
- **Storage:** Private S3-compatible encrypted bucket (`customer-portraits-private`) with signed URLs and 30-day auto-TTL.

---

## 2. PRE-DEPLOYMENT PRODUCTION CHECKLIST

Before deploying to production cloud infrastructure, execute and verify:

```bash
# 1. TypeScript Strict Typecheck (0 errors required)
npm run typecheck

# 2. ESLint Code Hygiene (0 errors required)
npm run lint

# 3. Vitest Unit & Integration Suite (100% passing required)
npm test

# 4. Production Bundle Build (Zero external secrets in bundle)
npm run build
```

---

## 3. SUPABASE CLOUD DATABASE DEPLOYMENT

### Step 3.1: Link to Managed Supabase Cluster
```bash
npx supabase login
npx supabase link --project-ref <PRODUCTION_PROJECT_REF>
```

### Step 3.2: Execute Idempotent Forward Migrations
```bash
# Push migrations 20260301000001 through 20260301000013
npx supabase db push
```

### Step 3.3: Verify Row Level Security in Live PostgreSQL
```bash
psql "$PRODUCTION_DATABASE_URL" -f supabase/tests/rls_checks.sql
```
*Expected Output:* `NOTICE: ALL KLOZEVA CHECKS PASSED`

### Step 3.4: Configure Edge Function Secrets
```bash
npx supabase secrets set GEMINI_API_KEY=<SECURE_GEMINI_API_KEY>
npx supabase functions deploy beauty-analyze
```

---

## 4. STATIC HOSTING & CDN CONFIGURATION

Deploy `dist/` directory to high-availability static edge CDN (Netlify, Cloudflare Pages, or AWS S3/CloudFront):

### Required HTTP Headers (`public/_headers`):
```http
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.huggingface.co https://cdn.jsdelivr.net;
```

---

## 5. MONITORING, TELEMETRY & INCIDENT RESPONSE

1. **Synthetic Health Checks:** Continuous ping to `GET /` and Supabase `GET /rest/v1/beauty_ai_models?select=count`.
2. **Error Telemetry:** Frontend errors reported to Sentry with PII scrubbing (all image buffers, canvas references, and customer names stripped prior to transport).
3. **Automated Data Purge Verification:** Daily cron executing `public.cleanup_expired_biometric_data()` to ensure GDPR/BIPA compliance.
4. **Disaster Recovery:** Automated nightly pg_dump backups with 7-day retention and point-in-time recovery (PITR) active.
