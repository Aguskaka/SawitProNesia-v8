import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appContextCookieNames } from "@/lib/context/server-context";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    selectedYear?: number;
    activeEstateId?: string | null;
  };

  const cookieStore = await cookies();

  if (body.selectedYear !== undefined) {
    const year = Number(body.selectedYear);
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Tahun tidak valid." }, { status: 400 });
    }
    cookieStore.set(appContextCookieNames.year, String(year), {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365 * 5,
    });
  }

  if (body.activeEstateId !== undefined) {
    if (body.activeEstateId) {
      cookieStore.set(appContextCookieNames.estate, body.activeEstateId, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365 * 5,
      });
    } else {
      cookieStore.delete(appContextCookieNames.estate);
    }
  }

  return NextResponse.json({ ok: true });
}
