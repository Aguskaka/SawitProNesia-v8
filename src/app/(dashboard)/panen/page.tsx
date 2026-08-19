export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import {
  calculateBjr,
  getHarvestPlanProgress,
} from "@/lib/calculations/harvest";
import {
  formatCompactRupiah,
  formatNumber,
} from "@/lib/formatters";
import { ContextSelector } from "@/components/layout/context-selector";
import { createHarvest } from "@/features/harvests/actions";

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function planStatusClass(status: string) {
  return status === "Selesai"
    ? "done"
    : status === "Sebagian"
      ? "partial"
      : "scheduled";
}

export default async function HarvestPage({
  searchParams,
}: {
  searchParams: Promise<{
    source?: string;
    status?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const context = await getAppContext();

  const [estateResult, blockResult, harvestResult, planResult] =
    await Promise.all([
      supabase.from("estates").select("id,name").order("created_at"),
      supabase.from("blocks").select("id,estate_id,name,trees").order("name"),
      supabase.from("harvests").select("*").order("harvest_date", { ascending: false }),
      supabase.from("plans").select("*").eq("type", "Panen").order("planned_date"),
    ]);

  if (estateResult.error) throw new Error(estateResult.error.message);
  if (blockResult.error) throw new Error(blockResult.error.message);
  if (harvestResult.error) throw new Error(harvestResult.error.message);
  if (planResult.error) throw new Error(planResult.error.message);

  const estates = estateResult.data ?? [];
  const blocks = blockResult.data ?? [];
  const allHarvests = harvestResult.data ?? [];
  const allPlans = planResult.data ?? [];

  const activeEstateId =
    context.activeEstateId && estates.some((e) => e.id === context.activeEstateId)
      ? context.activeEstateId
      : estates[0]?.id ?? null;

  const activeEstate = estates.find((e) => e.id === activeEstateId) ?? null;
  const activeBlocks = blocks.filter((b) => b.estate_id === activeEstateId);
  const yearPrefix = `${context.selectedYear}-`;

  const yearHarvests = allHarvests.filter(
    (h) =>
      h.estate_id === activeEstateId &&
      String(h.harvest_date).startsWith(yearPrefix),
  );

  const panenPlans = allPlans.filter(
    (plan) =>
      plan.estate_id === activeEstateId &&
      String(plan.planned_date).startsWith(yearPrefix),
  );

  const filteredHarvests =
    params.source === "DIRECT"
      ? yearHarvests.filter((h) => h.source === "DIRECT" && !h.plan_id)
      : params.source === "PLAN"
        ? yearHarvests.filter((h) => h.source === "PLAN" || Boolean(h.plan_id))
        : yearHarvests;

  const production = yearHarvests.reduce(
    (sum, h) => sum + Number(h.weight_kg ?? 0),
    0,
  );
  const revenue = yearHarvests.reduce(
    (sum, h) => sum + Number(h.revenue ?? 0),
    0,
  );
  const bunches = yearHarvests.reduce(
    (sum, h) => sum + Number(h.bunches ?? 0),
    0,
  );
  const averageBjr = calculateBjr(production, bunches);


  return (
    <div className="harvestPage">
      <section className="harvestHeading">
        <div>
          <span>PRODUKSI KEBUN</span>
          <h1>Panen</h1>
          <p>
            DIRECT dan actual dari Rencana Panen dipisahkan. Progress rencana
            dihitung kumulatif dari transaksi actual yang memiliki plan_id.
          </p>
        </div>
        <ContextSelector
          estates={estates}
          selectedYear={context.selectedYear}
          activeEstateId={activeEstateId}
        />
      </section>

      {params.status ? (
        <div className="activityNotice">
          {params.status === "created"
            ? "Transaksi panen berhasil disimpan."
            : params.status === "deleted"
              ? "Transaksi panen berhasil dihapus dan KPI dihitung ulang."
              : "Perubahan panen tersimpan."}
        </div>
      ) : null}

      <section className="harvestKpis">
        <article>
          <small>Produksi {context.selectedYear}</small>
          <strong>{formatNumber(production)} Kg</strong>
          <span>{yearHarvests.length} transaksi</span>
        </article>
        <article>
          <small>Pendapatan Panen</small>
          <strong>{formatCompactRupiah(revenue)}</strong>
          <span>Actual tahun terpilih</span>
        </article>
        <article>
          <small>Jumlah Janjang</small>
          <strong>{formatNumber(bunches, 0)}</strong>
          <span>Akumulasi transaksi</span>
        </article>
        <article>
          <small>BJR Rata-rata</small>
          <strong>{formatNumber(averageBjr)} Kg</strong>
          <span>Berat / janjang</span>
        </article>
      </section>

      <section className="harvestWorkspace">
        <aside className="harvestComposer">
          <div className="activitySectionTitle">
            <span>＋ ACTUAL PANEN</span>
            <h2>Catat Panen Direct</h2>
          </div>

          {activeEstate && activeBlocks.length ? (
            <form action={createHarvest} className="harvestForm">
              <input type="hidden" name="estate_id" value={activeEstate.id} />
              <input type="hidden" name="selected_year" value={context.selectedYear} />

              <input type="hidden" name="source" value="DIRECT" />
              <input type="hidden" name="plan_id" value="" />

              <div className="harvestFormula fullField">
                <b>DIRECT / tanpa rencana</b>
                <span>
                  Untuk actual yang berasal dari Rencana Panen, gunakan tombol
                  “Realisasikan” pada kartu Progress Rencana Panen di bawah.
                </span>
              </div>

              <label>
                Blok
                <select
                  name="block_id"
                  defaultValue={activeBlocks[0]?.id ?? ""}
                  required
                >
                  {activeBlocks.map((block) => (
                    <option value={block.id} key={block.id}>
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
                  defaultValue={`${context.selectedYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
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
                  defaultValue="0"
                />
              </label>

              <label>
                Harga / Kg (Rp)
                <input
                  name="price_per_kg"
                  type="number"
                  min="0"
                  step="1"
                  required
                />
              </label>

              <label>
                Pemanen / Pelaksana
                <input name="worker" placeholder="Opsional" />
              </label>

              <label className="fullField">
                Catatan
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Kondisi buah, kualitas, catatan timbang..."
                />
              </label>

              <div className="harvestFormula fullField">
                <b>Pendapatan otomatis</b>
                <span>Berat TBS × Harga/Kg. BJR = Berat TBS ÷ Jumlah Janjang.</span>
              </div>

              <button className="primaryButton fullField" type="submit">
                Simpan Actual Panen
              </button>
            </form>
          ) : (
            <div className="emptyState">
              Tambahkan blok terlebih dahulu sebelum mencatat panen.
            </div>
          )}
        </aside>

        <div className="harvestHistory">
          <div className="harvestHistoryHead">
            <div className="activitySectionTitle">
              <span>HISTORI PANEN</span>
              <h2>{activeEstate?.name ?? "Kebun"}</h2>
            </div>
            <div className="activityFilters">
              <Link
                href="/panen"
                className={!params.source ? "activeFilter" : ""}
              >
                Semua
              </Link>
              <Link
                href="/panen?source=PLAN"
                className={params.source === "PLAN" ? "activeFilter" : ""}
              >
                Dari Rencana
              </Link>
              <Link
                href="/panen?source=DIRECT"
                className={params.source === "DIRECT" ? "activeFilter" : ""}
              >
                Direct
              </Link>
            </div>
          </div>

          <div className="harvestList">
            {filteredHarvests.map((harvest) => {
              const block = blocks.find((b) => b.id === harvest.block_id);
              const planLinked = Boolean(harvest.plan_id) || harvest.source === "PLAN";
              const bjr = calculateBjr(
                Number(harvest.weight_kg),
                Number(harvest.bunches),
              );

              return (
                <Link
                  href={`/panen/${harvest.id}`}
                  className="harvestRow"
                  key={harvest.id}
                >
                  <span className="harvestIcon">🌾</span>
                  <div className="harvestRowMain">
                    <b>Panen · {block?.name ?? "-"}</b>
                    <small>
                      {idDate(harvest.harvest_date)} · {formatNumber(Number(harvest.weight_kg))} Kg
                      {Number(harvest.bunches) > 0
                        ? ` · ${formatNumber(Number(harvest.bunches), 0)} janjang`
                        : ""}
                    </small>
                    <em>
                      BJR {formatNumber(bjr)} Kg · {harvest.worker || "Pelaksana belum diisi"}
                    </em>
                  </div>
                  <div className="harvestRowRight">
                    <strong>{formatCompactRupiah(Number(harvest.revenue))}</strong>
                    <span className={planLinked ? "planPill" : "directPill"}>
                      {planLinked ? "PLAN" : "DIRECT"}
                    </span>
                    <small>Rp {formatNumber(Number(harvest.price_per_kg), 0)}/Kg</small>
                  </div>
                </Link>
              );
            })}
            {!filteredHarvests.length ? (
              <div className="emptyActivity">
                Belum ada panen pada filter ini untuk {context.selectedYear}.
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <section className="harvestPlanSection">
        <div className="sectionTitle">
          <div>
            <span>PLAN → ACTUAL</span>
            <h2>Progress Rencana Panen</h2>
          </div>
          <b>{panenPlans.length} rencana</b>
        </div>

        <div className="harvestPlanCards">
          {panenPlans.map((plan) => {
            const block = blocks.find((b) => b.id === plan.block_id);
            const progress = getHarvestPlanProgress(plan, allHarvests);
            const pct = Math.min(progress.percentage, 100);

            return (
              <article className="harvestPlanCard" key={plan.id}>
                <div className="harvestPlanTop">
                  <div>
                    <small>{idDate(plan.planned_date)}</small>
                    <h3>{block?.name ?? "Seluruh Kebun"}</h3>
                  </div>
                  <span className={`planStatus ${planStatusClass(progress.status)}`}>
                    {progress.status}
                  </span>
                </div>

                <div className="planMetrics">
                  <div><small>Target</small><strong>{formatNumber(progress.targetKg)} Kg</strong></div>
                  <div><small>Aktual</small><strong>{formatNumber(progress.actualKg)} Kg</strong></div>
                  <div><small>Sisa</small><strong>{formatNumber(progress.remainingKg)} Kg</strong></div>
                  <div><small>Pencapaian</small><strong>{formatNumber(progress.percentage, 1)}%</strong></div>
                </div>

                <div className="planProgress">
                  <div style={{ width: `${pct}%` }} />
                </div>

                <div className="planCardActions">
                  <span>{plan.note || "Rencana Panen"}</span>
                  {progress.status !== "Selesai" ? (
                    <Link href={`/panen/realisasi/${plan.id}`}>Realisasikan →</Link>
                  ) : (
                    <b>Selesai</b>
                  )}
                </div>
              </article>
            );
          })}

          {!panenPlans.length ? (
            <div className="emptyState">
              Belum ada Rencana Panen pada {context.selectedYear}. Panen DIRECT tetap dapat dicatat.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
