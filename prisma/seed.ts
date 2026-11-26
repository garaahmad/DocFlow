import "dotenv/config";
import { db } from "@/lib/db";
import {
  blankExtraction,
  indexing,
  inspectFile,
  validateInvoice,
  type Extraction,
} from "@/lib/documents";
import { putFile, removeFile } from "@/lib/storage";
import { invoicePdf } from "../tests/fixtures";

async function main() {
  const email = process.argv[2]?.toLowerCase();
  const localHosts = ["localhost", "127.0.0.1"];
  if (
    process.env.RENDER ||
    process.env.DOCFLOW_MOCK_AI !== "true" ||
    !email ||
    !localHosts.includes(new URL(process.env.DATABASE_URL ?? "").hostname) ||
    !localHosts.includes(new URL(process.env.S3_ENDPOINT ?? "").hostname)
  ) {
    throw new Error(
      "Use the local mock database and storage, and pass a registered account email.",
    );
  }
  const account = await db.user.findUnique({ where: { email } });
  if (!account) throw new Error("Register this account before seeding.");
  const existing = await db.workspace.findFirst({
    where: {
      name: "Sample — Northstar Operations",
      members: { some: { userId: account.id, role: "OWNER" } },
    },
  });
  const workspace =
    existing ??
    (await db.workspace.create({
      data: {
        name: "Sample — Northstar Operations",
        locale: "en",
        currency: "USD",
        business: "Operations",
        members: { create: { userId: account.id, role: "OWNER" } },
      },
    }));
  const records = [
    {
      vendor: "Northstar Studio",
      reference: "DEMO-1042",
      subtotal: "150.00",
      tax: "12.00",
      total: "164.00",
      category: "Design services",
      approved: false,
    },
    {
      vendor: "Orbit Software",
      reference: "DEMO-2081",
      subtotal: "260.00",
      tax: "26.00",
      total: "286.00",
      category: "Software",
      approved: true,
    },
    {
      vendor: "Fieldwork Labs",
      reference: "DEMO-0739",
      subtotal: "2800.00",
      tax: "160.00",
      total: "2960.00",
      category: "Research",
      approved: true,
    },
  ];
  for (const [index, { approved, ...record }] of records.entries()) {
    const extracted: Extraction = {
      ...blankExtraction,
      ...record,
      issuedOn: new Date(Date.now() - index * 86400000)
        .toISOString()
        .slice(0, 10),
      currency: "USD",
    };
    const bytes = invoicePdf(record.reference, {
      vendor: record.vendor,
      category: record.category,
      subtotal: record.subtotal,
      tax: record.tax,
      total: approved ? record.total : "162.00",
    });
    const file = inspectFile(bytes, "application/pdf");
    if (
      await db.document.findUnique({
        where: {
          workspaceId_hash: { workspaceId: workspace.id, hash: file.hash },
        },
      })
    )
      continue;
    const key = workspace.id + "/seed-" + file.hash;
    await putFile(key, bytes, file.mime);
    try {
      await db.document.create({
        data: {
          ...file,
          ...indexing(extracted),
          workspaceId: workspace.id,
          storageKey: key,
          bytes: bytes.length,
          filename: record.reference + ".pdf",
          mock: true,
          status: approved ? "COMPLETED" : "NEEDS_REVIEW",
          extracted,
          findings: validateInvoice(extracted),
          ...(approved ? { approved: extracted, edited: extracted } : {}),
        },
      });
    } catch (error) {
      await removeFile(key);
      throw error;
    }
  }
  console.log("Synthetic documents are ready in the sample workspace.");
}
main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : "Seed failed.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
