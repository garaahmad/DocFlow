import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/lib/db";
import { emailEnabled, sendLink } from "@/lib/email";

export function appUrl() {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:3000"
  );
}

let instance: ReturnType<typeof makeAuth> | undefined;
function makeAuth() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("Set BETTER_AUTH_SECRET to at least 32 characters.");
  return betterAuth({
    baseURL: appUrl(),
    secret,
    database: prismaAdapter(db, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      requireEmailVerification: emailEnabled,
      revokeSessionsOnPasswordReset: true,
      ...(emailEnabled && {
        sendResetPassword: ({ user, url }) =>
          sendLink(user.email, "Reset your DocFlow AI password", url),
      }),
    },
    ...(emailEnabled && {
      emailVerification: {
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
        sendVerificationEmail: ({ user, url }) =>
          sendLink(user.email, "Verify your DocFlow AI email", url),
      },
    }),
    session: { expiresIn: 60 * 60 * 24 * 7 },
    advanced: { useSecureCookies: appUrl().startsWith("https://") },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-up/email": { window: 60, max: 5 },
        "/sign-in/email": { window: 60, max: 10 },
      },
    },
  });
}
export function getAuth() {
  instance ??= makeAuth();
  return instance;
}
