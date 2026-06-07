"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import {
  Archive,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  ClipboardList,
  Flag,
  LoaderCircle,
  PencilLine,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
  X
} from "lucide-react";
import { archiveTask, createSubtask, createTask, deleteTask, unarchiveTask, updateSubtask, updateTaskPriority } from "@/app/actions";
import { Avatar } from "@/components/ui/avatar";
import { CompleteConfirmationModal } from "@/components/ui/complete-confirmation-modal";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToastViewport, useToastQueue } from "@/components/ui/toast";
import { getDueLabel, getDueState } from "@/lib/date-status";
import { buildTaskTree } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { Subtask, SystemRole, Task, TaskPriority, TaskStatus, UserProfile } from "@/lib/types";

type TaskBoardProps = {
  currentUser: UserProfile;
  tasks: Task[];
  subtasks: Subtask[];
  users: UserProfile[];
};

type SubtaskDraft = {
  key: string;
  title: string;
  assignedTo: string;
  deadlineDate: string;
  deadlineTime: string;
};

function statusLabel(status: TaskStatus) {
  if (status === "active") return "In Progress";
  if (status === "completed") return "Completed";
  return "Archived";
}

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-green-300/35 bg-green-400/10 px-3 py-1 text-label-sm font-semibold text-green-200">
        <Check className="h-3.5 w-3.5" />
        Completed
      </span>
    );
  }

  return <StatusBadge label={statusLabel(status)} tone={status} />;
}

function priorityLabel(priority: TaskPriority) {
  if (priority === "high") return "High Priority";
  if (priority === "low") return "Low Priority";
  return "Normal Priority";
}

function priorityClass(priority: TaskPriority) {
  if (priority === "high") return "text-error";
  if (priority === "low") return "text-on-surface-variant";
  return "text-primary";
}

function userLabel(user?: UserProfile | null) {
  if (!user) return "Unassigned";
  return `${user.name}${user.is_active === false ? " (deleted)" : ""}`;
}

function assigneeOptionLabel(user: UserProfile, currentUserId?: string) {
  if (currentUserId && user.id === currentUserId) return `${user.name} (you)`;
  if (user.is_active === false) return `${user.name} (deleted)`;
  if (user.system_role !== "member") return `${user.name} (manager)`;
  return user.name;
}

function getAssignableUsers(users: UserProfile[], currentUser: UserProfile) {
  const options = users.filter((user) => (
    user.is_active !== false &&
    (user.system_role === "member" || user.id === currentUser.id)
  ));

  if (!options.some((user) => user.id === currentUser.id) && currentUser.system_role === "manager") {
    return [currentUser, ...options];
  }

  return options;
}

function mergeAssigneeOptions(options: UserProfile[], currentAssignee?: UserProfile | null) {
  if (!currentAssignee || options.some((option) => option.id === currentAssignee.id)) return options;
  return [currentAssignee, ...options];
}

function timeInputValue(time: string) {
  return time.length >= 5 ? time.slice(0, 5) : time;
}

