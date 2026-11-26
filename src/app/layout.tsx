import type { Metadata } from "next";
import { language } from "@/lib/language";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      "http://localhost:3000",
  ),
  title: {
    default: "DocFlow AI — From Documents to Decisions",
    template: "%s | DocFlow AI",
  },
  description:
    "Extract, organize, verify, and understand your business documents with AI-powered automation.",
  openGraph: {
    type: "website",
    siteName: "DocFlow AI",
    title: "DocFlow AI — From Documents to Decisions",
    description: "AI-powered document intelligence for business teams.",
    images: ["/opengraph-image"],
  },
};
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await language();
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      suppressHydrationWarning
      data-scroll-behavior="smooth"
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{document.documentElement.dataset.theme=localStorage.getItem('docflow-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
