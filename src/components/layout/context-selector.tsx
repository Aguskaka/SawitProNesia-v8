"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type EstateOption = { id: string; name: string };

export function ContextSelector({
  estates,
  selectedYear,
  activeEstateId,
}: {
  estates: EstateOption[];
  selectedYear: number;
  activeEstateId: string | null;
}) {
  const router = useRouter();
  const [year, setYear] = useState(selectedYear);
  const [estateId, setEstateId] = useState(activeEstateId ?? estates[0]?.id ?? "");
  const [pending, startTransition] = useTransition();

  async function save(nextYear: number, nextEstateId: string) {
    await fetch("/api/context", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        selectedYear: nextYear,
        activeEstateId: nextEstateId || null,
      }),
    });

    startTransition(() => router.refresh());
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 3 + i);

  return (
    <div className={`heroContext ${pending ? "isPending" : ""}`}>
      <label className="estateSelector">
        <span>Kebun Aktif</span>
        <select
          value={estateId}
          onChange={(event) => {
            const next = event.target.value;
            setEstateId(next);
            void save(year, next);
          }}
        >
          {estates.map((estate) => (
            <option key={estate.id} value={estate.id}>
              {estate.name}
            </option>
          ))}
        </select>
      </label>

      <label className="yearSelector">
        <span>Tahun Global</span>
        <select
          value={year}
          onChange={(event) => {
            const next = Number(event.target.value);
            setYear(next);
            void save(next, estateId);
          }}
        >
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
