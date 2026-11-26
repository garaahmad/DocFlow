"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { errorMessage } from "@/lib/client-api";
export type AuthMode =
  "login" | "register" | "forgot-password" | "reset-password";
export function AuthForm({
  mode,
  locale,
  verified,
  token,
  next,
  enabled,
}: {
  mode: AuthMode;
  locale: string;
  verified: boolean;
  token?: string;
  next?: string;
  enabled: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const router = useRouter();
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const action = {
    login: t("Sign in", "تسجيل الدخول"),
    register: t("Create account", "إنشاء حساب"),
    "forgot-password": t("Send reset link", "إرسال رابط التعيين"),
    "reset-password": t("Set new password", "حفظ كلمة المرور"),
  }[mode];
  const destination =
    next && /^\/invite\/[A-Za-z0-9_-]{43}$/.test(next) ? next : "/dashboard";
  const safeNext =
    destination === "/dashboard"
      ? ""
      : "?next=" + encodeURIComponent(destination);
  const unavailable =
    !enabled ||
    (mode === "forgot-password" && !verified) ||
    (mode === "reset-password" && !token);
  return (
    <form
      className="form"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setMessage(undefined);
        const form = new FormData(event.currentTarget);
        const email = String(form.get("email") ?? "").trim();
        const password = String(form.get("password") ?? "");
        try {
          if (mode === "login" || mode === "register") {
            const result =
              mode === "login"
                ? await authClient.signIn.email({
                    email,
                    password,
                    callbackURL: destination,
                  })
                : await authClient.signUp.email({
                    email,
                    password,
                    name: String(form.get("name")).trim(),
                    callbackURL: destination,
                  });
            if (result.error)
              throw new Error(
                result.error.message ??
                  t("Access was denied.", "تم رفض الوصول."),
              );
            if (mode === "register" && verified)
              setMessage({
                text: t(
                  "Check your inbox for a verification link.",
                  "راجع بريدك للحصول على رابط التحقق.",
                ),
              });
            else {
              router.push(destination);
              router.refresh();
            }
          } else if (mode === "forgot-password") {
            const result = await authClient.requestPasswordReset({
              email,
              redirectTo: location.origin + "/reset-password",
            });
            if (result.error) throw new Error(result.error.message);
            setMessage({
              text: t(
                "If an account exists, a reset link was sent.",
                "إذا كان لديك حساب فسيصلك رابط إعادة التعيين.",
              ),
            });
          } else {
            const result = await authClient.resetPassword({
              newPassword: password,
              token: token ?? "",
            });
            if (result.error) throw new Error(result.error.message);
            setMessage({
              text: t(
                "Password updated. You can sign in.",
                "تم تحديث كلمة المرور. يمكنك تسجيل الدخول.",
              ),
            });
          }
        } catch (error) {
          setMessage({ error: true, text: errorMessage(error) });
        } finally {
          setPending(false);
        }
      }}
    >
      {mode === "register" && (
        <label>
          {t("Full name", "الاسم الكامل")}
          <input
            name="name"
            required
            maxLength={80}
            autoComplete="name"
            placeholder="Alex Morgan"
          />
        </label>
      )}
      {mode !== "reset-password" && (
        <label>
          {t("Email address", "البريد الإلكتروني")}
          <input
            name="email"
            type="email"
            required
            maxLength={240}
            autoComplete="email"
            placeholder="you@company.com"
            dir="ltr"
          />
        </label>
      )}
      {mode !== "forgot-password" && (
        <label>
          {t("Password", "كلمة المرور")}
          <input
            name="password"
            type="password"
            required
            minLength={mode === "login" ? 1 : 12}
            maxLength={128}
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
          />
          {mode !== "login" && (
            <small>
              {t("Use at least 12 characters.", "استخدم ١٢ حرفًا على الأقل.")}
            </small>
          )}
        </label>
      )}
      {unavailable && (
        <div className="notice">
          {!enabled
            ? t(
                "Authentication is unavailable until the server is configured.",
                "يلزم إعداد المصادقة على الخادم.",
              )
            : mode === "forgot-password"
              ? t(
                  "Password recovery requires an email provider.",
                  "تتطلب استعادة كلمة المرور إعداد البريد.",
                )
              : t(
                  "Open the link from your reset email.",
                  "افتح الرابط الوارد في بريد إعادة التعيين.",
                )}
        </div>
      )}
      {message && (
        <div
          role={message.error ? "alert" : "status"}
          className={"notice " + (message.error ? "error" : "success")}
        >
          {message.text}
        </div>
      )}
      <button
        type="submit"
        className="button primary"
        disabled={pending || unavailable}
      >
        {pending ? t("Please wait…", "انتظر قليلًا…") : action}
      </button>
      {mode === "login" && (
        <Link className="underlined" href="/forgot-password">
          {t("Forgot your password?", "هل نسيت كلمة المرور؟")}
        </Link>
      )}
      <div className="account-link">
        {mode === "login" ? (
          <>
            {t("New to DocFlow?", "جديد في DocFlow؟")}{" "}
            <Link href={"/register" + safeNext}>
              {t("Create account", "إنشاء حساب")}
            </Link>
          </>
        ) : (
          <Link href={"/login" + safeNext}>
            {t("Back to sign in", "العودة إلى تسجيل الدخول")}
          </Link>
        )}
      </div>
    </form>
  );
}
