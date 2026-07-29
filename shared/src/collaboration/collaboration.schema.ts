export type CollaborationRoomType = "workspace" | "team" | "project" | "entity" | "direct";

export type CollaborationAttachment = {
  fileName: string;
  storedPath: string;
  mimeType: string;
  size: number;
  url: string;
};

export type CollaborationReaction = {
  emoji: string;
  userId: string;
};

export type CollaborationMessage = {
  _id: string;
  roomId: string;
  authorId: string;
  body: string;
  mentionedUserIds: string[];
  attachments: CollaborationAttachment[];
  reactions: CollaborationReaction[];
  isPinned: boolean;
  pinnedBy?: string;
  pinnedAt?: string;
  editedAt?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CollaborationRoom = {
  _id: string;
  organizationId: string;
  roomType: CollaborationRoomType;
  name: string;
  teamId?: string;
  projectId?: string;
  entityType?: string;
  entityId?: string;
  participantIds: string[];
  isArchived: boolean;
  lastMessageAt?: string;
  unreadCount: number;
  lastMessage: { body: string; authorId: string; createdAt: string } | null;
};

export type CollaborationNote = {
  roomId: string;
  title: string;
  body: string;
  lastEditedBy?: string;
  updatedAt?: string;
};

export type DirectoryUser = {
  _id: string;
  fullName: string;
  email: string;
  role: string;
};
