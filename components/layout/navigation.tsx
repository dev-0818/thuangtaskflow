"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Badge,
  Bell,
  CalendarDays,
  ClipboardList,
  Grid2X2,
  KeyRound,
  LogOut,
  Search,
  UserRound,
  Users,
  X
} from "lucide-react";
import { signOut, updateCurrentManagerName, updateCurrentManagerPassword, type AccountActionState } from "@/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { SystemRole, UserProfile } from "@/lib/types";

const baseItems = [
  { href: "/dashboard", label: "Dashboard", icon: Grid2X2 },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/calendar", label: "Calendar", icon: CalendarDays }
];

const managerItems = [
  { href: "/organization", label: "User Management", icon: Users },
  { href: "/job-titles", label: "Job Titles", icon: Badge }
];

type NavigationProps = {
  profile: UserProfile;
  role: SystemRole;
  isDemo: boolean;
};

function NavLink({
  href,
  label,
  icon: Icon,
  compact = false,
  active,
  current,
  onNavigate
}: {
  href: string;
  label: string;
  icon: typeof Grid2X2;
  compact?: boolean;
  active: boolean;
  current: boolean;
  onNavigate?: (href: string) => void;
}) {
  return (
    <Link
      href={href as never}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        if (!current) {
          onNavigate?.(href);
        }
      }}
      className={cn(
        "flex items-center gap-4 rounded px-5 py-4 text-body-md font-semibold transition-colors",
        active ? "bg-primary/10 text-primary ring-1 ring-primary/45" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface",
        compact && "flex-1 flex-col gap-1 px-2 py-2 text-[11px] leading-4"
      )}
    >
      <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} strokeWidth={1.6} />
      <span className={compact ? "truncate" : ""}>{label}</span>
    </Link>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-container-high/80", className)} />;
}

