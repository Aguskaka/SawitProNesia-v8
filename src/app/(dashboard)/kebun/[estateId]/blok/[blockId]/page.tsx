export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { formatNumber } from "@/lib/formatters";
import { deleteBlock, updateBlock } from "@/features/estates/actions";
import { AppIcon } from "@/components/layout/app-icons";

export default async function BlockDetail({ params, searchParams }: { params: Promise<{ estateId: string; blockId: string }>; searchParams: Promise<{ status?: string }> }) {
  const { estateId, blockId } = await params; const query = await searchParams; const supabase = await createClient(); const context = await getAppContext();
  const [estateResult, blockResult] = await Promise.all([supabase.from("estates").select("*").eq("id",estateId).single(), supabase.from("blocks").select("*").eq("id",blockId).eq("estate_id",estateId).single()]);
  if (estateResult.error || blockResult.error || !estateResult.data || !blockResult.data) notFound();
  const estate=estateResult.data, block=blockResult.data;
  const ageYears = block.planting_year ? Math.max(0, context.selectedYear-block.planting_year) : null;
  const stage = ageYears !== null && ageYears >= 3 ? "Produktif" : "TBM";
  const density = Number(block.area) > 0 ? Number(block.trees)/Number(block.area) : 0;
  const updateAction = updateBlock.bind(null, estateId, blockId); const deleteAction = deleteBlock.bind(null, estateId, blockId);
  return <div className="masterPage v95BlockDetailPage"><Link href={`/kebun/${estateId}`} className="backLink v95BackLink">← {estate.name}</Link>{query.status === "updated" ? <div className="activityNotice">Perubahan blok berhasil disimpan.</div> : null}
    <section className="v95BlockHero"><div><span>DETAIL BLOK · {estate.name}</span><h1>{block.name}</h1><p>{block.variety || "Varietas belum diisi"} · {block.soil_type || "Jenis tanah belum diisi"}</p><div className="v95HeroMeta"><b className={stage === "TBM" ? "stageBadge tbm" : "stageBadge productive"}>{stage}</b><span>Status master: {block.status}</span></div></div><div className="v95BlockHeroMark"><b>{formatNumber(Number(block.area))}</b><small>HEKTARE</small></div></section>
    <section className="v95BlockKpis">
      <article><i><AppIcon name="estate"/></i><small>LUAS BLOK</small><strong>{formatNumber(Number(block.area))} Ha</strong><span>area tercatat</span></article>
      <article><i><AppIcon name="activity"/></i><small>POPULASI</small><strong>{formatNumber(Number(block.trees),0)}</strong><span>{density ? `${formatNumber(density,0)} pohon/Ha` : "kepadatan -"}</span></article>
      <article><i><AppIcon name="calendar"/></i><small>TAHUN TANAM</small><strong>{block.planting_year ?? "-"}</strong><span>{block.planting_date || "tanggal belum diisi"}</span></article>
      <article><i><AppIcon name="plan"/></i><small>UMUR {context.selectedYear}</small><strong>{ageYears === null ? "-" : `${ageYears} th`}</strong><span>mengikuti Tahun Global</span></article>
    </section>
    <section className="v95BlockProfile">
      <div className="v95ProfileHeader"><div><span>PROFIL AGRONOMI</span><h2>Informasi Blok</h2></div><b>{block.status}</b></div>
      <div className="v95ProfileGrid"><div><small>VARIETAS</small><strong>{block.variety || "Belum diisi"}</strong></div><div><small>JENIS TANAH</small><strong>{block.soil_type || "Belum diisi"}</strong></div><div><small>POLA PUPUK</small><strong>{block.fertilizer_pattern || "Belum diisi"}</strong></div><div><small>FASE TANAMAN</small><strong>{stage}</strong></div></div>
    </section>
    <section className="editPanel v95EditPanel"><div className="sectionTitle v95SectionTitle"><div><span>MASTER DATA</span><h2>Edit Blok</h2><p>Perubahan di bawah memperbarui data master blok.</p></div></div><form action={updateAction} className="masterForm blockForm"><label>Nama Blok<input name="name" defaultValue={block.name} required /></label><label>Luas (Ha)<input name="area" type="number" min="0" step="0.01" defaultValue={block.area} required /></label><label>Jumlah Pohon<input name="trees" type="number" min="0" step="1" defaultValue={block.trees} required /></label><label>Tahun Tanam<input name="planting_year" type="number" min="1980" max="2100" defaultValue={block.planting_year ?? ""}/></label><label>Tanggal Tanam<input name="planting_date" type="date" defaultValue={block.planting_date ?? ""}/></label><label>Varietas<input name="variety" defaultValue={block.variety ?? ""}/></label><label>Jenis Tanah<select name="soil_type" defaultValue={block.soil_type ?? "mineral"}><option value="mineral">Mineral</option><option value="gambut">Gambut</option><option value="lainnya">Lainnya</option></select></label><label>Pola Pupuk<select name="fertilizer_pattern" defaultValue={block.fertilizer_pattern ?? "tunggal"}><option value="tunggal">Tunggal</option><option value="majemuk">Majemuk</option></select></label><label>Status<select name="status" defaultValue={block.status}><option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif</option></select></label><div className="formActions"><button className="primaryButton" type="submit">Simpan Perubahan</button></div></form></section>
    <section className="dangerPanel v95DangerPanel"><div><b>Hapus blok</b><p>Gunakan hanya jika blok memang tidak lagi diperlukan. Supabase dapat menolak penghapusan bila masih memiliki relasi transaksi.</p></div><form action={deleteAction}><button className="dangerButton" type="submit">Hapus Blok</button></form></section>
  </div>;
}
