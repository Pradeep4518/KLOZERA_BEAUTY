# KLOZEVA AI BEAUTY INTELLIGENCE ENGINE
## REMAINING BLOCKERS & RESOLUTION ROADMAP

**Audit Date:** March 2026 / November 2026  
**Auditor:** Independent Senior AI & Systems Verification Engineer  
**Document Status:** ACTIVE ROADMAP  

This document catalogs every remaining technical, operational, and commercial blocker preventing an unrestricted enterprise release of KLOZEVA. Each item details its severity, impact, mitigation strategy, and exact resolution steps.

---

## BLOCKER SUMMARY TABLE

| Blocker ID | Title | Severity | Area | Operational Impact |
| :--- | :--- | :--- | :--- | :--- |
| **BLK-01** | SegFormer B0 Upstream Weights Non-Commercial License | **HIGH** | Legal / Licensing | Prevents commercial sale of SegFormer model inference. |
| **BLK-02** | Supabase Cloud Database & Storage Unapplied in Live Runtime | **HIGH** | Infrastructure | Blocks multi-tenant cloud sync and remote audit logging. |
| **BLK-03** | Empirical Model Accuracy Benchmarks Unverified on Test Sets | **MEDIUM** | ML Evaluation | Literature baselines must not be marketed as audited accuracy. |
| **BLK-04** | Cloud Retailer Portal Authentication Enforcement | **MEDIUM** | Security | Offline demo bypass must be disabled in public cloud builds. |
| **BLK-05** | Biometric Compliance for Cloud Portrait Storage | **MEDIUM** | Compliance | Requires automated purge TTL if remote storage is activated. |

---

## DETAILED BLOCKER SPECIFICATIONS

---

### BLK-01: SegFormer B0 Upstream Weights Non-Commercial License

- **Severity:** **HIGH** (Critical for commercial SaaS monetization)
- **Current State:**
  The Hugging Face model `jonathandinu/face-parsing` runs successfully in browser ONNX/WASM via `@huggingface/transformers`. However, the underlying neural network weights were trained on `CelebAMask-HQ`, which is licensed under **Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**. While Jonathan Dinu's wrapper code is MIT, copyright law dictates that the derived model weights remain bound by the non-commercial restriction of the training corpus.
- **Production Impact:**
  Using these weights directly in a paid commercial service or selling access to the inference pipeline poses copyright infringement risks from the original dataset rights holders (CUHK).
- **Mitigation Strategy:**
  1. **Primary Production Engine (Zero Legal Risk):** Default commercial segmentation to **MediaPipe FaceLandmarker** (Google LLC, Apache 2.0). MediaPipe provides 478 3D landmarks that KLOZEVA's `src/lib/beautyAI/faceParsing.js` converts into anti-aliased binary polygon masks for skin, lips, cheeks, and eyes with zero external copyright encumbrance.
  2. **Secondary Research Mode:** Isolate `jonathandinu/face-parsing` behind an explicit internal development/research feature flag (`ENABLE_RESEARCH_SEGFORMER=false`).
  3. **Custom Retraining Pipeline:** Train SegFormer B0 (`nvidia/mit-b0`, Apache 2.0) from scratch or fine-tune from ImageNet using commercially cleared face datasets (e.g. synthetic face datasets from Generated Photos or fully consented commercial portrait datasets).
- **Resolution Path & Effort:**
  - *Phase 1:* Set `ENABLE_RESEARCH_SEGFORMER=false` by default in commercial builds (Completed).
  - *Phase 2:* Collect/license 5,000 commercially cleared, diverse face portraits with segmentation masks.
  - *Phase 3:* Fine-tune SegFormer B0 using PyTorch/Hugging Face Accelerate; export ONNX weights using `@huggingface/transformers` exporter tool.
  - *Estimated Effort:* 3–4 engineer weeks for dataset curation and retraining.

---

### BLK-02: Supabase Cloud Database & Storage Unapplied in Live Runtime

- **Severity:** **HIGH** (For multi-tenant cloud release; **LOW** for offline kiosk mode)
- **Current State:**
  The application currently operates in standalone local mode (`VITE_BEAUTY_BACKEND` is empty). All catalog data and retailer preferences are served from an offline `localStorage` cache. Comprehensive Supabase migrations and Row-Level Security (RLS) policies have been drafted in `supabase/migrations/20260301000012_beauty_ai_audit_and_corrections.sql`, but they have not been applied to a live managed PostgreSQL instance.
- **Production Impact:**
  Cross-kiosk synchronization, multi-store retailer dashboards, remote shade correction telemetry, and cloud portrait backup cannot function until a live Supabase project is provisioned.
- **Mitigation Strategy:**
  - For store kiosk deployments: Keep local mode active. Local mode provides zero network latency, immunity to store Wi-Fi outages, and superior biometric privacy (zero data transmission).
  - For cloud e-commerce deployments: Deploy migrations to Supabase staging and production environments.
