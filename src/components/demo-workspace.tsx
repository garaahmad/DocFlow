"use client";
import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  CircleHelp,
  Download,
  FileText,
  FolderOpen,
  House,
  ChartNoAxesCombined,
  Play,
  ReceiptText,
  RotateCcw,
} from "lucide-react";
import { Brand } from "./brand";
import { Preferences } from "./preferences";
import { Metrics, Status } from "./app-shared";
import { TrendChart } from "./charts";
import {
  demoDocs,
  sampleActivity,
  sampleInvoiceExtractedTotal,
} from "@/lib/demo";

type Tab = "overview" | "documents" | "analytics" | "review";
export function DemoWorkspace({
  locale,
  startInReview,
}: {
  locale: string;
  startInReview: boolean;
}) {
  const ar = locale === "ar";
  const t = (en: string, a: string) => (ar ? a : en);
  const [tab, setTab] = useState<Tab>(startInReview ? "review" : "overview");
  const [selected, setSelected] = useState(0);
  const [approved, setApproved] = useState(false);
  const [checked, setChecked] = useState(false);
  const [total, setTotal] = useState("1440.00");
  const [visibleHint, setVisibleHint] = useState(true);
  const doc = demoDocs[selected];
  function open(index: number) {
    setSelected(index);
    setTab("review");
  }
  function reset() {
    setApproved(false);
    setChecked(false);
    setTotal("1440.00");
    setSelected(0);
    setTab("overview");
    setVisibleHint(true);
  }
  function download() {
    const approvedDocs = demoDocs
      .map((d, index) => ({ d, index }))
      .filter(({ index }) => index !== 0 || approved);
    const rows = [
      "Vendor,Reference,Currency,Approved total",
      ...approvedDocs.map(({ d, index }) =>
        [
          d.name,
          d.ref,
          "USD",
          index === 0 ? total : d.total.replace(/[^0-9.]/g, ""),
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.join("\r\n")], { type: "text/csv" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "docflow-demo.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const nav = [
    ["overview", House, t("Overview", "نظرة عامة")],
    ["documents", FolderOpen, t("Documents", "المستندات")],
    ["analytics", ChartNoAxesCombined, t("Analytics", "التحليلات")],
  ] as const;
  const stats = {
    all: 4,
    processed: 4,
    review: approved ? 0 : 1,
    money: approved ? (3374.5 + Number(total)).toFixed(2) : "3374.50",
    currency: "USD",
    success: 100,
  };
  const state = (index: number) =>
    index !== 0 || approved ? "COMPLETED" : "NEEDS_REVIEW";
  const display =
    tab === "review"
      ? doc.name
      : tab === "analytics"
        ? t("Analytics", "التحليلات")
        : tab === "documents"
          ? t("Documents", "المستندات")
          : t("Workspace overview", "نظرة عامة على مساحة العمل");
  return (
    <div className="demo-frame">
      <header className="demo-header">
        <div className="demo-top wrap">
          <Brand />
          <div className="inline-actions">
            <Preferences locale={locale} />
            <Link href="/register" className="button primary small">
              {t("Create a workspace", "أنشئ مساحة عمل")}
            </Link>
          </div>
        </div>
      </header>
      <main className="demo-main wrap">
        <div className="demo-banner">
          <div>
            <Play size={16} fill="currentColor" />
            <b>{t("Interactive demo", "عرض تفاعلي")}</b>
            <span>
              {t(
                "Sample documents · No live AI requests",
                "مستندات نموذجية · دون طلبات ذكاء اصطناعي مباشرة",
              )}
            </span>
          </div>
          <button className="button text small" onClick={reset}>
            <RotateCcw size={14} />
            {t("Reset demo", "إعادة ضبط العرض")}
          </button>
        </div>
        <div className="demo-app">
          <aside className="demo-side">
            <div className="demo-tenant">
              <span className="workspace-avatar">N</span>
              <div>
                <b>Northstar Operations</b>
                <small>{t("Sample workspace", "مساحة عمل نموذجية")}</small>
              </div>
            </div>
            <nav aria-label={t("Demo navigation", "قائمة العرض")}>
              {nav.map(([id, Icon, label]) => (
                <button
                  type="button"
                  key={id}
                  className={
                    "side-link " +
                    (id === tab || (id === "documents" && tab === "review")
                      ? "current"
                      : "")
                  }
                  aria-current={id === tab ? "page" : undefined}
                  onClick={() => setTab(id)}
                >
                  <Icon size={17} />
                  {label}
                </button>
              ))}
            </nav>
            <button
              className="side-link demo-guide"
              onClick={() => setVisibleHint(!visibleHint)}
            >
              <CircleHelp size={17} />
              {t("Demo guide", "دليل العرض")}
            </button>
          </aside>
          <div className="demo-content">
            <div className="page-heading">
              <div>
                <h1>{display}</h1>
                <p>
                  {t(
                    "Northstar Operations · Sample workspace",
                    "Northstar Operations · مساحة عمل نموذجية",
                  )}
                </p>
              </div>
              {tab === "overview" ? (
                <button className="button primary" onClick={() => open(0)}>
                  <ReceiptText size={17} />
                  {t("Review sample invoice", "راجع فاتورة نموذجية")}
                </button>
              ) : tab === "review" ? (
                <button
                  className="button outline"
                  onClick={() => setTab("documents")}
                >
                  {t("Back to documents", "العودة إلى المستندات")}
                </button>
              ) : (
                <button className="button outline" onClick={download}>
                  <Download size={16} />
                  {t("Export sample CSV", "تنزيل CSV نموذجي")}
                </button>
              )}
            </div>
            {visibleHint && (
              <div className="demo-tip">
                <b>{t("Try the review workflow", "جرّب سير المراجعة")}</b>
                <p>
                  {t(
                    "Open the Northstar invoice, compare its extracted total with the original, and approve the corrected amount.",
                    "افتح فاتورة Northstar وقارن المبلغ المستخرج بالمستند الأصلي واعتمد المبلغ المصحح.",
                  )}
                </p>
              </div>
            )}
            {tab === "overview" && <Metrics locale={locale} values={stats} />}
            {(tab === "analytics" || tab === "overview") && (
              <div className="panel-grid">
                <section className="panel">
                  <header className="panel-head">
                    <div>
                      <h2>{t("Document activity", "نشاط المستندات")}</h2>
                      <small>
                        {t(
                          "Sample history · Last six months",
                          "سجل نموذجي · آخر ستة أشهر",
                        )}
                      </small>
                    </div>
                  </header>
                  <TrendChart
                    data={sampleActivity}
                    kind="activity"
                    locale={locale}
                  />
                </section>
                <section className="panel">
                  <header className="panel-head">
                    <div>
                      <h2>{t("Monthly spending", "الإنفاق الشهري")}</h2>
                      <small>USD · {t("Sample history", "سجل نموذجي")}</small>
                    </div>
                  </header>
                  <TrendChart
                    data={sampleActivity.map((month, index) =>
                      index === 5
                        ? { ...month, spend: Number(stats.money) }
                        : month,
                    )}
                    kind="spend"
                    locale={locale}
                  />
                </section>
              </div>
            )}
            {(tab === "documents" || tab === "overview") && (
              <section className="panel">
                <div className="panel-head">
                  <h2>{t("Sample documents", "مستندات نموذجية")}</h2>
                </div>
                <ul className="demo-documents">
                  {demoDocs.map((entry, index) => (
                    <li key={entry.ref}>
                      <button type="button" onClick={() => open(index)}>
                        <span className={"document-icon " + entry.color}>
                          <FileText size={18} />
                        </span>
                        <span>
                          <b>{entry.name}</b>
                          <small>{entry.file}</small>
                        </span>
                        <Status locale={locale} status={state(index)} />
                        <strong>
                          {index === 0 && approved
                            ? "$" +
                              Number(total).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })
                            : entry.total}
                        </strong>
                        <ChevronRight size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {tab === "review" && (
              <div className="review-layout demo-review">
                <section className="panel">
                  <header className="panel-head">
                    <div>
                      <h2>{t("Original document", "المستند الأصلي")}</h2>
                      <small>{doc.file}</small>
                    </div>
                  </header>
                  <div className="demo-paper" dir="ltr">
                    <div>
                      <span className="workspace-avatar">{doc.initial}</span>
                      <b>{doc.name}</b>
                    </div>
                    <h3>{doc.type.toUpperCase()}</h3>
                    <p>
                      {doc.ref} · {doc.date}
                    </p>
                    <table>
                      <tbody>
                        <tr>
                          <th>Description</th>
                          <th>Amount</th>
                        </tr>
                        <tr>
                          <td>{doc.category}</td>
                          <td>{selected === 0 ? "$1,200.00" : doc.total}</td>
                        </tr>
                        {selected === 0 && (
                          <tr>
                            <td>Tax</td>
                            <td>$240.00</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                    <footer>
                      <b>Grand total</b>
                      <b>{doc.total}</b>
                    </footer>
                  </div>
                </section>
                <section className="panel stack">
                  <header className="panel-head">
                    <h2>{t("Review fields", "مراجعة الحقول")}</h2>
                    <Status locale={locale} status={state(selected)} />
                  </header>
                  {selected === 0 && !approved && (
                    <article className="issue warning">
                      <AlertTriangle size={17} />
                      <div>
                        <b>{t("Check the grand total", "تحقق من الإجمالي")}</b>
                        <p>
                          {t(
                            "The extraction read $1,404.00. Subtotal plus tax is $1,440.00. Confirm the amount against the original.",
                            "قرأ الاستخراج ١٤٠٤ دولارًا. المجموع الفرعي والضريبة ١٤٤٠ دولارًا. تحقق من الأصل.",
                          )}
                        </p>
                      </div>
                    </article>
                  )}
                  {selected === 0 && approved && (
                    <p className="notice success" role="status">
                      {t(
                        "Sample approved. The demo dashboard now includes this invoice.",
                        "تم اعتماد العينة وأصبحت الفاتورة مدرجة في لوحة العرض.",
                      )}
                    </p>
                  )}
                  <div className="form-grid">
                    <label>
                      {t("Vendor", "المورد")}
                      <input value={doc.name} readOnly />
                    </label>
                    <label>
                      {t("Reference", "المرجع")}
                      <input value={doc.ref} readOnly />
                    </label>
                    <label>
                      {t("Currency", "العملة")}
                      <input value="USD" readOnly />
                    </label>
                    <label>
                      {t("Grand total", "الإجمالي")}
                      <input
                        dir="ltr"
                        value={
                          selected === 0
                            ? approved || checked
                              ? total
                              : sampleInvoiceExtractedTotal
                            : doc.total.replace(/[^0-9.]/g, "")
                        }
                        readOnly={!checked || approved || selected !== 0}
                        onChange={(e) => setTotal(e.target.value)}
                      />
                    </label>
                  </div>
                  {selected === 0 && !approved && (
                    <div className="inline-actions">
                      <button
                        className="button outline"
                        onClick={() => {
                          setChecked(true);
                          setTotal("1440.00");
                        }}
                      >
                        {t("Use amount from source", "استخدم مبلغ المستند")}
                      </button>
                      <button
                        className="button primary"
                        disabled={
                          !checked || !/^\d{1,7}(\.\d{1,2})?$/.test(total)
                        }
                        onClick={() => {
                          setApproved(true);
                          setVisibleHint(false);
                        }}
                      >
                        <Check size={17} />
                        {t("Approve sample", "اعتمد العينة")}
                      </button>
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
