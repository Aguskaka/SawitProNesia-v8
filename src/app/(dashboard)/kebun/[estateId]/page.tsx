export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { getEstateStage } from "@/lib/calculations/estate-stage";
import { formatNumber } from "@/lib/formatters";
import { createBlock, updateEstate } from "@/features/estates/actions";
import { AppIcon } from "@/components/layout/app-icons";

export default async function EstateDetail({ params, searchParams }: { params: Promise<{ estateId: string }>; searchParams: Promise<{ status?: string }> }) {
  const { estateId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const context = await getAppContext();
  const [estateResult, blockResult] = await Promise.all([
    supabase.from("estates").select("*").eq("id", estateId).single(),
    supabase.from("blocks").select("*").eq("estate_id", estateId).order("name"),
  ]);
  if (estateResult.error || !estateResult.data) notFound();
  if (blockResult.error) throw new Error(blockResult.error.message);
  const estate = estateResult.data; const blocks = blockResult.data ?? [];
  const area = blocks.reduce((s,b)=>s+Number(b.area ?? 0),0); const trees = blocks.reduce((s,b)=>s+Number(b.trees ?? 0),0);
  const stage = getEstateStage(blocks, estate.id, context.selectedYear);
  const density = area > 0 ? trees / area : 0;
  const plantedBlocks = blocks.filter((block) => block.planting_year).length;
  const updateEstateAction = updateEstate.bind(null, estate.id);
  const createBlockAction = createBlock.bind(null, estate.id);

  return <div className="masterPage v95EstateDetailPage">
    {query.status === "updated" ? <div className="activityNotice">Perubahan kebun berhasil disimpan.</div> : null}
    <Link href="/kebun" className="backLink v95BackLink">← Portfolio Kebun</Link>

    <section className="v95EstateHero">
      <div className="v95EstateHeroMain"><span>DETAIL KEBUN</span><h1>{estate.name}</h1><p>{blocks.length} blok · {formatNumber(area)} Ha · {formatNumber(trees,0)} pohon</p><div className="v95HeroMeta"><b className={stage === "TBM" ? "stageBadge tbm" : "stageBadge productive"}>{stage} {context.selectedYear}</b>{estate.latitude && estate.longitude ? <span>Koordinat tersimpan</span> : <span>Koordinat belum dilengkapi</span>}</div></div>
      <div className="v95EstateMonogram"><AppIcon name="estate"/><small>ESTATE</small></div>
    </section>

    <section className="v95EstateKpis">
      <article><i><AppIcon name="estate"/></i><div><small>TOTAL LUAS</small><strong>{formatNumber(area)} Ha</strong><span>akumulasi seluruh blok</span></div></article>
      <article><i><AppIcon name="activity"/></i><div><small>POPULASI</small><strong>{formatNumber(trees,0)}</strong><span>{density ? `${formatNumber(density,0)} pohon/Ha` : "kepadatan belum tersedia"}</span></div></article>
      <article><i><AppIcon name="plan"/></i><div><small>BLOK</small><strong>{formatNumber(blocks.length,0)}</strong><span>{plantedBlocks} dengan tahun tanam</span></div></article>
      <article><i><AppIcon name="calendar"/></i><div><small>TAHUN GLOBAL</small><strong>{context.selectedYear}</strong><span>basis status umur tanaman</span></div></article>
    </section>

    <section className="detailToolbar v95DetailToolbar">
      <div className="v95ToolbarIntro"><span>PENGELOLAAN</span><b>Master kebun & blok</b><small>Perbarui identitas kebun atau tambahkan blok baru.</small></div>
      <div className="v95ToolbarActions">
        <details className="actionDetails"><summary>✎ Edit Kebun</summary><form action={updateEstateAction} className="masterForm"><label>Nama Kebun<input name="name" defaultValue={estate.name} required /></label><label>Latitude<input name="latitude" type="number" step="any" defaultValue={estate.latitude ?? ""}/></label><label>Longitude<input name="longitude" type="number" step="any" defaultValue={estate.longitude ?? ""}/></label><button className="primaryButton" type="submit">Simpan Perubahan</button></form></details>
        <details className="actionDetails primaryDetails"><summary><AppIcon name="plus"/> Tambah Blok</summary><form action={createBlockAction} className="masterForm blockForm"><label>Nama Blok<input name="name" required /></label><label>Luas (Ha)<input name="area" type="number" min="0" step="0.01" required /></label><label>Jumlah Pohon<input name="trees" type="number" min="0" step="1" required /></label><label>Tahun Tanam<input name="planting_year" type="number" min="1980" max="2100" /></label><label>Tanggal Tanam<input name="planting_date" type="date" /></label><label>Varietas<input name="variety" placeholder="Contoh: PPKS Simalungun" /></label><label>Jenis Tanah<select name="soil_type" defaultValue="mineral"><option value="mineral">Mineral</option><option value="gambut">Gambut</option><option value="lainnya">Lainnya</option></select></label><label>Pola Pupuk<select name="fertilizer_pattern" defaultValue="tunggal"><option value="tunggal">Tunggal</option><option value="majemuk">Majemuk</option></select></label><button className="primaryButton" type="submit">Simpan Blok</button></form></details>
      </div>
    </section>

    <section className="blockSection v95BlockSection"><div className="sectionTitle v95SectionTitle"><div><span>MASTER BLOK</span><h2>Daftar Blok</h2><p>Ringkasan struktur tanaman per blok pada {context.selectedYear}.</p></div><b>{blocks.length} blok</b></div><div className="v95BlockGrid">
      {blocks.map((block)=>{ const age = block.planting_year ? Math.max(0, context.selectedYear-block.planting_year) : null; const blockStage = age !== null && age >= 3 ? "TM" : "TBM"; const blockDensity = Number(block.area) > 0 ? Number(block.trees)/Number(block.area) : 0; return <Link className="v95BlockCard" href={`/kebun/${estate.id}/blok/${block.id}`} key={block.id}>
        <div className="v95BlockHead"><div className="v95BlockIcon">▦</div><div><b>{block.status}</b><span className={blockStage === "TBM" ? "v95MiniStage tbm" : "v95MiniStage tm"}>{blockStage}</span></div></div>
        <small>BLOK</small><h3>{block.name}</h3><p>{block.variety || "Varietas belum diisi"}</p>
        <div className="v95BlockMetrics"><div><small>Luas</small><strong>{formatNumber(Number(block.area))} Ha</strong></div><div><small>Pohon</small><strong>{formatNumber(Number(block.trees),0)}</strong></div><div><small>Umur</small><strong>{age === null ? "-" : `${age} th`}</strong></div></div>
        <div className="v95BlockMeta"><span>{block.soil_type || "Tanah -"}</span><span>{blockDensity ? `${formatNumber(blockDensity,0)} pohon/Ha` : "Kerapatan -"}</span></div>
        <div className="v95BlockFoot"><span>Tanam {block.planting_year ?? "-"}</span><b>Detail blok →</b></div>
      </Link>})}
      {!blocks.length && <div className="emptyState v95EmptyEstate"><AppIcon name="estate"/><b>Belum ada blok</b><span>Gunakan tombol “Tambah Blok” untuk membangun struktur kebun ini.</span></div>}
    </div></section>
  </div>;
}
