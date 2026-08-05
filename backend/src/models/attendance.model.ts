import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type AttendanceLocation = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  distanceMeters: number;
};

export type AttendanceStatus = "Present" | "Checked Out";

export type Attendance = {
  userId: Types.ObjectId;
  date: string;
  status: AttendanceStatus;
  checkInAt: Date;
  checkOutAt?: Date;
  checkInLocation: AttendanceLocation;
  checkOutLocation?: AttendanceLocation;
  checkInFaceImage?: string;
  checkOutFaceImage?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AttendanceDocument = HydratedDocument<Attendance>;

const attendanceLocationSchema = new Schema<AttendanceLocation>(
  {
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
    accuracy: { type: Number, min: 0 },
    distanceMeters: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const attendanceSchema = new Schema<Attendance>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: String, required: true, index: true },
    status: { type: String, enum: ["Present", "Checked Out"], default: "Present", index: true },
    checkInAt: { type: Date, required: true },
    checkOutAt: { type: Date },
    checkInLocation: { type: attendanceLocationSchema, required: true },
    checkOutLocation: { type: attendanceLocationSchema },
    checkInFaceImage: { type: String },
    checkOutFaceImage: { type: String },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: -1, status: 1 });

export const AttendanceModel = model("Attendance", attendanceSchema);
