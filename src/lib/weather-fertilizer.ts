export type FertilizerWeatherStatus = "Layak" | "Waspada" | "Tunda";

export type WeatherDay = {
  date: string;
  weatherCode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationMm: number;
  rainMm: number;
  precipitationProbability: number;
  windSpeedMax: number;
  windGustMax: number;
  humidityMean: number;
  soilMoistureTopMean: number | null;
  et0Mm: number;
  next6hPrecipitationMm: number;
  next6hProbabilityMax: number;
};

export type BmkgNowcast = {
  checked: boolean;
  activeWarning: boolean;
  headline: string | null;
  description: string | null;
  event: string | null;
  effective: string | null;
  expires: string | null;
  source: "BMKG Nowcast";
};

export type FertilizerWeatherDay = WeatherDay & {
  score: number;
  status: FertilizerWeatherStatus;
  reasons: string[];
  hardStops: string[];
};

export type FertilizerGroup = "UREA" | "NPK" | "KCL" | "DOLOMIT" | "LAINNYA";

export type FertilizerWeatherForecast = {
  latitude: number;
  longitude: number;
  timezone: string;
  fertilizer: string;
  fertilizerGroup: FertilizerGroup;
  generatedAt: string;
  days: FertilizerWeatherDay[];
  today: FertilizerWeatherDay;
  bestDay: FertilizerWeatherDay;
  previousDayRainMm: number;
  bmkg: BmkgNowcast;
  source: "Open-Meteo + BMKG";
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
  wind_gusts_10m_max?: number[];
  et0_fao_evapotranspiration?: number[];
};

type OpenMeteoHourly = {
  time?: string[];
  relative_humidity_2m?: number[];
  soil_moisture_0_to_1cm?: number[];
  precipitation?: number[];
  precipitation_probability?: number[];
};

type OpenMeteoResponse = {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  daily?: OpenMeteoDaily;
  hourly?: OpenMeteoHourly;
};

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function xmlTag(xml: string, tag: string) {
  const match = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1]) : null;
}

function xmlTags(xml: string, tag: string) {
  return [...xml.matchAll(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "gi"))]
    .map((match) => decodeXml(match[1]))
    .filter(Boolean);
}

function validCoordinate(latitude: number, longitude: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) &&
    latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180 &&
    !(Math.abs(latitude) < 0.000001 && Math.abs(longitude) < 0.000001);
}

export function isValidEstateCoordinate(latitude: unknown, longitude: unknown) {
  return validCoordinate(Number(latitude), Number(longitude));
}

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

