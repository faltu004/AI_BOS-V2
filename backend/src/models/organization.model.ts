import { model, Schema, type HydratedDocument } from "mongoose";
import { businessTypes, organizationScope, type BusinessType } from "../constants/organization.js";

export type Organization = {
  scope: typeof organizationScope;
  name: string;
  legalName?: string;
  logo?: string;
  businessType: BusinessType;
  gstin?: string;
  pan?: string;
  taxIdentificationNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  country: string;
  pincode?: string;
  isDefault: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type OrganizationDocument = HydratedDocument<Organization>;

const organizationSchema = new Schema<Organization>(
  {
    scope: {
      type: String,
      default: organizationScope,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    legalName: {
      type: String,
      trim: true,
      maxlength: 180,
    },
    logo: {
      type: String,
      maxlength: 2_900_000,
    },
    businessType: {
      type: String,
      enum: businessTypes,
      default: "Private Limited",
    },
    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 15,
    },
    pan: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 10,
    },
    taxIdentificationNumber: {
      type: String,
      trim: true,
      maxlength: 40,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 180,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    website: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    addressLine1: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    addressLine2: {
      type: String,
      trim: true,
      maxlength: 160,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    state: {
      type: String,
      trim: true,
      maxlength: 100,
    },
    country: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "India",
    },
    pincode: {
      type: String,
      trim: true,
      maxlength: 12,
    },
    isDefault: {
      type: Boolean,
      default: true,
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

organizationSchema.index(
  { isDefault: 1 },
  { unique: true, partialFilterExpression: { isDefault: true } },
);

export const OrganizationModel = model("Organization", organizationSchema);
