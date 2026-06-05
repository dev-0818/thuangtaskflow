import { describe, expect, it } from "vitest";
import { getDashboardMetrics, getTeamWorkload, getUrgentItems } from "@/lib/metrics";
import type { Subtask, Task, UserProfile } from "@/lib/types";

const users: UserProfile[] = [
  {
    id: "manager",
    name: "Manager",
    system_role: "manager",
    can_add_subtasks: true,
    job_title_id: null,
    manager_id: null,
    created_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "member-1",
    name: "Member One",
    system_role: "member",
    can_add_subtasks: true,
    job_title_id: null,
    manager_id: "manager",
    created_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "member-2",
    name: "Member Two",
    system_role: "member",
    can_add_subtasks: true,
    job_title_id: null,
    manager_id: "manager",
    created_at: "2026-06-01T00:00:00.000Z"
  }
];

const tasks: Task[] = [
  {
    id: 1,
    title: "Active",
    description: null,
    status: "active",
    priority: "high",
    created_by: "manager",
    created_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: 2,
    title: "Completed",
    description: null,
    status: "completed",
    priority: "normal",
    created_by: "manager",
    created_at: "2026-06-01T00:00:00.000Z"
  }
];

const subtasks: Subtask[] = [
  {
    id: 1,
    task_id: 1,
    title: "Today",
    assigned_to: "member-1",
    deadline_date: "2026-06-03",
    deadline_time: "17:00:00",
    is_completed: false,
    created_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: 2,
    task_id: 1,
    title: "Overdue",
    assigned_to: "member-1",
    deadline_date: "2026-06-01",
    deadline_time: "17:00:00",
    is_completed: false,
    created_at: "2026-06-01T00:00:00.000Z"
  },
  {
    id: 3,
    task_id: 2,
    title: "Done",
    assigned_to: "member-2",
    deadline_date: "2026-06-01",
    deadline_time: "17:00:00",
    is_completed: true,
    created_at: "2026-06-01T00:00:00.000Z"
  }
];

describe("dashboard metrics", () => {
  const now = new Date("2026-06-03T08:00:00.000Z");

  it("aggregates active tasks, completed subtasks, overdue and urgent counts", () => {
    expect(getDashboardMetrics(tasks, subtasks, now)).toEqual({
      active_tasks: 1,
      completed_subtasks: 1,
      overdue_subtasks: 1,
      urgent_subtasks: 1
    });
  });

  it("sorts urgent items by closest deadline", () => {
    const urgent = getUrgentItems(tasks, subtasks, users, now);

    expect(urgent.map((item) => item.title)).toEqual(["Overdue", "Today"]);
  });

  it("computes team workload without counting completed work as active", () => {
    const workload = getTeamWorkload(users, subtasks);

    expect(workload[0]).toMatchObject({
      active_subtasks: 2,
      completed_subtasks: 0
    });
    expect(workload[1]).toMatchObject({
      active_subtasks: 0,
      completed_subtasks: 1
    });
  });
});
