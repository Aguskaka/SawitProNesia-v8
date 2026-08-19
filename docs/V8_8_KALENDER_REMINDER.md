# SawitProNesia v8.8 — Kalender Kebun & Reminder

## Scope
Native in-app calendar based on existing `plans`.

Implemented:
- `/kalender`
- Global Year + Active Estate
- Monthly navigation
- Calendar agenda markers
- Click date -> daily agenda
- Click agenda -> Plan detail
- Today agenda
- Upcoming agenda
- In-app Reminder using `plans.reminder_days`
- Status: Terjadwal, Reminder/Mendekati, Hari Ini, Sebagian, Terlambat, Selesai

## Data integrity
Calendar is read-only orchestration:
- it does not insert operations/harvests;
- it does not create duplicate Plan;
- Plan progress continues to come from rows with the same `plan_id`;
- DIRECT actual still does not move Plan progress.

## Reminder semantics
For an unfinished scheduled Plan:
`reminder_start = planned_date - reminder_days`

When today is between `reminder_start` and `planned_date`, the calendar marks the Plan as `Reminder / Mendekati`.

External push, WhatsApp, email, and background notification are intentionally not included in v8.8.

No Supabase SQL migration is required.
