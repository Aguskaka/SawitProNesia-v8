# SawitProNesia v8.7 — Rencana / Planning

## Scope
Native Planning module using existing `plans`, `harvests`, and `operations`.

Implemented:
- `/rencana`
- `/rencana/[planId]`
- `/rencana/[planId]/realisasi`
- Create/Edit/Delete Plan
- Global Year + Active Estate
- Filter by plan type
- Status: Terjadwal, Terlambat, Sebagian, Selesai
- Cumulative progress strictly from rows with the same `plan_id`
- Partial actual for non-Panen plans via `operations`
- Panen plan realization delegates to `/panen/realisasi/[planId]`
- Plan delete is blocked after linked Actual exists
- Once Actual exists, Plan type + block are locked

## Quantity semantics
- Panen: `SUM(harvests.weight_kg)`
- Tenaga Kerja: `SUM(operations.labor_days)`
- Biaya: `SUM(operations.total_cost)`
- Other operational plan types: `SUM(operations.quantity)`

## Integrity
- DIRECT actual has `plan_id = NULL`, so it never affects plan progress.
- PLAN actual has `plan_id = plan.id`.
- Plan Actual is additive/partial.
- Editing Plan never inserts Actual.
- Deleting Plan never cascades Actual from the application.

No Supabase SQL migration is required.
