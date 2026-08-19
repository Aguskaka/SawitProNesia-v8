export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { getPlanProgress, planActualUnit } from "@/lib/calculations/plan";
import { formatNumber } from "@/lib/formatters";
import { createPlanOperationActual } from "@/features/plans/actions";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function RealizePlan({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();
  const context = await getAppContext();

  const { data: plan, error } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (error || !plan) notFound();
  if (plan.type === "Panen") redirect(`/panen/realisasi/${plan.id}`);

  const [estateResult, blockResult, operationResult] = await Promise.all([
    supabase.from("estates").select("id,name").eq("id", plan.estate_id).single(),
    supabase.from("blocks").select("id,estate_id,name").eq("estate_id", plan.estate_id).order("name"),
    supabase.from("operations").select("*").eq("plan_id", plan.id),
  ]);

  if (estateResult.error || !estateResult.data) notFound();
  if (blockResult.error) throw new Error(blockResult.error.message);
  if (operationResult.error) throw new Error(operationResult.error.message);

  const estate = estateResult.data;
  const blocks = blockResult.data ?? [];
  const operations = operationResult.data ?? [];
  const progress = getPlanProgress(plan, [], operations);
  const block = blocks.find((b) => b.id === plan.block_id);
  const action = createPlanOperationActual.bind(null, plan.id);

  return (
    <div className="planDetailPage">
      <Link href={`/rencana/${plan.id}`} className="backLink">← Kembali ke Detail Rencana</Link>

      <section className="planDetailHero">
        <div>
          <span>REALISASI RENCANA</span>
          <h1>{plan.type} · {block?.name ?? "Seluruh Kebun"}</h1>
          <p>{estate.name} · Rencana {idDate(plan.planned_date)}</p>
        </div>
        <div className="detailSource">
          <b className="planPill">PLAN</b>
          <strong>Sisa {formatNumber(progress.remaining)} {planActualUnit(plan)}</strong>
        </div>
      </section>

      <section className="planInfoGrid">
        <article><small>Target</small><strong>{formatNumber(progress.target)} {planActualUnit(plan)}</strong></article>
        <article><small>Actual</small><strong>{formatNumber(progress.actual)} {planActualUnit(plan)}</strong></article>
        <article><small>Sisa</small><strong>{formatNumber(progress.remaining)} {planActualUnit(plan)}</strong></article>
        <article><small>Pencapaian</small><strong>{formatNumber(progress.percentage, 1)}%</strong></article>
      </section>

      <section className="editPanel">
        <div className="activitySectionTitle">
          <span>＋ PARTIAL / FINAL ACTUAL</span>
          <h2>Catat Realisasi</h2>
        </div>

        <form action={action} className="masterForm planActualForm">
          <input type="hidden" name="selected_year" value={context.selectedYear} />

          {!plan.block_id ? (
            <label>
              Blok
              <select name="block_id" defaultValue="">
                <option value="">Umum Kebun / tanpa blok</option>
                {blocks.map((item) => (
                  <option value={item.id} key={item.id}>{item.name}</option>
                ))}
              </select>
            </label>
          ) : (
            <input type="hidden" name="block_id" value={plan.block_id} />
          )}

          <label>
            Tanggal Actual
            <input name="op_date" type="date" defaultValue={plan.planned_date} required />
          </label>

          <label className="fullField">
            Uraian Actual
            <input name="description" defaultValue={`Realisasi Rencana ${plan.type}`} required />
          </label>

          {plan.type === "Tenaga Kerja" ? (
            <>
              <label>
                HOK
                <input name="labor_days" type="number" min="0" step="0.01" defaultValue={progress.remaining > 0 ? progress.remaining : 0} />
              </label>
              <label>
                Upah / HOK
                <input name="labor_rate" type="number" min="0" step="1" defaultValue="0" />
              </label>
              <input type="hidden" name="quantity" value="0" />
              <input type="hidden" name="unit_price" value="0" />
            </>
          ) : plan.type === "Biaya" ? (
            <>
              <label>
                Nilai Actual (Rp)
                <input name="quantity" type="number" min="0" step="1" defaultValue="1" />
              </label>
              <label>
                Nilai / Satuan (Rp)
                <input name="unit_price" type="number" min="0" step="1" defaultValue={progress.remaining > 0 ? progress.remaining : 0} />
              </label>
              <input type="hidden" name="labor_days" value="0" />
              <input type="hidden" name="labor_rate" value="0" />
            </>
          ) : (
            <>
              <label>
                Kuantitas Actual
                <input name="quantity" type="number" min="0" step="0.01" defaultValue={progress.remaining > 0 ? progress.remaining : 0} />
              </label>
              <label>
                Satuan
                <input name="unit" defaultValue={plan.unit ?? ""} />
              </label>
              <label>
                Harga / Satuan
                <input name="unit_price" type="number" min="0" step="1" defaultValue="0" />
              </label>
              <label>
                Dosis / Pohon
                <input name="dose_per_tree" type="number" min="0" step="0.001" defaultValue="0" />
              </label>
              <label>
                HOK
                <input name="labor_days" type="number" min="0" step="0.01" defaultValue="0" />
              </label>
              <label>
                Upah / HOK
                <input name="labor_rate" type="number" min="0" step="1" defaultValue="0" />
              </label>
            </>
          )}

          <label className="fullField">
            Pelaksana / Mandor
            <input name="worker" />
          </label>

          <label className="fullField">
            Catatan
            <textarea name="note" rows={3} defaultValue={`Realisasi Rencana ${plan.type} ${idDate(plan.planned_date)}`} />
          </label>

          <div className="harvestIntegrity fullField">
            <b>Plan ID dikunci</b>
            <span>Actual akan masuk ke operations dengan source PLAN. DIRECT tidak akan memengaruhi progress rencana.</span>
          </div>

          <button className="primaryButton fullField" type="submit">
            Simpan Realisasi Rencana
          </button>
        </form>
      </section>
    </div>
  );
}
