export type MeetingStatus = "Scheduled" | "In Progress" | "Completed" | "Cancelled";
export type MeetingType = "Internal" | "Client" | "Sales" | "Project" | "Leadership";

export type ActionItem = {
  id: string;
  title: string;
  owner: string;
  dueDate: string;
  done: boolean;
};

export type MeetingAttachment = {
  name: string;
  type: string;
  size: string;
};

export type Meeting = {
  id: string;
  title: string;
  type: MeetingType;
  date: string;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  organizer: string;
  participants: string[];
  agenda: string[];
  notes: string;
  actionItems: ActionItem[];
  attachments: MeetingAttachment[];
  zoomLink: string;
  googleMeetLink: string;
};

export type MeetingFormInput = Omit<Meeting, "id" | "status" | "actionItems" | "attachments"> & {
  status?: MeetingStatus;
  actionItems: string[];
  attachments: string[];
};
