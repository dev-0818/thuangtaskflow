import "server-only";

import type { Task } from "@/lib/types";

const APP_NAME = "Thuang Tasks";

type AssignedSubtaskNotification = {
  title: string;
  assigned_to: string;
  deadline_date: string;
  deadline_time: string;
};

type CompletedSubtaskNotification = {
  title: string;
  deadline_date: string;
  deadline_time: string;
  completion_notes: string | null;
  completed_at: string | null;
};

type PasswordResetNotification = {
  resetUrl: string;
};

type AssigneeProfile = {
  id: string;
  name: string;
  email: string | null;
  system_role?: string | null;
  is_active?: boolean | null;
};

type NotificationClient = {
  from(table: "users"): {
    select(columns: string): {
      in(column: string, values: string[]): PromiseLike<{ data: AssigneeProfile[] | null; error: { message?: string } | null }>;
    };
  };
};

function getNotificationConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.TASKFLOW_EMAIL_FROM;

  if (!apiKey || !from) return null;
  return { apiKey, from };
}

function formatDeadline(subtask: Pick<AssignedSubtaskNotification, "deadline_date" | "deadline_time">) {
  return `${subtask.deadline_date} ${subtask.deadline_time.slice(0, 5)}`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createEmailText(task: Task, assigneeName: string, subtasks: AssignedSubtaskNotification[]) {
  const lines = subtasks.map((subtask) => `- ${subtask.title} | Deadline: ${formatDeadline(subtask)}`);

  return [
    `Hi ${assigneeName},`,
    "",
    `You have ${subtasks.length === 1 ? "a new subtask" : "new subtasks"} assigned in ${APP_NAME}.`,
    "",
    `Task: ${task.title}`,
    ...lines,
    "",
    `Open ${APP_NAME}: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/tasks`
  ].join("\n");
}

function createEmailHtml(task: Task, assigneeName: string, subtasks: AssignedSubtaskNotification[]) {
  const rows = subtasks
    .map(
      (subtask) => `
        <tr>
          <td style="padding:12px;border-top:1px solid #eee;">${escapeHtml(subtask.title)}</td>
          <td style="padding:12px;border-top:1px solid #eee;white-space:nowrap;">${formatDeadline(subtask)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#201f1f;line-height:1.5;">
      <p>Hi ${escapeHtml(assigneeName)},</p>
      <p>You have ${subtasks.length === 1 ? "a new subtask" : "new subtasks"} assigned in ${APP_NAME}.</p>
      <p><strong>Task:</strong> ${escapeHtml(task.title)}</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;border:1px solid #eee;">
        <thead>
          <tr>
            <th align="left" style="padding:12px;background:#f6f3ef;">Subtask</th>
            <th align="left" style="padding:12px;background:#f6f3ef;">Deadline</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/tasks" style="color:#7a5733;font-weight:700;">Open ${APP_NAME}</a>
      </p>
    </div>
  `;
}

function createCompletionEmailText(
  task: Task,
  managerName: string,
  memberName: string,
  subtask: CompletedSubtaskNotification
) {
  return [
    `Hi ${managerName},`,
    "",
    `${memberName} completed a subtask in ${APP_NAME}.`,
    "",
    `Task: ${task.title}`,
    `Subtask: ${subtask.title}`,
    `Deadline: ${formatDeadline(subtask)}`,
    subtask.completed_at ? `Completed at: ${new Date(subtask.completed_at).toLocaleString()}` : null,
    subtask.completion_notes ? `Notes: ${subtask.completion_notes}` : null,
    "",
    `Open ${APP_NAME}: ${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/tasks`
  ].filter(Boolean).join("\n");
}

function createCompletionEmailHtml(
  task: Task,
  managerName: string,
  memberName: string,
  subtask: CompletedSubtaskNotification
) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#201f1f;line-height:1.5;">
      <p>Hi ${escapeHtml(managerName)},</p>
      <p><strong>${escapeHtml(memberName)}</strong> completed a subtask in ${APP_NAME}.</p>
      <table style="border-collapse:collapse;width:100%;max-width:640px;border:1px solid #eee;">
        <tbody>
          <tr>
            <th align="left" style="padding:12px;background:#f6f3ef;width:140px;">Task</th>
            <td style="padding:12px;">${escapeHtml(task.title)}</td>
          </tr>
          <tr>
            <th align="left" style="padding:12px;background:#f6f3ef;border-top:1px solid #eee;">Subtask</th>
            <td style="padding:12px;border-top:1px solid #eee;">${escapeHtml(subtask.title)}</td>
          </tr>
          <tr>
            <th align="left" style="padding:12px;background:#f6f3ef;border-top:1px solid #eee;">Deadline</th>
            <td style="padding:12px;border-top:1px solid #eee;">${formatDeadline(subtask)}</td>
          </tr>
          ${subtask.completed_at ? `
          <tr>
            <th align="left" style="padding:12px;background:#f6f3ef;border-top:1px solid #eee;">Completed</th>
            <td style="padding:12px;border-top:1px solid #eee;">${escapeHtml(new Date(subtask.completed_at).toLocaleString())}</td>
          </tr>` : ""}
          ${subtask.completion_notes ? `
          <tr>
            <th align="left" style="padding:12px;background:#f6f3ef;border-top:1px solid #eee;">Notes</th>
            <td style="padding:12px;border-top:1px solid #eee;">${escapeHtml(subtask.completion_notes)}</td>
          </tr>` : ""}
        </tbody>
      </table>
      <p style="margin-top:20px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/tasks" style="color:#7a5733;font-weight:700;">Open ${APP_NAME}</a>
      </p>
    </div>
  `;
}

function createPasswordResetText(notification: PasswordResetNotification) {
  return [
    "Hi,",
    "",
    `Use this link to reset your ${APP_NAME} password:`,
    notification.resetUrl,
    "",
    "If you did not request this, you can ignore this email."
  ].join("\n");
}

function createPasswordResetHtml(notification: PasswordResetNotification) {
  const resetUrl = escapeHtml(notification.resetUrl);

  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#201f1f;line-height:1.5;">
      <p>Hi,</p>
      <p>Use the button below to reset your ${APP_NAME} password.</p>
      <p style="margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;border-radius:8px;background:#ae8c68;color:#2b1701;padding:12px 18px;text-decoration:none;font-weight:700;">Reset Password</a>
      </p>
      <p style="color:#666;font-size:14px;">If you did not request this, you can ignore this email.</p>
    </div>
  `;
}

async function sendEmail(to: string, subject: string, text: string, html: string) {
  const config = getNotificationConfig();
  if (!config) return;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: config.from,
      to,
      subject,
      text,
      html
    })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Email notification failed: ${message}`);
  }
}

export async function notifyPasswordReset(to: string, notification: PasswordResetNotification) {
  if (!getNotificationConfig()) {
    throw new Error("RESEND_API_KEY atau TASKFLOW_EMAIL_FROM belum diisi.");
  }

  await sendEmail(
    to,
    `Reset your ${APP_NAME} password`,
    createPasswordResetText(notification),
    createPasswordResetHtml(notification)
  );
}

export async function notifyAssignedSubtasks(
  client: unknown,
  task: Task,
  subtasks: AssignedSubtaskNotification[]
) {
  if (!getNotificationConfig() || subtasks.length === 0) return;

  const notificationClient = client as NotificationClient;
  const assigneeIds = [...new Set(subtasks.map((subtask) => subtask.assigned_to))];
  const { data: assignees, error } = await notificationClient
    .from("users")
    .select("id,name,email,is_active")
    .in("id", assigneeIds);

  if (error) {
    console.error(error.message ?? "Failed to load assignees for email notifications.");
    return;
  }

  const assigneeMap = new Map((assignees ?? []).map((assignee) => [assignee.id, assignee]));

  await Promise.all(
    assigneeIds.map(async (assigneeId) => {
      const assignee = assigneeMap.get(assigneeId);
      if (!assignee?.email || assignee.is_active === false) return;

      const assignedSubtasks = subtasks.filter((subtask) => subtask.assigned_to === assigneeId);
      const subject = assignedSubtasks.length === 1
        ? `New subtask assigned: ${assignedSubtasks[0].title}`
        : `${assignedSubtasks.length} new subtasks assigned`;

      try {
        await sendEmail(
          assignee.email,
          subject,
          createEmailText(task, assignee.name, assignedSubtasks),
          createEmailHtml(task, assignee.name, assignedSubtasks)
        );
      } catch (error) {
        console.error(error instanceof Error ? error.message : "Email notification failed.");
      }
    })
  );
}

export async function notifyManagersSubtaskCompleted(
  client: unknown,
  task: Task,
  subtask: CompletedSubtaskNotification,
  completedBy: { name: string },
  managerIds: string[]
) {
  if (!getNotificationConfig() || managerIds.length === 0) return;

  const notificationClient = client as NotificationClient;
  const uniqueManagerIds = [...new Set(managerIds)];
  const { data: managers, error } = await notificationClient
    .from("users")
    .select("id,name,email,system_role,is_active")
    .in("id", uniqueManagerIds);

  if (error) {
    console.error(error.message ?? "Failed to load managers for completion email notifications.");
    return;
  }

  await Promise.all(
    (managers ?? []).map(async (manager) => {
      if (!manager.email || manager.system_role !== "manager" || manager.is_active === false) return;

      try {
        await sendEmail(
          manager.email,
          `Subtask completed: ${subtask.title}`,
          createCompletionEmailText(task, manager.name, completedBy.name, subtask),
          createCompletionEmailHtml(task, manager.name, completedBy.name, subtask)
        );
      } catch (error) {
        console.error(error instanceof Error ? error.message : "Completion email notification failed.");
      }
    })
  );
}
