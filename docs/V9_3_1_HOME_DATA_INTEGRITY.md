# v9.3.1 — Home Data Integrity Fix

Perubahan:
- Menghapus duplikasi Produksi/Pendapatan/Margin dari hero. Hero kini hanya status operasional dan sinyal tindakan.
- KPI finansial hanya tampil satu kali.
- Status Kebun tidak lagi otomatis "Sehat" ketika ada biaya tanpa pendapatan; fase tersebut menjadi "Fase Investasi".
- Status memperhitungkan overdue, over-budget, dan margin negatif.
- Budget Rp0 tidak ditampilkan sebagai 0% terpakai; ditandai sebagai "Anggaran belum ditetapkan".
- Agenda Home menggabungkan tabel `plans` dan `fertilizer_programs`.
- Progress pemupukan Home membaca `fertilizer_programs/items/executions/execution_items`, bukan generic plan.
- Produksi, pendapatan, biaya, margin tetap memakai annual calculation engine yang sama dengan Laporan/Analytics.
- No database migration.
