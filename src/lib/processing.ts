import { randomUUID } from "node:crypto";
import { UnrecoverableError } from "bullmq";
import { db } from "@/lib/db";
import { indexing, validateInvoice } from "@/lib/documents";
import { readFile, removeFile } from "@/lib/storage";
import { extract } from "@/lib/ai/extraction";
import { clarify } from "@/lib/ai/validation";
import { aiReady, AiFailure, mockEnabled } from "@/lib/ai/clients";
import { Prisma } from "@/generated/prisma/client";
import { enqueue, type JobPayload } from "@/lib/queue";
import { getPlan } from "@/lib/usage";

const leaseMs = 180000;
export async function reconcile() {
  const stale = await db.document.findMany({
    where: { status: "DELETING" },
    take: 15,
  });
  for (const doc of stale) {
    try {
      await removeFile(doc.storageKey);
      await db.document.deleteMany({
        where: { id: doc.id, status: "DELETING" },
      });
    } catch {
      console.error(JSON.stringify({ event: "storage_delete_retry" }));
    }
  }
  await db.document.updateMany({
    where: { status: "PROCESSING", leaseUntil: { lt: new Date() } },
    data: { status: "QUEUED", leaseId: null, leaseUntil: null },
  });
  const queued = await db.document.findMany({
    where: { status: { in: ["UPLOADED", "QUEUED"] } },
    select: { id: true, attempt: true },
    orderBy: { updatedAt: "asc" },
    take: 75,
  });
  for (const job of queued) {
    await db.document.updateMany({
      where: { id: job.id, attempt: job.attempt, status: "UPLOADED" },
      data: { status: "QUEUED" },
    });
    await enqueue(job);
  }
}

export async function processDocument(
  { id, attempt }: JobPayload,
  retriesMade: number,
) {
  const leaseId = randomUUID();
  const claim = await db.document.updateMany({
    where: { id, attempt, status: "QUEUED" },
    data: {
      status: "PROCESSING",
      leaseId,
      leaseUntil: new Date(Date.now() + leaseMs),
      error: null,
    },
  });
  if (!claim.count) return;
  const doc = await db.document.findUniqueOrThrow({ where: { id } });
  const identity = { id, attempt, leaseId, status: "PROCESSING" as const };
  try {
    const bytes = await readFile(doc.storageKey);
    const data = await extract(doc.workspaceId, doc.mime, bytes);
    const columns = indexing(data);
    const existing = columns.vendorKey
      ? await db.document.findFirst({
          where: {
            workspaceId: doc.workspaceId,
            id: { not: id },
            vendorKey: columns.vendorKey,
            ...(data.reference
              ? { reference: { equals: data.reference, mode: "insensitive" } }
              : {}),
            status: { notIn: ["DELETING", "REJECTED", "CANCELED"] },
          },
          select: { vendor: true },
        })
      : null;
    const issues = validateInvoice(
      data,
      Boolean(existing && data.reference),
      Boolean(existing && existing.vendor !== data.vendor),
    );
    const isMock = mockEnabled();
    if (
      (await getPlan(doc.workspaceId)) !== "starter" &&
      (issues.length || process.env.GEMINI_VALIDATE_ALL === "true")
    ) {
      try {
        if (!isMock && !aiReady("VALIDATION"))
          throw new AiFailure("Validation key is missing.");
        issues.push(
          ...(await clarify(doc.workspaceId, doc.mime, bytes, data, issues)),
        );
      } catch {
        issues.push({
          type: "validation_unavailable",
          severity: "info",
          field: "document",
          explanation:
            "Gemini validation was unavailable. Deterministic checks completed.",
          action: "Review the source before approving.",
          evidence: null,
        });
      }
    }
    await db.$transaction(async (tx) => {
      const result = await tx.document.updateMany({
        where: identity,
        data: {
          ...columns,
          status: "NEEDS_REVIEW",
          mock: isMock,
          extracted: data,
          edited: Prisma.DbNull,
          findings: issues.slice(0, 20),
          leaseId: null,
          leaseUntil: null,
          version: { increment: 1 },
        },
      });
      if (result.count) {
        if (doc.extracted)
          await tx.documentRevision.create({
            data: {
              documentId: id,
              action: "previous_extraction",
              value: doc.extracted,
            },
          });
        await tx.auditEvent.create({
          data: {
            workspaceId: doc.workspaceId,
            action: isMock ? "document.mock_processed" : "document.processed",
            targetId: id,
          },
        });
      }
    });
  } catch (error) {
    const retryable = !(error instanceof AiFailure) || error.retryable;
    const again = retryable && retriesMade < 2;
    const message =
      error instanceof AiFailure
        ? error.message
        : "The stored document could not be processed.";
    await db.document.updateMany({
      where: identity,
      data: {
        status: again ? "QUEUED" : "FAILED",
        error: message,
        leaseId: null,
        leaseUntil: null,
      },
    });
    if (!retryable) throw new UnrecoverableError(message);
    throw new Error(message);
  }
}
