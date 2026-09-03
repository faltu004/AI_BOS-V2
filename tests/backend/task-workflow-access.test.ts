import test from "node:test";
import assert from "node:assert/strict";
import { configureBackendTestEnv } from "../helpers/backend-env.ts";

configureBackendTestEnv();

function queryResult<T>(value: T) {
  const query = {
    select: () => query,
    lean: async () => value,
  };
  return query;
}

test("task access resolves employee, manager/team/project, and administrator visibility", async () => {
  const { taskAccessService } = await import("../../backend/src/services/task-access.service.ts");
  const { permissionService } = await import("../../backend/src/services/permission.service.ts");
  const { UserModel } = await import("../../backend/src/models/user.model.ts");
  const { TeamModel } = await import("../../backend/src/models/team.model.ts");
  const { ProjectMemberModel } = await import("../../backend/src/models/project-member.model.ts");

  const originalResolvePermissions = permissionService.resolveEffectivePermissions;
  const originalFindUser = UserModel.findById;
  const originalFindUsers = UserModel.find;
  const originalFindTeams = TeamModel.find;
  const originalFindMemberships = ProjectMemberModel.find;

  permissionService.resolveEffectivePermissions = (async (role: string) => ({
    hasFullAccess: role === "Administrator",
    permissionKeys: new Set(role === "Manager" ? ["task.view_stats", "task.update"] : ["task.update"]),
  })) as any;
  UserModel.findById = ((id: string) => queryResult({
    _id: id,
    organizationId: "org-1",
    departmentId: "department-1",
  })) as any;
  UserModel.find = (() => queryResult([
    { _id: "employee-1", departmentId: "department-1" },
    { _id: "employee-2", departmentId: "department-1", managerId: "manager-1" },
    { _id: "employee-3", departmentId: "department-2" },
  ])) as any;
  TeamModel.find = ((filter: any) => queryResult(
    filter.leadId === "manager-1" ? [{ memberIds: ["employee-3"] }] : [],
  )) as any;
  ProjectMemberModel.find = ((filter: any) => queryResult(
    filter.userId === "manager-1" ? [{ projectId: "project-1" }] : [],
  )) as any;

  try {
    const employee = await taskAccessService.resolve({ id: "employee-1", role: "Employee" });
    assert.equal(employee.allTasks, false);
    assert.deepEqual(employee.visibleAssigneeIds, ["employee-1"]);
    assert.deepEqual(employee.managedAssigneeIds, []);

    const manager = await taskAccessService.resolve({ id: "manager-1", role: "Manager" });
    assert.equal(manager.allTasks, false);
    assert.deepEqual(new Set(manager.visibleAssigneeIds), new Set(["manager-1", "employee-1", "employee-2", "employee-3"]));
    assert.deepEqual(manager.managedProjectIds, ["project-1"]);
    assert.equal(taskAccessService.canView({ assigneeId: "employee-2" as any }, manager), true);
    assert.equal(taskAccessService.canView({ projectId: "project-1" as any }, manager), true);
    assert.equal(taskAccessService.canView({ assigneeId: "outside-user" as any }, manager), false);

    const administrator = await taskAccessService.resolve({ id: "admin-1", role: "Administrator" });
    assert.equal(administrator.allTasks, true);
    assert.deepEqual(taskAccessService.toFilter(administrator), {});
  } finally {
    permissionService.resolveEffectivePermissions = originalResolvePermissions;
    UserModel.findById = originalFindUser;
    UserModel.find = originalFindUsers;
    TeamModel.find = originalFindTeams;
    ProjectMemberModel.find = originalFindMemberships;
  }
});

