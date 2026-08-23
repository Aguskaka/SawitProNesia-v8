SawitProNesia v11.1 Production Hardening — PATCH ONLY

1. Extract ZIP.
2. Upload the patch contents to the repository root, preserving folders.
3. Commit to main and wait for Cloudflare build/deploy.
4. IMPORTANT: Run supabase/migrations/20260823_v11_1_production_hardening.sql once in Supabase SQL Editor.
5. Test Owner assign/revoke, Pemanen harvest-only mode, login/logout, and PWA.

Rollback: retain the current v11.0.1 Cloudflare deployment and take a Supabase backup before applying SQL.
