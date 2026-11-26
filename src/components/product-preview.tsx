import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  FileText,
  House,
  Layers2,
  LayoutGrid,
  Search,
  ShieldCheck,
  Upload,
  Wallet,
} from "lucide-react";
import { demoDocs } from "@/lib/demo";

export function ProductPreview({ locale = "en" }: { locale?: string }) {
  const ar = locale === "ar";
  return (
    <div className="preview-scene">
      <div className="preview-arch" aria-hidden="true" />
      <div className="preview-window">
        <div className="preview-toolbar">
          <div className="window-dots">
            <i />
            <i />
            <i />
          </div>
          <span>
            {ar
              ? "لوحة تحكم · بيانات نموذجية"
              : "DocFlow dashboard · Sample data"}
          </span>
          <div className="preview-secure">
            <ShieldCheck size={12} />
          </div>
        </div>
        <div className="preview-app">
          <div className="preview-nav">
            <div className="preview-brand">
              <Layers2 size={15} /> DocFlow <b>AI</b>
            </div>
            <div className="preview-work">
              <span>N</span>
              <b>{ar ? "نورث ستار" : "Northstar Co."}</b>
              <ChevronDown size={9} />
            </div>
            {[
              { icon: House, en: "Overview", ar: "نظرة عامة" },
              { icon: FileText, en: "Documents", ar: "المستندات" },
              { icon: Upload, en: "Upload Center", ar: "مركز التحميل" },
              { icon: Wallet, en: "Invoices", ar: "الفواتير" },
              { icon: Activity, en: "Analytics", ar: "التحليلات" },
            ].map(({ icon: Icon, en, ar: label }, i) => (
              <div
                key={en}
                className={i === 0 ? "mini-link selected" : "mini-link"}
              >
                <Icon size={11} />
                {ar ? label : en}
              </div>
            ))}
            <div className="mini-link preview-help">
              <CircleHelp size={11} />
              {ar ? "المساعدة" : "Help center"}
            </div>
          </div>
          <div className="preview-inner">
            <div className="preview-top">
              <span>
                <LayoutGrid size={10} /> {ar ? "مساحة العمل" : "Workspace"}{" "}
                <b> / </b> {ar ? "نظرة عامة" : "Overview"}
              </span>
              <Search size={12} />
            </div>
            <div className="preview-welcome">
              <div>
                <small>{ar ? "نظرة عامة" : "WORKSPACE OVERVIEW"}</small>
                <h2>{ar ? "مرحبًا، أليكس" : "Good morning, Alex"}</h2>
              </div>
              <span className="preview-upload">
                <Upload size={10} /> {ar ? "تحميل" : "Upload files"}
              </span>
            </div>
            <div className="preview-metrics">
              <div>
                <small>
                  <FileText size={10} /> {ar ? "المستندات" : "Total documents"}
                </small>
                <strong>128</strong>
                <span>
                  <ArrowUpRight size={9} /> {ar ? "عينة" : "Sample"}
                </span>
              </div>
              <div>
                <small>
                  <Check size={10} /> {ar ? "تمت المعالجة" : "Processed"}
                </small>
                <strong>112</strong>
                <span>{ar ? "هذا الشهر" : "This month"}</span>
              </div>
              <div>
                <small>
                  <Wallet size={10} /> {ar ? "الإنفاق" : "Invoice total"}
                </small>
                <strong>$3,374</strong>
                <span>USD</span>
              </div>
            </div>
            <div className="preview-chart">
              <div>
                <b>{ar ? "نشاط المستندات" : "Document activity"}</b>
                <span>
                  {ar ? "آخر ٦ أشهر" : "Last 6 months"} <ChevronDown size={8} />
                </span>
              </div>
              <div className="preview-bars" dir="ltr">
                {[22, 40, 33, 63, 52, 84, 67, 100, 76, 93, 79, 112].map(
                  (h, i) => (
                    <i key={i} style={{ height: h * 0.67 + "%" }} />
                  ),
                )}
              </div>
              <div className="preview-months" dir="ltr">
                <span>Jun</span>
                <span>Jul</span>
                <span>Aug</span>
                <span>Sep</span>
                <span>Oct</span>
                <span>Nov</span>
              </div>
            </div>
            <div className="preview-files">
              <b>{ar ? "المستندات الأخيرة" : "Recent documents"}</b>
              {demoDocs.slice(0, 2).map((d) => (
                <div key={d.ref}>
                  <span className={"document-icon " + d.color}>
                    <FileText size={12} />
                  </span>
                  <span>{d.name}</span>
                  <span
                    className={
                      d.status === "Approved"
                        ? "mini-status success"
                        : "mini-status"
                    }
                  >
                    {ar
                      ? d.status === "Approved"
                        ? "معتمد"
                        : "قيد المراجعة"
                      : d.status}
                  </span>
                  <b>{d.total}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="floating-card">
        <span className="floating-icon">
          <Check size={18} strokeWidth={2.7} />
        </span>
        <div>
          <b>{ar ? "اكتمل الاستخراج" : "Extraction complete"}</b>
          <small>Northstar-INV-1042.pdf</small>
        </div>
      </div>
    </div>
  );
}
