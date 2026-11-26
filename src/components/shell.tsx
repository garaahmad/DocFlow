"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Bot,
  ChartNoAxesCombined,
  ChevronDown,
  CloudUpload,
  FileText,
  FolderOpen,
  House,
  Menu,
  PanelLeft,
  ReceiptText,
  Search,
  Settings,
  Users,
  WalletCards,
  Building2,
  LogOut,
  X,
} from "lucide-react";
import { Brand } from "./brand";
import { Preferences } from "./preferences";
import { navigation } from "@/lib/navigation";
import { api, errorMessage } from "@/lib/client-api";
import { authClient } from "@/lib/auth-client";
const icons = [
  House,
  FolderOpen,
  CloudUpload,
  ReceiptText,
  Building2,
  ChartNoAxesCombined,
  Bot,
  FileText,
  Activity,
  Users,
  WalletCards,
  Settings,
];

export function Shell({
  children,
  locale,
  userName,
  workspaces,
  selected,
  admin,
}: {
  children: React.ReactNode;
  locale: string;
  userName: string;
  workspaces: { id: string; name: string }[];
  selected: string;
  admin: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const t = (en: string, ar: string) => (locale === "ar" ? ar : en);
  const active = pathname.split("/")[2] ?? "";
  const section = navigation.find((row) => row[0] === active);
  const workspace = workspaces.find((w) => w.id === selected);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        const input = document.getElementById("global-search");
        if (input?.offsetWidth) {
          event.preventDefault();
          input.focus();
        }
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  return (
    <div className="app-frame">
      {open && (
        <button
          className="nav-scrim"
          onClick={() => setOpen(false)}
          aria-label={t("Close navigation", "إغلاق القائمة")}
        />
      )}
      <aside className={"sidebar " + (open ? "open" : "")}>
        <div className="sidebar-brand">
          <Brand href="/dashboard" />
          <button
            className="icon-button mobile-nav-button"
            aria-label={t("Close navigation", "إغلاق القائمة")}
            onClick={() => setOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        <details className="workspace-menu">
          <summary>
            <span className="workspace-avatar">
              {workspace?.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              <b>{workspace?.name}</b>
              <small>{t("Workspace", "مساحة العمل")}</small>
            </span>
            <ChevronDown size={14} />
          </summary>
          <div className="workspace-options">
            {workspaces.map((w) => (
              <button
                type="button"
                key={w.id}
                disabled={w.id === selected}
                onClick={async () => {
                  setError("");
                  try {
                    await api("switch", { workspaceId: w.id });
                    router.push("/dashboard");
                    router.refresh();
                    setOpen(false);
                  } catch (error) {
                    setError(errorMessage(error));
                  }
                }}
              >
                {w.name}
              </button>
            ))}
            <Link href="/onboarding" onClick={() => setOpen(false)}>
              {t("Create workspace", "إنشاء مساحة عمل")}
            </Link>
          </div>
        </details>
        <nav aria-label={t("Workspace navigation", "قائمة مساحة العمل")}>
          {navigation.map(([slug, en, ar], index) => {
            const Icon = icons[index];
            const href = "/dashboard" + (slug ? "/" + slug : "");
            return (
              <Link
                className={"side-link " + (active === slug ? "current" : "")}
                aria-current={active === slug ? "page" : undefined}
                href={href}
                key={slug}
                onClick={() => setOpen(false)}
              >
                <Icon size={17} />
                {t(en, ar)}
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {admin && (
            <Link className="side-link" href="/admin">
              <PanelLeft size={17} />
              {t("Platform admin", "إدارة المنصة")}
            </Link>
          )}
          <Link className="side-link" href="/support">
            <FileText size={17} />
            {t("Help & support", "المساعدة والدعم")}
          </Link>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-header">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-nav-button"
              aria-label={t("Open navigation", "فتح القائمة")}
              aria-expanded={open}
              onClick={() => setOpen(!open)}
            >
              <Menu size={21} />
            </button>
            <span>{t("Workspace", "مساحة العمل")}</span>
            <span>/</span>
            <b>
              {section
                ? t(section[1], section[2])
                : t("Workspace", "مساحة العمل")}
            </b>
          </div>
          <div className="app-actions">
            <form className="global-search" action="/dashboard/documents">
              <Search size={16} />
              <input
                id="global-search"
                name="q"
                aria-label={t("Search documents", "البحث في المستندات")}
                placeholder={t("Search documents", "ابحث في المستندات")}
              />
              <kbd>⌘ K</kbd>
            </form>
            <Preferences locale={locale} />
            <details className="account-menu">
              <summary
                title={t("Account menu", "قائمة الحساب")}
                aria-label={t("Account menu", "قائمة الحساب")}
              >
                <span>{userName.slice(0, 1).toUpperCase()}</span>
                <ChevronDown size={13} />
              </summary>
              <div>
                <b>{userName}</b>
                <Link
                  href="/dashboard/settings"
                  onClick={(event) =>
                    event.currentTarget
                      .closest("details")
                      ?.removeAttribute("open")
                  }
                >
                  {t("Account settings", "إعدادات الحساب")}
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const result = await authClient.signOut();
                      if (result.error) throw new Error(result.error.message);
                      router.push("/login");
                      router.refresh();
                    } catch (error) {
                      setError(errorMessage(error));
                    }
                  }}
                >
                  <LogOut size={15} />
                  {t("Sign out", "تسجيل الخروج")}
                </button>
              </div>
            </details>
          </div>
        </header>
        <main className="app-main">
          {error && (
            <div className="notice error" role="alert">
              {error}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
