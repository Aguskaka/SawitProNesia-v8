export type WeatherDay = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationMm: number;
  rainMm: number;
  precipitationProbability: number;
  windSpeedMax: number;
};

export type FertilizerWeatherDay = WeatherDay & {
  score: number;
  status: "Layak" | "Waspada" | "Tunda";
  reasons: string[];
};

export type FertilizerWeatherForecast = {
  latitude: number;
  longitude: number;
  timezone: string;
  fertilizer: string;
  fertilizerGroup: "UREA" | "NPK" | "KCL" | "DOLOMIT" | "LAINNYA";
  generatedAt: string;
  days: FertilizerWeatherDay[];
  today: FertilizerWeatherDay;
  bestDay: FertilizerWeatherDay;
  previousDayRainMm: number;
  source: "Open-Meteo";
};

type OpenMeteoDaily = {
  time?: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_sum?: number[];
  rain_sum?: number[];
  precipitation_probability_max?: number[];
  wind_speed_10m_max?: number[];
};

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  daily?: OpenMeteoDaily;
};

function localDateKey(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function fertilizerGroup(name: string): FertilizerWeatherForecast["fertilizerGroup"] {
  const n = name.toLowerCase();
  if (n.includes("urea")) return "UREA";
  if (n.includes("kcl") || n.includes("mop") || n.includes("kalium")) return "KCL";
  if (n.includes("dolomit") || n.includes("dolomite") || n.includes("kapur")) return "DOLOMIT";
  if (n.includes("npk") || n.includes("majemuk")) return "NPK";
  return "LAINNYA";
}

function classify(score: number): FertilizerWeatherDay["status"] {
  if (score >= 75) return "Layak";
  if (score >= 55) return "Waspada";
  return "Tunda";
}

function evaluateDay(day: WeatherDay, previousRain: number, group: FertilizerWeatherForecast["fertilizerGroup"]): FertilizerWeatherDay {
  let score = 100;
  const reasons: string[] = [];
  const rain = Math.max(day.rainMm, day.precipitationMm);
  const probability = day.precipitationProbability;

  if (probability > 80) { score -= 48; reasons.push(`Peluang hujan sangat tinggi (${Math.round(probability)}%).`); }
  else if (probability > 65) { score -= 34; reasons.push(`Peluang hujan tinggi (${Math.round(probability)}%).`); }
  else if (probability > 50) { score -= 20; reasons.push(`Peluang hujan sedang (${Math.round(probability)}%).`); }
  else if (probability > 35) { score -= 9; reasons.push(`Ada peluang hujan ${Math.round(probability)}%.`); }

  if (rain > 30) { score -= 55; reasons.push(`Curah hujan ${rain.toFixed(1)} mm berisiko tinggi menyebabkan kehilangan hara.`); }
  else if (rain > 20) { score -= 40; reasons.push(`Hujan ${rain.toFixed(1)} mm berisiko pencucian/runoff.`); }
  else if (rain > 12) { score -= 24; reasons.push(`Hujan ${rain.toFixed(1)} mm cukup tinggi untuk aplikasi pupuk.`); }
  else if (rain > 8) { score -= 12; reasons.push(`Hujan ${rain.toFixed(1)} mm perlu diwaspadai.`); }
  else if (rain >= 1) { score += 4; reasons.push(`Hujan ringan ${rain.toFixed(1)} mm dapat membantu pelarutan pupuk.`); }

  if (day.temperatureMax >= 35) {
    score -= group === "UREA" ? 16 : 8;
    reasons.push(`Suhu maksimum ${day.temperatureMax.toFixed(0)}°C; prioritaskan aplikasi pagi.`);
  } else if (day.temperatureMax >= 33) {
    score -= group === "UREA" ? 8 : 3;
    reasons.push(`Suhu cukup tinggi (${day.temperatureMax.toFixed(0)}°C); lebih baik aplikasi pagi.`);
  }

  if (day.windSpeedMax >= 30) {
    score -= 8;
    reasons.push(`Angin maksimum ${day.windSpeedMax.toFixed(0)} km/jam; kondisi lapangan kurang ideal.`);
  }

  if (group === "UREA") {
    if (rain < 1 && previousRain < 1) {
      score -= 18;
      reasons.push("Permukaan diperkirakan kering; Urea lebih aman saat tanah cukup lembap.");
    } else if (rain >= 1 && rain <= 8) {
      score += 5;
      reasons.push("Kelembapan dan hujan ringan relatif mendukung aplikasi Urea.");
    }
    if (rain > 8) score -= 10;
  }

  if (group === "NPK" || group === "KCL") {
    if (rain >= 1 && rain <= 10) score += 4;
    if (rain > 15) score -= 8;
  }

  if (group === "DOLOMIT") {
    if (rain > 8) {
      score -= 12;
      reasons.push("Dolomit lebih baik diaplikasikan pada jendela cuaca yang lebih kering.");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (!reasons.length) reasons.push("Prakiraan harian relatif stabil untuk pekerjaan pemupukan.");

  return { ...day, score, status: classify(score), reasons };
}

function getDay(daily: OpenMeteoDaily, index: number): WeatherDay {
  return {
    date: daily.time?.[index] ?? "",
    weatherCode: Number(daily.weather_code?.[index] ?? 0),
    temperatureMax: Number(daily.temperature_2m_max?.[index] ?? 0),
    temperatureMin: Number(daily.temperature_2m_min?.[index] ?? 0),
    precipitationMm: Number(daily.precipitation_sum?.[index] ?? 0),
    rainMm: Number(daily.rain_sum?.[index] ?? 0),
    precipitationProbability: Number(daily.precipitation_probability_max?.[index] ?? 0),
    windSpeedMax: Number(daily.wind_speed_10m_max?.[index] ?? 0),
  };
}

export function weatherCodeLabel(code: number) {
  if (code === 0) return "Cerah";
  if ([1, 2].includes(code)) return "Cerah berawan";
  if (code === 3) return "Berawan";
  if ([45, 48].includes(code)) return "Berkabut";
  if ([51, 53, 55, 56, 57].includes(code)) return "Gerimis";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Hujan";
  if ([95, 96, 99].includes(code)) return "Badai petir";
  return "Berubah-ubah";
}

export async function getFertilizerWeatherForecast(input: {
  latitude: number;
  longitude: number;
  fertilizerName?: string | null;
}): Promise<FertilizerWeatherForecast> {
  const fertilizer = input.fertilizerName?.trim() || "NPK / pupuk majemuk";
  const group = fertilizerGroup(fertilizer);
  const params = new URLSearchParams({
    latitude: String(input.latitude),
    longitude: String(input.longitude),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "rain_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
    ].join(","),
    timezone: "auto",
    past_days: "1",
    forecast_days: "8",
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Weather service HTTP ${response.status}`);

  const data = await response.json() as OpenMeteoResponse;
  if (!data.daily?.time?.length) throw new Error("Prakiraan cuaca tidak tersedia untuk koordinat kebun.");

  const timezone = data.timezone || "Asia/Jakarta";
  const todayKey = localDateKey(timezone);
  const todayIndex = Math.max(0, data.daily.time.findIndex((date) => date === todayKey));
  const previousIndex = Math.max(0, todayIndex - 1);
  const previousDayRainMm = Math.max(
    Number(data.daily.rain_sum?.[previousIndex] ?? 0),
    Number(data.daily.precipitation_sum?.[previousIndex] ?? 0),
  );

  const rawDays = Array.from({ length: 7 }, (_, offset) => getDay(data.daily!, Math.min(todayIndex + offset, data.daily!.time!.length - 1)));
  const days = rawDays.map((day, index) => evaluateDay(day, index === 0 ? previousDayRainMm : Math.max(rawDays[index - 1]?.rainMm ?? 0, rawDays[index - 1]?.precipitationMm ?? 0), group));
  const today = days[0];
  const bestDay = days.reduce((best, day) => day.score > best.score ? day : best, days[0]);

  return {
    latitude: Number(data.latitude ?? input.latitude),
    longitude: Number(data.longitude ?? input.longitude),
    timezone,
    fertilizer,
    fertilizerGroup: group,
    generatedAt: new Date().toISOString(),
    days,
    today,
    bestDay,
    previousDayRainMm,
    source: "Open-Meteo",
  };
}
