import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { canManageRole, type Role } from "@/lib/permissions";
import { ServiceError } from "@/lib/access";
import { getPlan } from "@/lib/usage";
import { plans } from "@/lib/plans";
import { appUrl } from "@/lib/auth";
import { sendLink, emailEnabled } from "@/lib/email";
import type { Prisma } from "@/generated/prisma/client";

const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function lockWorkspace(
  tx: Prisma.TransactionClient,
  workspaceId: string,
) {
  await tx.$queryRaw`SELECT id FROM "Workspace" WHERE id=${workspaceId} FOR UPDATE`;
}
export async function invite(
  workspaceId: string,
  userId: string,
  actor: Role,
  email: string,
  role: Role,
) {
  if (!canManageRole(actor, role))
    throw new ServiceError(403, "You cannot assign this role.");
  const token = randomBytes(32).toString("base64url");
  const expired = new Date(Date.now() + 7 * 86400000);
  await db.$transaction(async (tx) => {
    await lockWorkspace(tx, workspaceId);
    const active = await tx.membership.count({ where: { workspaceId } });
    const pending = await tx.invitation.count({
      where: {
        workspaceId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
        email: { not: email },
      },
    });
    if (active + pending >= plans[await getPlan(workspaceId, tx)].seats)
      throw new ServiceError(
        409,
        "This workspace has reached its plan’s seat limit.",
      );
    await tx.invitation.deleteMany({
      where: { workspaceId, email, acceptedAt: null },
    });
    await tx.invitation.create({
      data: {
        workspaceId,
        email,
        role,
        tokenHash: hash(token),
        expiresAt: expired,
      },
    });
    await tx.auditEvent.create({
      data: { workspaceId, actorId: userId, action: "team.invited" },
    });
  });
  const url = appUrl() + "/invite/" + token;
  let delivered = false;
  if (emailEnabled) {
    try {
      await sendLink(email, "Join a workspace on DocFlow AI", url);
      delivered = true;
    } catch {
      /* Return invite URL for direct sharing. */
    }
  }
  return { url, delivered };
}
export async function accept(
  token: string,
  user: { id: string; email: string; emailVerified: boolean },
) {
  if (emailEnabled && !user.emailVerified)
    throw new ServiceError(403, "Verify your email to join a workspace.");
  const workspaceId = await db.$transaction(async (tx) => {
    const invitation = await tx.invitation.findUnique({
      where: { tokenHash: hash(token) },
    });
    if (
      !invitation ||
      invitation.email !== user.email.toLowerCase() ||
      invitation.acceptedAt ||
      invitation.expiresAt <= new Date()
    )
      throw new ServiceError(
        404,
        "This invitation is unavailable for your account.",
      );
    await lockWorkspace(tx, invitation.workspaceId);
    const current = await tx.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
        },
      },
    });
    const consumed = await tx.invitation.updateMany({
      where: {
        id: invitation.id,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { acceptedAt: new Date() },
    });
    if (!consumed.count)
      throw new ServiceError(409, "This invitation has already been used.");
    if (!current) {
      const active = await tx.membership.count({
        where: { workspaceId: invitation.workspaceId },
      });
      if (active >= plans[await getPlan(invitation.workspaceId, tx)].seats)
        throw new ServiceError(
          409,
          "This workspace has reached its seat limit.",
        );
      await tx.membership.create({
        data: {
          workspaceId: invitation.workspaceId,
          userId: user.id,
          role: invitation.role,
        },
      });
      await tx.auditEvent.create({
        data: {
          workspaceId: invitation.workspaceId,
          actorId: user.id,
          action: "team.joined",
        },
      });
    }
    return invitation.workspaceId;
  });
  return workspaceId;
}
export async function updateMember(
  workspaceId: string,
  actorId: string,
  actor: Role,
  targetId: string,
  role?: Role,
) {
  await db.$transaction(async (tx) => {
    await lockWorkspace(tx, workspaceId);
    const where = { workspaceId_userId: { workspaceId, userId: targetId } };
    const target = await tx.membership.findUnique({ where });
    if (
      !target ||
      actorId === targetId ||
      !canManageRole(actor, target.role, role)
    )
      throw new ServiceError(403, "You cannot change this membership.");
    if (role) await tx.membership.update({ where, data: { role } });
    else await tx.membership.delete({ where });
    await tx.auditEvent.create({
      data: {
        workspaceId,
        actorId,
        action: role ? "team.role_changed" : "team.removed",
        targetId,
      },
    });
  });
}
