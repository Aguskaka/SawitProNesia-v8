export type FertilizerWeatherStatus = "Layak" | "Waspada" | "Tunda";
export type ConfidenceLabel = "Tinggi" | "Sedang" | "Rendah";
export type SoilMoistureLabel = "Sangat kering" | "Kering" | "Sedang" | "Cukup lembap" | "Sangat basah" | "Tidak tersedia";

export type ApplicationWindow = {
  label: string;
  startHour: number;
  endHour: number;
  precipitationMm: number;
  precipitationProbabilityMax: number;
  temperatureMean: number;
  humidityMean: number;
  windGustMax: number;
  availableHours: number;
};

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
  soilMoistureProfileMean: number | null;
  soilMoistureRelative: number | null;
  soilMoistureLabel: SoilMoistureLabel;
  et0Mm: number;
  rollingRain10dMm: number;
  rollingRain30dMm: number;
  bestWindow: ApplicationWindow;
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

export type ScoreBreakdown = {
  rainfall30d: number;
  rainfall10d: number;
  soilMoisture: number;
  readiness: number;
  windowRain: number;
  rainProbability: number;
  atmospheric: number;
  wind: number;
  applicationSafety: number;
  fertilizerSuitability: number;
};

export type FertilizerWeatherDay = WeatherDay & {
  score: number;
  status: FertilizerWeatherStatus;
  reasons: string[];
  hardStops: string[];
  readinessGatePassed: boolean;
  breakdown: ScoreBreakdown;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
};

export type FertilizerGroup = "UREA" | "NPK" | "KCL" | "DOLOMIT" | "PHOSPHATE" | "MAGNESIUM" | "LAINNYA";

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
  engineVersion: "2.0";
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
  temperature_2m?: number[];
  relative_humidity_2m?: number[];
  wind_gusts_10m?: number[];
  soil_moisture_0_to_1cm?: number[];
  soil_moisture_1_to_3cm?: number[];
  soil_moisture_3_to_9cm?: number[];
  soil_moisture_9_to_27cm?: number[];
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

function localHour(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  return Number(parts.find((p) => p.type === "hour")?.value ?? 0);
}

export function fertilizerGroup(name: string): FertilizerGroup {
  const n = name.toLowerCase();
  if (n.includes("urea")) return "UREA";
  if (n.includes("kcl") || n.includes("mop") || n.includes("kalium")) return "KCL";
  if (n.includes("dolomit") || n.includes("dolomite") || n.includes("kapur")) return "DOLOMIT";
  if (n.includes("rp") || n.includes("rock phosphate") || n.includes("tsp") || n.includes("sp-36") || n.includes("sp36") || n.includes("fosfat")) return "PHOSPHATE";
  if (n.includes("kieser") || n.includes("magnesium") || n.includes("mgso4")) return "MAGNESIUM";
  if (n.includes("npk") || n.includes("majemuk")) return "NPK";
  return "LAINNYA";
}

function classify(score: number): FertilizerWeatherStatus {
  if (score >= 80) return "Layak";
  if (score >= 65) return "Waspada";
  return "Tunda";
}

