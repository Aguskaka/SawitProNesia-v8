# SawitProNesia v10.7 — Role Access & Pemanen Mode

## Tujuan
Menambahkan role `pemanen` dengan prinsip least privilege: pengguna lapangan dapat login dan mencatat Panen DIRECT pada kebun tugas, tanpa akses edit/delete atau modul manajerial.

## Hak akses
- Owner: akses penuh + menu Akses Pengguna.
- Admin/Mandor: perilaku existing; Panen dapat dicatat/diedit sesuai policy existing.
- Pemanen: UI hanya Panen, satu kebun tugas, INSERT DIRECT saja.
- Viewer: tidak dapat mencatat Panen.

## RLS
Wajib jalankan `supabase/migrations/20260823_v10_7_role_access_pemanen.sql` satu kali di Supabase SQL Editor. UI saja tidak cukup untuk mengamankan role.

## Onboarding Pemanen
1. Buat user/email pada Supabase Dashboard > Authentication > Users.
2. Login sebagai Owner SawitProNesia.
3. Buka menu **Akses Pengguna**.
4. Masukkan email, pilih **Pemanen**, pilih kebun tugas, lalu Simpan.
5. User pemanen login menggunakan akun Supabase tersebut.

## Batasan v10.7
Assignment berada pada level kebun. Pemanen dapat memilih seluruh blok yang berada di kebun tugas tersebut. Assignment per-blok dapat ditambahkan di versi berikutnya bila diperlukan.
