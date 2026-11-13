# KLOZEVA Production Deployment & Security Guide

---

## 1. Production Architecture Overview

The KLOZEVA platform is deployed in dual environments:
1. **Front-of-House Beauty Kiosks**: Touchscreen terminals running the Vite-built React SPA with on-device hardware-accelerated computer vision (WASM/WebGPU).
2. **Retailer Cloud Portal**: Web administration hub for inventory management, CRM logging, shade analytics, and Supabase data synchronization.

---

## 2. Environment Variables & Secrets Management

| Variable Name | Environment | Sensitivity | Description |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Frontend (`.env.production`) | Public | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend (`.env.production`) | Public | Supabase anon key with strict RLS |
| `VITE_BEAUTY_BACKEND` | Frontend (`.env.production`) | Public | Set to `supabase` to persist data |
| `VITE_BEAUTY_AI_MODE` | Frontend (`.env.production`) | Public | Default `hybrid` (on-device + cloud fallback) |
| `GEMINI_API_KEY` | Supabase Vault | **SECRET** | Google Gemini API Key (Never in frontend) |
| `HUGGINGFACE_TOKEN` | Server / CI | **SECRET** | Hugging Face Access Token (Never in frontend) |

---

## 3. Image Privacy & Data Protection Safeguards

1. **Zero-Persistence Default**: Captured guest portraits are stored in volatile JavaScript object memory (`Blob` or `HTMLImageElement`) and are discarded upon session restart or timeout.
2. **Ephemeral Edge Processing**: When Gemini analysis is triggered, the photo payload is transmitted via TLS 1.3 to the Edge Function, processed in memory, and immediately released. No biometric images are written to persistent disk or public S3/GCS buckets.
3. **Customer Consent Enforcement**: Biometric capture requires explicit customer opt-in during Step 01. If marketing consent is declined, messaging and automated dispatch are blocked.

---

## 4. Build & Production Verification Steps

```bash
# 1. Typecheck and bundle frontend
npm run build

# 2. Execute automated test suite
npm test

# 3. Preview production distribution locally
npm run preview -- --port 5173
```

