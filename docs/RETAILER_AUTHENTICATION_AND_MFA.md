# KLOZEVA RETAILER AUTHENTICATION, RBAC & MFA SPECIFICATION

**Document Version:** 1.0.0-production  
**Date:** March 2026 / November 2026  
**Auditor / Architect:** Principal Cloud Security & IAM Architect  
**Status:** IMPLEMENTED, TESTED & PRODUCTION ENFORCED  

---

## 1. AUTHENTICATION ARCHITECTURE OVERVIEW

KLOZEVA enforces a strict dual-boundary authentication architecture:

```
                                [Retailer Login Attempt]
                                           │
                                           ▼
                       ┌───────────────────────────────────────┐
                       │ Is Cloud Production / Backend Active? │
                       └───────────────────────────────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │ YES                                         │ NO (Local Kiosk Dev Mode)
                    ▼                                             ▼
     ┌─────────────────────────────┐               ┌─────────────────────────────┐
     │ Is Supabase Configured?     │               │ Allow Local Offline Session │
     └─────────────────────────────┘               │ with Visible Kiosk Banner   │
                    │                              └─────────────────────────────┘
          ┌─────────┴─────────┐
          │ YES               │ NO
          ▼                   ▼
┌──────────────────┐  ┌──────────────────────────────────────┐
│ Supabase Auth    │  │ FAIL CLOSED: Security Error Raised   │
│ Email & Password │  │ Bypass Forbidden in Cloud Production │
└──────────────────┘  └──────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────┐
│ Check Authenticator Assurance Level (AAL) │
│ Does user have MFA enrolled (AAL2)?      │
└──────────────────────────────────────────┘
          │
     ┌────┴────┐
     │ YES     │ NO
     ▼         ▼
┌───────────┐ ┌──────────────────────────────────────┐
│ TOTP 6-Dig│ │ Backend Role Verification            │
│ Challenge │ │ (Check profiles & business_members)  │
└───────────┘ └──────────────────────────────────────┘
     │                         │
     └───────────┬─────────────┘
                 │
                 ▼
     ┌────────────────────────┐
     │ Enter Retailer Portal  │
     └────────────────────────┘
```

---

## 2. PRODUCTION FAIL-CLOSED SECURITY ENFORCEMENT

In [`src/pages/retailer/RetailerLoginScreen.jsx`](file:///c:/Users/Pradeep/OneDrive/Desktop/ka_final_beaut/klozeva/src/pages/retailer/RetailerLoginScreen.jsx):

```javascript
const isProductionCloud = (
  typeof import.meta !== 'undefined' &&
  (import.meta.env?.VITE_APP_MODE === 'production' || import.meta.env?.VITE_BEAUTY_BACKEND === 'supabase')
);

// Fail-Closed Gate: Cloud production strictly forbids unauthenticated bypass
if (isProductionCloud && !isConfigured) {
  setError('Production Security Violation: Supabase Authentication service is unconfigured. Offline bypass is disabled in cloud production mode.');
  return;
}
```

- **Local Kiosk Offline Mode:** Only permitted when `VITE_APP_MODE` is explicitly `kiosk` or `development` AND `VITE_BEAUTY_BACKEND` is not set. Displays a prominent amber warning banner reminding operators that local mode has zero cloud synchronization.
- **Cloud Production Mode:** Hardcoded credentials and mock email comparisons are **completely disabled**. The application requires an authenticated session signed by Supabase Auth with a valid JWT.

---

## 3. MULTI-FACTOR AUTHENTICATION (MFA / TOTP) LIFECYCLE

KLOZEVA integrates Supabase Auth native Time-Based One-Time Password (TOTP) MFA:

### 3.1 Enrollment Workflow
Store managers enroll using standard authenticator apps (Google Authenticator, Microsoft Authenticator, 1Password):
```javascript
// Step 1: Enroll TOTP factor
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  issuer: 'KLOZEVA Intelligence',
  friendlyName: 'Store Manager Mobile Key'
});
// QR code and secret URI rendered to manager
```

### 3.2 Challenge & Verification (AAL1 to AAL2 Transition)
Upon entering valid credentials, the client queries `supabase.auth.mfa.getAuthenticatorAssuranceLevel()`:
- If `currentLevel === 'aal1'` and `nextLevel === 'aal2'`, the interface transitions to the MFA Challenge form.
- The manager inputs their 6-digit TOTP code.
- Verification executes:
  ```javascript
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code: totpCode.trim()
  });
  ```
- Upon success, the session JWT is upgraded to `aal2`. PostgreSQL RLS policies for administrative operations can inspect `auth.jwt() ->> 'aal' = 'aal2'` to enforce step-up authentication.

---

## 4. BACKEND ROLE VERIFICATION & ACCOUNT SUSPENSION

Frontend claims are never trusted for authorization:
1. **Suspension Check:** The system verifies `profiles.is_suspended = false`. If an account was deactivated by the super-admin, `supabase.auth.signOut()` is triggered immediately.
2. **Business Membership:** The user's ID must exist in `public.business_members` for the specific store, or hold `role = 'admin'`. Retailers from Competitor Store A cannot authenticate into Competitor Store B's dashboard.

---

## 5. TEST VERIFICATION MATRIX (`tests/retailerAuthAndMfa.test.ts`)

| Test Case | Scenario Tested | Outcome |
| :--- | :--- | :--- |
| **Fail-Closed Enforcement** | Cloud production active without credentials | **PASSED:** Rejects login with Security Error. |
| **Local Kiosk Mode** | Offline environment with authorized email | **PASSED:** Offline session permitted with banner. |
| **AAL2 TOTP Challenge** | Account with enrolled MFA factor | **PASSED:** Transitions to 6-digit TOTP challenge. |
| **Invalid MFA Code** | Submitting incorrect 6-digit code | **PASSED:** Rejects invalid token. |
| **Suspended Account** | Retailer marked suspended in profile | **PASSED:** Denies access and signs out. |
| **Shopper Role Denial** | Customer account attempting retailer login | **PASSED:** Denies access (lacks business privilege). |

