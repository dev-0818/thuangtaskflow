import { differenceInCalendarDays, format, isBefore, parseISO } from "date-fns";
import type { DueState, Subtask } from "@/lib/types";

export function getDeadlineAt(subtask: Pick<Subtask, "deadline_date" | "deadline_time">) {
  const time = subtask.deadline_time.length === 5 ? `${subtask.deadline_time}:00` : subtask.deadline_time;
  return parseISO(`${subtask.deadline_date}T${time}`);
}

export function getDaysUntilDeadline(
  subtask: Pick<Subtask, "deadline_date" | "deadline_time">,
  now = new Date()
) {
  return differenceInCalendarDays(getDeadlineAt(subtask), now);
}

export function getDueState(
  subtask: Pick<Subtask, "deadline_date" | "deadline_time" | "is_completed">,
  now = new Date()
): DueState {
  if (subtask.is_completed) return "completed";

  const deadline = getDeadlineAt(subtask);
  if (isBefore(deadline, now)) return "overdue";

  const daysUntil = differenceInCalendarDays(deadline, now);
  if (daysUntil === 0) return "today";
  if (daysUntil <= 3) return "soon";
  return "upcoming";
}

export function getDueLabel(
  subtask: Pick<Subtask, "deadline_date" | "deadline_time" | "is_completed">,
  now = new Date()
) {
  const state = getDueState(subtask, now);
  const daysUntil = getDaysUntilDeadline(subtask, now);

  if (state === "completed") return "Completed";
  if (state === "overdue") return daysUntil === -1 ? "Overdue 1 day" : `Overdue ${Math.abs(daysUntil)} days`;
  if (state === "today") return "Due Today";
  if (daysUntil === 1) return "Due Tomorrow";
  if (state === "soon") return `Due in ${daysUntil} days`;
  return format(getDeadlineAt(subtask), "MMM d");
}

export function isDueWithinH3(
  subtask: Pick<Subtask, "deadline_date" | "deadline_time" | "is_completed">,
  now = new Date()
) {
  const state = getDueState(subtask, now);
  return state === "today" || state === "soon";
}
