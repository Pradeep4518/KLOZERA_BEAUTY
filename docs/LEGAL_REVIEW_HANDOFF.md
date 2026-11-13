# KLOZEVA LEGAL & PRIVACY COUNSEL REVIEW BRIEF

**Document Version:** 1.0.0-legal-handoff  
**Date:** March 2026 / November 2026  
**Auditor / Technical Author:** Principal AI & Cloud Security Architect  
**Audience:** External Legal Counsel, Data Protection Officer (DPO), and Compliance Officers  
**Current Legal Gate Status:** **PENDING DOCUMENTED EXTERNAL LEGAL APPROVAL**  

---

## 1. TECHNICAL SYSTEM OVERVIEW

KLOZEVA is an AI-powered Beauty Intelligence and Virtual Try-On SaaS platform operating in physical retail kiosks and online e-commerce environments. This document presents the technical data processing reality for formal legal review and statutory clearance under:
- **India:** Digital Personal Data Protection Act, 2023 (DPDP Act) and IT Act 2000.
- **European Union / United Kingdom:** General Data Protection Regulation (GDPR / UK GDPR).
- **United States:** Illinois Biometric Information Privacy Act (BIPA, 740 ILCS 14), California Consumer Privacy Act / CPRA, Texas CUBI.

---

## 2. DATA PROCESSING INVENTORY

| Data Category | Technical Nature | Purpose | Processing Location | Storage Location & Retention | Third-Party Processors |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Facial Photographs** | RGB Pixel buffer (`Uint8ClampedArray`) | Landmark extraction & colorimetric skin depth measurement | Client Browser RAM / Canvas | **Local Kiosk:** Ephemeral (0s). **Cloud Vault (Opt-in only):** Encrypted private S3 bucket, strictly 30-day auto-TTL. | None by default (Optional Google Gemini Vision API only upon explicit consent). |
| **Facial Landmarks (478 pts)** | 3D normalized coordinates `(x, y, z)` | Aligning virtual lipstick, foundation, blush | Client WebAssembly | In-memory during active session only. Never persisted. | None. |
| **Derived Skin Tone & Undertone** | Derived mathematical scalars (ITA°, CIELAB $L^*, a^*, b^*$, enum) | Matching foundation and concealer products | Client CPU / Worker | Postgres DB, retained during active user profile lifetime or 90 days for anonymous kiosk sessions. | None. |
| **Biometric Consent Audit Records** | Boolean flags, timestamps, IP, version | Statutory compliance verification | Cloud Postgres | Stored in `customer_biometric_consents` for 3-year statutory audit limitation. | None. |
| **Retailer / Kiosk Telemetry** | Aggregate view counts, product try-ons | Store performance analytics | Cloud Postgres | Scoped by `business_id`; differential privacy ($k=5$) applied to prevent user tracking. | None. |

---

## 3. UNBUNDLED FIVE-PART CONSENT IMPLEMENTATION

In accordance with international standards, consent is unbundled into 5 discrete checkboxes in [`src/pages/customer/FacialCaptureStep.jsx`](file:///c:/Users/Pradeep/OneDrive/Desktop/ka_final_beaut/klozeva/src/pages/customer/FacialCaptureStep.jsx):

1. **[Required] On-Device Face Analysis:** Processing of face landmarks and skin pixels in temporary client memory for real-time try-on.
2. **[Optional] Shade Passport Persistence:** Storing derived skin tone and undertone to the customer's account.
3. **[Optional] Portrait Retention (Private Vault):** Retaining portrait in private vault for 30 days. Default `false`.
4. **[Optional] Algorithmic Calibration:** Allowing anonymous tone vectors to calibrate models. **Refusal does not affect try-on.** Default `false`.
5. **[Optional] External Multimodal AI Sharing:** Authorizing transmission to Google Gemini Vision API. Default `false`.

---

## 4. CROSS-BORDER DATA TRANSFERS

- **Primary Cloud Backend:** Hosted on Supabase managed cloud infrastructure (AWS / GCP region selection).
- **Client Processing:** Local physical kiosks in India process 100% of facial imagery locally on the device hardware, meaning **zero biometric data crosses national borders**.
- **Cloud SaaS Users:** If multi-tenant cloud mode is activated, data is hosted in the designated regional database cluster (e.g., `ap-south-1` Mumbai for Indian operations; `eu-central-1` Frankfurt for EU operations).

---

## 5. SPECIFIC QUESTIONS FOR EXTERNAL LEGAL COUNSEL

Prior to authorizing the live public cloud SaaS release, external counsel must review and provide formal written determinations on:

1. **Biometric Classification under India DPDP Act 2023:** Does optical extraction of skin depth ($\text{ITA}^\circ$) and non-destructive virtual makeup rendering constitute "Biometric Data" requiring specialized data fiduciary obligations under upcoming DPDP notifications?
2. **BIPA Compliance (Illinois, USA):** Does KLOZEVA's 30-day auto-TTL and explicit written consent screen satisfy the written retention schedule requirements of 740 ILCS 14/15(a)?
3. **GDPR Special Category Data (Article 9):** Does the 5-part unbundled consent screen meet the standard for "freely given, specific, informed, and unambiguous explicit consent" for European consumers?
4. **Third-Party AI Delegation:** Are the contractual terms with Google Cloud Vertex AI / Gemini sufficient under standard contractual clauses (SCCs) for users who opt into external multimodal analysis?

---
*Notice: This document is prepared for qualified legal review. KLOZEVA marks formal legal release approval as **PENDING** until counsel supplies written clearance.*

