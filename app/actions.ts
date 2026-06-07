"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { notifyAssignedSubtasks, notifyManagersSubtaskCompleted, notifyPasswordReset } from "@/lib/email-notifications";
import { createSupabaseServerClient, createSupabaseServiceClient } from "@/lib/supabase/server";
import type { Task, UserProfile } from "@/lib/types";

const requiredString = z.string().trim().min(1);
const taskPrioritySchema = z.enum(["low", "normal", "high"]);

export type SignInState = {
  error?: string;
};

export type PasswordResetRequestState = {
  error?: string;
  success?: string;
};

export type PasswordResetState = {
  error?: string;
  success?: string;
};

export type AccountActionState = {
  error?: string;
  success?: string;
};

type SupabaseMutationClient =
  | Awaited<ReturnType<typeof createSupabaseServerClient>>
  | ReturnType<typeof createSupabaseServiceClient>;

function getPublicAppUrl() {
  const rawUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").trim().replace(/\/$/, "");
  if (!rawUrl) return "http://localhost:3000";
  if (/^https?:\/\//i.test(rawUrl)) return rawUrl;
  return `https://${rawUrl}`;
}

function formatAuthEmailError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.trim();
  const lowered = normalized.toLowerCase();

  if (!normalized || normalized === "{}" || normalized === "[object Object]") {
    return "Email reset gagal dikirim. Cek RESEND_API_KEY dan TASKFLOW_EMAIL_FROM di env.";
  }

  if (lowered.includes("rate limit")) {
    return "Email reset terlalu sering dikirim. Tunggu sebentar sebelum kirim ulang.";
  }

  if (lowered.includes("not authorized")) {
    return "Email tujuan belum diizinkan. Pastikan domain sender Resend sudah verified.";
  }

  if (lowered.includes("redirect")) {
    return "Redirect URL belum valid. Tambahkan /auth/callback di Supabase Auth URL Configuration.";
  }

  return normalized;
}

async function syncTaskStatus(client: SupabaseMutationClient, taskId: number) {
  const { data: taskSubtasks, error: subtaskError } = await client
    .from("subtasks")
    .select("id,is_completed")
    .eq("task_id", taskId);

  if (subtaskError) throw subtaskError;

  const hasSubtasks = (taskSubtasks ?? []).length > 0;
  const allCompleted = hasSubtasks && (taskSubtasks ?? []).every((subtask) => subtask.is_completed);

  const { error: taskError } = await client
    .from("tasks")
    .update({ status: allCompleted ? "completed" : "active" })
    .eq("id", taskId)
    .neq("status", "archived");

  if (taskError) throw taskError;
}

async function getCurrentProfile() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated.");

  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) throw error;
  if ((profile as UserProfile).is_active === false) throw new Error("Account is disabled.");
  return profile as UserProfile;
}

async function requireManager() {
  const profile = await getCurrentProfile();
  if (profile.system_role !== "manager") {
    throw new Error("Only managers can perform this action.");
  }
  return profile;
}

export async function signIn(_state: SignInState, formData: FormData): Promise<SignInState> {
  const emailOrUsername = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!emailOrUsername.trim() || !password.trim()) {
    return { error: "Email dan password wajib diisi." };
  }

  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const demoRole = emailOrUsername.toLowerCase().includes("member") ? "member" : "manager";
    cookieStore.set("taskflow-demo-role", demoRole, { path: "/", sameSite: "lax" });
    redirect("/dashboard");
  }

  const credentials = z.object({
    email: z.string().email(),
    password: z.string().min(1)
  }).safeParse({ email: emailOrUsername, password });

  if (!credentials.success) {
    return { error: "Format email belum valid." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword(credentials.data);

  if (error) {
    return { error: "Email atau password salah." };
  }

  if (data.user) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_active")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile?.is_active === false) {
      await supabase.auth.signOut();
      return { error: "Akun ini sudah dinonaktifkan." };
    }
  }

  redirect("/dashboard");
}

