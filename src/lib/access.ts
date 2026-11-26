import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth, appUrl } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, type Permission } from "@/lib/permissions";

export class ServiceError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function session() {
  if (!process.env.BETTER_AUTH_SECRET) return null;
  return getAuth().api.getSession({ headers: await headers() });
}
export async function requireUser() {
  const current = await session();
  if (!current) throw new ServiceError(401, "Sign in to continue.");
  return current.user;
}
export async function memberships(userId: string) {
  return db.membership.findMany({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  });
}
export async function authorizeWorkspace(
  userId: string,
  workspaceId: string,
  permission: Permission = "read",
) {
  const member = await db.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    include: { workspace: true },
  });
  if (!member || !can(member.role, permission))
    throw new ServiceError(
      403,
      "You do not have access to this workspace action.",
    );
  return member;
}
export async function context(permission: Permission = "read") {
  const user = await requireUser();
  const selected = (await cookies()).get("docflow-workspace")?.value;
  const selectedMember = selected
    ? await db.membership.findUnique({
        where: {
          workspaceId_userId: { workspaceId: selected, userId: user.id },
        },
        select: { workspaceId: true },
      })
    : null;
  const first =
    selectedMember?.workspaceId ?? (await memberships(user.id))[0]?.workspaceId;
  if (!first) throw new ServiceError(403, "Create a workspace first.");
  return { user, ...(await authorizeWorkspace(user.id, first, permission)) };
}
export async function pageContext() {
  const current = await session();
  if (!current) redirect("/login");
  const user = current.user;
  const workspaces = await memberships(user.id);
  const selected = (await cookies()).get("docflow-workspace")?.value;
  const member =
    workspaces.find((w) => w.workspaceId === selected) ?? workspaces[0];
  if (!member) redirect("/onboarding");
  return { user, workspaces, ...member };
}
export function checkOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(appUrl()).origin)
    throw new ServiceError(403, "This request must come from DocFlow AI.");
}
export function outcome(error: unknown) {
  if (error instanceof ServiceError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof SyntaxError)
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  console.error(
    JSON.stringify({
      event: "request_failed",
      kind: error instanceof Error ? error.name : "unknown",
    }),
  );
  return Response.json(
    { error: "The request could not be completed. Try again." },
    { status: 500 },
  );
}
