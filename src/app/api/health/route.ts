export async function GET() {
  return Response.json(
    { app: "SawitProNesia", version: "11.1.3", status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
