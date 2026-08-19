# SawitProNesia v9.0 — Complete Functional Build

## Functional modules
1. Home
2. Kebun & Blok
3. Aktivitas
4. Panen
5. Rencana / Planning
6. Kalender & Reminder
7. Program Pemupukan
8. Tenaga Kerja / HOK
9. Anggaran
10. Laporan
11. Analytics

## v9.0 additions
### Program Pemupukan
- structured fertilizer programs per block
- up to 4 fertilizer items per program
- dose, requirement, price, estimated cost
- partial/final execution
- actual execution creates linked `operations`
- execution items preserve fertilizer-specific actual detail
- program cannot be deleted after execution

### Tenaga Kerja
- HOK summary
- labor cost
- worker/mandor summary
- direct labor actual
- consistent with `operations`

### Anggaran
- annual estate budget
- category budget
- block/category budget
- actual cost from `operations`
- remaining and usage percentage

### Reliability
- dashboard error boundary
- dashboard loading state
- all new modules reuse Active Estate + Global Year
- no destructive migration
- existing PLAN/DIRECT rules preserved

## Architecture rule
One transaction source:
- Production / Revenue = `harvests`
- Operational cost / HOK = `operations`
- Planning = `plans`
- Fertilizer program detail = fertilizer program/execution tables, while financial actual flows into `operations`
- Budget = annual budget tables

## Not included
- External WhatsApp/email/push notifications
- Final premium UI/UX redesign
- Offline-first synchronization

These are intentionally outside v9.0 Functional Completion.

No Supabase SQL migration is required.
