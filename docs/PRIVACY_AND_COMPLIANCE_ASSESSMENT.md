# KLOZEVA BIOMETRIC PRIVACY & MULTI-JURISDICTION COMPLIANCE ASSESSMENT

**Document Version:** 2.0.0-production-compliance  
**Date:** March 2026 / November 2026  
**Auditor / Reviewer:** Principal Cloud Security Engineer & Privacy Architecture Reviewer  
**Status:** IMPLEMENTED, TECHNICALLY ENFORCED & PREPARED FOR EXTERNAL LEGAL COUNSEL  

---

## 1. DATA INVENTORY & LIFECYCLE AUDIT

KLOZEVA processes data strictly under the principle of **Data Minimization** (GDPR Art. 5(1)(c), DPDP Act Sec. 6). Every processed asset is categorized below:

| # | Data Category | Processing Purpose | Collection Point | Processing Location | Leaves Device? | Persisted by Default? | Retention Period | Access Rights | Deletion Mechanism |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **01** | **Raw Facial Photographs** | Virtual makeup simulation & shade detection | User camera / local upload | Client Browser RAM / Canvas | **NO** (Local kiosk mode) | **NO** (Ephemeral `Uint8ClampedArray`) | Immediate flush on tab close | Customer only | In-memory GC / Page refresh |
| **02** | **Facial Landmarks (478 pts)** | Anatomical makeup alignment | Client MediaPipe FaceLandmarker | Client WebAssembly | **NO** | **NO** | Duration of active session | Customer only | Flushed upon session end |
| **03** | **Facial Segmentation Masks** | Region boundary definition (lips, cheeks) | MediaPipe / SegFormer | Client WebAssembly | **NO** | **NO** | Duration of active session | Customer only | Flushed upon session end |
| **04** | **Skin Depth Metrics (ITA°)** | Foundation & concealer shade ranking | Colorimetry Math Engine | Client CPU / Worker | **NO** (Derived scalar) | Only if consent granted | 90 days or until user account deletion | Customer & Store Kiosk | `cleanup_expired_biometric_data()` / 1-click erasure |
| **05** | **Undertone Classification** | Color matching (Warm/Cool/Neutral/Olive) | Colorimetry Math Engine | Client CPU / Worker | **NO** (Derived enum) | Only if consent granted | 90 days or user deletion | Customer & Store Kiosk | Profile reset |
| **06** | **Cosmetic Recommendations** | Curated product suggestions | Inventory matching algorithm | Client CPU / Supabase | Query only | Stored in shopping cart | Session / Order completion | Customer only | Cart discard |
| **07** | **Customer Shade Corrections** | Self-reported undertone/depth overrides | Fine-Tune drawer UI | Client / Supabase | Yes (Telemetry) | Yes (Anonymized scalar) | 1 year for calibration | Kiosk Store & Platform Admin | Customer request |
| **08** | **Guest / Customer Profiles** | Booking, appointments, shade passport | Registration step | Supabase Cloud | Yes | Yes (Encrypted Postgres) | Active account lifetime | Customer & Authorized Store | GDPR deletion workflow |
| **09** | **Retailer Credentials** | Kiosk analytics & store management | Retailer login portal | Supabase Auth (AAL2) | Yes | Yes (Supabase Auth) | Until revoked | Store Manager only | Account deletion |
| **10** | **Biometric Consent Records** | Statutory compliance proof | Consent modal checkboxes | Supabase Cloud | Yes | Yes (Audit log) | 3 years (Statute of limitations) | Platform Legal & Auditor | Auto-purged post statutory period |
| **11** | **Private Portrait Vault** *(Opt-in)* | Re-consultation across retail visits | Explicit opt-in checkbox | `customer-portraits-private` | Yes (Encrypted S3) | Yes (Encrypted) | Strictly 30 days (Auto-TTL) | Customer only (Signed URL) | Storage lifecycle auto-delete |

---

## 2. PRIVACY ARCHITECTURE & FIVE-PART GRANULAR CONSENT