function mean(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function rainForIndex(daily: OpenMeteoDaily, index: number) {
  return Math.max(Number(daily.rain_sum?.[index] ?? 0), Number(daily.precipitation_sum?.[index] ?? 0));
}

function rollingRain(daily: OpenMeteoDaily, index: number, days: number) {
  let total = 0;
  const start = Math.max(0, index - days);
  for (let i = start; i < index; i += 1) total += rainForIndex(daily, i);
  return total;
}

function soilAt(hourly: OpenMeteoHourly | undefined, index: number) {
  const layers = [
    Number(hourly?.soil_moisture_0_to_1cm?.[index] ?? NaN),
    Number(hourly?.soil_moisture_1_to_3cm?.[index] ?? NaN),
    Number(hourly?.soil_moisture_3_to_9cm?.[index] ?? NaN),
    Number(hourly?.soil_moisture_9_to_27cm?.[index] ?? NaN),
  ].filter(Number.isFinite);
  return layers.length ? mean(layers) : null;
}

function percentileRank(value: number, reference: number[]) {
  if (!reference.length) return null;
  const belowOrEqual = reference.filter((item) => item <= value).length;
  return clamp(Math.round((belowOrEqual / reference.length) * 100), 0, 100);
}

function soilLabel(relative: number | null): SoilMoistureLabel {
  if (relative === null) return "Tidak tersedia";
  if (relative < 15) return "Sangat kering";
  if (relative < 35) return "Kering";
  if (relative < 55) return "Sedang";
  if (relative <= 85) return "Cukup lembap";
  return "Sangat basah";
}

function windowLabel(start: number, end: number) {
  return `${String(start).padStart(2, "0")}.00–${String(end).padStart(2, "0")}.00`;
}

function scoreWindow(window: ApplicationWindow, et0Mm: number) {
  if (window.availableHours < 6) return { rainPoints: 0, probabilityPoints: 0, atmosphericPoints: 0, windPoints: 0, total: 0 };
  const rainPoints = window.precipitationMm < 1 ? 15 : window.precipitationMm <= 3 ? 12 : window.precipitationMm <= 5 ? 8 : window.precipitationMm <= 10 ? 3 : 0;
  const probabilityPoints = window.precipitationProbabilityMax <= 30 ? 10 : window.precipitationProbabilityMax <= 40 ? 8 : window.precipitationProbabilityMax <= 50 ? 6 : window.precipitationProbabilityMax <= 60 ? 4 : window.precipitationProbabilityMax <= 70 ? 2 : 0;
  const extremeDry = (window.temperatureMean >= 36 && window.humidityMean > 0 && window.humidityMean < 45) || et0Mm >= 6.5;
  const hotDry = window.temperatureMean >= 34 || (window.humidityMean > 0 && window.humidityMean < 50) || et0Mm >= 5.5;
  const somewhatDry = window.temperatureMean >= 32 || (window.humidityMean > 0 && window.humidityMean < 60) || et0Mm >= 4.5;
  const atmosphericPoints = extremeDry ? 0 : hotDry ? 2 : somewhatDry ? 4 : (window.humidityMean >= 65 && et0Mm < 4.5 ? 8 : 6);
  const windPoints = window.windGustMax < 20 ? 7 : window.windGustMax < 30 ? 5 : window.windGustMax < 40 ? 3 : window.windGustMax < 50 ? 1 : 0;
  return { rainPoints, probabilityPoints, atmosphericPoints, windPoints, total: rainPoints + probabilityPoints + atmosphericPoints + windPoints };
}

function applicationWindows(hourly: OpenMeteoHourly | undefined, date: string, currentHour: number, isToday: boolean, et0Mm: number) {
  const rows = (hourly?.time ?? []).map((time, index) => ({ time, index })).filter((row) => row.time.startsWith(date));
  if (isToday && currentHour > 12) {
    return { label: "Jendela pagi telah lewat", startHour: 0, endHour: 0, precipitationMm: 0, precipitationProbabilityMax: 0, temperatureMean: 0, humidityMean: 0, windGustMax: 0, availableHours: 0 };
  }
  const firstStart = isToday ? Math.max(6, currentHour) : 6;
  const starts = [firstStart, firstStart + 1, firstStart + 2].filter((value, pos, arr) => value <= 12 && arr.indexOf(value) === pos);
  const candidates = starts.map((startHour): ApplicationWindow => {
    const endHour = startHour + 6;
    const selected = rows.filter(({ time }) => {
      const hour = Number(time.slice(11, 13));
      return hour >= startHour && hour < endHour;
    });
    const precipitationMm = selected.reduce((sum, { index }) => sum + Number(hourly?.precipitation?.[index] ?? 0), 0);
    const probability = selected.map(({ index }) => Number(hourly?.precipitation_probability?.[index] ?? 0)).filter(Number.isFinite);
    const temperatures = selected.map(({ index }) => Number(hourly?.temperature_2m?.[index] ?? NaN)).filter(Number.isFinite);
    const humidity = selected.map(({ index }) => Number(hourly?.relative_humidity_2m?.[index] ?? NaN)).filter(Number.isFinite);
    const gusts = selected.map(({ index }) => Number(hourly?.wind_gusts_10m?.[index] ?? NaN)).filter(Number.isFinite);
    return {
      label: windowLabel(startHour, endHour),
      startHour,
      endHour,
      precipitationMm,
      precipitationProbabilityMax: probability.length ? Math.max(...probability) : 0,
      temperatureMean: temperatures.length ? mean(temperatures) : 0,
      humidityMean: humidity.length ? mean(humidity) : 0,
      windGustMax: gusts.length ? Math.max(...gusts) : 0,
      availableHours: selected.length,
    };
  });
  if (!candidates.length) return { label: "Tidak tersedia", startHour: 0, endHour: 0, precipitationMm: 0, precipitationProbabilityMax: 0, temperatureMean: 0, humidityMean: 0, windGustMax: 0, availableHours: 0 };
  return candidates.reduce((best, item) => scoreWindow(item, et0Mm).total > scoreWindow(best, et0Mm).total ? item : best, candidates[0]);
}

function dailyHourlyAggregate(hourly: OpenMeteoHourly | undefined, date: string, referenceSoil: number[], currentHour: number, isToday: boolean, et0Mm: number) {
  const indexes = (hourly?.time ?? []).map((time, index) => ({ time, index })).filter((item) => item.time.startsWith(date));
  const humidity = indexes.map(({ index }) => Number(hourly?.relative_humidity_2m?.[index] ?? NaN)).filter(Number.isFinite);
  const top = indexes.map(({ index }) => Number(hourly?.soil_moisture_0_to_1cm?.[index] ?? NaN)).filter(Number.isFinite);
  const profile = indexes.map(({ index }) => soilAt(hourly, index)).filter((value): value is number => value !== null);
  const profileMean = profile.length ? mean(profile) : null;
  const relative = profileMean === null ? null : percentileRank(profileMean, referenceSoil);
  return {
    humidityMean: mean(humidity),
    soilMoistureTopMean: top.length ? mean(top) : null,
    soilMoistureProfileMean: profileMean,
    soilMoistureRelative: relative,
    soilMoistureLabel: soilLabel(relative),
    bestWindow: applicationWindows(hourly, date, currentHour, isToday, et0Mm),
  };
}

function rainfall30Points(value: number) {
  if (value < 40) return 0;
  if (value < 60) return 4;
  if (value < 100) return 12;
  if (value <= 200) return 20;
  if (value <= 250) return 17;
  if (value <= 300) return 10;
  return 0;
}

function rainfall10Points(value: number) {
  if (value < 10) return 0;
  if (value < 25) return 5;
  if (value < 40) return 10;
  if (value < 50) return 15;
  if (value <= 100) return 20;
  if (value <= 150) return 14;
  return 7;
}

function soilPoints(label: SoilMoistureLabel) {
  if (label === "Sangat kering") return 0;
  if (label === "Kering") return 3;
  if (label === "Sedang") return 7;
  if (label === "Cukup lembap") return 10;
  if (label === "Sangat basah") return 2;
  return 5;
}

function fertilizerSpecificPoints(group: FertilizerGroup, day: WeatherDay, applicationSafety: number) {
  let score = 10;
  const window = day.bestWindow;
  if (group === "UREA") {
    if (day.soilMoistureLabel === "Sangat kering") score -= 6;
    else if (day.soilMoistureLabel === "Kering") score -= 3;
    if (scoreWindow(window, day.et0Mm).atmosphericPoints <= 2) score -= 4;
    if (window.precipitationMm > 5) score -= 2;
  } else if (group === "KCL") {
    if (window.precipitationMm > 5) score -= 5;
    else if (window.precipitationMm > 3) score -= 3;
    if (day.rollingRain30dMm > 250) score -= 2;
  } else if (group === "NPK") {
    if (window.precipitationMm > 5) score -= 4;
    else if (window.precipitationMm > 3) score -= 2;
    if (day.rollingRain30dMm > 250) score -= 2;
  } else if (group === "DOLOMIT") {
    if (window.precipitationMm > 5) score -= 5;
    else if (window.precipitationMm > 3) score -= 3;
    if (day.soilMoistureLabel === "Sangat basah") score -= 3;
  } else if (group === "PHOSPHATE" || group === "MAGNESIUM") {
    if (window.precipitationMm > 5) score -= 4;
    if (day.soilMoistureLabel === "Sangat basah") score -= 2;
  }
  if (applicationSafety < 20) score -= 2;
  return clamp(Math.round(score), 0, 10);
}

function confidenceFor(day: WeatherDay, bmkgChecked: boolean, historyCount30: number, historyCount10: number) {
  let score = 0;
  if (historyCount30 >= 25) score += 25;
  if (historyCount10 >= 8) score += 15;
  if (day.soilMoistureProfileMean !== null && day.soilMoistureRelative !== null) score += 20;
  if (day.bestWindow.availableHours >= 6) score += 20;
  if (bmkgChecked) score += 20;
  const label: ConfidenceLabel = score >= 80 ? "Tinggi" : score >= 60 ? "Sedang" : "Rendah";
  return { score, label };
}

function evaluateDay(day: WeatherDay, group: FertilizerGroup, bmkgWarning: boolean, bmkgChecked: boolean, historyCount30: number, historyCount10: number): FertilizerWeatherDay {
  const hardStops: string[] = [];
  const reasons: string[] = [];
  const rain30 = rainfall30Points(day.rollingRain30dMm);
  const rain10 = rainfall10Points(day.rollingRain10dMm);
  const soil = soilPoints(day.soilMoistureLabel);
  const readiness = rain30 + rain10 + soil;
  const windowScore = scoreWindow(day.bestWindow, day.et0Mm);
  const applicationSafety = windowScore.total;
  const fertilizerSuitability = fertilizerSpecificPoints(group, day, applicationSafety);
  const score = clamp(Math.round(readiness + applicationSafety + fertilizerSuitability), 0, 100);
  const readinessGatePassed = readiness >= 25;

  if (bmkgWarning) hardStops.push("BMKG menerbitkan peringatan dini aktif pada titik kebun.");
  if ([95, 96, 99].includes(day.weatherCode)) hardStops.push("Prakiraan harian menunjukkan risiko badai petir.");
  if (day.rollingRain30dMm < 60) hardStops.push(`Hujan 30 hari hanya ${day.rollingRain30dMm.toFixed(1)} mm; kondisi terlalu kering untuk pemupukan rutin.`);
  if (day.rollingRain30dMm > 300) hardStops.push(`Hujan 30 hari ${day.rollingRain30dMm.toFixed(1)} mm; kondisi terlalu basah untuk pemupukan rutin.`);
  if (day.bestWindow.availableHours < 6) hardStops.push("Jendela aplikasi 6 jam yang direkomendasikan tidak lagi tersedia hari ini.");
  if (day.bestWindow.precipitationMm > 10) hardStops.push(`Jendela terbaik masih memuat hujan ${day.bestWindow.precipitationMm.toFixed(1)} mm/6 jam.`);
  if (day.bestWindow.windGustMax >= 50) hardStops.push(`Hembusan angin pada jendela aplikasi mencapai ${day.bestWindow.windGustMax.toFixed(0)} km/jam.`);

  reasons.push(`Kesiapan tanah ${readiness}/50: hujan 10 hari ${day.rollingRain10dMm.toFixed(1)} mm dan 30 hari ${day.rollingRain30dMm.toFixed(1)} mm.`);
  reasons.push(`Jendela aplikasi terbaik ${day.bestWindow.label}: hujan ${day.bestWindow.precipitationMm.toFixed(1)} mm, peluang maksimum ${Math.round(day.bestWindow.precipitationProbabilityMax)}%.`);
  if (day.soilMoistureLabel !== "Tidak tersedia") reasons.push(`Kelembapan profil tanah model relatif: ${day.soilMoistureLabel.toLowerCase()} (${day.soilMoistureRelative ?? 0} persentil lokal 30 hari).`);
  if (!readinessGatePassed) reasons.push("Readiness Gate gagal: kesiapan tanah belum mencapai 25/50.");
  if (group === "UREA") reasons.push("Penilaian Urea lebih ketat pada kondisi panas/kering untuk menekan risiko kehilangan N.");
  if (group === "KCL" || group === "NPK") reasons.push("Penilaian memperketat risiko runoff/pencucian saat hujan meningkat.");

  const confidence = confidenceFor(day, bmkgChecked, historyCount30, historyCount10);
  const status: FertilizerWeatherStatus = hardStops.length || !readinessGatePassed ? "Tunda" : classify(score);
  return {
    ...day,
    score,
    status,
    reasons: hardStops.length ? [...hardStops, ...reasons] : reasons,
    hardStops,
    readinessGatePassed,
    breakdown: {
      rainfall30d: rain30,
      rainfall10d: rain10,
      soilMoisture: soil,
      readiness,
      windowRain: windowScore.rainPoints,
      rainProbability: windowScore.probabilityPoints,
      atmospheric: windowScore.atmosphericPoints,
      wind: windowScore.windPoints,
      applicationSafety,
      fertilizerSuitability,
    },
    confidenceScore: confidence.score,
    confidenceLabel: confidence.label,
  };
}

function getDay(daily: OpenMeteoDaily, hourly: OpenMeteoHourly | undefined, index: number, todayIndex: number, currentHour: number, referenceSoil: number[]): WeatherDay {
  const date = daily.time?.[index] ?? "";
  const et0Mm = Number(daily.et0_fao_evapotranspiration?.[index] ?? 0);
  const hourlyAgg = dailyHourlyAggregate(hourly, date, referenceSoil, currentHour, index === todayIndex, et0Mm);
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
    soilMoistureProfileMean: hourlyAgg.soilMoistureProfileMean,
    soilMoistureRelative: hourlyAgg.soilMoistureRelative,
    soilMoistureLabel: hourlyAgg.soilMoistureLabel,
    et0Mm,
    rollingRain10dMm: rollingRain(daily, index, 10),
    rollingRain30dMm: rollingRain(daily, index, 30),
    bestWindow: hourlyAgg.bestWindow,
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
  historyCount30: number;
  historyCount10: number;
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
    readiness: number;
    applicationSafety: number;
    confidenceScore: number;
    confidenceLabel: ConfidenceLabel;
  };
  commonDays: Array<{
    date: string;
    score: number;
    status: FertilizerWeatherStatus;
    averageScore: number;
    restrictiveFertilizer: string;
    bestWindowLabel: string;
    readiness: number;
    applicationSafety: number;
    confidenceScore: number;
    confidenceLabel: ConfidenceLabel;
  }>;
  commonBestDay: {
    date: string;
    score: number;
    status: FertilizerWeatherStatus;
    averageScore: number;
    restrictiveFertilizer: string;
    bestWindowLabel: string;
    readiness: number;
    applicationSafety: number;
    confidenceScore: number;
    confidenceLabel: ConfidenceLabel;
  };
  previousDayRainMm: number;
  bmkg: BmkgNowcast;
  source: "Open-Meteo + BMKG";
  engineVersion: "2.0";
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
      "temperature_2m",
      "relative_humidity_2m",
      "wind_gusts_10m",
      "soil_moisture_0_to_1cm",
      "soil_moisture_1_to_3cm",
      "soil_moisture_3_to_9cm",
      "soil_moisture_9_to_27cm",
      "precipitation",
      "precipitation_probability",
    ].join(","),
    timezone: "auto",
    past_days: "30",
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
  const currentHour = localHour(timezone);
  const foundTodayIndex = data.daily.time.findIndex((date) => date === todayKey);
  const todayIndex = foundTodayIndex >= 0 ? foundTodayIndex : Math.max(0, data.daily.time.length - 8);
  const previousIndex = Math.max(0, todayIndex - 1);
  const previousDayRainMm = rainForIndex(data.daily, previousIndex);
  const historyDates30 = new Set(data.daily.time.slice(Math.max(0, todayIndex - 30), todayIndex));
  const historyDates10 = new Set(data.daily.time.slice(Math.max(0, todayIndex - 10), todayIndex));
  const referenceSoil = (data.hourly?.time ?? []).map((time, index) => historyDates30.has(time.slice(0, 10)) ? soilAt(data.hourly, index) : null).filter((value): value is number => value !== null);
  const historyCount30 = historyDates30.size;
  const historyCount10 = historyDates10.size;

  const rawDays = Array.from({ length: 7 }, (_, offset) => getDay(
    data.daily!, data.hourly, Math.min(todayIndex + offset, data.daily!.time!.length - 1), todayIndex, currentHour, referenceSoil,
  ));

  return {
    latitude: Number(data.latitude ?? latitude),
    longitude: Number(data.longitude ?? longitude),
    timezone,
    generatedAt: new Date().toISOString(),
    rawDays,
    previousDayRainMm,
    bmkg,
    historyCount30,
    historyCount10,
  };
}

