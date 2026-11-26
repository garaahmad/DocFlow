import { redirect } from "next/navigation";
import { session } from "@/lib/access";
import { language } from "@/lib/language";
import { Brand } from "@/components/brand";
import { Preferences } from "@/components/preferences";
import { WorkspaceForm } from "@/components/workspace-form";
export default async function Onboarding() {
  if (!(await session())) redirect("/login");
  const locale = await language();
  return (
    <main className="auth-page">
      <div className="auth-story">
        <div className="auth-mast">
          <Brand />
          <Preferences locale={locale} />
        </div>
        <h1>
          {locale === "ar"
            ? "مساحة عمل لمستنداتك"
            : "A workspace for your documents"}
        </h1>
        <p>
          {locale === "ar"
            ? "راجع المستندات وتتبع الإنفاق في مكان واحد."
            : "Review documents and track approved spending in one place."}
        </p>
      </div>
      <section className="panel auth-card">
        <WorkspaceForm locale={locale} />
      </section>
    </main>
  );
}
