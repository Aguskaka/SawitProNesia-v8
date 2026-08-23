# SawitProNesia v10.5 — PWA & App Experience

## Tujuan
Membuat SawitProNesia dapat dipasang sebagai Progressive Web App dan terasa lebih seperti aplikasi native saat dibuka dari Home Screen.

## Perubahan
- Web App Manifest dengan mode `standalone`, theme color, icon 192/512 dan maskable icon.
- Apple touch icon dan metadata Apple Web App.
- Service worker ringan untuk app-shell static assets dan offline fallback.
- Data API/Supabase **tidak** dicache untuk menghindari data operasional stale.
- Tombol Install App hanya muncul saat browser menyediakan `beforeinstallprompt`.
- Safe-area dan standalone styling untuk perangkat mobile.
- Shortcut PWA ke Aktivitas, Panen, dan Pupuk.

## Tidak berubah
- Schema Supabase.
- Query dan logic bisnis.
- Perhitungan KPI, panen, pupuk, HOK, anggaran, laporan dan analytics.
