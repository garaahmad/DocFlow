export const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Rx1sAAAAASUVORK5CYII=",
  "base64",
);

export function invoicePdf(
  reference = "TEST-1042",
  source = {
    vendor: "Northstar Studio",
    category: "Brand design",
    subtotal: "150.00",
    tax: "12.00",
    total: "162.00",
  },
) {
  const stream = [
    "BT /F1 26 Tf 50 720 Td (" + source.vendor + ") Tj",
    "/F1 14 Tf 0 -55 Td (INVOICE " + reference + ") Tj",
    "0 -35 Td (" + source.category + ":     USD " + source.subtotal + ") Tj",
    "0 -25 Td (Tax:              USD " + source.tax + ") Tj",
    "0 -40 Td (Grand total:     USD " + source.total + ") Tj ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " +
      Buffer.byteLength(stream) +
      " >>\nstream\n" +
      stream +
      "\nendstream",
  ];
  let content = "%PDF-1.4\n";
  const offsets = objects.map((object, i) => {
    const offset = Buffer.byteLength(content);
    content += i + 1 + " 0 obj\n" + object + "\nendobj\n";
    return offset;
  });
  const xref = Buffer.byteLength(content);
  content +=
    "xref\n0 6\n0000000000 65535 f \n" +
    offsets
      .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
      .join("") +
    "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" +
    xref +
    "\n%%EOF\n";
  return Buffer.from(content);
}
