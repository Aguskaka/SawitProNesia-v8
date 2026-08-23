export const dynamic = "force-dynamic";
export const revalidate = 0;

import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import {
  annualSummary,
  costPerKg,
  monthlyFinancialSeries,
  operationCostBreakdown,
  tonPerHa,
} from "@/lib/calculations/annual";
import { calculateBjr } from "@/lib/calculations/harvest";
import { ContextSelector } from "@/components/layout/context-selector";
import { AppIcon } from "@/components/layout/app-icons";
import { ReportActions } from "@/components/report-actions";
import { formatCompactRupiah, formatNumber, formatRupiah } from "@/lib/formatters";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function pct(value: number) {
  return value.toLocaleString("id-ID", { maximumFractionDigits: 1 });
}

export default async function ReportPage() {
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
  const annualBudgets = budgetResult.data ?? [];
  const activeEstate = estates.find((estate) => estate.id === context.activeEstateId) ?? estates[0] ?? null;

  if (!activeEstate) {
    return <section className="emptyState"><h1>Belum ada kebun</h1><p>Laporan membutuhkan minimal satu kebun.</p></section>;
  }

  const estateBlocks = blocks.filter((block) => block.estate_id === activeEstate.id);
  const area = estateBlocks.reduce((sum, block) => sum + Number(block.area ?? 0), 0);
  const summary = annualSummary(harvests, operations, activeEstate.id, context.selectedYear);
  const monthly = monthlyFinancialSeries(harvests, operations, activeEstate.id, context.selectedYear);
  const costs = operationCostBreakdown(operations, activeEstate.id, context.selectedYear);
  const yearHarvests = harvests.filter((h) => h.estate_id === activeEstate.id && String(h.harvest_date).startsWith(`${context.selectedYear}-`));
  const yearOperations = operations.filter((o) => o.estate_id === activeEstate.id && String(o.op_date).startsWith(`${context.selectedYear}-`));
  const bunches = yearHarvests.reduce((sum, h) => sum + Number(h.bunches ?? 0), 0);
  const bjr = calculateBjr(summary.productionKg, bunches);
  const productivity = tonPerHa(summary.productionKg, area);
  const efficiency = costPerKg(summary.productionKg, summary.cost);
  const marginPct = summary.revenue > 0 ? summary.margin / summary.revenue * 100 : 0;
  const averagePrice = summary.productionKg > 0 ? summary.revenue / summary.productionKg : 0;
  const totalHok = yearOperations.reduce((sum, operation) => sum + Number(operation.labor_days ?? 0), 0);
  const fertilizerKg = yearOperations.reduce((sum, operation) => {
    const unit = String(operation.unit ?? "").toLowerCase();
    return operation.type === "Pemupukan" && (unit === "kg" || unit.includes("kg")) ? sum + Number(operation.quantity ?? 0) : sum;
  }, 0);
  const annualBudget = Number(annualBudgets.find((b) => b.estate_id === activeEstate.id && b.budget_year === context.selectedYear)?.amount ?? 0);
  const budgetUsedPct = annualBudget > 0 ? summary.cost / annualBudget * 100 : 0;
  const budgetVariance = annualBudget - summary.cost;
  const maxMonthly = Math.max(...monthly.flatMap((m) => [m.revenue, m.cost]), 1);
  const topCost = costs[0] ?? null;

  const blockRows = estateBlocks.map((block) => {
    const blockHarvests = harvests.filter((h) => h.block_id === block.id);
    const blockOperations = operations.filter((o) => o.block_id === block.id);
    const blockSummary = annualSummary(blockHarvests, blockOperations, activeEstate.id, context.selectedYear);
    return {
      id: block.id,
      name: block.name,
      area: Number(block.area ?? 0),
      ...blockSummary,
      productivity: tonPerHa(blockSummary.productionKg, Number(block.area ?? 0)),
    };
  });
  const topBlock = [...blockRows].sort((a, b) => b.productionKg - a.productionKg)[0] ?? null;
  const activeMonths = monthly.filter((item) => item.productionKg > 0 || item.revenue > 0 || item.cost > 0).length;
  const reportStatus = summary.margin >= 0 && (annualBudget === 0 || budgetUsedPct <= 100) ? "TERKENDALI" : summary.margin >= 0 ? "PERLU KONTROL" : "PERLU PERHATIAN";

  const exportSummary = [
    {
      Kebun: activeEstate.name,
      Tahun: context.selectedYear,
      "Luas (Ha)": area,
      "Produksi (Kg)": summary.productionKg,
      "Pendapatan (Rp)": summary.revenue,
      "Biaya Aktual (Rp)": summary.cost,
      "Margin Operasional (Rp)": summary.margin,
      "Margin (%)": marginPct.toFixed(1),
      "Produktivitas (ton/Ha)": productivity.toFixed(2),
      "BJR (Kg)": bjr.toFixed(2),
      "HOK": totalHok,
      "Pupuk Aktual (Kg)": fertilizerKg,
      "Anggaran (Rp)": annualBudget,
      "Serapan Anggaran (%)": budgetUsedPct.toFixed(1),
    },
  ];
  const exportMonthly = monthly.map((item, index) => ({
    Bulan: MONTHS[index],
    "Produksi (Kg)": item.productionKg,
    "Pendapatan (Rp)": item.revenue,
    "Biaya (Rp)": item.cost,
    "Margin (Rp)": item.margin,
  }));
  const exportBlocks = blockRows.map((row) => ({
    Blok: row.name,
    "Luas (Ha)": row.area,
    "Produksi (Kg)": row.productionKg,
    "Produktivitas (ton/Ha)": row.productivity.toFixed(2),
    "Pendapatan (Rp)": row.revenue,
    "Biaya (Rp)": row.cost,
    "Margin (Rp)": row.margin,
  }));

  return (
    <div className="reportPage v102ReportPage">
      <section className="v102ReportHero">
        <div className="v102ReportHeroTop">
          <div className="v102ReportHeroCopy">
            <span>MANAGEMENT REPORT CENTER</span>
            <h1>Laporan Kinerja Kebun</h1>
            <p>Ringkasan produksi, pendapatan, biaya, produktivitas dan aktivitas operasional dalam satu laporan manajemen.</p>
          </div>
          <div className="v102ReportControls">
            <ContextSelector estates={estates.map((e) => ({ id: e.id, name: e.name }))} selectedYear={context.selectedYear} activeEstateId={activeEstate.id} />
            <ReportActions filename={`SawitProNesia-${activeEstate.name}-${context.selectedYear}`} summary={exportSummary} monthly={exportMonthly} blocks={exportBlocks} />
          </div>
        </div>
        <div className="v102ReportHeroSummary">
          <div><small>KEBUN AKTIF</small><strong>{activeEstate.name}</strong><span>{estateBlocks.length} blok · {formatNumber(area)} Ha</span></div>
          <div><small>STATUS KINERJA</small><strong>{reportStatus}</strong><span>margin {pct(marginPct)}% · budget {pct(budgetUsedPct)}%</span></div>
          <div><small>TOP COST DRIVER</small><strong>{topCost?.type ?? "-"}</strong><span>{topCost ? formatCompactRupiah(topCost.cost) : "belum ada biaya"}</span></div>
          <div><small>BLOK PRODUKSI UTAMA</small><strong>{topBlock?.name ?? "-"}</strong><span>{topBlock ? `${formatNumber(topBlock.productionKg / 1000, 2)} ton` : "belum ada produksi"}</span></div>
        </div>
      </section>

      <section className="v102ReportKpis">
        <article><i><AppIcon name="harvest" /></i><div><small>PRODUKSI TBS</small><strong>{formatNumber(summary.productionKg / 1000, 2)} Ton</strong><span>{pct(productivity)} ton/Ha</span></div></article>
        <article><i><AppIcon name="budget" /></i><div><small>PENDAPATAN</small><strong>{formatCompactRupiah(summary.revenue)}</strong><span>harga rata-rata {formatRupiah(averagePrice)}/Kg</span></div></article>
        <article><i><AppIcon name="activity" /></i><div><small>BIAYA AKTUAL</small><strong>{formatCompactRupiah(summary.cost)}</strong><span>{formatRupiah(efficiency)}/Kg produksi</span></div></article>
        <article className={summary.margin >= 0 ? "v102Positive" : "v102Negative"}><i><AppIcon name="analytics" /></i><div><small>MARGIN OPERASIONAL</small><strong>{formatCompactRupiah(summary.margin)}</strong><span>{pct(marginPct)}% dari pendapatan</span></div></article>
        <article className={budgetVariance >= 0 ? "" : "v102Negative"}><i><AppIcon name="report" /></i><div><small>DEViasi ANGGARAN</small><strong>{formatCompactRupiah(budgetVariance)}</strong><span>{pct(budgetUsedPct)}% anggaran terpakai</span></div></article>
      </section>

      <section className="v102ExecutiveStrip">
        <div><span>Janjang</span><strong>{formatNumber(bunches, 0)}</strong><small>BJR {formatNumber(bjr, 2)} Kg</small></div>
        <div><span>Aktivitas</span><strong>{yearOperations.length}</strong><small>{activeMonths} bulan aktif</small></div>
        <div><span>Tenaga Kerja</span><strong>{formatNumber(totalHok, 1)} HOK</strong><small>aktual tercatat</small></div>
        <div><span>Pemupukan</span><strong>{formatNumber(fertilizerKg, 0)} Kg</strong><small>material aktual</small></div>
        <div><span>Biaya / Ha</span><strong>{formatCompactRupiah(area > 0 ? summary.cost / area : 0)}</strong><small>berdasarkan luas tercatat</small></div>
      </section>

      <section className="reportGrid v102ReportGrid">
        <article className="reportPanel v102ReportPanel">
          <header><div><span>TREN KEUANGAN</span><h2>Pendapatan vs Biaya {context.selectedYear}</h2><p>Perbandingan aktual bulanan untuk membaca momentum produksi dan cost.</p></div><b>{formatCompactRupiah(summary.margin)} margin YTD</b></header>
          <div className="financialChart">
            {monthly.map((item, index) => (
              <div className="financialMonth" key={MONTHS[index]}>
                <div className="financialBars">
                  <i className="revenueBar" style={{ height: `${Math.max(item.revenue ? 5 : 0, item.revenue / maxMonthly * 100)}%` }} />
                  <i className="costBar" style={{ height: `${Math.max(item.cost ? 5 : 0, item.cost / maxMonthly * 100)}%` }} />
                </div>
                <small>{MONTHS[index]}</small>
              </div>
            ))}
          </div>
          <div className="chartLegend"><span><i className="legendRevenue" />Pendapatan</span><span><i className="legendCost" />Biaya Aktual</span></div>
        </article>

        <article className="reportPanel v102ReportPanel v102ManagementSnapshot">
          <header><div><span>EXECUTIVE SNAPSHOT</span><h2>Indikator Utama</h2><p>Angka cepat untuk membaca efisiensi kebun.</p></div></header>
          <div className="v102SnapshotRows">
            <div><span>Harga TBS rata-rata</span><strong>{formatRupiah(averagePrice)}/Kg</strong></div>
            <div><span>Produktivitas</span><strong>{pct(productivity)} ton/Ha</strong></div>
            <div><span>Biaya produksi</span><strong>{formatRupiah(efficiency)}/Kg</strong></div>
            <div><span>Serapan anggaran</span><strong>{pct(budgetUsedPct)}%</strong></div>
            <div><span>Sisa / deviasi budget</span><strong className={budgetVariance < 0 ? "negativeValue" : "positiveValue"}>{formatCompactRupiah(budgetVariance)}</strong></div>
          </div>
        </article>
      </section>

      <section className="reportGrid reportLowerGrid v102ReportGrid">
        <article className="reportPanel v102ReportPanel">
          <header><div><span>COST STRUCTURE</span><h2>Komposisi Biaya Operasional</h2><p>Kontributor biaya aktual pada tahun berjalan.</p></div><b>{costs.length} kategori</b></header>
          <div className="costBreakdown">
            {costs.length ? costs.map((item) => {
              const ratio = summary.cost > 0 ? item.cost / summary.cost * 100 : 0;
              return <div className="costRow" key={item.type}><div><b>{item.type}</b><small>{pct(ratio)}% dari biaya</small></div><div className="costTrack"><i style={{ width: `${Math.min(100, ratio)}%` }} /></div><strong>{formatCompactRupiah(item.cost)}</strong></div>;
            }) : <div className="emptyRecent">Belum ada biaya aktual pada tahun ini.</div>}
          </div>
        </article>

        <article className="reportPanel v102ReportPanel">
          <header><div><span>MONTHLY RECONCILIATION</span><h2>Ringkasan Bulanan</h2><p>Produksi dan keuangan aktual dalam satu rekonsiliasi.</p></div></header>
          <div className="monthlyTableWrap"><table className="reportTable"><thead><tr><th>Bulan</th><th>Produksi</th><th>Pendapatan</th><th>Biaya</th><th>Margin</th></tr></thead><tbody>{monthly.map((item, index) => <tr key={MONTHS[index]}><td>{MONTHS[index]}</td><td>{formatNumber(item.productionKg, 0)} Kg</td><td>{formatCompactRupiah(item.revenue)}</td><td>{formatCompactRupiah(item.cost)}</td><td className={item.margin < 0 ? "negativeValue" : "positiveValue"}>{formatCompactRupiah(item.margin)}</td></tr>)}</tbody></table></div>
        </article>
      </section>

      <section className="reportPanel v102ReportPanel v102BlockPerformance">
        <header><div><span>BLOCK PERFORMANCE</span><h2>Kinerja Per Blok — {activeEstate.name}</h2><p>Bandingkan produksi, produktivitas, pendapatan dan margin setiap blok.</p></div><b>{blockRows.length} blok</b></header>
        <div className="monthlyTableWrap"><table className="reportTable blockReportTable"><thead><tr><th>Blok</th><th>Luas</th><th>Produksi</th><th>t/Ha</th><th>Pendapatan</th><th>Biaya</th><th>Margin</th></tr></thead><tbody>{blockRows.map((row) => <tr key={row.id}><td><b>{row.name}</b></td><td>{formatNumber(row.area)} Ha</td><td>{formatNumber(row.productionKg, 0)} Kg</td><td>{pct(row.productivity)}</td><td>{formatCompactRupiah(row.revenue)}</td><td>{formatCompactRupiah(row.cost)}</td><td className={row.margin < 0 ? "negativeValue" : "positiveValue"}>{formatCompactRupiah(row.margin)}</td></tr>)}</tbody></table></div>
      </section>

      <div className="reportFootnote v102ReportFootnote"><AppIcon name="report" /> <span><b>Basis laporan:</b> hanya data ACTUAL yang dihitung. PLAN belum menjadi aktual sampai memiliki realisasi; transaksi DIRECT tetap dihitung sebagai actual tanpa mengubah progress PLAN.</span></div>
    </div>
  );
}
