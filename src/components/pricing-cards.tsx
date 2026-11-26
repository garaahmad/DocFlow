import Link from "next/link";
import { Check } from "lucide-react";
import { plans } from "@/lib/plans";

export function PricingCards({ locale }: { locale: string }) {
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  return (
    <div className="pricing-grid">
      {Object.entries(plans).map(([code, plan]) => (
        <article
          key={code}
          className={"price-card " + (code === "pro" ? "featured" : "")}
        >
          <h3>{plan.name}</h3>
          <strong>
            ${plan.price}
            <small>{t(" / month", " / شهريًا")}</small>
          </strong>
          <ul>
            <li>
              <Check size={16} />
              {plan.documents.toLocaleString(locale)}{" "}
              {t("documents per month", "مستند شهريًا")}
            </li>
            <li>
              <Check size={16} />
              {plan.insights}{" "}
              {t("assistant requests per month", "طلب مساعد شهريًا")}
            </li>
            <li>
              <Check size={16} />
              {plan.seats}{" "}
              {t(
                plan.seats === 1 ? "workspace seat" : "workspace seats",
                "مقعد في مساحة العمل",
              )}
            </li>
            <li>
              <Check size={16} />
              {t("CSV and XLSX exports", "تصدير CSV وXLSX")}
            </li>
          </ul>
          <Link
            href="/register"
            className={"button " + (code === "pro" ? "primary" : "outline")}
          >
            {t("Get started", "ابدأ الآن")}
          </Link>
        </article>
      ))}
    </div>
  );
}
