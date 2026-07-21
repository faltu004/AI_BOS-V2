import type { DocumentFolder, ManagedDocument, PermissionLevel, SupportedFileType } from "./documents.types";

export const supportedFileTypes: SupportedFileType[] = ["PDF", "DOCX", "XLSX", "PPTX", "Image"];
export const permissionLevels: PermissionLevel[] = ["Viewer", "Editor", "Owner"];
export const documentTags = ["Finance", "HR", "Legal", "Sales", "Projects", "Policy", "Report", "Design"];
export const documentUsers = ["Aman Verma", "Sofia Alvarez", "Maya Chen", "Arjun Mehta", "HR Lead"];

export const folders: DocumentFolder[] = [
  { id: "folder-root", name: "Company" },
  { id: "folder-finance", name: "Finance", parentId: "folder-root" },
  { id: "folder-hr", name: "HR", parentId: "folder-root" },
  { id: "folder-projects", name: "Projects", parentId: "folder-root" },
  { id: "folder-sales", name: "Sales", parentId: "folder-root" },
];

export const seedDocuments: ManagedDocument[] = [
  {
    id: "doc-1",
    name: "Q3 Operating Report.pdf",
    type: "PDF",
    folderId: "folder-finance",
    size: "2.4 MB",
    owner: "Aman Verma",
    updatedAt: "2026-07-18",
    tags: ["Finance", "Report"],
    sharedWith: [
      { user: "Arjun Mehta", permission: "Editor" },
      { user: "Maya Chen", permission: "Viewer" },
    ],
    versions: [
      { id: "v-1", version: "v1.2", author: "Aman Verma", date: "2026-07-18", note: "Revenue section updated" },
      { id: "v-2", version: "v1.1", author: "Arjun Mehta", date: "2026-07-17", note: "Expense tables reviewed" },
    ],
    previewText: "Executive summary, monthly revenue, expenses, forecast, and operating risks.",
  },
  {
    id: "doc-2",
    name: "Employee Onboarding Policy.docx",
    type: "DOCX",
    folderId: "folder-hr",
    size: "740 KB",
    owner: "HR Lead",
    updatedAt: "2026-07-16",
    tags: ["HR", "Policy"],
    sharedWith: [{ user: "Aman Verma", permission: "Owner" }],
    versions: [
      { id: "v-3", version: "v2.0", author: "HR Lead", date: "2026-07-16", note: "Security checklist added" },
      { id: "v-4", version: "v1.0", author: "HR Lead", date: "2026-06-20", note: "Initial policy" },
    ],
    previewText: "Onboarding checklist, device setup, account access, HR documents, and company policies.",
  },
  {
    id: "doc-3",
    name: "CRM Import Template.xlsx",
    type: "XLSX",
    folderId: "folder-sales",
    size: "310 KB",
    owner: "Maya Chen",
    updatedAt: "2026-07-15",
    tags: ["Sales", "CRM"],
    sharedWith: [{ user: "Sofia Alvarez", permission: "Viewer" }],
    versions: [{ id: "v-5", version: "v1.3", author: "Maya Chen", date: "2026-07-15", note: "Added owner mapping columns" }],
    previewText: "Customer name, email, company, owner, status, source, and revenue columns.",
  },
  {
    id: "doc-4",
    name: "AI Dashboard Mockups.pptx",
    type: "PPTX",
    folderId: "folder-projects",
    size: "5.8 MB",
    owner: "Sofia Alvarez",
    updatedAt: "2026-07-14",
    tags: ["Projects", "Design"],
    sharedWith: [
      { user: "Aman Verma", permission: "Editor" },
      { user: "Noah Brooks", permission: "Viewer" },
    ],
    versions: [{ id: "v-6", version: "v0.9", author: "Sofia Alvarez", date: "2026-07-14", note: "Leadership review deck" }],
    previewText: "Dashboard layouts, module navigation, AI assistant panel, and analytics screens.",
  },
  {
    id: "doc-5",
    name: "Finance Workflow Map.png",
    type: "Image",
    folderId: "folder-projects",
    size: "980 KB",
    owner: "Arjun Mehta",
    updatedAt: "2026-07-13",
    tags: ["Finance", "Projects"],
    sharedWith: [{ user: "Aman Verma", permission: "Viewer" }],
    versions: [{ id: "v-7", version: "v1.0", author: "Arjun Mehta", date: "2026-07-13", note: "Workflow diagram exported" }],
    previewText: "Visual map of invoice approval, tax review, payment release, and audit logging.",
  },
];
