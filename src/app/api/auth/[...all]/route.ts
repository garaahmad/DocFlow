import { getAuth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
function configured() {
  return Boolean(process.env.BETTER_AUTH_SECRET && process.env.DATABASE_URL);
}
export async function GET(request: Request) {
  return configured()
    ? toNextJsHandler(getAuth()).GET(request)
    : Response.json(
        { error: "Authentication is not configured." },
        { status: 503 },
      );
}
export async function POST(request: Request) {
  return configured()
    ? toNextJsHandler(getAuth()).POST(request)
    : Response.json(
        { error: "Authentication is not configured." },
        { status: 503 },
      );
}
