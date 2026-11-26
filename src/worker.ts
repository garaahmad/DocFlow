import "dotenv/config";
import { Worker } from "bullmq";
import {
  closeQueue,
  queueName,
  redisConnection,
  type JobPayload,
} from "@/lib/queue";
import { processDocument, reconcile } from "@/lib/processing";
import { db } from "@/lib/db";

const worker = new Worker<JobPayload>(
  queueName,
  (job) => processDocument(job.data, job.attemptsMade),
  {
    connection: { ...redisConnection(), maxRetriesPerRequest: null },
    concurrency: 2,
    limiter: { max: 12, duration: 60000 },
  },
);
worker.on("error", () =>
  console.error(JSON.stringify({ event: "worker_connection_error" })),
);
worker.on("failed", () =>
  console.warn(JSON.stringify({ event: "processing_attempt_failed" })),
);
let pending: Promise<void> | undefined;
const tick = () => {
  pending ??= reconcile()
    .catch(() => console.error(JSON.stringify({ event: "reconcile_failed" })))
    .finally(() => {
      pending = undefined;
    });
};
const timer = setInterval(tick, 4000);
tick();
let stopping = false;
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, async () => {
    if (stopping) return;
    stopping = true;
    clearInterval(timer);
    await worker.close();
    await pending;
    await closeQueue();
    await db.$disconnect();
    process.exit(0);
  });
