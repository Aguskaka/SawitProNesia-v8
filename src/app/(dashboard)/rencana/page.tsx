export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { ContextSelector } from "@/components/layout/context-selector";
import { createPlan } from "@/features/plans/actions";
import { getPlanProgress, planActualUnit } from "@/lib/calculations/plan";
import { formatNumber } from "@/lib/formatters";
import { AppIcon } from "@/components/layout/app-icons";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function planIcon(type: string) {
  if (type === "Panen") return "harvest" as const;
  if (type === "Pemupukan") return "fertilizer" as const;
  if (type === "Tenaga Kerja") return "workforce" as const;
  if (type === "Biaya") return "budget" as const;
  return "activity" as const;
}


export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const context = await getAppContext();

  const [estateResult, blockResult, planResult, harvestResult, operationResult] =
    await Promise.all([
      supabase.from("estates").select("id,name").order("created_at"),
      supabase.from("blocks").select("id,estate_id,name").order("name"),
      supabase.from("plans").select("*").order("planned_date"),
      supabase.from("harvests").select("*"),
      supabase.from("operations").select("*"),
    ]);

  for (const result of [
    estateResult,
    blockResult,
    planResult,
    harvestResult,
    operationResult,
  ]) {
    if (result.error) throw new Error(result.error.message);
  }

  const estates = estateResult.data ?? [];
  const blocks = blockResult.data ?? [];
  const plans = planResult.data ?? [];
  const harvests = harvestResult.data ?? [];
  const operations = operationResult.data ?? [];

  const activeEstateId =
    context.activeEstateId && estates.some((e) => e.id === context.activeEstateId)
      ? context.activeEstateId
      : estates[0]?.id ?? null;

  const activeEstate = estates.find((e) => e.id === activeEstateId) ?? null;
  const activeBlocks = blocks.filter((b) => b.estate_id === activeEstateId);

  const scopedPlans = plans.filter(
    (plan) =>
      plan.estate_id === activeEstateId &&
      String(plan.planned_date).startsWith(`${context.selectedYear}-`),
  );

  const rows = scopedPlans.map((plan) => ({
    plan,
    progress: getPlanProgress(plan, harvests, operations),
  }));

  const filtered =
    params.type && params.type !== "Semua"
      ? rows.filter((row) => row.plan.type === params.type)
      : rows;

  const scheduled = rows.filter((r) => r.progress.status === "Terjadwal").length;
  const partial = rows.filter((r) => r.progress.status === "Sebagian").length;
  const done = rows.filter((r) => r.progress.status === "Selesai").length;
  const late = rows.filter((r) => r.progress.status === "Terlambat").length;

  return (
    <div className="planningPage v100PlanningPage">
      <section className="v100PlanHero">
        <div className="v100PlanHeroTop">
          <div>
            <span>OPERATIONAL PLANNING CENTER</span>
            <h1>Rencana Operasional</h1>
            <p>Susun agenda kerja kebun, pantau target dan actual, lalu prioritaskan pekerjaan yang perlu ditindaklanjuti.</p>
          </div>
          <ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={activeEstateId} />
        </div>
        <div className="v100PlanSignals">
          <article><small>KEBUN AKTIF</small><strong>{activeEstate?.name ?? "-"}</strong><span>{activeBlocks.length} blok operasional</span></article>
          <article><small>RENCANA TAHUNAN</small><strong>{rows.length}</strong><span>{context.selectedYear}</span></article>
          <article><small>PROGRESS SELESAI</small><strong>{rows.length ? formatNumber((done / rows.length) * 100, 1) : "0"}%</strong><span>{done} dari {rows.length} rencana</span></article>
          <article className={late ? "v100SignalAlert" : ""}><small>PERLU PERHATIAN</small><strong>{late + partial}</strong><span>{late} terlambat · {partial} sebagian</span></article>
        </div>
      </section>

      {params.status ? (
        <div className="activityNotice">
          {params.status === "created"
            ? "Rencana berhasil dibuat."
            : params.status === "deleted"
              ? "Rencana berhasil dihapus."
              : "Perubahan tersimpan."}
        </div>
      ) : null}

      <section className="planningKpis">
        <article><small>Total Rencana</small><strong>{rows.length}</strong><span>{activeEstate?.name ?? "-"}</span></article>
        <article><small>Terjadwal</small><strong>{scheduled}</strong><span>Belum ada actual</span></article>
        <article><small>Sebagian</small><strong>{partial}</strong><span>Partial actual</span></article>
        <article><small>Selesai</small><strong>{done}</strong><span>Target tercapai</span></article>
        <article className={late ? "warningPlanKpi" : ""}><small>Terlambat</small><strong>{late}</strong><span>Lewat tanggal rencana</span></article>
      </section>

      <section className="planningWorkspace">
        <aside className="planningComposer">
          <div className="activitySectionTitle">
            <span>＋ RENCANA BARU</span>
            <h2>Tambah Rencana</h2>
          </div>

          {activeEstate ? (
            <form action={createPlan} className="planningForm">
              <input type="hidden" name="estate_id" value={activeEstate.id} />
              <input type="hidden" name="selected_year" value={context.selectedYear} />

              <label>
                Jenis Rencana
                <select name="type" defaultValue="Panen" required>
                  <option>Panen</option>
                  <option>Pemupukan</option>
                  <option>Perawatan</option>
                  <option>Penyemprotan</option>
                  <option>Tenaga Kerja</option>
                  <option>Biaya</option>
                  <option>Lainnya</option>
                </select>
              </label>

              <label>
                Blok
                <select name="block_id" defaultValue="">
                  <option value="">Seluruh Kebun / tanpa blok</option>
                  {activeBlocks.map((block) => (
                    <option value={block.id} key={block.id}>{block.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Tanggal Rencana
                <input
                  name="planned_date"
                  type="date"
                  defaultValue={`${context.selectedYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
                  required
                />
              </label>

              <label>
                Reminder (hari)
                <input name="reminder_days" type="number" min="0" step="1" defaultValue="3" />
              </label>

              <label>
                Target
                <input name="target_quantity" type="number" min="0" step="0.01" defaultValue="0" />
              </label>

              <label>
                Satuan
                <input name="unit" placeholder="Kg, HOK, Rp, L..." />
              </label>

              <label className="fullField">
                Catatan Rencana
                <textarea name="note" rows={3} placeholder="Target dan instruksi rencana..." />
              </label>

              <button className="primaryButton fullField" type="submit">
                Simpan Rencana
              </button>
            </form>
          ) : (
            <div className="emptyState">Belum ada kebun.</div>
          )}
        </aside>

        <div className="planningHistory">
          <div className="planningHistoryHead">
            <div className="activitySectionTitle">
              <span>RENCANA {context.selectedYear}</span>
              <h2>{activeEstate?.name ?? "Kebun"}</h2>
            </div>
            <div className="activityFilters">
              {["Semua", "Panen", "Pemupukan", "Perawatan", "Penyemprotan", "Tenaga Kerja", "Biaya"].map(
                (type) => (
                  <Link
                    key={type}
                    href={type === "Semua" ? "/rencana" : `/rencana?type=${encodeURIComponent(type)}`}
                    className={(params.type ?? "Semua") === type ? "activeFilter" : ""}
                  >
                    {type}
                  </Link>
                ),
              )}
            </div>
          </div>

          <div className="planningList">
            {filtered.map(({ plan, progress }) => {
              const block = blocks.find((b) => b.id === plan.block_id);
              const pct = Math.min(progress.percentage, 100);
              return (
                <Link href={`/rencana/${plan.id}`} className="planningRow" key={plan.id}>
                  <span className="planningIcon"><AppIcon name={planIcon(plan.type)} /></span>
                  <div className="planningRowMain">
                    <b>{plan.type} · {block?.name ?? "Seluruh Kebun"}</b>
                    <small>
                      {idDate(plan.planned_date)} · Target {formatNumber(progress.target)} {planActualUnit(plan)}
                    </small>
                    <div className="miniPlanProgress"><div style={{ width: `${pct}%` }} /></div>
                  </div>
                  <div className="planningRowRight">
                    <strong>{formatNumber(progress.actual)} / {formatNumber(progress.target)}</strong>
                    <span className={`planStatus ${progress.status.toLowerCase()}`}>{progress.status}</span>
                    <small>{formatNumber(progress.percentage, 1)}%</small>
                  </div>
                </Link>
              );
            })}

            {!filtered.length ? (
              <div className="emptyActivity">
                Belum ada Rencana untuk filter ini pada {context.selectedYear}.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