export async function signOut() {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    cookieStore.delete("taskflow-demo-role");
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(
  _state: PasswordResetRequestState,
  formData: FormData
): Promise<PasswordResetRequestState> {
  const emailResult = z.string().email("Format email belum valid.").safeParse(formData.get("email"));

  if (!emailResult.success) {
    return { error: emailResult.error.issues[0]?.message ?? "Email wajib diisi." };
  }

  if (!isSupabaseConfigured()) {
    return { error: "Reset password hanya tersedia saat Supabase aktif." };
  }

  const email = emailResult.data.toLowerCase();
  const appUrl = getPublicAppUrl();
  const service = createSupabaseServiceClient();
  const genericSuccess = "Kalau email ini terdaftar, link reset password akan dikirim ke inbox kamu.";

  try {
    const { data: profile, error: profileError } = await service
      .from("users")
      .select("id,is_active")
      .eq("email", email)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile || profile.is_active === false) return { success: genericSuccess };

    const { data, error } = await service.auth.admin.generateLink({
      type: "recovery",
      email,
      options: {
        redirectTo: `${appUrl}/reset-password`
      }
    });

    if (error) throw error;

    const tokenHash = data.properties?.hashed_token;
    if (!tokenHash) {
      throw new Error("Supabase recovery token tidak tersedia.");
    }

    const resetUrl = `${appUrl}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
    await notifyPasswordReset(email, { resetUrl });
  } catch (error) {
    return { error: formatAuthEmailError(error) };
  }

  return { success: "Link reset password sudah dikirim. Cek inbox email kamu." };
}

export async function updatePasswordFromReset(
  _state: PasswordResetState,
  formData: FormData
): Promise<PasswordResetState> {
  const payload = z.object({
    password: z.string().min(8, "Password minimal 8 karakter."),
    confirm_password: z.string().min(1, "Konfirmasi password wajib diisi.")
  }).refine((value) => value.password === value.confirm_password, {
    path: ["confirm_password"],
    message: "Konfirmasi password tidak sama."
  }).safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password")
  });

  if (!payload.success) {
    return { error: payload.error.issues[0]?.message ?? "Password belum valid." };
  }

  if (!isSupabaseConfigured()) {
    return { success: "Password berhasil diperbarui." };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Link reset password belum valid atau sudah kedaluwarsa." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.is_active === false) {
    await supabase.auth.signOut();
    return { error: "Akun ini sudah dinonaktifkan." };
  }

  const { error } = await supabase.auth.updateUser({
    password: payload.data.password
  });

  if (error) {
    return { error: error.message || "Password gagal diperbarui." };
  }

  await supabase.auth.signOut();
  return { success: "Password berhasil diperbarui. Silakan login ulang." };
}

export async function updateCurrentManagerName(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const nameResult = requiredString.safeParse(formData.get("name"));
  if (!nameResult.success) {
    return { error: "Nama wajib diisi." };
  }

  if (!isSupabaseConfigured()) {
    return { success: "Nama berhasil diperbarui." };
  }

  try {
    const manager = await requireManager();
    const service = createSupabaseServiceClient();

    const { error: profileError } = await service
      .from("users")
      .update({ name: nameResult.data })
      .eq("id", manager.id);

    if (profileError) throw profileError;

    const { error: authError } = await service.auth.admin.updateUserById(manager.id, {
      user_metadata: { name: nameResult.data, system_role: manager.system_role }
    });

    if (authError) throw authError;

    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    revalidatePath("/calendar");
    revalidatePath("/organization");
    revalidatePath("/job-titles");

    return { success: "Nama berhasil diperbarui." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Nama gagal diperbarui." };
  }
}

export async function updateCurrentManagerPassword(_state: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const payload = z.object({
    password: z.string().min(8, "Password minimal 8 karakter."),
    confirm_password: z.string().min(1, "Konfirmasi password wajib diisi.")
  }).refine((value) => value.password === value.confirm_password, {
    path: ["confirm_password"],
    message: "Konfirmasi password tidak sama."
  }).safeParse({
    password: formData.get("password"),
    confirm_password: formData.get("confirm_password")
  });

  if (!payload.success) {
    return { error: payload.error.issues[0]?.message ?? "Password belum valid." };
  }

  if (!isSupabaseConfigured()) {
    return { success: "Password berhasil diperbarui." };
  }

  try {
    const manager = await requireManager();
    const service = createSupabaseServiceClient();
    const { error } = await service.auth.admin.updateUserById(manager.id, {
      password: payload.data.password
    });

    if (error) throw error;

    return { success: "Password berhasil diperbarui." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Password gagal diperbarui." };
  }
}

export async function inviteMember(formData: FormData) {
  const manager = await requireManager();
  const payload = z.object({
    name: requiredString,
    email: z.string().email(),
    password: z.string().min(8).optional(),
    system_role: z.enum(["manager", "member"]).default("member"),
    can_add_subtasks: z.boolean().default(true),
    manager_id: z.string().uuid().nullable(),
    job_title_id: z.coerce.number().int().positive().nullable()
  }).parse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: String(formData.get("password") || "") || undefined,
    system_role: formData.get("system_role") || "member",
    can_add_subtasks: formData.get("can_add_subtasks") === "on",
    manager_id: String(formData.get("manager_id") || manager.id),
    job_title_id: formData.get("job_title_id") || null
  });

  const email = payload.email.toLowerCase();
  const service = createSupabaseServiceClient();
  const { data: existingProfile, error: existingProfileError } = await service
    .from("users")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existingProfileError) throw existingProfileError;

  if (existingProfile) {
    if ((existingProfile as UserProfile).is_active !== false) {
      throw new Error("Email ini sudah terdaftar sebagai user aktif.");
    }

    const authUpdate = {
      email,
      email_confirm: true,
      ban_duration: "none",
      user_metadata: {
        name: payload.name,
        system_role: payload.system_role
      },
      ...(payload.password ? { password: payload.password } : {})
    };

    const { error: authError } = await service.auth.admin.updateUserById(existingProfile.id, authUpdate);
    if (authError) throw authError;

    const { error: profileError } = await service
      .from("users")
      .update({
        email,
        name: payload.name,
        system_role: payload.system_role,
        can_add_subtasks: payload.can_add_subtasks,
        is_active: true,
        manager_id: payload.manager_id,
        job_title_id: payload.job_title_id,
        deleted_at: null,
        deleted_by: null
      })
      .eq("id", existingProfile.id);

    if (profileError) throw profileError;

    revalidatePath("/dashboard");
    revalidatePath("/organization");
    revalidatePath("/tasks");
    revalidatePath("/calendar");
    return;
  }

  const authResult = payload.password
    ? await service.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        name: payload.name,
        system_role: payload.system_role
      }
    })
    : await service.auth.admin.inviteUserByEmail(email, {
      data: {
        name: payload.name,
        system_role: payload.system_role
      }
    });

  if (authResult.error) throw authResult.error;
  if (!authResult.data.user) throw new Error("User creation did not return a user.");

  const { error } = await service.from("users").insert({
    id: authResult.data.user.id,
    email,
    name: payload.name,
    system_role: payload.system_role,
    can_add_subtasks: payload.can_add_subtasks,
    is_active: true,
    manager_id: payload.manager_id,
    job_title_id: payload.job_title_id
  });

  if (error) throw error;
  revalidatePath("/organization");
}

export async function deleteMember(formData: FormData) {
  const manager = await requireManager();
  const id = z.string().uuid().parse(formData.get("id"));

  if (id === manager.id) {
    throw new Error("Managers cannot delete their own account from User Management.");
  }

  const service = createSupabaseServiceClient();

  const { error: subordinateError } = await service
    .from("users")
    .update({ manager_id: null })
    .eq("manager_id", id);
  if (subordinateError) throw subordinateError;

  const { error: profileError } = await service
    .from("users")
    .update({
      is_active: false,
      can_add_subtasks: false,
      manager_id: null,
      deleted_at: new Date().toISOString(),
      deleted_by: manager.id
    })
    .eq("id", id);
  if (profileError) throw profileError;

  const { error: authError } = await service.auth.admin.updateUserById(id, {
    ban_duration: "876000h",
    user_metadata: { disabled: true, disabled_by: manager.id }
  });
  if (authError) throw authError;

  revalidatePath("/dashboard");
  revalidatePath("/organization");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function updateMemberPassword(formData: FormData) {
  const manager = await requireManager();
  const payload = z.object({
    id: z.string().uuid(),
    password: z.string().min(8)
  }).parse({
    id: formData.get("id"),
    password: formData.get("password")
  });

  if (payload.id === manager.id) {
    throw new Error("Use account settings to change your own password.");
  }

  const service = createSupabaseServiceClient();
  const { error } = await service.auth.admin.updateUserById(payload.id, {
    password: payload.password
  });

  if (error) throw error;
  revalidatePath("/organization");
}

export async function updateMemberSubtaskPermission(formData: FormData) {
  const manager = await requireManager();
  const payload = z.object({
    id: z.string().uuid(),
    can_add_subtasks: z.boolean()
  }).parse({
    id: formData.get("id"),
    can_add_subtasks: formData.get("can_add_subtasks") === "on"
  });

  if (payload.id === manager.id) {
    throw new Error("Managers do not need this member permission.");
  }

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("users")
    .update({ can_add_subtasks: payload.can_add_subtasks })
    .eq("id", payload.id);

  if (error) throw error;
  revalidatePath("/organization");
  revalidatePath("/tasks");
}

export async function createJobTitle(formData: FormData) {
  await requireManager();
  const payload = z.object({
    name: requiredString,
    description: z.string().trim().nullable()
  }).parse({
    name: formData.get("name"),
    description: String(formData.get("description") || "").trim() || null
  });

  const service = createSupabaseServiceClient();
  const { error } = await service.from("master_job_titles").insert(payload);

  if (error) throw error;
  revalidatePath("/job-titles");
  revalidatePath("/organization");
}

export async function updateJobTitle(formData: FormData) {
  await requireManager();
  const payload = z.object({
    id: z.coerce.number().int().positive(),
    name: requiredString,
    description: z.string().trim().nullable()
  }).parse({
    id: formData.get("id"),
    name: formData.get("name"),
    description: String(formData.get("description") || "").trim() || null
  });

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("master_job_titles")
    .update({ name: payload.name, description: payload.description })
    .eq("id", payload.id);

  if (error) throw error;
  revalidatePath("/job-titles");
  revalidatePath("/organization");
}

export async function deleteJobTitle(formData: FormData) {
  await requireManager();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const service = createSupabaseServiceClient();
  const { error } = await service.from("master_job_titles").delete().eq("id", id);

  if (error) throw error;
  revalidatePath("/job-titles");
  revalidatePath("/organization");
}

export async function createTask(formData: FormData) {
  const manager = await requireManager();
  const payload = z.object({
    title: requiredString,
    description: z.string().trim().nullable(),
    priority: taskPrioritySchema.default("normal"),
    subtask_titles: z.array(requiredString),
    assigned_to: z.array(z.string().uuid()),
    deadline_dates: z.array(requiredString),
    deadline_times: z.array(requiredString)
  }).parse({
    title: formData.get("title"),
    description: String(formData.get("description") || "").trim() || null,
    priority: formData.get("priority") || "normal",
    subtask_titles: formData.getAll("subtask_title"),
    assigned_to: formData.getAll("assigned_to"),
    deadline_dates: formData.getAll("deadline_date"),
    deadline_times: formData.getAll("deadline_time")
  });

  const service = createSupabaseServiceClient();
  const { data: task, error } = await service
    .from("tasks")
    .insert({
      title: payload.title,
      description: payload.description,
      status: "active",
      priority: payload.priority,
      created_by: manager.id
    })
    .select("*")
    .single();

  if (error) throw error;

  const subtasks = payload.subtask_titles.map((title, index) => ({
    task_id: task.id,
    title,
    assigned_to: payload.assigned_to[index],
    assigned_by: manager.id,
    deadline_date: payload.deadline_dates[index],
    deadline_time: payload.deadline_times[index],
    is_completed: false
  }));

  if (subtasks.length > 0) {
    const { error: subtaskError } = await service.from("subtasks").insert(subtasks);
    if (subtaskError) throw subtaskError;
    await syncTaskStatus(service, task.id);
    await notifyAssignedSubtasks(service, task as Task, subtasks);
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function updateTask(formData: FormData) {
  await requireManager();
  const payload = z.object({
    id: z.coerce.number().int().positive(),
    title: requiredString,
    description: z.string().trim().nullable(),
    status: z.enum(["active", "completed", "archived"]),
    priority: taskPrioritySchema.default("normal")
  }).parse({
    id: formData.get("id"),
    title: formData.get("title"),
    description: String(formData.get("description") || "").trim() || null,
    status: formData.get("status") || "active",
    priority: formData.get("priority") || "normal"
  });

  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("tasks")
    .update({
      title: payload.title,
      description: payload.description,
      status: payload.status,
      priority: payload.priority
    })
    .eq("id", payload.id);

  if (error) throw error;
  revalidatePath("/tasks");
}

export async function updateTaskPriority(formData: FormData) {
  try {
    await requireManager();
    const payload = z.object({
      id: z.coerce.number().int().positive(),
      priority: taskPrioritySchema
    }).parse({
      id: formData.get("id"),
      priority: formData.get("priority")
    });

    const service = createSupabaseServiceClient();
    const { error } = await service
      .from("tasks")
      .update({ priority: payload.priority })
      .eq("id", payload.id);

    if (error) {
      const message = String(error.message ?? "");
      if (message.toLowerCase().includes("priority")) {
        return {
          ok: false,
          error: "Kolom tasks.priority belum ada di Supabase. Jalankan ulang supabase/schema.sql di SQL Editor."
        };
      }

      return {
        ok: false,
        error: message || "Priority gagal diperbarui."
      };
    }

    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    revalidatePath("/calendar");
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Priority gagal diperbarui."
    };
  }
}

export async function archiveTask(formData: FormData) {
  await requireManager();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const service = createSupabaseServiceClient();
  const { error } = await service
    .from("tasks")
    .update({ status: "archived" })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function unarchiveTask(formData: FormData) {
  await requireManager();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const service = createSupabaseServiceClient();

  const { data: taskSubtasks, error: subtaskError } = await service
    .from("subtasks")
    .select("id,is_completed")
    .eq("task_id", id);

  if (subtaskError) throw subtaskError;

  const hasSubtasks = (taskSubtasks ?? []).length > 0;
  const allCompleted = hasSubtasks && (taskSubtasks ?? []).every((subtask) => subtask.is_completed);

  const { error } = await service
    .from("tasks")
    .update({ status: allCompleted ? "completed" : "active" })
    .eq("id", id);

  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function deleteTask(formData: FormData) {
  await requireManager();
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const service = createSupabaseServiceClient();
  const { error } = await service.from("tasks").delete().eq("id", id);

  if (error) throw error;
  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function createSubtask(formData: FormData) {
  const profile = await getCurrentProfile();
  if (profile.system_role === "member" && !profile.can_add_subtasks) {
    throw new Error("Your manager has disabled subtask creation for this account.");
  }

  const payload = z.object({
    task_id: z.coerce.number().int().positive(),
    title: requiredString,
    assigned_to: z.string().uuid(),
    deadline_date: requiredString,
    deadline_time: requiredString
  }).parse({
    task_id: formData.get("task_id"),
    title: formData.get("title"),
    assigned_to: profile.system_role === "manager" ? formData.get("assigned_to") : profile.id,
    deadline_date: formData.get("deadline_date"),
    deadline_time: formData.get("deadline_time")
  });

  const subtaskPayload = { ...payload, assigned_by: profile.id };
  const service = createSupabaseServiceClient();
  const client = profile.system_role === "manager"
    ? service
    : await createSupabaseServerClient();

  const { error } = await client.from("subtasks").insert(subtaskPayload);
  if (error) throw error;

  await syncTaskStatus(service, subtaskPayload.task_id);

  const { data: task, error: taskError } = await service
    .from("tasks")
    .select("*")
    .eq("id", subtaskPayload.task_id)
    .single();

  if (!taskError && task) {
    await notifyAssignedSubtasks(service, task as Task, [subtaskPayload]);
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function updateSubtask(formData: FormData) {
  await requireManager();
  const payload = z.object({
    id: z.coerce.number().int().positive(),
    title: requiredString,
    assigned_to: z.string().uuid(),
    deadline_date: requiredString,
    deadline_time: requiredString,
    is_completed: z.coerce.boolean()
  }).parse({
    id: formData.get("id"),
    title: formData.get("title"),
    assigned_to: formData.get("assigned_to"),
    deadline_date: formData.get("deadline_date"),
    deadline_time: formData.get("deadline_time"),
    is_completed: formData.get("is_completed") === "on"
  });

  const service = createSupabaseServiceClient();
  const { data: currentSubtask, error: currentError } = await service
    .from("subtasks")
    .select("is_completed,completed_at,completion_notes")
    .eq("id", payload.id)
    .single();

  if (currentError) throw currentError;

  const completedAt = payload.is_completed
    ? currentSubtask.completed_at ?? new Date().toISOString()
    : null;

  const { error } = await service
    .from("subtasks")
    .update({
      title: payload.title,
      assigned_to: payload.assigned_to,
      deadline_date: payload.deadline_date,
      deadline_time: payload.deadline_time,
      is_completed: payload.is_completed,
      completed_at: completedAt,
      completion_notes: payload.is_completed ? currentSubtask.completion_notes ?? null : null
    })
    .eq("id", payload.id);

  if (error) throw error;
  const { data: updatedSubtask, error: updatedError } = await service
    .from("subtasks")
    .select("task_id")
    .eq("id", payload.id)
    .single();

  if (updatedError) throw updatedError;
  await syncTaskStatus(service, updatedSubtask.task_id);

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}

export async function markSubtaskComplete(formData: FormData) {
  const id = z.coerce.number().int().positive().parse(formData.get("id"));
  const isCompleted = formData.get("is_completed") === "on" || formData.get("is_completed") === "true";
  const completionNotes = String(formData.get("completion_notes") || "").trim() || null;

  if (!isSupabaseConfigured()) {
    revalidatePath("/dashboard");
    revalidatePath("/tasks");
    return;
  }

  const profile = await getCurrentProfile();
  if (profile.system_role === "member" && !isCompleted) {
    throw new Error("Completed subtasks cannot be reopened by members.");
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("subtasks")
    .update({
      is_completed: isCompleted,
      completed_at: isCompleted ? new Date().toISOString() : null,
      completion_notes: isCompleted ? completionNotes : null
    })
    .eq("id", id)
    .select("task_id,assigned_by")
    .single();

  if (error) throw error;
  const service = createSupabaseServiceClient();
  await syncTaskStatus(service, data.task_id);

  if (profile.system_role === "member" && isCompleted) {
    const [{ data: task }, { data: subtask }] = await Promise.all([
      service.from("tasks").select("*").eq("id", data.task_id).single(),
      service.from("subtasks").select("*").eq("id", id).single()
    ]);

    if (task && subtask) {
      const notificationManagerId = subtask.assigned_by ?? task.created_by;
      await notifyManagersSubtaskCompleted(
        service,
        task as Task,
        {
          title: subtask.title,
          deadline_date: subtask.deadline_date,
          deadline_time: subtask.deadline_time,
          completion_notes: subtask.completion_notes ?? null,
          completed_at: subtask.completed_at ?? null
        },
        { name: profile.name },
        notificationManagerId ? [notificationManagerId] : []
      );
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/tasks");
  revalidatePath("/calendar");
}