In accordance with international privacy standards, **consent is never bundled or pre-checked**. In [`src/pages/customer/FacialCaptureStep.jsx`](file:///c:/Users/Pradeep/OneDrive/Desktop/ka_final_beaut/klozeva/src/pages/customer/FacialCaptureStep.jsx), five separate, unbundled consent controls are presented:

1. **[Required] On-Device Face Analysis Consent:**
   *Scope:* Temporary memory processing of face landmarks and skin pixels for real-time virtual try-on. Zero cloud upload.
2. **[Optional] Shade Passport Persistence Consent:**
   *Scope:* Saves derived skin depth and undertone scalars to personal beauty passport.
3. **[Optional] Portrait Retention Consent (Private Vault):**
   *Scope:* Retains encrypted photo in private cloud bucket for future store visits. Auto-expires in 30 days. Default: `false`.
4. **[Optional] Model Improvement & Calibration Consent:**
   *Scope:* Allows anonymous tone vectors to calibrate algorithms. **Refusing this consent does not restrict normal customer use.** Default: `false`.
5. **[Optional] External Multimodal AI Sharing Consent:**
   *Scope:* Explicit authorization to route image through Google Gemini Vision API Edge Function. Default: `false`.

---

## 3. MULTI-JURISDICTION LEGAL ASSESSMENT

### 3.1 India: Digital Personal Data Protection Act, 2023 (DPDP Act)
- **Applicability:** Applies to processing of digital personal data within India.
- **Lawful Grounds:** Processing is based on verifiable Consent (Section 6).
- **Notice Requirements:** Pre-collection notice rendered in clear, plain language specifying purpose and data principal rights.
- **Right to Erasure & Grievance Redressal:** KLOZEVA provides a 1-click "Export My Data" and "Delete My Account" function executing `public.delete_my_account()` in PostgreSQL.
- **Children's Data:** KLOZEVA requires age verification ($\ge 18$) for independent biometric capture.

### 3.2 European Union: GDPR & UK GDPR
- **Special Category Data (Article 9):** Facial images processed for the purpose of uniquely identifying a natural person constitute biometric data. KLOZEVA requires **Explicit Consent (Art. 9(2)(a))**.
- **Data Protection by Design and by Default (Article 25):** Local kiosk mode processes 100% on-device in ephemeral RAM without disk persistence.
- **Data Protection Impact Assessment (DPIA - Article 35):** Completed internally; requires external DPO sign-off prior to EU consumer rollout.
- **Right to be Forgotten (Article 17):** Supported through SQL cascade triggers and storage object deletion routines.

### 3.3 United States: Illinois BIPA (740 ILCS 14) & California CCPA/CPRA
- **Illinois BIPA:** Requires written policy with retention schedule and guidelines for permanent destruction. KLOZEVA's private portrait retention is hard-capped at 30 days via automated storage lifecycle rules. Zero biometric data is sold, leased, or traded.
- **California CPRA:** Biometric information classified as Sensitive Personal Information (SPI). Opt-out and "Limit the Use of My Sensitive Personal Information" links supported.

---

## 4. AUTOMATED RETENTION & AUTO-PURGE PROCEDURES

In [`supabase/migrations/20260301000013_multi_tenant_saas_and_private_storage.sql`](file:///c:/Users/Pradeep/OneDrive/Desktop/ka_final_beaut/klozeva/supabase/migrations/20260301000013_multi_tenant_saas_and_private_storage.sql):

```sql
create or replace function public.cleanup_expired_biometric_data()
returns integer
language plpgsql
security definer
as $$
declare
  purged_count integer := 0;
begin
  -- Delete telemetry past 90 days
  delete from public.beauty_ai_analysis_logs
  where created_at < (now() - interval '90 days')
    and privacy_ephemeral_flag = true;

  -- Delete expired biometric consent and portrait references
  with deleted as (
    delete from public.customer_biometric_consents
    where scheduled_deletion_at <= now()
    returning id
  )
  select count(*) into purged_count from deleted;

  return purged_count;
end;
$$;
```

---

## 5. FORMAL LEGAL REVIEW DISCLAIMER

> [!IMPORTANT]
> This assessment represents a rigorous technical implementation of privacy-by-design, data minimization, and granular consent mechanisms. It does not constitute formal legal counsel. Prior to multi-tenant commercial deployment in regulated jurisdictions (EU, UK, US states, India), KLOZEVA must submit this document to qualified external privacy counsel for formal legal sign-off.

