import { cookies } from "next/headers";

const YEAR_COOKIE = "spn_v8_year";
const ESTATE_COOKIE = "spn_v8_estate";

export async function getAppContext() {
  const cookieStore = await cookies();
  const nowYear = new Date().getFullYear();
  const rawYear = Number(cookieStore.get(YEAR_COOKIE)?.value ?? nowYear);

  return {
    selectedYear:
      Number.isInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100 ? rawYear : nowYear,
    activeEstateId: cookieStore.get(ESTATE_COOKIE)?.value ?? null,
  };
}

export const appContextCookieNames = {
  year: YEAR_COOKIE,
  estate: ESTATE_COOKIE,
} as const;
