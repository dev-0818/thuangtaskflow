"use client";

import { useMemo, useRef, useState } from "react";
import {
  Badge,
  Eye,
  Filter,
  KeyRound,
  Mail,
  Plus,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { deleteMember, inviteMember, updateMemberPassword, updateMemberSubtaskPermission } from "@/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ToastViewport, useToastQueue } from "@/components/ui/toast";
import type { JobTitle, UserProfile } from "@/lib/types";

type OrganizationViewProps = {
  currentUser: UserProfile;
  users: UserProfile[];
  jobTitles: JobTitle[];
};

type RoleFilter = "all" | "manager" | "member";
type PermissionFilter = "all" | "can_add" | "cannot_add";
type MemberSort = "name_asc" | "name_desc" | "created_desc" | "created_asc" | "title_asc";

export function OrganizationView({ currentUser, users, jobTitles }: OrganizationViewProps) {
  const [activeTab, setActiveTab] = useState<"members" | "titles">("members");
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [permissionFilter, setPermissionFilter] = useState<PermissionFilter>("all");
  const [sortBy, setSortBy] = useState<MemberSort>("name_asc");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const registerLockedRef = useRef(false);
  const { toasts, showToast, dismissToast } = useToastQueue();
  const managers = users.filter((user) => user.system_role === "manager");
  const members = users.filter((user) => user.id !== currentUser.id);
  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return members
      .filter((user) => {
        const title = jobTitles.find((jobTitle) => jobTitle.id === user.job_title_id)?.name ?? "";
        const matchesQuery = `${user.name} ${user.email ?? ""} ${title} ${user.system_role}`.toLowerCase().includes(normalizedQuery);
        const matchesRole = roleFilter === "all" || user.system_role === roleFilter;
        const matchesPermission =
          permissionFilter === "all" ||
          (permissionFilter === "can_add" && user.system_role === "member" && user.can_add_subtasks) ||
          (permissionFilter === "cannot_add" && user.system_role === "member" && !user.can_add_subtasks);

        return matchesQuery && matchesRole && matchesPermission;
      })
      .sort((left, right) => {
        const leftTitle = jobTitles.find((jobTitle) => jobTitle.id === left.job_title_id)?.name ?? "";
        const rightTitle = jobTitles.find((jobTitle) => jobTitle.id === right.job_title_id)?.name ?? "";

        if (sortBy === "name_desc") return right.name.localeCompare(left.name);
        if (sortBy === "created_desc") return Date.parse(right.created_at) - Date.parse(left.created_at);
        if (sortBy === "created_asc") return Date.parse(left.created_at) - Date.parse(right.created_at);
        if (sortBy === "title_asc") return leftTitle.localeCompare(rightTitle) || left.name.localeCompare(right.name);
        return left.name.localeCompare(right.name);
      });
  }, [members, jobTitles, query, roleFilter, permissionFilter, sortBy]);

  async function handleInvite(formData: FormData) {
    if (registerLockedRef.current) return;
    registerLockedRef.current = true;
    setSubmitting(true);

    try {
      await inviteMember(formData);
      formRef.current?.reset();
      showToast("Team member created", String(formData.get("name") ?? ""));
      setRegisterOpen(false);
    } finally {
      registerLockedRef.current = false;
      setSubmitting(false);
    }
  }

  async function handleUpdatePermission(formData: FormData) {
    await updateMemberSubtaskPermission(formData);
    showToast("Member permission updated", String(formData.get("member_name") ?? ""));
  }

  async function handleUpdatePassword(formData: FormData) {
    await updateMemberPassword(formData);
    showToast("Member password updated", String(formData.get("member_name") ?? ""));
  }

  async function handleDeleteMember(formData: FormData) {
    await deleteMember(formData);
    showToast("Team member deleted", String(formData.get("member_name") ?? ""));
    setSelectedUser(null);
  }

  function getJobTitle(user: UserProfile) {
    return jobTitles.find((jobTitle) => jobTitle.id === user.job_title_id);
  }

  function getManager(user: UserProfile) {
    return users.find((candidate) => candidate.id === user.manager_id);
  }

  return (
    <div className="mx-auto max-w-container">
      <header className="mb-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-semibold text-on-surface md:text-headline-lg">Organization</h1>
          <p className="mt-3 max-w-2xl text-body-lg text-on-surface-variant">
            Manage your team members, assign roles, and structure your workspace hierarchy.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRegisterOpen(true)}
          className="bronze-button inline-flex min-h-[48px] items-center justify-center gap-2 px-5 py-3 text-label-md"
        >
          <Plus className="h-4 w-4" />
          Register Team Member
        </button>
      </header>

      <div className="mb-8 flex border-b border-secondary/15">
        <button
          onClick={() => setActiveTab("members")}
          className={`border-b-2 px-0 py-4 pr-8 text-label-md font-semibold ${activeTab === "members" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}
        >
          Team Members
        </button>
        <button
          onClick={() => setActiveTab("titles")}
          className={`border-b-2 px-0 py-4 text-label-md font-semibold ${activeTab === "titles" ? "border-primary text-primary" : "border-transparent text-on-surface-variant"}`}
        >
          Job Titles
        </button>
      </div>

      {activeTab === "members" ? (
        <>
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <label className="input-surface flex max-w-xl items-center gap-3 px-4 py-3">
              <Search className="h-5 w-5 text-on-surface-variant" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search members..."
                className="w-full bg-transparent outline-none placeholder:text-on-surface-variant/55"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="secondary-button inline-flex min-h-[48px] items-center gap-2 px-4 py-3 text-label-md">
                <Filter className="h-4 w-4" />
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                  className="cursor-pointer bg-transparent outline-none"
                  aria-label="Filter members by role"
                >
                  <option value="all" className="bg-surface text-on-surface">All Roles</option>
                  <option value="manager" className="bg-surface text-on-surface">Managers</option>
                  <option value="member" className="bg-surface text-on-surface">Members</option>
                </select>
              </label>
              <label className="secondary-button inline-flex min-h-[48px] items-center gap-2 px-4 py-3 text-label-md">
                <Shield className="h-4 w-4" />
                <select
                  value={permissionFilter}
                  onChange={(event) => setPermissionFilter(event.target.value as PermissionFilter)}
                  className="cursor-pointer bg-transparent outline-none"
                  aria-label="Filter members by subtask permission"
                >
                  <option value="all" className="bg-surface text-on-surface">All Permissions</option>
                  <option value="can_add" className="bg-surface text-on-surface">Can Add Subtasks</option>
                  <option value="cannot_add" className="bg-surface text-on-surface">Cannot Add Subtasks</option>
                </select>
              </label>
              <label className="secondary-button inline-flex min-h-[48px] items-center gap-2 px-4 py-3 text-label-md">
                <SlidersHorizontal className="h-4 w-4" />
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as MemberSort)}
                  className="cursor-pointer bg-transparent outline-none"
                  aria-label="Sort members"
                >
                  <option value="name_asc" className="bg-surface text-on-surface">Name A-Z</option>
                  <option value="name_desc" className="bg-surface text-on-surface">Name Z-A</option>
                  <option value="created_desc" className="bg-surface text-on-surface">Newest</option>
                  <option value="created_asc" className="bg-surface text-on-surface">Oldest</option>
                  <option value="title_asc" className="bg-surface text-on-surface">Job Title</option>
                </select>
              </label>
            </div>
          </div>

          <p className="mb-4 text-label-md font-semibold text-on-surface-variant">
            Showing {filteredMembers.length} of {members.length} team members
          </p>

          <section className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
            {filteredMembers.map((user) => {
              const manager = getManager(user);
              const title = getJobTitle(user);

              return (
                <GlassPanel key={user.id} className="p-6">
                  <div className="mb-6 flex items-start gap-4">
                    <Avatar name={user.name} className="h-14 w-14 text-body-md" />
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-headline-md font-semibold text-on-surface">{user.name}</h2>
                      <p className="text-body-md font-semibold text-primary">{title?.name ?? "Unassigned"}</p>
                      <p className="mt-1 truncate text-label-sm text-on-surface-variant">{user.email ?? "No email"}</p>
                    </div>
                  </div>
                  <div className="border-t border-secondary/10 pt-5">
                    <p className="text-label-sm font-semibold uppercase text-on-surface-variant">Reports To</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-body-md text-on-surface">
                        <UserRound className="h-4 w-4 text-on-surface-variant" />
                        {manager?.name ?? "No manager"}
                      </span>
                      <span className="rounded-full bg-surface-container-high px-3 py-2 text-label-sm font-semibold text-on-surface-variant">
                        {title?.description ?? user.system_role}
                      </span>
                    </div>
                  </div>
                  {user.system_role === "member" ? (
                    <form action={handleUpdatePermission} className="mt-5 rounded-lg border border-secondary/10 bg-surface-container-lowest p-4">
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="member_name" value={user.name} />
                      <label className="flex cursor-pointer items-center justify-between gap-4">
                        <span>
                          <span className="block text-label-md font-semibold text-on-surface">Can add subtasks</span>
                          <span className="text-label-sm text-on-surface-variant">
                            {user.can_add_subtasks ? "Enabled" : "Disabled"}
                          </span>
                        </span>
                        <input
                          name="can_add_subtasks"
                          type="checkbox"
                          defaultChecked={user.can_add_subtasks}
                          onChange={(event) => event.currentTarget.form?.requestSubmit()}
                          className="h-5 w-5 cursor-pointer accent-primary"
                        />
                      </label>
                    </form>
                  ) : null}
                  <div className="mt-5 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="secondary-button inline-flex flex-1 items-center justify-center gap-2 px-4 py-3 text-label-md"
                    >
                      <Eye className="h-4 w-4" />
                      View Detail
                    </button>
                    <form action={handleDeleteMember}>
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="member_name" value={user.name} />
                      <button
                        onClick={(event) => {
                          if (!confirm(`Delete ${user.name} and their account data?`)) event.preventDefault();
                        }}
                        className="rounded border border-error/25 bg-error/10 p-3 text-error hover:bg-error/15"
                        aria-label={`Delete ${user.name}`}
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </form>
                  </div>
                </GlassPanel>
              );
            })}
          </section>
        </>
      ) : (
        <section className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
          {jobTitles.map((title) => (
            <GlassPanel key={title.id} className="p-6">
              <Badge className="mb-5 h-6 w-6 text-primary" />
              <h2 className="text-headline-md font-semibold text-on-surface">{title.name}</h2>
              <p className="mt-2 text-body-md text-on-surface-variant">{title.description ?? "General"}</p>
              <p className="mt-6 text-label-sm font-semibold text-primary">
                {users.filter((user) => user.job_title_id === title.id).length} Active
              </p>
            </GlassPanel>
          ))}
        </section>
      )}

      {registerOpen ? (
        <div onClick={() => setRegisterOpen(false)} className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-margin-mobile">
          <GlassPanel onClick={(event) => event.stopPropagation()} className="custom-scrollbar max-h-[92vh] w-full max-w-2xl overflow-y-auto p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-headline-md font-semibold text-on-surface">Register Team Member</h2>
                <p className="mt-2 text-body-md text-on-surface-variant">
                  Creates a Supabase Auth account and TaskFlow profile.
                </p>
              </div>
              <button type="button" onClick={() => setRegisterOpen(false)} className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" aria-label="Close registration">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form ref={formRef} action={handleInvite} onSubmit={() => setSubmitting(true)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="space-y-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant">Full Name</span>
                <input name="name" required placeholder="e.g., Sarah Jenkins" className="input-surface min-h-[48px] px-4 py-3 text-label-md" />
              </label>
              <label className="space-y-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant">Email</span>
                <div className="input-surface flex min-h-[48px] items-center gap-3 px-4 py-3">
                  <Mail className="h-4 w-4 text-on-surface-variant" />
                  <input name="email" required type="email" placeholder="member@company.com" className="w-full bg-transparent outline-none" />
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant">Temporary Password</span>
                <div className="input-surface flex min-h-[48px] items-center gap-3 px-4 py-3">
                  <KeyRound className="h-4 w-4 text-on-surface-variant" />
                  <input name="password" required minLength={8} type="password" placeholder="Min. 8 characters" className="w-full bg-transparent outline-none" />
                </div>
              </label>
              <label className="space-y-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant">Job Title</span>
                <select name="job_title_id" required className="input-surface min-h-[48px] cursor-pointer px-4 py-3 text-label-md">
                  {jobTitles.map((title) => (
                    <option key={title.id} value={title.id} className="bg-surface text-on-surface">
                      {title.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 sm:col-span-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant">Reports To</span>
                <select name="manager_id" required defaultValue={currentUser.id} className="input-surface min-h-[48px] cursor-pointer px-4 py-3 text-label-md">
                  {managers.map((manager) => (
                    <option key={manager.id} value={manager.id} className="bg-surface text-on-surface">
                      {manager.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-secondary/15 bg-surface-container-lowest p-4 sm:col-span-2">
                <span>
                  <span className="block text-label-md font-semibold text-on-surface">Can add subtasks</span>
                  <span className="text-label-sm text-on-surface-variant">Allow this member to create subtasks on assigned tasks.</span>
                </span>
                <input name="can_add_subtasks" type="checkbox" defaultChecked className="h-5 w-5 cursor-pointer accent-primary" />
              </label>
              <input type="hidden" name="system_role" value="member" />
              <div className="flex flex-col-reverse gap-3 sm:col-span-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={() => setRegisterOpen(false)} disabled={submitting} className="secondary-button px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
                  Cancel
                </button>
                <button disabled={submitting} className="bronze-button inline-flex min-h-[48px] items-center justify-center gap-2 px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
                  <Shield className="h-4 w-4" />
                  {submitting ? "Creating Member..." : "Create Member Account"}
                </button>
              </div>
            </form>
          </GlassPanel>
        </div>
      ) : null}

      {selectedUser ? (
        <div onClick={() => setSelectedUser(null)} className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-margin-mobile">
          <GlassPanel onClick={(event) => event.stopPropagation()} className="w-full max-w-xl p-6">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar name={selectedUser.name} className="h-14 w-14 text-body-md" />
                <div>
                  <h2 className="text-headline-md font-semibold text-on-surface">{selectedUser.name}</h2>
                  <p className="text-body-md font-semibold text-primary">{getJobTitle(selectedUser)?.name ?? "Unassigned"}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" aria-label="Close detail">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-surface-container-lowest p-4">
                <p className="text-label-sm font-semibold uppercase text-on-surface-variant">Email</p>
                <p className="mt-2 break-all text-body-md text-on-surface">{selectedUser.email ?? "No email"}</p>
              </div>
              <div className="rounded-lg bg-surface-container-lowest p-4">
                <p className="text-label-sm font-semibold uppercase text-on-surface-variant">System Role</p>
                <p className="mt-2 capitalize text-body-md text-on-surface">{selectedUser.system_role}</p>
              </div>
              <div className="rounded-lg bg-surface-container-lowest p-4">
                <p className="text-label-sm font-semibold uppercase text-on-surface-variant">Reports To</p>
                <p className="mt-2 text-body-md text-on-surface">{getManager(selectedUser)?.name ?? "No manager"}</p>
              </div>
              <div className="rounded-lg bg-surface-container-lowest p-4">
                <p className="text-label-sm font-semibold uppercase text-on-surface-variant">Created</p>
                <p className="mt-2 text-body-md text-on-surface">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
            </div>

            {selectedUser.system_role === "member" ? (
              <form action={handleUpdatePermission} className="mt-5 rounded-lg border border-secondary/15 bg-surface-container-lowest p-4">
                <input type="hidden" name="id" value={selectedUser.id} />
                <input type="hidden" name="member_name" value={selectedUser.name} />
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span>
                    <span className="block text-label-md font-semibold text-on-surface">Can add subtasks</span>
                    <span className="text-label-sm text-on-surface-variant">
                      {selectedUser.can_add_subtasks ? "Enabled for this member" : "Disabled for this member"}
                    </span>
                  </span>
                  <input
                    name="can_add_subtasks"
                    type="checkbox"
                    defaultChecked={selectedUser.can_add_subtasks}
                    onChange={(event) => event.currentTarget.form?.requestSubmit()}
                    className="h-5 w-5 cursor-pointer accent-primary"
                  />
                </label>
              </form>
            ) : null}

            <form action={handleUpdatePassword} className="mt-5 rounded-lg border border-secondary/15 bg-surface-container-lowest p-4">
              <input type="hidden" name="id" value={selectedUser.id} />
              <input type="hidden" name="member_name" value={selectedUser.name} />
              <label className="block">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant">Set New Password</span>
                <div className="input-surface mt-2 flex min-h-[48px] items-center gap-3 px-4 py-3">
                  <KeyRound className="h-4 w-4 text-on-surface-variant" />
                  <input
                    name="password"
                    required
                    minLength={8}
                    type="password"
                    placeholder="New password, min. 8 characters"
                    className="w-full bg-transparent outline-none"
                  />
                </div>
              </label>
              <button className="bronze-button mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 py-3 text-label-md">
                <KeyRound className="h-4 w-4" />
                Update Password
              </button>
            </form>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <form action={handleDeleteMember}>
                <input type="hidden" name="id" value={selectedUser.id} />
                <input type="hidden" name="member_name" value={selectedUser.name} />
                <button
                  onClick={(event) => {
                    if (!confirm(`Delete ${selectedUser.name} and their account data?`)) event.preventDefault();
                  }}
                  className="secondary-button inline-flex w-full items-center justify-center gap-2 border-error/30 px-4 py-3 text-label-md text-error sm:w-auto"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Account
                </button>
              </form>
              <button type="button" onClick={() => setSelectedUser(null)} className="bronze-button px-5 py-3 text-label-md">
                Done
              </button>
            </div>
          </GlassPanel>
        </div>
      ) : null}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
