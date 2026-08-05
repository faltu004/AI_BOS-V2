import { Types } from "mongoose";
import { leaveRequestRepository } from "../repositories/leave-request.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { notificationService } from "./notification.service.js";
import { AppError } from "../utils/app-error.js";
import type {
  ApplyLeaveInput,
  LeaveDecisionInput,
  ListApprovalsQuery,
  ListMyLeaveQuery,
} from "../validation/leave-request.validation.js";

function requireUserId(userId?: string) {
  if (!userId) throw new AppError("Authentication required", 401);
  return userId;
}

async function resolveApproverId(userId: string): Promise<Types.ObjectId> {
  const applicant = await userRepository.findById(userId);
  if (!applicant) throw new AppError("User not found", 404);

  if (applicant.managerId) {
    return applicant.managerId as Types.ObjectId;
  }

  const fallbackApprovers = await userRepository.findMany({
    role: { $in: ["Owner", "Administrator"] },
    isActive: true,
    _id: { $ne: applicant._id },
  });
  const fallback = fallbackApprovers[0];
  if (!fallback) {
    throw new AppError("No approver is configured for your account. Contact your administrator.", 409);
  }
  return fallback._id as Types.ObjectId;
}

export class LeaveRequestService {
  async apply(userId: string | undefined, input: ApplyLeaveInput) {
    const currentUserId = requireUserId(userId);

    const overlapping = await leaveRequestRepository.findPendingOverlap(currentUserId, input.from, input.to);
    if (overlapping) {
      throw new AppError("You already have a pending leave request that overlaps these dates.", 409);
    }

    const approverId = await resolveApproverId(currentUserId);

    const request = await leaveRequestRepository.create({
      userId: new Types.ObjectId(currentUserId),
      approverId,
      type: input.type,
      from: input.from,
      to: input.to,
      reason: input.reason,
    });

    const applicant = await userRepository.findById(currentUserId);
    void notificationService.dispatch({
      recipientUserIds: [approverId.toString()],
      type: "leave.requested",
      category: "approval",
      priority: "Medium",
      title: "New leave request",
      body: `${applicant?.fullName ?? "A team member"} requested ${input.type} from ${input.from} to ${input.to}.`,
      actorUserId: currentUserId,
      sourceType: "leave_request",
      sourceId: request._id.toString(),
    });

    return request;
  }

  async myRequests(userId: string | undefined, query: ListMyLeaveQuery) {
    const currentUserId = requireUserId(userId);
    return leaveRequestRepository.findByUser(currentUserId, query.limit);
  }

  async approvals(approverId: string | undefined, query: ListApprovalsQuery) {
    const currentApproverId = requireUserId(approverId);
    return leaveRequestRepository.findByApprover(currentApproverId, query);
  }

  async decide(approverId: string | undefined, requestId: string, input: LeaveDecisionInput) {
    const currentApproverId = requireUserId(approverId);

    const request = await leaveRequestRepository.findById(requestId);
    if (!request) throw new AppError("Leave request not found", 404);

    if (request.approverId.toString() !== currentApproverId) {
      throw new AppError("You are not the approver for this leave request", 403);
    }

    if (request.status !== "Pending") {
      throw new AppError("This leave request has already been decided", 409);
    }

    const updated = await leaveRequestRepository.updateStatus(requestId, {
      status: input.status,
      decidedAt: new Date(),
      decisionNote: input.decisionNote,
    });
    if (!updated) throw new AppError("Leave request not found", 404);

    void notificationService.dispatch({
      recipientUserIds: [request.userId.toString()],
      type: "leave.decided",
      category: "approval",
      priority: "Medium",
      title: `Leave request ${input.status.toLowerCase()}`,
      body:
        input.status === "Approved"
          ? `Your ${request.type} from ${request.from} to ${request.to} was approved.`
          : `Your ${request.type} from ${request.from} to ${request.to} was rejected.${input.decisionNote ? ` Reason: ${input.decisionNote}` : ""}`,
      actorUserId: currentApproverId,
      sourceType: "leave_request",
      sourceId: requestId,
    });

    return updated;
  }

  async cancel(userId: string | undefined, requestId: string) {
    const currentUserId = requireUserId(userId);

    const request = await leaveRequestRepository.findById(requestId);
    if (!request) throw new AppError("Leave request not found", 404);

    if (request.userId.toString() !== currentUserId) {
      throw new AppError("You can only cancel your own leave requests", 403);
    }

    if (request.status !== "Pending") {
      throw new AppError("Only pending leave requests can be cancelled", 409);
    }

    const updated = await leaveRequestRepository.updateStatus(requestId, { status: "Cancelled" });
    if (!updated) throw new AppError("Leave request not found", 404);
    return updated;
  }
}

export const leaveRequestService = new LeaveRequestService();
