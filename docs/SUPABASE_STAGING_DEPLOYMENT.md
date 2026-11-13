# KLOZEVA SUPABASE STAGING & MULTI-TENANT DEPLOYMENT SPECIFICATION

**Document Version:** 1.0.0-production  
**Date:** March 2026 / November 2026  
**Auditor / Architect:** Principal Supabase & Cloud Infrastructure Architect  
**Status:** READY FOR STAGING VALIDATION  

---

## 1. BACKEND ARCHITECTURE OVERVIEW

KLOZEVA's cloud backend is powered by managed Supabase (PostgreSQL 15+ with `pgcrypto`, `uuid-ossp`, and `pg_stat_statements`). The system enforces strict multi-tenancy where:
1. **Tenants (`businesses`):** Represent independent beauty retailers, brands, or boutique salons.
2. **Tenant Members (`business_members`):** Authorized managers and beauty advisors tied to a specific business.
3. **Customers (`profiles`):** Individual beauty shoppers with personal shade profiles, virtual try-on histories, and biometric consent preferences.
4. **Data Isolation:** All tenant-owned products, inventory movements, and kiosk beauty logs are segregated by `business_id` using PostgreSQL Row Level Security (RLS).

---

## 2. ORDERED MIGRATION INVENTORY

All schema changes are structured as forward-only, idempotent SQL migrations in `supabase/migrations/`:

| Migration File | Sequence | Description & Objects Created |
| :--- | :--- | :--- |
| `20260301000001_schema.sql` | 01 | Core schema: `profiles`, `businesses`, `business_members`, `products`, `product_variants`, `inventory_movements`, `audit_logs`. |
| `20260301000002_functions.sql` | 02 | Security definer functions: `is_admin()`, `is_business_member()`, `register_business()`, `adjust_stock()`. |
| `20260301000003_rls_storage.sql` | 03 | Baseline RLS policies on products/businesses; storage buckets `product-images` and `avatars`. |
| `20260301000004_add_gender.sql` | 04 | Demographic preferences schema extension. |
| `20260301000005_stage2.sql` | 05 | `industry_profiles`, `analysis_results`, `consent_records`. |
| `20260301000006_stage3.sql` | 06 | `product_tryon_assets`, `tryon_results`. |
| `20260301000007_master_five_industry_vton.sql` | 07 | Multi-industry support (beauty, fashion, salon, jewellery, fitness). |
| `20260301000008_beauty_catalogue.sql` | 08 | Global cosmetic shade catalogue and color attributes. |
| `20260301000009_retailer_platform.sql` | 09 | Retailer portal: staff invitations, verification documents, k=5 privacy analytics. |
| `20260301000010_global_catalogue_all_industries.sql` | 10 | Cross-industry category taxonomy. |
| `20260301000011_beauty_kiosk_store.sql` | 11 | Local kiosk store preferences cache. |
| `20260301000012_beauty_ai_audit_and_corrections.sql` | 12 | AI Model Registry, analysis logs, customer corrections, biometric consent tracking. |
| `20260301000013_multi_tenant_saas_and_private_storage.sql` | 13 | Private biometric bucket `customer-portraits-private`, multi-tenant `business_id` links, auto-purge function. |

---

## 3. STAGING DEPLOYMENT STEP-BY-STEP PROCEDURE

### Step 3.1: Environment Linking
```bash
# Authenticate with Supabase CLI
npx supabase login

# Link repository to staging project
npx supabase link --project-ref <STAGING_PROJECT_REF>
```

### Step 3.2: Migration Verification & Dry Run
```bash
# Inspect pending migrations against staging
npx supabase migration list

# Validate schema diff without applying destructive changes
npx supabase db diff --linked
```

### Step 3.3: Migration Execution
```bash
# Push migrations in staging
npx supabase db push
```

### Step 3.4: Automated RLS Verification Suite Execution
```bash
# Run comprehensive RLS and business logic checks against staging database
psql "$STAGING_DATABASE_URL" -f supabase/tests/rls_checks.sql
```
*Expected Output:*
```
NOTICE:  ALL KLOZEVA CHECKS PASSED
ROLLBACK
```

---

## 4. PRIVATE STORAGE BUCKET CONFIGURATION

| Bucket Name | Public? | Size Limit | Allowed MIME Types | RLS Policy Scope |
| :--- | :--- | :--- | :--- | :--- |
| `customer-portraits-private` | **NO (False)** | 10 MB | `image/jpeg`, `image/png`, `image/webp` | **Strict Customer Isolation:** `(storage.foldername(name))[1] = auth.uid()::text`. Zero cross-customer access. |
| `product-images` | **YES (True)** | 3 MB | `image/jpeg`, `image/png`, `image/webp` | **Retailer Write:** `public.is_member_of_text((storage.foldername(name))[1])`. Public read for catalog display. |
| `avatars` | **NO (False)** | 2 MB | `image/jpeg`, `image/png`, `image/webp` | **User Private:** `(storage.foldername(name))[1] = auth.uid()::text`. |

---

## 5. ROLLBACK STRATEGY & DISASTER RECOVERY

1. **Point-in-Time Recovery (PITR):** Enable Supabase Pro PITR with 7-day continuous archiving before executing production schema migrations.
2. **Schema Rollback:** Because all migrations are forward-compatible and non-destructive (adding tables, indexes, and additive columns with `if not exists`), rollback is executed by rolling back migration transactions or reverting specific RLS policies.
3. **Backup Export:** Execute nightly automated dump:
   ```bash
   pg_dump "$DATABASE_URL" --schema=public --clean --if-exists > klozeva_backup_$(date +%F).sql
   ```

