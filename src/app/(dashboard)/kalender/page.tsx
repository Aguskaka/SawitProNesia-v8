export const dynamic = "force-dynamic";
export const revalidate = 0;

import { ensureManagementAccess } from "@/lib/auth/access";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAppContext } from "@/lib/context/server-context";
import { ContextSelector } from "@/components/layout/context-selector";
import {
  getCalendarPlanStatus,
  reminderStartDate,
  statusSortWeight,
  type CalendarPlanStatus,
} from "@/lib/calculations/calendar";
import { getPlanProgress, planActualUnit } from "@/lib/calculations/plan";
import { formatNumber } from "@/lib/formatters";
import { AppIcon } from "@/components/layout/app-icons";

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function planIcon(type: string) {
  if (type === "Panen") return "harvest" as const;
  if (type === "Pemupukan") return "fertilizer" as const;
  if (type === "Tenaga Kerja") return "workforce" as const;
  if (type === "Biaya") return "budget" as const;
  return "activity" as const;
}


function idDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function monthMatrix(year: number, monthIndex: number) {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  // JS: Sunday=0. We want Monday=0.
  const startOffset = (first.getUTCDay() + 6) % 7;
  const cells: Array<{ day: number | null; iso: string | null }> = [];

  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: null, iso: null });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      iso: `${year}-${pad(monthIndex + 1)}-${pad(day)}`,
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({ day: null, iso: null });
  }

  return cells;
}

