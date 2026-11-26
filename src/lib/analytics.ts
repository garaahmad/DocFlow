import { db } from "@/lib/db";
import { z } from "zod";

export function utcMonth(offset = 0, now = new Date()) {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1),
  );
}
export const rangeSchema = z
  .object({ from: z.iso.date(), to: z.iso.date() })
  .refine((d) => d.from <= d.to);
export function rangeFrom(from?: string, to?: string) {
  const fallback = {
    from: utcMonth(-5).toISOString().slice(0, 10),
    to: new Date().toISOString().slice(0, 10),
  };
  const range = rangeSchema.safeParse({ from, to });
  if (!range.success) return fallback;
  const span = Date.parse(range.data.to) - Date.parse(range.data.from);
  return span > 366 * 86400000 ? fallback : range.data;
}
export function dateWindow(range: { from: string; to: string }) {
  return {
    gte: new Date(range.from),
    lt: new Date(Date.parse(range.to) + 86400000),
  };
}

type Spend = { currency: string; total: string; count: number };
export async function summary(
  workspaceId: string,
  range: { from: string; to: string },
  preferCurrency: string,
) {
  const window = dateWindow(range);
  const [
    statuses,
    latest,
    events,
    totals,
    byVendor,
    byCategory,
    activity,
    spending,
  ] = await Promise.all([
    db.document.groupBy({
      by: ["status"],
      where: { workspaceId, status: { not: "DELETING" } },
      _count: { _all: true },
    }),
    db.document.findMany({
      where: { workspaceId, status: { not: "DELETING" } },
      orderBy: { createdAt: "desc" },
      take: 7,
    }),
    db.auditEvent.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    db.$queryRaw<
      Spend[]
    >`SELECT currency, sum(total)::text AS total, count(*)::int AS count FROM "Document" WHERE "workspaceId"=${workspaceId} AND status='COMPLETED' AND kind IN ('Invoice','Receipt') AND "issuedOn">=${window.gte} AND "issuedOn"<${window.lt} AND currency IS NOT NULL AND total IS NOT NULL GROUP BY currency ORDER BY currency`,
    db.$queryRaw<
      (Spend & { name: string })[]
    >`SELECT coalesce(max(vendor),'Unknown vendor') AS name, currency, sum(total)::text AS total, count(*)::int AS count FROM "Document" WHERE "workspaceId"=${workspaceId} AND status='COMPLETED' AND kind IN ('Invoice','Receipt') AND "issuedOn">=${window.gte} AND "issuedOn"<${window.lt} AND currency IS NOT NULL AND total IS NOT NULL GROUP BY "vendorKey", currency ORDER BY currency, sum(total) DESC LIMIT 200`,
    db.$queryRaw<
      (Spend & { name: string })[]
    >`SELECT coalesce(approved->>'category','Uncategorized') AS name, currency, sum(total)::text AS total, count(*)::int AS count FROM "Document" WHERE "workspaceId"=${workspaceId} AND status='COMPLETED' AND kind IN ('Invoice','Receipt') AND "issuedOn">=${window.gte} AND "issuedOn"<${window.lt} AND currency IS NOT NULL AND total IS NOT NULL GROUP BY name, currency ORDER BY currency, sum(total) DESC LIMIT 200`,
    db.$queryRaw<
      { month: string; count: number; processed: number; exceptions: number }[]
    >`SELECT to_char("createdAt" AT TIME ZONE 'UTC','YYYY-MM') AS month, count(*)::int AS count, (count(*) filter (where extracted IS NOT NULL))::int AS processed, (count(*) filter (where status IN ('NEEDS_REVIEW','FAILED','REJECTED')))::int AS exceptions FROM "Document" WHERE "workspaceId"=${workspaceId} AND status!='DELETING' AND "createdAt">=${window.gte} AND "createdAt"<${window.lt} GROUP BY month ORDER BY month`,
    db.$queryRaw<
      (Spend & { month: string })[]
    >`SELECT to_char("issuedOn",'YYYY-MM') AS month, currency, sum(total)::text AS total, count(*)::int AS count FROM "Document" WHERE "workspaceId"=${workspaceId} AND status='COMPLETED' AND kind IN ('Invoice','Receipt') AND "issuedOn">=${window.gte} AND "issuedOn"<${window.lt} AND currency IS NOT NULL AND total IS NOT NULL GROUP BY month,currency ORDER BY month,currency`,
  ]);
  const buckets = new Map(statuses.map((s) => [s.status, s._count._all]));
  const processed =
    (buckets.get("NEEDS_REVIEW") ?? 0) +
    (buckets.get("COMPLETED") ?? 0) +
    (buckets.get("REJECTED") ?? 0);
  const failed = buckets.get("FAILED") ?? 0;
  const currency =
    totals.find((x) => x.currency === preferCurrency)?.currency ??
    totals[0]?.currency ??
    preferCurrency;
  const months = [];
  for (
    const date = new Date(range.from.slice(0, 7) + "-01T00:00:00Z");
    date < window.lt;
    date.setUTCMonth(date.getUTCMonth() + 1)
  ) {
    const month = date.toISOString().slice(0, 7);
    const counts = activity.find((row) => row.month === month);
    months.push({
      month,
      uploaded: counts?.count ?? 0,
      processed: counts?.processed ?? 0,
      exceptions: counts?.exceptions ?? 0,
      spend: Number(
        spending.find((row) => row.month === month && row.currency === currency)
          ?.total ?? 0,
      ),
    });
  }
  return {
    all: statuses.reduce((n, s) => n + s._count._all, 0),
    processed,
    failed,
    review: buckets.get("NEEDS_REVIEW") ?? 0,
    success:
      processed + failed
        ? Math.round((processed / (processed + failed)) * 100)
        : null,
    statuses,
    latest,
    events,
    totals,
    byVendor,
    byCategory,
    spending,
    months,
    currency,
    money: totals.find((x) => x.currency === currency)?.total ?? null,
  };
}
