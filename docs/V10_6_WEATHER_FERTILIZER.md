# SawitProNesia v10.6 — Weather-Aware Fertilizer Recommendation

## Tujuan
Memberikan decision-support pemupukan harian dan jendela 7 hari berdasarkan koordinat kebun aktif.

## Relasi lokasi
- Menggunakan `estates.latitude` dan `estates.longitude` yang sudah tersedia pada master Kebun.
- Tidak memerlukan migration database.
- Bila koordinat belum tersedia, modul Pupuk meminta pengguna melengkapinya di Detail Kebun.

## Sumber prakiraan
Prakiraan server-side menggunakan Open-Meteo berdasarkan latitude/longitude. Data cuaca tidak disimpan ke database; cache refresh dilakukan berkala untuk mengurangi request.

## Parameter evaluasi
- Curah hujan/precipitation harian.
- Probabilitas hujan maksimum.
- Suhu maksimum.
- Kecepatan angin maksimum.
- Hujan hari sebelumnya sebagai proxy kelembapan sederhana.
- Karakter kelompok pupuk: Urea, NPK, KCl/MOP, Dolomit, atau lainnya.

## Output
- Status hari ini: Layak / Waspada / Tunda.
- Skor 0–100 dengan alasan yang transparan.
- Hari terbaik dalam jendela 7 hari.
- Forecast card 7 hari berisi hujan, probabilitas, suhu dan skor.

## Catatan agronomi
Rekomendasi adalah decision-support berbasis prakiraan dan tidak menggantikan inspeksi lapangan, kondisi drainase, kelembapan tanah aktual, analisis tanah/daun, atau arahan agronom.
