export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ensureManagementAccess } from "@/lib/auth/access";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { getEstateStage } from "@/lib/calculations/estate-stage";
import { formatNumber } from "@/lib/formatters";
import { createEstate } from "@/features/estates/actions";
import { AppIcon } from "@/components/layout/app-icons";

export default async function EstatesPage() {
  await ensureManagementAccess();
  const supabase = await createClient();
  const context = await getAppContext();
  const [estateResult, blockResult] = await Promise.all([
    supabase.from("estates").select("*").order("created_at"),
    supabase.from("blocks").select("*").order("name"),
  ]);
  if (estateResult.error) throw new Error(estateResult.error.message);
  if (blockResult.error) throw new Error(blockResult.error.message);
  const estates = estateResult.data ?? [];
  const blocks = blockResult.data ?? [];
  const totalArea = blocks.reduce((sum, block) => sum + Number(block.area ?? 0), 0);
  const totalTrees = blocks.reduce((sum, block) => sum + Number(block.trees ?? 0), 0);

  return <div className="masterPage v95EstatePage">
    <section className="v95PortfolioHero">
      <div className="v95PortfolioCopy">
        <span>PORTFOLIO KEBUN</span>
        <h1>Kebun & Blok</h1>
        <p>Pusat pengelolaan seluruh kebun, blok, populasi, dan fase tanaman dalam satu tampilan.</p>
      </div>
      <div className="v95PortfolioSummary">
        <article><small>TOTAL KEBUN</small><strong>{formatNumber(estates.length, 0)}</strong><span>portfolio aktif</span></article>
        <article><small>TOTAL BLOK</small><strong>{formatNumber(blocks.length, 0)}</strong><span>unit operasional</span></article>
        <article><small>TOTAL LUAS</small><strong>{formatNumber(totalArea)} <i>Ha</i></strong><span>luas blok tercatat</span></article>
        <article><small>POPULASI</small><strong>{formatNumber(totalTrees, 0)}</strong><span>pohon tercatat</span></article>
      </div>
    </section>

    <section className="v95EstateToolbar">
      <div><span>MASTER DATA</span><h2>Portfolio Kebun</h2><p>Pilih kebun untuk melihat blok dan detail operasional.</p></div>
      <details className="actionDetails v95AddEstate"><summary><AppIcon name="plus"/> Tambah Kebun</summary><form action={createEstate} className="masterForm compactForm"><label>Nama Kebun<input name="name" required /></label><label>Latitude<input name="latitude" type="number" step="any" /></label><label>Longitude<input name="longitude" type="number" step="any" /></label><button className="primaryButton" type="submit">Simpan Kebun</button></form></details>
    </section>

    <section className="v95EstateGrid">
      {estates.map((estate) => {
        const estateBlocks = blocks.filter((b) => b.estate_id === estate.id);
        const area = estateBlocks.reduce((s,b)=>s+Number(b.area ?? 0),0);
        const trees = estateBlocks.reduce((s,b)=>s+Number(b.trees ?? 0),0);
        const stage = getEstateStage(blocks, estate.id, context.selectedYear);
        const density = area > 0 ? trees / area : 0;
        const active = estate.id === context.activeEstateId;
        return <Link href={`/kebun/${estate.id}`} className={`v95EstateCard ${active ? "isActive" : ""}`} key={estate.id}>
          <div className="v95EstateCardTop">
            <div className="v95EstateIcon"><AppIcon name="estate"/></div>
            <div className="v95EstateBadges">{active && <b className="v95ActiveBadge">KEBUN AKTIF</b>}<b className={stage === "TBM" ? "stageBadge tbm" : "stageBadge productive"}>{stage}</b></div>
          </div>
          <div className="v95EstateTitle"><small>KEBUN</small><h2>{estate.name}</h2><p>{estateBlocks.length} blok terdaftar</p></div>
          <div className="v95EstateMetrics">
            <div><small>LUAS</small><strong>{formatNumber(area)} Ha</strong></div>
            <div><small>POHON</small><strong>{formatNumber(trees,0)}</strong></div>
            <div><small>KERAPATAN</small><strong>{density ? formatNumber(density,0) : "-"}</strong><span>pohon/Ha</span></div>
          </div>
          <div className="v95EstateCardFoot"><span>{stage === "TBM" ? "Fase belum menghasilkan" : "Fase menghasilkan"} · Tahun {context.selectedYear}</span><b>Buka kebun <span>→</span></b></div>
        </Link>;
      })}
      {!estates.length && <div className="emptyState v95EmptyEstate"><AppIcon name="estate"/><b>Belum ada kebun</b><span>Tambahkan kebun pertama untuk mulai menyusun blok dan data operasional.</span></div>}
    </section>
  </div>;
}
