# SawitProNesia v11.2 — Fertilizer Weather Score v2.0

## Final design
Weather Score v2 separates agronomic readiness from application-day weather risk. The engine no longer begins at 100 and subtracts penalties.

- Soil & Rainfall Readiness: 50 points
  - Rolling rainfall 30 days: 20
  - Rolling rainfall 10 days: 20
  - Relative multi-layer soil-moisture profile: 10
- Application Weather Safety: 40 points
  - Best 6-hour working-window rainfall: 15
  - Precipitation probability in the window: 10
  - Combined atmospheric dryness (temperature/RH/ET0): 8
  - Wind gust in the window: 7
- Fertilizer-specific suitability: 10 points

## Decision gates
- Readiness <25/50: Tunda regardless of total score.
- 30-day rainfall <60 mm or >300 mm: Tunda.
- Active BMKG nowcast warning: Tunda for today.
- Daily thunderstorm signal: Tunda.
- Best available 6-hour window >10 mm precipitation: Tunda.
- Gust >=50 km/h in the application window: Tunda.

After gates pass: >=80 Layak, 65-79 Waspada, <65 Tunda.

## Data improvements
- Open-Meteo past_days increased from 1 to 30.
- Soil moisture uses 0-1, 1-3, 3-9 and 9-27 cm layers.
- Soil moisture is treated as a relative supporting indicator against the location's recent 30-day modeled distribution, not as a universal absolute agronomic threshold.
- Future-day decisions use actual working-hour candidate windows instead of the first six hours after midnight.
- Confidence is kept separate from agronomic score.
- UI labels forecast values explicitly: Hujan, Peluang, Maks, plus the recommended application window.

No Supabase schema migration is required.