function localHourKey(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:00`;
}

export function fertilizerGroup(name: string): FertilizerGroup {
  const n = name.toLowerCase();
  if (n.includes("urea")) return "UREA";
  if (n.includes("kcl") || n.includes("mop") || n.includes("kalium")) return "KCL";
  if (n.includes("dolomit") || n.includes("dolomite") || n.includes("kapur")) return "DOLOMIT";
  if (n.includes("npk") || n.includes("majemuk")) return "NPK";
  return "LAINNYA";
}

function classify(score: number): FertilizerWeatherStatus {
  if (score >= 80) return "Layak";
  if (score >= 60) return "Waspada";
  return "Tunda";
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function dailyHourlyAggregate(hourly: OpenMeteoHourly | undefined, date: string, currentHourKey: string) {
  const indexes = (hourly?.time ?? []).map((time, index) => ({ time, index })).filter((item) => item.time.startsWith(date));
  const humidity = indexes.map(({ index }) => Number(hourly?.relative_humidity_2m?.[index] ?? NaN)).filter(Number.isFinite);
  const soil = indexes.map(({ index }) => Number(hourly?.soil_moisture_0_to_1cm?.[index] ?? NaN)).filter(Number.isFinite);
  const next6 = indexes.filter(({ time }) => time >= currentHourKey).slice(0, 6);
  const next6PrecipitationMm = next6.reduce((sum, { index }) => sum + Number(hourly?.precipitation?.[index] ?? 0), 0);
  const next6ProbabilityMax = next6.reduce((max, { index }) => Math.max(max, Number(hourly?.precipitation_probability?.[index] ?? 0)), 0);

  return {
    humidityMean: mean(humidity),
    soilMoistureTopMean: soil.length ? mean(soil) : null,
    next6hPrecipitationMm: next6PrecipitationMm,
    next6hProbabilityMax: next6ProbabilityMax,
  };
}

function evaluateDay(
  day: WeatherDay,
  previousRain: number,
  group: FertilizerGroup,
  bmkgWarning = false,
): FertilizerWeatherDay {
  let score = 100;
  const reasons: string[] = [];
  const hardStops: string[] = [];
  const rain = Math.max(day.rainMm, day.precipitationMm);
  const probability = day.precipitationProbability;

  if (bmkgWarning) hardStops.push("BMKG menerbitkan peringatan dini aktif pada titik kebun.");
  if ([95, 96, 99].includes(day.weatherCode)) hardStops.push("Prakiraan menunjukkan badai petir.");
  if (rain >= 25) hardStops.push(`Curah hujan harian ${rain.toFixed(1)} mm terlalu tinggi untuk aplikasi aman.`);
  if (day.next6hPrecipitationMm >= 10) hardStops.push(`Akumulasi hujan 6 jam ke depan ${day.next6hPrecipitationMm.toFixed(1)} mm terlalu tinggi.`);
  if (day.windGustMax >= 50) hardStops.push(`Hembusan angin maksimum ${day.windGustMax.toFixed(0)} km/jam terlalu kuat.`);

  if (hardStops.length) {
    return { ...day, score: 0, status: "Tunda", reasons: [...hardStops], hardStops };
  }

  if (probability >= 85) { score -= 28; reasons.push(`Peluang hujan sangat tinggi (${Math.round(probability)}%).`); }
  else if (probability >= 70) { score -= 20; reasons.push(`Peluang hujan tinggi (${Math.round(probability)}%).`); }
  else if (probability >= 50) { score -= 12; reasons.push(`Peluang hujan sedang (${Math.round(probability)}%).`); }
  else if (probability >= 35) { score -= 5; reasons.push(`Ada peluang hujan ${Math.round(probability)}%.`); }

  if (rain > 20) { score -= 32; reasons.push(`Hujan ${rain.toFixed(1)} mm meningkatkan risiko runoff/pencucian.`); }
  else if (rain > 12) { score -= 20; reasons.push(`Hujan ${rain.toFixed(1)} mm cukup tinggi untuk pemupukan.`); }
  else if (rain > 8) { score -= 10; reasons.push(`Hujan ${rain.toFixed(1)} mm perlu diwaspadai.`); }
  else if (rain >= 1 && rain <= 8) { score += 3; reasons.push(`Hujan ringan ${rain.toFixed(1)} mm dapat membantu pelarutan pupuk.`); }

  if (day.next6hProbabilityMax >= 80 && day.next6hPrecipitationMm >= 4) {
    score -= 22;
    reasons.push(`Dalam 6 jam ke depan peluang hujan mencapai ${Math.round(day.next6hProbabilityMax)}% dengan akumulasi ${day.next6hPrecipitationMm.toFixed(1)} mm.`);
  } else if (day.next6hProbabilityMax >= 65) {
    score -= 10;
    reasons.push(`Risiko hujan 6 jam ke depan cukup tinggi (${Math.round(day.next6hProbabilityMax)}%).`);
  }

  if (previousRain >= 30) { score -= 18; reasons.push(`Hujan hari sebelumnya ${previousRain.toFixed(1)} mm; tanah berpotensi terlalu basah.`); }
  else if (previousRain >= 15) { score -= 8; reasons.push(`Hujan hari sebelumnya ${previousRain.toFixed(1)} mm; cek kejenuhan tanah di lapangan.`); }

  if (day.soilMoistureTopMean !== null) {
    if (day.soilMoistureTopMean >= 0.45) { score -= 14; reasons.push("Kelembapan lapisan tanah atas tinggi; waspadai kondisi jenuh/genangan."); }
    else if (day.soilMoistureTopMean < 0.18) { score -= group === "UREA" ? 16 : 8; reasons.push("Lapisan tanah atas diperkirakan kering."); }
    else if (day.soilMoistureTopMean >= 0.22 && day.soilMoistureTopMean <= 0.38) { score += 3; }
  }

  if (day.temperatureMax >= 36) {
    score -= group === "UREA" ? 18 : 9;
    reasons.push(`Suhu maksimum ${day.temperatureMax.toFixed(0)}°C; prioritaskan aplikasi pagi.`);
  } else if (day.temperatureMax >= 33) {
    score -= group === "UREA" ? 9 : 4;
    reasons.push(`Suhu cukup tinggi (${day.temperatureMax.toFixed(0)}°C); lebih baik aplikasi pagi.`);
  }

  if (day.humidityMean > 0 && day.humidityMean < 45) {
    score -= group === "UREA" ? 8 : 4;
    reasons.push(`Kelembapan udara relatif rendah (${day.humidityMean.toFixed(0)}%).`);
  }

  if (day.windGustMax >= 40) { score -= 14; reasons.push(`Hembusan angin ${day.windGustMax.toFixed(0)} km/jam kurang ideal untuk pekerjaan lapangan.`); }
  else if (day.windGustMax >= 30) { score -= 7; reasons.push(`Hembusan angin mencapai ${day.windGustMax.toFixed(0)} km/jam.`); }

  if (day.et0Mm >= 5.5) {
    score -= group === "UREA" ? 7 : 3;
    reasons.push(`ET₀ ${day.et0Mm.toFixed(1)} mm menunjukkan kehilangan air atmosfer cukup tinggi.`);
  }

  if (group === "UREA") {
    if (rain < 1 && previousRain < 1 && (day.soilMoistureTopMean ?? 0.2) < 0.2) {
      score -= 14;
      reasons.push("Untuk Urea, kondisi terlalu kering meningkatkan risiko kehilangan N; tunggu tanah lebih lembap.");
    }
    if (rain >= 1 && rain <= 6 && day.temperatureMax < 34) {
      score += 4;
      reasons.push("Kondisi lembap dengan hujan ringan relatif mendukung aplikasi Urea.");
    }
  }

  if (group === "NPK" || group === "KCL") {
    if (rain >= 1 && rain <= 8) score += 2;
    if (rain > 15) score -= 8;
  }

  if (group === "DOLOMIT" && rain > 8) {
    score -= 12;
    reasons.push("Dolomit lebih baik diaplikasikan pada jendela yang relatif lebih kering.");
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  if (!reasons.length) reasons.push("Parameter cuaca utama berada dalam rentang yang relatif aman untuk pekerjaan pemupukan.");
  return { ...day, score, status: classify(score), reasons, hardStops };
}

function getDay(daily: OpenMeteoDaily, hourly: OpenMeteoHourly | undefined, index: number, currentHourKey: string): WeatherDay {
  const date = daily.time?.[index] ?? "";
  const hourlyAgg = dailyHourlyAggregate(hourly, date, currentHourKey);
  return {
    date,
    weatherCode: Number(daily.weather_code?.[index] ?? 0),
    temperatureMax: Number(daily.temperature_2m_max?.[index] ?? 0),
    temperatureMin: Number(daily.temperature_2m_min?.[index] ?? 0),
    precipitationMm: Number(daily.precipitation_sum?.[index] ?? 0),
    rainMm: Number(daily.rain_sum?.[index] ?? 0),
    precipitationProbability: Number(daily.precipitation_probability_max?.[index] ?? 0),
    windSpeedMax: Number(daily.wind_speed_10m_max?.[index] ?? 0),
    windGustMax: Number(daily.wind_gusts_10m_max?.[index] ?? 0),
    humidityMean: hourlyAgg.humidityMean,
    soilMoistureTopMean: hourlyAgg.soilMoistureTopMean,
    et0Mm: Number(daily.et0_fao_evapotranspiration?.[index] ?? 0),
    next6hPrecipitationMm: hourlyAgg.next6hPrecipitationMm,
    next6hProbabilityMax: hourlyAgg.next6hProbabilityMax,
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

function parsePolygon(value: string) {
  return value.trim().split(/\s+/).map((pair) => {
    const [lat, lon] = pair.split(",").map(Number);
    return { lat, lon };
  }).filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
}

function pointInPolygon(latitude: number, longitude: number, polygon: Array<{ lat: number; lon: number }>) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lon, yi = polygon[i].lat;
    const xj = polygon[j].lon, yj = polygon[j].lat;
    const intersects = ((yi > latitude) !== (yj > latitude)) &&
      (longitude < ((xj - xi) * (latitude - yi)) / ((yj - yi) || Number.EPSILON) + xi);
    if (intersects) inside = !inside;
  }
  return inside;
}

async function getBmkgNowcast(latitude: number, longitude: number): Promise<BmkgNowcast> {
  const empty: BmkgNowcast = {
    checked: false,
    activeWarning: false,
    headline: null,
    description: null,
    event: null,
    effective: null,
    expires: null,
    source: "BMKG Nowcast",
  };

  try {
    const rssResponse = await fetch("https://www.bmkg.go.id/alerts/nowcast/id", {
      headers: { Accept: "application/xml,text/xml,*/*" },
      cache: "no-store",
    });
    if (!rssResponse.ok) return empty;
    const rss = await rssResponse.text();
    const items = xmlTags(rss, "item");
    const links = items.map((item) => xmlTag(item, "link")).filter((link): link is string => Boolean(link)).slice(0, 45);

    const caps = await Promise.allSettled(links.map(async (link) => {
      const response = await fetch(link, {
        headers: { Accept: "application/xml,text/xml,*/*" },
        cache: "no-store",
      });
      if (!response.ok) return null;
      return response.text();
    }));

    for (const result of caps) {
      if (result.status !== "fulfilled" || !result.value) continue;
      const cap = result.value;
      const polygons = xmlTags(cap, "polygon").map(parsePolygon).filter((polygon) => polygon.length >= 3);
      if (!polygons.some((polygon) => pointInPolygon(latitude, longitude, polygon))) continue;
      return {
        checked: true,
        activeWarning: true,
        headline: xmlTag(cap, "headline"),
        description: xmlTag(cap, "description"),
        event: xmlTag(cap, "event"),
        effective: xmlTag(cap, "effective"),
        expires: xmlTag(cap, "expires"),
        source: "BMKG Nowcast",
      };
    }

    return { ...empty, checked: true };
  } catch {
    return empty;
  }
}

type WeatherBase = {
  latitude: number;
  longitude: number;
  timezone: string;
  generatedAt: string;
  rawDays: WeatherDay[];
  previousDayRainMm: number;
  bmkg: BmkgNowcast;
};

export type MultiFertilizerWeatherForecast = {
  latitude: number;
  longitude: number;
  timezone: string;
  generatedAt: string;
  fertilizers: FertilizerWeatherForecast[];
  overallToday: {
    score: number;
    status: FertilizerWeatherStatus;
    restrictiveFertilizer: string;
    reasons: string[];
  };
  commonDays: Array<{
    date: string;
    score: number;
    status: FertilizerWeatherStatus;
    averageScore: number;
    restrictiveFertilizer: string;
  }>;
  commonBestDay: {
    date: string;
    score: number;
    status: FertilizerWeatherStatus;
    averageScore: number;
    restrictiveFertilizer: string;
  };
  previousDayRainMm: number;
  bmkg: BmkgNowcast;
  source: "Open-Meteo + BMKG";
};

function normalizeFertilizers(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const clean = String(value ?? "").trim().replace(/\s+/g, " ");
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
  }
  return result.length ? result : ["NPK / pupuk majemuk"];
}

async function getWeatherBase(latitude: number, longitude: number): Promise<WeatherBase> {
  if (!validCoordinate(latitude, longitude)) {
    throw new Error("Koordinat kebun belum valid. Isi latitude dan longitude kebun sebelum menggunakan rekomendasi cuaca.");
  }

  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "rain_sum",
      "precipitation_probability_max",
      "wind_speed_10m_max",
      "wind_gusts_10m_max",
      "et0_fao_evapotranspiration",
    ].join(","),
    hourly: [
      "relative_humidity_2m",
      "soil_moisture_0_to_1cm",
      "precipitation",
      "precipitation_probability",
    ].join(","),
    timezone: "auto",
    past_days: "1",
    forecast_days: "8",
  });

  const [weatherResponse, bmkg] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    }),
    getBmkgNowcast(latitude, longitude),
  ]);

  if (!weatherResponse.ok) throw new Error(`Weather service HTTP ${weatherResponse.status}`);
  const data = await weatherResponse.json() as OpenMeteoResponse;
  if (!data.daily?.time?.length) throw new Error("Prakiraan cuaca tidak tersedia untuk koordinat kebun.");

  const timezone = data.timezone || "Asia/Jakarta";
  const todayKey = localDateKey(timezone);
  const currentHourKey = localHourKey(timezone);
  const foundTodayIndex = data.daily.time.findIndex((date) => date === todayKey);
  const todayIndex = foundTodayIndex >= 0 ? foundTodayIndex : 0;
  const previousIndex = Math.max(0, todayIndex - 1);
  const previousDayRainMm = Math.max(
    Number(data.daily.rain_sum?.[previousIndex] ?? 0),
    Number(data.daily.precipitation_sum?.[previousIndex] ?? 0),
  );

  const rawDays = Array.from({ length: 7 }, (_, offset) => getDay(
    data.daily!, data.hourly, Math.min(todayIndex + offset, data.daily!.time!.length - 1), currentHourKey,
  ));

  return {
    latitude: Number(data.latitude ?? latitude),
    longitude: Number(data.longitude ?? longitude),
    timezone,
    generatedAt: new Date().toISOString(),
    rawDays,
    previousDayRainMm,
    bmkg,
  };
}

function forecastForFertilizer(base: WeatherBase, fertilizer: string): FertilizerWeatherForecast {
  const group = fertilizerGroup(fertilizer);
  const days = base.rawDays.map((day, index) => evaluateDay(
    day,
    index === 0
      ? base.previousDayRainMm
      : Math.max(base.rawDays[index - 1]?.rainMm ?? 0, base.rawDays[index - 1]?.precipitationMm ?? 0),
    group,
    index === 0 && base.bmkg.activeWarning,
  ));
  const today = days[0];
  const bestDay = days.reduce((best, day) => day.score > best.score ? day : best, days[0]);

  return {
    latitude: base.latitude,
    longitude: base.longitude,
    timezone: base.timezone,
    fertilizer,
    fertilizerGroup: group,
    generatedAt: base.generatedAt,
    days,
    today,
    bestDay,
    previousDayRainMm: base.previousDayRainMm,
    bmkg: base.bmkg,
    source: "Open-Meteo + BMKG",
  };
}

export async function getMultiFertilizerWeatherForecast(input: {
  latitude: number;
  longitude: number;
  fertilizerNames: Array<string | null | undefined>;
}): Promise<MultiFertilizerWeatherForecast> {
  const latitude = Number(input.latitude);
  const longitude = Number(input.longitude);
  const base = await getWeatherBase(latitude, longitude);
  const names = normalizeFertilizers(input.fertilizerNames);
  const fertilizers = names.map((name) => forecastForFertilizer(base, name));

  const restrictiveToday = fertilizers.reduce((worst, item) => item.today.score < worst.today.score ? item : worst, fertilizers[0]);
  const commonCandidates = base.rawDays.map((day, index) => {
    const ranked = fertilizers.map((item) => ({ fertilizer: item.fertilizer, score: item.days[index].score }));
    const restrictive = ranked.reduce((worst, item) => item.score < worst.score ? item : worst, ranked[0]);
    const averageScore = Math.round(ranked.reduce((sum, item) => sum + item.score, 0) / Math.max(ranked.length, 1));
    return {
      date: day.date,
      score: restrictive.score,
      status: classify(restrictive.score),
      averageScore,
      restrictiveFertilizer: restrictive.fertilizer,
    };
  });
  const commonBestDay = commonCandidates.reduce((best, item) => {
    if (item.score !== best.score) return item.score > best.score ? item : best;
    return item.averageScore > best.averageScore ? item : best;
  }, commonCandidates[0]);

  return {
    latitude: base.latitude,
    longitude: base.longitude,
    timezone: base.timezone,
    generatedAt: base.generatedAt,
    fertilizers,
    commonDays: commonCandidates,
    overallToday: {
      score: restrictiveToday.today.score,
      status: restrictiveToday.today.status,
      restrictiveFertilizer: restrictiveToday.fertilizer,
      reasons: restrictiveToday.today.reasons,
    },
    commonBestDay,
    previousDayRainMm: base.previousDayRainMm,
    bmkg: base.bmkg,
    source: "Open-Meteo + BMKG",
  };
}

export async function getFertilizerWeatherForecast(input: {
  latitude: number;
  longitude: number;
  fertilizerName?: string | null;
}): Promise<FertilizerWeatherForecast> {
  const multi = await getMultiFertilizerWeatherForecast({
    latitude: input.latitude,
    longitude: input.longitude,
    fertilizerNames: [input.fertilizerName?.trim() || "NPK / pupuk majemuk"],
  });
  return multi.fertilizers[0];
}
