SawitProNesia v11.0 — Production Ready PATCH-only

Basis: v10.7 yang sudah menjalankan migration Role Access & Pemanen.

Cara pakai:
1. Extract ZIP patch ini.
2. Upload seluruh isi ke ROOT repository GitHub dengan struktur folder tetap.
3. Commit ke branch main.
4. Tunggu Cloudflare auto-build/deploy.
5. Tidak ada SQL migration baru pada v11.0.

Perubahan utama:
- Teks "Aksi" di bawah tombol + mobile dihapus; tombol + dan Akses Cepat tetap berfungsi.
- Pemanen diblokir server-side dari halaman manajerial dan diarahkan ke /panen.
- Versi aplikasi menjadi v11.0 / package 11.0.0.
- /api/health menjadi v11.0.0 dan no-store.
- Baseline security headers ditambahkan.
- Checklist Production Ready ditambahkan di docs/V11_0_PRODUCTION_READY.md.

Catatan validasi:
- Tidak ada perubahan schema database.
- Full dependency install di environment pembuatan patch mengalami timeout, sehingga final type-check/build tetap divalidasi oleh Cloudflare CI setelah commit.
