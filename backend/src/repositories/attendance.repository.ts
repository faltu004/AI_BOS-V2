import type { UpdateQuery } from "mongoose";
import { AttendanceModel, type Attendance, type AttendanceDocument } from "../models/attendance.model.js";

export type AttendanceCreateData = Omit<Attendance, "createdAt" | "updatedAt">;

export class AttendanceRepository {
  async create(data: AttendanceCreateData) {
    return AttendanceModel.create(data);
  }

  async findByUserAndDate(userId: string, date: string) {
    return AttendanceModel.findOne({ userId, date }).lean();
  }

  async findRecentByUser(userId: string, limit: number) {
    return AttendanceModel.find({ userId }).sort({ date: -1, checkInAt: -1 }).limit(limit).lean();
  }

  async findByDate(date: string) {
    return AttendanceModel.find({ date }).sort({ checkInAt: -1 }).lean();
  }

  async updateByUserAndDate(userId: string, date: string, updates: UpdateQuery<AttendanceDocument>) {
    return AttendanceModel.findOneAndUpdate({ userId, date }, updates, {
      new: true,
      runValidators: true,
    }).lean();
  }
}

export const attendanceRepository = new AttendanceRepository();