function RoutePendingOverlay() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-16 top-16 z-40 bg-background/80 px-margin-mobile py-6 backdrop-blur-sm md:bottom-0 md:left-64 md:top-0 md:px-margin-desktop md:py-8">
      <div className="mx-auto max-w-container">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-5 w-72 max-w-full" />
          </div>
          <SkeletonBlock className="h-11 w-40" />
        </header>

        <div className="mb-8 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_230px_auto]">
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12" />
          <SkeletonBlock className="h-12 w-full lg:w-44" />
        </div>

        <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {[0, 1, 2].map((item) => (
              <section key={item} className="glass-panel rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <SkeletonBlock className="h-6 w-44" />
                    <SkeletonBlock className="h-4 w-64 max-w-full" />
                  </div>
                  <SkeletonBlock className="h-9 w-28" />
                </div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <SkeletonBlock className="h-8 w-28" />
                  <SkeletonBlock className="h-8 w-32" />
                  <SkeletonBlock className="h-8 w-24" />
                </div>
              </section>
            ))}
          </div>

          <section className="glass-panel space-y-4 rounded-xl p-5">
            <SkeletonBlock className="h-7 w-48" />
            {[0, 1, 2].map((item) => (
              <div key={item} className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-4">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="mt-3 h-4 w-48 max-w-full" />
                <div className="mt-4 flex gap-2">
                  <SkeletonBlock className="h-7 w-20" />
                  <SkeletonBlock className="h-7 w-24" />
                </div>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function ProfileSubmitButton({
  children,
  pendingLabel
}: {
  children: React.ReactNode;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button disabled={pending} className="bronze-button inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2 text-label-md disabled:cursor-wait disabled:opacity-70">
      {pending ? pendingLabel : children}
    </button>
  );
}

function AccountMessage({ state }: { state: AccountActionState }) {
  if (state.error) {
    return (
      <div className="rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-label-sm font-semibold text-error">
        {state.error}
      </div>
    );
  }

  if (state.success) {
    return (
      <div className="rounded-lg border border-green-300/25 bg-green-400/10 px-3 py-2 text-label-sm font-semibold text-green-200">
        {state.success}
      </div>
    );
  }

  return null;
}

function MobileProfileSheet({
  profile,
  role,
  onClose
}: {
  profile: UserProfile;
  role: SystemRole;
  onClose: () => void;
}) {
  const [nameState, nameAction] = useActionState<AccountActionState, FormData>(updateCurrentManagerName, {});
  const [passwordState, passwordAction] = useActionState<AccountActionState, FormData>(updateCurrentManagerPassword, {});
  const managerMode = role === "manager";

  return (
    <div onClick={onClose} className="fixed inset-0 z-[70] bg-background/85 px-margin-mobile py-5 md:hidden">
      <section
        onClick={(event) => event.stopPropagation()}
        className="ml-auto flex max-h-full w-full max-w-sm flex-col overflow-hidden rounded-xl border border-secondary/20 bg-surface-container shadow-glow"
        role="dialog"
        aria-modal="true"
        aria-label="User profile"
      >
        <header className="flex items-start justify-between gap-4 border-b border-secondary/10 p-5">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={profile.name} className="h-11 w-11 text-label-md" />
            <div className="min-w-0">
              <h2 className="truncate text-body-lg font-semibold text-on-surface">{profile.name}</h2>
              <p className="text-label-sm capitalize text-on-surface-variant">{profile.system_role}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" aria-label="Close profile">
            <X className="h-5 w-5" />
          </button>
        </header>

        {managerMode ? (
        <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto p-5">
          <form action={nameAction} className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-4">
            <div className="mb-4 flex items-center gap-2 text-label-md font-semibold text-on-surface">
              <UserRound className="h-4 w-4 text-primary" />
              Profile Name
            </div>
            <label className="mb-2 block text-label-sm font-semibold text-on-surface-variant">Name</label>
            <input name="name" defaultValue={profile.name} required className="input-surface min-h-[46px] px-3 py-2 text-label-md" />
            <div className="mt-3">
              <AccountMessage state={nameState} />
            </div>
            <div className="mt-4 flex justify-end">
              <ProfileSubmitButton pendingLabel="Saving...">Save Name</ProfileSubmitButton>
            </div>
          </form>

          <form action={passwordAction} className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-4">
            <div className="mb-4 flex items-center gap-2 text-label-md font-semibold text-on-surface">
              <KeyRound className="h-4 w-4 text-primary" />
              Change Password
            </div>
            <label className="mb-2 block text-label-sm font-semibold text-on-surface-variant">New password</label>
            <input name="password" type="password" minLength={8} required className="input-surface min-h-[46px] px-3 py-2 text-label-md" />
            <label className="mb-2 mt-3 block text-label-sm font-semibold text-on-surface-variant">Confirm password</label>
            <input name="confirm_password" type="password" minLength={8} required className="input-surface min-h-[46px] px-3 py-2 text-label-md" />
            <div className="mt-3">
              <AccountMessage state={passwordState} />
            </div>
            <div className="mt-4 flex justify-end">
              <ProfileSubmitButton pendingLabel="Updating...">Update Password</ProfileSubmitButton>
            </div>
          </form>
        </div>
        ) : null}

        <footer className="border-t border-secondary/10 p-5">
          <form action={signOut}>
            <button className="secondary-button flex w-full items-center justify-center gap-2 px-4 py-3 text-label-md">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </footer>
      </section>
    </div>
  );
}

export function Navigation({ profile, role, isDemo }: NavigationProps) {
  const items = role === "manager" ? [...baseItems, ...managerItems] : baseItems;
  const [profileOpen, setProfileOpen] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    setPendingPath(null);
  }, [pathname]);

  useEffect(() => {
    if (!pendingPath) return;
    const timeout = window.setTimeout(() => setPendingPath(null), 12000);
    return () => window.clearTimeout(timeout);
  }, [pendingPath]);

  function handleNavigate(href: string) {
    setProfileOpen(false);
    setPendingPath(href);
  }

  function isCurrentHref(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function isActiveHref(href: string) {
    const activePath = pendingPath ?? pathname;
    return activePath === href || activePath.startsWith(`${href}/`);
  }

  return (
    <>
      <nav className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-secondary/20 bg-surface px-5 py-8 md:flex">
        <div className="mb-12">
          <div className="text-headline-md font-semibold text-primary">TaskFlow</div>
          <div className="mt-1 text-label-sm uppercase tracking-[0.16em] text-on-surface-variant">
            {role === "manager" ? "Premium Workspace" : "Member Workspace"}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          {items.map((item) => (
            <NavLink
              key={item.href}
              {...item}
              active={isActiveHref(item.href)}
              current={isCurrentHref(item.href)}
              onNavigate={handleNavigate}
            />
          ))}
        </div>

        <div className="space-y-4">
          {isDemo ? (
            <div className="rounded border border-primary/20 bg-primary/10 px-3 py-2 text-label-sm text-primary">
              Demo Mode
            </div>
          ) : null}
          <div className="flex items-center gap-3">
            <Avatar name={profile.name} />
            <div className="min-w-0">
              <div className="truncate text-label-md font-semibold text-on-surface">{profile.name}</div>
              <div className="text-label-sm capitalize text-on-surface-variant">{profile.system_role}</div>
            </div>
          </div>
          <form action={signOut}>
            <button className="secondary-button flex w-full items-center justify-center gap-2 px-4 py-3 text-label-md">
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      <nav className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-secondary/20 bg-surface/80 px-margin-mobile backdrop-blur-xl md:hidden">
        <div>
          <div className="text-body-lg font-semibold text-primary">TaskFlow</div>
          <div className="text-[11px] font-semibold capitalize leading-3 text-on-surface-variant">{role}</div>
        </div>
        <div className="flex items-center gap-4 text-on-surface-variant">
          <Search className="h-5 w-5" />
          <Bell className="h-5 w-5" />
          <button type="button" onClick={() => setProfileOpen(true)} className="rounded-full" aria-label="Open user profile">
            <Avatar name={profile.name} className="h-8 w-8 text-label-sm" />
          </button>
        </div>
      </nav>

      <nav className="fixed bottom-0 z-50 flex w-full justify-around gap-1 rounded-t-xl border-t border-secondary/20 bg-surface/85 px-2 py-2 backdrop-blur-xl md:hidden">
        {items.slice(0, 5).map((item) => (
          <NavLink
            key={item.href}
            {...item}
            compact
            active={isActiveHref(item.href)}
            current={isCurrentHref(item.href)}
            onNavigate={handleNavigate}
          />
        ))}
      </nav>

      {pendingPath ? <RoutePendingOverlay /> : null}
      {profileOpen ? <MobileProfileSheet profile={profile} role={role} onClose={() => setProfileOpen(false)} /> : null}
    </>
  );
}
