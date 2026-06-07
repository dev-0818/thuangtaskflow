export type SystemRole = "manager" | "member";
export type TaskStatus = "active" | "completed" | "archived";
export type TaskPriority = "low" | "normal" | "high";
export type DueState = "completed" | "overdue" | "today" | "soon" | "upcoming";

export type JobTitle = {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
};

export type UserProfile = {
  id: string;
  name: string;
  email?: string | null;
  system_role: SystemRole;
  can_add_subtasks: boolean;
  is_active?: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
  job_title_id: number | null;
  manager_id: string | null;
  created_at: string;
  job_title?: JobTitle | null;
};

export type Task = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  created_by: string;
  created_at: string;
};

export type Subtask = {
  id: number;
  task_id: number;
  title: string;
  assigned_to: string;
  assigned_by?: string | null;
  deadline_date: string;
  deadline_time: string;
  is_completed: boolean;
  completed_at?: string | null;
  completion_notes?: string | null;
  created_at: string;
};

export type TaskWithSubtasks = Task & {
  subtasks: Array<Subtask & { assignee?: UserProfile | null }>;
};

export type UrgentItem = Subtask & {
  task: Task;
  assignee: UserProfile | null;
  due_state: DueState;
  due_label: string;
  days_until: number;
};

export type TeamWorkload = {
  user: UserProfile;
  active_subtasks: number;
  completed_subtasks: number;
};

export type DashboardMetrics = {
  active_tasks: number;
  completed_subtasks: number;
  overdue_subtasks: number;
  urgent_subtasks: number;
};

export type TaskflowData = {
  currentUser: UserProfile;
  users: UserProfile[];
  jobTitles: JobTitle[];
  tasks: Task[];
  subtasks: Subtask[];
  isDemo: boolean;
};

export type Database = {
  public: {
    Tables: {
      master_job_titles: {
        Row: JobTitle;
        Insert: Omit<JobTitle, "id" | "created_at"> & { created_at?: string };
        Update: Partial<Omit<JobTitle, "id" | "created_at">>;
      };
      users: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "created_at" | "job_title"> & { created_at?: string };
        Update: Partial<Omit<UserProfile, "id" | "created_at" | "job_title">>;
      };
      tasks: {
        Row: Task;
        Insert: Omit<Task, "id" | "created_at"> & { created_at?: string };
        Update: Partial<Omit<Task, "id" | "created_by" | "created_at">>;
      };
      subtasks: {
        Row: Subtask;
        Insert: Omit<Subtask, "id" | "created_at"> & { created_at?: string };
        Update: Partial<Omit<Subtask, "id" | "created_at">>;
      };
    };
  };
};
