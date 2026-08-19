# SawitProNesia v8.4 — Panen

## Scope
Native Next.js Panen module using existing `harvests` + `plans`.

Implemented:
- `/panen`
- `/panen/[harvestId]`
- DIRECT actual harvest
- PLAN-linked actual harvest
- Cumulative progress by `harvests.plan_id`
- Partial realization
- Edit actual = UPDATE existing row
- Delete actual = delete row; production/revenue/plan progress derive again
- Revenue = weight_kg × price_per_kg
- BJR = weight_kg ÷ bunches
- Global Year + Active Estate
- Existing Home calculation remains sourced from `harvests`

## Integrity rules
1. DIRECT insert:
   - `source = DIRECT`
   - `plan_id = NULL`
   - never contributes to plan progress.
2. PLAN insert:
   - `source = PLAN`
   - requires Panen plan_id.
   - estate must match plan.
   - if plan has block_id, actual block must match it.
3. Edit:
   - UPDATE only.
   - source and plan_id are not changed.
4. Delete:
   - removes only selected actual row.
   - cumulative plan progress is derived from remaining rows.

## Acceptance
- DIRECT does not move Plan progress.
- PLAN actual can be partial and cumulative.
- Editing weight changes cumulative actual without duplicate row.
- Deleting a PLAN actual reduces cumulative actual.
- Production/Revenue on Home follow harvest table automatically.
- No Supabase SQL migration is required.
