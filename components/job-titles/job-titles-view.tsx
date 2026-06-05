"use client";

import { useRef, useState } from "react";
import { Edit3, Plus, Trash2, Users, X } from "lucide-react";
import { createJobTitle, deleteJobTitle, updateJobTitle } from "@/app/actions";
import { GlassPanel } from "@/components/ui/glass-panel";
import { ToastViewport, useToastQueue } from "@/components/ui/toast";
import type { JobTitle, UserProfile } from "@/lib/types";

type JobTitlesViewProps = {
  jobTitles: JobTitle[];
  users: UserProfile[];
};

export function JobTitlesView({ jobTitles, users }: JobTitlesViewProps) {
  const [editingTitle, setEditingTitle] = useState<JobTitle | null>(null);
  const [submitting, setSubmitting] = useState(false);
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
    await deleteJobTitle(formData);
    showToast("Job title deleted", String(formData.get("title_name") ?? ""));
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
            <Plus className="h-4 w-4" />
            {creating ? "Adding..." : "Add"}
          </button>
        </form>
      </header>

      <section className="grid grid-cols-1 gap-gutter md:grid-cols-2 xl:grid-cols-3">
        {jobTitles.map((title) => {
          const activeUsers = users.filter((user) => user.job_title_id === title.id).length;

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
                <form action={handleDelete}>
                  <input type="hidden" name="id" value={title.id} />
                  <input type="hidden" name="title_name" value={title.name} />
                  <button
                    onClick={(event) => {
                      if (!confirm(`Delete job title "${title.name}"?`)) event.preventDefault();
                    }}
                    className="rounded p-2 text-on-surface-variant hover:bg-error/10 hover:text-error"
                    aria-label="Delete job title"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </form>
              </div>
            </GlassPanel>
          );
        })}
      </section>

      {editingTitle ? (
        <div onClick={() => setEditingTitle(null)} className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-margin-mobile">
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
              <button type="button" onClick={() => setEditingTitle(null)} className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" aria-label="Close edit job title">
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
              <button type="button" onClick={() => setEditingTitle(null)} className="secondary-button px-5 py-3 text-label-md">
                Cancel
              </button>
              <button disabled={submitting} className="bronze-button px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
