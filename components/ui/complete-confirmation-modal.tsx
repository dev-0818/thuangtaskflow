"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { markSubtaskComplete } from "@/app/actions";

type CompleteConfirmationModalProps = {
  subtaskId: number;
  title: string;
  contextLabel?: string;
  onClose: () => void;
  onCompleted?: () => void;
};

export function CompleteConfirmationModal({
  subtaskId,
  title,
  contextLabel,
  onClose,
  onCompleted
}: CompleteConfirmationModalProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleComplete(formData: FormData) {
    setSubmitting(true);
    try {
      await markSubtaskComplete(formData);
      onCompleted?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 p-margin-mobile"
      role="presentation"
    >
      <section
        onClick={(event) => event.stopPropagation()}
        className="glass-panel w-full max-w-md rounded-xl p-6 shadow-glow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="complete-subtask-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div>
              <h2 id="complete-subtask-title" className="text-headline-md font-semibold text-on-surface">
                Complete Subtask?
              </h2>
              <p className="mt-2 text-body-md text-on-surface-variant">
                This action cannot be undone by members.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface" aria-label="Close confirmation">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-4">
          <p className="text-label-sm font-semibold uppercase text-on-surface-variant">Subtask</p>
          <p className="mt-2 text-body-md font-semibold text-on-surface">{title}</p>
          {contextLabel ? (
            <p className="mt-1 text-label-md text-on-surface-variant">{contextLabel}</p>
          ) : null}
        </div>

        <form action={handleComplete} className="mt-6 space-y-5">
          <input type="hidden" name="id" value={subtaskId} />
          <input type="hidden" name="is_completed" value="true" />
          <label className="block text-left">
            <span className="mb-2 block text-label-sm font-semibold uppercase text-on-surface-variant">Completion Notes</span>
            <textarea
              name="completion_notes"
              rows={4}
              placeholder="Add notes about what was completed..."
              className="input-surface resize-none px-4 py-3 text-label-md"
            />
          </label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="secondary-button px-5 py-3 text-label-md">
              Cancel
            </button>
            <button disabled={submitting} className="bronze-button inline-flex items-center justify-center gap-2 px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? "Completing..." : "Complete"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
