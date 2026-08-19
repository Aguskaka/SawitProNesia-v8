export async function GET() {
  return Response.json({
    app: "SawitProNesia",
    version: "8.0.0",
    status: "ok",
  });
}
