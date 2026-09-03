import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";
import { installStorageMocks } from "../helpers/storage.ts";

configureBackendTestEnv();
installStorageMocks();

if (typeof (globalThis as any).window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      caches: { delete: async () => true },
      dispatchEvent: () => true,
      localStorage,
      sessionStorage,
    },
  });
}

test("Hotfix A & B: Normal Task Create & legitimate null values in createTaskSchema", async () => {
  const { createTaskSchema } = await import("../../backend/src/validation/task.validation.ts");

  // A: Normal task create with status Todo, progress 0, blockedReason null
  const normalResult = createTaskSchema.safeParse({
    title: "Normal Task Title",
    description: "Some description",
    issueType: "Task",
    status: "Todo",
    progress: 0,
    blockedReason: null,
    priority: "Medium",
    labels: ["backend"],
    estimatedHours: 4,
    checklist: [{ title: "Check item", done: false }],
    attachments: [],
    recurring: false,
    recurrence: "None",
  });
  assert.equal(normalResult.success, true);
  if (normalResult.success) {
    assert.equal(normalResult.data.title, "Normal Task Title");
    assert.equal(normalResult.data.status, "Todo");
    assert.equal(normalResult.data.blockedReason, null);
  }

  // B: Legitimate null optional fields accepted and parsed to undefined (NOT Date(0))
  const nullsResult = createTaskSchema.safeParse({
    title: "Task with all optional nulls",
    description: null,
    projectId: null,
    epicId: null,
    sprintId: null,
    parentTaskId: null,
    backlogRank: null,
    assigneeId: null,
    reporterId: null,
    dueDate: null,
    startDate: "",
    blockedReason: null,
    status: "Todo",
    priority: "Low",
    labels: [],
  });
  assert.equal(nullsResult.success, true);
  if (nullsResult.success) {
    assert.equal(nullsResult.data.dueDate, undefined);
    assert.equal(nullsResult.data.startDate, undefined);
    assert.notEqual(nullsResult.data.dueDate instanceof Date, true);
    assert.notEqual(nullsResult.data.startDate instanceof Date, true);
  }

  // Valid ISO date parsed to Date
  const validDateResult = createTaskSchema.safeParse({
    title: "Task with valid dates",
    status: "Todo",
    dueDate: "2026-09-15T10:00:00.000Z",
    startDate: "2026-09-03",
  });
  assert.equal(validDateResult.success, true);
  if (validDateResult.success) {
    assert.equal(validDateResult.data.dueDate instanceof Date, true);
    assert.equal(validDateResult.data.dueDate?.toISOString(), "2026-09-15T10:00:00.000Z");
    assert.equal(validDateResult.data.startDate instanceof Date, true);
  }

  // Invalid non-empty string rejected
  const invalidDueDateResult = createTaskSchema.safeParse({
    title: "Task with invalid dueDate",
    status: "Todo",
    dueDate: "not-a-valid-date",
  });
  assert.equal(invalidDueDateResult.success, false);

  const invalidStartDateResult = createTaskSchema.safeParse({
    title: "Task with invalid startDate",
    status: "Todo",
    startDate: "garbage-date-value",
  });
  assert.equal(invalidStartDateResult.success, false);
});

test("Hotfix C & D: Blocked reason validation rules", async () => {
  const { createTaskSchema } = await import("../../backend/src/validation/task.validation.ts");

  // C: Blocked without reason rejected
  const blockedWithoutReason = createTaskSchema.safeParse({
    title: "Blocked Task",
    status: "Blocked",
    blockedReason: null,
  });
  assert.equal(blockedWithoutReason.success, false);

  const blockedWithEmptyReason = createTaskSchema.safeParse({
    title: "Blocked Task",
    status: "Blocked",
    blockedReason: "   ",
  });
  assert.equal(blockedWithEmptyReason.success, false);

  // D: Blocked with reason accepted
  const blockedWithReason = createTaskSchema.safeParse({
    title: "Blocked Task",
    status: "Blocked",
    blockedReason: "Waiting for database credentials",
  });
  assert.equal(blockedWithReason.success, true);
});

