import { describe, expect, it } from "vitest";
import { canAccessPath, canCompleteSubtask, canMutateOrganization, canMutateTask } from "@/lib/authorization";

describe("authorization helpers", () => {
  it("allows managers to access manager-only routes", () => {
    expect(canAccessPath("manager", "/organization")).toBe(true);
    expect(canAccessPath("manager", "/job-titles")).toBe(true);
  });

  it("blocks members from manager-only routes", () => {
    expect(canAccessPath("member", "/organization")).toBe(false);
    expect(canAccessPath("member", "/job-titles")).toBe(false);
  });

  it("allows shared routes for members", () => {
    expect(canAccessPath("member", "/dashboard")).toBe(true);
    expect(canAccessPath("member", "/tasks")).toBe(true);
    expect(canAccessPath("member", "/calendar")).toBe(true);
  });

  it("restricts organization and task mutations to managers", () => {
    expect(canMutateOrganization("manager")).toBe(true);
    expect(canMutateOrganization("member")).toBe(false);
    expect(canMutateTask("manager")).toBe(true);
    expect(canMutateTask("member")).toBe(false);
  });

  it("allows members to complete only assigned subtasks", () => {
    expect(canCompleteSubtask("member", "user-1", "user-1")).toBe(true);
    expect(canCompleteSubtask("member", "user-2", "user-1")).toBe(false);
    expect(canCompleteSubtask("manager", "user-2", "user-1")).toBe(true);
  });
});