function forecastForFertilizer(base: WeatherBase, fertilizer: string): FertilizerWeatherForecast {
  const group = fertilizerGroup(fertilizer);
  const days = base.rawDays.map((day, index) => evaluateDay(
    day,
    group,
    index === 0 && base.bmkg.activeWarning,
    base.bmkg.checked,
    base.historyCount30,
    base.historyCount10,
  ));
  const today = days[0];
  const bestDay = days.reduce((best, day) => {
    if (day.status === "Tunda" && best.status !== "Tunda") return best;
    if (best.status === "Tunda" && day.status !== "Tunda") return day;
    return day.score > best.score ? day : best;
  }, days[0]);

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
    engineVersion: "2.0",
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
    const ranked = fertilizers.map((item) => ({ fertilizer: item.fertilizer, day: item.days[index] }));
    const restrictive = ranked.reduce((worst, item) => item.day.score < worst.day.score ? item : worst, ranked[0]);
    const averageScore = Math.round(ranked.reduce((sum, item) => sum + item.day.score, 0) / Math.max(ranked.length, 1));
    return {
      date: day.date,
      score: restrictive.day.score,
      status: restrictive.day.status,
      averageScore,
      restrictiveFertilizer: restrictive.fertilizer,
      bestWindowLabel: restrictive.day.bestWindow.label,
      readiness: restrictive.day.breakdown.readiness,
      applicationSafety: restrictive.day.breakdown.applicationSafety,
      confidenceScore: restrictive.day.confidenceScore,
      confidenceLabel: restrictive.day.confidenceLabel,
    };
  });
  const commonBestDay = commonCandidates.reduce((best, item) => {
    if (item.status === "Tunda" && best.status !== "Tunda") return best;
    if (best.status === "Tunda" && item.status !== "Tunda") return item;
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
      readiness: restrictiveToday.today.breakdown.readiness,
      applicationSafety: restrictiveToday.today.breakdown.applicationSafety,
      confidenceScore: restrictiveToday.today.confidenceScore,
      confidenceLabel: restrictiveToday.today.confidenceLabel,
    },
    commonBestDay,
    previousDayRainMm: base.previousDayRainMm,
    bmkg: base.bmkg,
    source: "Open-Meteo + BMKG",
    engineVersion: "2.0",
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
