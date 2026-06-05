import { JobTitlesView } from "@/components/job-titles/job-titles-view";
import { ForbiddenPanel } from "@/components/ui/forbidden-panel";
import { getWorkspaceData } from "@/lib/data-source";

export default async function JobTitlesPage() {
  const data = await getWorkspaceData();

  if (data.currentUser.system_role !== "manager") {
    return <ForbiddenPanel />;
  }

  return <JobTitlesView jobTitles={data.jobTitles} users={data.users} />;
}
