import type { ManagedDocument, SupportedFileType } from "./documents.types";

export function getFileTypeFromName(name: string): SupportedFileType {
  const extension = name.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "PDF";
  if (extension === "docx" || extension === "doc") return "DOCX";
  if (extension === "xlsx" || extension === "xls") return "XLSX";
  if (extension === "pptx" || extension === "ppt") return "PPTX";
  return "Image";
}

export function createDocumentFromFile(file: File, folderId: string, owner: string): ManagedDocument {
  const now = new Date().toISOString().slice(0, 10);

  return {
    id: `doc-${Date.now()}`,
    name: file.name,
    type: getFileTypeFromName(file.name),
    folderId,
    size: formatBytes(file.size),
    owner,
    updatedAt: now,
    tags: ["Uploaded"],
    sharedWith: [],
    versions: [{ id: `version-${Date.now()}`, version: "v1.0", author: owner, date: now, note: "Initial upload" }],
    previewText: `${file.name} uploaded to AI BOS document workspace.`,
  };
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function downloadDocument(document: ManagedDocument) {
  const content = [
    `AI BOS Document: ${document.name}`,
    `Type: ${document.type}`,
    `Owner: ${document.owner}`,
    `Updated: ${document.updatedAt}`,
    "",
    document.previewText,
  ].join("\n");
  const blob = new Blob([content], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = document.name;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function getDocumentStats(documents: ManagedDocument[]) {
  return {
    total: documents.length,
    shared: documents.filter((document) => document.sharedWith.length > 0).length,
    versions: documents.reduce((sum, document) => sum + document.versions.length, 0),
    storage: documents.length * 2.1,
  };
}
