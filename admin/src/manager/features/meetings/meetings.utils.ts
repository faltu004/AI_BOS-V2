import type { Meeting, MeetingFormInput, MeetingStatus } from "./meetings.types";

export function createMeetingFromInput(input: MeetingFormInput): Meeting {
  return {
    ...input,
    id: `meeting-${Date.now()}`,
    status: input.status ?? "Scheduled",
    actionItems: input.actionItems.map((title, index) => ({
      id: `action-${Date.now()}-${index}`,
      title,
      owner: input.organizer,
      dueDate: input.date,
      done: false,
    })),
    attachments: input.attachments.map((name) => ({
      name,
      type: name.split(".").pop()?.toUpperCase() || "File",
      size: "Pending",
    })),
  };
}

export function getMeetingStats(meetings: Meeting[]) {
  const today = "2026-07-18";

  return {
    today: meetings.filter((meeting) => meeting.date === today).length,
    upcoming: meetings.filter((meeting) => meeting.date > today && meeting.status !== "Cancelled").length,
    completed: meetings.filter((meeting) => meeting.status === "Completed").length,
  };
}

export function statusClass(status: MeetingStatus) {
  const classes: Record<MeetingStatus, string> = {
    Scheduled: "bg-primary/10 text-primary",
    "In Progress": "bg-amber-500/10 text-amber-600 dark:text-amber-300",
    Completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    Cancelled: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  };

  return classes[status];
}

export function formatMeetingTime(startTime: string, endTime: string) {
  return `${startTime} - ${endTime}`;
}
