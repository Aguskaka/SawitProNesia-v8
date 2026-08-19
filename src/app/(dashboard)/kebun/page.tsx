export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { getEstateStage } from "@/lib/calculations/estate-stage";
import { formatNumber } from "@/lib/formatters";
import { createEstate } from "@/features/estates/actions";

export default async function EstatesPage() {
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

  return <div className="masterPage">
    <section className="masterHeading">
      <div><span>MASTER DATA</span><h1>Kebun & Blok</h1><p>Kelola struktur kebun. Tahun Global hanya menentukan status umur tanaman, bukan memfilter master data.</p></div>
      <details className="actionDetails"><summary>＋ Tambah Kebun</summary><form action={createEstate} className="masterForm compactForm"><label>Nama Kebun<input name="name" required /></label><label>Latitude<input name="latitude" type="number" step="any" /></label><label>Longitude<input name="longitude" type="number" step="any" /></label><button className="primaryButton">Simpan Kebun</button></form></details>
    </section>
    <section className="estateCards">
      {estates.map((estate) => {
        const estateBlocks = blocks.filter((b) => b.estate_id === estate.id);
        const area = estateBlocks.reduce((s,b)=>s+Number(b.area ?? 0),0);
        const trees = estateBlocks.reduce((s,b)=>s+Number(b.trees ?? 0),0);
        const stage = getEstateStage(blocks, estate.id, context.selectedYear);
        return <Link href={`/kebun/${estate.id}`} className={`estateMasterCard ${estate.id === context.activeEstateId ? "activeEstateCard" : ""}`} key={estate.id}>
          <div className="estateCardTop"><span>🌴</span><b className={stage === "TBM" ? "stageBadge tbm" : "stageBadge productive"}>{stage}</b></div>
          <h2>{estate.name}</h2><p>{estateBlocks.length} blok</p>
          <div className="estateStats"><div><small>Luas Blok</small><strong>{formatNumber(area)} Ha</strong></div><div><small>Total Pohon</small><strong>{formatNumber(trees,0)}</strong></div></div>
          <span className="openLink">Buka kebun →</span>
        </Link>;
      })}
      {!estates.length && <div className="emptyState">Belum ada kebun.</div>}
    </section>
  </div>;
}
