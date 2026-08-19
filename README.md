# SawitProNesia v8.0.0 Foundation

Native Next.js + TypeScript foundation for the SawitProNesia v8 migration.

## What this version proves
- Native Next.js App Router project (no iframe/legacy wrapper)
- TypeScript strict mode
- Existing Supabase project reused
- Cookie-based Supabase SSR auth
- Existing RLS remains the authorization boundary
- Global Year + Active Estate context
- Central calculation layer for production, revenue, actual cost, margin
- Existing estates/blocks/harvests/operations can be read by the same user account

## Important
This is a FOUNDATION release. It deliberately does **not** migrate the complex v7 CRUD yet.
Do not use it as a replacement for v7 production.

## 1. GitHub
Create a new repository:
`SawitProNesia-v8`

Extract this ZIP and upload the contents to the repository root.

## 2. Environment
Copy `.env.example` to `.env.local` locally, or create these variables in the staging host:

```text
NEXT_PUBLIC_SUPABASE_URL=<same Supabase URL used by v7>
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable/anon key used for client access>
```

Do NOT add a service-role/secret key to a public repository.

## 3. Local run
```bash
npm install
npm run dev
```

## 4. Acceptance test
Log in using the same Supabase Auth account as v7.

For Global Year 2026, compare the dashboard against `docs/GOLDEN_BASELINE.md`.

Expected exact database values:
- Kebun Test production 12,252.45 Kg
- Kebun Test revenue Rp 35,059,850
- Kebun Test cost Rp 22,822,500
- Kebun Test margin Rp 12,237,350
- Kebun Kemang cost Rp 20,460,000

If those values match, Phase 1 foundation data access is validated.

## 5. Next migration
After Foundation PASS:
1. Domain calculation tests
2. Kebun & Blok
3. Panen Plan→Actual
4. Fertilizer multi-material
5. Rencana & Realisasi
6. Calendar
7. Report
8. Analytics/Budget
9. Home finalization
