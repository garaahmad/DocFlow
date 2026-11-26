import { db } from "@/lib/db";
import { type Prisma } from "@/generated/prisma/client";
import { ServiceError } from "@/lib/access";
import { planCode, plans } from "@/lib/plans";

export function monthKey(now = new Date()) {
  return now.toISOString().slice(0, 7);
}
type Counter = "uploads" | "retries" | "insightRequests";
export async function getPlan(
  workspaceId: string,
  tx: Prisma.TransactionClient = db,
) {
  const subscription = await tx.subscription.findUnique({
    where: { workspaceId },
  });
  return planCode(subscription?.plan, subscription?.status);
}
export async function reserve(
  tx: Prisma.TransactionClient,
  workspaceId: string,
  counter: Counter,
) {
  const period = monthKey();
  const plan = plans[await getPlan(workspaceId, tx)];
  const limit = {
    uploads: plan.documents,
    retries: plan.retries,
    insightRequests: plan.insights,
  }[counter];
  await tx.$executeRaw`INSERT INTO "Usage" ("workspaceId","period") VALUES (${workspaceId},${period}) ON CONFLICT DO NOTHING`;
  const update = await tx.usage.updateMany({
    where: { workspaceId, period, [counter]: { lt: limit } },
    data: { [counter]: { increment: 1 } },
  });
  if (!update.count)
    throw new ServiceError(
      429,
      "Your workspace has reached its monthly limit for this action.",
    );
  return period;
}
