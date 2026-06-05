import { TaskBoard } from "@/components/tasks/task-board";
import { getWorkspaceData } from "@/lib/data-source";

export default async function TasksPage() {
  const data = await getWorkspaceData();

  return (
    <TaskBoard
      currentUser={data.currentUser}
      tasks={data.tasks}
      subtasks={data.subtasks}
      users={data.users}
    />
  );
}
