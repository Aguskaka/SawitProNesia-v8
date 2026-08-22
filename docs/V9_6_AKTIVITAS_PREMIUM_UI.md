# SawitProNesia v9.6 — Aktivitas Premium UI

UI refresh untuk modul Aktivitas tanpa mengubah kontrak data Supabase maupun server actions.

## Perubahan
- Hero operasional dengan konteks kebun/tahun dan ringkasan aktivitas.
- KPI total aktivitas, biaya aktual, total HOK, serta sumber Direct/Program.
- Form actual dikelompokkan menjadi informasi aktivitas, material/volume, dan tenaga kerja.
- Riwayat diubah menjadi activity feed/timeline dengan kategori, blok, pelaksana, volume, HOK, biaya, dan source.
- Responsif mobile: KPI horizontal-scroll, form satu kolom, dan kartu biaya ringkas.
- Ikon aktivitas konsisten dengan icon system aplikasi; emoji kategori dihilangkan.
- Version marker dinaikkan ke v9.6.

## Data/logic
Tidak ada migration database. `createOperation` dan route detail `/aktivitas/[operationId]` tetap digunakan seperti baseline sebelumnya.