function statusLabel(status: CalendarPlanStatus) {
  return status === "Reminder" ? "Mendekati" : status;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string }>;
}) {
  await ensureManagementAccess();
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

  const currentMonth = new Date().getUTCMonth() + 1;
  const requestedMonth = Number(params.month ?? currentMonth);
  const month = Number.isInteger(requestedMonth) && requestedMonth >= 1 && requestedMonth <= 12
    ? requestedMonth
    : currentMonth;
  const monthIndex = month - 1;

  const todayIso = new Date().toISOString().slice(0, 10);
  const selectedDate =
    params.date && params.date.startsWith(`${context.selectedYear}-`)
      ? params.date
      : null;

  const scopedPlans = plans.filter(
    (plan) =>
      plan.estate_id === activeEstateId &&
      String(plan.planned_date).startsWith(`${context.selectedYear}-`),
  );

  const calendarRows = scopedPlans.map((plan) => {
    const progress = getPlanProgress(plan, harvests, operations);
    const status = getCalendarPlanStatus(plan, harvests, operations, todayIso);
    const block = blocks.find((b) => b.id === plan.block_id);

    return {
      plan,
      progress,
      status,
      blockName: block?.name ?? "Seluruh Kebun",
      reminderStart: reminderStartDate(plan),
    };
  });

  const monthRows = calendarRows.filter((row) =>
    row.plan.planned_date.startsWith(
      `${context.selectedYear}-${pad(month)}`,
    ),
  );

  const todayRows = calendarRows
    .filter((row) => row.plan.planned_date === todayIso)
    .sort((a, b) => statusSortWeight(a.status) - statusSortWeight(b.status));

  const reminderRows = calendarRows
    .filter(
      (row) =>
        row.status === "Reminder" ||
        row.status === "Terlambat" ||
        row.status === "Sebagian",
    )
    .sort((a, b) => {
      const statusOrder = statusSortWeight(a.status) - statusSortWeight(b.status);
      if (statusOrder !== 0) return statusOrder;
      return a.plan.planned_date.localeCompare(b.plan.planned_date);
    });

  const upcomingRows = calendarRows
    .filter(
      (row) =>
        row.plan.planned_date >= todayIso &&
        row.status !== "Selesai" &&
        row.plan.planned_date !== todayIso,
    )
    .sort((a, b) => a.plan.planned_date.localeCompare(b.plan.planned_date))
    .slice(0, 6);

  const agendaRows = selectedDate
    ? calendarRows.filter((row) => row.plan.planned_date === selectedDate)
    : monthRows;

  const cells = monthMatrix(context.selectedYear, monthIndex);

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? context.selectedYear - 1 : context.selectedYear;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? context.selectedYear + 1 : context.selectedYear;

  // Global Year is authoritative. Crossing into another year uses the edge month
  // only as a visual hint; user changes Tahun Global through the existing selector.
  const prevHref =
    prevYear === context.selectedYear
      ? `/kalender?month=${prevMonth}`
      : `/kalender?month=1`;
  const nextHref =
    nextYear === context.selectedYear
      ? `/kalender?month=${nextMonth}`
      : `/kalender?month=12`;

  return (
    <div className="calendarPage v100CalendarPage">
      <section className="v100CalendarHero">
        <div className="v100CalendarHeroTop">
          <div>
            <span>OPERATIONAL CALENDAR</span>
            <h1>Kalender Operasional</h1>
            <p>Lihat agenda kebun dalam satu kalender, temukan pekerjaan yang mendekati jadwal, sebagian, atau terlambat.</p>
          </div>
          <ContextSelector estates={estates} selectedYear={context.selectedYear} activeEstateId={activeEstateId} />
        </div>
        <div className="v100CalendarSignals">
          <article><small>KEBUN AKTIF</small><strong>{activeEstate?.name ?? "-"}</strong><span>{context.selectedYear}</span></article>
          <article><small>AGENDA TAHUNAN</small><strong>{calendarRows.length}</strong><span>seluruh rencana</span></article>
          <article><small>AGENDA BULAN INI</small><strong>{monthRows.length}</strong><span>{MONTHS[monthIndex]}</span></article>
          <article className={reminderRows.length ? "v100SignalAlert" : ""}><small>PERLU PERHATIAN</small><strong>{reminderRows.length}</strong><span>reminder / partial / terlambat</span></article>
        </div>
      </section>

      <section className="calendarKpis">
        <article>
          <small>Agenda Tahun Ini</small>
          <strong>{calendarRows.length}</strong>
          <span>{activeEstate?.name ?? "-"}</span>
        </article>
        <article>
          <small>Hari Ini</small>
          <strong>{todayRows.length}</strong>
          <span>{todayIso === `${context.selectedYear}-${pad(month)}-${pad(new Date().getUTCDate())}` ? "Bulan aktif" : "Agenda aktual"}</span>
        </article>
        <article className={reminderRows.length ? "calendarWarningKpi" : ""}>
          <small>Perlu Perhatian</small>
          <strong>{reminderRows.length}</strong>
          <span>Reminder / partial / terlambat</span>
        </article>
        <article>
          <small>Agenda Bulan</small>
          <strong>{monthRows.length}</strong>
          <span>{MONTHS[monthIndex]} {context.selectedYear}</span>
        </article>
      </section>

      <section className="calendarWorkspace">
        <div className="calendarMainPanel">
          <div className="calendarToolbar">
            <div>
              <span>KALENDER BULANAN</span>
              <h2>{MONTHS[monthIndex]} {context.selectedYear}</h2>
            </div>

            <div className="calendarNav">
              <Link href={prevHref} aria-label="Bulan sebelumnya">←</Link>
              <Link href={`/kalender?month=${new Date().getUTCMonth() + 1}`}>Hari Ini</Link>
              <Link href={nextHref} aria-label="Bulan berikutnya">→</Link>
            </div>
          </div>

          <div className="calendarWeekHead">
            {DAYS.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="calendarGrid">
            {cells.map((cell, index) => {
              if (!cell.iso || !cell.day) {
                return <div className="calendarCell emptyCalendarCell" key={`empty-${index}`} />;
              }

              const dayRows = calendarRows.filter(
                (row) => row.plan.planned_date === cell.iso,
              );
              const isToday = cell.iso === todayIso;
              const isSelected = selectedDate === cell.iso;

              return (
                <Link
                  href={`/kalender?month=${month}&date=${cell.iso}`}
                  className={`calendarCell ${isToday ? "todayCell" : ""} ${isSelected ? "selectedCell" : ""}`}
                  key={cell.iso}
                >
                  <div className="calendarDayTop">
                    <b>{cell.day}</b>
                    {dayRows.length ? <span>{dayRows.length}</span> : null}
                  </div>

                  <div className="calendarEvents">
                    {dayRows.slice(0, 3).map((row) => (
                      <div className={`calendarEvent event-${row.status.toLowerCase().replace(" ", "-")}`} key={row.plan.id}>
                        <span><AppIcon name={planIcon(row.plan.type)} /></span>
                        <b>{row.plan.type}</b>
                      </div>
                    ))}
                    {dayRows.length > 3 ? <small>+{dayRows.length - 3} agenda</small> : null}
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="calendarLegend">
            {[
              ["Terjadwal", "Terjadwal"],
              ["Reminder", "Mendekati"],
              ["Sebagian", "Sebagian"],
              ["Terlambat", "Terlambat"],
              ["Selesai", "Selesai"],
            ].map(([status, label]) => (
              <span key={status} className={`legend-${status.toLowerCase()}`}>
                <i /> {label}
              </span>
            ))}
          </div>
        </div>

        <aside className="calendarSide">
          <section className="agendaCard">
            <div className="calendarSectionTitle">
              <span>AGENDA</span>
              <h2>{selectedDate ? idDate(selectedDate) : MONTHS[monthIndex]}</h2>
            </div>

            <div className="agendaList">
              {agendaRows
                .sort((a, b) => a.plan.planned_date.localeCompare(b.plan.planned_date))
                .map((row) => (
                  <Link href={`/rencana/${row.plan.id}`} className="agendaRow" key={row.plan.id}>
                    <span className="agendaIcon"><AppIcon name={planIcon(row.plan.type)} /></span>
                    <div>
                      <b>{row.plan.type} · {row.blockName}</b>
                      <small>
                        {idDate(row.plan.planned_date)} · {formatNumber(row.progress.actual)} / {formatNumber(row.progress.target)} {planActualUnit(row.plan)}
                      </small>
                    </div>
                    <em className={`agendaStatus status-${row.status.toLowerCase().replace(" ", "-")}`}>
                      {statusLabel(row.status)}
                    </em>
                  </Link>
                ))}

              {!agendaRows.length ? (
                <div className="emptyCalendarAgenda">
                  Tidak ada agenda {selectedDate ? "pada tanggal ini" : "di bulan ini"}.
                </div>
              ) : null}
            </div>

            {selectedDate ? (
              <Link href={`/kalender?month=${month}`} className="clearDateFilter">
                Tampilkan seluruh bulan
              </Link>
            ) : null}
          </section>

          <section className="reminderCard">
            <div className="calendarSectionTitle">
              <span>REMINDER IN-APP</span>
              <h2>Perlu Perhatian</h2>
            </div>

            <div className="reminderList">
              {reminderRows.slice(0, 5).map((row) => (
                <Link href={`/rencana/${row.plan.id}`} className="reminderRow" key={row.plan.id}>
                  <div>
                    <b><AppIcon name={planIcon(row.plan.type)} /> {row.plan.type} · {row.blockName}</b>
                    <small>
                      Rencana {idDate(row.plan.planned_date)}
                      {row.status === "Reminder"
                        ? ` · reminder mulai ${idDate(row.reminderStart)}`
                        : ""}
                    </small>
                  </div>
                  <span className={`agendaStatus status-${row.status.toLowerCase().replace(" ", "-")}`}>
                    {statusLabel(row.status)}
                  </span>
                </Link>
              ))}

              {!reminderRows.length ? (
                <div className="calendarAllGood">Tidak ada agenda yang perlu perhatian.</div>
              ) : null}
            </div>
          </section>

          <section className="upcomingCard">
            <div className="calendarSectionTitle">
              <span>AGENDA MENDATANG</span>
              <h2>Berikutnya</h2>
            </div>

            <div className="upcomingList">
              {upcomingRows.map((row) => (
                <Link href={`/rencana/${row.plan.id}`} key={row.plan.id}>
                  <span><AppIcon name={planIcon(row.plan.type)} /></span>
                  <div>
                    <b>{row.plan.type} · {row.blockName}</b>
                    <small>{idDate(row.plan.planned_date)}</small>
                  </div>
                </Link>
              ))}

              {!upcomingRows.length ? (
                <div className="emptyCalendarAgenda">Belum ada agenda mendatang.</div>
              ) : null}
            </div>
          </section>
        </aside>
      </section>

      <section className="calendarIntegrityNote">
        <span>v10.0 OPERATIONAL CALENDAR</span>
        <b>
          Kalender tidak membuat transaksi baru. Semua agenda berasal dari tabel plans;
          progress tetap dihitung dari actual ber-plan_id.
        </b>
      </section>
    </div>
  );
}
