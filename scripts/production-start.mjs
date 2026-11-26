import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const web = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), "start", "-H", "0.0.0.0"],
  { stdio: "inherit", env: process.env },
);

const needs = [
  "DATABASE_URL",
  "REDIS_URL",
  "S3_BUCKET",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "GEMINI_EXTRACTION_API_KEY",
];
const missing = needs.filter((key) => !process.env[key]);
let worker;

if (missing.length === 0 && process.env.DOCFLOW_WEB_ONLY !== "true") {
  worker = spawn("npm", ["run", "worker"], {
    stdio: "inherit",
    env: process.env,
  });
  worker.on("error", () => {
    console.error(JSON.stringify({ event: "worker_spawn_error" }));
  });
  worker.on("exit", (code) => {
    if (!closing)
      console.error(JSON.stringify({ event: "worker_exited", code }));
  });
} else {
  console.log(
    JSON.stringify({
      event: "document_worker_not_started",
      reason: process.env.DOCFLOW_WEB_ONLY === "true" ? "disabled" : "configuration_incomplete",
      missing,
    }),
  );
}

let closing = false;
function shutdown(signal) {
  if (closing) return;
  closing = true;
  worker?.kill(signal);
  web.kill(signal);
  setTimeout(() => process.exit(0), 10000).unref();
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(signal));
}
web.on("error", () => shutdown("SIGTERM"));
web.on("exit", (code) => {
  worker?.kill("SIGTERM");
  if (!closing) process.exit(code ?? 1);
});
