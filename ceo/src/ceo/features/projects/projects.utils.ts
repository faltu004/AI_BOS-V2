import type { Project, ProjectFormInput } from "./projects.types";

export function generateProjectCode(projects: Project[]) {
 const year = new Date().getFullYear();
 return `PRJ-${year}-${String(projects.length + 1).padStart(4, "0")}`;
}

export function createProjectFromInput(input: ProjectFormInput, projects: Project[]): Project {
 const now = new Date().toISOString().slice(0, 10);

 return {
 ...input,
 id: crypto.randomUUID(),
 projectCode: input.projectCode || generateProjectCode(projects),
 isArchived: input.status === "Archived",
 createdAt: now,
 updatedAt: now,
 };
}

export function exportProjectsCsv(projects: Project[]) {
 const columns: Array<keyof Project> = [
 "projectCode",
 "projectName",
 "status",
 "priority",
 "progress",
 "budget",
 "startDate",
 "endDate",
 "client",
 "projectManager",
 ];
 const rows = projects.map((project) =>
 columns
 .map((column) => `"${String(project[column] ?? "").replace(/"/g, '""')}"`)
 .join(","),
 );
 return [columns.join(","), ...rows].join("\n");
}

export function downloadFile(content: string, filename: string, type: string) {
 const blob = new Blob([content], { type });
 const url = URL.createObjectURL(blob);
 const link = document.createElement("a");
 link.href = url;
 link.download = filename;
 link.click();
 URL.revokeObjectURL(url);
}
