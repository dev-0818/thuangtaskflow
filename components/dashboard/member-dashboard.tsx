"use client";

import { useState } from "react";
import { formatDistanceToNowStrict } from "date-fns";
import { AlertTriangle, Archive, CalendarDays, CheckCircle2, ClipboardList, Clock3, FileText, Plus, UserRound } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/dashboard/metric-card";
import { CompleteConfirmationModal } from "@/components/ui/complete-confirmation-modal";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { ToastViewport, useToastQueue } from "@/components/ui/toast";
import { getDueLabel, getDueState } from "@/lib/date-status";
import { getDashboardMetrics, getUrgentItems } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import type { Subtask, Task, TaskStatus, UserProfile } from "@/lib/types";

type MemberDashboardProps = {
  currentUser: UserProfile;
  tasks: Task[];
  subtasks: Subtask[];
  users: UserProfile[];
};

function assignmentAge(createdAt: string) {
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return "Assigned recently";

  return `Assigned ${formatDistanceToNowStrict(date, { addSuffix: true })}`;
}

function taskStatusLabel(status: TaskStatus) {
  if (status === "active") return "Active";
  if (status === "completed") return "Completed";
  return "Archived";
}

function RecentStatusBadge({ status }: { status: TaskStatus }) {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-green-300/35 bg-green-400/10 px-3 py-1 text-label-sm font-semibold text-green-200">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Completed
      </span>
    );
  }

  return <StatusBadge label={taskStatusLabel(status)} tone={status} />;
}

export function MemberDashboard({ currentUser, tasks, subtasks, users }: MemberDashboardProps) {
  const mySubtasks = subtasks.filter((subtask) => subtask.assigned_to === currentUser.id);
  const myTaskIds = new Set(mySubtasks.map((subtask) => subtask.task_id));
  const myTasks = tasks.filter((task) => myTaskIds.has(task.id));
  const metrics = getDashboardMetrics(myTasks, mySubtasks);
  const urgentItems = getUrgentItems(myTasks, mySubtasks, users).slice(0, 4);
  const recent = mySubtasks.slice().sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at)).slice(0, 3);
  const [completeTarget, setCompleteTarget] = useState<{ id: number; title: string; taskTitle: string } | null>(null);
  const { toasts, showToast, dismissToast } = useToastQueue();

  return (
    <div className="mx-auto max-w-container">
      <header className="mb-8">
        <h1 className="text-headline-lg-mobile font-semibold text-on-surface md:text-headline-lg">My Overview</h1>
        <p className="mt-3 text-body-lg text-on-surface-variant">Welcome back. Here is your focus for today.</p>
      </header>

      <section className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="My Assigned Tasks" value={mySubtasks.filter((subtask) => !subtask.is_completed).length} icon={UserRound} />
        <MetricCard label="Subtasks Completed" value={metrics.completed_subtasks} icon={CheckCircle2} accent="neutral" />
        <MetricCard label="Approaching Deadline" value={metrics.urgent_subtasks} icon={Clock3} meta="Due <= 3 Days" />
      </section>

      <section className="mt-12 grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <GlassPanel className="p-6 lg:col-span-2">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-3 text-headline-md font-semibold text-on-surface">
              <AlertTriangle className="h-6 w-6 text-error" />
              My Urgent Tasks
            </h2>
            <StatusBadge label="Due <= 3 Days" tone="warning" />
          </div>

          <div className="space-y-4">
            {urgentItems.map((item) => (
              <div key={item.id} className="rounded-lg border border-secondary/15 bg-surface-container-lowest p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-body-md font-semibold text-on-surface">{item.title}</h3>
                    <p className="mt-1 text-label-md font-semibold text-on-surface-variant">Parent: {item.task.title}</p>
                  </div>
                  <StatusBadge label={item.due_label} tone={item.due_state} />
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setCompleteTarget({ id: item.id, title: item.title, taskTitle: item.task.title })}
                    className="flex items-center gap-3 text-label-md font-semibold text-on-surface-variant hover:text-primary"
                  >
                    <span className="h-5 w-5 rounded border border-secondary/30" />
                    Mark Complete
                  </button>
                  <Link href="/tasks" className="inline-flex items-center gap-2 text-label-md font-semibold text-primary">
                    <Plus className="h-4 w-4" />
                    Subtask
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </GlassPanel>

        <GlassPanel className="p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 className="flex items-center gap-3 text-headline-md font-semibold text-on-surface">
              <FileText className="h-6 w-6 text-primary" />
              Recent Assignments
            </h2>
            <span className="rounded-md border border-secondary/15 bg-surface-container-high px-3 py-1 text-label-sm font-semibold text-on-surface-variant">
              {recent.length}
            </span>
          </div>

          <div className="space-y-3">
            {recent.length ? recent.map((subtask) => {
              const task = tasks.find((candidate) => candidate.id === subtask.task_id);
              const dueState = getDueState(subtask);
              const dueLabel = getDueLabel(subtask);
              const status = task?.status ?? (subtask.is_completed ? "completed" : "active");

              return (
                <div
                  key={subtask.id}
                  className={cn(
                    "rounded-lg border border-secondary/12 bg-surface-container-lowest p-4 transition-colors hover:border-secondary/25",
                    status === "completed" && "border-green-300/20 bg-green-400/[0.04]",
                    status === "archived" && "bg-surface-container-high/30"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-md font-semibold text-on-surface">{subtask.title}</p>
                      <p className="mt-1 truncate text-label-md font-semibold text-on-surface-variant">{task?.title ?? "Task"}</p>
                    </div>
                    {status === "completed" ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-300" />
                    ) : status === "archived" ? (
                      <Archive className="h-5 w-5 shrink-0 text-on-surface-variant" />
                    ) : null}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-surface-container-high/70 px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">
                      {assignmentAge(subtask.created_at)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-container-high/70 px-2.5 py-1 text-label-sm font-semibold text-on-surface-variant">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {subtask.deadline_date} at {subtask.deadline_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <RecentStatusBadge status={status} />
                    {status !== "completed" ? <StatusBadge label={dueLabel} tone={dueState} /> : null}
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-5 text-center text-body-md text-on-surface-variant">
                No recent assignments.
              </div>
            )}
          </div>
        </GlassPanel>
      </section>

      <Link href="/tasks" className="secondary-button mt-8 inline-flex items-center gap-2 px-4 py-3 text-label-md lg:hidden">
        <ClipboardList className="h-4 w-4" />
        View Tasks
      </Link>

      {completeTarget ? (
        <CompleteConfirmationModal
          subtaskId={completeTarget.id}
          title={completeTarget.title}
          contextLabel={`Parent: ${completeTarget.taskTitle}`}
          onClose={() => setCompleteTarget(null)}
          onCompleted={() => showToast("Subtask completed", completeTarget.title)}
        />
      ) : null}
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
