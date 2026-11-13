# KLOZEVA PRODUCTION ENVIRONMENT CONFIGURATION SPECIFICATION

**Document Version:** 1.0.0-production  
**Date:** March 2026 / November 2026  
**Auditor / Architect:** Principal DevSecOps & Cloud Security Architect  
**Status:** PRODUCTION SPECIFICATION & SECRETS GUIDE  

---

## 1. APPLICATION ENVIRONMENT MODES

KLOZEVA operates under three discrete runtime environments with unambiguous operational boundaries:

### Mode A: LOCAL KIOSK (`VITE_APP_MODE=kiosk`)
- **Primary Use Case:** In-store physical retail kiosks and pop-up beauty stations.
- **Backend Storage:** High-performance offline `localStorage` cache for cosmetic catalog and brand preferences.
- **Biometric Security:** 100% ephemeral in-memory processing (`Uint8ClampedArray` in canvas/worker). No customer portraits or landmark vectors are written to disk or transmitted across network interfaces.
- **Authentication:** Local offline kiosk session with an explicit amber warning badge. Zero cloud credentials required.
- **Model Policy:** `commercial` policy enforcing MediaPipe FaceLandmarker (Apache 2.0).

### Mode B: STAGING (`VITE_APP_MODE=staging`)
- **Primary Use Case:** Pre-production multi-tenant testing, automated QA, and partner retailer demonstrations.
- **Backend Storage:** Live Supabase Staging PostgreSQL instance with full Row-Level Security (RLS) enabled.
- **Biometric Security:** Private bucket (`customer-portraits-private`) with customer-scoped RLS.
- **Authentication:** Supabase Auth enforced with test retailer accounts and MFA.
- **Model Policy:** `commercial` policy with optional `research` flag for benchmark comparisons.

### Mode C: PRODUCTION CLOUD (`VITE_APP_MODE=production`)
- **Primary Use Case:** Multi-tenant commercial e-commerce web platform and cross-store enterprise retail SaaS.
- **Backend Storage:** Live Supabase Production cluster with PITR backups and automated biometric data purges.
- **Biometric Security:** Granular 5-part consent enforced. Ephemeral processing by default; encrypted storage with 30-day auto-TTL only upon explicit opt-in.
- **Authentication:** Strict Supabase Auth with TOTP MFA (AAL2) required for store managers and administrators. **Fail-Closed:** Insecure offline fallbacks are disabled.
- **Model Policy:** Strictly `commercial` policy. Non-commercial weights (`jonathandinu/face-parsing`) are rejected at the runtime gate.

---

## 2. ENVIRONMENT VARIABLE SPECIFICATION

| Variable Name | Environment Scope | Exposure | Allowed Values | Description & Security Boundary |
| :--- | :--- | :--- | :--- | :--- |
| `VITE_APP_MODE` | Frontend | Public | `kiosk`, `staging`, `production`, `development` | Dictates application security boundaries, auth fail-closed behavior, and offline mode. |
| `VITE_BEAUTY_MODEL_POLICY`| Frontend | Public | `commercial`, `production`, `research` | Controls model clearance gates. When set to `commercial`, research weights are blocked. |
| `VITE_BEAUTY_BACKEND` | Frontend | Public | `localStorage`, `supabase` | Dictates whether product catalog and customer profiles use local cache or cloud PostgreSQL. |
| `VITE_SUPABASE_URL` | Frontend | Public | `https://<ref>.supabase.co` | HTTPS endpoint for Supabase API gateway. Publicly bundled in client code. |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Public | Public JWT Anon Key | Public client key for row-level secured queries. Never holds administrative rights. |
| `SUPABASE_SERVICE_ROLE_KEY`| Backend / CI/CD | **PRIVATE** | Service-Role Secret JWT | **CRITICAL SECRET:** Bypasses RLS. Used strictly in CI/CD migrations and server CLI. Never bundle in `VITE_`. |
| `GEMINI_API_KEY` | Supabase Vault | **PRIVATE** | Google AI Studio Key | Secret configured in Supabase Edge Function environment via `supabase secrets set`. |
| `HUGGINGFACE_TOKEN` | CI/CD Runner | **PRIVATE** | Hugging Face Access Token | Used strictly on offline CI/CD training runners to download base checkpoints. |

---

## 3. STRICT SECRETS HYGIENE & AUDIT CHECKLIST

1. **No Sensitive Keys in Bundle:** The frontend build (`dist/`) was scanned using automated grep patterns for `service_role`, `SUPABASE_KEY`, and raw private keys. Zero private credentials exist in client chunks.
2. **Git Tracking Protection:** `.gitignore` explicitly prevents `.env`, `.env.local`, `.env.production`, and credential archives from being tracked in version control.
3. **Fail-Closed Runtime Validation:** If `VITE_APP_MODE=production` is active and `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is missing, `RetailerLoginScreen.jsx` fails closed with an explicit security alert rather than falling back to demo mode.
