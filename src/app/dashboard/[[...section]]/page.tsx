import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  Download,
  FileText,
  ReceiptText,
} from "lucide-react";
import { pageContext, ServiceError } from "@/lib/access";
import { db } from "@/lib/db";
import { can, canManageRole } from "@/lib/permissions";
import { rangeFrom, summary, dateWindow } from "@/lib/analytics";
import { displayMoney } from "@/lib/money";
import { language } from "@/lib/language";
import { statusText, englishStatuses } from "@/lib/navigation";
import { byId } from "@/lib/document-service";
import { extractionSchema, issuesSchema } from "@/lib/documents";
import { aiReady, mockEnabled } from "@/lib/ai/clients";
import { billingEnabled, billingHistory } from "@/lib/billing";
import { getPlan, monthKey } from "@/lib/usage";
import { plans } from "@/lib/plans";
import type { Prisma } from "@/generated/prisma/client";
import {
  Empty,
  EventList,
  Metrics,
  PageHeading,
  UploadLink,
} from "@/components/app-shared";
import { DocumentTable } from "@/components/document-table";
import { TrendChart } from "@/components/charts";
import { Review } from "@/components/review";
import { UploadCenter } from "@/components/upload-center";
import { WorkspaceForm } from "@/components/workspace-form";
import {
  Assistant,
  BillingButtons,
  PrintReport,
  Profile,
  SaveReport,
  TeamTools,
} from "@/components/workspace-tools";

type Query = Record<string, string | string[] | undefined>;
const pick = (q: Query, key: string) =>
  typeof q[key] === "string" ? q[key] : undefined;
