export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { formatNumber } from "@/lib/formatters";
import { deleteBlock, updateBlock } from "@/features/estates/actions";

export default async function BlockDetail({ params }: { params: Promise<{ estateId: string; blockId: string }> }) {
  const { estateId, blockId } = await params; const supabase = await createClient(); const context = await getAppContext();
  const [estateResult, blockResult] = await Promise.all([supabase.from("estates").select("*").eq("id",estateId).single(), supabase.from("blocks").select("*").eq("id",blockId).eq("estate_id",estateId).single()]);
  if (estateResult.error || blockResult.error || !estateResult.data || !blockResult.data) notFound();
  const estate=estateResult.data, block=blockResult.data;
  const ageYears = block.planting_year ? Math.max(0, context.selectedYear-block.planting_year) : null;
  const stage = ageYears !== null && ageYears >= 3 ? "Produktif" : "TBM";
  const updateAction = updateBlock.bind(null, estateId, blockId); const deleteAction = deleteBlock.bind(null, estateId, blockId);
  return <div className="masterPage"><Link href={`/kebun/${estateId}`} className="backLink">← {estate.name}</Link>
    <section className="blockDetailHero"><div><span>DETAIL BLOK</span><h1>{block.name}</h1><p>{formatNumber(Number(block.area))} Ha · {formatNumber(Number(block.trees),0)} pohon · {block.variety || "Varietas belum diisi"}</p></div><b className={stage === "TBM" ? "stageBadge tbm" : "stageBadge productive"}>{stage}</b></section>
    <section className="blockInfoGrid"><article><small>TAHUN TANAM</small><strong>{block.planting_year ?? "-"}</strong><span>{block.planting_date || "Tanggal belum diisi"}</span></article><article><small>UMUR DI {context.selectedYear}</small><strong>{ageYears === null ? "-" : `${ageYears} tahun`}</strong><span>Status mengikuti Tahun Global</span></article><article><small>JENIS TANAH</small><strong>{block.soil_type || "-"}</strong><span>Pola pupuk: {block.fertilizer_pattern || "-"}</span></article><article><small>STATUS MASTER</small><strong>{block.status}</strong><span>Tidak difilter Tahun Global</span></article></section>
    <section className="editPanel"><div className="sectionTitle"><div><span>MASTER DATA</span><h2>Edit Blok</h2></div></div><form action={updateAction} className="masterForm blockForm"><label>Nama Blok<input name="name" defaultValue={block.name} required /></label><label>Luas (Ha)<input name="area" type="number" min="0" step="0.01" defaultValue={block.area} required /></label><label>Jumlah Pohon<input name="trees" type="number" min="0" step="1" defaultValue={block.trees} required /></label><label>Tahun Tanam<input name="planting_year" type="number" min="1980" max="2100" defaultValue={block.planting_year ?? ""}/></label><label>Tanggal Tanam<input name="planting_date" type="date" defaultValue={block.planting_date ?? ""}/></label><label>Varietas<input name="variety" defaultValue={block.variety ?? ""}/></label><label>Jenis Tanah<select name="soil_type" defaultValue={block.soil_type ?? "mineral"}><option value="mineral">Mineral</option><option value="gambut">Gambut</option><option value="lainnya">Lainnya</option></select></label><label>Pola Pupuk<select name="fertilizer_pattern" defaultValue={block.fertilizer_pattern ?? "tunggal"}><option value="tunggal">Tunggal</option><option value="majemuk">Majemuk</option></select></label><label>Status<select name="status" defaultValue={block.status}><option value="Aktif">Aktif</option><option value="Nonaktif">Nonaktif</option></select></label><div className="formActions"><button className="primaryButton">Simpan Perubahan</button></div></form></section>
    <section className="dangerPanel"><div><b>Hapus blok</b><p>Hanya dapat dilakukan bila tidak ditolak oleh relasi/constraint data transaksi di Supabase.</p></div><form action={deleteAction}><button className="dangerButton">Hapus Blok</button></form></section>
  </div>;
}
