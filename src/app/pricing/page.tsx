import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { Preferences } from "@/components/preferences";
import { PricingCards } from "@/components/pricing-cards";
import { language } from "@/lib/language";
import { plans } from "@/lib/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Compare DocFlow AI plans for document processing, AI insights, and team collaboration.",
};
export default async function Pricing() {
  const locale = await language();
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  return (
    <>
      <header className="site-header">
        <div className="site-nav wrap">
          <Brand />
          <div className="nav-actions">
            <Preferences locale={locale} />
            <Link className="login-link" href="/login">
              {t("Log in", "تسجيل الدخول")}
            </Link>
            <Link className="button primary small" href="/register">
              {t("Get started", "ابدأ الآن")}
            </Link>
          </div>
        </div>
      </header>
      <main className="wrap site-section">
        <div className="section-head">
          <h1 className="pricing-title">
            {t("Plans for every document workload.", "خطط تناسب حجم مستنداتك.")}
          </h1>
          <p>
            {t(
              "All plans include private originals, manual review, and approved-record exports.",
              "تشمل كل الخطط تخزينًا خاصًا ومراجعة يدوية وتصدير السجلات المعتمدة.",
            )}
          </p>
        </div>
        <PricingCards locale={locale} />
        <section className="panel plan-comparison">
          <h2>{t("Compare features", "مقارنة المزايا")}</h2>
          <div className="table-scroll">
            <table className="doc-table">
              <thead>
                <tr>
                  <th>{t("Feature", "الميزة")}</th>
                  {Object.values(plans).map((plan) => (
                    <th key={plan.name}>{plan.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">
                    {t("Documents per month", "المستندات شهريًا")}
                  </th>
                  {Object.values(plans).map((plan) => (
                    <td key={plan.name}>
                      {plan.documents.toLocaleString(locale)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">
                    {t(
                      "Reprocessing requests per month",
                      "طلبات إعادة المعالجة شهريًا",
                    )}
                  </th>
                  {Object.values(plans).map((plan) => (
                    <td key={plan.name}>
                      {plan.retries.toLocaleString(locale)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">
                    {t("Assistant requests per month", "طلبات المساعد شهريًا")}
                  </th>
                  {Object.values(plans).map((plan) => (
                    <td key={plan.name}>
                      {plan.insights.toLocaleString(locale)}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th scope="row">
                    {t("Gemini-assisted validation", "التحقق بمساعدة Gemini")}
                  </th>
                  <td>{t("Deterministic checks", "فحوصات حتمية")}</td>
                  <td>{t("Included", "مشمول")}</td>
                  <td>{t("Included", "مشمول")}</td>
                </tr>
                <tr>
                  <th scope="row">
                    {t("Workspace seats", "مقاعد مساحة العمل")}
                  </th>
                  {Object.values(plans).map((plan) => (
                    <td key={plan.name}>{plan.seats.toLocaleString(locale)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <p className="plan-link">
          <Link className="underlined" href="/demo">
            {t("Try the review demo", "جرّب عرض المراجعة")}
          </Link>
        </p>
      </main>
    </>
  );
}
