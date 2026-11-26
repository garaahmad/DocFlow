import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:3000";
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/admin",
        "/api",
        "/onboarding",
        "/invite/",
        "/reset-password",
      ],
    },
    sitemap: new URL("/sitemap.xml", origin).toString(),
  };
}
