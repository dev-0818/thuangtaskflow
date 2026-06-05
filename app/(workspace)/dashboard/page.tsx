import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { MemberDashboard } from "@/components/dashboard/member-dashboard";
import { getWorkspaceData } from "@/lib/data-source";

export default async function DashboardPage() {
  const data = await getWorkspaceData();

  if (data.currentUser.system_role === "member") {
    return (
      <MemberDashboard
        currentUser={data.currentUser}
        tasks={data.tasks}
        subtasks={data.subtasks}
        users={data.users}
      />
    );
  }

  return <ManagerDashboard tasks={data.tasks} subtasks={data.subtasks} users={data.users} />;
}
