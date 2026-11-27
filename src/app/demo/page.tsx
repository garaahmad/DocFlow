import type { Metadata } from "next";
import { language } from "@/lib/language";
import { DemoWorkspace } from "@/components/demo-workspace";
export const metadata: Metadata = {
  title: "Interactive demo",
  description:
    "Explore a sample workspace and approve a corrected invoice without an account.",
};
export default async function Demo({
  searchParams,
}: {
  searchParams: Promise<{ view?: string | string[] }>;
}) {
  const [locale, { view }] = await Promise.all([language(), searchParams]);
  return <DemoWorkspace locale={locale} startInReview={view === "review"} />;
}
