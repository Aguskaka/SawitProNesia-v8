export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ensureManagementAccess } from "@/lib/auth/access";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { ContextSelector } from "@/components/layout/context-selector";
import { AppIcon } from "@/components/layout/app-icons";
import {
  annualSummary,
  costPerKg,
  monthlyFinancialSeries,
  operationCostBreakdown,
  tonPerHa,
} from "@/lib/calculations/annual";
import { formatCompactRupiah, formatNumber, formatRupiah } from "@/lib/formatters";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pct(value: number) {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

export default async function AnalyticsPage() {
  await ensureManagementAccess();
  const supabase = await createClient();
  const context = await getAppContext();

  const [estateResult, blockResult, harvestResult, operationResult, budgetResult] = await Promise.all([
    supabase.from("estates").select("*").order("created_at"),
    supabase.from("blocks").select("*").order("name"),
    supabase.from("harvests").select("*"),
    supabase.from("operations").select("*"),
    supabase.from("annual_budgets").select("*"),
  ]);

  for (const result of [estateResult, blockResult, harvestResult, operationResult, budgetResult]) {
    if (result.error) throw new Error(result.error.message);
  }

  const estates = estateResult.data ?? [];
  const blocks = blockResult.data ?? [];
  const harvests = harvestResult.data ?? [];
  const operations = operationResult.data ?? [];
  const budgets = budgetResult.data ?? [];
  const estate = estates.find((item) => item.id === context.activeEstateId) ?? estates[0] ?? null;

  if (!estate) {
    return <section className="emptyState"><h1>Belum ada kebun</h1><p>Analytics membutuhkan minimal satu kebun.</p></section>;
  }

  const estateBlocks = blocks.filter((block) => block.estate_id === estate.id);
  const area = estateBlocks.reduce((sum, block) => sum + Number(block.area ?? 0), 0);
  const summary = annualSummary(harvests, operations, estate.id, context.selectedYear);
  const monthly = monthlyFinancialSeries(harvests, operations, estate.id, context.selectedYear);
  const costBreakdown = operationCostBreakdown(operations, estate.id, context.selectedYear);
  const budget = Number(budgets.find((row) => row.estate_id === estate.id && row.budget_year === context.selectedYear)?.amount ?? 0);

  const productivity = tonPerHa(summary.productionKg, area);
  const unitCost = costPerKg(summary.productionKg, summary.cost);
  const averagePrice = summary.productionKg > 0 ? summary.revenue / summary.productionKg : 0;
  const marginPct = summary.revenue > 0 ? summary.margin / summary.revenue * 100 : 0;
  const costToRevenue = summary.revenue > 0 ? summary.cost / summary.revenue * 100 : 0;
  const budgetUsed = budget > 0 ? summary.cost / budget * 100 : 0;
  const budgetVariance = budget - summary.cost;

  const blockRows = estateBlocks.map((block) => {
    const blockSummary = annualSummary(
      harvests.filter((row) => row.block_id === block.id),
      operations.filter((row) => row.block_id === block.id),
      estate.id,
      context.selectedYear,
    );
    const blockArea = Number(block.area ?? 0);
    return {
      id: block.id,
      name: block.name,
      area: blockArea,
      ...blockSummary,
      productivity: tonPerHa(blockSummary.productionKg, blockArea),
      costKg: costPerKg(blockSummary.productionKg, blockSummary.cost),
      marginPct: blockSummary.revenue > 0 ? blockSummary.margin / blockSummary.revenue * 100 : 0,
    };
  });

  const ranked = [...blockRows].sort((a, b) => b.productivity - a.productivity);
  const bestBlock = ranked.find((row) => row.productionKg > 0) ?? null;
  const highestCostBlock = [...blockRows].filter((row) => row.productionKg > 0).sort((a, b) => b.costKg - a.costKg)[0] ?? null;
  const topCost = costBreakdown[0] ?? null;
  const peakMonth = [...monthly].sort((a, b) => b.productionKg - a.productionKg)[0];
  const activeMonths = monthly.filter((row) => row.productionKg > 0 || row.cost > 0 || row.revenue > 0).length;
  const maxFinance = Math.max(...monthly.flatMap((row) => [row.revenue, row.cost]), 1);
  const maxProduction = Math.max(...monthly.map((row) => row.productionKg), 1);

  const executiveStatus = summary.margin < 0
    ? "Margin Negatif"
    : budget > 0 && budgetUsed > 100
      ? "Perlu Kendali Biaya"
      : summary.productionKg <= 0
        ? "Menunggu Produksi"
        : "Kinerja Positif";
  const executiveTone = summary.margin < 0 || (budget > 0 && budgetUsed > 100) ? "watch" : "good";

  const insights = [
    {
      label: "Efisiensi Pendapatan",
      value: `${pct(costToRevenue)}%`,
      note: summary.revenue > 0 ? `Setiap Rp100 pendapatan menyerap sekitar Rp${Math.round(costToRevenue)} biaya.` : "Belum ada pendapatan untuk dibandingkan.",
      tone: costToRevenue > 80 ? "watch" : "good",
    },
    {
      label: "Tekanan Anggaran",
      value: budget > 0 ? `${pct(budgetUsed)}%` : "—",
      note: budget > 0 ? (budgetVariance >= 0 ? `${formatCompactRupiah(budgetVariance)} pagu masih tersedia.` : `${formatCompactRupiah(Math.abs(budgetVariance))} di atas pagu.`) : "Master budget belum ditetapkan.",
      tone: budget > 0 && budgetUsed > 100 ? "watch" : "neutral",
    },
    {
      label: "Blok Benchmark",
      value: bestBlock?.name ?? "—",
      note: bestBlock ? `${pct(bestBlock.productivity)} ton/Ha · margin ${pct(bestBlock.marginPct)}%.` : "Belum ada blok dengan produksi aktual.",
      tone: "good",
    },
  ];

  return (
    <div className="analyticsPage v103AnalyticsPage">
      <section className="v103Hero">
        <div className="v103HeroTop">
          <div className="v103HeroCopy">
            <span>EXECUTIVE ANALYTICS CENTER</span>
            <h1>Analytics & Executive Dashboard</h1>
            <p>Analisis tren, efisiensi, margin dan performa blok untuk membaca kesehatan operasional kebun secara cepat.</p>
          </div>
          <div className="v103Controls">
            <ContextSelector estates={estates.map((item) => ({ id: item.id, name: item.name }))} selectedYear={context.selectedYear} activeEstateId={estate.id} />
          </div>
        </div>
        <div className="v103HeroStrip">
          <article><small>KEBUN AKTIF</small><strong>{estate.name}</strong><span>{estateBlocks.length} blok · {formatNumber(area)} Ha</span></article>
          <article><small>STATUS EKSEKUTIF</small><strong className={`v103Status-${executiveTone}`}>{executiveStatus}</strong><span>margin {pct(marginPct)}% · cost/revenue {pct(costToRevenue)}%</span></article>
          <article><small>TOP COST DRIVER</small><strong>{topCost?.type ?? "-"}</strong><span>{topCost ? formatCompactRupiah(topCost.cost) : "belum ada biaya"}</span></article>
          <article><small>PEAK PRODUKSI</small><strong>{peakMonth.productionKg > 0 ? MONTHS[peakMonth.month - 1] : "-"}</strong><span>{formatNumber(peakMonth.productionKg / 1000, 2)} ton</span></article>
        </div>
      </section>

      <section className="v103Kpis">
        <article><i><AppIcon name="harvest" /></i><div><small>PRODUKTIVITAS</small><strong>{pct(productivity)} t/Ha</strong><span>{formatNumber(summary.productionKg / 1000, 2)} ton produksi</span></div></article>
        <article><i><AppIcon name="analytics" /></i><div><small>MARGIN OPERASIONAL</small><strong className={summary.margin < 0 ? "negativeValue" : "positiveValue"}>{formatCompactRupiah(summary.margin)}</strong><span>{pct(marginPct)}% dari pendapatan</span></div></article>
        <article><i><AppIcon name="budget" /></i><div><small>BIAYA / KG</small><strong>{formatRupiah(unitCost)}</strong><span>harga TBS {formatRupiah(averagePrice)}/Kg</span></div></article>
        <article><i><AppIcon name="report" /></i><div><small>COST / REVENUE</small><strong>{pct(costToRevenue)}%</strong><span>{formatCompactRupiah(summary.cost)} dari {formatCompactRupiah(summary.revenue)}</span></div></article>
        <article className={budget > 0 && budgetUsed > 100 ? "v103KpiWatch" : ""}><i><AppIcon name="activity" /></i><div><small>BUDGET PRESSURE</small><strong>{budget > 0 ? `${pct(budgetUsed)}%` : "—"}</strong><span>{budget > 0 ? formatCompactRupiah(budgetVariance) + " sisa/deviasi" : "budget belum diisi"}</span></div></article>
      </section>

      <section className="v103MainGrid">
        <article className="v103Panel v103TrendPanel">
          <header><div><span>FINANCIAL MOMENTUM</span><h2>Pendapatan, Biaya & Margin {context.selectedYear}</h2><p>Bandingkan momentum aktual setiap bulan untuk melihat titik pembentukan margin.</p></div><b>{activeMonths} bulan aktif</b></header>
          <div className="v103FinanceChart">
            {monthly.map((row, index) => (
              <div className="v103FinanceMonth" key={row.month}>
                <div className="v103FinanceBars">
                  <i className="v103RevenueBar" style={{ height: `${Math.max(row.revenue ? 5 : 0, row.revenue / maxFinance * 100)}%` }} />
                  <i className="v103CostBar" style={{ height: `${Math.max(row.cost ? 5 : 0, row.cost / maxFinance * 100)}%` }} />
                </div>
                <small>{MONTHS[index]}</small>
              </div>
            ))}
          </div>
          <div className="chartLegend"><span><i className="legendRevenue" />Pendapatan</span><span><i className="legendCost" />Biaya</span></div>
        </article>

        <article className="v103Panel v103InsightPanel">
          <header><div><span>EXECUTIVE SIGNALS</span><h2>Insight Utama</h2><p>Tiga sinyal untuk menentukan area yang perlu dilihat lebih dahulu.</p></div></header>
          <div className="v103InsightList">
            {insights.map((item) => <div className={`v103Insight-${item.tone}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong><p>{item.note}</p></div>)}
          </div>
        </article>
      </section>

      <section className="v103MidGrid">
        <article className="v103Panel">
          <header><div><span>PRODUCTION MOMENTUM</span><h2>Tren Produksi Bulanan</h2><p>Distribusi tonase aktual sepanjang tahun.</p></div><b>{formatNumber(summary.productionKg / 1000, 2)} ton YTD</b></header>
          <div className="v103ProductionChart">
            {monthly.map((row, index) => (
              <div className="v103ProductionMonth" key={row.month}><div><i style={{ height: `${Math.max(row.productionKg ? 5 : 0, row.productionKg / maxProduction * 100)}%` }} /></div><small>{MONTHS[index]}</small></div>
            ))}
          </div>
        </article>

        <article className="v103Panel">
          <header><div><span>COST STRUCTURE</span><h2>Komposisi Biaya</h2><p>Kontributor biaya aktual terbesar pada periode terpilih.</p></div><b>{costBreakdown.length} kategori</b></header>
          <div className="v103CostRows">
            {costBreakdown.length ? costBreakdown.slice(0, 6).map((row) => {
              const ratio = summary.cost > 0 ? row.cost / summary.cost * 100 : 0;
              return <div key={row.type}><div><span><b>{row.type}</b><small>{pct(ratio)}%</small></span><strong>{formatCompactRupiah(row.cost)}</strong></div><i><em style={{ width: `${Math.min(100, ratio)}%` }} /></i></div>;
            }) : <div className="emptyRecent">Belum ada biaya aktual.</div>}
          </div>
        </article>
      </section>

      <section className="v103Panel v103BlockCardsPanel">
        <header><div><span>BLOCK BENCHMARK</span><h2>Benchmark Produktivitas & Efisiensi</h2><p>Bandingkan blok menggunakan produktivitas, biaya per Kg dan margin aktual.</p></div><b>{blockRows.length} blok</b></header>
        <div className="v103BlockCards">
          {ranked.map((row, index) => (
            <article key={row.id}>
              <div className="v103BlockRank">#{index + 1}</div>
              <div className="v103BlockTitle"><span>BLOK</span><strong>{row.name}</strong><small>{formatNumber(row.area)} Ha</small></div>
              <div className="v103BlockMetric"><span>Produktivitas</span><strong>{pct(row.productivity)} t/Ha</strong></div>
              <div className="v103BlockMetric"><span>Biaya/Kg</span><strong>{row.productionKg > 0 ? formatRupiah(row.costKg) : "—"}</strong></div>
              <div className="v103BlockMetric"><span>Margin</span><strong className={row.margin < 0 ? "negativeValue" : "positiveValue"}>{formatCompactRupiah(row.margin)}</strong></div>
            </article>
          ))}
        </div>
      </section>

      <section className="v103Panel">
        <header><div><span>DEEP DIVE</span><h2>Efisiensi Per Blok</h2><p>Tabel analitik untuk melihat blok dengan performa terbaik maupun biaya tertinggi.</p></div><b>{highestCostBlock ? `${highestCostBlock.name} biaya/Kg tertinggi` : "belum ada benchmark biaya"}</b></header>
        <div className="monthlyTableWrap"><table className="reportTable analyticsTable"><thead><tr><th>Rank</th><th>Blok</th><th>Luas</th><th>Produksi</th><th>t/Ha</th><th>Pendapatan</th><th>Biaya</th><th>Biaya/Kg</th><th>Margin</th><th>Margin %</th></tr></thead><tbody>{ranked.map((row, index) => <tr key={row.id}><td>#{index + 1}</td><td><b>{row.name}</b></td><td>{formatNumber(row.area)} Ha</td><td>{formatNumber(row.productionKg, 0)} Kg</td><td>{pct(row.productivity)}</td><td>{formatCompactRupiah(row.revenue)}</td><td>{formatCompactRupiah(row.cost)}</td><td>{row.productionKg > 0 ? formatRupiah(row.costKg) : "—"}</td><td className={row.margin < 0 ? "negativeValue" : "positiveValue"}>{formatCompactRupiah(row.margin)}</td><td>{pct(row.marginPct)}%</td></tr>)}</tbody></table></div>
      </section>

      <div className="reportFootnote v103Footnote"><AppIcon name="analytics" /><span><b>Basis analytics:</b> hanya transaksi ACTUAL pada Tahun Global terpilih. Status eksekutif adalah indikator ringkas berbasis margin dan serapan budget; gunakan detail Laporan, Anggaran dan modul operasional untuk penelusuran.</span></div>
    </div>
  );
}
