import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

test("project schema exposes production list/query indexes", async () => {
  const { ProjectModel } = await import("../../backend/src/models/project.model.ts");
  const indexes = ProjectModel.schema.indexes().map(([fields]) => fields);

  assert.ok(indexes.some((index) => index.isArchived === 1 && index.createdAt === -1));
  assert.ok(indexes.some((index) => index.isArchived === 1 && index.status === 1 && index.createdAt === -1));
  assert.ok(indexes.some((index) => index.projectName === "text"));
});

test("project schema validates required fields without a database connection", async () => {
  const { ProjectModel } = await import("../../backend/src/models/project.model.ts");

  const project = new ProjectModel({
    projectCode: "PRJ-1",
    category: "Internal",
    priority: "High",
    status: "Planning",
    startDate: new Date("2026-08-01"),
    endDate: new Date("2026-08-10"),
    projectManager: "Aman",
  });

  const error = project.validateSync();
  assert.ok(error?.errors.projectName);
});
