"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { AlertTriangle, Archive, CalendarDays, CheckCircle2, Plus, X } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { GlassPanel } from "@/components/ui/glass-panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { getDueLabel, getDueState } from "@/lib/date-status";
import type { Subtask, Task, UserProfile } from "@/lib/types";

type CalendarBoardProps = {
  currentUser: UserProfile;
  tasks: Task[];
  subtasks: Subtask[];
  users: UserProfile[];
};

type CalendarItem = Subtask & {
  task: Task;
  assignee: UserProfile | null;
  dueLabel: string;
  dueState: ReturnType<typeof getDueState>;
};

function getEventColors(item: CalendarItem) {
  if (item.task.status === "archived") {
    return {
      backgroundColor: "rgba(201, 197, 199, 0.1)",
      borderColor: "rgba(201, 197, 199, 0.42)",
      textColor: "#c9c5c7"
    };
  }

  if (item.is_completed) {
    return {
      backgroundColor: "rgba(74, 222, 128, 0.16)",
      borderColor: "rgba(134, 239, 172, 0.72)",
      textColor: "#bbf7d0"
    };
  }

  if (item.dueState === "overdue") {
    return {
      backgroundColor: "rgba(255, 180, 171, 0.14)",
      borderColor: "rgba(255, 180, 171, 0.7)",
      textColor: "#ffdad6"
    };
  }

  if (item.dueState === "today" || item.dueState === "soon") {
    return {
      backgroundColor: "rgba(174, 140, 104, 0.28)",
      borderColor: "rgba(230, 192, 152, 0.85)",
      textColor: "#e5e2e1"
    };
  }

  return {
    backgroundColor: "rgba(72, 70, 72, 0.72)",
    borderColor: "rgba(201, 197, 199, 0.28)",
    textColor: "#e5e2e1"
  };
}

function getDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getHourKey(date: Date) {
  return String(date.getHours()).padStart(2, "0");
}

function getItemHour(item: Pick<Subtask, "deadline_time">) {
  return item.deadline_time.slice(0, 2).padStart(2, "0");
}

export function CalendarBoard({ currentUser, tasks, subtasks, users }: CalendarBoardProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedHour, setSelectedHour] = useState<string | null>(null);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const items = useMemo<CalendarItem[]>(() => {
    return subtasks
      .map((subtask) => {
        const task = tasks.find((candidate) => candidate.id === subtask.task_id);
        if (!task) return null;
        const dueState = getDueState(subtask);

        return {
          ...subtask,
          task,
          assignee: users.find((user) => user.id === subtask.assigned_to) ?? null,
          dueLabel: getDueLabel(subtask),
          dueState
        };
      })
      .filter((item): item is CalendarItem => Boolean(item));
  }, [subtasks, tasks, users]);

  const selectedItems = items.filter((item) => {
    if (item.deadline_date !== selectedDate) return false;
    if (!selectedHour) return true;
    return getItemHour(item) === selectedHour;
  });
  const selectedDateLabel = new Date(`${selectedDate}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric"
  });
  const selectedWindowLabel = selectedHour ? `${selectedHour}:00` : null;
  const eventSources = items.map((item) => ({
    id: String(item.id),
    title: item.title,
    start: `${item.deadline_date}T${item.deadline_time}`,
    ...getEventColors(item),
    extendedProps: {
      taskTitle: item.task.title,
      dueState: item.dueState,
      taskStatus: item.task.status,
      isCompleted: item.is_completed
    }
  }));

  return (
    <div className="mx-auto max-w-container">
      <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-headline-lg-mobile font-semibold text-on-surface md:text-headline-lg">Calendar</h1>
          <p className="mt-2 text-body-md font-semibold text-on-surface-variant">
            {items.length} tasks due, {items.filter((item) => item.dueState === "today" || item.dueState === "soon").length} urgent.
          </p>
        </div>
        {currentUser.system_role === "manager" ? (
          <Link href="/tasks" className="bronze-button inline-flex items-center justify-center gap-2 px-5 py-3 text-label-md">
            <Plus className="h-4 w-4" />
            New Task
          </Link>
        ) : null}
      </header>

      <section className="grid grid-cols-1 gap-gutter lg:grid-cols-[1fr_360px]">
        <GlassPanel className="overflow-hidden p-3 md:p-5">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek"
            }}
            height={mobile ? "auto" : 720}
            events={eventSources}
            allDaySlot={false}
            dayCellClassNames={(info) => (getDateKey(info.date) === selectedDate ? ["taskflow-selected-day"] : [])}
            dayHeaderClassNames={(info) => (getDateKey(info.date) === selectedDate ? ["taskflow-selected-day-header"] : [])}
            eventClick={(info) => {
              const start = info.event.start;
              if (!start) return;

              setSelectedDate(getDateKey(start));
              setSelectedHour(info.view.type.startsWith("timeGrid") ? getHourKey(start) : null);
            }}
            dateClick={(info) => {
              setSelectedDate(getDateKey(info.date));
              setSelectedHour(info.view.type.startsWith("timeGrid") && !info.allDay ? getHourKey(info.date) : null);
            }}
            eventContent={(info) => {
              const taskStatus = info.event.extendedProps.taskStatus as Task["status"] | undefined;
              const isCompleted = Boolean(info.event.extendedProps.isCompleted);
              const isArchived = taskStatus === "archived";

              return (
                <div className="flex min-w-0 items-center gap-1.5 px-1 py-0.5 text-label-sm font-semibold">
                  {isArchived ? <Archive className="h-3.5 w-3.5 shrink-0" /> : null}
                  {isCompleted ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-200" /> : null}
                  <span className="truncate">{info.event.title}</span>
                </div>
              );
            }}
            nowIndicator
          />
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-headline-md font-semibold text-on-surface">
                {selectedDateLabel}
              </h2>
              <p className="text-label-md font-semibold text-primary">
                {selectedItems.length} {selectedHour ? "tasks this hour" : "tasks total"}
              </p>
              {selectedWindowLabel ? (
                <p className="mt-1 text-label-sm font-semibold text-on-surface-variant">{selectedWindowLabel}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedDate(new Date().toISOString().slice(0, 10));
                setSelectedHour(null);
              }}
              className="rounded p-2 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
              aria-label="Reset selected date"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {selectedItems.length ? (
              selectedItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-secondary/15 bg-surface-container-lowest p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-body-md font-semibold text-on-surface">{item.title}</h3>
                    {item.is_completed ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-green-300" />
                    ) : item.task.status === "archived" ? (
                      <Archive className="h-5 w-5 shrink-0 text-on-surface-variant" />
                    ) : item.dueState === "overdue" || item.dueState === "today" || item.dueState === "soon" ? (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-primary" />
                    ) : null}
                  </div>
                  <p className="text-label-md text-on-surface-variant">{item.task.title}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    {item.assignee ? <Avatar name={item.assignee.name} className="h-8 w-8 text-label-sm" /> : null}
                    {item.task.status === "archived" ? <StatusBadge label="Archived" tone="archived" /> : null}
                    <StatusBadge label={item.dueLabel} tone={item.dueState} />
                    <span className="inline-flex items-center gap-2 text-label-sm font-semibold text-on-surface-variant">
                      <CalendarDays className="h-4 w-4" />
                      {item.deadline_time.slice(0, 5)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-secondary/10 bg-surface-container-lowest p-6 text-center text-body-md text-on-surface-variant">
                {selectedHour ? "No tasks on this hour." : "No tasks on this date."}
              </div>
            )}
          </div>
        </GlassPanel>
      </section>
    </div>
  );
}
