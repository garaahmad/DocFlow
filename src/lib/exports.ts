import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { dateWindow } from "@/lib/analytics";
import { ServiceError } from "@/lib/access";

const fields = [
  "Filename",
  "Type",
  "Vendor",
  "Reference",
  "Date",
  "Currency",
  "Approved total",
  "Status",
];
function csvCell(input: string) {
  const value =
    /^[\s]*[=+\-@]/.test(input) && !/^-\d+(\.\d+)?$/.test(input)
      ? "'" + input
      : input;
  return '"' + value.replace(/"/g, '""') + '"';
}
export async function exportDocuments(
  workspaceId: string,
  format: "csv" | "xlsx",
  range?: { from: string; to: string },
  invoicesOnly = false,
) {
  const docs = await db.document.findMany({
    where: {
      workspaceId,
      status: "COMPLETED",
      ...(invoicesOnly ? { kind: "Invoice" } : {}),
      ...(range ? { issuedOn: dateWindow(range) } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 10001,
  });
  if (docs.length > 10000)
    throw new ServiceError(
      413,
      "Export a shorter date range of up to 10,000 documents.",
    );
  const rows = docs.map((d) => [
    d.filename,
    d.kind ?? "",
    d.vendor ?? "",
    d.reference ?? "",
    d.issuedOn?.toISOString().slice(0, 10) ?? "",
    d.currency ?? "",
    d.total?.toFixed() ?? "",
    d.status,
  ]);
  const headers = {
    "Content-Disposition":
      'attachment; filename="docflow-approved-' +
      (invoicesOnly ? "invoices" : "documents") +
      "." +
      format +
      '"',
    "Cache-Control": "no-store",
  };
  if (format === "csv")
    return new Response(
      "\uFEFF" +
        [fields, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n"),
      { headers: { ...headers, "Content-Type": "text/csv; charset=utf-8" } },
    );
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Approved documents", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  sheet.addRow(fields).font = { bold: true };
  sheet.addRows(rows);
  sheet.columns.forEach((col) => {
    col.width = 19;
  });
  const buffer = await book.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer), {
    headers: {
      ...headers,
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  });
}
