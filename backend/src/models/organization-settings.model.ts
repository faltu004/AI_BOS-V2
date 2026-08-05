import { model, Schema, type HydratedDocument, type Types } from "mongoose";
import { organizationScope } from "../constants/organization.js";
import { weekdays, type Weekday } from "../constants/weekday.js";

export const dateFormats = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
export type DateFormat = (typeof dateFormats)[number];

export type WorkspacePreferences = {
  allowRemoteCheckIn: boolean;
  enforceGeoFence: boolean;
  officeLocation: {
    name: string;
    latitude: number;
    longitude: number;
    radiusMeters: number;
  };
  defaultLeavePolicyNote?: string;
};

export type ModuleAccess = {
  /** Owner-only kill switch — when false, the Administrator role's Admin Panel is blocked in the admin portal. */
  adminPanelEnabled: boolean;
};

export type OrganizationSettings = {
  scope: typeof organizationScope;
  organizationId: Types.ObjectId;
  workingDays: Weekday[];
  businessHoursStart: string;
  businessHoursEnd: string;
  timezone: string;
  weekStartsOn: Weekday;
  dateFormat: DateFormat;
  currency: string;
  fiscalYearStartMonth: number;
  workspacePreferences: WorkspacePreferences;
  moduleAccess: ModuleAccess;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationSettingsDocument = HydratedDocument<OrganizationSettings>;

const organizationSettingsSchema = new Schema<OrganizationSettings>(
  {
    scope: {
      type: String,
      default: organizationScope,
      unique: true,
      index: true,
    },
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },
    workingDays: {
      type: [String],
      enum: weekdays,
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    businessHoursStart: {
      type: String,
      default: "09:30",
      trim: true,
    },
    businessHoursEnd: {
      type: String,
      default: "18:30",
      trim: true,
    },
    timezone: {
      type: String,
      default: "Asia/Kolkata",
      trim: true,
      maxlength: 60,
    },
    weekStartsOn: {
      type: String,
      enum: weekdays,
      default: "Monday",
    },
    dateFormat: {
      type: String,
      enum: dateFormats,
      default: "DD/MM/YYYY",
    },
    currency: {
      type: String,
      default: "INR",
      trim: true,
      uppercase: true,
      maxlength: 3,
    },
    fiscalYearStartMonth: {
      type: Number,
      min: 1,
      max: 12,
      default: 4,
    },
    workspacePreferences: {
      allowRemoteCheckIn: { type: Boolean, default: false },
      enforceGeoFence: { type: Boolean, default: true },
      officeLocation: {
        name: { type: String, trim: true, maxlength: 120, default: "Main Office" },
        latitude: { type: Number, min: -90, max: 90, default: 12.9716 },
        longitude: { type: Number, min: -180, max: 180, default: 77.5946 },
        radiusMeters: { type: Number, min: 1, default: 300 },
      },
      defaultLeavePolicyNote: { type: String, trim: true, maxlength: 500 },
    },
    moduleAccess: {
      adminPanelEnabled: { type: Boolean, default: true },
    },
    updatedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const OrganizationSettingsModel = model("OrganizationSettings", organizationSettingsSchema);
