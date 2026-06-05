import { OrganizationView } from "@/components/organization/organization-view";
import { ForbiddenPanel } from "@/components/ui/forbidden-panel";
import { getWorkspaceData } from "@/lib/data-source";

export default async function OrganizationPage() {
  const data = await getWorkspaceData();

  if (data.currentUser.system_role !== "manager") {
    return <ForbiddenPanel />;
  }

  return <OrganizationView currentUser={data.currentUser} users={data.users} jobTitles={data.jobTitles} />;
}
