import { db } from "@/lib/db";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!process.env.DATABASE_URL)
    return Response.json({ status: "unavailable" }, { status: 503 });
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json(
      { status: "ok" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
