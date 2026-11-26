import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "http://localhost:3000";
  return ["/", "/demo", "/pricing", "/privacy", "/terms", "/support"].map(
    (path) => ({
      url: new URL(path, origin).toString(),
    }),
  );
}
