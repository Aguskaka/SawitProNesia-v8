# v9.2.2 — Fertilizer Reference + Button Audit

## Fertilizer reference restored
- TBM mineral compound: NPK 12.12.17.2 + 0,75B, Urea, Dolomit by milestone age 1–36 months.
- TM mineral compound: NPK 13.6.27.4 + 0,65B reference table by productive age band and Semester I/II.
- Reference is read-only guidance; actual program dose remains editable.

## Block save fix
Observed code path previously called Supabase UPDATE but did not verify that a row was actually returned/updated and provided no visible success feedback.

v9.2.2:
- verifies logged-in user;
- UPDATE ... SELECT id ... SINGLE;
- throws explicit error if zero row/update fails;
- redirects back with `?status=updated`;
- shows “Perubahan blok berhasil disimpan.”

Same hardening applied to estate update.

## Button audit
Static audit covered all `<button>` and `<form action=...>` elements.
- Save/create/edit/delete buttons are wired to form server actions.
- Mobile Quick Menu open/close buttons are wired client-side.
- Error retry is wired to reset().
- Disabled delete buttons are intentional safety guards:
  - Fertilizer Program delete after execution.
  - Plan delete after linked Actual.

All form buttons now use explicit `type="submit"`.
All non-form UI buttons use explicit `type="button"` where relevant.

No Supabase SQL migration.
