SawitProNesia v11.1.1 — Profile Menu Hotfix (PATCH-only)

Tujuan:
- Menambahkan menu Profile dari ikon kanan atas untuk mobile dan desktop.
- Owner melihat menu Akses Pengguna dari Profile.
- Role non-Owner tidak melihat Akses Pengguna.
- Menampilkan email, role, versi aplikasi, dan tombol Keluar.
- Bottom navigation tetap bersih.

Tidak ada perubahan database / RLS / SQL migration.
Migration v11.1 yang sudah diterapkan tidak perlu dijalankan ulang.

File berubah:
- src/components/layout/dashboard-shell.tsx
- src/app/(dashboard)/layout.tsx
- src/app/globals.css
- src/app/api/health/route.ts
- package.json
