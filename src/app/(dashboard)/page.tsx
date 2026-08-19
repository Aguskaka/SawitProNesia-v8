import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { annualSummary } from "@/lib/calculations/annual";
import { getEstateStage } from "@/lib/calculations/estate-stage";
import { formatCompactRupiah, formatNumber, formatRupiah } from "@/lib/formatters";

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
        <p>Connection ke Supabase berhasil, tetapi RLS tidak mengembalikan estate untuk user ini.</p>
      </section>
    );
  }

  const summary = annualSummary(harvests, operations, activeEstate.id, context.selectedYear);
  const estateBlocks = blocks.filter((block) => block.estate_id === activeEstate.id);
  const area = estateBlocks.reduce((sum, block) => sum + Number(block.area ?? 0), 0);
  const trees = estateBlocks.reduce((sum, block) => sum + Number(block.trees ?? 0), 0);
  const stage = getEstateStage(blocks, activeEstate.id, context.selectedYear);

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">FOUNDATION CONNECTION TEST</p>
          <h1>{activeEstate.name}</h1>
          <p>{context.selectedYear} · {stage} · data langsung dari Supabase existing</p>
        </div>
        <span className={`stageBadge ${stage === "TBM" ? "tbm" : "productive"}`}>{stage}</span>
      </section>

      <section className="kpiGrid">
        <article>
          <span>Luas dari Blok</span>
          <strong>{formatNumber(area)} Ha</strong>
          <small>{estateBlocks.length} blok</small>
        </article>
        <article>
          <span>Total Pohon</span>
          <strong>{formatNumber(trees, 0)}</strong>
          <small>Master data, tidak difilter tahun</small>
        </article>
        <article>
          <span>Produksi {context.selectedYear}</span>
          <strong>{formatNumber(summary.productionKg)} Kg</strong>
          <small>SUM harvests.weight_kg</small>
        </article>
        <article>
          <span>Pendapatan {context.selectedYear}</span>
          <strong>{formatCompactRupiah(summary.revenue)}</strong>
          <small>{formatRupiah(summary.revenue)}</small>
        </article>
        <article>
          <span>Biaya Aktual {context.selectedYear}</span>
          <strong>{formatCompactRupiah(summary.cost)}</strong>
          <small>SUM operations.total_cost</small>
        </article>
        <article>
          <span>Margin {context.selectedYear}</span>
          <strong>{formatCompactRupiah(summary.margin)}</strong>
          <small>{formatRupiah(summary.margin)}</small>
        </article>
      </section>

      <section className="foundationCard">
        <div>
          <p className="eyebrow">PHASE 1</p>
          <h2>Foundation aktif</h2>
        </div>
        <ul>
          <li>Next.js 16 + TypeScript strict</li>
          <li>Supabase SSR cookie auth</li>
          <li>RLS existing tetap berlaku</li>
          <li>Tahun Global dan Kebun Aktif tersimpan sebagai context cookie</li>
          <li>Perhitungan produksi, pendapatan, biaya, margin dipusatkan di calculation layer</li>
        </ul>
        <p className="notice">
          Modul Kebun, Rencana, Fertilizer, Kalender, Laporan dan Analytics sengaja belum dimigrasikan.
          v8.0.0 hanya menguji fondasi sebelum business logic kompleks dipindahkan.
        </p>
      </section>
    </>
  );
}
