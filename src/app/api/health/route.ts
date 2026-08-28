export async function GET() {
  return Response.json(
    { app: "SawitProNesia", version: "11.2.0", status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
