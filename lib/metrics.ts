import { getDaysUntilDeadline, getDueLabel, getDueState } from "@/lib/date-status";
import type {
  DashboardMetrics,
  Subtask,
  Task,
  TaskWithSubtasks,
  TeamWorkload,
  UrgentItem,
  UserProfile
} from "@/lib/types";

export function buildTaskTree(tasks: Task[], subtasks: Subtask[], users: UserProfile[]): TaskWithSubtasks[] {
  return tasks.map((task) => ({
    ...task,
    subtasks: subtasks
      .filter((subtask) => subtask.task_id === task.id)
      .map((subtask) => ({
        ...subtask,
        assignee: users.find((user) => user.id === subtask.assigned_to) ?? null
      }))
  }));
}

export function getDashboardMetrics(tasks: Task[], subtasks: Subtask[], now = new Date()): DashboardMetrics {
  return {
    active_tasks: tasks.filter((task) => task.status === "active").length,
    completed_subtasks: subtasks.filter((subtask) => subtask.is_completed).length,
    overdue_subtasks: subtasks.filter((subtask) => getDueState(subtask, now) === "overdue").length,
    urgent_subtasks: subtasks.filter((subtask) => {
      const state = getDueState(subtask, now);
      return state === "today" || state === "soon";
    }).length
  };
}

export function getUrgentItems(
  tasks: Task[],
  subtasks: Subtask[],
  users: UserProfile[],
  now = new Date()
): UrgentItem[] {
  const urgentItems: UrgentItem[] = [];

  subtasks.forEach((subtask) => {
    const task = tasks.find((candidate) => candidate.id === subtask.task_id);
    if (!task) return;

    const dueState = getDueState(subtask, now);
    if (dueState !== "today" && dueState !== "soon" && dueState !== "overdue") return;

    urgentItems.push({
      ...subtask,
      task,
      assignee: users.find((user) => user.id === subtask.assigned_to) ?? null,
      due_state: dueState,
      due_label: getDueLabel(subtask, now),
      days_until: getDaysUntilDeadline(subtask, now)
    });
  });

  return urgentItems.sort((left, right) => left.days_until - right.days_until);
}

export function getTeamWorkload(users: UserProfile[], subtasks: Subtask[]): TeamWorkload[] {
  return users
    .filter((user) => user.system_role === "member")
    .map((user) => ({
      user,
      active_subtasks: subtasks.filter((subtask) => subtask.assigned_to === user.id && !subtask.is_completed).length,
      completed_subtasks: subtasks.filter((subtask) => subtask.assigned_to === user.id && subtask.is_completed).length
    }))
    .sort((left, right) => right.active_subtasks - left.active_subtasks);
}
