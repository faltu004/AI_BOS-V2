import { model, Schema, type HydratedDocument, type Types } from "mongoose";

export type CollaborationReadState = {
  roomId: Types.ObjectId;
  userId: Types.ObjectId;
  lastReadAt: Date;
};

export type CollaborationReadStateDocument = HydratedDocument<CollaborationReadState>;

const collaborationReadStateSchema = new Schema<CollaborationReadState>(
  {
    roomId: {
      type: Schema.Types.ObjectId,
      ref: "CollaborationRoom",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    lastReadAt: {
      type: Date,
      required: true,
      default: () => new Date(0),
    },
  },
  {
    timestamps: false,
    versionKey: false,
  },
);

collaborationReadStateSchema.index({ roomId: 1, userId: 1 }, { unique: true });

export const CollaborationReadStateModel = model("CollaborationReadState", collaborationReadStateSchema);
