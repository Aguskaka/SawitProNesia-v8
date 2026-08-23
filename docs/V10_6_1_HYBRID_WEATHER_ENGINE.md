# SawitProNesia v10.6.1 — Hybrid Weather & Fertilizer Decision Engine

## Tujuan
Meningkatkan keamanan rekomendasi pemupukan dengan koordinat kebun sebagai sumber lokasi tunggal dan kombinasi Open-Meteo + BMKG.

## Validasi koordinat
- Latitude/longitude null, NaN, di luar rentang, atau tepat 0,0 dianggap tidak valid.
- Jika koordinat tidak valid, forecast tidak dipanggil dan skor/rekomendasi tidak dibuat.

## Arsitektur cuaca
- **Open-Meteo:** forecast 7 hari, curah hujan, peluang hujan, suhu, RH, wind gust, soil moisture lapisan atas dan ET0.
- **BMKG Nowcast/CAP:** safety layer berbasis polygon peringatan dini aktif. Jika titik kebun berada di polygon warning, rekomendasi hari ini dipaksa menjadi **Tunda**.

## Hard-stop
Status otomatis Tunda bila salah satu kondisi berikut terjadi:
- warning BMKG aktif pada titik kebun;
- prakiraan badai petir;
- hujan harian >= 25 mm;
- akumulasi hujan 6 jam ke depan >= 10 mm;
- wind gust >= 50 km/jam.

## Weighted decision support
Jika tidak ada hard-stop, skor 0–100 mempertimbangkan:
- probabilitas dan jumlah hujan;
- risiko hujan 6 jam;
- hujan hari sebelumnya;
- kelembapan tanah lapisan atas;
- suhu dan RH;
- wind gust;
- ET0;
- sensitivitas jenis pupuk (Urea, NPK, KCl/MOP, Dolomit).

Threshold aplikasi:
- 80–100: Layak
- 60–79: Waspada
- <60: Tunda

Skor adalah decision-support dan tidak menggantikan inspeksi kondisi tanah/genangan serta keputusan agronom lapangan.

## Sumber
- BMKG Data Terbuka — Nowcast CAP: https://data.bmkg.go.id/peringatan-dini-cuaca/
- Open-Meteo Forecast API: https://open-meteo.com/en/docs
