import { Queue } from "bullmq";

export const queueName = "docflow-documents";
export type JobPayload = { id: string; attempt: number };

export function redisConnection() {
  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required.");
  const url = new URL(process.env.REDIS_URL);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number(url.pathname.slice(1) || 0),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

let queue: Queue<JobPayload> | undefined;
export async function enqueue(payload: JobPayload) {
  queue ??= new Queue<JobPayload>(queueName, {
    connection: {
      ...redisConnection(),
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    },
  });
  if (queue.client && !(await queue.client).status.startsWith("ready"))
    await queue.waitUntilReady();
  await queue.add("process", payload, {
    jobId: payload.id + "-" + payload.attempt,
    attempts: 3,
    backoff: { type: "exponential", delay: 3500 },
    removeOnComplete: true,
    removeOnFail: true,
  });
}
export async function closeQueue() {
  await queue?.close();
}
