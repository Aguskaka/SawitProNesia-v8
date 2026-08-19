export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { getPlanProgress, planActualUnit } from "@/lib/calculations/plan";
import { formatNumber, formatCompactRupiah } from "@/lib/formatters";
import { deletePlan, updatePlan } from "@/features/plans/actions";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function PlanDetail({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { planId } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const context = await getAppContext();

  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (error || !plan) notFound();

  const [estateResult, blockResult, harvestResult, operationResult] =
    await Promise.all([
      supabase.from("estates").select("id,name").eq("id", plan.estate_id).single(),
      supabase.from("blocks").select("id,estate_id,name").eq("estate_id", plan.estate_id).order("name"),
      supabase.from("harvests").select("*").eq("plan_id", plan.id).order("harvest_date"),
      supabase.from("operations").select("*").eq("plan_id", plan.id).order("op_date"),
    ]);

  if (estateResult.error || !estateResult.data) notFound();
  if (blockResult.error) throw new Error(blockResult.error.message);
  if (harvestResult.error) throw new Error(harvestResult.error.message);
  if (operationResult.error) throw new Error(operationResult.error.message);

  const estate = estateResult.data;
  const blocks = blockResult.data ?? [];
  const harvests = harvestResult.data ?? [];
  const operations = operationResult.data ?? [];
  const progress = getPlanProgress(plan, harvests, operations);
  const block = blocks.find((b) => b.id === plan.block_id);
  const hasActual = harvests.length + operations.length > 0;

  const updateAction = updatePlan.bind(null, plan.id);
  const deleteAction = deletePlan.bind(null, plan.id);

  return (
    <div className="planDetailPage">
      <Link href="/rencana" className="backLink">← Kembali ke Rencana</Link>

      {query.status ? (
        <div className="activityNotice">
          {query.status === "actual-created"
            ? "Actual berhasil ditambahkan dan progress dihitung ulang."
            : "Rencana berhasil diperbarui."}
        </div>
      ) : null}

      <section className="planDetailHero">
        <div>
          <span>PLAN DETAIL</span>
          <h1>{plan.type} · {block?.name ?? "Seluruh Kebun"}</h1>
          <p>{estate.name} · {idDate(plan.planned_date)}</p>
        </div>
        <div className="detailSource">
          <b className={`planStatus ${progress.status.toLowerCase()}`}>{progress.status}</b>
          <strong>{formatNumber(progress.percentage, 1)}%</strong>
        </div>
      </section>

      <section className="planInfoGrid">
        <article><small>Target</small><strong>{formatNumber(progress.target)} {planActualUnit(plan)}</strong></article>
        <article><small>Actual</small><strong>{formatNumber(progress.actual)} {planActualUnit(plan)}</strong></article>
        <article><small>Sisa</small><strong>{formatNumber(progress.remaining)} {planActualUnit(plan)}</strong></article>
        <article><small>Reminder</small><strong>{plan.reminder_days} hari</strong></article>
      </section>

      <section className="planActionStrip">
        <div>
          <b>Plan → Actual</b>
          <span>
            {plan.type === "Panen"
              ? "Realisasi Panen memakai modul Panen agar produksi dan pendapatan tetap konsisten."
              : "Actual operasional akan masuk ke operations dengan source PLAN dan plan_id ini."}
          </span>
        </div>
        {progress.status !== "Selesai" ? (
          <Link
            className="primaryLink"
            href={
              plan.type === "Panen"
                ? `/panen/realisasi/${plan.id}`
                : `/rencana/${plan.id}/realisasi`
            }
          >
            Realisasikan →
          </Link>
        ) : (
          <b className="doneLabel">Selesai</b>
        )}
      </section>

      <section className="editPanel">
        <div className="activitySectionTitle">
          <span>MASTER PLAN</span>
          <h2>Edit Rencana</h2>
        </div>

        {hasActual ? (
          <div className="linkedOperationNotice">
            <b>Rencana sudah memiliki Actual.</b>
            <p>Jenis dan blok dikunci untuk menjaga relasi Plan → Actual. Target, tanggal, reminder, satuan, dan catatan masih dapat diperbarui.</p>
          </div>
        ) : null}

        <form action={updateAction} className="masterForm planEditForm">
          <input type="hidden" name="selected_year" value={context.selectedYear} />

          <label>
            Jenis
            <select name="type" defaultValue={plan.type} disabled={hasActual}>
              {["Panen", "Pemupukan", "Perawatan", "Penyemprotan", "Tenaga Kerja", "Biaya", "Lainnya"].map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            {hasActual ? <input type="hidden" name="type" value={plan.type} /> : null}
          </label>

          <label>
            Blok
            <select name="block_id" defaultValue={plan.block_id ?? ""} disabled={hasActual}>
              <option value="">Seluruh Kebun / tanpa blok</option>
              {blocks.map((item) => (
                <option value={item.id} key={item.id}>{item.name}</option>
              ))}
            </select>
            {hasActual ? <input type="hidden" name="block_id" value={plan.block_id ?? ""} /> : null}
          </label>

          <label>
            Tanggal Rencana
            <input name="planned_date" type="date" defaultValue={plan.planned_date} required />
          </label>

          <label>
            Reminder
            <input name="reminder_days" type="number" min="0" step="1" defaultValue={plan.reminder_days} />
          </label>

          <label>
            Target
            <input name="target_quantity" type="number" min="0" step="0.01" defaultValue={Number(plan.target_quantity)} />
          </label>

          <label>
            Satuan
            <input name="unit" defaultValue={plan.unit ?? ""} />
          </label>

          <label className="fullField">
            Catatan
            <textarea name="note" rows={3} defaultValue={plan.note ?? ""} />
          </label>

          <button className="primaryButton fullField" type="submit">
            Simpan Perubahan Rencana
          </button>
        </form>
      </section>

      <section className="planActualSection">
        <div className="activitySectionTitle">
          <span>ACTUAL TERHUBUNG</span>
          <h2>Histori Realisasi</h2>
        </div>

        <div className="planActualList">
          {plan.type === "Panen"
            ? harvests.map((h) => (
                <Link href={`/panen/${h.id}`} className="planActualRow" key={h.id}>
                  <span>🌾</span>
                  <div><b>{formatNumber(Number(h.weight_kg))} Kg</b><small>{idDate(h.harvest_date)}</small></div>
                  <strong>{formatCompactRupiah(Number(h.revenue))}</strong>
                </Link>
              ))
            : operations.map((o) => (
                <Link href={`/aktivitas/${o.id}`} className="planActualRow" key={o.id}>
                  <span>🛠️</span>
                  <div><b>{o.description}</b><small>{idDate(o.op_date)}</small></div>
                  <strong>{formatCompactRupiah(Number(o.total_cost))}</strong>
                </Link>
              ))}

          {!hasActual ? <div className="emptyActivity">Belum ada Actual pada rencana ini.</div> : null}
        </div>
      </section>

      <section className="dangerPanel">
        <div>
          <b>Hapus Rencana</b>
          <p>
            Rencana hanya dapat dihapus jika belum memiliki Actual. Actual tidak pernah ikut dihapus otomatis.
          </p>
        </div>
        <form action={deleteAction}>
          <button className="dangerButton" type="submit" disabled={hasActual}>
            Hapus Rencana
          </button>
        </form>
      </section>
    </div>
  );
}
