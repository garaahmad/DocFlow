import { randomUUID } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { ServiceError } from "@/lib/access";
import {
  extractionSchema,
  indexing,
  inspectFile,
  maxFileBytes,
  validateInvoice,
  issuesSchema,
} from "@/lib/documents";
import { aiReady, mockEnabled } from "@/lib/ai/clients";
import { putFile, removeFile } from "@/lib/storage";
import { reserve } from "@/lib/usage";
import { readBytes } from "@/lib/request-body";

export async function byId(workspaceId: string, id: string) {
  const doc = await db.document.findFirst({
    where: { id, workspaceId, status: { not: "DELETING" } },
  });
  if (!doc) throw new ServiceError(404, "Document not found.");
  return doc;
}

export async function upload(
  request: Request,
  workspaceId: string,
  userId: string,
) {
  if (!aiReady("EXTRACTION") && !mockEnabled())
    throw new ServiceError(
      503,
      "Document extraction is unavailable. Configure the extraction Gemini key.",
    );
  let filename: string;
  try {
    filename = decodeURIComponent(request.headers.get("x-file-name") ?? "")
      .replace(/[\u0000-\u001f\u007f/\\]/g, "")
      .trim()
      .slice(0, 200);
  } catch {
    throw new ServiceError(400, "Invalid filename.");
  }
  if (!filename) throw new ServiceError(400, "A filename is required.");
  const bytes = await readBytes(request, maxFileBytes);
  let metadata: ReturnType<typeof inspectFile>;
  try {
    metadata = inspectFile(bytes, request.headers.get("content-type") ?? "");
  } catch (error) {
    throw new ServiceError(
      415,
      error instanceof Error ? error.message : "Unsupported file.",
    );
  }
  if (
    await db.document.findUnique({
      where: { workspaceId_hash: { workspaceId, hash: metadata.hash } },
      select: { id: true },
    })
  )
    throw new ServiceError(409, "This file is already in your workspace.");
  const storageKey = workspaceId + "/" + randomUUID();
  await putFile(storageKey, bytes, metadata.mime);
  try {
    const doc = await db.$transaction(async (tx) => {
      await reserve(tx, workspaceId, "uploads");
      const saved = await tx.document.create({
        data: {
          workspaceId,
          filename,
          storageKey,
          bytes: bytes.length,
          ...metadata,
        },
      });
      await tx.auditEvent.create({
        data: {
          workspaceId,
          actorId: userId,
          action: "document.uploaded",
          targetId: saved.id,
        },
      });
      return saved;
    });
    return { id: doc.id, status: doc.status };
  } catch (error) {
    const committed = await db.document
      .findUnique({ where: { storageKey }, select: { id: true, status: true } })
      .catch(() => undefined);
    if (committed) return committed;
    if (committed === null)
      await removeFile(storageKey).catch(() =>
        console.error(
          JSON.stringify({ event: "orphan_upload_cleanup_failed" }),
        ),
      );
    if (Reflect.get(Object(error), "code") === "P2002")
      throw new ServiceError(409, "This file is already in your workspace.");
    throw error;
  }
}

const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.enum(["save", "approve"]),
    version: z.number().int().nonnegative(),
    data: extractionSchema,
  }),
  z.object({
    action: z.enum(["reject", "reprocess", "cancel", "delete"]),
    version: z.number().int().nonnegative(),
  }),
]);

export async function mutateDocument(
  workspaceId: string,
  userId: string,
  id: string,
  body: unknown,
) {
  const parsed = mutationSchema.safeParse(body);
  if (!parsed.success)
    throw new ServiceError(
      422,
      "Check the document fields and use dates and decimal amounts in the indicated format.",
    );
  const payload = parsed.data;
  const doc = await byId(workspaceId, id);
  if (doc.version !== payload.version)
    throw new ServiceError(
      409,
      "This document changed. Refresh before continuing.",
    );
  const review = doc.status === "NEEDS_REVIEW";
  const canReprocess =
    ["NEEDS_REVIEW", "FAILED", "REJECTED", "CANCELED"].includes(doc.status) &&
    !doc.approved;
  const canCancel = ["UPLOADED", "QUEUED", "PROCESSING"].includes(doc.status);
  if (
    (["save", "approve", "reject"].includes(payload.action) && !review) ||
    (payload.action === "reprocess" && !canReprocess) ||
    (payload.action === "cancel" && !canCancel) ||
    (payload.action === "delete" && doc.status === "PROCESSING")
  )
    throw new ServiceError(
      409,
      "This action is unavailable for the current document status.",
    );
  if (
    payload.action === "reprocess" &&
    !aiReady("EXTRACTION") &&
    !mockEnabled()
  )
    throw new ServiceError(
      503,
      "Configure the extraction Gemini key before reprocessing.",
    );

  await db.$transaction(async (tx) => {
    const identity = {
      id,
      workspaceId,
      version: payload.version,
      status: doc.status,
    };
    let changed;
    if ("data" in payload) {
      const data = {
        ...payload.data,
        evidence:
          extractionSchema.safeParse(doc.extracted).data?.evidence ?? [],
      };
      const columns = indexing(data);
      const duplicate = Boolean(
        columns.vendorKey &&
        columns.reference &&
        (await tx.document.findFirst({
          where: {
            workspaceId,
            id: { not: id },
            vendorKey: columns.vendorKey,
            reference: { equals: columns.reference, mode: "insensitive" },
            status: { in: ["NEEDS_REVIEW", "COMPLETED"] },
          },
          select: { id: true },
        })),
      );
      const existing = issuesSchema.safeParse(doc.findings).data ?? [];
      const deterministic = validateInvoice(data, duplicate);
      const previousTypes = new Set(
        validateInvoice(
          extractionSchema.safeParse(doc.edited ?? doc.extracted).data ?? data,
          true,
          true,
        ).map((issue) => issue.type),
      );
      const findings = [
        ...deterministic,
        ...existing.filter((issue) => !previousTypes.has(issue.type)),
      ].slice(0, 20);
      changed = await tx.document.updateMany({
        where: identity,
        data: {
          ...columns,
          edited: data,
          findings,
          version: { increment: 1 },
          ...(payload.action === "approve"
            ? { status: "COMPLETED", approved: data }
            : {}),
        },
      });
      if (changed.count)
        await tx.documentRevision.create({
          data: {
            documentId: id,
            actorId: userId,
            action: payload.action,
            value: data,
          },
        });
    } else {
      if (payload.action === "reprocess")
        await reserve(tx, workspaceId, "retries");
      const status = {
        reject: "REJECTED",
        reprocess: "UPLOADED",
        cancel: "CANCELED",
        delete: "DELETING",
      } as const;
      changed = await tx.document.updateMany({
        where: identity,
        data: {
          status: status[payload.action],
          version: { increment: 1 },
          ...(["reprocess", "cancel"].includes(payload.action)
            ? { leaseId: null, leaseUntil: null, error: null }
            : {}),
          ...(payload.action === "reprocess"
            ? { attempt: { increment: 1 } }
            : {}),
        },
      });
      if (changed.count && payload.action === "reject")
        await tx.documentRevision.create({
          data: { documentId: id, actorId: userId, action: "reject" },
        });
    }
    if (!changed.count)
      throw new ServiceError(
        409,
        "This document changed. Refresh before continuing.",
      );
    await tx.auditEvent.create({
      data: {
        workspaceId,
        actorId: userId,
        action: "document." + payload.action,
        targetId: id,
      },
    });
  });
}
