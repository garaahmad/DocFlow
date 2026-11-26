import { cookies } from "next/headers";
import { z } from "zod";
import {
  authorizeWorkspace,
  checkOrigin,
  context,
  requireUser,
  outcome,
  ServiceError,
} from "@/lib/access";
import { appUrl } from "@/lib/auth";
import { db } from "@/lib/db";
import { upload, byId, mutateDocument } from "@/lib/document-service";
import { signFile } from "@/lib/storage";
import { exportDocuments } from "@/lib/exports";
import { rangeFrom, rangeSchema } from "@/lib/analytics";
import { invite, accept, updateMember } from "@/lib/team";
import { ask } from "@/lib/ai/insights";
import { billingLink } from "@/lib/billing";
import { throttle } from "@/lib/rate-limit";
import { readJson } from "@/lib/request-body";

type Params = { params: Promise<{ route: string[] }> };
const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const id = z.string().max(64).min(1);
const role = z.enum(["ADMIN", "MEMBER", "VIEWER"]);
const workspaceSchema = z.object({
  name: z.string().trim().min(2).max(70),
  business: z.enum([
    "Freelancer",
    "Accounting",
    "Agency",
    "Operations",
    "Other",
  ]),
  locale: z.enum(["en", "ar"]),
  currency: z.string().regex(/^[A-Z]{3}$/),
});
function parse<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success)
    throw new ServiceError(422, "Check the form fields and try again.");
  return result.data;
}
async function selectWorkspace(workspaceId: string) {
  (await cookies()).set("docflow-workspace", workspaceId, {
    httpOnly: true,
    secure: appUrl().startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
export async function GET(request: Request, params: Params) {
  try {
    const [resource, key, item, ...rest] = (await params.params).route;
    if (rest.length) throw new ServiceError(404, "Resource not found.");
    const { workspaceId } = await context();
    const search = new URL(request.url).searchParams;
    if (resource === "documents" && key && item === "file") {
      const doc = await byId(workspaceId, key);
      const url = await signFile(
        doc.storageKey,
        doc.filename,
        doc.mime,
        search.get("download") === "1" ||
          (doc.mime === "application/pdf" && search.get("inline") !== "1"),
      );
      return new Response(null, {
        status: 302,
        headers: { Location: url, "Cache-Control": "private, no-store" },
      });
    }
    if (resource === "documents" && key && !item) {
      const document = await byId(workspaceId, key);
      return json({
        id: document.id,
        status: document.status,
        error: document.error,
        version: document.version,
      });
    }
    if (resource === "export" && (key === "csv" || key === "xlsx") && !item) {
      const range =
        search.has("from") || search.has("to")
          ? rangeFrom(
              search.get("from") ?? undefined,
              search.get("to") ?? undefined,
            )
          : undefined;
      return await exportDocuments(
        workspaceId,
        key,
        range,
        search.get("kind") === "invoice",
      );
    }
    throw new ServiceError(404, "Resource not found.");
  } catch (error) {
    return outcome(error);
  }
}
export async function POST(request: Request, params: Params) {
  try {
    checkOrigin(request);
    const [resource, key, ...rest] = (await params.params).route;
    if (rest.length) throw new ServiceError(404, "Resource not found.");
    if (resource === "create" && !key) {
      const user = await requireUser();
      await throttle(user.id, "create");
      const data = parse(workspaceSchema, await readJson(request));
      const workspace = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "user" WHERE id=${user.id} FOR UPDATE`;
        const count = await tx.membership.count({
          where: { userId: user.id, role: "OWNER" },
        });
        if (count >= 5)
          throw new ServiceError(409, "You can own up to five workspaces.");
        return tx.workspace.create({
          data: {
            ...data,
            members: { create: { userId: user.id, role: "OWNER" } },
            events: {
              create: { actorId: user.id, action: "workspace.created" },
            },
          },
        });
      });
      await selectWorkspace(workspace.id);
      (await cookies()).set("docflow-language", data.locale, {
        sameSite: "lax",
        path: "/",
        maxAge: 31536000,
      });
      return json({ id: workspace.id }, 201);
    }
    if (resource === "switch" && !key) {
      const user = await requireUser();
      const data = parse(
        z.object({ workspaceId: id }),
        await readJson(request),
      );
      const member = await authorizeWorkspace(user.id, data.workspaceId);
      await selectWorkspace(member.workspaceId);
      return json({ ok: true });
    }
    if (resource === "accept" && !key) {
      const user = await requireUser();
      const { token } = parse(
        z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }),
        await readJson(request),
      );
      await selectWorkspace(await accept(token, user));
      return json({ ok: true });
    }
    if (resource === "upload" && !key) {
      const { workspaceId, user } = await context("write");
      await throttle(user.id, "upload");
      return json(await upload(request, workspaceId, user.id), 201);
    }
    if (resource === "documents" && key) {
      const { workspaceId, user } = await context("write");
      await throttle(user.id, "document");
      await mutateDocument(workspaceId, user.id, key, await readJson(request));
      return json({ ok: true });
    }
    if (resource === "assistant" && !key) {
      const { workspace, user } = await context("read");
      const data = parse(
        z.object({
          question: z.string().trim().min(3).max(600),
          history: z.array(z.string().max(600)).max(4).default([]),
          documentId: id.optional(),
          range: rangeSchema.optional(),
        }),
        await readJson(request),
      );
      if (data.documentId) await byId(workspace.id, data.documentId);
      if (
        data.range &&
        Date.parse(data.range.to) - Date.parse(data.range.from) > 366 * 86400000
      )
        throw new ServiceError(422, "Select up to a year of data.");
      const { workspaceId } = await authorizeWorkspace(
        user.id,
        workspace.id,
        "write",
      );
      await throttle(user.id, "assistant");
      return json(
        await ask(
          workspaceId,
          workspace.currency,
          data.question,
          data.history,
          data.documentId,
          data.range,
        ),
      );
    }
    if (resource === "invite" && !key) {
      const { workspaceId, user, role: actor } = await context("manage");
      const data = parse(
        z.object({ email: z.email().max(250), role }),
        await readJson(request),
      );
      await throttle(user.id, "invite");
      return json(
        await invite(
          workspaceId,
          user.id,
          actor,
          data.email.toLowerCase(),
          data.role,
        ),
      );
    }
    if (resource === "members" && key) {
      const { workspaceId, user, role: actor } = await context("manage");
      const data = parse(
        z.object({ role: role.optional() }),
        await readJson(request),
      );
      await updateMember(workspaceId, user.id, actor, key, data.role);
      return json({ ok: true });
    }
    if (resource === "billing" && !key) {
      const { workspaceId, user } = await context("bill");
      const data = parse(
        z.object({ plan: z.enum(["pro", "business", "portal"]) }),
        await readJson(request),
      );
      await throttle(user.id, "billing");
      return json({
        url: await billingLink(workspaceId, user.email, data.plan),
      });
    }
    if (resource === "settings" && !key) {
      const { workspaceId, user } = await context("manage");
      const data = parse(workspaceSchema, await readJson(request));
      await db.$transaction([
        db.workspace.update({ where: { id: workspaceId }, data }),
        db.auditEvent.create({
          data: { workspaceId, actorId: user.id, action: "workspace.updated" },
        }),
      ]);
      (await cookies()).set("docflow-language", data.locale, {
        sameSite: "lax",
        path: "/",
        maxAge: 31536000,
      });
      return json({ ok: true });
    }
    if (resource === "reports" && !key) {
      const { workspaceId, user } = await context("write");
      const data = parse(
        z.object({
          name: z.string().trim().min(2).max(70),
          range: rangeSchema,
        }),
        await readJson(request),
      );
      if (
        Date.parse(data.range.to) - Date.parse(data.range.from) >
        366 * 86400000
      )
        throw new ServiceError(422, "Select up to a year of data.");
      await db.$transaction(async (tx) => {
        if ((await tx.report.count({ where: { workspaceId } })) >= 50)
          throw new ServiceError(409, "Save up to 50 reports per workspace.");
        const saved = await tx.report.create({
          data: {
            workspaceId,
            name: data.name,
            from: new Date(data.range.from),
            to: new Date(data.range.to),
          },
        });
        await tx.auditEvent.create({
          data: {
            workspaceId,
            actorId: user.id,
            action: "report.saved",
            targetId: saved.id,
          },
        });
      });
      return json({ ok: true }, 201);
    }
    throw new ServiceError(404, "Resource not found.");
  } catch (error) {
    return outcome(error);
  }
}
