export const navigation = [
  ["", "Overview", "نظرة عامة"],
  ["documents", "Documents", "المستندات"],
  ["upload", "Upload Center", "مركز التحميل"],
  ["invoices", "Invoices", "الفواتير"],
  ["vendors", "Vendors", "الموردون"],
  ["analytics", "Analytics", "التحليلات"],
  ["assistant", "AI Assistant", "المساعد الذكي"],
  ["reports", "Reports", "التقارير"],
  ["activity", "Activity", "النشاط"],
  ["team", "Team", "الفريق"],
  ["billing", "Billing", "الفوترة"],
  ["settings", "Settings", "الإعدادات"],
] as const;
export const englishStatuses: Record<string, string> = {
  UPLOADED: "Uploaded",
  QUEUED: "Queued",
  PROCESSING: "Processing",
  NEEDS_REVIEW: "Needs review",
  COMPLETED: "Approved",
  FAILED: "Failed",
  REJECTED: "Rejected",
  CANCELED: "Canceled",
  DELETING: "Deleting",
};
export const arabicStatuses: Record<string, string> = {
  UPLOADED: "تم التحميل",
  QUEUED: "في قائمة الانتظار",
  PROCESSING: "المعالجة جارية",
  NEEDS_REVIEW: "قيد المراجعة",
  COMPLETED: "معتمد",
  FAILED: "فشلت المعالجة",
  REJECTED: "مرفوض",
  CANCELED: "ملغى",
  DELETING: "الحذف جارٍ",
};
export function statusText(status: string, locale: string) {
  return (locale === "ar" ? arabicStatuses : englishStatuses)[status] ?? status;
}
