# KLOZEVA LIVE SUPABASE STAGING & DATABASE VERIFICATION SPECIFICATION

**Document Version:** 1.0.0-staging  
**Date:** March 2026 / November 2026  
**Auditor / Lead Database Architect:** Principal Supabase & PostgreSQL Infrastructure Lead  
**Deployment Target:** Managed Supabase Staging PostgreSQL 15+ Cluster  
**Current Gate Status:** **PENDING USER STAGING PROJECT REFERENCE & LINKING**  

---

## 1. STAGING ENVIRONMENT IDENTIFICATION & LINKING GATE

In accordance with strict security and release gate rules (Section 4 & 15 of Master Instructions), KLOZEVA forbids deploying to a guessed or fabricated project.

### Required User Action:
The platform administrator must supply the dedicated staging Supabase project reference and authenticate using the Supabase CLI:

```bash
# 1. Login to Supabase CLI (opens browser authentication)
npx supabase login

# 2. Link repository to the staging project
npx supabase link --project-ref <YOUR_STAGING_PROJECT_REF>

# 3. Deploy all 14 forward migrations to staging
npx supabase db push
```

---

## 2. DATABASE SCHEMA VERIFICATION INVENTORY

Upon applying migrations 000001 through 000014, the following database objects are active and verified:

### 2.1 Core Multi-Tenant Tables
- `public.businesses`: Tenants with status (`pending`, `verified`, `suspended`).
- `public.business_members`: Links authorized users to business tenants with roles (`owner`, `staff`).
- `public.profiles`: User identities linked to `auth.users` with account roles (`admin`, `retailer`, `customer`).
- `public.products`: Catalog items strictly derived from the business tenant by trigger.
- `public.product_variants`: Color hexes, sizes, and stock counters.
- `public.inventory_movements`: Immutable stock transaction history ledger.

### 2.2 Beauty AI & Biometric Intelligence Tables
- `public.beauty_ai_models`: Model capability registry tracking licenses and clearance flags.
- `public.beauty_ai_analysis_logs`: Telemetry logs with `business_id` and `customer_id`.
- `public.customer_shade_corrections`: Self-reported customer adjustments for algorithm calibration.
- `public.customer_biometric_consents`: Biometric consent tracking with `scheduled_deletion_at`.

### 2.3 Storage Buckets
- `customer-portraits-private`: Private (10MB limit, customer-only RLS).
- `product-images`: Public read (3MB limit, business member write).
- `avatars`: Private (2MB limit, customer-only RLS).

---

## 3. VERIFICATION SCRIPTS & SQL HEALTH CHECKS

To verify the live staging database after `npx supabase db push`:

```sql
-- 1. Execute System Health Check
select public.get_beauty_ai_system_health();
```
*Expected Output:*
```json
{
  "status": "healthy",
  "active_models": 4,
  "telemetry_records": 0,
  "consent_records": 0,
  "environment": "cloud-saas"
}
```

```sql
-- 2. Verify Row-Level Security is Active on All Public Tables
select tablename, rowsecurity
from pg_tables
where schemaname = 'public';
```
*Expected Verification:* Every table must report `rowsecurity = true`.

```sql
-- 3. Execute Transactional Security & Isolation Test Suite
-- Automatically tests Customer A vs B, Retailer A vs B, and Anti-Spoofing
-- Automatically ROLLS BACK test rows upon completion
\i supabase/tests/rls_checks.sql
```
*Expected Output:* `NOTICE: ALL KLOZEVA CHECKS PASSED`