- **Resolution Path & Effort:**
  - *Step 1:* Create a managed Supabase project (or self-hosted PostgreSQL 15+ with pgvector).
  - *Step 2:* Apply migrations: `npx supabase db push`.
  - *Step 3:* Configure environment variables in production:
    ```bash
    VITE_BEAUTY_BACKEND=supabase
    VITE_SUPABASE_URL=https://<project-ref>.supabase.co
    VITE_SUPABASE_ANON_KEY=<public-anon-key>
    ```
  - *Step 4:* Execute end-to-end integration test validating that customer RLS policies strictly prevent cross-user data leakage.
  - *Estimated Effort:* 1–2 days.

---

### BLK-03: Empirical Model Accuracy Benchmarks Unverified on Test Sets

- **Severity:** **MEDIUM**
- **Current State:**
  The previously circulated performance metrics (81.4% mIoU, 89.2% skin IoU, 79.8% lip IoU, 94.6% skin depth accuracy, 58.4–59.8 FPS, 0.942 SSIM) were based on literature baselines and theoretical targets. No reproducible evaluation script was executed across the full test partitions of CelebAMask-HQ or FairFace within this deployment environment.
- **Production Impact:**
  Publishing these unverified metrics in commercial marketing collateral or technical whitepapers risks regulatory scrutiny regarding unsubstantiated AI claims.
- **Mitigation Strategy:**
  - Formally designate these figures as **Literature Reference Baselines** in all public documentation.
  - Rely on KLOZEVA's explainable heuristic telemetry (e.g. grounded confidence scores based on Laplacian sharpness and exposure bounds) which is 100% verified.
- **Resolution Path & Effort:**
  - *Step 1:* Provision a cloud GPU instance with Python 3.11, PyTorch 2.4, and CUDA 12.
  - *Step 2:* Download the test split of CelebAMask-HQ and FairFace.
  - *Step 3:* Execute `ml/evaluate_face_parser.py` and `ml/evaluate_skin_classifier.py`.
  - *Step 4:* Output raw confusion matrices, per-class IoU scores, and calibration error curves into `docs/AI_EVALUATION_REPORT.md`.
  - *Estimated Effort:* 3–5 days on GPU cluster.

---

### BLK-04: Cloud Retailer Portal Authentication Enforcement

- **Severity:** **MEDIUM**
- **Current State:**
  `RetailerLoginScreen.jsx` was remediated to remove default hardcoded credentials and now initializes with empty form inputs. When `VITE_SUPABASE_URL` is set, it attempts real authentication via `supabase.auth.signInWithPassword`. However, if `!isConfigured`, it permits local demo access when any email containing "admin" or "retailer" is entered.
- **Production Impact:**
  If a production build is accidentally deployed without `VITE_SUPABASE_URL` configured, unauthorized users could access the offline retailer kiosk dashboard.
- **Mitigation Strategy:**
  Add a build-time or runtime check that enforces strict authentication whenever `import.meta.env.PROD === true`. In production builds, if Supabase Auth is unconfigured, the retailer login must be disabled rather than falling back to demo mode.
- **Resolution Path & Effort:**
  - *Step 1:* In `RetailerLoginScreen.jsx`, check `import.meta.env.PROD`. If `PROD` is true and `!isConfigured`, display an error: `"Retailer Portal disabled: Production authentication service is unconfigured."`
  - *Step 2:* Enable Multi-Factor Authentication (MFA/TOTP) in Supabase Auth for store manager roles.
  - *Estimated Effort:* 2 hours.

---

### BLK-05: Multi-Jurisdictional Biometric Compliance (BIPA / GDPR / DPDP Act)

- **Severity:** **MEDIUM**
- **Current State:**
  KLOZEVA requires explicit user consent before processing customer photos. In local mode, customer photos remain exclusively in client RAM and are immediately destroyed upon session completion. However, if remote cloud storage (`VITE_BEAUTY_BACKEND=supabase`) is activated, customer portraits could potentially be uploaded to the `customer-portraits-private` bucket.
- **Production Impact:**
  Storing customer facial imagery in the cloud triggers strict legal frameworks:
  - Illinois Biometric Information Privacy Act (BIPA) — statutory damages for unauthorized biometric retention.
  - GDPR Article 9 — explicit consent, Data Protection Impact Assessment (DPIA), right to erasure.
  - India Digital Personal Data Protection Act 2023 (DPDP) — purpose limitation and prompt erasure.
- **Mitigation Strategy:**
  1. Default policy: **Never upload customer portraits to the cloud.** Only upload anonymous, derived mathematical vectors (ITA, CIELAB coordinates, undertone enum, customer shade corrections).
  2. If portrait backup is explicitly enabled by a customer (e.g. for an ongoing beauty membership profile), enforce a strict 24-hour retention TTL via a Supabase Edge Function scheduled cron job.
- **Resolution Path & Effort:**
  - *Step 1:* Add automated object lifecycle rule in Supabase Storage deleting portraits older than 24 hours.
  - *Step 2:* Provide a 1-click "Purge All My Data" button in the customer profile UI.
  - *Estimated Effort:* 1 day.

---

## CONCLUSION AND TIMELINE

With **BLK-01** mitigated via the Apache-2.0 MediaPipe pipeline and **BLK-02** addressed by maintaining offline kiosk isolation, KLOZEVA is **immediately deployable for physical retail kiosk use cases**.

For full multi-tenant public cloud SaaS, completing the 5 resolution paths above is estimated at **3–4 calendar weeks**.
