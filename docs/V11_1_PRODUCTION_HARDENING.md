# SawitProNesia v11.1 — Production Hardening

Scope: security and operations hardening only; no new agronomy/business module.

## Included
- generic login failure message (does not expose provider detail)
- active-estate cookie UUID validation + `no-store`
- security headers via Next.js for Cloudflare Workers
- Owner can revoke non-owner access
- access assignment/revocation audit trail in Supabase
- version/health marker v11.1.0

## Required database step
Run `supabase/migrations/20260823_v11_1_production_hardening.sql` once after v10.7 migration.

## Production acceptance checks
1. Owner login/logout PASS.
2. Pemanen login lands on `/panen` and cannot open management pages.
3. Pemanen DIRECT harvest insert PASS on assigned estate; other estate denied.
4. Pemanen update/delete denied.
5. Owner assign/revoke access PASS and audit rows created.
6. Invalid active estate ID returns HTTP 400.
7. `/api/health` returns v11.1.0 and `Cache-Control: no-store`.
8. PWA launch/install PASS on Android.
9. Cloudflare build/deploy green.
10. Keep a rollback copy of v11.0.1 deployment and Supabase backup before migration.