test("Hotfix E, F, G, H: Session permissions and canonical gating", async () => {
  const { getStoredAuthSession, persistSession, clearAuthSession } = await import(
    "../../shared/src/auth/auth-service.ts"
  );

  clearAuthSession();

  // E & G: Custom role with task.create and department.create permissions
  const customSession = persistSession({
    accessToken: "jwt-token-1",
    refreshToken: "refresh-token-1",
    tokenType: "Bearer",
    expiresIn: 3600,
    user: {
      email: "lead@example.com",
      role: "Lead" as any,
      fullName: "Team Lead",
      permissions: ["task.create", "task.update", "department.create"],
      isProfileComplete: true,
      mustChangePassword: false,
    },
  }, false);

  assert.deepEqual(customSession.user.permissions, ["task.create", "task.update", "department.create"]);
  const storedCustom = getStoredAuthSession();
  assert.deepEqual(storedCustom?.user.permissions, ["task.create", "task.update", "department.create"]);

  // F & H: Custom role without task.create and without department.create
  clearAuthSession();
  const restrictedSession = persistSession({
    accessToken: "jwt-token-2",
    refreshToken: "refresh-token-2",
    tokenType: "Bearer",
    expiresIn: 3600,
    user: {
      email: "guest@example.com",
      role: "Guest" as any,
      fullName: "Guest User",
      permissions: ["task.view_stats"],
      isProfileComplete: true,
      mustChangePassword: false,
    },
  }, false);

  assert.equal(restrictedSession.user.permissions?.includes("task.create"), false);
  assert.equal(restrictedSession.user.permissions?.includes("department.create"), false);
});

test("Hotfix I, J, K, L: Assigned employee task updates vs management restriction", async () => {
  const { taskService } = await import("../../backend/src/services/task.service.ts");
  const { taskAccessService } = await import("../../backend/src/services/task-access.service.ts");
  const { taskRepository } = await import("../../backend/src/repositories/task.repository.ts");

  const originalResolveAccess = taskAccessService.resolve;
  const originalFindById = taskRepository.findById;
  const originalUpdate = taskRepository.update;
  const originalDelete = taskRepository.delete;

  let currentTask: any = {
    _id: "task-101",
    title: "Feature implementation",
    status: "Todo",
    progress: 0,
    assigneeId: "emp-assigned",
    projectId: "proj-1",
    labels: [],
    checklist: [],
    timeEntries: [],
    actualHours: 0,
  };

  taskAccessService.resolve = (async (actor: any) => ({
    allTasks: false,
    actorUserId: actor.id,
    visibleAssigneeIds: [actor.id],
    managedAssigneeIds: [],
    managedProjectIds: [],
  })) as any;

  taskRepository.findById = (async (id: string) => (id === "task-101" ? currentTask : null)) as any;
  taskRepository.update = (async (_id: string, updates: any) => {
    currentTask = { ...currentTask, ...updates };
    return currentTask;
  }) as any;
  taskRepository.delete = (async () => ({ deleted: true })) as any;

  const assignedEmployee = { id: "emp-assigned", role: "Employee" };
  const unassignedEmployee = { id: "emp-other", role: "Employee" };

  try {
    // I: Assigned employee status & progress update succeeds on task without checklist
    const statusUpdate = await taskService.update("task-101", {
      status: "In Progress",
      progress: 35,
    }, assignedEmployee);
    assert.equal(statusUpdate.status, "In Progress");
    assert.equal(statusUpdate.progress, 35);

    // J: Checklist update through dedicated scoped endpoint function
    currentTask.checklist = [
      { _id: "item-1", title: "Write tests", done: false },
      { _id: "item-2", title: "Implement code", done: false },
    ];
    const checklistUpdate = await taskService.updateChecklistItem("task-101", "item-1", true, assignedEmployee);
    assert.equal(checklistUpdate.checklist.find((i: any) => i._id === "item-1")?.done, true);
    assert.equal(checklistUpdate.progress, 50);

    // K: Unassigned employee is blocked from accessing/updating the task (403)
    await assert.rejects(
      () => taskService.getById("task-101", unassignedEmployee),
      (error: any) => error?.statusCode === 403,
    );
    await assert.rejects(
      () => taskService.update("task-101", { status: "Completed" }, unassignedEmployee),
      (error: any) => error?.statusCode === 403,
    );
    await assert.rejects(
      () => taskService.updateChecklistItem("task-101", "item-2", true, unassignedEmployee),
      (error: any) => error?.statusCode === 403,
    );

    // L: Assigned employee cannot modify management fields (assigneeId, projectId, delete)
    await assert.rejects(
      () => taskService.update("task-101", { assigneeId: "emp-other" }, assignedEmployee),
      (error: any) => error?.statusCode === 403 && /assigneeId/.test(error.message),
    );
    await assert.rejects(
      () => taskService.update("task-101", { projectId: "proj-2" }, assignedEmployee),
      (error: any) => error?.statusCode === 403 && /projectId/.test(error.message),
    );
    await assert.rejects(
      () => taskService.delete("task-101", assignedEmployee),
      (error: any) => error?.statusCode === 403,
    );
  } finally {
    taskAccessService.resolve = originalResolveAccess;
    taskRepository.findById = originalFindById;
    taskRepository.update = originalUpdate;
    taskRepository.delete = originalDelete;
  }
});
