import { z } from "zod";

const taskAttachmentSchema = z.object({
 name: z.string(),
 type: z.string(),
 size: z.string(),
});

const taskCommentSchema = z.object({
 id: z.string(),
 author: z.string(),
 message: z.string(),
 createdAt: z.string(),
});

const checklistItemSchema = z.object({
 id: z.string(),
 title: z.string(),
 done: z.boolean(),
});

export const taskFormSchema = z.object({
 taskCode: z.string().optional(),
 title: z.string().min(1, "Title is required"),
 description: z.string(),
 issueType: z.enum(["Epic", "Story", "Task", "Subtask", "Bug"]).optional(),
 status: z.enum(["Todo", "In Progress", "Blocked", "Review", "Testing", "Completed"]),
 progress: z.number({ message: "Enter a number" }).int().min(0).max(100),
 blockedReason: z.string().max(1000).optional(),
 priority: z.enum(["Low", "Medium", "High", "Critical"]),
 projectId: z.string().optional(),
 epicId: z.string().optional(),
 sprintId: z.string().optional(),
 parentTaskId: z.string().optional(),
 backlogRank: z.number().min(0).optional(),
 labels: z.array(z.string()),
 assignee: z.string(),
 reporter: z.string(),
 dueDate: z.string(),
 startDate: z.string(),
 estimatedHours: z
 .number({ message: "Enter a number" })
 .min(0, "Must be 0 or more"),
 actualHours: z
 .number({ message: "Enter a number" })
 .min(0, "Must be 0 or more"),
 attachments: z.array(taskAttachmentSchema),
 comments: z.array(taskCommentSchema),
 checklist: z.array(checklistItemSchema),
 recurring: z.boolean(),
 recurrence: z.string(),
 notifications: z.array(z.string()),
}).superRefine((value, context) => {
 if (value.status === "Blocked" && !value.blockedReason?.trim()) {
 context.addIssue({
 code: z.ZodIssueCode.custom,
 path: ["blockedReason"],
 message: "Blocked reason is required",
 });
 }
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