test("task service enforces assignment scope, field security, progress, and checklist calculation", async () => {
  const { taskService } = await import("../../backend/src/services/task.service.ts");
  const { taskAccessService } = await import("../../backend/src/services/task-access.service.ts");
  const { taskRepository } = await import("../../backend/src/repositories/task.repository.ts");

  const originalResolveAccess = taskAccessService.resolve;
  const originalFindById = taskRepository.findById;
  const originalList = taskRepository.list;
  const originalUpdate = taskRepository.update;

  const baseTask: any = {
    _id: "task-1",
    title: "Assigned work",
    status: "In Progress",
    progress: 40,
    assigneeId: "employee-1",
    projectId: "project-1",
    labels: [],
    checklist: [
      { _id: "item-1", title: "One", done: true },
      { _id: "item-2", title: "Two", done: true },
      { _id: "item-3", title: "Three", done: false },
      { _id: "item-4", title: "Four", done: false },
      { _id: "item-5", title: "Five", done: false },
    ],
    timeEntries: [],
    actualHours: 0,
  };
  let currentTask = { ...baseTask };
  const updateCalls: any[] = [];

  taskAccessService.resolve = (async (actor: any) => actor.role === "Administrator"
    ? { allTasks: true, actorUserId: actor.id, visibleAssigneeIds: [], managedAssigneeIds: [], managedProjectIds: [] }
    : actor.role === "Manager"
      ? { allTasks: false, actorUserId: actor.id, visibleAssigneeIds: [actor.id, "employee-1"], managedAssigneeIds: [actor.id, "employee-1"], managedProjectIds: ["project-1"] }
      : { allTasks: false, actorUserId: actor.id, visibleAssigneeIds: [actor.id], managedAssigneeIds: [], managedProjectIds: [] }) as any;
  taskRepository.findById = (async (id: string) => id === "task-1" ? currentTask : { ...baseTask, _id: id, assigneeId: "employee-2", projectId: "project-2" }) as any;
  taskRepository.list = (async (_query: any, filter: any) => ({ items: [], filter })) as any;
  taskRepository.update = (async (_id: string, updates: any) => {
    updateCalls.push(updates);
    currentTask = { ...currentTask, ...updates };
    return currentTask;
  }) as any;

  try {
    const employee = { id: "employee-1", role: "Employee" };
    const employeeList = await taskService.list({ page: 1, limit: 20, sortBy: "createdAt", sortOrder: "desc" } as any, employee);
    assert.deepEqual((employeeList as any).filter, { $or: [{ assigneeId: { $in: ["employee-1"] } }] });

    await assert.rejects(
      () => taskService.getById("task-2", employee),
      (error: any) => error?.statusCode === 403,
    );
    await assert.rejects(
      () => taskService.update("task-2", { status: "In Progress" }, employee),
      (error: any) => error?.statusCode === 403,
    );
    await assert.rejects(
      () => taskService.update("task-1", { assigneeId: "employee-2" }, employee),
      (error: any) => error?.statusCode === 403 && /assigneeId/.test(error.message),
    );

    currentTask = { ...baseTask, status: "Todo", progress: 0, checklist: [] };
    const started = await taskService.update("task-1", { status: "In Progress" }, employee);
    assert.equal(started.status, "In Progress");
    assert.equal(started.progress, 0);

    currentTask = { ...baseTask, progress: 60, checklist: [] };
    const blocked = await taskService.update(
      "task-1",
      { status: "Blocked", blockedReason: "Waiting for API credentials" },
      employee,
    );
    assert.equal(blocked.status, "Blocked");
    assert.equal(blocked.progress, 60);
    assert.equal(blocked.blockedReason, "Waiting for API credentials");

    const completed = await taskService.update("task-1", { status: "Completed" }, employee);
    assert.equal(completed.progress, 100);
    assert.equal(completed.remaining, 0);
    currentTask = { ...currentTask, checklist: [] };
    const reopened = await taskService.update("task-1", { status: "In Progress", progress: 100 }, employee);
    assert.equal(reopened.progress, 99);

    currentTask = { ...baseTask };
    const checklistUpdated = await taskService.updateChecklistItem("task-1", "item-3", true, employee);
    assert.equal(checklistUpdated.progress, 60);
    assert.equal(checklistUpdated.remaining, 40);
    const timeLogged = await taskService.logTime("task-1", { hours: 1, note: "Implementation" }, employee);
    assert.equal(timeLogged.actualHours, 1);
    assert.equal(timeLogged.timeEntries.at(-1)?.userId, "employee-1");

    const managerUpdated = await taskService.update(
      "task-1",
      { title: "Manager-approved title", assigneeId: "employee-1" },
      { id: "manager-1", role: "Manager" },
    );
    assert.equal(managerUpdated.title, "Manager-approved title");
    assert.equal(updateCalls.some((updates) => updates.progress === 100), true);
  } finally {
    taskAccessService.resolve = originalResolveAccess;
    taskRepository.findById = originalFindById;
    taskRepository.list = originalList;
    taskRepository.update = originalUpdate;
  }
});

