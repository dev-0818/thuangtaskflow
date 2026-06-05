import type { SystemRole } from "@/lib/types";

const managerOnlyPrefixes = ["/organization", "/job-titles"];

export function getDefaultRouteForRole(role: SystemRole) {
  return role === "manager" ? "/dashboard" : "/dashboard";
}

export function isManagerOnlyPath(pathname: string) {
  return managerOnlyPrefixes.some((prefix) => pathname.startsWith(prefix));
}

export function canAccessPath(role: SystemRole, pathname: string) {
  if (isManagerOnlyPath(pathname)) return role === "manager";
  return true;
}

export function canMutateTask(role: SystemRole) {
  return role === "manager";
}

export function canMutateOrganization(role: SystemRole) {
  return role === "manager";
}

export function canCompleteSubtask(role: SystemRole, assignedTo: string, userId: string) {
  return role === "manager" || assignedTo === userId;
}
