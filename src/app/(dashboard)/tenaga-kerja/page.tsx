export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ensureManagementAccess } from "@/lib/auth/access";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { ContextSelector } from "@/components/layout/context-selector";
import { AppIcon } from "@/components/layout/app-icons";
import { createLaborActual } from "@/features/workforce/actions";
import { formatCompactRupiah, formatNumber } from "@/lib/formatters";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));
}

const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

export default async function WorkforcePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await ensureManagementAccess();
  const params = await searchParams;
  const supabase = await createClient();
  const context = await getAppContext();

  const [estateResult, blockResult, operationResult] = await Promise.all([
    supabase.from("estates").select("id,name").order("created_at"),
    supabase.from("blocks").select("id,estate_id,name,area,trees").order("name"),
    supabase.from("operations").select("*").order("op_date", { ascending: false }),
  ]);
  for (const result of [estateResult, blockResult, operationResult]) if (result.error) throw new Error(result.error.message);

  const estates = estateResult.data ?? [];
  const blocks = blockResult.data ?? [];
  const operations = operationResult.data ?? [];
  const estateId = context.activeEstateId && estates.some((estate) => estate.id === context.activeEstateId)
    ? context.activeEstateId
    : estates[0]?.id ?? null;
  const estate = estates.find((item) => item.id === estateId) ?? null;
  const estateBlocks = blocks.filter((block) => block.estate_id === estateId);
  const yearStart = `${context.selectedYear}-01-01`;
  const yearEnd = `${context.selectedYear}-12-31`;
  const rows = operations.filter((operation) =>
    operation.estate_id === estateId &&
    operation.op_date >= yearStart && operation.op_date <= yearEnd &&
    (Number(operation.labor_days ?? 0) > 0 || operation.type === "Tenaga Kerja")
  );

  const totalHok = rows.reduce((sum, operation) => sum + Number(operation.labor_days ?? 0), 0);
  const laborCost = rows.reduce((sum, operation) => sum + Number(operation.labor_days ?? 0) * Number(operation.labor_rate ?? 0), 0);
  const averageRate = totalHok > 0 ? laborCost / totalHok : 0;
  const directRows = rows.filter((operation) => operation.type === "Tenaga Kerja" && operation.source === "DIRECT");

  const workerMap = new Map<string, { hok: number; cost: number; count: number }>();
  let unassignedHok = 0;
  for (const operation of rows) {
    const name = String(operation.worker ?? "").trim();
    if (!name) {
      unassignedHok += Number(operation.labor_days ?? 0);
      continue;
    }
    const value = workerMap.get(name) ?? { hok: 0, cost: 0, count: 0 };
    value.hok += Number(operation.labor_days ?? 0);
    value.cost += Number(operation.labor_days ?? 0) * Number(operation.labor_rate ?? 0);
    value.count += 1;
    workerMap.set(name, value);
  }
  const workerRows = [...workerMap.entries()].sort((a, b) => b[1].hok - a[1].hok);
  const topWorker = workerRows[0] ?? null;

  const blockMap = new Map<string, { name: string; hok: number; cost: number }>();
  for (const operation of rows) {
    const block = estateBlocks.find((item) => item.id === operation.block_id);
    const key = block?.id ?? "general";
    const value = blockMap.get(key) ?? { name: block?.name ?? "Umum Kebun", hok: 0, cost: 0 };
    value.hok += Number(operation.labor_days ?? 0);
    value.cost += Number(operation.labor_days ?? 0) * Number(operation.labor_rate ?? 0);
    blockMap.set(key, value);
  }
  const blockRows = [...blockMap.values()].sort((a, b) => b.hok - a.hok);
  const maxBlockHok = Math.max(1, ...blockRows.map((item) => item.hok));

  const monthly = Array.from({ length: 12 }, (_, month) => ({ month, hok: 0, cost: 0 }));
  for (const operation of rows) {
    const month = Number(String(operation.op_date).slice(5, 7)) - 1;
    if (month >= 0 && month < 12) {
      monthly[month].hok += Number(operation.labor_days ?? 0);
      monthly[month].cost += Number(operation.labor_days ?? 0) * Number(operation.labor_rate ?? 0);
    }
  }
  const maxMonthlyHok = Math.max(1, ...monthly.map((item) => item.hok));
  const activeMonths = monthly.filter((item) => item.hok > 0).length;
  const latest = rows[0] ?? null;
  const today = new Date();
  const currentDate = today.getFullYear() === context.selectedYear
    ? today.toISOString().slice(0, 10)
    : `${context.selectedYear}-01-01`;

  return (
    <div className="v99WorkforcePage">
      <section className="v99WorkforceHero">
        <div className="v99WorkforceHeroTop">
          <div>
            <span>WORKFORCE & HOK CONTROL CENTER</span>
            <h1>Tenaga Kerja & HOK</h1>
            <p>Pantau penggunaan HOK, biaya tenaga kerja, pelaksana dan distribusi pekerjaan per blok dalam satu layar.</p>
          </div>
          <ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={estateId} />
        </div>
        <div className="v99HeroSignals">
          <article><small>KEBUN AKTIF</small><strong>{estate?.name ?? "-"}</strong><span>{estateBlocks.length} blok operasional</span></article>
          <article><small>TOTAL HOK</small><strong>{formatNumber(totalHok)}</strong><span>{rows.length} aktivitas ber-HOK</span></article>
          <article><small>PELAKSANA UTAMA</small><strong>{topWorker?.[0] ?? "-"}</strong><span>{topWorker ? `${formatNumber(topWorker[1].hok)} HOK` : "Belum ada nama pelaksana"}</span></article>
          <article><small>AKTIVITAS TERAKHIR</small><strong>{latest ? idDate(latest.op_date) : "-"}</strong><span>{latest?.description ?? "Belum ada pencatatan"}</span></article>
        </div>
      </section>

      {params.status ? <div className="activityNotice v99Notice">Tenaga kerja berhasil disimpan dan HOK telah diperbarui.</div> : null}

      <section className="v99WorkforceKpis">
        <article><i><AppIcon name="workforce" /></i><div><small>Total HOK</small><strong>{formatNumber(totalHok)}</strong><span>{activeMonths} bulan memiliki aktivitas</span></div></article>
        <article><i><AppIcon name="budget" /></i><div><small>Biaya Tenaga Kerja</small><strong>{formatCompactRupiah(laborCost)}</strong><span>Aktual {context.selectedYear}</span></div></article>
        <article><i><AppIcon name="user" /></i><div><small>Pelaksana Tercatat</small><strong>{workerRows.length}</strong><span>{unassignedHok > 0 ? `${formatNumber(unassignedHok)} HOK belum diberi nama` : "Semua HOK teridentifikasi"}</span></div></article>
        <article><i><AppIcon name="analytics" /></i><div><small>Rata-rata / HOK</small><strong>{formatCompactRupiah(averageRate)}</strong><span>Biaya tenaga kerja ÷ total HOK</span></div></article>
      </section>

      <section className="v99WorkforceAnalytics">
        <article className="v99Panel v99HokTrend">
          <header><div><span>TREND HOK</span><h2>Penggunaan HOK Bulanan {context.selectedYear}</h2></div><b>{formatNumber(totalHok)} HOK</b></header>
          <div className="v99TrendBars">
            {monthly.map((item) => <div key={item.month}><span><i style={{ height: `${Math.max(item.hok > 0 ? 7 : 1, (item.hok / maxMonthlyHok) * 100)}%` }} /></span><small>{MONTHS[item.month]}</small><b>{item.hok > 0 ? formatNumber(item.hok) : ""}</b></div>)}
          </div>
        </article>
        <article className="v99Panel v99BlockAllocation">
          <header><div><span>ALOKASI BLOK</span><h2>Distribusi HOK</h2></div><b>{blockRows.length} area</b></header>
          <div className="v99BlockRows">
            {blockRows.slice(0, 6).map((item) => <div key={item.name}><section><b>{item.name}</b><small>{formatCompactRupiah(item.cost)}</small></section><span><i style={{ width: `${(item.hok / maxBlockHok) * 100}%` }} /></span><strong>{formatNumber(item.hok)} HOK</strong></div>)}
            {!blockRows.length ? <div className="v99MiniEmpty">Belum ada distribusi HOK per blok.</div> : null}
          </div>
        </article>
      </section>

      <section className="v99WorkforceWorkspace">
        <aside className="v99WorkforceComposer">
          <div className="v99SectionTitle"><span>INPUT LAPANGAN</span><h2>Catat Tenaga Kerja</h2><p>Gunakan untuk pekerjaan aktual yang membutuhkan HOK dan upah tenaga kerja.</p></div>
          {estate ? (
            <form action={createLaborActual} className="workforceForm v99WorkforceForm">
              <input type="hidden" name="estate_id" value={estate.id} />
              <label>Blok<select name="block_id"><option value="">Umum Kebun / tanpa blok</option>{estateBlocks.map((block) => <option value={block.id} key={block.id}>{block.name}</option>)}</select></label>
              <label>Tanggal<input name="op_date" type="date" defaultValue={currentDate} required /></label>
              <label className="fullField">Uraian Pekerjaan<input name="description" placeholder="Contoh: pruning, rawat jalan, angkut TBS..." required /></label>
              <div className="v99FormCallout fullField"><i><AppIcon name="workforce" /></i><div><b>HOK = Hari Orang Kerja</b><span>Contoh: 4 pekerja × 1 hari = 4 HOK. Jika setengah hari per orang, gunakan nilai desimal.</span></div></div>
              <label>Jumlah HOK<input name="labor_days" type="number" min="0" step="0.01" placeholder="0" required /></label>
              <label>Upah / HOK (Rp)<input name="labor_rate" type="number" min="0" step="1" placeholder="0" required /></label>
              <label className="fullField">Pelaksana / Tim<input name="worker" placeholder="Nama mandor, pekerja atau nama tim" /></label>
              <label className="fullField">Catatan<textarea name="note" rows={3} placeholder="Opsional: volume pekerjaan, lokasi, kondisi lapangan..." /></label>
              <button className="primaryButton fullField v99SaveButton" type="submit"><AppIcon name="plus" /> Simpan HOK Aktual</button>
            </form>
          ) : <div className="emptyState">Belum ada kebun.</div>}
        </aside>

        <article className="v99WorkerSummary">
          <header className="v99SummaryHead"><div><span>WORKER SUMMARY</span><h2>Produktivitas Pelaksana</h2><p>Rekap berdasarkan nama pelaksana yang diisi pada aktivitas.</p></div><b>{workerRows.length} pelaksana</b></header>
          <div className="v99WorkerList">
            {workerRows.map(([name, value], index) => {
              const share = totalHok > 0 ? (value.hok / totalHok) * 100 : 0;
              return <div className="v99WorkerRow" key={name}><i>{index + 1}</i><section><b>{name}</b><small>{value.count} aktivitas · {formatCompactRupiah(value.cost)}</small><span><em style={{ width: `${Math.min(100, share)}%` }} /></span></section><aside><strong>{formatNumber(value.hok)} HOK</strong><small>{formatNumber(share, 1)}% total</small></aside></div>;
            })}
            {!workerRows.length ? <div className="v99EmptyWorkers"><AppIcon name="workforce" /><b>Belum ada pelaksana</b><span>Nama pelaksana akan muncul setelah aktivitas dengan HOK dicatat.</span></div> : null}
          </div>
        </article>
      </section>

      <section className="v99LaborHistory">
        <header className="v99HistoryHead"><div><span>HISTORI HOK</span><h2>Aktivitas Tenaga Kerja</h2><p>Semua aktivitas {estate?.name ?? "kebun"} yang memiliki HOK pada {context.selectedYear}.</p></div><b>{directRows.length} direct · {rows.length - directRows.length} terintegrasi</b></header>
        <div className="v99LaborRows">
          {rows.map((operation) => {
            const block = blocks.find((item) => item.id === operation.block_id);
            const cost = Number(operation.labor_days ?? 0) * Number(operation.labor_rate ?? 0);
            return <Link href={`/aktivitas/${operation.id}`} className="v99LaborRow" key={operation.id}><i><AppIcon name="workforce" /></i><div><b>{operation.description}</b><small>{idDate(operation.op_date)} · {block?.name ?? "Umum Kebun"}</small><span>{operation.worker || "Pelaksana belum diisi"}</span></div><section><small>HOK</small><strong>{formatNumber(Number(operation.labor_days ?? 0))}</strong></section><section><small>UPAH / HOK</small><strong>{formatCompactRupiah(Number(operation.labor_rate ?? 0))}</strong></section><aside><strong>{formatCompactRupiah(cost)}</strong><em className={operation.type === "Tenaga Kerja" && operation.source === "DIRECT" ? "directPill" : "planPill"}>{operation.type === "Tenaga Kerja" && operation.source === "DIRECT" ? "DIRECT" : "AKTIVITAS"}</em><small>Buka detail →</small></aside></Link>;
          })}
          {!rows.length ? <div className="v99EmptyHistory"><AppIcon name="workforce" /><b>Belum ada HOK pada {context.selectedYear}</b><span>Gunakan form di atas untuk mulai mencatat tenaga kerja.</span></div> : null}
        </div>
      </section>
    </div>
  );
}
