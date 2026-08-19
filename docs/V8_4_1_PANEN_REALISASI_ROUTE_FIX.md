# v8.4.1 — Panen Realisasi Route Fix

Symptom:
- `/panen` loaded normally.
- Clicking `Realisasikan` navigated to `/panen?plan=<uuid>` and could produce a Cloudflare server-render error.

Fix:
- Removed the query-param based realization form state.
- Added dedicated server route: `/panen/realisasi/[planId]`.
- Dedicated route fetches the selected Panen plan directly by UUID.
- Plan ID and `source=PLAN` are hidden/locked fields.
- Generic `/panen` input form is DIRECT-only.
- PLAN actual must be created from the relevant Progress Rencana Panen card.

This separates DIRECT and PLAN UX and reduces accidental source/plan mismatch.

No Supabase SQL change.
