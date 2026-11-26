import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { invoicePdf } from "../fixtures";
import { join } from "node:path";

const appOrigin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const origin = { Origin: appOrigin };
async function screenshot(page: Page, name: string) {
  const path = process.env.DOCFLOW_SCREENSHOTS;
  if (path)
    await page.screenshot({
      path: join(path, name + ".png"),
      animations: "disabled",
      fullPage: name === "docflow-arabic-mobile",
    });
}
async function register(page: Page, name: string) {
  const email = "test-" + randomUUID() + "@example.test";
  await page.goto("/register");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: false })
    .fill("Test-password-2026!");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/onboarding/);
  await page.getByLabel("Workspace name").fill(name + " Workspace");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Finish setup" }).click();
  await expect(page.getByText("Your workspace is ready")).toBeVisible();
}
test("public demo and Arabic RTL work on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Turn Documents Into Actionable Intelligence.",
    }),
  ).toBeVisible();
  await screenshot(page, "docflow-landing");
  await page.getByRole("link", { name: "Explore Demo" }).click();
  await expect(
    page.getByRole("heading", { name: "Workspace overview" }),
  ).toBeVisible();
  await screenshot(page, "docflow-demo-overview");
  await page.getByRole("button", { name: "Review sample invoice" }).click();
  await expect(page.getByText("Check the grand total")).toBeVisible();
  await screenshot(page, "docflow-demo-review");
  await page.getByRole("button", { name: "Use amount from source" }).click();
  await page.getByRole("button", { name: "Approve sample" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Sample approved" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Switch to Arabic" }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(
    page.getByRole("heading", { name: "مراجعة الحقول" }),
  ).toBeVisible();
  await screenshot(page, "docflow-arabic-mobile");
});

test("registration, queue, validation, approval, export and workspace isolation", async ({
  page,
  browser,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/login/);
  await register(page, "Alex Owner");
  await page.getByRole("link", { name: "Upload first document" }).click();
  await expect(
    page.getByText("Local mock extraction is active.", { exact: false }),
  ).toBeVisible();
  const bytes = invoicePdf();
  await page.locator("input[type=file]").setInputFiles({
    name: "northstar.pdf",
    mimeType: "application/pdf",
    buffer: bytes,
  });
  await page.getByRole("button", { name: "Upload selected files" }).click();
  await page.getByRole("link", { name: "Open document" }).click();
  await expect(page.getByText("Needs review", { exact: true })).toBeVisible({
    timeout: 45000,
  });
  await expect(
    page.getByText(
      "Subtotal, tax and discount do not reconcile with the total.",
    ),
  ).toBeVisible();
  const docId = page.url().split("/").at(-1)!;
  const malformed = await page.request.post("/api/workspace/upload", {
    data: Buffer.from("fake"),
    headers: {
      ...origin,
      "x-file-name": "fake.pdf",
      "content-type": "application/pdf",
    },
  });
  expect(malformed.status()).toBe(415);
  const duplicate = await page.request.post("/api/workspace/upload", {
    data: bytes,
    headers: {
      ...origin,
      "x-file-name": "duplicate.pdf",
      "content-type": "application/pdf",
    },
  });
  expect(duplicate.status()).toBe(409);
  const signed = await page.request.get(
    "/api/workspace/documents/" + docId + "/file?download=1",
    { maxRedirects: 0 },
  );
  expect(signed.status()).toBe(302);
  expect(signed.headers()["location"]).toContain("X-Amz-Expires=90");
  const retrieved = await page.request.get(signed.headers()["location"]);
  expect(retrieved.ok()).toBe(true);
  expect(await retrieved.body()).toEqual(bytes);
  await expect(page.getByLabel("Grand total", { exact: false })).toHaveValue(
    "164.00",
  );
  await page.setViewportSize({ width: 1440, height: 960 });
  await screenshot(page, "docflow-live-review");
  await page.getByLabel("Grand total", { exact: false }).fill("162.00");
  await page.getByRole("button", { name: "Approve document" }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByText("Approved fields")).toBeVisible();
  await expect(page.getByText("Originally extracted · 164.00")).toBeVisible();
  const status = await page.request.get("/api/workspace/documents/" + docId);
  expect((await status.json()).status).toBe("COMPLETED");
  const rerun = await page.request.post("/api/workspace/documents/" + docId, {
    data: { action: "reprocess", version: (await status.json()).version },
    headers: origin,
  });
  expect(rerun.status()).toBe(409);
  await page.goto("/dashboard");
  await expect(page.getByText("$162.00").first()).toBeVisible();
  await page.goto("/dashboard/invoices?q=TEST-1042");
  await expect(page.getByText("northstar.pdf")).toBeVisible();
  const exported = await page.request.get("/api/workspace/export/csv");
  expect(await exported.text()).toContain('"162"');
  const workbook = await page.request.get("/api/workspace/export/xlsx");
  expect((await workbook.body()).subarray(0, 2).toString()).toBe("PK");

  const outside = await browser.newContext();
  const other = await outside.newPage();
  await register(other, "Jordan Other");
  const denied = await other.request.get(
    "/api/workspace/documents/" + docId + "/file?download=1",
    { maxRedirects: 0 },
  );
  expect(denied.status()).toBe(404);
  const deniedWrite = await other.request.post(
    "/api/workspace/documents/" + docId,
    { data: { action: "delete", version: 0 }, headers: origin },
  );
  expect(deniedWrite.status()).toBe(404);
  expect(
    await (await other.request.get("/api/workspace/export/csv")).text(),
  ).not.toContain("northstar.pdf");
  const csrf = await other.request.post("/api/workspace/create", {
    headers: { Origin: "https://other.example" },
    data: {},
  });
  expect(csrf.status()).toBe(403);
  const webhook = await other.request.post("/api/stripe/webhook", {
    data: "{}",
  });
  expect(webhook.status()).toBe(400);
  expect((await other.request.get("/admin")).status()).toBe(404);
  const assistant = await page.request.post("/api/workspace/assistant", {
    headers: origin,
    data: { question: "How much did we spend this month?" },
  });
  expect(assistant.ok()).toBe(true);
  const answer = await assistant.json();
  expect(answer).toMatchObject({
    mock: true,
    facts: [{ label: "USD", value: expect.stringMatching(/^162(\.0+)?$/) }],
  });
  const deleted = await page.request.post("/api/workspace/documents/" + docId, {
    headers: origin,
    data: { action: "delete", version: (await status.json()).version },
  });
  expect(deleted.ok()).toBe(true);
  expect(
    (await page.request.get("/api/workspace/documents/" + docId)).status(),
  ).toBe(404);
  await expect
    .poll(
      async () =>
        (await page.request.get(signed.headers()["location"])).status(),
      { timeout: 15000 },
    )
    .toBe(404);
  await page.getByLabel("Account menu").click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/login/);
  await outside.close();
});
