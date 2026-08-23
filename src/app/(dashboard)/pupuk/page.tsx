export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ensureManagementAccess } from "@/lib/auth/access";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { ContextSelector } from "@/components/layout/context-selector";
import { AppIcon } from "@/components/layout/app-icons";
import { createFertilizerProgram } from "@/features/fertilizer/actions";
import { fertilizerProgramProgress } from "@/lib/calculations/fertilizer";
import { formatCompactRupiah, formatNumber } from "@/lib/formatters";
import { FERTILIZER_FORMULAS, TBM_MINERAL_COMPOUND, TM_MINERAL_COMPOUND } from "@/lib/fertilizer-recommendations";
import { FertilizerProgramForm } from "@/components/fertilizer-program-form";
import { getMultiFertilizerWeatherForecast, isValidEstateCoordinate, weatherCodeLabel } from "@/lib/weather-fertilizer";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));
}
function pct(actual:number, planned:number){ return planned>0 ? Math.min((actual/planned)*100,100) : 0; }

export default async function FertilizerPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; weatherFertilizer?: string }>;
}) {
  await ensureManagementAccess();
  const params = await searchParams;
  const supabase = await createClient();
  const context = await getAppContext();

  const [er, br, pr, ir, exr, eir] = await Promise.all([
    supabase.from("estates").select("id,name,latitude,longitude").order("created_at"),
    supabase.from("blocks").select("id,estate_id,name,trees,fertilizer_pattern,planting_year,planting_date,soil_type").order("name"),
    supabase.from("fertilizer_programs").select("*").order("planned_date"),
    supabase.from("fertilizer_program_items").select("*").order("sort_order"),
    supabase.from("fertilizer_executions").select("*").order("execution_date"),
    supabase.from("fertilizer_execution_items").select("*"),
  ]);

  for (const r of [er, br, pr, ir, exr, eir]) if (r.error) throw new Error(r.error.message);

  const estates = er.data ?? [], blocks = br.data ?? [], programs = pr.data ?? [],
    items = ir.data ?? [], executions = exr.data ?? [], executionItems = eir.data ?? [];

  const estateId =
    context.activeEstateId && estates.some((e) => e.id === context.activeEstateId)
      ? context.activeEstateId
      : estates[0]?.id ?? null;
  const estate = estates.find((e) => e.id === estateId) ?? null;
  const estateBlocks = blocks.filter((b) => b.estate_id === estateId);
  const scoped = programs.filter(
    (p) => p.estate_id === estateId && String(p.planned_date).startsWith(`${context.selectedYear}-`),
  );

  const rows = scoped.map((program) => {
    const programItems = items.filter((x) => x.program_id === program.id);
    const programExecs = executions.filter((x) => x.program_id === program.id);
    const executionIds = programExecs.map((x) => x.id);
    const execItems = executionItems.filter((x) => executionIds.includes(x.execution_id));
    const progress = fertilizerProgramProgress(programItems, execItems);
    const estimatedCost = programItems.reduce((sum, x) => sum + Number(x.estimated_cost ?? 0), 0);
    const actualCost = execItems.reduce((sum, x) => sum + Number(x.actual_cost ?? 0), 0);
    return { program, programItems, programExecs, progress, estimatedCost, actualCost };
  });

  const plannedKg = rows.reduce((s,r)=>s+r.progress.plannedKg,0);
  const actualKg = rows.reduce((s,r)=>s+r.progress.actualKg,0);
  const remainingKg = Math.max(0,plannedKg-actualKg);
  const estimated = rows.reduce((s, r) => s + r.estimatedCost, 0);
  const actual = rows.reduce((s, r) => s + r.actualCost, 0);
  const unfinished = rows.filter((r) => r.progress.status !== "Selesai").length;
  const completed = rows.length-unfinished;
  const completion = pct(actualKg,plannedKg);
  const nextProgram = rows.find(r=>r.progress.status!=="Selesai") ?? rows[0] ?? null;
  const weatherFertilizers = Array.from(new Set(
    rows.flatMap((row) => row.programItems.map((item) => String(item.fertilizer_name ?? "").trim())).filter(Boolean),
  ));
  const requestedWeatherFertilizer = params.weatherFertilizer?.trim() || "ALL";
  const selectedWeatherFertilizer = requestedWeatherFertilizer !== "ALL" && weatherFertilizers.includes(requestedWeatherFertilizer)
    ? requestedWeatherFertilizer
    : "ALL";
  const hasCoordinates = Boolean(estate && isValidEstateCoordinate(estate.latitude, estate.longitude));
  let weather = null;
  let weatherError: string | null = null;
  if (estate && hasCoordinates) {
    try {
      weather = await getMultiFertilizerWeatherForecast({
        latitude: Number(estate.latitude),
        longitude: Number(estate.longitude),
        fertilizerNames: weatherFertilizers,
      });
    } catch (error) {
      weatherError = error instanceof Error ? error.message : "Prakiraan cuaca belum tersedia.";
    }
  }
  const selectedForecast = weather && selectedWeatherFertilizer !== "ALL"
    ? weather.fertilizers.find((item) => item.fertilizer === selectedWeatherFertilizer) ?? weather.fertilizers[0]
    : null;
  const restrictiveForecast = weather
    ? weather.fertilizers.reduce((worst, item) => item.today.score < worst.today.score ? item : worst, weather.fertilizers[0])
    : null;
  const detailForecast = selectedForecast ?? restrictiveForecast;
  const detailToday = selectedForecast?.today ?? detailForecast?.today ?? null;

  return (
    <div className="fertPage v97FertPage">
      <section className="v97FertHero">
        <div className="v97FertHeroTop">
          <div className="v97FertHeroCopy">
            <span>FERTILIZER CONTROL CENTER</span>
            <h1>Pupuk & Pemupukan</h1>
            <p>Rencanakan dosis, pantau kebutuhan material, realisasi lapangan dan biaya pemupukan dari satu layar.</p>
          </div>
          <ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={estateId} />
        </div>
        <div className="v97FertHeroSummary">
          <div><small>KEBUN AKTIF</small><strong>{estate?.name ?? "-"}</strong><span>{estateBlocks.length} blok tercatat</span></div>
          <div><small>PROGRESS TAHUNAN</small><strong>{formatNumber(completion,1)}%</strong><span>{completed} dari {rows.length} program selesai</span></div>
          <div><small>SISA KEBUTUHAN</small><strong>{formatNumber(remainingKg)} Kg</strong><span>dari {formatNumber(plannedKg)} Kg rencana</span></div>
          <div><small>AGENDA BERIKUT</small><strong>{nextProgram ? idDate(nextProgram.program.planned_date) : "Belum ada"}</strong><span>{nextProgram ? (blocks.find(b=>b.id===nextProgram.program.block_id)?.name ?? "Blok") : "Buat program baru"}</span></div>
        </div>
      </section>

      {params.status ? <div className="activityNotice">Perubahan program pupuk tersimpan.</div> : null}

      <section className="v97FertKpis">
        <article><i><AppIcon name="plan"/></i><div><small>RENCANA MATERIAL</small><strong>{formatNumber(plannedKg)} Kg</strong><span>{rows.length} program · {unfinished} belum selesai</span></div></article>
        <article><i><AppIcon name="fertilizer"/></i><div><small>REALISASI MATERIAL</small><strong>{formatNumber(actualKg)} Kg</strong><span>{formatNumber(completion,1)}% terhadap rencana</span></div></article>
        <article><i><AppIcon name="budget"/></i><div><small>ESTIMASI BIAYA</small><strong>{formatCompactRupiah(estimated)}</strong><span>berdasarkan harga program</span></div></article>
        <article><i><AppIcon name="activity"/></i><div><small>BIAYA AKTUAL</small><strong>{formatCompactRupiah(actual)}</strong><span>{actual<=estimated || estimated===0 ? "dalam estimasi program" : "di atas estimasi program"}</span></div></article>
      </section>

      <section className="v106WeatherPanel" id="weather-window">
        <div className="v106WeatherHead">
          <div className="v106WeatherTitle"><i><AppIcon name="weather"/></i><div><span>HYBRID WEATHER & FERTILIZER DECISION ENGINE</span><h2>Rekomendasi Pemupukan Berbasis Lokasi</h2><p>Open-Meteo menilai jendela agronomis 7 hari, sementara BMKG Nowcast menjadi safety override bila titik kebun masuk area peringatan dini aktif.</p></div></div>
          <div className="v106LocationChip"><small>KOORDINAT KEBUN</small><strong>{hasCoordinates ? `${Number(estate?.latitude).toFixed(5)}, ${Number(estate?.longitude).toFixed(5)}` : "Belum tersedia"}</strong><span>{estate?.name ?? "Kebun aktif"}</span></div>
        </div>

        {!hasCoordinates ? (
          <div className="v106WeatherMissing"><i><AppIcon name="estate"/></i><div><b>Koordinat kebun belum tersedia — lengkapi lokasi kebun</b><span>Nilai kosong, tidak valid, atau 0,0 tidak akan dipakai untuk forecast. Sistem tidak akan membuat skor maupun rekomendasi sampai latitude dan longitude kebun valid.</span></div>{estate ? <Link href={`/kebun/${estate.id}`}>Lengkapi koordinat →</Link> : null}</div>
        ) : weatherError ? (
          <div className="v106WeatherMissing warning"><i><AppIcon name="weather"/></i><div><b>Prakiraan cuaca belum dapat dimuat</b><span>{weatherError} Data operasional lain tetap dapat digunakan seperti biasa.</span></div></div>
        ) : weather && detailForecast && detailToday ? (
          <>
            <div className="v1062FertilizerChooser">
              <div><span>ACUAN PUPUK CUACA</span><strong>{selectedWeatherFertilizer === "ALL" ? "Semua pupuk dalam program" : selectedWeatherFertilizer}</strong><small>Skor dihitung ulang untuk karakter masing-masing pupuk menggunakan forecast cuaca yang sama.</small></div>
              <nav aria-label="Pilih acuan pupuk untuk rekomendasi cuaca">
                <Link className={selectedWeatherFertilizer === "ALL" ? "active" : ""} href="/pupuk#weather-window">Semua Pupuk</Link>
                {weather.fertilizers.map((item) => <Link className={selectedWeatherFertilizer === item.fertilizer ? "active" : ""} href={`/pupuk?weatherFertilizer=${encodeURIComponent(item.fertilizer)}#weather-window`} key={item.fertilizer}>{item.fertilizer}</Link>)}
              </nav>
            </div>

            {selectedWeatherFertilizer === "ALL" ? <div className="v1062FertilizerMatrix">
              {weather.fertilizers.map((item) => <Link href={`/pupuk?weatherFertilizer=${encodeURIComponent(item.fertilizer)}#weather-window`} className={`v1062FertilizerCard ${item.today.status.toLowerCase()}`} key={item.fertilizer}>
                <div><small>{item.fertilizerGroup}</small><strong>{item.fertilizer}</strong></div>
                <b>{item.today.status}</b><em>{item.today.score}/100</em>
                <span>Terbaik: {idDate(item.bestDay.date)} · {item.bestDay.score}/100</span>
              </Link>)}
            </div> : null}

            <div className="v106TodayGrid">
              <article className={`v106TodayDecision ${(selectedForecast?.today.status ?? weather.overallToday.status).toLowerCase()}`}>
                <div className="v106DecisionTop"><span>{selectedWeatherFertilizer === "ALL" ? "REKOMENDASI HARI INI · SEMUA PUPUK" : `REKOMENDASI HARI INI · ${detailForecast.fertilizer}`}</span><b>{selectedForecast?.today.status ?? weather.overallToday.status}</b></div>
                <strong>{(selectedForecast?.today.status ?? weather.overallToday.status) === "Layak" ? "Pemupukan dapat diprioritaskan" : (selectedForecast?.today.status ?? weather.overallToday.status) === "Waspada" ? "Bisa dilakukan dengan pengawasan cuaca" : "Sebaiknya tunda pemupukan"}</strong>
                <p>{selectedWeatherFertilizer === "ALL" ? `Status mengikuti pupuk paling sensitif hari ini: ${weather.overallToday.restrictiveFertilizer}. ${weather.overallToday.reasons.slice(0,2).join(" ")}` : detailToday.reasons.slice(0,2).join(" ")}</p>
                <div className="v106DecisionMetrics"><span><small>SKOR</small><b>{selectedForecast?.today.score ?? weather.overallToday.score}/100</b></span><span><small>HUJAN</small><b>{formatNumber(Math.max(detailToday.rainMm, detailToday.precipitationMm),1)} mm</b></span><span><small>6 JAM</small><b>{formatNumber(detailToday.next6hPrecipitationMm,1)} mm</b></span><span><small>SUHU</small><b>{formatNumber(detailToday.temperatureMax,0)}°C</b></span></div>
              </article>
              <article className="v106BestWindow">
                <span>{selectedWeatherFertilizer === "ALL" ? "JENDELA TERBAIK BERSAMA 7 HARI" : "JENDELA TERBAIK 7 HARI"}</span>
                <strong>{idDate(selectedForecast ? selectedForecast.bestDay.date : weather.commonBestDay.date)}</strong>
                <b>{selectedForecast ? `${selectedForecast.bestDay.status} · Skor ${selectedForecast.bestDay.score}/100` : `${weather.commonBestDay.status} · Skor minimum ${weather.commonBestDay.score}/100`}</b>
                <p>{selectedForecast ? selectedForecast.bestDay.reasons[0] : `Hari terbaik bila seluruh pupuk dipertimbangkan bersama. Pupuk pembatas: ${weather.commonBestDay.restrictiveFertilizer}; skor rata-rata ${weather.commonBestDay.averageScore}/100.`}</p>
                <div><small>ACUAN PUPUK</small><em>{selectedForecast ? selectedForecast.fertilizer : `${weather.fertilizers.length} jenis pupuk program`}</em></div>
              </article>
              <article className="v106WeatherContext">
                <span>KONTEKS AGRONOMI</span><strong>{weatherCodeLabel(detailToday.weatherCode)}</strong><p>Hujan kemarin {formatNumber(weather.previousDayRainMm,1)} mm · RH rata-rata {formatNumber(detailToday.humidityMean,0)}% · gust {formatNumber(detailToday.windGustMax,0)} km/jam · ET₀ {formatNumber(detailToday.et0Mm,1)} mm. {detailToday.soilMoistureTopMean !== null ? `Kelembapan tanah atas ${formatNumber(detailToday.soilMoistureTopMean,2)} m³/m³. ` : ""}{selectedWeatherFertilizer === "ALL" ? "Setiap pupuk mendapat penalti/bonus berbeda; Urea lebih sensitif terhadap panas dan tanah kering, sedangkan NPK/KCl lebih sensitif terhadap runoff/pencucian." : detailForecast.fertilizerGroup === "UREA" ? "Urea lebih sensitif terhadap kondisi panas/kering dan hujan lebat." : detailForecast.fertilizerGroup === "DOLOMIT" ? "Dolomit diprioritaskan pada jendela yang relatif lebih kering." : "NPK/KCl diprioritaskan saat risiko runoff dan pencucian rendah."}</p><small>Sumber: Open-Meteo 7 hari + BMKG Nowcast · {weather.bmkg.checked ? (weather.bmkg.activeWarning ? "peringatan BMKG aktif" : "tidak ada warning BMKG pada titik kebun") : "BMKG sementara tidak dapat diverifikasi"}</small>
              </article>
            </div>
            <div className="v106ForecastStrip">
              {(selectedForecast ? selectedForecast.days : weather.commonDays.map((common, index) => ({ ...detailForecast.days[index], ...common }))).map((day,index)=><article className={`v106ForecastDay ${day.status.toLowerCase()}`} key={day.date}>
                <div><small>{index===0 ? "HARI INI" : new Intl.DateTimeFormat("id-ID",{weekday:"short"}).format(new Date(`${day.date}T00:00:00`))}</small><strong>{new Intl.DateTimeFormat("id-ID",{day:"2-digit",month:"short"}).format(new Date(`${day.date}T00:00:00`))}</strong></div>
                <i><AppIcon name="weather"/></i>
                <b>{day.status}</b><span>Skor {day.score}</span>
                <div className="v106ForecastMeta"><em>{formatNumber(Math.max(day.rainMm,day.precipitationMm),1)} mm</em><em>{formatNumber(day.precipitationProbability,0)}%</em><em>{formatNumber(day.temperatureMax,0)}°C</em></div>
              </article>)}
            </div>
            {weather.bmkg.activeWarning ? <div className="v106BmkgAlert"><b>BMKG SAFETY OVERRIDE — TUNDA</b><span>{weather.bmkg.headline ?? weather.bmkg.event ?? "Peringatan dini cuaca aktif pada titik kebun."} {weather.bmkg.expires ? `Berlaku hingga ${new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(new Date(weather.bmkg.expires))}.` : ""}</span></div> : null}
            <div className="v106WeatherNote"><b>Catatan keputusan:</b><span>Mode Semua Pupuk memakai prinsip konservatif: status harian mengikuti skor terendah dari seluruh pupuk program. Pilih satu pupuk untuk melihat rekomendasi spesifik. Hard-stop BMKG dan risiko cuaca ekstrem tetap berlaku untuk seluruh jenis pupuk.</span></div>
          </>
        ) : null}
      </section>

      <nav className="fertTabs v97FertTabs" aria-label="Navigasi pemupukan">
        <a href="#weather-window">Cuaca & Rekomendasi</a><a href="#program">Program & Realisasi</a><a href="#input-program">Buat Program</a><a href="#acuan">Acuan Dosis</a>
      </nav>

      <section className="v97ProgramBoard" id="program">
        <div className="v97BoardHead">
          <div><span>PROGRAM {context.selectedYear}</span><h2>Kontrol Pemupukan {estate?.name ?? "Kebun"}</h2><p>Prioritaskan program berstatus terjadwal atau sebagian, lalu catat realisasinya dari detail program.</p></div>
          <div className="v97BoardStat"><small>OPEN PROGRAM</small><strong>{unfinished}</strong><span>perlu tindak lanjut</span></div>
        </div>
        <div className="v97ProgramList">
          {rows.map(({program,programItems,progress,estimatedCost,actualCost})=>{
            const block=blocks.find((b)=>b.id===program.block_id);
            const percentage=Math.min(progress.percentage,100);
            return <Link className="v97ProgramRow" href={`/pupuk/${program.id}`} key={program.id}>
              <div className={`v97ProgramIcon ${progress.status.toLowerCase()}`}><AppIcon name="fertilizer"/></div>
              <div className="v97ProgramMain">
                <div className="v97ProgramTitle"><span>{block?.name ?? "-"}</span><b>{program.period_label || program.pattern}</b></div>
                <p>{programItems.map(i=>i.fertilizer_name).join(" · ") || "Item pupuk belum tersedia"}</p>
                <div className="v97ProgressLine"><i style={{width:`${percentage}%`}}/></div>
                <div className="v97ProgramMeta"><span>{idDate(program.planned_date)}</span><span>{formatNumber(progress.actualKg)} / {formatNumber(progress.plannedKg)} Kg</span><span>{formatNumber(percentage,1)}%</span></div>
              </div>
              <div className="v97ProgramCost"><span className={`planStatus ${progress.status.toLowerCase()}`}>{progress.status}</span><strong>{formatCompactRupiah(actualCost)}</strong><small>est. {formatCompactRupiah(estimatedCost)}</small><em>Buka detail →</em></div>
            </Link>;
          })}
          {!rows.length?<div className="v97EmptyPrograms"><AppIcon name="fertilizer"/><b>Belum ada program pemupukan</b><span>Buat program pertama untuk {estate?.name ?? "kebun aktif"} pada tahun {context.selectedYear}.</span><a href="#input-program">＋ Buat Program</a></div>:null}
        </div>
      </section>

      <section className="fertWorkspace v97FertWorkspace" id="input-program">
        <aside className="fertComposer v97FertComposer">
          <div className="v97SectionHead"><i><AppIcon name="plus"/></i><div><span>INPUT PROGRAM</span><h2>Rencana Pemupukan Baru</h2><p>Pilih blok dan tanggal. Rekomendasi dosis akan mengikuti umur tanaman dan tetap dapat disesuaikan.</p></div></div>
          {estate && estateBlocks.length ? (
            <FertilizerProgramForm estateId={estate.id} selectedYear={context.selectedYear} blocks={estateBlocks} action={createFertilizerProgram} />
          ) : <div className="emptyState">Tambahkan blok terlebih dahulu.</div>}
        </aside>

        <div className="v97PlanningGuide">
          <div className="v97SectionHead"><i><AppIcon name="report"/></i><div><span>WORKFLOW</span><h2>Alur Pemupukan</h2><p>Program dan aktual dipisahkan agar kebutuhan serta biaya dapat dibandingkan tanpa menghitung ganda.</p></div></div>
          <div className="v97Steps">
            <div><b>01</b><span><strong>Buat program</strong><small>Tentukan blok, tanggal, pola dan dosis.</small></span></div>
            <div><b>02</b><span><strong>Cek kebutuhan</strong><small>Sistem menghitung kebutuhan Kg dari dosis × populasi.</small></span></div>
            <div><b>03</b><span><strong>Realisasi lapangan</strong><small>Catat jumlah aktual, harga, dosis dan pelaksana.</small></span></div>
            <div><b>04</b><span><strong>Masuk aktivitas</strong><small>Realisasi otomatis menjadi operation Pemupukan.</small></span></div>
          </div>
          <div className="v97GuideMetric"><span>Rasio realisasi tahun {context.selectedYear}</span><strong>{formatNumber(completion,1)}%</strong><div><i style={{width:`${completion}%`}}/></div><small>{formatNumber(actualKg)} Kg sudah diaplikasikan dari {formatNumber(plannedKg)} Kg.</small></div>
        </div>
      </section>

      <section className="fertReferencePanel v97ReferencePanel" id="acuan">
        <div className="fertReferenceHead v97ReferenceHead">
          <div>
            <span>ACUAN DOSIS PEMUPUKAN</span>
            <h2>Baseline TBM & TM — Tanah Mineral</h2>
            <p>Acuan internal untuk membantu perencanaan. Penyesuaian tetap mengikuti kondisi tanaman, analisis tanah/daun dan rekomendasi agronom.</p>
          </div>
          <div className="fertFormulaBadges"><b>TBM · {FERTILIZER_FORMULAS.tbm}</b><b>TM · {FERTILIZER_FORMULAS.tm}</b></div>
        </div>

        <div className="fertReferenceGrid">
          <article>
            <header><span>TBM · MAJEMUK</span><h3>Milestone Umur Tanaman</h3><small>gram/pohon/aplikasi</small></header>
            <div className="fertReferenceTableWrap"><table className="fertReferenceTable"><thead><tr><th>Umur</th><th>Urea</th><th>NPK 12.12.17</th><th>Dolomit</th></tr></thead><tbody>
              {TBM_MINERAL_COMPOUND.map((row) => <tr key={row.month}><td><b>{row.month} bln</b></td><td>{row.urea || "—"}</td><td>{row.npk || "—"}</td><td>{row.dolomite || "—"}</td></tr>)}
            </tbody></table></div>
          </article>
          <article>
            <header><span>TM · MAJEMUK</span><h3>Kelompok Umur Produktif</h3><small>kg/pohon; Semester I & II</small></header>
            <div className="fertReferenceTableWrap"><table className="fertReferenceTable tmReferenceTable"><thead><tr><th>Umur</th><th>Semester I</th><th>Semester II</th><th>Total/thn</th></tr></thead><tbody>
              {TM_MINERAL_COMPOUND.map((row) => <tr key={row.age}><td><b>{row.age} th</b></td><td>Bioneensis {row.semester1.bioneensis} · NPK {row.semester1.npk} · Urea {row.semester1.urea} · Dol {row.semester1.dolomite} · Borax {row.semester1.borax}</td><td>NPK {row.semester2.npk} · Bioneensis {row.semester2.bioneensis}</td><td><b>{row.annual} kg</b></td></tr>)}
            </tbody></table></div>
          </article>
        </div>
        <div className="fertReferenceNote"><b>Catatan formula:</b><span>TBM memakai NPK 12.12.17.2 + 0,75B. TM memakai NPK 13.6.27.4 + 0,65B. Formula lain perlu dikonversi berdasarkan kandungan hara, bukan disamakan beratnya.</span></div>
      </section>
    </div>
  );
}
