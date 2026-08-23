SawitProNesia v10.7 PATCH-only — Role Access & Pemanen Mode

URUTAN INSTALASI
1. Extract ZIP ini.
2. Upload seluruh isi patch ke root repository GitHub dan commit ke main.
3. Di Supabase Dashboard > SQL Editor, jalankan isi file:
   supabase/migrations/20260823_v10_7_role_access_pemanen.sql
   (GitHub/Cloudflare TIDAK menjalankan migration SQL otomatis.)
4. Pastikan user Pemanen sudah ada di Supabase Authentication > Users.
5. Login SawitProNesia sebagai Owner > Akses Pengguna.
6. Masukkan email user > pilih Pemanen > pilih Kebun Tugas > Simpan.
7. Login sebagai Pemanen dan uji Catat Panen.

AKSES PEMANEN
- Hanya UI Panen.
- Hanya kebun yang ditugaskan; seluruh blok dalam kebun tersebut.
- Hanya INSERT Panen DIRECT.
- Tidak dapat PLAN, edit, atau delete.
- Harga/Kg tidak diminta dari pemanen; tersimpan 0 dan dapat dilengkapi Owner/Admin kemudian.
- Riwayat yang terlihat hanya transaksi yang dibuat oleh akun pemanen sendiri.
