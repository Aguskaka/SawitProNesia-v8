export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { getHarvestPlanProgress } from "@/lib/calculations/harvest";
import { formatNumber } from "@/lib/formatters";
import { createHarvest } from "@/features/harvests/actions";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function RealizeHarvestPlan({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;
  const supabase = await createClient();
  const context = await getAppContext();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .eq("type", "Panen")
    .single();

  if (planError || !plan) notFound();

  const [estateResult, blocksResult, planHarvestsResult] = await Promise.all([
    supabase.from("estates").select("id,name").eq("id", plan.estate_id).single(),
    supabase
      .from("blocks")
      .select("id,estate_id,name")
      .eq("estate_id", plan.estate_id)
      .order("name"),
    supabase
      .from("harvests")
      .select("plan_id,weight_kg")
      .eq("plan_id", plan.id),
  ]);

  if (estateResult.error || !estateResult.data) notFound();
  if (blocksResult.error) throw new Error(blocksResult.error.message);
  if (planHarvestsResult.error) throw new Error(planHarvestsResult.error.message);

  const estate = estateResult.data;
  const blocks = blocksResult.data ?? [];
  const progress = getHarvestPlanProgress(plan, planHarvestsResult.data ?? []);
  const plannedBlock = blocks.find((block) => block.id === plan.block_id);
  const defaultBlockId = plan.block_id ?? blocks[0]?.id ?? "";

  if (!blocks.length) {
    return (
      <div className="harvestDetailPage">
        <Link href="/panen" className="backLink">← Kembali ke Panen</Link>
        <div className="emptyState">Kebun ini belum memiliki blok untuk realisasi Panen.</div>
      </div>
    );
  }

  return (
    <div className="harvestDetailPage">
      <Link href="/panen" className="backLink">← Kembali ke Panen</Link>

      <section className="harvestDetailHero">
        <div>
          <span>REALISASI RENCANA PANEN</span>
          <h1>{plannedBlock?.name ?? "Seluruh Kebun"}</h1>
          <p>
            {estate.name} · Rencana {idDate(plan.planned_date)}
          </p>
        </div>
        <div className="detailSource">
          <b className="planPill">PLAN</b>
          <strong>Sisa {formatNumber(progress.remainingKg)} Kg</strong>
        </div>
      </section>

      <section className="harvestInfoGrid">
        <article><small>Target</small><strong>{formatNumber(progress.targetKg)} Kg</strong></article>
        <article><small>Aktual Kumulatif</small><strong>{formatNumber(progress.actualKg)} Kg</strong></article>
        <article><small>Sisa</small><strong>{formatNumber(progress.remainingKg)} Kg</strong></article>
        <article><small>Pencapaian</small><strong>{formatNumber(progress.percentage, 1)}%</strong></article>
      </section>

      <section className="editPanel">
        <div className="activitySectionTitle">
          <span>＋ PARTIAL / FINAL ACTUAL</span>
          <h2>Realisasikan Panen</h2>
        </div>

        <form action={createHarvest} className="masterForm harvestEditForm">
          <input type="hidden" name="estate_id" value={estate.id} />
          <input type="hidden" name="selected_year" value={context.selectedYear} />
          <input type="hidden" name="source" value="PLAN" />
          <input type="hidden" name="plan_id" value={plan.id} />

          <label>
            Blok
            <select name="block_id" defaultValue={defaultBlockId} required>
              {blocks.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tanggal Panen
            <input
              name="harvest_date"
              type="date"
              defaultValue={plan.planned_date}
              required
            />
          </label>

          <label>
            Berat Actual (Kg)
            <input
              name="weight_kg"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={progress.remainingKg > 0 ? progress.remainingKg : ""}
              required
            />
          </label>

          <label>
            Jumlah Janjang
            <input name="bunches" type="number" min="0" step="1" defaultValue="0" />
          </label>

          <label>
            Harga / Kg (Rp)
            <input name="price_per_kg" type="number" min="0" step="1" required />
          </label>

          <label>
            Pemanen / Pelaksana
            <input name="worker" />
          </label>

          <label className="fullField">
            Catatan
            <textarea name="note" rows={3} defaultValue={`Realisasi Rencana Panen ${idDate(plan.planned_date)}`} />
          </label>

          <div className="harvestIntegrity fullField">
            <b>Plan ID dikunci</b>
            <span>
              Actual ini akan tersimpan sebagai source PLAN dan terhubung langsung
              ke rencana ini. Actual berikutnya akan menambah progress secara kumulatif.
            </span>
          </div>

          <button className="primaryButton fullField" type="submit">
            Simpan Realisasi Panen
          </button>
        </form>
      </section>
    </div>
  );
}
