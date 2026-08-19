# SawitProNesia v8.1 — Premium Home Dashboard

Scope:
- Native Next.js Home redesign.
- Active Estate + Global Year selector moved into premium hero.
- 4 primary KPIs: production, revenue, actual cost, margin.
- 12-month production chart from harvests.
- Owner Snapshot: area, trees, ton/ha, cost/kg.
- Recent actual activity from harvests + operations.
- No new database table/column.
- No change to RLS.
- No CRUD migration yet.

Acceptance:
1. Kebun Test / 2026 must still show exact golden values:
   - Production 12,252.45 Kg
   - Revenue Rp 35,059,850
   - Cost Rp 22,822,500
   - Margin Rp 12,237,350
2. Changing Global Year changes transaction-based KPIs and chart, but area/trees remain master values.
3. Changing Kebun Aktif refreshes Home without logout/reload.
4. Login/session behavior from v8.0.0.4 remains stable.
