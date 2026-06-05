import { AlertTriangle, CheckCircle2, Clock, ListChecks, Plus, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Avatar } from "@/components/ui/avatar";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDashboardMetrics, getTeamWorkload, getUrgentItems } from "@/lib/metrics";
import { clamp } from "@/lib/utils";
import type { Subtask, Task, UserProfile } from "@/lib/types";

type ManagerDashboardProps = {
  tasks: Task[];
  subtasks: Subtask[];
  users: UserProfile[];
};

export function ManagerDashboard({ tasks, subtasks, users }: ManagerDashboardProps) {
  const metrics = getDashboardMetrics(tasks, subtasks);
  const urgentItems = getUrgentItems(tasks, subtasks, users).slice(0, 4);
  const workload = getTeamWorkload(users, subtasks).slice(0, 4);
  const maxLoad = Math.max(...workload.map((item) => item.active_subtasks), 1);

  return (
    <div className="mx-auto max-w-container">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-headline-lg-mobile font-semibold text-on-surface md:text-headline-lg">Overview</h1>
        <Link href="/tasks" className="bronze-button inline-flex items-center justify-center gap-2 px-5 py-3 text-label-md">
          <Plus className="h-4 w-4" />
          New Task
        </Link>
      </header>

      <section className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <MetricCard label="Active Tasks" value={metrics.active_tasks} icon={TrendingUp} meta="+ 12%" />
        <MetricCard label="Completed" value={metrics.completed_subtasks} icon={CheckCircle2} accent="neutral" meta="This Month" />
        <MetricCard label="Overdue" value={metrics.overdue_subtasks} icon={AlertTriangle} accent="error" meta="Requires Action" />
      </section>

      <section className="mt-12 grid grid-cols-1 gap-gutter lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="flex items-center gap-3 text-headline-md font-semibold text-on-surface">
              <Clock className="h-6 w-6 text-primary" />
              Urgent Attention
            </h2>
            <Link href="/calendar" className="text-label-md font-semibold text-primary">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {urgentItems.map((item) => (
              <GlassPanel key={item.id} className="border-l-4 border-l-primary p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    <span className="mt-1 h-6 w-6 rounded border border-secondary/40" />
                    <div>
                      <h3 className="text-body-lg font-semibold text-on-surface">{item.title}</h3>
                      <p className="text-label-md font-semibold text-on-surface-variant">{item.task.title}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.assignee ? <Avatar name={item.assignee.name} className="h-8 w-8 text-label-sm" /> : null}
                    <StatusBadge label={item.due_label} tone={item.due_state} />
                  </div>
                </div>
              </GlassPanel>
            ))}
          </div>
        </div>

        <GlassPanel className="p-6">
          <h2 className="mb-6 flex items-center gap-3 text-headline-md font-semibold text-on-surface">
            <Users className="h-6 w-6 text-primary" />
            Team Workload
          </h2>
          <div className="space-y-6">
            {workload.map((item) => {
              const width = clamp((item.active_subtasks / maxLoad) * 100, 8, 100);

              return (
                <div key={item.user.id}>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={item.user.name} className="h-8 w-8 text-label-sm" />
                      <span className="truncate text-label-md font-semibold text-on-surface">{item.user.name}</span>
                    </div>
                    <span className="shrink-0 text-label-sm font-semibold text-on-surface">{item.active_subtasks} tasks</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <Link href="/organization" className="secondary-button mt-8 inline-flex w-full items-center justify-center gap-2 px-4 py-3 text-label-md">
            <ListChecks className="h-4 w-4" />
            View Resource Allocation
          </Link>
        </GlassPanel>
      </section>
    </div>
  );
}
