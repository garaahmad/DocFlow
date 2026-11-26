import { pageContext } from "@/lib/access";
import { language } from "@/lib/language";
import { Shell } from "@/components/shell";
import { isPlatformAdmin } from "@/lib/platform-admin";
import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, workspaces, workspaceId } = await pageContext();
  return (
    <Shell
      locale={await language()}
      userName={user.name}
      selected={workspaceId}
      admin={isPlatformAdmin(user)}
      workspaces={workspaces.map(({ workspace }) => ({
        id: workspace.id,
        name: workspace.name,
      }))}
    >
      {children}
    </Shell>
  );
}
