import "dotenv/config";
import { afterAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { authorizeWorkspace } from "@/lib/access";
import { monthKey, reserve } from "@/lib/usage";

const integration =
  process.env.DOCFLOW_INTEGRATION === "true" ? describe : describe.skip;
integration("PostgreSQL integration", () => {
  const cleanup: string[] = [];
  afterAll(async () => {
    await db.user.deleteMany({ where: { id: { in: cleanup } } });
    await db.$disconnect();
  });
  it("enforces membership and concurrent quota using real transactions", async () => {
    const account = await db.user.create({
      data: {
        id: randomUUID(),
        email: randomUUID() + "@example.test",
        name: "Integration user",
      },
    });
    cleanup.push(account.id);
    const workspace = await db.workspace.create({
      data: {
        name: "Integration workspace",
        business: "Other",
        locale: "en",
        currency: "USD",
        members: { create: { userId: account.id, role: "VIEWER" } },
      },
    });
    try {
      await expect(
        authorizeWorkspace(account.id, workspace.id),
      ).resolves.toHaveProperty("role", "VIEWER");
      await expect(
        authorizeWorkspace(account.id, workspace.id, "write"),
      ).rejects.toHaveProperty("status", 403);
      await expect(
        authorizeWorkspace(randomUUID(), workspace.id),
      ).rejects.toHaveProperty("status", 403);
      const period = monthKey();
      await db.usage.create({
        data: { workspaceId: workspace.id, period, uploads: 29 },
      });
      const concurrent = await Promise.allSettled(
        Array.from({ length: 5 }, () =>
          db.$transaction((tx) => reserve(tx, workspace.id, "uploads")),
        ),
      );
      expect(
        concurrent.filter((result) => result.status === "fulfilled"),
      ).toHaveLength(1);
      expect(
        await db.usage.findUnique({
          where: { workspaceId_period: { workspaceId: workspace.id, period } },
        }),
      ).toHaveProperty("uploads", 30);
    } finally {
      await db.workspace.delete({ where: { id: workspace.id } });
    }
  });
});
