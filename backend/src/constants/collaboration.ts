export const collaborationRoomTypes = ["workspace", "team", "project", "entity", "direct"] as const;
export type CollaborationRoomType = (typeof collaborationRoomTypes)[number];
