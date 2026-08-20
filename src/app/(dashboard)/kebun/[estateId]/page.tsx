export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { getEstateStage } from "@/lib/calculations/estate-stage";
import { formatNumber } from "@/lib/formatters";
import { createBlock, updateEstate } from "@/features/estates/actions";

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
  const updateEstateAction = updateEstate.bind(null, estate.id);
  const createBlockAction = createBlock.bind(null, estate.id);

  return <div className="masterPage">{query.status === "updated" ? <div className="activityNotice">Perubahan kebun berhasil disimpan.</div> : null}
    <Link href="/kebun" className="backLink">← Semua Kebun</Link>
    <section className="estateDetailHero"><div><span>DETAIL KEBUN</span><h1>{estate.name}</h1><p>{blocks.length} blok · {formatNumber(area)} Ha · {formatNumber(trees,0)} pohon</p></div><b className={stage === "TBM" ? "stageBadge tbm" : "stageBadge productive"}>{stage} {context.selectedYear}</b></section>
    <section className="detailToolbar">
      <details className="actionDetails"><summary>✎ Edit Kebun</summary><form action={updateEstateAction} className="masterForm"><label>Nama Kebun<input name="name" defaultValue={estate.name} required /></label><label>Latitude<input name="latitude" type="number" step="any" defaultValue={estate.latitude ?? ""}/></label><label>Longitude<input name="longitude" type="number" step="any" defaultValue={estate.longitude ?? ""}/></label><button className="primaryButton" type="submit">Simpan Perubahan</button></form></details>
      <details className="actionDetails primaryDetails"><summary>＋ Tambah Blok</summary><form action={createBlockAction} className="masterForm blockForm"><label>Nama Blok<input name="name" required /></label><label>Luas (Ha)<input name="area" type="number" min="0" step="0.01" required /></label><label>Jumlah Pohon<input name="trees" type="number" min="0" step="1" required /></label><label>Tahun Tanam<input name="planting_year" type="number" min="1980" max="2100" /></label><label>Tanggal Tanam<input name="planting_date" type="date" /></label><label>Varietas<input name="variety" placeholder="Contoh: PPKS Simalungun" /></label><label>Jenis Tanah<select name="soil_type" defaultValue="mineral"><option value="mineral">Mineral</option><option value="gambut">Gambut</option><option value="lainnya">Lainnya</option></select></label><label>Pola Pupuk<select name="fertilizer_pattern" defaultValue="tunggal"><option value="tunggal">Tunggal</option><option value="majemuk">Majemuk</option></select></label><button className="primaryButton" type="submit">Simpan Blok</button></form></details>
    </section>
    <section className="blockSection"><div className="sectionTitle"><div><span>MASTER BLOK</span><h2>Daftar Blok</h2></div><b>{blocks.length} blok</b></div><div className="blockCards">
      {blocks.map((block)=>{ const age = block.planting_year ? Math.max(0, context.selectedYear-block.planting_year) : null; return <Link className="blockCard" href={`/kebun/${estate.id}/blok/${block.id}`} key={block.id}><div className="blockCardHead"><span>▦</span><b>{block.status}</b></div><h3>{block.name}</h3><div className="blockMetrics"><div><small>Luas</small><strong>{formatNumber(Number(block.area))} Ha</strong></div><div><small>Pohon</small><strong>{formatNumber(Number(block.trees),0)}</strong></div><div><small>Tanam</small><strong>{block.planting_year ?? "-"}</strong></div><div><small>Umur</small><strong>{age === null ? "-" : `${age} th`}</strong></div></div><p>{block.variety || "Varietas belum diisi"} · {block.soil_type || "Jenis tanah belum diisi"}</p><span className="openLink">Detail blok →</span></Link>})}
      {!blocks.length && <div className="emptyState">Belum ada blok. Gunakan tombol “Tambah Blok”.</div>}
    </div></section>
  </div>;
}
