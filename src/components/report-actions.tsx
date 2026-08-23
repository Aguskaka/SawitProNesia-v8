"use client";

type CsvValue = string | number;
type CsvRow = Record<string, CsvValue>;

function csvEscape(value: CsvValue) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

export function ReportActions({
  filename,
  summary,
  monthly,
  blocks,
}: {
  filename: string;
  summary: CsvRow[];
  monthly: CsvRow[];
  blocks: CsvRow[];
}) {
  function downloadCsv() {
    const sections: string[] = [];
    const append = (title: string, rows: CsvRow[]) => {
      if (!rows.length) return;
      const headers = Object.keys(rows[0]);
      sections.push(title);
      sections.push(headers.map(csvEscape).join(","));
      rows.forEach((row) => sections.push(headers.map((key) => csvEscape(row[key])).join(",")));
      sections.push("");
    };
    append("RINGKASAN", summary);
    append("BULANAN", monthly);
    append("PER BLOK", blocks);

    const blob = new Blob(["\ufeff" + sections.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${filename}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="v102ReportActions" aria-label="Aksi laporan">
      <button type="button" onClick={() => window.print()}>Cetak / PDF</button>
      <button type="button" onClick={downloadCsv}>Export CSV</button>
    </div>
  );
}
