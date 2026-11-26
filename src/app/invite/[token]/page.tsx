import Link from "next/link";
import { notFound } from "next/navigation";
import { session } from "@/lib/access";
import { Brand } from "@/components/brand";
import { InvitationAccept } from "@/components/workspace-tools";
export default async function Invitation({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) notFound();
  const current = await session();
  return (
    <main className="prose">
      <Brand />
      <h1>Join a workspace</h1>
      <p>Sign in with the email address that received the invitation.</p>
      {current ? (
        <InvitationAccept token={token} />
      ) : (
        <Link
          className="button primary"
          href={"/login?next=" + encodeURIComponent("/invite/" + token)}
        >
          Sign in
        </Link>
      )}
    </main>
  );
}
