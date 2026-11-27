import Link from "next/link";
import {
  ArrowDown,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardCheck,
  CloudUpload,
  Copy,
  Download,
  FileCheck2,
  FileStack,
  FileText,
  Layers3,
  LockKeyhole,
  ReceiptText,
  ScanLine,
  Users,
  WalletCards,
  Play,
  ShieldCheck,
  Menu,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Preferences } from "@/components/preferences";
import { ProductPreview } from "@/components/product-preview";
import { language } from "@/lib/language";
import { PricingCards } from "@/components/pricing-cards";
import { demoDocs, sampleInvoiceExtractedTotal } from "@/lib/demo";

const features = [
  {
    Icon: ScanLine,
    title: "AI Document Extraction",
    ar: "استخراج البيانات بالذكاء الاصطناعي",
    copy: "Capture vendors, totals, taxes, dates, and line items from PDFs and images.",
    desc: "استخرج الموردين والمبالغ والضرائب والتواريخ وبنود الفواتير.",
  },
  {
    Icon: ClipboardCheck,
    title: "Intelligent Validation",
    ar: "التحقق الذكي",
    copy: "Catch mismatched totals and missing fields before approval.",
    desc: "اكتشف المبالغ غير المتطابقة والحقول الناقصة قبل الاعتماد.",
  },
  {
    Icon: Copy,
    title: "Duplicate Detection",
    ar: "اكتشاف التكرار",
    copy: "Identify identical uploads and flag matching vendor references.",
    desc: "اكتشف الملفات المكررة ومراجع الفواتير المتطابقة.",
  },
  {
    Icon: ChartNoAxesCombined,
    title: "Smart Analytics",
    ar: "تحليلات ذكية",
    copy: "Understand spending, vendor activity, and review workload.",
    desc: "تابع الإنفاق ونشاط الموردين والمستندات قيد المراجعة.",
  },
  {
    Icon: FileStack,
    title: "Automated Reports",
    ar: "تقارير آلية",
    copy: "Create a date-filtered report you can revisit, print, and share.",
    desc: "أنشئ تقارير حسب الفترة وارجع إليها أو اطبعها.",
  },
  {
    Icon: Users,
    title: "Team Collaboration",
    ar: "تعاون الفريق",
    copy: "Assign workspace roles and see who reviewed each document.",
    desc: "عيّن أدوار الفريق وتابع سجل مراجعة المستندات.",
  },
  {
    Icon: LockKeyhole,
    title: "Secure Document Storage",
    ar: "تخزين آمن",
    copy: "Keep originals private with workspace access and expiring links.",
    desc: "احفظ الملفات بشكل خاص مع روابط وصول مؤقتة.",
  },
  {
    Icon: Download,
    title: "Excel and CSV Export",
    ar: "التصدير إلى Excel وCSV",
    copy: "Take approved records into spreadsheets and accounting workflows.",
    desc: "صدّر البيانات المعتمدة إلى جداول البيانات وبرامج المحاسبة.",
  },
];
const workflow = [
  {
    Icon: CloudUpload,
    title: "Upload",
    ar: "تحميل",
    text: "Drop in PDFs or images. Add one document or a whole batch.",
    desc: "أضف مستندًا واحدًا أو مجموعة من ملفات PDF والصور.",
  },
  {
    Icon: ScanLine,
    title: "Extract",
    ar: "استخراج",
    text: "Gemini turns document fields into structured records.",
    desc: "يحوّل Gemini حقول المستند إلى سجلات منظمة.",
  },
  {
    Icon: FileCheck2,
    title: "Review",
    ar: "مراجعة",
    text: "Check findings next to the source, make edits, and approve.",
    desc: "راجع التنبيهات بجانب الأصل وعدّل البيانات واعتمدها.",
  },
  {
    Icon: ChartNoAxesCombined,
    title: "Analyze & export",
    ar: "تحليل وتصدير",
    text: "Explore verified totals by vendor and export your records.",
    desc: "استكشف الإجماليات المعتمدة حسب المورد وصدّر سجلاتك.",
  },
];
const faq = [
  [
    "What documents can I upload?",
    "You can upload PDF, JPEG, PNG, and WebP files up to 10 MB each. Invoices, receipts, and purchase orders have dedicated extraction fields.",
    "ما المستندات التي يمكن تحميلها؟",
    "يمكن تحميل PDF وJPEG وPNG وWebP حتى ١٠ ميغابايت لكل ملف.",
  ],
  [
    "Can I edit what AI extracts?",
    "Yes. Compare fields against the original, save corrections, and approve the document when you are ready. DocFlow retains the original extraction and review history.",
    "هل يمكن تعديل البيانات المستخرجة؟",
    "نعم. قارن الحقول بالأصل واحفظ التصحيحات واعتمد المستند عند الانتهاء.",
  ],
  [
    "How are totals handled across currencies?",
    "Each original currency stays attached to its amount. Analytics and exports keep spending separated by currency.",
    "كيف تُحسب الإجماليات بالعملات المختلفة؟",
    "تحتفظ كل قيمة بعملتها الأصلية وتبقى الإجماليات منفصلة حسب العملة.",
  ],
  [
    "Do I need an account to try the demo?",
    "No. The public demo uses simulated documents and lets you browse the dashboard and complete a sample review.",
    "هل أحتاج إلى حساب لتجربة العرض؟",
    "يمكنك تجربة عرض المستندات ومراجعتها دون حساب.",
  ],
];
export default async function Home() {
  const locale = await language();
  const ar = locale === "ar";
  const t = (en: string, arabic: string) => (ar ? arabic : en);
  const sampleInvoice = demoDocs[0];
  const extractedTotal = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(sampleInvoiceExtractedTotal));
  const nav = [
    ["#product", t("Product", "المنتج")],
    ["#features", t("Features", "المزايا")],
    ["#workflow", t("How It Works", "كيف يعمل")],
    ["#pricing", t("Pricing", "الأسعار")],
    ["#faq", t("FAQ", "الأسئلة")],
  ];
  return (
    <>
      <header className="site-header">
        <div className="site-nav wrap">
          <Brand />
          <nav
            aria-label={t("Main navigation", "القائمة الرئيسية")}
            className="desktop-nav"
          >
            {nav.map(([href, label]) => (
              <a href={href} key={href}>
                {label}
              </a>
            ))}
          </nav>
          <div className="nav-actions">
            <Preferences locale={locale} />
            <Link href="/login" className="login-link">
              {t("Log in", "تسجيل الدخول")}
            </Link>
            <Link href="/register" className="button small primary">
              {t("Get started", "ابدأ الآن")}
            </Link>
          </div>
          <details className="mobile-menu">
            <summary aria-label={t("Open navigation", "فتح القائمة")}>
              <Menu size={22} />
            </summary>
            <nav>
              {nav.map(([href, label]) => (
                <a href={href} key={href}>
                  {label}
                </a>
              ))}
              <Link href="/login">{t("Log in", "تسجيل الدخول")}</Link>
            </nav>
          </details>
        </div>
      </header>
      <main>
        <section className="hero" id="product">
          <div className="hero-grid wrap">
            <div className="hero-copy">
              <div className="eyebrow">
                <span className="eyebrow-dot" />
                {t("DOCUMENT INTELLIGENCE", "ذكاء المستندات")}
              </div>
              <h1>
                {t("Turn Documents Into", "حوّل مستنداتك إلى")}{" "}
                <em>{t("Actionable Intelligence.", "رؤى قابلة للتنفيذ.")}</em>
              </h1>
              <p>
                {t(
                  "Extract, organize, verify, and understand your business documents with AI-powered automation.",
                  "استخرج بيانات مستندات عملك ونظّمها وتحقق منها وافهمها باستخدام الأتمتة بالذكاء الاصطناعي.",
                )}
              </p>
              <div className="hero-actions">
                <Link href="/register" className="button primary">
                  {t("Start for Free", "ابدأ مجانًا")}
                </Link>
                <Link href="/demo" className="button outline">
                  <Play size={15} fill="currentColor" />
                  {t("Explore Demo", "استكشف العرض")}
                </Link>
              </div>
              <div className="hero-note">
                <ShieldCheck size={17} />{" "}
                {t(
                  "Private workspaces · No card required for Starter",
                  "مساحات عمل خاصة · الخطة المجانية دون بطاقة",
                )}
              </div>
            </div>
            <Link
              href="/demo"
              className="preview-link"
              aria-label={t(
                "Open interactive dashboard preview",
                "افتح المعاينة التفاعلية للوحة التحكم",
              )}
            >
              <ProductPreview locale={locale} />
            </Link>
          </div>
        </section>
        <section
          className="formats"
          aria-label={t("Supported file types", "أنواع الملفات المدعومة")}
        >
          <div className="wrap formats-row">
            <span>
              {t("BUILT FOR YOUR EVERYDAY DOCUMENTS", "لمستندات عملك اليومية")}
            </span>
            <div>
              <ReceiptText size={21} />
              {t("Invoices", "الفواتير")}
            </div>
            <div>
              <WalletCards size={21} />
              {t("Receipts", "الإيصالات")}
            </div>
            <div>
              <FileText size={21} />
              {t("Purchase orders", "أوامر الشراء")}
            </div>
            <div>
              <Layers3 size={21} />
              {t("Business documents", "مستندات الأعمال")}
            </div>
          </div>
        </section>
        <section className="site-section wrap" id="workflow">
          <div className="section-head">
            <span className="overline">{t("THE WORKFLOW", "سير العمل")}</span>
            <h2>
              {t(
                "From upload to approved data.",
                "من التحميل إلى البيانات المعتمدة.",
              )}
            </h2>
            <p>
              {t(
                "One workspace for every step of document review.",
                "مساحة عمل واحدة لكل خطوات مراجعة المستندات.",
              )}
            </p>
          </div>
          <div className="workflow-grid">
            {workflow.map(({ Icon, title, ar: label, text, desc }) => (
              <article key={title} className="workflow-card">
                <span className="feature-icon">
                  <Icon size={22} />
                </span>
                <h3>{t(title, label)}</h3>
                <p>{t(text, desc)}</p>
              </article>
            ))}
          </div>
          <article className="sample-review">
            <div className="sample-review-copy">
              <h3>{t("Review a sample invoice", "راجع فاتورة نموذجية")}</h3>
              <p>
                {t(
                  "Compare the extracted total with the original, correct the amount, and approve the record. The demo opens directly to the invoice.",
                  "قارن الإجمالي المستخرج بالأصل وصحّح المبلغ ثم اعتمد السجل. يفتح العرض على الفاتورة مباشرة.",
                )}
              </p>
              <Link href="/demo?view=review" className="button primary">
                <ReceiptText size={17} aria-hidden="true" />
                {t("Open the sample review", "افتح مراجعة العينة")}
              </Link>
            </div>
            <div className="sample-review-invoice">
              <div className="sample-review-reference">
                <strong>{sampleInvoice.name}</strong>
                <span dir="ltr">{sampleInvoice.ref}</span>
              </div>
              <dl>
                <div>
                  <dt>{t("Extracted total", "الإجمالي المستخرج")}</dt>
                  <dd className="sample-review-mismatch" dir="ltr">
                    {extractedTotal}
                  </dd>
                </div>
                <div>
                  <dt>{t("Original total", "الإجمالي الأصلي")}</dt>
                  <dd dir="ltr">{sampleInvoice.total}</dd>
                </div>
              </dl>
            </div>
          </article>
        </section>
        <section className="site-section tinted" id="features">
          <div className="wrap">
            <div className="section-head">
              <span className="overline">
                {t("PRODUCT FEATURES", "مزايا المنتج")}
              </span>
              <h2>
                {t(
                  "Tools for the work behind the paperwork.",
                  "أدوات لإدارة مستندات العمل.",
                )}
              </h2>
              <p>
                {t(
                  "Review invoices, track vendor spending, and prepare clean records for your team.",
                  "راجع الفواتير وتابع إنفاق الموردين وجهّز سجلات واضحة لفريقك.",
                )}
              </p>
            </div>
            <div className="feature-grid">
              {features.map(({ Icon, title, ar: label, copy, desc }) => (
                <article key={title} className="workflow-card">
                  <span className="feature-icon">
                    <Icon size={21} />
                  </span>
                  <h3>{t(title, label)}</h3>
                  <p>{t(copy, desc)}</p>
                </article>
              ))}
            </div>
            <div className="use-cases">
              <div>
                <b>{t("Freelancers", "المستقلون")}</b>
                <span>
                  {t(
                    "Organize receipts for month-end.",
                    "نظّم إيصالات نهاية الشهر.",
                  )}
                </span>
              </div>
              <div>
                <b>{t("Accountants", "المحاسبون")}</b>
                <span>
                  {t(
                    "Review exceptions before posting.",
                    "راجع الاستثناءات قبل الترحيل.",
                  )}
                </span>
              </div>
              <div>
                <b>{t("Operations teams", "فرق العمليات")}</b>
                <span>
                  {t(
                    "Track recurring vendors and approvals.",
                    "تابع الموردين والاعتمادات.",
                  )}
                </span>
              </div>
            </div>
          </div>
        </section>
        <section className="site-section wrap" id="pricing">
          <div className="section-head">
            <span className="overline">{t("PRICING", "الأسعار")}</span>
            <h2>
              {t(
                "Choose a plan for your workload.",
                "اختر خطة تناسب حجم عملك.",
              )}
            </h2>
          </div>
          <PricingCards locale={locale} />
          <p className="plan-link">
            <Link href="/pricing" className="underlined">
              {t("Compare plans", "قارن الخطط")}
            </Link>
          </p>
        </section>
        <section className="site-section tinted" id="faq">
          <div className="wrap faq-layout">
            <div className="section-head">
              <span className="overline">{t("FAQ", "الأسئلة")}</span>
              <h2>{t("Frequently asked questions", "الأسئلة الشائعة")}</h2>
            </div>
            <div>
              {faq.map(([q, a, qa, aa]) => (
                <details className="faq" key={q}>
                  <summary>
                    {t(q, qa)}
                    <ChevronDown size={18} />
                  </summary>
                  <p>{t(a, aa)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
        <section className="wrap closing">
          <div>
            <h2>
              {t(
                "Ready to review your first document?",
                "هل أنت مستعد لمراجعة أول مستند؟",
              )}
            </h2>
            <p>
              {t(
                "Create a workspace or explore a sample at your own pace.",
                "أنشئ مساحة عمل أو استكشف العرض التجريبي.",
              )}
            </p>
          </div>
          <Link href="/register" className="button primary">
            {t("Start for Free", "ابدأ مجانًا")}
          </Link>
        </section>
      </main>
      <footer className="site-footer">
        <div className="wrap footer-row">
          <div>
            <Brand />
            <p>
              {t("From Documents to Decisions.", "من المستندات إلى القرارات.")}
            </p>
          </div>
          <div>
            <Link href="/privacy">{t("Privacy", "الخصوصية")}</Link>
            <Link href="/terms">{t("Terms", "الشروط")}</Link>
            <Link href="/support">{t("Support", "الدعم")}</Link>
            <a href="#product" aria-label={t("Back to top", "العودة للأعلى")}>
              <ArrowDown size={17} style={{ transform: "rotate(180deg)" }} />
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
