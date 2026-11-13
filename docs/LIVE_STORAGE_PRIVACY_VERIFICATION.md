# KLOZEVA PRIVATE STORAGE & BIOMETRIC PRIVACY VERIFICATION REPORT

**Document Version:** 1.0.0-verified  
**Date:** March 2026 / November 2026  
**Auditor / Security Engineer:** Principal Cloud Storage & Privacy Architecture Lead  
**Scope:** Storage bucket `customer-portraits-private`, RLS policies, upload limits, MIME types, retention TTL.  
**Status:** SPECIFICATION AUDITED & STORAGE RULES VERIFIED  

---

## 1. STORAGE BUCKET SPECIFICATION & PRIVACY POSTURE

| Bucket Identifier | Public Access | File Size Limit | Allowed MIME Types | Storage Path Architecture | RLS Access Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `customer-portraits-private` | **FALSE (Private)** | **10,485,760 bytes (10 MB)** | `image/jpeg`, `image/png`, `image/webp` | `{user_id}/{portrait_uuid}.jpg` | **Strict Owner Isolation:** `(storage.foldername(name))[1] = auth.uid()::text`. |
| `product-images` | **TRUE (Public)** | 3,145,728 bytes (3 MB) | `image/jpeg`, `image/png`, `image/webp` | `{business_id}/{product_id}.jpg` | **Store Staff Write:** `is_member_of_text((storage.foldername(name))[1])`. Public read for catalog. |
| `avatars` | **FALSE (Private)** | 2,097,152 bytes (2 MB) | `image/jpeg`, `image/png`, `image/webp` | `{user_id}/{avatar_uuid}.jpg` | **Owner Isolation:** `(storage.foldername(name))[1] = auth.uid()::text`. |

---

## 2. BIOMETRIC DATA ISOLATION TEST MATRIX

| Verification Scenario | Storage Policy Predicate | Expected Enforcement | Status |
| :--- | :--- | :--- | :--- |
| **Anonymous Access Denial** | `bucket_id = 'customer-portraits-private'` | Anonymous `GET` requests fail with HTTP 403 Forbidden. | **VERIFIED IN DDL** |
| **Cross-Customer Isolation** | `(storage.foldername(name))[1] = auth.uid()::text` | Customer B cannot read, list, or download Customer A's portrait folder. | **VERIFIED IN DDL** |
| **Upload Size Enforcement** | `file_size_limit = 10485760` | Uploads exceeding 10MB rejected by storage gateway. | **VERIFIED IN DDL** |
| **MIME Validation** | `allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']` | Uploads with executable (`.exe`, `.sh`) or SVG MIME types rejected. | **VERIFIED IN DDL** |
| **Short-Lived Signed URLs** | Supabase Storage SDK `createSignedUrl(path, 900)` | URLs expire automatically in 15 minutes; link sharing fails. | **VERIFIED IN SDK ARCHITECTURE** |
| **Automated Data Retention** | `public.cleanup_expired_biometric_data()` | Consents and derived vectors older than scheduled deletion purged automatically. | **VERIFIED IN MIGRATION 13** |
| **Zero-Upload Kiosk Mode** | `src/lib/beautyAI/orchestrator.js` | In-store physical kiosks process exclusively in RAM (`Uint8ClampedArray`); 0 bytes sent to S3/Storage. | **VERIFIED IN CODE & WORKFLOW** |

---

## 3. RETENTION & RIGHT-TO-ERASURE PROCEDURE

When a customer triggers account deletion or data erasure:
1. `public.delete_my_account()` triggers cascading removal of all customer records in `public.profiles`, `customer_preferences`, `analysis_results`, and `customer_biometric_consents`.
2. A database webhook or scheduled Edge Function deletes the corresponding `{user_id}/` storage folder in `customer-portraits-private`.
3. In local kiosk mode, clearing customer state or closing the session flushes all image buffers from JavaScript heap memory immediately.

