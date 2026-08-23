export async function GET() {
  return Response.json(
    { app: "SawitProNesia", version: "11.0.1", status: "ok" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
