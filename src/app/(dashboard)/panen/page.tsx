export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { calculateBjr, getHarvestPlanProgress } from "@/lib/calculations/harvest";
import { formatCompactRupiah, formatNumber } from "@/lib/formatters";
import { ContextSelector } from "@/components/layout/context-selector";
import { AppIcon } from "@/components/layout/app-icons";
import { createHarvest } from "@/features/harvests/actions";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}
function monthLabel(month: number) {
  return new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(2026, month, 1));
}
function planStatusClass(status: string) {
  return status === "Selesai" ? "done" : status === "Sebagian" ? "partial" : "scheduled";
}

export default async function HarvestPage({ searchParams }: { searchParams: Promise<{ source?: string; status?: string }> }) {
  const params = await searchParams;
  const supabase = await createClient();
  const context = await getAppContext();

  const [estateResult, blockResult, harvestResult, planResult] = await Promise.all([
    supabase.from("estates").select("id,name").order("created_at"),
    supabase.from("blocks").select("id,estate_id,name,trees,area").order("name"),
    supabase.from("harvests").select("*").order("harvest_date", { ascending: false }),
    supabase.from("plans").select("*").eq("type", "Panen").order("planned_date"),
  ]);
  if (estateResult.error) throw new Error(estateResult.error.message);
  if (blockResult.error) throw new Error(blockResult.error.message);
  if (harvestResult.error) throw new Error(harvestResult.error.message);
  if (planResult.error) throw new Error(planResult.error.message);

  const estates = estateResult.data ?? [];
  const blocks = blockResult.data ?? [];
  const allHarvests = harvestResult.data ?? [];
  const allPlans = planResult.data ?? [];
  const activeEstateId = context.activeEstateId && estates.some((e) => e.id === context.activeEstateId) ? context.activeEstateId : estates[0]?.id ?? null;
  const activeEstate = estates.find((e) => e.id === activeEstateId) ?? null;
  const activeBlocks = blocks.filter((b) => b.estate_id === activeEstateId);
  const yearPrefix = `${context.selectedYear}-`;
  const yearHarvests = allHarvests.filter((h) => h.estate_id === activeEstateId && String(h.harvest_date).startsWith(yearPrefix));
  const panenPlans = allPlans.filter((p) => p.estate_id === activeEstateId && String(p.planned_date).startsWith(yearPrefix));
  const filteredHarvests = params.source === "DIRECT" ? yearHarvests.filter((h) => h.source === "DIRECT" && !h.plan_id) : params.source === "PLAN" ? yearHarvests.filter((h) => h.source === "PLAN" || Boolean(h.plan_id)) : yearHarvests;

  const production = yearHarvests.reduce((s, h) => s + Number(h.weight_kg ?? 0), 0);
  const revenue = yearHarvests.reduce((s, h) => s + Number(h.revenue ?? 0), 0);
  const bunches = yearHarvests.reduce((s, h) => s + Number(h.bunches ?? 0), 0);
  const averageBjr = calculateBjr(production, bunches);
  const avgPrice = production > 0 ? revenue / production : 0;
  const totalArea = activeBlocks.reduce((s, b) => s + Number(b.area ?? 0), 0);
  const tonPerHa = totalArea > 0 ? production / 1000 / totalArea : 0;

  const monthly = Array.from({ length: 12 }, (_, month) => {
    const rows = yearHarvests.filter((h) => new Date(`${h.harvest_date}T00:00:00`).getMonth() === month);
    return { month, kg: rows.reduce((s, h) => s + Number(h.weight_kg ?? 0), 0), revenue: rows.reduce((s, h) => s + Number(h.revenue ?? 0), 0) };
  });
  const maxMonthlyKg = Math.max(...monthly.map((m) => m.kg), 1);
  const blockPerformance = activeBlocks.map((block) => {
    const rows = yearHarvests.filter((h) => h.block_id === block.id);
    const kg = rows.reduce((s, h) => s + Number(h.weight_kg ?? 0), 0);
    return { ...block, kg, tph: Number(block.area) > 0 ? kg / 1000 / Number(block.area) : 0 };
  }).sort((a, b) => b.kg - a.kg);
  const bestBlock = blockPerformance[0];
  const openPlans = panenPlans.filter((plan) => getHarvestPlanProgress(plan, allHarvests).status !== "Selesai").length;

  return (
    <div className="v98HarvestPage">
      <section className="v98HarvestHero">
        <div className="v98HarvestHeroTop">
          <div>
            <span>HARVEST & REVENUE CONTROL CENTER</span>
            <h1>Panen & Produksi</h1>
            <p>Pantau produksi TBS, produktivitas kebun, harga jual, pendapatan dan progres rencana panen dalam satu layar.</p>
          </div>
          <ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={activeEstateId} />
        </div>
        <div className="v98HeroSignals">
          <article><small>KEBUN AKTIF</small><strong>{activeEstate?.name ?? "-"}</strong><span>{activeBlocks.length} blok operasional</span></article>
          <article><small>PRODUKSI TAHUNAN</small><strong>{formatNumber(production / 1000, 1)} Ton</strong><span>{formatNumber(tonPerHa, 2)} ton/ha</span></article>
          <article><small>HARGA RATA-RATA</small><strong>Rp {formatNumber(avgPrice, 0)}</strong><span>per Kg TBS</span></article>
          <article><small>RENCANA TERBUKA</small><strong>{openPlans}</strong><span>dari {panenPlans.length} rencana panen</span></article>
        </div>
      </section>

      {params.status ? <div className="activityNotice">{params.status === "created" ? "Transaksi panen berhasil disimpan." : params.status === "deleted" ? "Transaksi panen berhasil dihapus dan KPI dihitung ulang." : "Perubahan panen tersimpan."}</div> : null}

      <section className="v98HarvestKpis">
        <article><i><AppIcon name="harvest" /></i><div><small>Produksi TBS</small><strong>{formatNumber(production / 1000, 2)} Ton</strong><span>{yearHarvests.length} transaksi</span></div></article>
        <article><i><AppIcon name="budget" /></i><div><small>Pendapatan</small><strong>{formatCompactRupiah(revenue)}</strong><span>actual {context.selectedYear}</span></div></article>
        <article><i><AppIcon name="analytics" /></i><div><small>Produktivitas</small><strong>{formatNumber(tonPerHa, 2)} t/ha</strong><span>{formatNumber(totalArea, 1)} Ha tercatat</span></div></article>
        <article><i><AppIcon name="harvest" /></i><div><small>BJR Rata-rata</small><strong>{formatNumber(averageBjr, 2)} Kg</strong><span>{formatNumber(bunches, 0)} janjang</span></div></article>
      </section>

      <section className="v98PerformanceGrid">
        <article className="v98Panel v98TrendPanel">
          <header><div><span>TREND PRODUKSI</span><h2>Produksi Bulanan {context.selectedYear}</h2></div><b>{bestBlock?.name ?? "-"} · blok tertinggi</b></header>
          <div className="v98TrendBars">
            {monthly.map((m) => <div key={m.month} title={`${monthLabel(m.month)}: ${formatNumber(m.kg)} Kg`}><span><i style={{ height: `${Math.max((m.kg / maxMonthlyKg) * 100, m.kg > 0 ? 8 : 2)}%` }} /></span><small>{monthLabel(m.month)}</small></div>)}
          </div>
        </article>
        <article className="v98Panel v98BlockRank">
          <header><div><span>PERFORMA BLOK</span><h2>Kontribusi Produksi</h2></div><Link href="/kebun">Lihat kebun →</Link></header>
          <div className="v98BlockRankList">
            {blockPerformance.slice(0, 4).map((b, i) => <div key={b.id}><b>{i + 1}</b><span><strong>{b.name}</strong><small>{formatNumber(b.tph, 2)} t/ha</small></span><em>{formatNumber(b.kg / 1000, 2)} Ton</em></div>)}
            {!blockPerformance.length ? <div className="emptyState">Belum ada blok aktif.</div> : null}
          </div>
        </article>
      </section>

      <section className="v98HarvestWorkspace">
        <aside className="v98HarvestComposer">
          <div className="v98SectionTitle"><span>INPUT LAPANGAN</span><h2>Catat Panen Direct</h2><p>Gunakan untuk panen aktual di luar rencana. Pendapatan dihitung otomatis dari berat × harga.</p></div>
          {activeEstate && activeBlocks.length ? (
            <form action={createHarvest} className="harvestForm v98HarvestForm">
              <input type="hidden" name="estate_id" value={activeEstate.id} /><input type="hidden" name="selected_year" value={context.selectedYear} /><input type="hidden" name="source" value="DIRECT" /><input type="hidden" name="plan_id" value="" />
              <div className="v98FormCallout fullField"><i><AppIcon name="harvest" /></i><div><b>DIRECT / tanpa rencana</b><span>Untuk panen yang berasal dari Rencana Panen, gunakan tombol “Realisasikan” pada kartu rencana.</span></div></div>
              <label>Blok<select name="block_id" defaultValue={activeBlocks[0]?.id ?? ""} required>{activeBlocks.map((b) => <option value={b.id} key={b.id}>{b.name}</option>)}</select></label>
              <label>Tanggal Panen<input name="harvest_date" type="date" defaultValue={`${context.selectedYear}-${String(new Date().getMonth()+1).padStart(2,"0")}-${String(new Date().getDate()).padStart(2,"0")}`} required /></label>
              <label>Berat TBS (Kg)<input name="weight_kg" type="number" min="0.01" step="0.01" required /></label>
              <label>Jumlah Janjang<input name="bunches" type="number" min="0" step="1" defaultValue="0" /></label>
              <label>Harga / Kg (Rp)<input name="price_per_kg" type="number" min="0" step="1" required /></label>
              <label>Pemanen / Pelaksana<input name="worker" placeholder="Opsional" /></label>
              <label className="fullField">Catatan<textarea name="note" rows={3} placeholder="Kondisi buah, kualitas, catatan timbang..." /></label>
              <button className="primaryButton fullField" type="submit">Simpan Actual Panen</button>
            </form>
          ) : <div className="emptyState">Tambahkan blok terlebih dahulu sebelum mencatat panen.</div>}
        </aside>

        <div className="v98HarvestHistory">
          <div className="v98HistoryHead"><div className="v98SectionTitle"><span>RIWAYAT PRODUKSI</span><h2>Transaksi Panen</h2><p>{activeEstate?.name ?? "Kebun"} · Tahun {context.selectedYear}</p></div><div className="activityFilters"><Link href="/panen" className={!params.source ? "activeFilter" : ""}>Semua</Link><Link href="/panen?source=PLAN" className={params.source === "PLAN" ? "activeFilter" : ""}>Dari Rencana</Link><Link href="/panen?source=DIRECT" className={params.source === "DIRECT" ? "activeFilter" : ""}>Direct</Link></div></div>
          <div className="v98HarvestList">
            {filteredHarvests.map((h) => { const block = blocks.find((b) => b.id === h.block_id); const planLinked = Boolean(h.plan_id) || h.source === "PLAN"; const bjr = calculateBjr(Number(h.weight_kg), Number(h.bunches)); return (
              <Link href={`/panen/${h.id}`} className="v98HarvestRow" key={h.id}><i><AppIcon name="harvest" /></i><div><b>{block?.name ?? "-"}</b><small>{idDate(h.harvest_date)} · {formatNumber(Number(h.weight_kg))} Kg {Number(h.bunches)>0 ? `· ${formatNumber(Number(h.bunches),0)} janjang` : ""}</small><span>BJR {formatNumber(bjr,2)} Kg · {h.worker || "Pelaksana belum diisi"}</span></div><aside><strong>{formatCompactRupiah(Number(h.revenue))}</strong><em className={planLinked ? "planPill" : "directPill"}>{planLinked ? "PLAN" : "DIRECT"}</em><small>Rp {formatNumber(Number(h.price_per_kg),0)}/Kg</small></aside></Link>
            )})}
            {!filteredHarvests.length ? <div className="emptyActivity">Belum ada panen pada filter ini untuk {context.selectedYear}.</div> : null}
          </div>
        </div>
      </section>

      <section className="v98PlanSection">
        <div className="v98SectionTitle v98PlanTitle"><div><span>PLAN → ACTUAL</span><h2>Progress Rencana Panen</h2><p>Realisasi dapat dilakukan bertahap; pencapaian dihitung kumulatif dari transaksi actual yang terhubung.</p></div><b>{panenPlans.length} rencana</b></div>
        <div className="v98PlanCards">
          {panenPlans.map((plan) => { const block = blocks.find((b) => b.id === plan.block_id); const progress = getHarvestPlanProgress(plan, allHarvests); const pct = Math.min(progress.percentage,100); return (
            <article className="v98PlanCard" key={plan.id}><div className="v98PlanCardTop"><div><small>{idDate(plan.planned_date)}</small><h3>{block?.name ?? "Seluruh Kebun"}</h3></div><span className={`planStatus ${planStatusClass(progress.status)}`}>{progress.status}</span></div><div className="v98PlanMetrics"><div><small>Target</small><strong>{formatNumber(progress.targetKg/1000,2)} t</strong></div><div><small>Aktual</small><strong>{formatNumber(progress.actualKg/1000,2)} t</strong></div><div><small>Sisa</small><strong>{formatNumber(progress.remainingKg/1000,2)} t</strong></div><div><small>Capaian</small><strong>{formatNumber(progress.percentage,1)}%</strong></div></div><div className="planProgress"><div style={{width:`${pct}%`}} /></div><footer><span>{plan.note || "Rencana Panen"}</span>{progress.status !== "Selesai" ? <Link href={`/panen/realisasi/${plan.id}`}>Realisasikan →</Link> : <b>Selesai</b>}</footer></article>
          )})}
          {!panenPlans.length ? <div className="emptyState">Belum ada Rencana Panen pada {context.selectedYear}. Panen DIRECT tetap dapat dicatat.</div> : null}
        </div>
      </section>
    </div>
  );
}
