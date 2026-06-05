import { AppShell } from "@/components/layout/app-shell";
import { getWorkspaceData } from "@/lib/data-source";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const data = await getWorkspaceData();

  return (
    <AppShell profile={data.currentUser} isDemo={data.isDemo}>
      {children}
    </AppShell>
  );
}
