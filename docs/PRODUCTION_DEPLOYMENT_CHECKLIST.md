# KLOZEVA PRODUCTION DEPLOYMENT & LAUNCH CHECKLIST

**Document Version:** 1.0.0-production-checklist  
**Date:** March 2026 / November 2026  
**Auditor / Release Manager:** Principal DevSecOps & Cloud Release Engineer  
**Scope:** Multi-Tenant Enterprise Cloud SaaS Launch Controls  
**Status:** ACTIVE PRODUCTION CHECKLIST  

---

## 1. PRE-DEPLOYMENT TECHNICAL GATES

| Checkpoint | Requirement | Verification Command | Gate Status |
| :--- | :--- | :--- | :--- |
| **P-01: TypeScript Strict Check** | 0 type errors allowed | `npm run typecheck` (`tsc --noEmit`) | **COMPLETED & VERIFIED (0 errors)** |
| **P-02: ESLint Code Quality** | 0 linting errors allowed | `npm run lint` | **COMPLETED & VERIFIED (0 errors)** |
| **P-03: Automated Test Suite** | 100% test pass rate required | `npm test` (vitest run) | **COMPLETED & VERIFIED (55/55 passed)** |
| **P-04: Production Bundle** | Clean production build without errors | `npm run build` | **COMPLETED & VERIFIED (dist/ built)** |
| **P-05: Secrets Exposure Check** | No private secrets in client bundle | `grep -rn "service_role" dist/` | **COMPLETED & VERIFIED (0 secrets)** |

---

## 2. PRODUCTION SUPABASE PROJECT PROVISIONING

| Step | Action Required | Responsible Party | Status |
| :--- | :--- | :--- | :--- |
| **S-01: Project Creation** | Create dedicated Production Supabase Project (separate from staging). | Platform Administrator | **PENDING USER ACTION** |
| **S-02: Region Sizing** | Select target cloud region (e.g. `ap-south-1` Mumbai for India SaaS). | Platform Administrator | **PENDING USER ACTION** |
| **S-03: Migration Execution** | Execute forward migrations: `npx supabase db push`. | Release Engineer | **READY TO EXECUTE** |
| **S-04: RLS Test Suite** | Run `supabase/tests/rls_checks.sql` against production cluster. | Security Engineer | **READY TO EXECUTE** |
| **S-05: Storage Bucket Setup** | Verify bucket `customer-portraits-private` exists with private RLS. | Cloud Architect | **READY (In Migration 13)** |
| **S-06: Edge Secrets Injection** | Run `npx supabase secrets set GEMINI_API_KEY=...`. | DevSecOps Lead | **READY TO EXECUTE** |
| **S-07: PITR Backup Activation**| Enable Point-In-Time Recovery with 7-day retention. | Platform Administrator | **PENDING USER ACTION** |

---

## 3. DOMAIN, CORS & CDN SECURITY HEADERS

Configure production DNS and edge CDN (Cloudflare / Netlify / Vercel):

### 3.1 Allowed Origins (Supabase Auth Settings):
- Production Site URL: `https://app.klozeva.in`
- Redirect URLs:
  - `https://app.klozeva.in/retailer/auth/callback`
  - `https://app.klozeva.in/retailer/reset-password`
  - `https://app.klozeva.in/auth/v1/callback`

### 3.2 Security Headers (`public/_headers`):
```http
/*
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(self), microphone=(), geolocation=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 4. INCIDENT RESPONSE & DISASTER RECOVERY

1. **Automated Rollback:** If any post-deployment smoke test fails, revert CDN alias to previous immutable deployment artifact within 60 seconds.
2. **Database Rollback:** Forward migrations are non-destructive; database state can be restored via Point-In-Time Recovery (PITR) to pre-migration timestamp.
3. **Data Breach Protocol:** If unauthorized biometric access is suspected, execute emergency kill switch revoking all active Supabase anon keys and flush the `customer-portraits-private` bucket.

