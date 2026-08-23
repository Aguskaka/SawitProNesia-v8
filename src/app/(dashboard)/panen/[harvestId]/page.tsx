export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccess } from "@/lib/auth/access";
import { getAppContext } from "@/lib/context/server-context";
import {
  calculateBjr,
  getHarvestPlanProgress,
} from "@/lib/calculations/harvest";
import {
  formatCompactRupiah,
  formatNumber,
  formatRupiah,
} from "@/lib/formatters";
import {
  deleteHarvestActual,
  updateHarvestActual,
} from "@/features/harvests/actions";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function HarvestDetail({
  params,
  searchParams,
}: {
  params: Promise<{ harvestId: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { harvestId } = await params;
  const query = await searchParams;
  const access = await getCurrentAccess();
  if (access?.role === "pemanen") redirect("/panen");
  const supabase = await createClient();
  const context = await getAppContext();

  const { data: harvest, error } = await supabase
    .from("harvests")
    .select("*")
    .eq("id", harvestId)
    .single();

  if (error || !harvest) notFound();

  const [estateResult, blocksResult, planResult, planHarvestResult] =
    await Promise.all([
      supabase.from("estates").select("id,name").eq("id", harvest.estate_id).single(),
      supabase.from("blocks").select("id,estate_id,name").eq("estate_id", harvest.estate_id).order("name"),
      harvest.plan_id
        ? supabase.from("plans").select("*").eq("id", harvest.plan_id).single()
        : Promise.resolve({ data: null, error: null }),
      harvest.plan_id
        ? supabase.from("harvests").select("plan_id,weight_kg").eq("plan_id", harvest.plan_id)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (estateResult.error || !estateResult.data) notFound();
  if (blocksResult.error) throw new Error(blocksResult.error.message);
  if (planResult.error) throw new Error(planResult.error.message);
  if (planHarvestResult.error) throw new Error(planHarvestResult.error.message);

  const estate = estateResult.data;
  const blocks = blocksResult.data ?? [];
  const block = blocks.find((b) => b.id === harvest.block_id);
  const plan = planResult.data;
  const planProgress = plan
    ? getHarvestPlanProgress(plan, planHarvestResult.data ?? [])
    : null;
  const planLinked = Boolean(harvest.plan_id) || harvest.source === "PLAN";
  const bjr = calculateBjr(Number(harvest.weight_kg), Number(harvest.bunches));
  const updateAction = updateHarvestActual.bind(null, harvest.id);
  const deleteAction = deleteHarvestActual.bind(null, harvest.id);

  return (
    <div className="harvestDetailPage">
      <Link href="/panen" className="backLink">← Kembali ke Panen</Link>

      {query.status === "updated" ? (
        <div className="activityNotice">Actual panen berhasil diperbarui tanpa membuat transaksi baru.</div>
      ) : null}

      <section className="harvestDetailHero">
        <div>
          <span>ACTUAL PANEN</span>
          <h1>{formatNumber(Number(harvest.weight_kg))} Kg · {block?.name ?? "-"}</h1>
          <p>{estate.name} · {idDate(harvest.harvest_date)} · {harvest.worker || "Pelaksana belum diisi"}</p>
        </div>
        <div className="detailSource">
          <b className={planLinked ? "planPill" : "directPill"}>
            {planLinked ? "PLAN" : "DIRECT"}
          </b>
          <strong>{formatCompactRupiah(Number(harvest.revenue))}</strong>
        </div>
      </section>

      <section className="harvestInfoGrid">
        <article><small>Berat TBS</small><strong>{formatNumber(Number(harvest.weight_kg))} Kg</strong></article>
        <article><small>Janjang</small><strong>{formatNumber(Number(harvest.bunches), 0)}</strong></article>
        <article><small>BJR</small><strong>{formatNumber(bjr)} Kg</strong></article>
        <article><small>Harga / Kg</small><strong>{formatRupiah(Number(harvest.price_per_kg))}</strong></article>
      </section>

      {plan && planProgress ? (
        <section className="linkedPlanSummary">
          <div>
            <span>TERHUBUNG KE RENCANA PANEN</span>
            <h2>{idDate(plan.planned_date)} · {blocks.find((b) => b.id === plan.block_id)?.name ?? "Seluruh Kebun"}</h2>
          </div>
          <div className="linkedPlanMetrics">
            <div><small>Target</small><strong>{formatNumber(planProgress.targetKg)} Kg</strong></div>
            <div><small>Aktual Kumulatif</small><strong>{formatNumber(planProgress.actualKg)} Kg</strong></div>
            <div><small>Sisa</small><strong>{formatNumber(planProgress.remainingKg)} Kg</strong></div>
            <div><small>Pencapaian</small><strong>{formatNumber(planProgress.percentage, 1)}%</strong></div>
          </div>
        </section>
      ) : null}

      <section className="editPanel">
        <div className="activitySectionTitle">
          <span>EDIT ACTUAL</span>
          <h2>Transaksi Panen</h2>
        </div>

        <form action={updateAction} className="masterForm harvestEditForm">
          <input type="hidden" name="selected_year" value={context.selectedYear} />

          <label>
            Blok
            <select name="block_id" defaultValue={harvest.block_id} required>
              {blocks.map((item) => (
                <option value={item.id} key={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label>
            Tanggal Panen
            <input
              name="harvest_date"
              type="date"
              defaultValue={harvest.harvest_date}
              required
            />
          </label>

          <label>
            Berat TBS (Kg)
            <input
              name="weight_kg"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={Number(harvest.weight_kg)}
              required
            />
          </label>

          <label>
            Jumlah Janjang
            <input
              name="bunches"
              type="number"
              min="0"
              step="1"
              defaultValue={Number(harvest.bunches)}
            />
          </label>

          <label>
            Harga / Kg
            <input
              name="price_per_kg"
              type="number"
              min="0"
              step="1"
              defaultValue={Number(harvest.price_per_kg)}
              required
            />
          </label>

          <label>
            Pemanen / Pelaksana
            <input name="worker" defaultValue={harvest.worker ?? ""} />
          </label>

          <label className="fullField">
            Catatan
            <textarea name="note" rows={3} defaultValue={harvest.note ?? ""} />
          </label>

          <div className="harvestIntegrity fullField">
            <b>Master link dilindungi</b>
            <span>
              Source = {harvest.source}. Plan ID = {harvest.plan_id ?? "tidak ada"}.
              Edit hanya UPDATE actual ini; source/plan_id tidak diubah.
            </span>
          </div>

          <button className="primaryButton fullField" type="submit">
            Simpan Perubahan Actual
          </button>
        </form>
      </section>

      <section className="dangerPanel">
        <div>
          <b>Hapus Actual Panen</b>
          <p>
            KPI Produksi/Pendapatan dan progress Rencana Panen akan dihitung ulang dari transaksi yang tersisa.
          </p>
        </div>
        <form action={deleteAction}>
          <button className="dangerButton" type="submit">Hapus Panen</button>
        </form>
      </section>
    </div>
  );
}
