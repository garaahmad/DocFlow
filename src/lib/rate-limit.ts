import Redis from "ioredis";
import { ServiceError } from "@/lib/access";

let redis: Redis | undefined;
type Rule = { max: number; seconds: number };
const rules: Record<string, Rule> = {
  upload: { max: 35, seconds: 60 },
  assistant: { max: 5, seconds: 60 },
  billing: { max: 5, seconds: 60 },
  invite: { max: 10, seconds: 60 },
  document: { max: 45, seconds: 60 },
  create: { max: 5, seconds: 300 },
};
export async function throttle(subject: string, operation: keyof typeof rules) {
  const rule = rules[operation];
  if (!process.env.REDIS_URL)
    throw new ServiceError(503, "The workspace rate limiter is unavailable.");
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 0,
      connectTimeout: 2500,
      commandTimeout: 3500,
    });
    redis.on("error", () =>
      console.warn(JSON.stringify({ event: "rate_limiter_connection_error" })),
    );
  }
  let received: unknown;
  try {
    received = await redis.eval(
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]); end; return n",
      1,
      "docflow:limit:" + operation + ":" + subject,
      rule.seconds,
    );
  } catch {
    throw new ServiceError(503, "The workspace rate limiter is unavailable.");
  }
  if (Number(received) > rule.max)
    throw new ServiceError(
      429,
      "Too many requests. Wait a moment and try again.",
    );
}
