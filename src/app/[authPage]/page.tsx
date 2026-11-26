import Link from "next/link";
import { notFound } from "next/navigation";
import { Brand } from "@/components/brand";
import { Preferences } from "@/components/preferences";
import { AuthForm, type AuthMode } from "@/components/auth-form";
import { emailEnabled } from "@/lib/email";
import { language } from "@/lib/language";

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ authPage: string }>;
  searchParams: Promise<{ token?: string; next?: string }>;
}) {
  const { authPage } = await params;
  if (["privacy", "terms", "support"].includes(authPage))
    return <Legal page={authPage} />;
  const modes = ["login", "register", "forgot-password", "reset-password"];
  if (!modes.includes(authPage)) notFound();
  const { token, next } = await searchParams;
  const locale = await language();
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const heading = {
    login: t("Welcome back", "مرحبًا بعودتك"),
    register: t("Create your account", "أنشئ حسابك"),
    "forgot-password": t("Recover your account", "استرداد الحساب"),
    "reset-password": t("Reset your password", "إعادة تعيين كلمة المرور"),
  }[authPage];
  return (
    <main className="auth-page">
      <div className="auth-story">
        <div className="auth-mast">
          <Brand />
          <Preferences locale={locale} />
        </div>
        <h1>
          {t("From Documents to Decisions.", "من المستندات إلى القرارات.")}
        </h1>
        <p>
          {t(
            "Upload business documents, review extracted fields, and build a searchable record of your spending.",
            "حمّل مستندات عملك وراجع الحقول المستخرجة وأنشئ سجل إنفاق قابلًا للبحث.",
          )}
        </p>
        <Link href="/demo" className="button outline" style={{ marginTop: 20 }}>
          {t("Explore the demo", "استكشف العرض")}
        </Link>
      </div>
      <section className="panel auth-card">
        <h2>{heading}</h2>
        <p>
          {t(
            "Secure access to your DocFlow AI workspace.",
            "وصول آمن إلى مساحة عملك.",
          )}
        </p>
        <AuthForm
          mode={authPage as AuthMode}
          locale={locale}
          enabled={Boolean(
            process.env.DATABASE_URL && process.env.BETTER_AUTH_SECRET,
          )}
          verified={emailEnabled}
          token={token}
          next={next}
        />
      </section>
    </main>
  );
}
async function Legal({ page }: { page: string }) {
  const locale = await language();
  const ar = locale === "ar";
  return (
    <main className="prose">
      <div className="auth-mast">
        <Brand />
        <Preferences locale={locale} />
      </div>
      <h1>
        {page === "privacy"
          ? ar
            ? "الخصوصية"
            : "Privacy"
          : page === "terms"
            ? ar
              ? "الشروط"
              : "Terms of service"
            : ar
              ? "الدعم"
              : "Support"}
      </h1>
      {page !== "support" && (
        <p className="notice">
          {ar
            ? "مسودة للمراجعة القانونية قبل الإطلاق التجاري."
            : "Template for legal review before commercial launch."}
        </p>
      )}
      {page === "privacy" ? (
        <>
          <h2>{ar ? "بيانات مساحة العمل" : "Workspace data"}</h2>
          <p>
            {ar
              ? "تُخزّن بيانات الحساب والمستندات في مساحة العمل الخاصة. قد تُرسل المستندات إلى Google Gemini للمعالجة."
              : "DocFlow stores account information, uploaded originals, extracted fields, and review history. Uploaded content can be sent to Google Gemini to perform document processing. Configured payment and email providers process the data required for those services."}
          </p>
          <h2>{ar ? "الحذف والاحتفاظ" : "Deletion and retention"}</h2>
          <p>
            {ar
              ? "يمكن للمستخدمين حذف مستنداتهم. تختلف مدة الاحتفاظ بالنسخ الاحتياطية حسب الإعدادات."
              : "Authorized users can request document deletion inside the workspace. The worker removes the active file and document record. Backups and provider retention depend on the operating configuration. Minimal activity metadata is retained."}
          </p>
        </>
      ) : page === "terms" ? (
        <>
          <h2>{ar ? "استخدام الخدمة" : "Using the service"}</h2>
          <p>
            {ar
              ? "حمّل المستندات التي لديك إذن بمعالجتها وراجع النتائج قبل الاعتماد."
              : "Upload only materials you are authorized to process. Verify extracted fields against the source before acting on them. DocFlow provides review tools. Outputs require human review and carry no certified audit assurance."}
          </p>
          <h2>{ar ? "الاشتراكات" : "Subscriptions"}</h2>
          <p>
            {ar
              ? "تخضع الاشتراكات للخطة والفوترة المعروضة عند الدفع."
              : "Paid features and limits are described in the selected plan. The checkout and billing portal display prices, renewal and cancellation options."}
          </p>
        </>
      ) : (
        <p>
          {process.env.SUPPORT_EMAIL ? (
            <a
              className="underlined"
              href={"mailto:" + process.env.SUPPORT_EMAIL}
            >
              {process.env.SUPPORT_EMAIL}
            </a>
          ) : ar ? (
            "راجع شرح سير العمل أو جرّب العرض التفاعلي."
          ) : (
            "See the workflow guide and interactive demo for help with uploads and review."
          )}
        </p>
      )}
      <div className="inline-actions">
        <Link className="button outline" href="/#faq">
          {ar ? "الأسئلة الشائعة" : "FAQs"}
        </Link>
        <Link className="button outline" href="/demo">
          {ar ? "العرض التجريبي" : "Demo"}
        </Link>
      </div>
    </main>
  );
}
