import { Schema, model, type HydratedDocument, type Document, type Types } from "mongoose";

export type ConsultantReportStatus = "draft" | "final" | "archived";
export type ConsultantSummaryPeriod = "daily" | "weekly" | "monthly" | "quarterly" | "annual";
export type ConsultantAnalysisType = "business_health" | "swot" | "revenue" | "expense" | "sales" | "project" | "employee" | "risk" | "suggestion" | "summary";

export type ConsultantReport = {
  title: string;
  type: ConsultantAnalysisType;
  period?: ConsultantSummaryPeriod;
  status: ConsultantReportStatus;
  summary: string;
  metrics: Array<{
    label: string;
    value: string | number;
    change?: string;
    source: string;
    confidence: number;
  }>;
  sections: Array<{
    title: string;
    content: string;
    data?: Record<string, unknown>;
    sourceModules: string[];
    confidence: number;
  }>;
  recommendations: Array<{
    priority: "high" | "medium" | "low";
    category: string;
    action: string;
    impact: string;
    effort: string;
  }>;
  dataSources: Array<{
    module: string;
    recordCount: number;
    available: boolean;
  }>;
  generatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type ConsultantReportDocument = HydratedDocument<ConsultantReport> & Document;

const metricSchema = new Schema(
  {
    label: { type: String, required: true, trim: true, maxlength: 180 },
    value: { type: Schema.Types.Mixed, required: true },
    change: { type: String, trim: true, maxlength: 120 },
    source: { type: String, required: true, trim: true, maxlength: 120 },
    confidence: { type: Number, min: 0, max: 100, required: true },
  },
  { _id: false },
);

const sectionSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 180 },
    content: { type: String, required: true, trim: true, maxlength: 8000 },
    data: { type: Schema.Types.Mixed, default: {} },
    sourceModules: [{ type: String, trim: true, maxlength: 60 }],
    confidence: { type: Number, min: 0, max: 100, required: true },
  },
  { _id: false },
);

const recommendationSchema = new Schema(
  {
    priority: { type: String, enum: ["high", "medium", "low"], required: true },
    category: { type: String, required: true, trim: true, maxlength: 120 },
    action: { type: String, required: true, trim: true, maxlength: 500 },
    impact: { type: String, required: true, trim: true, maxlength: 300 },
    effort: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { _id: false },
);

const dataSourceSchema = new Schema(
  {
    module: { type: String, required: true, trim: true, maxlength: 60 },
    recordCount: { type: Number, min: 0, default: 0 },
    available: { type: Boolean, default: false },
  },
  { _id: false },
);

const consultantReportSchema = new Schema<ConsultantReport>(
  {
    title: { type: String, required: true, trim: true, maxlength: 180, index: true },
    type: {
      type: String,
      enum: ["business_health", "swot", "revenue", "expense", "sales", "project", "employee", "risk", "suggestion", "summary"],
      required: true,
      index: true,
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly", "quarterly", "annual"],
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "final", "archived"],
      default: "final",
      index: true,
    },
    summary: { type: String, required: true, trim: true, maxlength: 4000 },
    metrics: { type: [metricSchema], default: [] },
    sections: { type: [sectionSchema], default: [] },
    recommendations: { type: [recommendationSchema], default: [] },
    dataSources: { type: [dataSourceSchema], default: [] },
    generatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

consultantReportSchema.index({ type: 1, period: 1, createdAt: -1 });
consultantReportSchema.index({ generatedBy: 1, createdAt: -1 });

export const ConsultantReportModel = model("ConsultantReport", consultantReportSchema);
