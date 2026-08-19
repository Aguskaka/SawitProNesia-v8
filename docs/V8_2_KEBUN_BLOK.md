# SawitProNesia v8.2 — Kebun & Blok

Phase 3 master-data module built on v8.1 Premium Home.

- `/kebun`: list estates and block-derived area/tree totals; create estate.
- `/kebun/[estateId]`: estate detail, edit estate identity/location, list blocks, create block.
- `/kebun/[estateId]/blok/[blockId]`: block detail, edit, delete.
- Master data is not filtered by Global Year.
- Global Year is used only to present age/stage context.
- Existing Supabase schema and RLS are reused; no destructive migration is included.
- Writes are centralized in `src/features/estates/actions.ts`.
