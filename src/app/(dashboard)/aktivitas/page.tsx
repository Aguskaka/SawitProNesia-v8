export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ensureManagementAccess } from "@/lib/auth/access";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { formatCompactRupiah, formatNumber } from "@/lib/formatters";
import { ContextSelector } from "@/components/layout/context-selector";
import { AppIcon } from "@/components/layout/app-icons";
import { createOperation } from "@/features/operations/actions";

const FILTERS = ["Semua", "Pemupukan", "Perawatan", "Penyemprotan", "Tenaga Kerja", "Biaya"];

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" })
    .format(new Date(`${value}T00:00:00`));
}

function idMonth(value: string) {
  return new Intl.DateTimeFormat("id-ID", { month: "long" })
    .format(new Date(`${value}T00:00:00`));
}

function activityGlyph(type: string) {
  if (type === "Pemupukan") return <AppIcon name="fertilizer" />;
  if (type === "Tenaga Kerja") return <AppIcon name="workforce" />;
  if (type === "Biaya") return <AppIcon name="budget" />;
  return <AppIcon name="activity" />;
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  await ensureManagementAccess();
  const params = await searchParams;
  const supabase = await createClient();
  const context = await getAppContext();

  const [estateResult, blockResult, operationResult] = await Promise.all([
    supabase.from("estates").select("id,name").order("created_at"),
    supabase.from("blocks").select("id,estate_id,name,trees").order("name"),
    supabase.from("operations").select("*").order("op_date", { ascending: false }),
  ]);

  if (estateResult.error) throw new Error(estateResult.error.message);
  if (blockResult.error) throw new Error(blockResult.error.message);
  if (operationResult.error) throw new Error(operationResult.error.message);

  const estates = estateResult.data ?? [];
  const blocks = blockResult.data ?? [];
  const allOperations = operationResult.data ?? [];
  const activeEstateId = context.activeEstateId && estates.some((e) => e.id === context.activeEstateId)
    ? context.activeEstateId
    : estates[0]?.id ?? null;

  const activeEstate = estates.find((e) => e.id === activeEstateId) ?? null;
  const activeBlocks = blocks.filter((b) => b.estate_id === activeEstateId);
  const yearStart = `${context.selectedYear}-01-01`;
  const yearEnd = `${context.selectedYear}-12-31`;
  const yearOperations = allOperations.filter((o) => o.estate_id === activeEstateId && o.op_date >= yearStart && o.op_date <= yearEnd);
  const filtered = params.type && params.type !== "Semua" ? yearOperations.filter((o) => o.type === params.type) : yearOperations;

  const actualCost = yearOperations.reduce((sum, o) => sum + Number(o.total_cost ?? 0), 0);
  const laborCost = yearOperations.reduce((sum, o) => sum + Number(o.labor_days ?? 0) * Number(o.labor_rate ?? 0), 0);
  const totalHok = yearOperations.reduce((sum, o) => sum + Number(o.labor_days ?? 0), 0);
  const directCount = yearOperations.filter((o) => o.source === "DIRECT").length;
  const linkedCount = yearOperations.length - directCount;
  const latestDate = yearOperations[0]?.op_date ?? null;
  const currentMonth = latestDate ? idMonth(latestDate) : "Belum ada data";

  const typeCounts = yearOperations.reduce<Record<string, number>>((acc, op) => {
    acc[op.type] = (acc[op.type] ?? 0) + 1;
    return acc;
  }, {});
  const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="v96ActivityPage">
      <section className="v96ActivityHero">
        <div className="v96ActivityHeroCopy">
          <span>FIELD OPERATIONS</span>
          <h1>Aktivitas Kebun</h1>
          <p>Catat pekerjaan aktual, tenaga kerja, material dan biaya operasional dalam satu alur yang mudah dipantau.</p>
        </div>
        <ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={activeEstateId} />
        <div className="v96HeroSummary">
          <div><small>KEBUN AKTIF</small><strong>{activeEstate?.name ?? "-"}</strong><span>{activeBlocks.length} blok operasional</span></div>
          <div><small>AKTIVITAS TERAKHIR</small><strong>{latestDate ? idDate(latestDate) : "-"}</strong><span>{currentMonth}</span></div>
          <div><small>AKTIVITAS DOMINAN</small><strong>{topType?.[0] ?? "-"}</strong><span>{topType ? `${topType[1]} pencatatan` : "Belum ada aktivitas"}</span></div>
        </div>
      </section>

      {params.status ? (
        <div className="activityNotice v96Notice">
          {params.status === "created" ? "Aktivitas berhasil disimpan." : params.status === "deleted" ? "Aktivitas berhasil dihapus." : "Perubahan tersimpan."}
        </div>
      ) : null}

      <section className="v96ActivityKpis">
        <article><i><AppIcon name="activity" /></i><div><small>Total Aktivitas</small><strong>{yearOperations.length}</strong><span>{context.selectedYear}</span></div></article>
        <article><i><AppIcon name="budget" /></i><div><small>Biaya Aktual</small><strong>{formatCompactRupiah(actualCost)}</strong><span>Material + tenaga kerja</span></div></article>
        <article><i><AppIcon name="workforce" /></i><div><small>Total HOK</small><strong>{formatNumber(totalHok)}</strong><span>{formatCompactRupiah(laborCost)} biaya TK</span></div></article>
        <article><i><AppIcon name="plan" /></i><div><small>Sumber Aktual</small><strong>{directCount} / {linkedCount}</strong><span>Direct / Program</span></div></article>
      </section>

      <section className="v96ActivityWorkspace">
        <aside className="v96ActivityComposer">
          <header className="v96ComposerHead">
            <i><AppIcon name="plus" /></i>
            <div><span>INPUT LAPANGAN</span><h2>Catat Aktivitas Baru</h2><p>Masukkan actual pekerjaan setelah aktivitas selesai dilaksanakan.</p></div>
          </header>

          {activeEstate ? (
            <form action={createOperation} className="activityForm v96ActivityForm">
              <input type="hidden" name="estate_id" value={activeEstate.id} />
              <label>Jenis Aktivitas<select name="type" defaultValue="Perawatan" required><option>Perawatan</option><option>Penyemprotan</option><option>Pemupukan</option><option>Tenaga Kerja</option><option>Biaya</option><option>Lainnya</option></select></label>
              <label>Blok<select name="block_id" defaultValue=""><option value="">Umum Kebun / tanpa blok</option>{activeBlocks.map((block) => <option key={block.id} value={block.id}>{block.name}</option>)}</select></label>
              <label>Tanggal Aktual<input name="op_date" type="date" defaultValue={`${context.selectedYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`} required /></label>
              <label className="fullField">Uraian Aktivitas<input name="description" placeholder="Contoh: Semprot piringan blok A" required /></label>
              <div className="v96FormDivider fullField"><span>MATERIAL / VOLUME</span></div>
              <label>Kuantitas<input name="quantity" type="number" min="0" step="0.01" defaultValue="0" /></label>
              <label>Satuan<input name="unit" placeholder="Kg, L, hari, paket..." /></label>
              <label>Harga / Satuan (Rp)<input name="unit_price" type="number" min="0" step="1" defaultValue="0" /></label>
              <label>Dosis / Pohon<input name="dose_per_tree" type="number" min="0" step="0.001" defaultValue="0" /></label>
              <div className="v96FormDivider fullField"><span>TENAGA KERJA</span></div>
              <label>Hari Orang Kerja<input name="labor_days" type="number" min="0" step="0.01" defaultValue="0" /></label>
              <label>Upah / HOK (Rp)<input name="labor_rate" type="number" min="0" step="1" defaultValue="0" /></label>
              <label className="fullField">Pelaksana / Mandor<input name="worker" placeholder="Opsional" /></label>
              <label className="fullField">Catatan<textarea name="note" rows={3} placeholder="Kondisi lapangan / catatan actual" /></label>
              <div className="activityFormula fullField v96Formula"><i><AppIcon name="budget" /></i><div><b>Biaya dihitung otomatis</b><span>(Kuantitas × Harga/Satuan) + (HOK × Upah/HOK)</span></div></div>
              <button className="primaryButton fullField v96SaveButton" type="submit"><AppIcon name="plus" /> Simpan Aktivitas Aktual</button>
            </form>
          ) : <div className="emptyState">Belum ada kebun.</div>}
        </aside>

        <div className="v96ActivityHistory">
          <header className="v96HistoryHead">
            <div><span>ACTIVITY FEED</span><h2>Riwayat Operasional</h2><p>{activeEstate?.name ?? "Kebun"} · Tahun {context.selectedYear}</p></div>
            <b>{filtered.length} aktivitas</b>
          </header>

          <div className="activityFilters v96Filters">
            {FILTERS.map((type) => <Link key={type} href={type === "Semua" ? "/aktivitas" : `/aktivitas?type=${encodeURIComponent(type)}`} className={(params.type ?? "Semua") === type ? "activeFilter" : ""}>{type}</Link>)}
          </div>

          <div className="v96Timeline">
            {filtered.map((op) => {
              const block = blocks.find((b) => b.id === op.block_id);
              const editable = op.source === "DIRECT" && !op.plan_id && !op.fertilizer_program_id;
              return (
                <Link href={`/aktivitas/${op.id}`} className="v96TimelineItem" key={op.id}>
                  <div className={`v96TimelineIcon ${String(op.type).toLowerCase().replaceAll(" ", "-")}`}>{activityGlyph(op.type)}</div>
                  <div className="v96TimelineBody">
                    <div className="v96TimelineTop"><span>{op.type}</span><small>{idDate(op.op_date)}</small></div>
                    <h3>{op.description}</h3>
                    <p>{block?.name ?? "Umum Kebun"}{op.worker ? ` · ${op.worker}` : ""}</p>
                    <div className="v96TimelineMeta">
                      <b className={editable ? "directPill" : "planPill"}>{editable ? "DIRECT" : "PROGRAM"}</b>
                      {Number(op.quantity ?? 0) > 0 ? <span>{formatNumber(Number(op.quantity))} {op.unit ?? ""}</span> : null}
                      {Number(op.labor_days ?? 0) > 0 ? <span>{formatNumber(Number(op.labor_days))} HOK</span> : null}
                    </div>
                  </div>
                  <div className="v96TimelineCost"><small>BIAYA</small><strong>{formatCompactRupiah(Number(op.total_cost ?? 0))}</strong><span>Buka detail →</span></div>
                </Link>
              );
            })}
            {!filtered.length ? <div className="v96EmptyTimeline"><AppIcon name="activity" /><b>Belum ada aktivitas</b><span>Tidak ada actual untuk filter ini pada {context.selectedYear}.</span></div> : null}
          </div>
        </div>
      </section>
    </div>
  );
}
