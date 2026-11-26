"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, errorMessage } from "@/lib/client-api";
export type Settings = {
  name: string;
  business: string;
  locale: string;
  currency: string;
};
const business = ["Freelancer", "Accounting", "Agency", "Operations", "Other"];
const currencies = [
  "USD",
  "EUR",
  "GBP",
  "AED",
  "SAR",
  "EGP",
  "CAD",
  "AUD",
  "JPY",
  "KWD",
];
export function WorkspaceForm({
  locale,
  initial,
  settings = false,
}: {
  locale: string;
  initial?: Settings;
  settings?: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState(
    initial ?? {
      name: "",
      business: "Freelancer",
      locale,
      currency: locale === "ar" ? "SAR" : "USD",
    },
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  return (
    <>
      <h2>
        {settings
          ? t("Workspace settings", "إعدادات مساحة العمل")
          : step === 2
            ? t("Your workspace is ready", "مساحة عملك جاهزة")
            : step === 1
              ? t("Set your preferences", "حدد تفضيلاتك")
              : t("Create your workspace", "أنشئ مساحة عملك")}
      </h2>
      {!settings && (
        <p>
          {step === 2
            ? t(
                "Upload your first document or take a guided look at a sample workspace.",
                "حمّل مستندك الأول أو جرّب مساحة عمل نموذجية.",
              )
            : t(
                "Set up your private workspace for document review.",
                "أعد مساحة عمل خاصة لمراجعة المستندات.",
              )}
        </p>
      )}
      {step === 2 ? (
        <div className="form-actions">
          <Link className="button primary" href="/dashboard/upload">
            {t("Upload first document", "حمّل أول مستند")}
          </Link>
          <Link className="button outline" href="/demo">
            {t("Explore demo", "استكشف العرض")}
          </Link>
          <Link className="button text" href="/dashboard">
            {t("Go to dashboard", "لوحة التحكم")}
          </Link>
        </div>
      ) : (
        <form
          className="form"
          onSubmit={async (event) => {
            event.preventDefault();
            setMessage("");
            setSaved(false);
            if (!settings && step === 0) {
              setStep(1);
              return;
            }
            setBusy(true);
            try {
              await api(settings ? "settings" : "create", values);
              if (settings) {
                setSaved(true);
                router.refresh();
              } else {
                setStep(2);
                router.refresh();
              }
            } catch (error) {
              setMessage(errorMessage(error));
            } finally {
              setBusy(false);
            }
          }}
        >
          {(settings || step === 0) && (
            <>
              <label>
                {t("Workspace name", "اسم مساحة العمل")}
                <input
                  required
                  minLength={2}
                  maxLength={70}
                  value={values.name}
                  onChange={(e) =>
                    setValues({ ...values, name: e.target.value })
                  }
                />
              </label>
              <label>
                {t("Business type", "نوع النشاط")}
                <select
                  value={values.business}
                  onChange={(e) =>
                    setValues({ ...values, business: e.target.value })
                  }
                >
                  {business.map((b, i) => (
                    <option key={b} value={b}>
                      {t(b, ["مستقل", "محاسبة", "وكالة", "عمليات", "أخرى"][i])}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {(settings || step === 1) && (
            <div className="form-grid">
              <label>
                {t("Language", "اللغة")}
                <select
                  value={values.locale}
                  onChange={(e) =>
                    setValues({ ...values, locale: e.target.value })
                  }
                >
                  <option value="en">English</option>
                  <option value="ar">العربية</option>
                </select>
              </label>
              <label>
                {t("Preferred currency", "العملة المفضلة")}
                <select
                  value={values.currency}
                  onChange={(e) =>
                    setValues({ ...values, currency: e.target.value })
                  }
                >
                  {currencies.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {message && (
            <div role="alert" className="notice error">
              {message}
            </div>
          )}
          {saved && (
            <div role="status" className="notice success">
              {t("Workspace updated.", "تم تحديث مساحة العمل.")}
            </div>
          )}
          <div className="form-actions">
            <button className="button primary" disabled={busy}>
              {busy
                ? t("Saving…", "جارٍ الحفظ…")
                : settings
                  ? t("Save settings", "حفظ الإعدادات")
                  : step === 0
                    ? t("Continue", "متابعة")
                    : t("Finish setup", "إنهاء الإعداد")}
            </button>
            {!settings && step === 1 && (
              <button
                type="button"
                className="button text"
                onClick={() => setStep(0)}
              >
                {t("Back", "رجوع")}
              </button>
            )}
          </div>
        </form>
      )}
    </>
  );
}
