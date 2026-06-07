import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { getDemoTaskflowData } from "@/lib/demo-data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { JobTitle, Subtask, Task, TaskflowData, UserProfile } from "@/lib/types";

function withJobTitles(users: UserProfile[], jobTitles: JobTitle[]) {
  return users.map((user) => ({
    ...user,
    job_title: jobTitles.find((title) => title.id === user.job_title_id) ?? null
  }));
}

export async function getDemoRoleFromCookie() {
  const cookieStore = await cookies();
  const role = cookieStore.get("taskflow-demo-role")?.value;
  return role === "member" ? "member" : "manager";
}

export const getWorkspaceData = cache(async function getWorkspaceData(): Promise<TaskflowData> {
  if (!isSupabaseConfigured()) {
    return getDemoTaskflowData(await getDemoRoleFromCookie());
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: currentProfile, error: profileError } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) throw profileError;
  if (!currentProfile) redirect("/setup-blocked");
  if ((currentProfile as UserProfile).is_active === false) redirect("/login");

  const [usersResult, titlesResult, tasksResult, subtasksResult] = await Promise.all([
    supabase.from("users").select("*").order("created_at", { ascending: true }),
    supabase.from("master_job_titles").select("*").order("name", { ascending: true }),
    supabase.from("tasks").select("*").order("created_at", { ascending: false }),
    supabase.from("subtasks").select("*").order("deadline_date", { ascending: true })
  ]);

  if (usersResult.error) throw usersResult.error;
  if (titlesResult.error) throw titlesResult.error;
  if (tasksResult.error) throw tasksResult.error;
  if (subtasksResult.error) throw subtasksResult.error;

  const jobTitles = (titlesResult.data ?? []) as JobTitle[];
  const users = withJobTitles((usersResult.data ?? []) as UserProfile[], jobTitles);
  const subtasks = (subtasksResult.data ?? []) as Subtask[];
  const visibleTaskIds = new Set(subtasks.map((subtask) => subtask.task_id));
  const tasks = ((tasksResult.data ?? []) as Task[]).filter((task) => {
    if (currentProfile.system_role === "manager") return true;
    return visibleTaskIds.has(task.id);
  });

  return {
    currentUser: {
      ...(currentProfile as UserProfile),
      job_title: jobTitles.find((title) => title.id === currentProfile.job_title_id) ?? null
    },
    users,
    jobTitles,
    tasks,
    subtasks,
    isDemo: false
  };
});
