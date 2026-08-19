import Link from "next/link";
import type { ReactNode } from "react";
import { ContextSelector } from "@/components/layout/context-selector";
import { logout } from "@/app/(auth)/login/actions";

export function DashboardShell({
  children,
  estates,
  selectedYear,
  activeEstateId,
}: {
  children: ReactNode;
  estates: { id: string; name: string }[];
  selectedYear: number;
  activeEstateId: string | null;
}) {
  return (
    <div className="appShell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brandIcon">🌴</span>
          <span>
            <b>SawitProNesia</b>
            <small>v8 Foundation</small>
          </span>
        </Link>

        <ContextSelector
          estates={estates}
          selectedYear={selectedYear}
          activeEstateId={activeEstateId}
        />

        <form action={logout}>
          <button className="ghostButton" type="submit">Keluar</button>
        </form>
      </header>

      <nav className="mainNav">
        <Link href="/">Home</Link>
        <span className="disabledNav">Kebun</span>
        <span className="disabledNav">Rencana</span>
        <span className="disabledNav">Kalender</span>
        <span className="disabledNav">Laporan</span>
        <span className="disabledNav">Analytics</span>
      </nav>

      <main className="content">{children}</main>
    </div>
  );
}