function formatCompletedAt(completedAt?: string | null) {
  if (!completedAt) return null;
  const date = new Date(completedAt);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function completionLabel(subtask: Subtask & { completed_by_user?: UserProfile | null }) {
  const completedAt = formatCompletedAt(subtask.completed_at);
  if (!completedAt) return null;

  const completedBy = subtask.completed_by_user ? ` by ${userLabel(subtask.completed_by_user)}` : "";
  return `Completed${completedBy} · ${completedAt}`;
}

function getEffectiveTaskStatus(task: Task & { subtasks: Subtask[] }): TaskStatus {
  if (task.status === "archived") return "archived";
  if (task.subtasks.length > 0 && task.subtasks.every((subtask) => subtask.is_completed)) return "completed";
  if (task.status === "completed") return "active";
  return task.status;
}

function CreateTaskModal({
  currentUser,
  users,
  onClose,
  onCreated
}: {
  currentUser: UserProfile;
  users: UserProfile[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const assigneeOptions = getAssignableUsers(users, currentUser);
  const firstAssignee = assigneeOptions[0]?.id ?? "";
  const [drafts, setDrafts] = useState<SubtaskDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submitLockedRef = useRef(false);

  async function handleCreate(formData: FormData) {
    if (submitLockedRef.current) return;
    submitLockedRef.current = true;
    setSubmitting(true);

    try {
      await createTask(formData);
      onCreated();
      onClose();
    } finally {
      submitLockedRef.current = false;
      setSubmitting(false);
    }
  }

  function updateDraft(key: string, patch: Partial<SubtaskDraft>) {
    setDrafts((current) => current.map((draft) => (draft.key === key ? { ...draft, ...patch } : draft)));
  }

  function addDraft() {
    setDrafts((current) => [
      ...current,
      {
        key: crypto.randomUUID(),
        title: "",
        assignedTo: firstAssignee,
        deadlineDate: "",
        deadlineTime: "09:00"
      }
    ]);
  }

  function closeIfIdle() {
    if (submitLockedRef.current) return;
    onClose();
  }

  return (
    <div onClick={closeIfIdle} className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-margin-mobile">
      <form
        action={handleCreate}
        onSubmit={() => setSubmitting(true)}
        onClick={(event) => event.stopPropagation()}
        className="custom-scrollbar max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-secondary/20 bg-surface-container shadow-glow"
      >
        <header className="flex items-start justify-between gap-4 border-b border-secondary/10 p-6 md:p-8">
          <div>
            <h2 className="text-headline-md font-semibold text-on-surface">Create New Task</h2>
            <p className="mt-2 text-body-md text-on-surface-variant">Add the main assignment. Subtasks can be added now or later.</p>
          </div>
          <button
            type="button"
            onClick={closeIfIdle}
            disabled={submitting}
            className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:cursor-wait disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </header>

        <div className="space-y-7 p-6 md:p-8">
          <div>
            <label className="mb-2 block text-label-md font-semibold text-on-surface">Task Title</label>
            <input name="title" required placeholder="e.g., Q3 Marketing Campaign Strategy" className="input-surface px-4 py-4 text-body-md" />
          </div>

          <label className="block">
            <span className="mb-2 block text-label-md font-semibold text-on-surface">Priority</span>
            <select name="priority" defaultValue="normal" className="input-surface min-h-[56px] cursor-pointer px-4 py-3 text-body-md">
              <option value="low" className="bg-surface text-on-surface">Low Priority</option>
              <option value="normal" className="bg-surface text-on-surface">Normal Priority</option>
              <option value="high" className="bg-surface text-on-surface">High Priority</option>
            </select>
          </label>

          <div>
            <label className="mb-2 block text-label-md font-semibold text-on-surface">Description</label>
            <textarea name="description" rows={4} placeholder="Briefly describe the objective and scope..." className="input-surface resize-none px-4 py-4 text-body-md" />
          </div>

          <div className="border-t border-secondary/10 pt-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-label-md font-semibold uppercase text-on-surface">Subtasks</h3>
              <span className="rounded-full bg-surface-container-high px-3 py-1 text-label-sm font-semibold text-on-surface-variant">
                {drafts.length} Added
              </span>
            </div>

            {drafts.length === 0 ? (
              <div className="rounded-lg border border-dashed border-secondary/20 bg-surface-container-lowest px-4 py-5 text-body-md text-on-surface-variant">
                No subtasks yet. Create the task as-is, or add a subtask below.
              </div>
            ) : null}

            <div className="space-y-4">
              {drafts.map((draft, index) => (
                <div key={draft.key} className="rounded-lg bg-surface-container-lowest p-4">
                  <div className="mb-4 flex items-center gap-3">
                    <input
                      name="subtask_title"
                      value={draft.title}
                      onChange={(event) => updateDraft(draft.key, { title: event.target.value })}
                      required
                      placeholder={`Subtask ${index + 1}`}
                      className="w-full bg-transparent text-body-md font-semibold text-on-surface outline-none placeholder:text-on-surface-variant/55"
                    />
                    <button
                      type="button"
                      onClick={() => setDrafts((current) => current.filter((item) => item.key !== draft.key))}
                      className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-error"
                      aria-label="Delete subtask"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-3 border-t border-secondary/10 pt-4 md:grid-cols-3">
                    <label className="input-surface flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-3 text-label-md text-on-surface-variant">
                      <UserRound className="h-4 w-4" />
                      <select
                        name="assigned_to"
                        value={draft.assignedTo}
                        onChange={(event) => updateDraft(draft.key, { assignedTo: event.target.value })}
                        required
                        className="h-8 w-full cursor-pointer bg-transparent text-on-surface outline-none"
                      >
                        {assigneeOptions.map((assignee) => (
                          <option key={assignee.id} value={assignee.id} className="bg-surface text-on-surface">
                            {assigneeOptionLabel(assignee, currentUser.id)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="input-surface flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-3 text-label-md text-on-surface-variant">
                      <CalendarDays className="h-4 w-4" />
                      <input
                        name="deadline_date"
                        type="date"
                        value={draft.deadlineDate}
                        onChange={(event) => updateDraft(draft.key, { deadlineDate: event.target.value })}
                        required
                        className="h-8 w-full cursor-pointer bg-transparent text-on-surface outline-none"
                      />
                    </label>
                    <label className="input-surface flex min-h-[56px] cursor-pointer items-center gap-3 px-4 py-3 text-label-md text-on-surface-variant">
                      <Clock className="h-4 w-4" />
                      <input
                        name="deadline_time"
                        type="time"
                        value={draft.deadlineTime}
                        onChange={(event) => updateDraft(draft.key, { deadlineTime: event.target.value })}
                        required
                        className="h-8 w-full cursor-pointer bg-transparent text-on-surface outline-none"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addDraft}
              disabled={!firstAssignee}
              className="mt-5 inline-flex items-center gap-2 rounded px-2 py-2 text-label-md font-semibold text-primary disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus className="h-4 w-4" />
              Add Subtask
            </button>
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-secondary/10 p-6 sm:flex-row sm:justify-end md:p-8">
          <button type="button" onClick={closeIfIdle} disabled={submitting} className="secondary-button px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            aria-disabled={submitting}
            className="bronze-button inline-flex items-center justify-center gap-2 px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70"
          >
            <Check className="h-4 w-4" />
            {submitting ? "Creating..." : "Create Task"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function AddSubtaskForm({
  taskId,
  currentUser,
  users,
  onCreated
}: {
  taskId: number;
  currentUser: UserProfile;
  users: UserProfile[];
  onCreated: () => void;
}) {
  const assigneeOptions = getAssignableUsers(users, currentUser);
  const managerMode = currentUser.system_role === "manager";
  const [submitting, setSubmitting] = useState(false);
  const submitLockedRef = useRef(false);

  async function handleCreate(formData: FormData) {
    if (submitLockedRef.current) return;
    submitLockedRef.current = true;
    setSubmitting(true);

    try {
      await createSubtask(formData);
      onCreated();
    } finally {
      submitLockedRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <form action={handleCreate} onSubmit={() => setSubmitting(true)} className="mt-4 grid grid-cols-1 gap-3 rounded-lg border border-secondary/10 bg-surface-container-lowest p-4 md:grid-cols-[1fr_180px_160px_140px_auto]">
      <input type="hidden" name="task_id" value={taskId} />
      <input name="title" required placeholder="Add subtask" className="input-surface px-3 py-2 text-label-md" />
      {managerMode ? (
        <select name="assigned_to" required className="input-surface min-h-[44px] cursor-pointer px-3 py-2 text-label-md">
          {assigneeOptions.map((assignee) => (
            <option key={assignee.id} value={assignee.id} className="bg-surface text-on-surface">
              {assigneeOptionLabel(assignee, currentUser.id)}
            </option>
          ))}
        </select>
      ) : (
        <input type="hidden" name="assigned_to" value={currentUser.id} />
      )}
      <input name="deadline_date" required type="date" className="input-surface px-3 py-2 text-label-md" />
      <input name="deadline_time" required type="time" defaultValue="09:00" className="input-surface px-3 py-2 text-label-md" />
      <button disabled={submitting} className="bronze-button px-4 py-2 text-label-md disabled:cursor-wait disabled:opacity-70">
        {submitting ? "Adding..." : "Add"}
      </button>
    </form>
  );
}

function DeleteTaskConfirmationModal({
  task,
  onClose,
  onPendingChange,
  onDeleted
}: {
  task: Task & { subtasks: Subtask[] };
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const submitLockedRef = useRef(false);

  async function handleDelete(formData: FormData) {
    if (submitLockedRef.current) return;
    submitLockedRef.current = true;
    setSubmitting(true);
    onPendingChange?.(true);
    try {
      await deleteTask(formData);
      onDeleted();
      onClose();
    } finally {
      submitLockedRef.current = false;
      onPendingChange?.(false);
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={() => {
        if (!submitting) onClose();
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 p-margin-mobile"
      role="presentation"
    >
      <section
        onClick={(event) => event.stopPropagation()}
        className="glass-panel w-full max-w-md rounded-xl p-6 shadow-glow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-error/30 bg-error/10 text-error">
              <Trash2 className="h-5 w-5" />
            </span>
            <div>
              <h2 id="delete-task-title" className="text-headline-md font-semibold text-on-surface">
                Delete Task?
              </h2>
              <p className="mt-2 text-body-md text-on-surface-variant">
                This will remove the task and all of its subtasks.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:cursor-wait disabled:opacity-60"
            aria-label="Close delete confirmation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-4">
          <p className="text-label-sm font-semibold uppercase text-on-surface-variant">Task</p>
          <p className="mt-2 text-body-md font-semibold text-on-surface">{task.title}</p>
          <p className="mt-1 text-label-md text-on-surface-variant">{task.subtasks.length} subtasks will be deleted</p>
        </div>

        <form
          action={handleDelete}
          onSubmit={() => {
            setSubmitting(true);
            onPendingChange?.(true);
          }}
          className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <input type="hidden" name="id" value={task.id} />
          <button type="button" onClick={onClose} disabled={submitting} className="secondary-button px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
            Cancel
          </button>
          <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-lg border border-error/35 bg-error/15 px-5 py-3 text-label-md font-semibold text-error hover:bg-error/20 disabled:cursor-wait disabled:opacity-70">
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {submitting ? "Deleting..." : "Delete"}
          </button>
        </form>
      </section>
    </div>
  );
}

function ArchiveTaskConfirmationModal({
  task,
  mode,
  onClose,
  onPendingChange,
  onDone
}: {
  task: Task & { subtasks: Subtask[] };
  mode: "archive" | "unarchive";
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
  onDone: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const isArchive = mode === "archive";

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    onPendingChange?.(true);

    try {
      if (isArchive) {
        await archiveTask(formData);
      } else {
        await unarchiveTask(formData);
      }

      onDone();
      onClose();
    } finally {
      onPendingChange?.(false);
      setSubmitting(false);
    }
  }

  return (
    <div
      onClick={() => {
        if (!submitting) onClose();
      }}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-background/85 p-margin-mobile"
      role="presentation"
    >
      <section
        onClick={(event) => event.stopPropagation()}
        className="glass-panel w-full max-w-md rounded-xl p-6 shadow-glow"
        role="dialog"
        aria-modal="true"
        aria-labelledby="archive-task-title"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary">
              {isArchive ? <Archive className="h-5 w-5" /> : <RotateCcw className="h-5 w-5" />}
            </span>
            <div>
              <h2 id="archive-task-title" className="text-headline-md font-semibold text-on-surface">
                {isArchive ? "Archive Task?" : "Unarchive Task?"}
              </h2>
              <p className="mt-2 text-body-md text-on-surface-variant">
                {isArchive
                  ? "Archived tasks are hidden from the default task list."
                  : "This task will return to the active task list."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface disabled:cursor-wait disabled:opacity-60"
            aria-label="Close archive confirmation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-4">
          <p className="text-label-sm font-semibold uppercase text-on-surface-variant">Task</p>
          <p className="mt-2 text-body-md font-semibold text-on-surface">{task.title}</p>
          <p className="mt-1 text-label-md text-on-surface-variant">{task.subtasks.length} subtasks</p>
        </div>

        <form
          action={handleSubmit}
          onSubmit={() => {
            setSubmitting(true);
            onPendingChange?.(true);
          }}
          className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
        >
          <input type="hidden" name="id" value={task.id} />
          <button type="button" onClick={onClose} disabled={submitting} className="secondary-button px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
            Cancel
          </button>
          <button disabled={submitting} className="bronze-button inline-flex items-center justify-center gap-2 px-5 py-3 text-label-md disabled:cursor-wait disabled:opacity-70">
            {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : isArchive ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            {submitting ? (isArchive ? "Archiving..." : "Unarchiving...") : isArchive ? "Archive" : "Unarchive"}
          </button>
        </form>
      </section>
    </div>
  );
}

function ManagerSubtaskEditor({
  subtask,
  currentUser,
  users,
  isCompleting = false,
  onComplete,
  onUpdated
}: {
  subtask: Subtask & { assignee?: UserProfile | null; completed_by_user?: UserProfile | null };
  currentUser: UserProfile;
  users: UserProfile[];
  isCompleting?: boolean;
  onComplete: () => void;
  onUpdated: () => void;
}) {
  const assigneeOptions = mergeAssigneeOptions(getAssignableUsers(users, currentUser), subtask.assignee);
  const dueState = getDueState(subtask);
  const label = getDueLabel(subtask);
  const completedText = completionLabel(subtask);
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleUpdate(formData: FormData) {
    setSubmitting(true);
    try {
      await updateSubtask(formData);
      onUpdated();
      setEditing(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <div
        className={cn(
          "grid grid-cols-1 gap-4 rounded-lg border border-secondary/10 bg-surface-container-lowest p-4 md:grid-cols-[1fr_auto_auto_auto] md:items-center",
          dueState === "overdue" && "border-error/25 bg-error/5",
          (dueState === "today" || dueState === "soon") && "border-primary/25 bg-primary/5"
        )}
      >
        <div className="flex items-start gap-3">
          {subtask.is_completed ? (
            <span
              className={cn(
                "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-secondary/35",
                "border-primary bg-primary text-on-primary"
              )}
            >
              <Check className="h-3 w-3" />
            </span>
          ) : (
            <button
              type="button"
              disabled={isCompleting}
              onClick={onComplete}
              className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-secondary/35 hover:border-primary hover:bg-primary/10 disabled:cursor-wait disabled:border-primary/60 disabled:bg-primary/10 disabled:opacity-80"
              aria-label="Mark complete"
            >
              {isCompleting ? <LoaderCircle className="h-3 w-3 animate-spin text-primary" /> : null}
            </button>
          )}
          <div className="min-w-0">
            <p className={cn("truncate text-body-md font-semibold text-on-surface", subtask.is_completed && "text-on-surface-variant line-through opacity-60")}>
              {subtask.title}
            </p>
            <p className="mt-1 text-label-sm text-on-surface-variant">Assigned to {userLabel(subtask.assignee)}</p>
            {completedText ? (
              <p className="mt-1 text-label-sm font-semibold text-primary">{completedText}</p>
            ) : null}
            {subtask.completion_notes ? (
              <p className="mt-2 max-w-3xl rounded-md border border-secondary/10 bg-surface-container-high/45 px-3 py-2 text-label-sm text-on-surface-variant">
                Notes: {subtask.completion_notes}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {subtask.assignee ? <Avatar name={subtask.assignee.name} className="h-8 w-8 text-label-sm" /> : null}
          <StatusBadge label={label} tone={dueState} />
        </div>

        <span className="inline-flex items-center gap-2 text-label-md font-semibold text-on-surface-variant">
          <CalendarDays className="h-4 w-4" />
          {subtask.deadline_date}
          <Clock className="ml-2 h-4 w-4" />
          {timeInputValue(subtask.deadline_time)}
        </span>

        <button
          type="button"
          onClick={() => setEditing(true)}
          className="secondary-button inline-flex min-h-[40px] items-center justify-center gap-2 px-4 py-2 text-label-md"
        >
          <PencilLine className="h-4 w-4" />
          Edit
        </button>
      </div>
    );
  }

  return (
    <form
      action={handleUpdate}
      className={cn(
        "grid grid-cols-1 gap-3 rounded-lg border border-secondary/10 bg-surface-container-lowest p-4 md:grid-cols-[1fr_190px_155px_125px_135px_auto] md:items-center",
        dueState === "overdue" && "border-error/25 bg-error/5",
        (dueState === "today" || dueState === "soon") && "border-primary/25 bg-primary/5"
      )}
    >
      <input type="hidden" name="id" value={subtask.id} />

      <label className="block">
        <span className="mb-1 block text-label-sm font-semibold text-on-surface-variant">Subtask</span>
        <input
          name="title"
          defaultValue={subtask.title}
          required
          className="input-surface min-h-[44px] px-3 py-2 text-label-md"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-label-sm font-semibold text-on-surface-variant">Assign</span>
        <select
          name="assigned_to"
          defaultValue={subtask.assigned_to}
          required
          className="input-surface min-h-[44px] cursor-pointer px-3 py-2 text-label-md"
        >
          {assigneeOptions.map((assignee) => (
            <option key={assignee.id} value={assignee.id} className="bg-surface text-on-surface">
              {assigneeOptionLabel(assignee, currentUser.id)}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="mb-1 block text-label-sm font-semibold text-on-surface-variant">Date</span>
        <input
          name="deadline_date"
          type="date"
          defaultValue={subtask.deadline_date}
          required
          className="input-surface min-h-[44px] cursor-pointer px-3 py-2 text-label-md"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-label-sm font-semibold text-on-surface-variant">Time</span>
        <input
          name="deadline_time"
          type="time"
          defaultValue={timeInputValue(subtask.deadline_time)}
          required
          className="input-surface min-h-[44px] cursor-pointer px-3 py-2 text-label-md"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-label-sm font-semibold text-on-surface-variant">Status</span>
        <span className="flex min-h-[44px] items-center justify-center gap-3 rounded-lg border border-secondary/10 bg-surface-container-high/45 px-3 py-2 text-label-md font-semibold text-on-surface-variant">
          <input
            name="is_completed"
            type="checkbox"
            defaultChecked={subtask.is_completed}
            className="h-5 w-5 rounded border-secondary/30 accent-primary"
          />
          Done
        </span>
      </label>

      <div className="flex items-center justify-between gap-3 md:flex-col md:items-stretch">
        <StatusBadge label={label} tone={dueState} />
        <div className="flex gap-2 md:flex-col">
          <button type="button" onClick={() => setEditing(false)} className="secondary-button min-h-[44px] px-4 py-2 text-label-md">
            Cancel
          </button>
          <button disabled={submitting} className="bronze-button min-h-[44px] px-4 py-2 text-label-md disabled:cursor-wait disabled:opacity-70">
            {submitting ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}

function SubtaskDisplayRow({
  subtask,
  readOnly,
  isCompleting = false,
  onComplete
}: {
  subtask: Subtask & { assignee?: UserProfile | null; completed_by_user?: UserProfile | null };
  readOnly: boolean;
  isCompleting?: boolean;
  onComplete: () => void;
}) {
  const dueState = getDueState(subtask);
  const label = getDueLabel(subtask);
  const completedText = completionLabel(subtask);

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 rounded-lg border border-secondary/10 bg-surface-container-lowest p-4 md:grid-cols-[1fr_auto_auto] md:items-center",
        dueState === "overdue" && "border-error/25 bg-error/5",
        (dueState === "today" || dueState === "soon") && "border-primary/25 bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        {subtask.is_completed ? (
          <span
            className={cn(
              "mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-secondary/35",
              "border-primary bg-primary text-on-primary"
            )}
          >
            <Check className="h-3 w-3" />
          </span>
        ) : readOnly ? (
          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-secondary/35" />
        ) : (
          <button
            type="button"
            disabled={isCompleting}
            onClick={onComplete}
            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-secondary/35 hover:border-primary hover:bg-primary/10 disabled:cursor-wait disabled:border-primary/60 disabled:bg-primary/10 disabled:opacity-80"
            aria-label="Mark complete"
          >
            {isCompleting ? <LoaderCircle className="h-3 w-3 animate-spin text-primary" /> : null}
          </button>
        )}
        <div className="min-w-0">
          <p className={cn("text-body-md font-semibold text-on-surface", subtask.is_completed && "text-on-surface-variant line-through opacity-60")}>
            {subtask.title}
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">Assigned to {userLabel(subtask.assignee)}</p>
          {completedText ? (
            <p className="mt-1 text-label-sm font-semibold text-primary">{completedText}</p>
          ) : null}
          {subtask.completion_notes ? (
            <p className="mt-2 max-w-3xl rounded-md border border-secondary/10 bg-surface-container-high/45 px-3 py-2 text-label-sm text-on-surface-variant">
              Notes: {subtask.completion_notes}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {subtask.assignee ? <Avatar name={subtask.assignee.name} className="h-8 w-8 text-label-sm" /> : null}
        <StatusBadge label={label} tone={dueState} />
      </div>

      <span className="inline-flex items-center gap-2 text-label-md font-semibold text-on-surface-variant">
        <CalendarDays className="h-4 w-4" />
        {subtask.deadline_date}
        <Clock className="ml-2 h-4 w-4" />
        {timeInputValue(subtask.deadline_time)}
      </span>
    </div>
  );
}

export function TaskBoard({ currentUser, tasks, subtasks, users }: TaskBoardProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  const [priorityOverrides, setPriorityOverrides] = useState<Record<number, TaskPriority>>({});
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [completeTarget, setCompleteTarget] = useState<{ id: number; title: string; taskTitle: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<(Task & { subtasks: Subtask[] }) | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{ task: Task & { subtasks: Subtask[] }; mode: "archive" | "unarchive" } | null>(null);
  const [completingSubtaskId, setCompletingSubtaskId] = useState<number | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);
  const [archivePendingTarget, setArchivePendingTarget] = useState<{ taskId: number; mode: "archive" | "unarchive" } | null>(null);
  const [isPriorityPending, startPriorityTransition] = useTransition();
  const { toasts, showToast, dismissToast } = useToastQueue();
  const taskTree = useMemo(() => buildTaskTree(tasks, subtasks, users), [tasks, subtasks, users]);
  const role: SystemRole = currentUser.system_role;
  const archivedCount = taskTree.filter((task) => getEffectiveTaskStatus(task) === "archived").length;

  function toggleTask(taskId: number) {
    setExpandedTaskIds((current) => {
      const next = new Set(current);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }

  function handlePriorityChange(taskId: number, previousPriority: TaskPriority, nextPriority: TaskPriority) {
    setPriorityError(null);
    setPriorityOverrides((current) => ({ ...current, [taskId]: nextPriority }));

    const formData = new FormData();
    formData.set("id", String(taskId));
    formData.set("priority", nextPriority);

    startPriorityTransition(async () => {
      const result = await updateTaskPriority(formData);
      if (!result.ok) {
        setPriorityOverrides((current) => ({ ...current, [taskId]: previousPriority }));
        setPriorityError(result.error ?? "Priority gagal diperbarui.");
        showToast("Priority update failed", result.error ?? "Please try again.", "error");
      } else {
        showToast("Priority updated");
      }
    });
  }

  const filteredTasks = taskTree.filter((task) => {
    const matchesQuery = `${task.title} ${task.description ?? ""}`.toLowerCase().includes(query.toLowerCase());
    const taskStatus = getEffectiveTaskStatus(task);
    const matchesStatus = status === "all" ? taskStatus !== "archived" : taskStatus === status;
    return matchesQuery && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-container">
      <header className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-semibold text-on-surface md:text-headline-lg">Tasks</h1>
          <p className="mt-2 text-body-lg text-on-surface-variant">
            {role === "manager" ? "Manage and track your team's initiatives." : "Track your assigned work and deadlines."}
          </p>
        </div>
        {role === "manager" ? (
          <button onClick={() => setModalOpen(true)} className="bronze-button inline-flex w-full items-center justify-center gap-2 px-5 py-3 text-label-md sm:w-auto">
            <Plus className="h-4 w-4" />
            Create New Task
          </button>
        ) : null}
      </header>

      <div className="mb-8 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_230px_auto] lg:items-center">
        <label className="input-surface flex min-w-0 items-center gap-3 px-4 py-3">
          <Search className="h-5 w-5 text-on-surface-variant" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search tasks..."
            className="w-full bg-transparent text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/55"
          />
        </label>

        <label className="relative inline-flex min-h-[50px] w-full items-center overflow-hidden rounded-lg border border-secondary/20 bg-surface-container-high/70 text-label-md font-semibold text-on-surface">
          <span className="shrink-0 border-r border-secondary/15 px-4 text-on-surface-variant">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus | "all")}
            className="h-full min-h-[50px] flex-1 cursor-pointer appearance-none bg-transparent px-4 pr-10 text-on-surface outline-none"
          >
            <option value="all" className="bg-surface text-on-surface">All</option>
            <option value="active" className="bg-surface text-on-surface">Active</option>
            <option value="completed" className="bg-surface text-on-surface">Completed</option>
            <option value="archived" className="bg-surface text-on-surface">Archived</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-4 h-4 w-4 text-on-surface-variant" />
        </label>

        <button
          type="button"
          onClick={() => setStatus(status === "archived" ? "all" : "archived")}
          className={cn(
            "secondary-button inline-flex min-h-[50px] items-center justify-center gap-2 px-4 py-3 text-label-md",
            status === "archived" && "border-primary/40 bg-primary/10 text-primary"
          )}
        >
          <Archive className="h-4 w-4" />
          {status === "archived" ? "Show All" : `View Archived (${archivedCount})`}
        </button>
      </div>

      {priorityError ? (
        <div className="mb-5 rounded-lg border border-error/30 bg-error/10 px-4 py-3 text-label-md font-semibold text-error">
          {priorityError}
        </div>
      ) : null}

      <div className="space-y-5">
        {filteredTasks.map((task) => {
          const taskStatus = getEffectiveTaskStatus(task);
          const isArchived = taskStatus === "archived";
          const expanded = expandedTaskIds.has(task.id);
          const priority = priorityOverrides[task.id] ?? task.priority ?? "normal";
          const archiveButtonPending = archivePendingTarget?.taskId === task.id && archivePendingTarget.mode === "archive";
          const unarchiveButtonPending = archivePendingTarget?.taskId === task.id && archivePendingTarget.mode === "unarchive";
          const deleteButtonPending = deletingTaskId === task.id;
          const taskCreator = users.find((user) => user.id === task.created_by);

          return (
          <GlassPanel key={task.id} className="task-card-viewport overflow-hidden">
            <div
              onClick={() => toggleTask(task.id)}
              className="cursor-pointer p-5 transition-colors hover:bg-surface-container-high/35 md:p-6"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleTask(task.id);
                }
              }}
            >
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="flex min-w-0 gap-3 md:gap-4">
                  <ChevronDown className={cn("mt-1 h-5 w-5 shrink-0 text-primary transition-transform", !expanded && "-rotate-90")} />
                  <div className="min-w-0">
                    <h2 className="break-words text-body-lg font-semibold text-on-surface md:text-headline-md">{task.title}</h2>
                    {expanded ? (
                      <p className="mt-3 max-w-4xl text-body-md text-on-surface-variant">{task.description}</p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-label-md font-semibold text-on-surface-variant">
                      <span className="inline-flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        {task.subtasks.length} Subtasks
                      </span>
                      <span className={cn("inline-flex items-center gap-2", priorityClass(priority))}>
                        <Flag className="h-4 w-4" />
                        {priorityLabel(priority)}
                      </span>
                      <span className="inline-flex items-center gap-2">
                        <UserRound className="h-4 w-4" />
                        Created by {userLabel(taskCreator)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex min-w-0 flex-wrap items-center gap-2 border-t border-secondary/10 pt-4 lg:min-w-[280px] lg:justify-end lg:border-t-0 lg:pt-0">
                  {role === "manager" && !isArchived ? (
                    <div
                      onClick={(event) => event.stopPropagation()}
                      className="secondary-button inline-flex min-h-[38px] shrink-0 items-center gap-2 px-3 py-2 text-label-sm"
                    >
                      <Flag className={cn("h-4 w-4", priorityClass(priority))} />
                      <select
                        value={priority}
                        disabled={isPriorityPending}
                        onChange={(event) => handlePriorityChange(task.id, priority, event.target.value as TaskPriority)}
                        className="cursor-pointer bg-transparent outline-none"
                        aria-label="Task priority"
                      >
                        <option value="low" className="bg-surface text-on-surface">Low</option>
                        <option value="normal" className="bg-surface text-on-surface">Normal</option>
                        <option value="high" className="bg-surface text-on-surface">High</option>
                      </select>
                    </div>
                  ) : null}
                  <TaskStatusBadge status={taskStatus} />
                  {role === "manager" ? (
                    <>
                      {taskStatus === "completed" ? (
                        <button
                          type="button"
                          disabled={archiveButtonPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            setArchiveTarget({ task, mode: "archive" });
                          }}
                          className="secondary-button inline-flex min-h-[38px] shrink-0 items-center gap-2 px-3 py-2 text-label-sm disabled:cursor-wait disabled:opacity-70"
                          aria-label={`Archive ${task.title}`}
                        >
                          {archiveButtonPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
                          {archiveButtonPending ? "Archiving..." : "Archive"}
                        </button>
                      ) : null}
                      {taskStatus === "archived" ? (
                        <button
                          type="button"
                          disabled={unarchiveButtonPending}
                          onClick={(event) => {
                            event.stopPropagation();
                            setArchiveTarget({ task, mode: "unarchive" });
                          }}
                          className="secondary-button inline-flex min-h-[38px] shrink-0 items-center gap-2 px-3 py-2 text-label-sm disabled:cursor-wait disabled:opacity-70"
                          aria-label={`Unarchive ${task.title}`}
                        >
                          {unarchiveButtonPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                          {unarchiveButtonPending ? "Unarchiving..." : "Unarchive"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        disabled={deleteButtonPending}
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteTarget(task);
                        }}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded text-on-surface-variant hover:bg-error/10 hover:text-error disabled:cursor-wait disabled:bg-error/10 disabled:text-error disabled:opacity-70"
                        aria-label={`Delete ${task.title}`}
                      >
                        {deleteButtonPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>

            {expanded ? (
            <div className="border-t border-secondary/10 bg-surface/50 px-5 py-4 md:px-7">
              <div className="space-y-3">
                {task.subtasks.map((subtask) => {
                  if (role === "manager" && !isArchived) {
                    return (
                      <ManagerSubtaskEditor
                        key={subtask.id}
                        subtask={subtask}
                        currentUser={currentUser}
                        users={users}
                        isCompleting={completingSubtaskId === subtask.id}
                        onComplete={() => setCompleteTarget({ id: subtask.id, title: subtask.title, taskTitle: task.title })}
                        onUpdated={() => showToast("Subtask updated", subtask.title)}
                      />
                    );
                  }

                  return (
                    <SubtaskDisplayRow
                      key={subtask.id}
                      subtask={subtask}
                      readOnly={isArchived || role === "manager"}
                      isCompleting={completingSubtaskId === subtask.id}
                      onComplete={() => setCompleteTarget({ id: subtask.id, title: subtask.title, taskTitle: task.title })}
                    />
                  );
                })}
              </div>
              {!isArchived && (role === "manager" || currentUser.can_add_subtasks) ? (
                <AddSubtaskForm
                  taskId={task.id}
                  currentUser={currentUser}
                  users={users}
                  onCreated={() => showToast("Subtask created", task.title)}
                />
              ) : null}
            </div>
            ) : null}
          </GlassPanel>
          );
        })}
      </div>

      {modalOpen ? (
        <CreateTaskModal
          currentUser={currentUser}
          users={users}
          onClose={() => setModalOpen(false)}
          onCreated={() => showToast("Task created")}
        />
      ) : null}
      {deleteTarget ? (
        <DeleteTaskConfirmationModal
          task={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onPendingChange={(pending) => {
            setDeletingTaskId(pending ? deleteTarget.id : null);
          }}
          onDeleted={() => showToast("Task deleted", deleteTarget.title)}
        />
      ) : null}
      {archiveTarget ? (
        <ArchiveTaskConfirmationModal
          task={archiveTarget.task}
          mode={archiveTarget.mode}
          onClose={() => setArchiveTarget(null)}
          onPendingChange={(pending) => {
            setArchivePendingTarget(pending ? { taskId: archiveTarget.task.id, mode: archiveTarget.mode } : null);
          }}
          onDone={() => showToast(archiveTarget.mode === "archive" ? "Task archived" : "Task unarchived", archiveTarget.task.title)}
        />
      ) : null}
      {completeTarget ? (
        <CompleteConfirmationModal
          subtaskId={completeTarget.id}
          title={completeTarget.title}
          contextLabel={`Parent: ${completeTarget.taskTitle}`}
          onClose={() => setCompleteTarget(null)}
          onPendingChange={(pending) => {
            setCompletingSubtaskId(pending ? completeTarget.id : null);
          }}
          onCompleted={() => showToast("Subtask completed", completeTarget.title)}
        />
      ) : null}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
