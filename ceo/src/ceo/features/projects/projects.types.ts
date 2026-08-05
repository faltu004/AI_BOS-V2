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

export type ProjectAttachment = {
 name: string;
 type: string;
 size: string;
};

export type Project = {
 id: string;
 projectName: string;
 projectCode: string;
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
 isArchived: boolean;
 createdAt: string;
 updatedAt: string;
};

export type ProjectFormInput = Omit<Project, "id" | "projectCode" | "isArchived" | "createdAt" | "updatedAt"> & {
 projectCode?: string;
};
