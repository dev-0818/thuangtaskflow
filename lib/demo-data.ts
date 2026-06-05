import { addDays, format, subDays } from "date-fns";
import type { JobTitle, Subtask, Task, TaskflowData, UserProfile } from "@/lib/types";

const nowIso = () => new Date().toISOString();
const date = (offset: number) => format(addDays(new Date(), offset), "yyyy-MM-dd");

export const demoJobTitles: JobTitle[] = [
  {
    id: 1,
    name: "Senior Developer",
    description: "Engineering",
    created_at: nowIso()
  },
  {
    id: 2,
    name: "UI/UX Designer",
    description: "Design",
    created_at: nowIso()
  },
  {
    id: 3,
    name: "QA Engineer",
    description: "Quality Assurance",
    created_at: nowIso()
  },
  {
    id: 4,
    name: "Product Lead",
    description: "Product Strategy",
    created_at: nowIso()
  }
];

export const demoUsers: UserProfile[] = [
  {
    id: "00000000-0000-4000-8000-000000000001",
    name: "Alex Mercer",
    email: "alex@taskflow.local",
    system_role: "manager",
    can_add_subtasks: true,
    job_title_id: 4,
    manager_id: null,
    created_at: nowIso(),
    job_title: demoJobTitles[3]
  },
  {
    id: "00000000-0000-4000-8000-000000000002",
    name: "Sarah Jenkins",
    email: "sarah@taskflow.local",
    system_role: "member",
    can_add_subtasks: true,
    job_title_id: 2,
    manager_id: "00000000-0000-4000-8000-000000000001",
    created_at: nowIso(),
    job_title: demoJobTitles[1]
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    name: "Marcus Reed",
    email: "marcus@taskflow.local",
    system_role: "member",
    can_add_subtasks: false,
    job_title_id: 1,
    manager_id: "00000000-0000-4000-8000-000000000001",
    created_at: nowIso(),
    job_title: demoJobTitles[0]
  },
  {
    id: "00000000-0000-4000-8000-000000000004",
    name: "Elena Rostova",
    email: "elena@taskflow.local",
    system_role: "member",
    can_add_subtasks: true,
    job_title_id: 3,
    manager_id: "00000000-0000-4000-8000-000000000001",
    created_at: nowIso(),
    job_title: demoJobTitles[2]
  },
  {
    id: "00000000-0000-4000-8000-000000000005",
    name: "David Chen",
    email: "david@taskflow.local",
    system_role: "member",
    can_add_subtasks: true,
    job_title_id: 2,
    manager_id: "00000000-0000-4000-8000-000000000002",
    created_at: nowIso(),
    job_title: demoJobTitles[1]
  }
];

export const demoTasks: Task[] = [
  {
    id: 1,
    title: "Q3 Marketing Campaign Overhaul",
    description: "Complete redesign and strategic alignment of digital marketing assets for the upcoming quarter launch.",
    status: "active",
    priority: "high",
    created_by: demoUsers[0].id,
    created_at: subDays(new Date(), 10).toISOString()
  },
  {
    id: 2,
    title: "Client Onboarding Portal",
    description: "Develop a self-service portal for new clients to submit initial requirements and documentation.",
    status: "active",
    priority: "normal",
    created_by: demoUsers[0].id,
    created_at: subDays(new Date(), 6).toISOString()
  },
  {
    id: 3,
    title: "Infrastructure Security Audit",
    description: "Review access controls, audit logs, and compliance findings before production release.",
    status: "active",
    priority: "high",
    created_by: demoUsers[0].id,
    created_at: subDays(new Date(), 3).toISOString()
  },
  {
    id: 4,
    title: "Navigation Refinement Sprint",
    description: "Polish mobile navigation and resolve usability issues discovered in QA.",
    status: "completed",
    priority: "low",
    created_by: demoUsers[0].id,
    created_at: subDays(new Date(), 18).toISOString()
  }
];

export const demoSubtasks: Subtask[] = [
  {
    id: 1,
    task_id: 1,
    title: "Finalize Q3 marketing report",
    assigned_to: demoUsers[1].id,
    deadline_date: date(0),
    deadline_time: "17:00:00",
    is_completed: false,
    completed_at: null,
    completion_notes: null,
    created_at: subDays(new Date(), 4).toISOString()
  },
  {
    id: 2,
    task_id: 1,
    title: "Review landing page copy",
    assigned_to: demoUsers[2].id,
    deadline_date: date(2),
    deadline_time: "14:00:00",
    is_completed: false,
    completed_at: null,
    completion_notes: null,
    created_at: subDays(new Date(), 2).toISOString()
  },
  {
    id: 3,
    task_id: 1,
    title: "Design banner assets",
    assigned_to: demoUsers[1].id,
    deadline_date: date(5),
    deadline_time: "11:00:00",
    is_completed: true,
    completed_at: subDays(new Date(), 1).toISOString(),
    completion_notes: "Final assets uploaded for review.",
    created_at: subDays(new Date(), 8).toISOString()
  },
  {
    id: 4,
    task_id: 2,
    title: "Build requirements intake flow",
    assigned_to: demoUsers[2].id,
    deadline_date: date(6),
    deadline_time: "16:30:00",
    is_completed: false,
    completed_at: null,
    completion_notes: null,
    created_at: subDays(new Date(), 3).toISOString()
  },
  {
    id: 5,
    task_id: 2,
    title: "Prepare weekly sync notes",
    assigned_to: demoUsers[4].id,
    deadline_date: date(3),
    deadline_time: "09:30:00",
    is_completed: false,
    completed_at: null,
    completion_notes: null,
    created_at: subDays(new Date(), 1).toISOString()
  },
  {
    id: 6,
    task_id: 3,
    title: "Review audit compliance matrix",
    assigned_to: demoUsers[3].id,
    deadline_date: date(-1),
    deadline_time: "18:00:00",
    is_completed: false,
    completed_at: null,
    completion_notes: null,
    created_at: subDays(new Date(), 5).toISOString()
  },
  {
    id: 7,
    task_id: 3,
    title: "Update client presentation",
    assigned_to: demoUsers[1].id,
    deadline_date: date(8),
    deadline_time: "12:00:00",
    is_completed: false,
    completed_at: null,
    completion_notes: null,
    created_at: subDays(new Date(), 1).toISOString()
  },
  {
    id: 8,
    task_id: 4,
    title: "Fix mobile bottom navigation spacing",
    assigned_to: demoUsers[4].id,
    deadline_date: date(-5),
    deadline_time: "10:00:00",
    is_completed: true,
    completed_at: subDays(new Date(), 4).toISOString(),
    completion_notes: "Spacing fix verified on mobile breakpoints.",
    created_at: subDays(new Date(), 16).toISOString()
  }
];

export function getDemoTaskflowData(role: "manager" | "member" = "manager"): TaskflowData {
  const currentUser = role === "manager" ? demoUsers[0] : demoUsers[1];

  return {
    currentUser,
    users: demoUsers,
    jobTitles: demoJobTitles,
    tasks: demoTasks,
    subtasks: role === "manager"
      ? demoSubtasks
      : demoSubtasks.filter((subtask) => subtask.assigned_to === currentUser.id),
    isDemo: true
  };
}
