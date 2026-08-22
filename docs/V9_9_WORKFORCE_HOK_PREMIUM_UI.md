# SawitProNesia v9.9 — Workforce & HOK Premium UI

## Scope
- Rebuild halaman Tenaga Kerja menjadi Workforce & HOK Control Center.
- Menggunakan tabel `operations` yang sudah ada; tidak ada migration database.
- HOK dan biaya tenaga kerja tetap konsisten dengan Aktivitas, Laporan, dan Analytics.

## Dashboard
- Hero: kebun aktif, total HOK, pelaksana utama, aktivitas terakhir.
- KPI: total HOK, biaya TK, pelaksana tercatat, rata-rata biaya/HOK.
- Trend HOK bulanan.
- Distribusi HOK per blok.
- Rekap produktivitas pelaksana.
- Histori semua aktivitas yang memiliki HOK, baik DIRECT maupun terintegrasi dari aktivitas lain.

## Input
- Form actual tenaga kerja mempertahankan `createLaborActual`.
- HOK dan upah/HOK menghasilkan `total_cost` secara otomatis melalui server action existing.
- Revalidate tetap mencakup Home, Tenaga Kerja, Aktivitas, Laporan, dan Analytics.
