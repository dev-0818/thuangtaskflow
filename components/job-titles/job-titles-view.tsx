"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Edit3, LoaderCircle, Plus, Trash2, Users, X } from "lucide-react";
import { createJobTitle, deleteJobTitle, updateJobTitle } from "@/app/actions";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ToastViewport, useToastQueue } from "@/components/ui/toast";
import type { JobTitle, UserProfile } from "@/lib/types";

type JobTitlesViewProps = {
  jobTitles: JobTitle[];
  users: UserProfile[];
};

type DeleteTarget = {
  title: JobTitle;
  activeUsers: number;
};

export function JobTitlesView({ jobTitles, users }: JobTitlesViewProps) {
  const [editingTitle, setEditingTitle] = useState<JobTitle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [creating, setCreating] = useState(false);
  const createLockedRef = useRef(false);
  const createFormRef = useRef<HTMLFormElement>(null);
  const { toasts, showToast, dismissToast } = useToastQueue();

  async function handleCreate(formData: FormData) {
    if (createLockedRef.current) return;
    createLockedRef.current = true;
    setCreating(true);

    try {
      await createJobTitle(formData);
      createFormRef.current?.reset();
      showToast("Job title created", String(formData.get("name") ?? ""));
    } finally {
      createLockedRef.current = false;
      setCreating(false);
    }
  }

  async function handleUpdate(formData: FormData) {
    setSubmitting(true);
    try {
      await updateJobTitle(formData);
      showToast("Job title updated", String(formData.get("name") ?? ""));
      setEditingTitle(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(formData: FormData) {
    setDeleting(true);

    try {
      await deleteJobTitle(formData);
      showToast("Job title deleted", String(formData.get("title_name") ?? ""));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-container">
      <header className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-semibold text-on-surface md:text-headline-lg">Job Titles</h1>
          <p className="mt-3 text-body-lg text-on-surface-variant">Manage reusable roles for team assignment.</p>
        </div>
        <form ref={createFormRef} action={handleCreate} onSubmit={() => setCreating(true)} className="glass-panel grid w-full gap-3 rounded-xl p-4 md:max-w-xl md:grid-cols-[1fr_1fr_auto]">
          <input name="name" required placeholder="Title name" className="input-surface px-3 py-2 text-label-md" />
          <input name="description" placeholder="Department" className="input-surface px-3 py-2 text-label-md" />
          <button disabled={creating} className="bronze-button inline-flex items-center justify-center gap-2 px-4 py-2 text-label-md disabled:cursor-wait disabled:opacity-70">
            {creating ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {creating ? "Adding..." : "Add"}
          </button>
        </form>
      </header>

      <section className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
        {jobTitles.map((title) => {
          const activeUsers = users.filter((user) => user.job_title_id === title.id && user.is_active !== false).length;

          return (
            <GlassPanel key={title.id} className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-headline-md font-semibold text-on-surface">{title.name}</h2>
                  <p className="mt-2 text-body-md text-on-surface-variant">{title.description ?? "General"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTitle(title)}
                  className="rounded p-2 text-on-surface-variant hover:bg-primary/10 hover:text-primary"
                  aria-label={`Edit ${title.name}`}
                >
                  <Edit3 className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-secondary/10 pt-5">
                <span className="inline-flex items-center gap-2 text-label-md font-semibold text-on-surface-variant">
                  <Users className="h-4 w-4" />
                  {activeUsers} Active
                </span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget({ title, activeUsers })}
                  className="rounded p-2 text-on-surface-variant hover:bg-error/10 hover:text-error"
                  aria-label={`Delete ${title.name}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </GlassPanel>
          );
        })}
      </section>

      {editingTitle ? (
        <div
          onClick={() => {
            if (!submitting) setEditingTitle(null);
          }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-margin-mobile"
        >
          <form
            action={handleUpdate}
            onClick={(event) => event.stopPropagation()}
            className="glass-panel w-full max-w-xl rounded-xl p-6 shadow-glow"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-headline-md font-semibold text-on-surface">Edit Job Title</h2>
                <p className="mt-2 text-body-md text-on-surface-variant">Update the role name and department label.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTitle(null)}
                disabled={submitting}
                className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:cursor-wait disabled:opacity-60"
                aria-label="Close edit job title"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input type="hidden" name="id" value={editingTitle.id} />
            <div className="grid grid-cols-1 gap-4">
              <label className="space-y-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant">Title Name</span>
                <input name="name" required defaultValue={editingTitle.name} className="input-surface min-h-[48px] px-4 py-3 text-label-md" />
              </label>
              <label className="space-y-2">
                <span className="text-label-sm font-semibold uppercase text-on-surface-variant">Description</span>
                <input name="description" defaultValue={editingTitle.description ?? ""} className="input-surface min-h-[48px] px-4 py-3 text-label-md" />
              </label>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setEditingTitle(null)} disabled={submitting} className="secondary-button px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
                Cancel
              </button>
              <button disabled={submitting} className="bronze-button inline-flex items-center justify-center gap-2 px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
                {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      {deleteTarget ? (
        <div
          onClick={() => {
            if (!deleting) setDeleteTarget(null);
          }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 p-margin-mobile"
          role="presentation"
        >
          <section
            onClick={(event) => event.stopPropagation()}
            className="glass-panel w-full max-w-md rounded-xl p-6 shadow-glow"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-job-title-title"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-error/30 bg-error/10 text-error">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="delete-job-title-title" className="text-headline-md font-semibold text-on-surface">
                    Delete Job Title?
                  </h2>
                  <p className="mt-2 text-body-md text-on-surface-variant">
                    This removes the reusable role from your workspace.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:cursor-wait disabled:opacity-60"
                aria-label="Close delete job title confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-4">
              <p className="text-label-sm font-semibold uppercase text-on-surface-variant">Job Title</p>
              <p className="mt-2 text-body-md font-semibold text-on-surface">{deleteTarget.title.name}</p>
              <p className="mt-1 text-label-md text-on-surface-variant">
                {deleteTarget.activeUsers} active {deleteTarget.activeUsers === 1 ? "member" : "members"} using this title
              </p>
            </div>

            <form
              action={handleDelete}
              onSubmit={() => setDeleting(true)}
              className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
            >
              <input type="hidden" name="id" value={deleteTarget.title.id} />
              <input type="hidden" name="title_name" value={deleteTarget.title.name} />
              <button type="button" onClick={() => setDeleteTarget(null)} disabled={deleting} className="secondary-button px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
                Cancel
              </button>
              <button disabled={deleting} className="inline-flex items-center justify-center gap-2 rounded-lg border border-error/35 bg-error/15 px-5 py-3 text-label-md font-semibold text-error hover:bg-error/20 disabled:cursor-wait disabled:opacity-70">
                {deleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
