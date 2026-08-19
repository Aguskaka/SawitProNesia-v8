export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import {
  annualSummary,
  costPerKg,
  monthlyProductionSeries,
  tonPerHa,
  transactionYear,
} from "@/lib/calculations/annual";
import { getEstateStage } from "@/lib/calculations/estate-stage";
import { formatCompactRupiah, formatNumber, formatRupiah } from "@/lib/formatters";
import { ContextSelector } from "@/components/layout/context-selector";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function activityDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00`));
}

export default async function HomePage() {
  const supabase = await createClient();
  const context = await getAppContext();

  const [estateResult, blockResult, harvestResult, operationResult] = await Promise.all([
    supabase.from("estates").select("*").order("created_at"),
    supabase.from("blocks").select("*").order("name"),
    supabase.from("harvests").select("*"),
    supabase.from("operations").select("*"),
  ]);

  for (const result of [estateResult, blockResult, harvestResult, operationResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const estates = estateResult.data ?? [];
  const blocks = blockResult.data ?? [];
  const harvests = harvestResult.data ?? [];
  const operations = operationResult.data ?? [];

  const activeEstate =
    estates.find((estate) => estate.id === context.activeEstateId) ?? estates[0] ?? null;

  if (!activeEstate) {
    return (
      <section className="emptyState">
        <h1>Belum ada kebun</h1>
        <p>Supabase tersambung, tetapi tidak ada estate yang dapat dibaca oleh user ini.</p>
      </section>
    );
  }

  const summary = annualSummary(harvests, operations, activeEstate.id, context.selectedYear);
  const estateBlocks = blocks.filter((block) => block.estate_id === activeEstate.id);
  const area = estateBlocks.reduce((sum, block) => sum + Number(block.area ?? 0), 0);
  const trees = estateBlocks.reduce((sum, block) => sum + Number(block.trees ?? 0), 0);
  const stage = getEstateStage(blocks, activeEstate.id, context.selectedYear);
  const monthlyProduction = monthlyProductionSeries(harvests, activeEstate.id, context.selectedYear);
  const chartMax = Math.max(...monthlyProduction, 1);
  const efficiency = costPerKg(summary.productionKg, summary.cost);
  const productivity = tonPerHa(summary.productionKg, area);

  const recent = [
    ...harvests
      .filter(
        (h) =>
          h.estate_id === activeEstate.id &&
          transactionYear(h.harvest_date) === context.selectedYear,
      )
      .map((h) => ({
        id: `harvest-${h.id}`,
        type: "Panen",
        icon: "🌾",
        date: h.harvest_date,
        title: `Panen ${formatNumber(Number(h.weight_kg ?? 0))} Kg`,
        value: formatCompactRupiah(Number(h.revenue ?? 0)),
      })),
    ...operations
      .filter(
        (o) =>
          o.estate_id === activeEstate.id &&
          transactionYear(o.op_date) === context.selectedYear,
      )
      .map((o) => ({
        id: `operation-${o.id}`,
        type: o.type,
        icon: o.type === "Pemupukan" ? "🧺" : o.type === "Perawatan" ? "✂️" : "🧾",
        date: o.op_date,
        title: o.description || o.type,
        value: formatCompactRupiah(Number(o.total_cost ?? 0)),
      })),
  ]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 5);

  return (
    <div className="homeDashboard">
      <section className="estateHero premiumHero">
        <div className="heroShade" />
        <div className="heroTop">
          <ContextSelector
            estates={estates.map((estate) => ({ id: estate.id, name: estate.name }))}
            selectedYear={context.selectedYear}
            activeEstateId={activeEstate.id}
          />

          <div className="heroStage">
            <span>Status Kebun</span>
            <b className={stage === "TBM" ? "tbm" : "productive"}>{stage}</b>
          </div>
        </div>

        <div className="heroBottom">
          <div>
            <span className="heroMicro">OWNER VIEW</span>
            <h1>{activeEstate.name}</h1>
            <p>{estateBlocks.length} blok · {formatNumber(area)} Ha · {formatNumber(trees, 0)} pohon</p>
          </div>
          <div className="heroYearStamp">{context.selectedYear}</div>
        </div>
      </section>

      <section className="primaryKpis">
        <article>
          <span className="kpiIcon">↗</span>
          <small>Produksi {context.selectedYear}</small>
          <strong>{formatNumber(summary.productionKg)} Kg</strong>
          <em>{productivity.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ton/Ha</em>
        </article>
        <article>
          <span className="kpiIcon">Rp</span>
          <small>Pendapatan</small>
          <strong>{formatCompactRupiah(summary.revenue)}</strong>
          <em>{formatRupiah(summary.revenue)}</em>
        </article>
        <article>
          <span className="kpiIcon">↓</span>
          <small>Biaya Aktual</small>
          <strong>{formatCompactRupiah(summary.cost)}</strong>
          <em>{formatRupiah(efficiency)}/Kg TBS</em>
        </article>
        <article className={summary.margin >= 0 ? "positiveCard" : "negativeCard"}>
          <span className="kpiIcon">◆</span>
          <small>Margin YTD</small>
          <strong>{formatCompactRupiah(summary.margin)}</strong>
          <em>{summary.revenue > 0 ? `${(summary.margin / summary.revenue * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}% margin` : "Belum ada pendapatan"}</em>
        </article>
      </section>

      <section className="dashboardGrid">
        <article className="panel productionPanel">
          <header className="panelHead">
            <div>
              <span>PRODUKSI TBS</span>
              <h2>Tren 12 Bulan</h2>
            </div>
            <b>{context.selectedYear}</b>
          </header>

          <div className="productionChart">
            {monthlyProduction.map((value, index) => (
              <div className="barColumn" key={MONTHS[index]}>
                <span className="barValue">{value > 0 ? formatNumber(value, 0) : ""}</span>
                <div className="barTrack">
                  <div
                    className="barFill"
                    style={{ height: `${Math.max(value > 0 ? 8 : 0, (value / chartMax) * 100)}%` }}
                  />
                </div>
                <small>{MONTHS[index]}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel ownerSnapshot">
          <header className="panelHead">
            <div>
              <span>OWNER SNAPSHOT</span>
              <h2>Kondisi Kebun</h2>
            </div>
          </header>

          <div className="snapshotGrid">
            <div><span>Luas Kebun</span><strong>{formatNumber(area)} Ha</strong></div>
            <div><span>Total Pohon</span><strong>{formatNumber(trees, 0)}</strong></div>
            <div><span>Produktivitas</span><strong>{productivity.toLocaleString("id-ID", { maximumFractionDigits: 2 })} t/Ha</strong></div>
            <div><span>Biaya / Kg</span><strong>{formatRupiah(efficiency)}</strong></div>
          </div>

          <div className="snapshotHealth">
            <span>Health Indicator</span>
            <b className={summary.margin >= 0 ? "healthy" : "watch"}>
              {summary.margin >= 0 ? "SEHAT" : "PERLU PERHATIAN"}
            </b>
          </div>
        </article>
      </section>

      <section className="panel recentPanel">
        <header className="panelHead">
          <div>
            <span>AKTIVITAS TERBARU</span>
            <h2>Operasional {activeEstate.name}</h2>
          </div>
          <b>{recent.length} terbaru</b>
        </header>

        <div className="recentList">
          {recent.length ? recent.map((item) => (
            <div className="recentItem" key={item.id}>
              <span className="recentIcon">{item.icon}</span>
              <div>
                <b>{item.title}</b>
                <small>{item.type} · {activityDate(item.date)}</small>
              </div>
              <strong>{item.value}</strong>
            </div>
          )) : (
            <div className="emptyRecent">Belum ada aktivitas pada tahun {context.selectedYear}.</div>
          )}
        </div>
      </section>

      <section className="phaseBanner">
        <span>v8.1 HOME MIGRATION</span>
        <b>Home sudah native Next.js. Modul Kebun, Rencana, Kalender, Laporan dan Analytics masih dikunci untuk tahap berikutnya.</b>
      </section>
    </div>
  );
}