test("assigned task comment flow continues creating the existing task comment shape", async () => {
  const { taskCommentService } = await import("../../backend/src/services/task-comment.service.ts");
  const { taskCommentRepository } = await import("../../backend/src/repositories/task-comment.repository.ts");
  const { taskRepository } = await import("../../backend/src/repositories/task.repository.ts");
  const { notificationService } = await import("../../backend/src/services/notification.service.ts");

  const originalCreate = taskCommentRepository.create;
  const originalList = taskCommentRepository.listByResource;
  const originalFindTask = taskRepository.findById;
  const originalParseMentions = notificationService.parseMentions;

  taskCommentRepository.create = (async (input: any) => ({ _id: "comment-1", ...input })) as any;
  taskCommentRepository.listByResource = (async () => ({ items: [], pagination: {} })) as any;
  taskRepository.findById = (async () => ({ assigneeId: "employee-1", reporterId: "employee-1" })) as any;
  notificationService.parseMentions = (() => []) as any;

  try {
    const comment: any = await taskCommentService.create("Task", "task-1", "employee-1", "  Work started  ");
    assert.equal(comment.resourceId, "task-1");
    assert.equal(comment.authorId, "employee-1");
    assert.equal(comment.body, "Work started");
  } finally {
    taskCommentRepository.create = originalCreate;
    taskCommentRepository.listByResource = originalList;
    taskRepository.findById = originalFindTask;
    notificationService.parseMentions = originalParseMentions;
  }
});

test("task validation bounds progress and requires a blocked reason", async () => {
  const { createTaskSchema, updateTaskSchema } = await import(
    "../../backend/src/validation/task.validation.ts"
  );

  assert.equal(updateTaskSchema.safeParse({ progress: -1 }).success, false);
  assert.equal(updateTaskSchema.safeParse({ progress: 101 }).success, false);
  assert.equal(updateTaskSchema.safeParse({ status: "Blocked" }).success, false);
  assert.equal(updateTaskSchema.safeParse({ status: "Blocked", blockedReason: "Waiting for access" }).success, true);
  assert.equal(createTaskSchema.safeParse({
    title: "Blocked work",
    status: "Blocked",
    priority: "Medium",
    issueType: "Task",
    labels: [],
    estimatedHours: 0,
    checklist: [],
    attachments: [],
    recurring: false,
    recurrence: "None",
  }).success, false);

  // A: Admin normal task create with null blockedReason and default progress
  const normalTask = createTaskSchema.safeParse({
    title: "Normal Task",
    status: "Todo",
    progress: 0,
    blockedReason: null,
    priority: "Medium",
    issueType: "Task",
    labels: [],
    estimatedHours: 0,
    checklist: [],
    attachments: [],
    recurring: false,
    recurrence: "None",
  });
  assert.equal(normalTask.success, true);

  // B: Semantically optional fields with null / empty string dates
  const optionalNullTask = createTaskSchema.safeParse({
    title: "Task with nulls",
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
  });
  assert.equal(optionalNullTask.success, true);

  // C: Blocked without reason rejected
  const blockedWithoutReason = createTaskSchema.safeParse({
    title: "Blocked no reason",
    status: "Blocked",
    blockedReason: null,
  });
  assert.equal(blockedWithoutReason.success, false);

  // D: Blocked with reason accepted
  const blockedWithReason = createTaskSchema.safeParse({
    title: "Blocked with reason",
    status: "Blocked",
    blockedReason: "Waiting on external dependency",
  });
  assert.equal(blockedWithReason.success, true);
});
