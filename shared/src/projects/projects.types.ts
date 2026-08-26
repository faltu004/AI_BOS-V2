import type { ProjectAttachment } from "@shared/projects/projects.api";

export type { ProjectAttachment };

export type ProjectPriority = "Low" | "Medium" | "High" | "Critical";
export type ProjectStatus = "Planning" | "Active" | "On Hold" | "Completed" | "Delayed" | "Archived";
export type ProjectView = "grid" | "list" | "kanban" | "calendar";
export type ProjectDetailTab =
 | "overview"
 | "timeline"
 | "tasks"
 | "team"
 | "documents"
 | "activity"
 | "budget"
 | "settings";

export type ProjectFormInput = {
 projectName: string;
 description: string;
 category: string;
 priority: ProjectPriority;
 status: ProjectStatus;
 progress: number;
 startDate: string;
 endDate: string;
 budget: number;
 estimatedHours: number;
 client: string;
 teamMembers: string[];
 projectManager: string;
 attachments: ProjectAttachment[];
 notes: string;
 tags: string[];
};
