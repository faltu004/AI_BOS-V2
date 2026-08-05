import type { UpdateQuery } from "mongoose";
import { LeaveRequestModel, type LeaveRequest, type LeaveRequestDocument } from "../models/leave-request.model.js";
import type { ListApprovalsQuery } from "../validation/leave-request.validation.js";

export type LeaveRequestCreateData = Omit<LeaveRequest, "createdAt" | "updatedAt" | "status" | "decidedAt" | "decisionNote">;

const requesterFields = "fullName email role";

export class LeaveRequestRepository {
  async create(data: LeaveRequestCreateData) {
    return LeaveRequestModel.create(data);
  }

  async findById(id: string) {
    return LeaveRequestModel.findById(id);
  }

  async findByUser(userId: string, limit: number) {
    return LeaveRequestModel.find({ userId })
      .populate("approverId", requesterFields)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }

  async findByApprover(approverId: string, query: ListApprovalsQuery) {
    const filter: Record<string, unknown> = { approverId };
    if (query.status) filter.status = query.status;

    return LeaveRequestModel.find(filter)
      .populate("userId", requesterFields)
      .sort({ createdAt: -1 })
      .limit(query.limit)
      .lean();
  }

  async findPendingOverlap(userId: string, from: string, to: string) {
    return LeaveRequestModel.findOne({
      userId,
      status: "Pending",
      from: { $lte: to },
      to: { $gte: from },
    }).lean();
  }

  async updateStatus(id: string, updates: UpdateQuery<LeaveRequestDocument>) {
    return LeaveRequestModel.findByIdAndUpdate(id, updates, { new: true, runValidators: true })
      .populate("userId", requesterFields)
      .populate("approverId", requesterFields);
  }
}

export const leaveRequestRepository = new LeaveRequestRepository();
