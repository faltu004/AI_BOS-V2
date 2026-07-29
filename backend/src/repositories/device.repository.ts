import { FilterQuery, Types } from "mongoose";
import { DeviceModel, type Device } from "../models/device.model.js";

export type CreateDeviceInput = Pick<Device, "user" | "name" | "fingerprint" | "userAgent">;

export class DeviceRepository {
  async create(input: CreateDeviceInput) {
    return DeviceModel.create({
      ...input,
      user: new Types.ObjectId(input.user),
    });
  }

  async findByUserAndFingerprint(userId: string, fingerprint: string) {
    return DeviceModel.findOne({ user: userId, fingerprint });
  }

  async findById(id: string) {
    return DeviceModel.findById(id);
  }

  async findManyByUser(userId: string) {
    return DeviceModel.find({ user: userId }).sort({ createdAt: -1 }).lean();
  }

  async updateTrustStatus(id: string, trustStatus: Device["trustStatus"]) {
    return DeviceModel.findByIdAndUpdate(id, { trustStatus }, { new: true });
  }

  async deactivate(id: string) {
    return DeviceModel.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  async markSeen(id: string, ip: string) {
    return DeviceModel.findByIdAndUpdate(id, { lastSeenAt: new Date(), lastIp: ip }, { new: true });
  }

  async countActiveByUser(userId: string) {
    return DeviceModel.countDocuments({ user: userId, isActive: true });
  }
}

export const deviceRepository = new DeviceRepository();