const toDate = (date: Date) => date.toISOString().slice(0, 10);
function RangeForm({
  range,
  locale,
}: {
  range: { from: string; to: string };
  locale: string;
}) {
  const ar = locale === "ar";
  return (
    <form className="filter-bar panel" method="get">
      <label>
        {ar ? "من" : "From"}
        <input name="from" type="date" defaultValue={range.from} required />
      </label>
      <label>
        {ar ? "إلى" : "To"}
        <input name="to" type="date" defaultValue={range.to} required />
      </label>
      <button className="button outline">
        <CalendarRange size={16} />
        {ar ? "تطبيق الفترة" : "Apply dates"}
      </button>
    </form>
  );
}
function ExportLinks({
  locale,
  range,
  invoicesOnly = false,
}: {
  locale: string;
  range?: { from: string; to: string };
  invoicesOnly?: boolean;
}) {
  const query = new URLSearchParams(range);
  if (invoicesOnly) query.set("kind", "invoice");
  const q = query.size ? "?" + query.toString() : "";
  return (
    <>
      <a
        className="button outline small"
        href={"/api/workspace/export/csv" + q}
      >
        <Download size={15} />
        {locale === "ar" ? "تنزيل CSV" : "Export CSV"}
      </a>
      <a
        className="button outline small"
        href={"/api/workspace/export/xlsx" + q}
      >
        <Download size={15} />
        {locale === "ar" ? "تنزيل Excel" : "Export Excel"}
      </a>
    </>
  );
}
export default async function AppPage({
  params,
  searchParams,
}: {
  params: Promise<{ section?: string[] }>;
  searchParams: Promise<Query>;
}) {
  const { section = [] } = await params;
  const [slug = "", detail, ...rest] = section;
  const q = await searchParams;
  if (
    rest.length ||
    (detail && !["documents", "invoices", "vendors"].includes(slug))
  )
    notFound();
  const { user, workspace, workspaceId, role } = await pageContext();
  const locale = await language();
  const ar = locale === "ar";
  const t = (en: string, a: string) => (ar ? a : en);
  const write = can(role, "write");
  const manage = can(role, "manage");
  const currentRange = rangeFrom(pick(q, "from"), pick(q, "to"));
  const assistantEnabled = write && (aiReady("INSIGHTS") || mockEnabled());

  if ((slug === "documents" || slug === "invoices") && detail) {
    const doc = await byId(workspaceId, detail).catch((error) => {
      if (error instanceof ServiceError && error.status === 404) notFound();
      throw error;
    });
    if (slug === "invoices" && doc.kind !== "Invoice") notFound();
    const revisions = await db.documentRevision.findMany({
      where: { documentId: doc.id, document: { workspaceId } },
      select: { id: true, action: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return (
      <>
        <PageHeading
          title={doc.vendor ?? doc.filename}
          subtitle={
            doc.reference ??
            t(
              "Review the document and verify the extracted information.",
              "راجع المستند وتحقق من المعلومات المستخرجة.",
            )
          }
        >
          <Link className="button outline small" href={"/dashboard/" + slug}>
            {t("Back to list", "العودة إلى القائمة")}
          </Link>
        </PageHeading>
        <Review
          id={doc.id}
          version={doc.version}
          status={doc.status}
          filename={doc.filename}
          mime={doc.mime}
          initial={
            extractionSchema.safeParse(
              doc.approved ?? doc.edited ?? doc.extracted,
            ).data ?? null
          }
          original={extractionSchema.safeParse(doc.extracted).data ?? null}
          issues={issuesSchema.safeParse(doc.findings).data ?? []}
          editable={write}
          error={doc.error}
          revisions={revisions.map((item) => ({
            ...item,
            createdAt: item.createdAt.toISOString(),
          }))}
          locale={locale}
          mock={doc.mock}
        />
      </>
    );
  }
  if (slug === "upload") {
    const enabled =
      write &&
      Boolean(
        (aiReady("EXTRACTION") || mockEnabled()) &&
        process.env.S3_BUCKET &&
        process.env.S3_REGION &&
        process.env.S3_ACCESS_KEY_ID &&
        process.env.S3_SECRET_ACCESS_KEY,
      );
    return (
      <>
        <PageHeading
          title={t("Upload center", "مركز التحميل")}
          subtitle={t(
            "Import PDFs and images for extraction and human review.",
            "استورد ملفات PDF والصور للاستخراج والمراجعة.",
          )}
        />
        {write ? (
          <UploadCenter
            locale={locale}
            enabled={enabled}
            mock={mockEnabled()}
          />
        ) : (
          <div className="panel notice">
            {t(
              "Your role can view documents. Ask an editor to upload files.",
              "يتيح دورك عرض المستندات. اطلب من محرر تحميل الملفات.",
            )}
          </div>
        )}
      </>
    );
  }
  if (slug === "documents" || slug === "invoices") {
    const invoice = slug === "invoices";
    const search = (pick(q, "q") ?? "").trim().slice(0, 120);
    const status = pick(q, "status");
    const vendor = pick(q, "vendor")?.slice(0, 120);
    const sort = pick(q, "sort");
    const from = pick(q, "from");
    const to = pick(q, "to");
    const filter: Prisma.DocumentWhereInput = {
      workspaceId,
      status:
        status &&
        status !== "DELETING" &&
        Object.hasOwn(englishStatuses, status)
          ? (status as Prisma.EnumDocumentStatusFilter["equals"])
          : { not: "DELETING" },
      ...(invoice ? { kind: "Invoice" } : {}),
      ...(vendor ? { vendorKey: vendor } : {}),
      ...(search
        ? {
            OR: ["filename", "vendor", "reference"].map((field) => ({
              [field]: { contains: search, mode: "insensitive" },
            })),
          }
        : {}),
      ...(from && to ? { issuedOn: dateWindow(currentRange) } : {}),
    };
    const order: Prisma.DocumentOrderByWithRelationInput =
      sort === "oldest"
        ? { createdAt: "asc" }
        : sort === "vendor"
          ? { vendor: "asc" }
          : sort === "status"
            ? { status: "asc" }
            : { createdAt: "desc" };
    const pageIndex = Math.max(
      1,
      Math.min(500, Number.parseInt(pick(q, "page") ?? "1", 10) || 1),
    );
    const [documents, count, vendors] = await Promise.all([
      db.document.findMany({
        where: filter,
        orderBy: [order, { id: "desc" }],
        take: 20,
        skip: (pageIndex - 1) * 20,
      }),
      db.document.count({ where: filter }),
      db.document.groupBy({
        by: ["vendorKey"],
        where: {
          workspaceId,
          vendorKey: { not: null },
          status: { not: "DELETING" },
        },
        _max: { vendor: true },
        orderBy: { vendorKey: "asc" },
        take: 200,
      }),
    ]);
    const linkFor = (page: number) => {
      const query = new URLSearchParams(
        Object.entries(q).flatMap(([key, value]) =>
          typeof value === "string" && key !== "page" ? [[key, value]] : [],
        ),
      );
      query.set("page", String(page));
      return "/dashboard/" + slug + "?" + query;
    };
    return (
      <>
        <PageHeading
          title={
            invoice ? t("Invoices", "الفواتير") : t("Documents", "المستندات")
          }
          subtitle={
            invoice
              ? t(
                  "Search invoices and review approved amounts in their original currencies.",
                  "ابحث في الفواتير وراجع المبالغ المعتمدة بعملاتها الأصلية.",
                )
              : t(
                  "Find originals, track processing, and review extracted records.",
                  "اعثر على الأصول وتابع المعالجة وراجع السجلات المستخرجة.",
                )
          }
        >
          {invoice && (
            <ExportLinks
              locale={locale}
              range={from && to ? currentRange : undefined}
              invoicesOnly
            />
          )}{" "}
          {write && <UploadLink locale={locale} />}
        </PageHeading>
        <section className="panel">
          <form className="filter-bar" method="get">
            <label>
              {t("Search", "بحث")}
              <input
                type="search"
                name="q"
                defaultValue={search}
                placeholder={t(
                  "Filename, vendor or reference",
                  "اسم الملف أو المورد أو المرجع",
                )}
              />
            </label>
            <label>
              {t("Status", "الحالة")}
              <select name="status" defaultValue={status ?? ""}>
                <option value="">{t("All statuses", "كل الحالات")}</option>
                {Object.keys(englishStatuses)
                  .filter((code) => code !== "DELETING")
                  .map((code) => (
                    <option key={code} value={code}>
                      {statusText(code, locale)}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t("Vendor", "المورد")}
              <select name="vendor" defaultValue={vendor ?? ""}>
                <option value="">{t("All vendors", "كل الموردين")}</option>
                {vendors
                  .filter((v) => v.vendorKey)
                  .map((v) => (
                    <option key={v.vendorKey} value={v.vendorKey ?? ""}>
                      {v._max.vendor}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              {t("Sort", "ترتيب")}
              <select name="sort" defaultValue={sort ?? ""}>
                <option value="">{t("Newest first", "الأحدث أولًا")}</option>
                <option value="oldest">
                  {t("Oldest first", "الأقدم أولًا")}
                </option>
                <option value="vendor">{t("Vendor name", "اسم المورد")}</option>
                <option value="status">{t("Status", "الحالة")}</option>
              </select>
            </label>
            {invoice && (
              <>
                <label>
                  {t("From", "من")}
                  <input name="from" type="date" defaultValue={from ?? ""} />
                </label>
                <label>
                  {t("To", "إلى")}
                  <input name="to" type="date" defaultValue={to ?? ""} />
                </label>
              </>
            )}
            <button className="button outline">{t("Apply", "تطبيق")}</button>
          </form>
          {documents.length ? (
            <DocumentTable documents={documents} locale={locale} />
          ) : (
            <Empty
              title={t("No matching documents", "لا توجد مستندات مطابقة")}
              body={t(
                "Change your filters or upload a business document to start.",
                "غيّر عوامل التصفية أو حمّل مستندًا للبدء.",
              )}
              icon={ReceiptText}
            />
          )}
          {count > 20 && (
            <div className="pagination">
              <span>
                {count.toLocaleString(locale)} {t("results", "نتيجة")}
              </span>
              {pageIndex > 1 && (
                <Link
                  className="button small outline"
                  href={linkFor(pageIndex - 1)}
                >
                  {t("Previous", "السابق")}
                </Link>
              )}
              {pageIndex * 20 < count && (
                <Link
                  className="button small outline"
                  href={linkFor(pageIndex + 1)}
                >
                  {t("Next", "التالي")}
                </Link>
              )}
            </div>
          )}
        </section>
      </>
    );
  }
  if (slug === "vendors") {
    const search = (pick(q, "q") ?? "").trim().slice(0, 120);
    if (detail) {
      const vendorKey = detail;
      const documents = await db.document.findMany({
        where: { workspaceId, vendorKey, status: { not: "DELETING" } },
        orderBy: { issuedOn: "desc" },
        take: 50,
      });
      if (!documents.length) notFound();
      const totals = await db.document.groupBy({
        by: ["currency"],
        where: {
          workspaceId,
          vendorKey,
          currency: { not: null },
          status: "COMPLETED",
          kind: { in: ["Invoice", "Receipt"] },
        },
        _sum: { total: true },
        _count: true,
      });
      return (
        <>
          <PageHeading
            title={documents[0].vendor ?? vendorKey}
            subtitle={t(
              "Vendor spending and recent linked documents.",
              "إنفاق المورد والمستندات المرتبطة.",
            )}
          >
            <Link className="button outline" href="/dashboard/vendors">
              {t("All vendors", "جميع الموردين")}
            </Link>
          </PageHeading>
          <div className="panel stack">
            <h2>{t("Approved spending", "الإنفاق المعتمد")}</h2>
            <div className="inline-actions">
              {totals.map((row) => (
                <span className="status success" key={row.currency}>
                  {displayMoney(
                    row._sum.total?.toFixed(),
                    row.currency,
                    locale,
                  )}{" "}
                  · {row._count} {t("records", "سجلات")}
                </span>
              ))}
            </div>
            <DocumentTable documents={documents} locale={locale} />
          </div>
        </>
      );
    }
    const vendors = await db.document.groupBy({
      by: ["vendorKey"],
      where: {
        workspaceId,
        vendorKey: { not: null },
        status: { not: "DELETING" },
        ...(search
          ? { vendor: { contains: search, mode: "insensitive" } }
          : {}),
      },
      _max: { vendor: true },
      _count: true,
      orderBy: { vendorKey: "asc" },
      take: 100,
    });
    return (
      <>
        <PageHeading
          title={t("Vendors", "الموردون")}
          subtitle={t(
            "Explore vendor profiles and linked invoices.",
            "استكشف ملفات الموردين والفواتير المرتبطة.",
          )}
        />
        <section className="panel stack">
          <form className="filter-bar">
            <label>
              {t("Vendor name", "اسم المورد")}
              <input type="search" name="q" defaultValue={search} />
            </label>
            <button className="button outline">{t("Search", "بحث")}</button>
          </form>
          {vendors.length ? (
            <ul className="data-list">
              {vendors.map((v) => (
                <li key={v.vendorKey}>
                  <Link
                    className="underlined"
                    href={
                      "/dashboard/vendors/" +
                      encodeURIComponent(v.vendorKey ?? "")
                    }
                  >
                    {v._max.vendor}
                  </Link>
                  <span>
                    {v._count} {t("documents", "مستند")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty
              title={t("No vendors found", "لم يتم العثور على موردين")}
              body={t(
                "Vendors appear when a document identifies them.",
                "يظهر المورد عندما يتعرف عليه أحد المستندات.",
              )}
            />
          )}
        </section>
      </>
    );
  }
  if (slug === "assistant") {
    const documentId = pick(q, "document");
    if (documentId)
      await byId(workspaceId, documentId).catch((error) => {
        if (error instanceof ServiceError && error.status === 404) notFound();
        throw error;
      });
    return (
      <>
        <PageHeading
          title={t("AI assistant", "المساعد الذكي")}
          subtitle={t(
            "Ask about approved spending, vendors, duplicates, or review findings.",
            "اسأل عن الإنفاق المعتمد أو الموردين أو المستندات المكررة أو نتائج المراجعة.",
          )}
        />
        <Assistant
          locale={locale}
          documentId={documentId}
          enabled={assistantEnabled}
        />
      </>
    );
  }
  if (slug === "activity") {
    const page = Math.min(
      500,
      Math.max(1, parseInt(pick(q, "page") ?? "1", 10) || 1),
    );
    const events = await db.auditEvent.findMany({
      where: { workspaceId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * 30,
      take: 31,
    });
    return (
      <>
        <PageHeading
          title={t("Activity", "النشاط")}
          subtitle={t(
            "A record of important actions in this workspace.",
            "سجل الإجراءات المهمة في مساحة العمل.",
          )}
        />
        <section className="panel">
          <EventList events={events.slice(0, 30)} locale={locale} />
          <div className="pagination">
            {page > 1 && (
              <Link
                className="button small outline"
                href={"?page=" + (page - 1)}
              >
                {t("Previous", "السابق")}
              </Link>
            )}
            {events.length > 30 && (
              <Link
                className="button small outline"
                href={"?page=" + (page + 1)}
              >
                {t("Next", "التالي")}
              </Link>
            )}
          </div>
        </section>
      </>
    );
  }
  if (slug === "team") {
    const [members, plan, pending] = await Promise.all([
      db.membership.findMany({
        where: { workspaceId },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      getPlan(workspaceId),
      db.invitation.count({
        where: { workspaceId, acceptedAt: null, expiresAt: { gt: new Date() } },
      }),
    ]);
    return (
      <>
        <PageHeading
          title={t("Team", "الفريق")}
          subtitle={t(
            "Manage who can view, edit, and administer this workspace.",
            "أدر من يمكنه العرض والتحرير وإدارة مساحة العمل.",
          )}
        />
        <p className="notice">
          {members.length} / {plans[plan].seats}{" "}
          {t("seats in use", "مقاعد مستخدمة")} · {pending}{" "}
          {t("pending invitations", "دعوات معلقة")}
        </p>
        <TeamTools
          locale={locale}
          eligible={manage && plans[plan].seats > 1}
          members={members.map((m) => ({
            id: m.userId,
            name: m.user.name,
            email: m.user.email,
            role: m.role,
            editable:
              manage && m.userId !== user.id && canManageRole(role, m.role),
          }))}
        />
      </>
    );
  }
  if (slug === "settings")
    return (
      <>
        <PageHeading
          title={t("Settings", "الإعدادات")}
          subtitle={t(
            "Manage workspace preferences, profile, and password.",
            "أدر تفضيلات مساحة العمل والملف الشخصي وكلمة المرور.",
          )}
        />
        {manage && (
          <section className="panel stack">
            <WorkspaceForm
              settings
              locale={locale}
              initial={{
                name: workspace.name,
                business: workspace.business,
                locale: workspace.locale,
                currency: workspace.currency,
              }}
            />
          </section>
        )}
        <Profile locale={locale} name={user.name} email={user.email} />
      </>
    );
  if (slug === "billing") {
    const [subscription, usage, code] = await Promise.all([
      db.subscription.findUnique({ where: { workspaceId } }),
      db.usage.findUnique({
        where: { workspaceId_period: { workspaceId, period: monthKey() } },
      }),
      getPlan(workspaceId),
    ]);
    const plan = plans[code];
    let invoices: Awaited<ReturnType<typeof billingHistory>> = [];
    let historyUnavailable = false;
    if (can(role, "bill") && subscription) {
      try {
        invoices = await billingHistory(subscription.customerId);
      } catch {
        historyUnavailable = true;
      }
    }
    return (
      <>
        <PageHeading
          title={t("Billing", "الفوترة")}
          subtitle={t(
            "Review your plan and this month’s document allowance.",
            "راجع خطتك وحدود المستندات لهذا الشهر.",
          )}
        />
        {pick(q, "checkout") === "received" && (
          <p className="notice">
            {t(
              "Stripe returned from checkout. Your plan changes once the subscription is confirmed.",
              "عاد Stripe من الدفع. تتغير الخطة عند تأكيد الاشتراك.",
            )}
          </p>
        )}
        <section className="panel stack">
          <div className="panel-head">
            <h2>{plan.name}</h2>
            <span className="status neutral">
              {subscription?.status ?? t("Starter access", "وصول ابتدائي")}
            </span>
          </div>
          <div className="usage-meter">
            <b>
              {usage?.uploads ?? 0} / {plan.documents}{" "}
              {t("documents this month", "مستندات هذا الشهر")}
            </b>
            <progress max={plan.documents} value={usage?.uploads ?? 0} />
            <small>
              {usage?.insightRequests ?? 0} / {plan.insights}{" "}
              {t("assistant requests", "طلبات المساعد")}
            </small>
          </div>
          {billingEnabled() && can(role, "bill") ? (
            <BillingButtons locale={locale} />
          ) : (
            <p className="notice">
              {!billingEnabled()
                ? t(
                    "Payments are disabled until Stripe is configured.",
                    "الدفع معطّل حتى إعداد Stripe.",
                  )
                : t(
                    "The workspace owner manages billing.",
                    "يدير مالك مساحة العمل الفوترة.",
                  )}
            </p>
          )}
        </section>
        {historyUnavailable && (
          <p className="notice">
            {t(
              "Stripe billing history is temporarily unavailable.",
              "سجل الفوترة غير متاح مؤقتًا.",
            )}
          </p>
        )}
        {invoices.length > 0 && (
          <section className="panel">
            <h2>{t("Billing history", "سجل الفوترة")}</h2>
            <ul className="data-list">
              {invoices.map((invoice) => (
                <li key={invoice.number}>
                  <span>
                    {invoice.number} · {invoice.date}
                  </span>
                  <span>{invoice.status}</span>
                  {invoice.url && (
                    <a className="underlined" href={invoice.url}>
                      {t("View invoice", "عرض الفاتورة")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </>
    );
  }
  if (!["", "analytics", "reports"].includes(slug)) notFound();

  const stats = await summary(workspaceId, currentRange, workspace.currency);
  const chartPanel = (
    kind: "activity" | "spend" | "exceptions",
    title: string,
    subtitle: string,
  ) => {
    const has = stats.months.some((month) =>
      kind === "activity"
        ? month.uploaded
        : kind === "spend"
          ? month.spend
          : month.exceptions,
    );
    return (
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>{title}</h2>
            <small>{subtitle}</small>
          </div>
        </header>
        {has ? (
          <TrendChart data={stats.months} locale={locale} kind={kind} />
        ) : (
          <Empty
            title={t("Nothing to chart yet", "لا توجد بيانات للرسم")}
            body={t(
              "This chart will update as records become available.",
              "سيتم تحديث الرسم عند توفر السجلات.",
            )}
            icon={BarChart3}
          />
        )}
      </section>
    );
  };
  if (slug === "") {
    const name = user.name.trim().split(/\s+/)[0];
    const attention = stats.latest
      .filter((doc) => doc.status === "NEEDS_REVIEW" || doc.status === "FAILED")
      .slice(0, 3);
    return (
      <>
        <PageHeading
          title={t("Welcome, " + name, "مرحبًا، " + name)}
          subtitle={t(
            "Here’s what’s happening with your documents.",
            "تابع آخر المستجدات في مستنداتك.",
          )}
        >
          {write && <UploadLink locale={locale} />}
        </PageHeading>
        {mockEnabled() && (
          <p className="notice">
            {t(
              "Local mock extraction is active. Extracted values come from test fixtures.",
              "الاستخراج التجريبي مفعّل محليًا.",
            )}
          </p>
        )}
        <Metrics values={stats} locale={locale} />
        <div className="panel-grid">
          {chartPanel(
            "activity",
            t("Document activity", "نشاط المستندات"),
            t("Uploaded and processed by month", "التحميل والمعالجة حسب الشهر"),
          )}
          {chartPanel(
            "spend",
            t("Spending over time", "الإنفاق بمرور الوقت"),
            stats.currency +
              " · " +
              t(
                "Approved invoices and receipts",
                "الفواتير والإيصالات المعتمدة",
              ),
          )}
        </div>
        <section className="panel">
          <header className="panel-head">
            <div>
              <h2>{t("Recent documents", "المستندات الأخيرة")}</h2>
              <small>
                {t(
                  "Latest uploads in this workspace",
                  "أحدث الملفات في مساحة العمل",
                )}
              </small>
            </div>
            <Link className="button outline small" href="/dashboard/documents">
              {t("View all", "عرض الكل")}
            </Link>
          </header>
          {stats.latest.length ? (
            <DocumentTable documents={stats.latest} locale={locale} />
          ) : (
            <Empty
              title={t("Your first document goes here", "مستندك الأول هنا")}
              body={t(
                "Upload an invoice or receipt to start extracting and reviewing fields.",
                "حمّل فاتورة أو إيصالًا لبدء استخراج الحقول ومراجعتها.",
              )}
            >
              {write && <UploadLink locale={locale} />}
              <Link className="button outline" href="/demo">
                {t("Explore demo", "استكشف العرض")}
              </Link>
            </Empty>
          )}
        </section>
        <div className="panel-grid">
          <section className="panel">
            <h2>{t("Review alerts", "تنبيهات المراجعة")}</h2>
            {attention.length ? (
              <ul className="data-list">
                {attention.map((doc) => (
                  <li key={doc.id}>
                    <Link href={"/dashboard/documents/" + doc.id}>
                      <AlertTriangle size={15} /> {doc.vendor ?? doc.filename}
                    </Link>
                    <small>{statusText(doc.status, locale)}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                {t(
                  "No recent documents need attention.",
                  "لا توجد مستندات حديثة تحتاج إلى مراجعة.",
                )}
              </p>
            )}
          </section>
          <section className="panel">
            <h2>{t("Recent workspace activity", "نشاط مساحة العمل الأخير")}</h2>
            <EventList events={stats.events} locale={locale} />
          </section>
        </div>
      </>
    );
  }
  const ranked = (title: string, rows: typeof stats.byVendor) => (
    <section className="panel">
      <h2>{title}</h2>
      {rows.length ? (
        <ul className="data-list">
          {rows.slice(0, 12).map((row) => (
            <li key={row.name + row.currency}>
              <b>{row.name}</b>
              <span>{displayMoney(row.total, row.currency, locale)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          {t(
            "No approved spending in this range.",
            "لا يوجد إنفاق معتمد في هذه الفترة.",
          )}
        </p>
      )}
    </section>
  );
  const reports =
    slug === "reports"
      ? await db.report.findMany({
          where: { workspaceId },
          orderBy: { createdAt: "desc" },
          take: 50,
        })
      : [];
  return (
    <>
      <PageHeading
        title={
          slug === "reports"
            ? t("Reports", "التقارير")
            : t("Analytics", "التحليلات")
        }
        subtitle={t(
          "Explore workspace activity and approved spending by currency.",
          "استكشف النشاط والإنفاق المعتمد حسب العملة.",
        )}
      >
        <ExportLinks locale={locale} range={currentRange} />
        {slug === "reports" && <PrintReport locale={locale} />}
      </PageHeading>
      <RangeForm range={currentRange} locale={locale} />
      <Metrics values={stats} locale={locale} />
      <div className="panel-grid">
        {chartPanel(
          "spend",
          t("Monthly spending", "الإنفاق الشهري"),
          stats.currency,
        )}
        {chartPanel(
          "activity",
          t("Document activity", "نشاط المستندات"),
          t("Uploads and processed records", "التحميلات والسجلات المعالجة"),
        )}
      </div>
      <div className="panel-grid">
        {ranked(t("Spending by vendor", "الإنفاق حسب المورد"), stats.byVendor)}
        {ranked(
          t("Spending by category", "الإنفاق حسب الفئة"),
          stats.byCategory,
        )}
      </div>
      <div className="panel-grid">
        {chartPanel(
          "exceptions",
          t("Review and exceptions", "المراجعة والاستثناءات"),
          t(
            "Current disposition grouped by upload month",
            "الحالة الحالية حسب شهر التحميل",
          ),
        )}
        <section className="panel">
          <h2>{t("Status distribution", "توزيع الحالات")}</h2>
          {stats.statuses.length ? (
            <ul className="data-list">
              {stats.statuses.map((s) => (
                <li key={s.status}>
                  <b>{statusText(s.status, locale)}</b>
                  <span>{s._count._all}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">
              {t("No documents yet.", "لا توجد مستندات بعد.")}
            </p>
          )}
          <h2>
            {t("Approved amounts by currency", "المبالغ المعتمدة حسب العملة")}
          </h2>
          <ul className="data-list">
            {stats.totals.map((x) => (
              <li key={x.currency}>
                <b>{x.currency}</b>
                <span>{displayMoney(x.total, x.currency, locale)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      {slug === "reports" && (
        <>
          <section className="panel stack">
            <h2>{t("Saved report ranges", "الفترات المحفوظة للتقارير")}</h2>
            {write && <SaveReport locale={locale} range={currentRange} />}
            <ul className="data-list">
              {reports.map((report) => (
                <li key={report.id}>
                  <Link
                    className="underlined"
                    href={
                      "?from=" +
                      toDate(report.from) +
                      "&to=" +
                      toDate(report.to)
                    }
                  >
                    <FileText size={15} /> {report.name}
                  </Link>
                  <span>
                    {toDate(report.from)} – {toDate(report.to)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <Assistant
            key={currentRange.from + currentRange.to}
            locale={locale}
            enabled={assistantEnabled}
            range={currentRange}
          />
        </>
      )}
    </>
  );
}
