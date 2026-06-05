import { CalendarBoard } from "@/components/calendar/calendar-board";
import { getWorkspaceData } from "@/lib/data-source";

export default async function CalendarPage() {
  const data = await getWorkspaceData();

  return (
    <CalendarBoard
      currentUser={data.currentUser}
      tasks={data.tasks}
      subtasks={data.subtasks}
      users={data.users}
    />
  );
}
