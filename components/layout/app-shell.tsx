import { Navigation } from "@/components/layout/navigation";
import type { UserProfile } from "@/lib/types";

type AppShellProps = {
  profile: UserProfile;
  isDemo: boolean;
  children: React.ReactNode;
};

export function AppShell({ profile, isDemo, children }: AppShellProps) {
  return (
    <div className="min-h-screen">
      <Navigation profile={profile} role={profile.system_role} isDemo={isDemo} />
      <main className="w-full min-w-0 px-margin-mobile pb-28 pt-24 md:ml-64 md:w-[calc(100%-16rem)] md:px-margin-desktop md:pb-10 md:pt-8">
        {children}
      </main>
    </div>
  );
}
