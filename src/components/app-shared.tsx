import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  CloudUpload,
  FileText,
  WalletCards,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";
import { statusText } from "@/lib/navigation";
import { displayMoney } from "@/lib/money";

export function PageHeading({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {children && <div className="inline-actions">{children}</div>}
    </div>
  );
}
export function UploadLink({ locale }: { locale: string }) {
  return (
    <Link className="button primary" href="/dashboard/upload">
      <CloudUpload size={18} />
      {locale === "ar" ? "تحميل الملفات" : "Upload files"}
    </Link>
  );
}
export function Empty({
  title,
  body,
  children,
  icon: Icon = FolderOpen,
}: {
  title: string;
  body: string;
  children?: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="empty">
      <span className="feature-icon">
        <Icon size={21} />
      </span>
      <h3>{title}</h3>
      <p>{body}</p>
      {children && <div className="inline-actions">{children}</div>}
    </div>
  );
}
export function Status({ status, locale }: { status: string; locale: string }) {
  const state =
    {
      COMPLETED: "success",
      NEEDS_REVIEW: "waiting",
      PROCESSING: "working",
      QUEUED: "working",
      FAILED: "failure",
      REJECTED: "failure",
    }[status] ?? "neutral";
  return (
    <span className={"status " + state}>
      <i />
      {statusText(status, locale)}
    </span>
  );
}
export function Metrics({
  values,
  locale,
}: {
  values: {
    all: number;
    processed: number;
    review: number;
    money: string | null;
    currency: string;
    success: number | null;
  };
  locale: string;
}) {
  const ar = locale === "ar";
  const metrics = [
    {
      icon: FileText,
      label: ar ? "إجمالي المستندات" : "Total documents",
      value: values.all.toLocaleString(locale),
      color: "lavender",
      note: ar ? "جميع المستندات" : "All workspace documents",
    },
    {
      icon: CheckCircle2,
      label: ar ? "تمت المعالجة" : "Processed",
      value: values.processed.toLocaleString(locale),
      color: "mint",
      note:
        values.success === null
          ? ar
            ? "بانتظار المعالجة"
            : "Awaiting processing"
          : (ar ? "نسبة النجاح " : "Success rate ") + values.success + "%",
    },
    {
      icon: Clock3,
      label: ar ? "قيد المراجعة" : "Needs review",
      value: values.review.toLocaleString(locale),
      color: "peach",
      note: ar ? "بانتظار اعتماد الفريق" : "Awaiting approval",
    },
    {
      icon: WalletCards,
      label: ar ? "الإنفاق المعتمد" : "Approved spending",
      value: displayMoney(values.money, values.currency, locale),
      color: "blue",
      note:
        values.currency + " · " + (ar ? "الفترة المحددة" : "Selected period"),
    },
  ];
  return (
    <div className="metrics">
      {metrics.map(({ icon: Icon, label, value, color, note }) => (
        <article className="panel metric" key={label}>
          <div>
            <span className={"document-icon " + color}>
              <Icon size={17} />
            </span>
            <b>{label}</b>
          </div>
          <strong>{value}</strong>
          <small>{note}</small>
        </article>
      ))}
    </div>
  );
}
export const eventLabels: Record<string, [string, string]> = {
  "workspace.created": ["Workspace created", "تم إنشاء مساحة العمل"],
  "workspace.updated": ["Workspace updated", "تم تحديث مساحة العمل"],
  "document.uploaded": ["Document uploaded", "تم تحميل مستند"],
  "document.processed": ["Document processed", "تمت معالجة المستند"],
  "document.mock_processed": [
    "Mock extraction completed",
    "اكتمل الاستخراج التجريبي",
  ],
  "document.approve": ["Document approved", "تم اعتماد المستند"],
  "document.save": ["Corrections saved", "تم حفظ التصحيحات"],
  "document.reject": ["Document rejected", "تم رفض المستند"],
  "document.delete": ["Document deletion requested", "تم طلب حذف المستند"],
  "document.cancel": ["Processing canceled", "تم إلغاء المعالجة"],
  "document.reprocess": ["Reprocessing requested", "تم طلب إعادة المعالجة"],
  "team.invited": ["Workspace invitation sent", "تم إرسال دعوة"],
  "team.joined": ["Member joined", "انضم عضو"],
  "team.removed": ["Member removed", "تمت إزالة عضو"],
  "team.role_changed": ["Member role updated", "تم تغيير دور العضو"],
  "report.saved": ["Report saved", "تم حفظ التقرير"],
};
export function EventList({
  events,
  locale,
}: {
  events: { id: string; action: string; createdAt: Date }[];
  locale: string;
}) {
  if (!events.length)
    return (
      <p className="muted">
        {locale === "ar" ? "لا يوجد نشاط." : "No workspace activity yet."}
      </p>
    );
  return (
    <ul className="event-list">
      {events.map((event) => (
        <li key={event.id}>
          <span className="event-dot" />
          <b>
            {eventLabels[event.action]?.[locale === "ar" ? 1 : 0] ??
              event.action}
          </b>
          <time dateTime={event.createdAt.toISOString()}>
            {event.createdAt.toLocaleDateString(locale, {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </li>
      ))}
    </ul>
  );
}
