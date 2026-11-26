"use client";
import { Languages, Moon, Sun } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
const subscribe = (notify: () => void) => {
  window.addEventListener("docflow-theme", notify);
  return () => window.removeEventListener("docflow-theme", notify);
};
const theme = () => document.documentElement.dataset.theme === "dark";

export function Preferences({ locale }: { locale: string }) {
  const router = useRouter();
  const dark = useSyncExternalStore(subscribe, theme, () => false);
  return (
    <div className="preferences">
      <button
        type="button"
        className="icon-button"
        aria-label={
          locale === "ar" ? "تغيير اللغة إلى الإنجليزية" : "Switch to Arabic"
        }
        title={locale === "ar" ? "English" : "العربية"}
        onClick={() => {
          document.cookie =
            "docflow-language=" +
            (locale === "ar" ? "en" : "ar") +
            "; max-age=31536000; path=/; SameSite=Lax";
          router.refresh();
        }}
      >
        <Languages size={17} />
      </button>
      <button
        type="button"
        className="icon-button"
        aria-label={dark ? "Light mode" : "Dark mode"}
        title={dark ? "Light mode" : "Dark mode"}
        onClick={() => {
          const next = dark ? "light" : "dark";
          document.documentElement.dataset.theme = next;
          localStorage.setItem("docflow-theme", next);
          window.dispatchEvent(new Event("docflow-theme"));
        }}
      >
        {dark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    </div>
  );
}
