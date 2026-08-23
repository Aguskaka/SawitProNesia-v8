# SawitProNesia v10.6.2 — Multi-Fertilizer Weather Recommendation

## Tujuan
Mengubah rekomendasi cuaca pemupukan dari satu acuan pupuk menjadi multi-pupuk berdasarkan material yang benar-benar ada di program pemupukan kebun aktif.

## Perubahan
- Forecast Open-Meteo + BMKG diambil satu kali per kebun/koordinat.
- Cuaca yang sama dievaluasi ulang untuk setiap jenis pupuk program.
- Default `Semua Pupuk` memakai prinsip konservatif: status harian mengikuti pupuk dengan skor terendah.
- Tersedia ringkasan skor/status per pupuk dan link detail khusus pupuk.
- Jendela terbaik bersama 7 hari dipilih dari skor minimum semua pupuk, lalu skor rata-rata sebagai tie-breaker.
- Urea, NPK, KCl/MOP, Dolomit, dan pupuk lain tetap memakai profil risiko yang berbeda.
- BMKG safety override tetap menjadi hard-stop untuk seluruh pupuk.
- Tidak ada perubahan schema Supabase atau migration.

## Catatan
Daftar pupuk berasal dari `fertilizer_program_items` pada kebun aktif dan tahun yang dipilih. Bila belum ada item program, engine memakai fallback NPK/pupuk majemuk agar panel tetap dapat berfungsi sebagai baseline.
