import { describe, expect, it } from "vitest";
import {
  blankExtraction,
  extractionSchema,
  inspectFile,
  maxFileBytes,
  validateInvoice,
  vendorKey,
} from "@/lib/documents";
import { displayMoney } from "@/lib/money";
import { invoicePdf, png } from "./fixtures";
describe("upload validation", () => {
  it("checks signatures and hashes identical inputs deterministically", () => {
    const a = invoicePdf();
    expect(inspectFile(a, "application/pdf")).toEqual(
      inspectFile(a, "application/octet-stream"),
    );
    expect(inspectFile(a, "application/pdf").hash).not.toBe(
      inspectFile(invoicePdf("SECOND"), "application/pdf").hash,
    );
    expect(inspectFile(png, "image/png").mime).toBe("image/png");
  });
  it("rejects falsely declared, truncated, empty and oversized documents", () => {
    expect(() => inspectFile(png, "image/jpeg")).toThrow("valid PDF");
    expect(() =>
      inspectFile(Buffer.from("%PDF-1.4"), "application/pdf"),
    ).toThrow("valid PDF");
    expect(() => inspectFile(Buffer.alloc(0), "")).toThrow("10 MB");
    expect(() => inspectFile(Buffer.alloc(maxFileBytes + 1), "")).toThrow(
      "10 MB",
    );
  });
});
describe("extraction and deterministic validation", () => {
  const values = {
    ...blankExtraction,
    vendor: "Northstar Studio",
    reference: "INV-42",
    issuedOn: "2026-11-03",
    currency: "USD",
    subtotal: "0.20",
    tax: "0.10",
    total: "0.30",
  };
  it("accepts explicit nulls and rejects numbers and invalid dates", () => {
    expect(extractionSchema.safeParse(values).success).toBe(true);
    expect(extractionSchema.safeParse({ ...values, total: 0.3 }).success).toBe(
      false,
    );
    expect(
      extractionSchema.safeParse({ ...values, issuedOn: "2026-02-29" }).success,
    ).toBe(false);
    expect(
      extractionSchema.safeParse({ ...values, paymentStatus: "Guess" }).success,
    ).toBe(false);
  });
  it("calculates exact cents and detects inconsistencies", () => {
    expect(validateInvoice(values)).toEqual([]);
    const result = validateInvoice(
      {
        ...values,
        total: "0.35",
        dueOn: "2026-11-02",
        lines: [
          {
            description: null,
            quantity: "2",
            unitPrice: "0.02",
            discount: null,
            total: "0.09",
          },
        ],
      },
      true,
    );
    expect(result.map((issue) => issue.type)).toEqual(
      expect.arrayContaining([
        "date",
        "total",
        "line_total",
        "line_amount",
        "duplicate",
      ]),
    );
  });
  it("keeps stable vendor keys and exact currency rendering", () => {
    expect(vendorKey("Ｎorthstar–Studio!")).toBe("northstar studio");
    expect(vendorKey("شركة النور")).toBe("شركة النور");
    expect(displayMoney("9999999999999999.21", "USD")).toBe(
      "$9,999,999,999,999,999.21",
    );
    expect(displayMoney("-0.21", "USD")).toBe("-$0.21");
  });
});
