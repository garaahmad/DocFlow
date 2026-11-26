import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    launchOptions: {
      ...(process.env.DOCFLOW_CHROMIUM
        ? { executablePath: process.env.DOCFLOW_CHROMIUM }
        : {}),
      args: ["--no-sandbox"],
    },
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --hostname localhost",
        url: baseURL,
        timeout: 60000,
        reuseExistingServer: !process.env.CI,
        env: { DOCFLOW_MOCK_AI: "true", BETTER_AUTH_URL: baseURL },
      },
});
