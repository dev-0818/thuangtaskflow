import { describe, expect, it } from "vitest";
import { getDueLabel, getDueState, isDueWithinH3 } from "@/lib/date-status";
import type { Subtask } from "@/lib/types";

function subtask(overrides: Partial<Subtask>): Subtask {
  return {
    id: 1,
    task_id: 1,
    title: "Test",
    assigned_to: "user-1",
    deadline_date: "2026-06-03",
    deadline_time: "12:00:00",
    is_completed: false,
    created_at: "2026-06-01T00:00:00.000Z",
    ...overrides
  };
}

describe("deadline status", () => {
  const now = new Date("2026-06-03T08:00:00.000Z");

  it("excludes completed subtasks from warning states", () => {
    const item = subtask({ is_completed: true, deadline_date: "2026-06-01" });

    expect(getDueState(item, now)).toBe("completed");
    expect(isDueWithinH3(item, now)).toBe(false);
  });

  it("marks overdue when deadline time has passed", () => {
    const item = subtask({ deadline_date: "2026-06-02", deadline_time: "17:00:00" });

    expect(getDueState(item, now)).toBe("overdue");
    expect(getDueLabel(item, now)).toContain("Overdue");
  });

  it("marks due today", () => {
    const item = subtask({ deadline_date: "2026-06-03", deadline_time: "17:00:00" });

    expect(getDueState(item, now)).toBe("today");
    expect(getDueLabel(item, now)).toBe("Due Today");
  });

  it("marks incomplete subtasks due within three days as H-3", () => {
    const item = subtask({ deadline_date: "2026-06-06", deadline_time: "17:00:00" });

    expect(getDueState(item, now)).toBe("soon");
    expect(isDueWithinH3(item, now)).toBe(true);
  });

  it("keeps later deadlines as upcoming", () => {
    const item = subtask({ deadline_date: "2026-06-08", deadline_time: "17:00:00" });

    expect(getDueState(item, now)).toBe("upcoming");
    expect(isDueWithinH3(item, now)).toBe(false);
  });
});
