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
import { formatCompactRupiah, formatNumber, formatRupiah } from "@/lib/formatters";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export default async function ReportPage() {
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
  const bunches = yearHarvests.reduce((sum, h) => sum + Number(h.bunches ?? 0), 0);
  const bjr = calculateBjr(summary.productionKg, bunches);
  const productivity = tonPerHa(summary.productionKg, area);
  const efficiency = costPerKg(summary.productionKg, summary.cost);
  const marginPct = summary.revenue > 0 ? summary.margin / summary.revenue * 100 : 0;
  const maxMonthly = Math.max(...monthly.flatMap((m) => [m.revenue, m.cost]), 1);

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

  return (
    <div className="reportPage">
      <section className="reportHeading">
        <div>
          <span>LAPORAN KEBUN</span>
          <h1>Ringkasan Kinerja</h1>
          <p>Angka laporan memakai calculation engine yang sama dengan Home. Periode mengikuti Kebun Aktif dan Tahun Global.</p>
        </div>
        <ContextSelector estates={estates.map((e) => ({ id: e.id, name: e.name }))} selectedYear={context.selectedYear} activeEstateId={activeEstate.id} />
      </section>

      <section className="reportHero">
        <div><span>OWNER REPORT</span><h2>{activeEstate.name}</h2><p>{context.selectedYear} · {estateBlocks.length} blok · {formatNumber(area)} Ha</p></div>
        <strong>{summary.margin >= 0 ? "POSITIF" : "NEGATIF"}</strong>
      </section>

      <section className="reportKpis">
        <article><small>Produksi</small><strong>{formatNumber(summary.productionKg)} Kg</strong><span>{productivity.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ton/Ha</span></article>
        <article><small>Pendapatan</small><strong>{formatCompactRupiah(summary.revenue)}</strong><span>{formatRupiah(summary.revenue)}</span></article>
        <article><small>Biaya Aktual</small><strong>{formatCompactRupiah(summary.cost)}</strong><span>{formatRupiah(efficiency)}/Kg</span></article>
        <article className={summary.margin >= 0 ? "reportPositive" : "reportNegative"}><small>Margin</small><strong>{formatCompactRupiah(summary.margin)}</strong><span>{marginPct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}%</span></article>
      </section>

      <section className="reportGrid">
        <article className="reportPanel">
          <header><div><span>TREN BULANAN</span><h2>Pendapatan vs Biaya</h2></div><b>{context.selectedYear}</b></header>
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

        <article className="reportPanel reportSnapshot">
          <header><div><span>INDIKATOR PRODUKSI</span><h2>Snapshot Tahunan</h2></div></header>
          <div className="reportSnapshotGrid">
            <div><span>Janjang</span><strong>{formatNumber(bunches, 0)}</strong></div>
            <div><span>BJR</span><strong>{formatNumber(bjr)} Kg</strong></div>
            <div><span>Produktivitas</span><strong>{productivity.toLocaleString("id-ID", { maximumFractionDigits: 2 })} t/Ha</strong></div>
            <div><span>Biaya / Kg</span><strong>{formatRupiah(efficiency)}</strong></div>
          </div>
        </article>
      </section>

      <section className="reportGrid reportLowerGrid">
        <article className="reportPanel">
          <header><div><span>BIAYA AKTUAL</span><h2>Komposisi Operasional</h2></div><b>{costs.length} kategori</b></header>
          <div className="costBreakdown">
            {costs.length ? costs.map((item) => {
              const pct = summary.cost > 0 ? item.cost / summary.cost * 100 : 0;
              return <div className="costRow" key={item.type}><div><b>{item.type}</b><small>{pct.toLocaleString("id-ID", { maximumFractionDigits: 1 })}% dari biaya</small></div><div className="costTrack"><i style={{ width: `${Math.min(100, pct)}%` }} /></div><strong>{formatCompactRupiah(item.cost)}</strong></div>;
            }) : <div className="emptyRecent">Belum ada biaya aktual pada tahun ini.</div>}
          </div>
        </article>

        <article className="reportPanel">
          <header><div><span>REKONSILIASI</span><h2>Ringkasan Bulanan</h2></div></header>
          <div className="monthlyTableWrap"><table className="reportTable"><thead><tr><th>Bulan</th><th>Produksi</th><th>Pendapatan</th><th>Biaya</th><th>Margin</th></tr></thead><tbody>{monthly.map((item, index) => <tr key={MONTHS[index]}><td>{MONTHS[index]}</td><td>{formatNumber(item.productionKg, 0)} Kg</td><td>{formatCompactRupiah(item.revenue)}</td><td>{formatCompactRupiah(item.cost)}</td><td className={item.margin < 0 ? "negativeValue" : "positiveValue"}>{formatCompactRupiah(item.margin)}</td></tr>)}</tbody></table></div>
        </article>
      </section>

      <section className="reportPanel">
        <header><div><span>PER BLOK</span><h2>Kinerja Blok {activeEstate.name}</h2></div><b>{blockRows.length} blok</b></header>
        <div className="monthlyTableWrap"><table className="reportTable blockReportTable"><thead><tr><th>Blok</th><th>Luas</th><th>Produksi</th><th>t/Ha</th><th>Pendapatan</th><th>Biaya</th><th>Margin</th></tr></thead><tbody>{blockRows.map((row) => <tr key={row.id}><td><b>{row.name}</b></td><td>{formatNumber(row.area)} Ha</td><td>{formatNumber(row.productionKg, 0)} Kg</td><td>{row.productivity.toLocaleString("id-ID", { maximumFractionDigits: 2 })}</td><td>{formatCompactRupiah(row.revenue)}</td><td>{formatCompactRupiah(row.cost)}</td><td className={row.margin < 0 ? "negativeValue" : "positiveValue"}>{formatCompactRupiah(row.margin)}</td></tr>)}</tbody></table></div>
      </section>

      <div className="reportFootnote">Laporan ini read-only. PLAN tidak dihitung sebagai Actual sebelum memiliki transaksi realisasi; DIRECT tetap terisolasi dari progress PLAN.</div>
    </div>
  );
}
