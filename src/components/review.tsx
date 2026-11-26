"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Download,
  FileText,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import type { Extraction, Issue } from "@/lib/documents";
import { api, errorMessage } from "@/lib/client-api";
import { Status } from "./app-shared";

type Field = Exclude<keyof Extraction, "kind" | "lines" | "evidence">;
const fields: [Field, string, string][] = [
  ["vendor", "Vendor name", "اسم المورد"],
  ["reference", "Invoice reference", "مرجع الفاتورة"],
  ["issuedOn", "Issue date", "تاريخ الإصدار"],
  ["dueOn", "Due date", "تاريخ الاستحقاق"],
  ["currency", "Currency", "العملة"],
  ["total", "Grand total", "الإجمالي"],
  ["subtotal", "Subtotal", "المجموع الفرعي"],
  ["tax", "Tax", "الضريبة"],
  ["discount", "Discount", "الخصم"],
  ["customer", "Customer", "العميل"],
  ["vendorAddress", "Vendor address", "عنوان المورد"],
  ["customerAddress", "Customer address", "عنوان العميل"],
  ["category", "Category", "الفئة"],
  ["purchaseOrder", "Purchase order", "أمر الشراء"],
  ["paymentStatus", "Payment status", "حالة الدفع"],
  ["notes", "Notes", "ملاحظات"],
];
const lines = [
  ["description", "Description", "الوصف"],
  ["quantity", "Qty", "الكمية"],
  ["unitPrice", "Unit price", "سعر الوحدة"],
  ["discount", "Discount", "الخصم"],
  ["total", "Total", "الإجمالي"],
] as const;
const statuses = ["UPLOADED", "QUEUED", "PROCESSING"];
type Action = "save" | "approve" | "reject" | "cancel" | "reprocess" | "delete";
export function Review({
  id,
  version,
  status,
  filename,
  mime,
  initial,
  original,
  issues,
  editable,
  error,
  revisions,
  locale,
  mock,
}: {
  id: string;
  version: number;
  status: string;
  filename: string;
  mime: string;
  initial: Extraction | null;
  original: Extraction | null;
  issues: Issue[];
  editable: boolean;
  error: string | null;
  revisions: { id: string; action: string; createdAt: string }[];
  locale: string;
  mock: boolean;
}) {
  const ar = locale === "ar";
  const t = (en: string, a: string) => (ar ? a : en);
  const [draft, setDraft] = useState<{ version: number; data: Extraction }>();
  const data = draft?.version === version ? draft.data : initial;
  const setData = (next: Extraction) => setDraft({ version, data: next });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const [action, setAction] = useState<Action>("approve");
  const [zoom, setZoom] = useState(100);
  const isPdf = mime === "application/pdf";
  const [preview, setPreview] = useState(true);
  const [sourceVersion, setSourceVersion] = useState(0);
  const router = useRouter();
  const confirmation = useRef<HTMLDialogElement>(null);
  const readonly = !editable || status !== "NEEDS_REVIEW";
  const pending = statuses.includes(status);
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(async () => {
      try {
        const response = await fetch("/api/workspace/documents/" + id, {
          cache: "no-store",
        });
        if (response.ok && (await response.json()).status !== status)
          router.refresh();
      } catch {
        /* The next interval retries. */
      }
    }, 2500);
    return () => clearInterval(timer);
  }, [id, status, pending, router]);
  async function submit(selected: Action) {
    setBusy(true);
    setMessage(undefined);
    try {
      await api("documents/" + id, {
        action: selected,
        version,
        ...(selected === "save" || selected === "approve" ? { data } : {}),
      });
      if (selected === "delete") router.replace("/dashboard/documents");
      else {
        setMessage({
          text:
            selected === "approve"
              ? t("Document approved.", "تم اعتماد المستند.")
              : t("Changes saved.", "تم حفظ التغييرات."),
        });
        router.refresh();
      }
    } catch (error) {
      setMessage({ text: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }
  function confirm(selected: Action) {
    setAction(selected);
    confirmation.current?.showModal();
  }
  const fileUrl = "/api/workspace/documents/" + id + "/file";
  const source = fileUrl + "?inline=1&v=" + sourceVersion;
  const actionNames = {
    approve: t("Approve document", "اعتماد المستند"),
    save: t("Save changes", "حفظ التغييرات"),
    reject: t("Reject document", "رفض المستند"),
    cancel: t("Cancel processing", "إلغاء المعالجة"),
    reprocess: t("Reprocess document", "إعادة المعالجة"),
    delete: t("Delete document", "حذف المستند"),
  };
  return (
    <>
      <div className="inline-actions review-status">
        <Status status={status} locale={locale} />
        {mock && (
          <span className="status neutral">
            {t("Mock extraction", "استخراج تجريبي")}
          </span>
        )}
        {error && <span className="warning">{error}</span>}
      </div>
      {message && (
        <div
          role={message.error ? "alert" : "status"}
          className={"notice " + (message.error ? "error" : "success")}
        >
          {message.text}
        </div>
      )}
      <div className="review-layout">
        <section className="panel review-source">
          <header className="panel-head">
            <div>
              <h2>{t("Original document", "المستند الأصلي")}</h2>
              <small>{filename}</small>
            </div>
            <a
              className="icon-button"
              href={fileUrl + "?download=1"}
              aria-label={t("Download original", "تنزيل الملف الأصلي")}
              title={t("Download original", "تنزيل الملف الأصلي")}
            >
              <Download size={17} />
            </a>
          </header>
          <div className="viewer-toolbar">
            {isPdf ? (
              <a
                className="button text small"
                href={source}
                target="_blank"
                rel="noreferrer"
              >
                {t("Open PDF in new tab", "افتح PDF في تبويب جديد")}
              </a>
            ) : (
              <>
                <button
                  className="icon-button"
                  aria-label={t("Zoom out", "تصغير")}
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                >
                  <Minus size={15} />
                </button>
                <span>{zoom}%</span>
                <button
                  className="icon-button"
                  aria-label={t("Zoom in", "تكبير")}
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                >
                  <Plus size={15} />
                </button>
              </>
            )}
            <button
              className="icon-button"
              aria-label={t("Refresh preview", "تحديث المعاينة")}
              title={t("Refresh preview", "تحديث المعاينة")}
              onClick={() => {
                setPreview(true);
                setSourceVersion(sourceVersion + 1);
              }}
            >
              <RotateCcw size={15} />
            </button>
          </div>
          <div className="source-body">
            {isPdf ? (
              <iframe
                key={source}
                src={source + "#view=FitH&pagemode=none&navpanes=0"}
                title={t("Original PDF preview", "معاينة PDF الأصلي")}
                referrerPolicy="no-referrer"
              />
            ) : preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={filename}
                src={source}
                onError={() => setPreview(false)}
                style={{ width: zoom + "%", maxWidth: "none" }}
              />
            ) : (
              <div className="empty">
                <FileText />
                <p>
                  {t(
                    "Refresh or download the original to view it.",
                    "حدّث المعاينة أو نزّل الملف الأصلي.",
                  )}
                </p>
              </div>
            )}
          </div>
        </section>
        <section className="panel review-fields">
          <header className="panel-head">
            <div>
              <h2>
                {status === "COMPLETED"
                  ? t("Approved fields", "الحقول المعتمدة")
                  : t("Extracted fields", "الحقول المستخرجة")}
              </h2>
              <small>
                {t(
                  "Review against the source before approving.",
                  "راجع الحقول بجانب الأصل قبل الاعتماد.",
                )}
              </small>
            </div>
          </header>
          {issues.length > 0 && (
            <div className="issue-list">
              {issues.map((issue, i) => (
                <article key={i} className={"issue " + issue.severity}>
                  <AlertTriangle size={16} />
                  <div>
                    <b>
                      {fields.find((x) => x[0] === issue.field)?.[ar ? 2 : 1] ??
                        issue.field}
                    </b>
                    <p>{issue.explanation}</p>
                    {issue.action && <small>{issue.action}</small>}
                    {issue.evidence && <small>{issue.evidence}</small>}
                  </div>
                </article>
              ))}
            </div>
          )}
          {!data ? (
            <div className="empty">
              <FileText />
              <h3>
                {pending
                  ? t("Extraction is pending", "الاستخراج قيد الانتظار")
                  : t("No extracted fields", "لا توجد حقول مستخرجة")}
              </h3>
              <p>
                {t(
                  "Fields will appear once document processing completes.",
                  "ستظهر الحقول بعد اكتمال معالجة المستند.",
                )}
              </p>
            </div>
          ) : (
            <form
              className="form"
              onSubmit={(event) => {
                event.preventDefault();
                submit("save");
              }}
            >
              <label>
                {t("Document type", "نوع المستند")}
                <select
                  disabled={readonly}
                  value={data.kind}
                  onChange={(event) =>
                    setData({
                      ...data,
                      kind: event.target.value as Extraction["kind"],
                    })
                  }
                >
                  {["Invoice", "Receipt", "Purchase order", "Other"].map(
                    (option, i) => (
                      <option value={option} key={option}>
                        {t(option, ["فاتورة", "إيصال", "أمر شراء", "أخرى"][i])}
                      </option>
                    ),
                  )}
                </select>
              </label>
              <div className="form-grid">
                {fields.map(([field, en, a]) => {
                  const changed =
                    original?.[field] !== data[field] && original !== null;
                  const flagged = issues.some((issue) => issue.field === field);
                  const evidence = original?.evidence.find(
                    (entry) => entry.field === field,
                  );
                  const props = {
                    value: data[field] ?? "",
                    disabled: readonly,
                    onChange: (
                      event: React.ChangeEvent<
                        | HTMLInputElement
                        | HTMLSelectElement
                        | HTMLTextAreaElement
                      >,
                    ) =>
                      setData({ ...data, [field]: event.target.value || null }),
                  };
                  return (
                    <label
                      key={field}
                      className={flagged ? "field-flagged" : ""}
                    >
                      {t(en, a)}
                      {field === "paymentStatus" ? (
                        <select {...props}>
                          <option value="">—</option>
                          {["Paid", "Unpaid", "Partially paid"].map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      ) : field === "notes" ? (
                        <textarea {...props} rows={2} maxLength={2000} />
                      ) : (
                        <input
                          {...props}
                          maxLength={field === "currency" ? 3 : 300}
                          type={
                            field === "issuedOn" || field === "dueOn"
                              ? "date"
                              : "text"
                          }
                          inputMode={
                            ["total", "subtotal", "tax", "discount"].includes(
                              field,
                            )
                              ? "decimal"
                              : undefined
                          }
                        />
                      )}
                      {changed && (
                        <small>
                          {t("Originally extracted", "الاستخراج الأصلي")} ·{" "}
                          {original?.[field] ?? "—"}
                        </small>
                      )}
                      {evidence && (
                        <small>
                          {t("Source page", "صفحة المصدر")} {evidence.page}
                        </small>
                      )}
                    </label>
                  );
                })}
              </div>
              <div className="line-header">
                <h3>{t("Line items", "البنود")}</h3>
                {!readonly && (
                  <button
                    type="button"
                    className="button small outline"
                    disabled={data.lines.length >= 200}
                    onClick={() =>
                      setData({
                        ...data,
                        lines: [
                          ...data.lines,
                          {
                            description: null,
                            quantity: null,
                            unitPrice: null,
                            discount: null,
                            total: null,
                          },
                        ],
                      })
                    }
                  >
                    <Plus size={14} />
                    {t("Add line", "إضافة بند")}
                  </button>
                )}
              </div>
              {data.lines.length === 0 && (
                <small>{t("No line items.", "لا توجد بنود.")}</small>
              )}
              {data.lines.map((line, index) => (
                <div className="line-row" key={index}>
                  {lines.map(([key, en, a]) => (
                    <label key={key}>
                      {t(en, a)}
                      <input
                        disabled={readonly}
                        value={line[key] ?? ""}
                        inputMode={
                          key === "description" ? undefined : "decimal"
                        }
                        onChange={(e) =>
                          setData({
                            ...data,
                            lines: data.lines.map((item, i) =>
                              i === index
                                ? { ...item, [key]: e.target.value || null }
                                : item,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  {!readonly && (
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={t("Remove line", "إزالة البند")}
                      onClick={() =>
                        setData({
                          ...data,
                          lines: data.lines.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              ))}
              {!readonly && (
                <div className="inline-actions">
                  <button className="button outline" disabled={busy}>
                    {actionNames.save}
                  </button>
                  <button
                    type="button"
                    className="button primary"
                    disabled={busy}
                    onClick={() => confirm("approve")}
                  >
                    <Check size={17} />
                    {actionNames.approve}
                  </button>
                  <button
                    type="button"
                    className="button text"
                    disabled={busy}
                    onClick={() => confirm("reject")}
                  >
                    {actionNames.reject}
                  </button>
                </div>
              )}
            </form>
          )}
          {editable && (
            <div className="review-actions inline-actions">
              {pending && (
                <button
                  className="button outline small"
                  disabled={busy}
                  onClick={() => confirm("cancel")}
                >
                  {actionNames.cancel}
                </button>
              )}
              {["FAILED", "REJECTED", "NEEDS_REVIEW", "CANCELED"].includes(
                status,
              ) && (
                <button
                  className="button outline small"
                  disabled={busy}
                  onClick={() => confirm("reprocess")}
                >
                  {actionNames.reprocess}
                </button>
              )}
              {status !== "PROCESSING" && (
                <button
                  className="button danger small"
                  disabled={busy}
                  onClick={() => confirm("delete")}
                >
                  {actionNames.delete}
                </button>
              )}
              {initial && (
                <Link
                  className="button text small"
                  href={"/dashboard/assistant?document=" + id}
                >
                  {t("Summarize findings", "لخّص نتائج المراجعة")}
                </Link>
              )}
            </div>
          )}
          {revisions.length > 0 && (
            <details className="revision-history">
              <summary>{t("Review history", "سجل المراجعة")}</summary>
              <ul>
                {revisions.map((item) => (
                  <li key={item.id}>
                    {actionNames[item.action as Action] ?? item.action}{" "}
                    <time>
                      {new Date(item.createdAt).toLocaleString(locale)}
                    </time>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      </div>
      <dialog className="confirmation" ref={confirmation}>
        <form method="dialog">
          <h2>{actionNames[action]}</h2>
          <p>
            {action === "approve"
              ? t(
                  "Approval locks the reviewed values and includes eligible amounts in reports.",
                  "يقفل الاعتماد البيانات ويضيف المبالغ المؤهلة إلى التقارير.",
                )
              : action === "delete"
                ? t(
                    "The worker will permanently remove this file and its review history.",
                    "سيحذف العامل الملف وسجل المراجعة نهائيًا.",
                  )
                : t(
                    "Confirm this action for the selected document.",
                    "أكد الإجراء للمستند المحدد.",
                  )}
          </p>
          <div className="inline-actions">
            <button value="cancel" className="button outline">
              {t("Back", "رجوع")}
            </button>
            <button
              value="confirm"
              className={
                "button " + (action === "delete" ? "danger" : "primary")
              }
              onClick={(event) => {
                event.preventDefault();
                confirmation.current?.close();
                submit(action);
              }}
            >
              {t("Confirm", "تأكيد")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
