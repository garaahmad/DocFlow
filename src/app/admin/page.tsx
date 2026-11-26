import { notFound, redirect } from "next/navigation";
import { session } from "@/lib/access";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { db } from "@/lib/db";
import { Brand } from "@/components/brand";
import { plans } from "@/lib/plans";
import { PageHeading } from "@/components/app-shared";

export default async function Admin() {
  const current = await session();
  if (!current) redirect("/login");
  if (!isPlatformAdmin(current.user)) notFound();
  const [users, workspaces, documentStatuses, subscriptions, ai] =
    await Promise.all([
      db.user.count(),
      db.workspace.count(),
      db.document.groupBy({ by: ["status"], _count: true }),
      db.subscription.groupBy({ by: ["plan", "status"], _count: true }),
      db.aiUsage.groupBy({
        by: ["service"],
        _sum: { inputTokens: true, outputTokens: true, estimatedUsd: true },
        _count: true,
      }),
    ]);
  return (
    <main className="wrap admin-page">
      <Brand href="/dashboard" />
      <PageHeading
        title="Platform administration"
        subtitle="Service-wide operational and billing totals."
      />
      <div className="panel-grid">
        <section className="panel">
          <h2>Accounts</h2>
          <ul className="data-list">
            <li>
              Users <b>{users}</b>
            </li>
            <li>
              Workspaces <b>{workspaces}</b>
            </li>
          </ul>
        </section>
        <section className="panel">
          <h2>Document processing</h2>
          <ul className="data-list">
            {documentStatuses.map((row) => (
              <li key={row.status}>
                {row.status}
                <b>{row._count}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Subscriptions</h2>
          <ul className="data-list">
            {subscriptions.map((row) => (
              <li key={row.plan + row.status}>
                {row.plan} · {row.status}
                <b>{row._count}</b>
              </li>
            ))}
          </ul>
        </section>
        <section className="panel">
          <h2>Gemini usage</h2>
          <ul className="data-list">
            {ai.map((row) => (
              <li key={row.service}>
                <span>
                  {row.service} · {row._count} requests
                </span>
                <span>
                  {row._sum.inputTokens ?? 0} in / {row._sum.outputTokens ?? 0}{" "}
                  out · {row._sum.estimatedUsd?.toFixed() ?? "—"} USD
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <section className="panel">
        <h2>Plan configuration</h2>
        <ul className="data-list">
          {Object.entries(plans).map(([key, plan]) => (
            <li key={key}>
              {plan.name}
              <span>
                {plan.documents} documents · {plan.seats} seats
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
