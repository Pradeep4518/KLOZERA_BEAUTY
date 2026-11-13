# KLOZEVA ROW LEVEL SECURITY (RLS) & MULTI-TENANT ISOLATION AUDIT

**Document Version:** 1.0.0-verified  
**Date:** March 2026 / November 2026  
**Auditor:** Principal Cloud Security & Database Architect  
**Status:** COMPREHENSIVE RLS SPECIFICATION & TEST VERIFIED  

---

## 1. RLS DESIGN PRINCIPLES

1. **Default Deny:** All tables enable RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`). Tables are inaccessible to public or anonymous roles unless an explicit policy grants access.
2. **Untrusted Frontend:** User claims stored in `localStorage` or frontend JWT client cookies are never trusted for authorization. Roles are verified strictly via PostgreSQL `auth.uid()` joining to `profiles` or `business_members`.
3. **Multi-Tenant Boundaries:** Retailer operations are scoped to `business_id in (select bm.business_id from business_members bm where bm.user_id = auth.uid())`. Retailers cannot view products, orders, inventory movements, or kiosk scans of competitor businesses.
4. **Biometric Data Protection:** Customer biometric records (`customer_biometric_consents`, `beauty_ai_analysis_logs`, private portraits) are strictly locked to `customer_id = auth.uid()::text`.

---

## 2. POLICY DEFINITION AUDIT MATRIX

| Table Name | Entity Scope | Operation | Permitted Roles | Policy Predicate (`USING` / `WITH CHECK`) | Audit Finding |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `profiles` | User Account | SELECT | authenticated | `id = auth.uid() or public.is_admin()` | **VERIFIED: Self & Admin only** |
| `profiles` | User Account | UPDATE | authenticated | `id = auth.uid()` (Columns: `full_name`, `phone`, `avatar_path`) | **VERIFIED: Role escalation blocked** |
| `businesses` | Retail Tenant | SELECT | authenticated | `public.can_view_business(id)` | **VERIFIED: Unverified hidden from public** |
| `businesses` | Retail Tenant | UPDATE | authenticated | `public.is_business_member(id)` | **VERIFIED: Own business only** |
| `products` | Inventory | SELECT | authenticated | `(is_active and public.can_view_business(business_id)) or public.is_business_member(business_id) or public.is_admin()` | **VERIFIED: Drafts hidden from shoppers** |
| `products` | Inventory | INSERT | authenticated | `public.is_business_member(business_id) and public.is_active()` | **VERIFIED: Verified store staff only** |
| `product_variants` | Inventory | UPDATE | authenticated | `exists (select 1 from products p where p.id = product_id and public.is_business_member(p.business_id))` | **VERIFIED: Stock edit via `adjust_stock()`** |
| `beauty_ai_analysis_logs` | AI Telemetry | SELECT | authenticated | `customer_id = auth.uid()::text or (business_id is not null and exists (select 1 from business_members bm where bm.business_id = beauty_ai_analysis_logs.business_id and bm.user_id = auth.uid())) or public.is_admin()` | **VERIFIED: Strict tenant & customer isolation** |
| `customer_biometric_consents`| Biometric Records | SELECT | authenticated | `customer_id = auth.uid()::text or public.is_admin()` | **VERIFIED: Strictly customer private** |
| `customer_biometric_consents`| Biometric Records | UPDATE | authenticated | `customer_id = auth.uid()::text` | **VERIFIED: Customer revocation rights** |
| `storage.objects` (`customer-portraits-private`)| Biometric Portraits | SELECT | authenticated | `bucket_id = 'customer-portraits-private' and (storage.foldername(name))[1] = auth.uid()::text` | **VERIFIED: Zero cross-customer exposure** |

---

## 3. INTEGRATION TEST ASSERTIONS (`supabase/tests/rls_checks.sql`)

The test suite executes 566 lines of transactional SQL covering:

1. **Anonymous Role Denial:**
   - Anonymous user queries `products` -> **DENIED (Exception raised).**
   - Anonymous user queries `customer_biometric_consents` -> **DENIED (Exception raised).**
2. **Privilege Escalation Prevention:**
   - Retailer R attempts to update `profiles.role = 'admin'` -> **BLOCKED by column grant restriction.**
   - Retailer R attempts to set `businesses.status = 'verified'` -> **BLOCKED (Requires admin approval).**
3. **Cross-Tenant Product Isolation:**
   - Retailer R creates draft product -> Customer A cannot view draft product.
   - Retailer R attempts to insert product under competitor's `business_id` -> **BLOCKED.**
4. **Cross-Customer Biometric Isolation:**
   - Customer A creates `beauty_ai_analysis_logs` row.
   - Customer B queries `beauty_ai_analysis_logs` -> **Returns 0 rows.**
   - Customer A creates `customer_biometric_consents` row.
   - Customer B queries `customer_biometric_consents` -> **Returns 0 rows.**
5. **Retailer Store Analytics:**
   - Retailer R (store member) queries logs where `business_id = bid` -> **Returns 1 row.**
   - Retailer R queries logs of competitor store `bid2` -> **Returns 0 rows.**
6. **Differential Privacy (k=5 Analytics):**
   - Less than 5 distinct customer views -> Count is suppressed (`views = null`).
   - Greater than or equal to 5 distinct customer views -> Real aggregated view count returned without PII leakage.

