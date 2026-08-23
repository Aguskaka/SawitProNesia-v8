import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { appContextCookieNames } from "@/lib/context/server-context";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
      if (!uuidPattern.test(body.activeEstateId)) {
        return NextResponse.json({ error: "ID kebun tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
      }
      cookieStore.set(appContextCookieNames.estate, body.activeEstateId, {
        path: "/",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365 * 5,
      });
    } else {
      cookieStore.delete(appContextCookieNames.estate);
    }
  }

  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
