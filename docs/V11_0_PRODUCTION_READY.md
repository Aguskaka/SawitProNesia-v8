# SawitProNesia v11.0 — Production Ready

## Scope
Final hardening release after v10.7. No new business module or database schema change.

## Production hardening
- Version aligned to v11.0 / 11.0.0.
- Mobile center `+` FAB no longer renders the `Aksi` label; accessible name remains `Buka akses cepat`.
- Pemanen management-route restriction is enforced server-side in addition to the existing client navigation guard and Supabase RLS.
- Health endpoint reports v11.0.0 with `Cache-Control: no-store`.
- Baseline security response headers added without a restrictive CSP that could break Supabase, BMKG, or Open-Meteo integrations.
- Existing v10.7 RLS remains the database authorization layer for Pemanen.

## Required production checks
1. Owner login and all management modules open.
2. Owner can assign Pemanen to one estate.
3. Pemanen login opens `/panen`; direct navigation to management pages returns to `/panen`.
4. Pemanen can insert DIRECT harvest for assigned estate/block only.
5. Pemanen cannot edit/delete harvest or write PLAN harvest.
6. Mandor/Admin behavior remains unchanged.
7. Pupuk weather recommendation works for valid estate coordinates and rejects missing/0,0 coordinates.
8. PWA installs and launches standalone.
9. `/api/health` returns `version: 11.0.0` and `status: ok`.
10. Cloudflare production build/typecheck passes before release is tagged.

## Database
No new migration in v11.0. v10.7 role-access migration must already have been applied.
