import { createHash } from "node:crypto";
import Decimal from "decimal.js";
import { z } from "zod";

export const maxFileBytes = 10 * 1024 * 1024;
export const mimeTypes = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export function inspectFile(bytes: Uint8Array, declared: string) {
  if (!bytes.length || bytes.length > maxFileBytes)
    throw new Error("Use files up to 10 MB.");
  const data = Buffer.from(bytes);
  const detected =
    data.subarray(0, 5).toString() === "%PDF-" &&
    data.subarray(-1024).includes(Buffer.from("%%EOF"))
      ? "application/pdf"
      : data.subarray(0, 3).equals(Buffer.from([255, 216, 255])) &&
          data.subarray(-2).equals(Buffer.from([255, 217]))
        ? "image/jpeg"
        : data
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
            data.subarray(-8, -4).toString() === "IEND"
          ? "image/png"
          : data.subarray(0, 4).toString() === "RIFF" &&
              data.subarray(8, 12).toString() === "WEBP" &&
              data.readUInt32LE(4) + 8 === data.length
            ? "image/webp"
            : null;
  if (
    !detected ||
    (declared &&
      declared !== "application/octet-stream" &&
      detected !== declared)
  )
    throw new Error("Use a valid PDF, JPEG, PNG, or WebP file.");
  return {
    mime: detected,
    hash: createHash("sha256").update(data).digest("hex"),
  };
}

const FinancialDecimal = Decimal.clone({ precision: 50 });
const money = z
  .string()
  .regex(/^-?\d{1,16}(\.\d{1,6})?$/)
  .nullable();
const label = z.string().max(300).nullable();
const date = z.iso.date().nullable();
export const lineSchema = z.object({
  description: label,
  quantity: money,
  unitPrice: money,
  discount: money,
  total: money,
});
export const extractionSchema = z.object({
  kind: z.enum(["Invoice", "Receipt", "Purchase order", "Other"]),
  vendor: label,
  vendorAddress: label,
  customer: label,
  customerAddress: label,
  reference: label,
  issuedOn: date,
  dueOn: date,
  currency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .nullable(),
  category: label,
  subtotal: money,
  tax: money,
  discount: money,
  total: money,
  paymentStatus: z.enum(["Paid", "Unpaid", "Partially paid"]).nullable(),
  purchaseOrder: label,
  notes: z.string().max(2000).nullable(),
  lines: z.array(lineSchema).max(200),
  evidence: z
    .array(
      z.object({ field: z.string().max(80), page: z.number().int().min(1) }),
    )
    .max(45),
});
export type Extraction = z.infer<typeof extractionSchema>;
export const issueSchema = z.object({
  type: z.string().max(60),
  severity: z.enum(["info", "warning", "error"]),
  field: z.string().max(80),
  explanation: z.string().max(450),
  action: z.string().max(300).nullable(),
  evidence: z.string().max(300).nullable(),
});
export type Issue = z.infer<typeof issueSchema>;
export const issuesSchema = z.array(issueSchema).max(20);
export const blankExtraction: Extraction = {
  kind: "Invoice",
  vendor: null,
  vendorAddress: null,
  customer: null,
  customerAddress: null,
  reference: null,
  issuedOn: null,
  dueOn: null,
  currency: null,
  category: null,
  subtotal: null,
  tax: null,
  discount: null,
  total: null,
  paymentStatus: null,
  purchaseOrder: null,
  notes: null,
  lines: [],
  evidence: [],
};
export function vendorKey(name: string) {
  return name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}
export function indexing(data: Extraction) {
  return {
    kind: data.kind,
    vendor: data.vendor,
    vendorKey: data.vendor ? vendorKey(data.vendor) : null,
    reference: data.reference,
    currency: data.currency,
    total: data.total,
    issuedOn: data.issuedOn ? new Date(data.issuedOn + "T00:00:00Z") : null,
  };
}

function tolerance(currency: string | null) {
  try {
    const places =
      new Intl.NumberFormat("en", {
        style: "currency",
        currency: currency ?? "USD",
      }).resolvedOptions().maximumFractionDigits ?? 2;
    return new FinancialDecimal(10).pow(-places);
  } catch {
    return new FinancialDecimal("0.01");
  }
}

export function validateInvoice(
  data: Extraction,
  duplicate = false,
  similarVendor = false,
): Issue[] {
  const results: Issue[] = [];
  const report = (
    type: string,
    severity: Issue["severity"],
    field: string,
    explanation: string,
    action: string,
  ) =>
    results.push({
      type,
      severity,
      field,
      explanation,
      action,
      evidence: null,
    });
  const differs = (a: Decimal, b: string) =>
    a.minus(b).abs().gte(tolerance(data.currency));

  if (data.kind === "Invoice" || data.kind === "Receipt") {
    const required =
      data.kind === "Invoice"
        ? (["vendor", "reference", "issuedOn", "total", "currency"] as const)
        : (["vendor", "issuedOn", "total", "currency"] as const);
    for (const field of required)
      if (!data[field])
        report(
          "missing",
          "warning",
          field,
          "A core field is missing.",
          "Check the original document.",
        );
  }
  if (data.issuedOn && data.dueOn && data.dueOn < data.issuedOn)
    report(
      "date",
      "error",
      "dueOn",
      "Due date precedes issue date.",
      "Confirm both dates.",
    );
  if (
    data.subtotal !== null &&
    data.tax !== null &&
    data.total !== null &&
    differs(
      new FinancialDecimal(data.subtotal)
        .plus(data.tax)
        .minus(data.discount ?? 0),
      data.total,
    )
  ) {
    report(
      "total",
      "warning",
      "total",
      "Subtotal, tax and discount do not reconcile with the total.",
      "Check for rounding, fees or an incorrect extracted amount.",
    );
  }
  if (
    data.lines.length &&
    data.subtotal !== null &&
    data.lines.every((line) => line.total !== null)
  ) {
    const lineSum = data.lines.reduce(
      (sum, line) => sum.plus(line.total ?? 0),
      new FinancialDecimal(0),
    );
    if (differs(lineSum, data.subtotal))
      report(
        "line_total",
        "warning",
        "subtotal",
        "Line totals do not reconcile with the subtotal.",
        "Review line items and discounts.",
      );
  }
  if (
    data.lines.some(
      (line) =>
        line.quantity !== null &&
        line.unitPrice !== null &&
        line.total !== null &&
        differs(
          new FinancialDecimal(line.quantity)
            .mul(line.unitPrice)
            .minus(line.discount ?? 0),
          line.total,
        ),
    )
  ) {
    report(
      "line_amount",
      "warning",
      "lines",
      "One or more quantities and unit prices do not reconcile with line totals.",
      "Check item quantities, prices and discounts.",
    );
  }
  if (
    data.tax !== null &&
    data.subtotal !== null &&
    new FinancialDecimal(data.tax).gt(new FinancialDecimal(data.subtotal).abs())
  )
    report(
      "tax",
      "warning",
      "tax",
      "Tax exceeds the subtotal magnitude.",
      "Verify tax and subtotal in the source.",
    );
  if (data.total !== null && new FinancialDecimal(data.total).isNegative())
    report(
      "negative",
      "info",
      "total",
      "The total is negative.",
      "Confirm whether this is a credit or reversal.",
    );
  if (duplicate)
    report(
      "duplicate",
      "warning",
      "reference",
      "A document from this vendor has the same reference.",
      "Review the other document before approving.",
    );
  if (similarVendor)
    report(
      "vendor",
      "info",
      "vendor",
      "Another document uses a different spelling for this vendor.",
      "Confirm the vendor name before approval.",
    );
  return results;
}
