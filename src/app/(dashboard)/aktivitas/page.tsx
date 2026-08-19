export const dynamic = "force-dynamic";
export const revalidate = 0;

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { formatCompactRupiah, formatNumber } from "@/lib/formatters";
import { ContextSelector } from "@/components/layout/context-selector";
import { createOperation } from "@/features/operations/actions";

const TYPE_META: Record<string, { icon: string; label: string }> = {
  Pemupukan: { icon: "🧺", label: "Pemupukan" },
  Perawatan: { icon: "✂️", label: "Perawatan" },
  Penyemprotan: { icon: "💧", label: "Penyemprotan" },
  "Tenaga Kerja": { icon: "👷", label: "Tenaga Kerja" },
  Biaya: { icon: "🧾", label: "Biaya" },
};

function opIcon(type: string) {
  return TYPE_META[type]?.icon ?? "🛠️";
}

function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; status?: string }>;
}) {
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
  const activeEstateId =
    context.activeEstateId && estates.some((e) => e.id === context.activeEstateId)
      ? context.activeEstateId
      : estates[0]?.id ?? null;

  const activeEstate = estates.find((e) => e.id === activeEstateId) ?? null;
  const activeBlocks = blocks.filter((b) => b.estate_id === activeEstateId);
  const yearStart = `${context.selectedYear}-01-01`;
  const yearEnd = `${context.selectedYear}-12-31`;

  const yearOperations = allOperations.filter(
    (o) =>
      o.estate_id === activeEstateId &&
      o.op_date >= yearStart &&
      o.op_date <= yearEnd,
  );

  const filtered =
    params.type && params.type !== "Semua"
      ? yearOperations.filter((o) => o.type === params.type)
      : yearOperations;

  const actualCost = yearOperations.reduce(
    (sum, o) => sum + Number(o.total_cost ?? 0),
    0,
  );
  const directCount = yearOperations.filter((o) => o.source === "DIRECT").length;
  const linkedCount = yearOperations.length - directCount;

  return (
    <div className="activityPage">
      <section className="activityHeading">
        <div>
          <span>OPERASIONAL KEBUN</span>
          <h1>Aktivitas</h1>
          <p>
            Catat actual operasional. Transaksi dari Rencana/Pemupukan tetap
            dilindungi dan dikelola dari modul asalnya.
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
            ? "Aktivitas berhasil disimpan."
            : params.status === "deleted"
              ? "Aktivitas berhasil dihapus."
              : "Perubahan tersimpan."}
        </div>
      ) : null}

      <section className="activityKpis">
        <article>
          <small>Total Aktivitas</small>
          <strong>{yearOperations.length}</strong>
          <span>{activeEstate?.name ?? "-"}</span>
        </article>
        <article>
          <small>Biaya Aktual</small>
          <strong>{formatCompactRupiah(actualCost)}</strong>
          <span>Tahun {context.selectedYear}</span>
        </article>
        <article>
          <small>Direct</small>
          <strong>{directCount}</strong>
          <span>Dapat diedit di sini</span>
        </article>
        <article>
          <small>Dari Program</small>
          <strong>{linkedCount}</strong>
          <span>Read-only di Aktivitas</span>
        </article>
      </section>

      <section className="activityWorkspace">
        <aside className="activityComposer">
          <div className="activitySectionTitle">
            <span>＋ ACTUAL BARU</span>
            <h2>Catat Aktivitas</h2>
          </div>

          {activeEstate ? (
            <form action={createOperation} className="activityForm">
              <input type="hidden" name="estate_id" value={activeEstate.id} />

              <label>
                Jenis Aktivitas
                <select name="type" defaultValue="Perawatan" required>
                  <option>Perawatan</option>
                  <option>Penyemprotan</option>
                  <option>Pemupukan</option>
                  <option>Tenaga Kerja</option>
                  <option>Biaya</option>
                  <option>Lainnya</option>
                </select>
              </label>

              <label>
                Blok
                <select name="block_id" defaultValue="">
                  <option value="">Umum Kebun / tanpa blok</option>
                  {activeBlocks.map((block) => (
                    <option key={block.id} value={block.id}>
                      {block.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Tanggal Aktual
                <input
                  name="op_date"
                  type="date"
                  defaultValue={`${context.selectedYear}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`}
                  required
                />
              </label>

              <label className="fullField">
                Uraian Aktivitas
                <input
                  name="description"
                  placeholder="Contoh: Semprot piringan, pruning, pupuk direct"
                  required
                />
              </label>

              <label>
                Kuantitas
                <input name="quantity" type="number" min="0" step="0.01" defaultValue="0" />
              </label>

              <label>
                Satuan
                <input name="unit" placeholder="Kg, L, hari, paket..." />
              </label>

              <label>
                Harga / Satuan (Rp)
                <input name="unit_price" type="number" min="0" step="1" defaultValue="0" />
              </label>

              <label>
                Dosis / Pohon
                <input name="dose_per_tree" type="number" min="0" step="0.001" defaultValue="0" />
              </label>

              <label>
                Hari Orang Kerja
                <input name="labor_days" type="number" min="0" step="0.01" defaultValue="0" />
              </label>

              <label>
                Upah / HOK (Rp)
                <input name="labor_rate" type="number" min="0" step="1" defaultValue="0" />
              </label>

              <label className="fullField">
                Pelaksana / Mandor
                <input name="worker" placeholder="Opsional" />
              </label>

              <label className="fullField">
                Catatan
                <textarea name="note" rows={3} placeholder="Kondisi lapangan / catatan actual" />
              </label>

              <div className="activityFormula fullField">
                <b>Biaya dihitung otomatis saat disimpan</b>
                <span>(Kuantitas × Harga/Satuan) + (HOK × Upah/HOK)</span>
              </div>

              <button className="primaryButton fullField" type="submit">
                Simpan Aktivitas Aktual
              </button>
            </form>
          ) : (
            <div className="emptyState">Belum ada kebun.</div>
          )}
        </aside>

        <div className="activityHistory">
          <div className="activityHistoryHead">
            <div className="activitySectionTitle">
              <span>HISTORI ACTUAL</span>
              <h2>{activeEstate?.name ?? "Kebun"}</h2>
            </div>
            <div className="activityFilters">
              {["Semua", "Pemupukan", "Perawatan", "Penyemprotan", "Tenaga Kerja", "Biaya"].map(
                (type) => (
                  <Link
                    key={type}
                    href={type === "Semua" ? "/aktivitas" : `/aktivitas?type=${encodeURIComponent(type)}`}
                    className={
                      (params.type ?? "Semua") === type ? "activeFilter" : ""
                    }
                  >
                    {type}
                  </Link>
                ),
              )}
            </div>
          </div>

          <div className="activityList">
            {filtered.map((op) => {
              const block = blocks.find((b) => b.id === op.block_id);
              const editable =
                op.source === "DIRECT" &&
                !op.plan_id &&
                !op.fertilizer_program_id;

              return (
                <Link
                  href={`/aktivitas/${op.id}`}
                  className="activityRow"
                  key={op.id}
                >
                  <span className="activityIcon">{opIcon(op.type)}</span>
                  <div className="activityRowMain">
                    <b>{op.description}</b>
                    <small>
                      {op.type} · {block?.name ?? "Umum Kebun"} · {idDate(op.op_date)}
                    </small>
                    {op.worker ? <em>Pelaksana: {op.worker}</em> : null}
                  </div>
                  <div className="activityRowRight">
                    <strong>{formatCompactRupiah(Number(op.total_cost ?? 0))}</strong>
                    <span className={editable ? "directPill" : "planPill"}>
                      {editable ? "DIRECT" : "PROGRAM"}
                    </span>
                    {Number(op.quantity ?? 0) > 0 ? (
                      <small>
                        {formatNumber(Number(op.quantity))} {op.unit ?? ""}
                      </small>
                    ) : null}
                  </div>
                </Link>
              );
            })}
            {!filtered.length ? (
              <div className="emptyActivity">
                Belum ada aktivitas untuk filter ini pada {context.selectedYear}.
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
