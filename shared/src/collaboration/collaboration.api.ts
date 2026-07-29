import type {
  CollaborationAttachment,
  CollaborationMessage,
  CollaborationNote,
  CollaborationRoom,
  DirectoryUser,
} from "./collaboration.schema";
import { getStoredAuthSession, isSessionExpired, refreshSession } from "@shared/auth/auth-service";

const viteEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
const apiBaseUrl = viteEnv?.VITE_API_BASE_URL ?? "http://127.0.0.1:5000/api/v1";
const apiAssetOrigin = apiBaseUrl.replace(/\/api\/v1\/?$/, "");

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
};

function authHeaders(token?: string) {
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function getRequestToken(token?: string) {
  let session = getStoredAuthSession();
  if (session && isSessionExpired(session)) {
    session = await refreshSession();
  }

  return session?.accessToken ?? token;
}

async function request<T>(path: string, token: string | undefined, init?: RequestInit): Promise<T> {
  const requestToken = await getRequestToken(token);
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: authHeaders(requestToken),
  });

  const finalResponse = response.status === 401
    ? await refreshSession().then((session) =>
        session
          ? fetch(`${apiBaseUrl}${path}`, {
              ...init,
              headers: authHeaders(session.accessToken),
            })
          : response,
      )
    : response;

  if (!finalResponse.ok) {
    if (finalResponse.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    const body = (await finalResponse.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Request failed (${finalResponse.status})`);
  }
  const body = (await finalResponse.json()) as ApiEnvelope<T>;
  return body.data;
}

export function fetchRooms(token?: string) {
  return request<CollaborationRoom[]>("/collaboration/rooms", token);
}

export function fetchDirectory(token?: string) {
  return request<DirectoryUser[]>("/collaboration/rooms/directory", token);
}

export function fetchTeamRoom(teamId: string, token?: string) {
  return request<CollaborationRoom>(`/collaboration/rooms/team/${teamId}`, token);
}

export function fetchProjectRoom(projectId: string, token?: string) {
  return request<CollaborationRoom>(`/collaboration/rooms/project/${projectId}`, token);
}

export function fetchEntityRoom(entityType: string, entityId: string, token?: string) {
  return request<CollaborationRoom>(`/collaboration/rooms/entity/${entityType}/${entityId}`, token);
}

export function createDirectRoom(participantIds: string[], token?: string) {
  return request<CollaborationRoom>("/collaboration/rooms/direct", token, {
    method: "POST",
    body: JSON.stringify({ participantIds }),
  });
}

export function markRoomRead(roomId: string, token?: string) {
  return request<{ roomId: string; read: boolean }>(`/collaboration/rooms/${roomId}/read`, token, {
    method: "PATCH",
  });
}

export function fetchMessages(roomId: string, token?: string, before?: string) {
  const query = before ? `?before=${encodeURIComponent(before)}` : "";
  return request<CollaborationMessage[]>(`/collaboration/rooms/${roomId}/messages${query}`, token);
}

export function fetchPinnedMessages(roomId: string, token?: string) {
  return request<CollaborationMessage[]>(`/collaboration/rooms/${roomId}/messages/pinned`, token);
}

export function sendMessage(roomId: string, body: string, attachments: CollaborationAttachment[], token?: string) {
  return request<CollaborationMessage | { message: CollaborationMessage }>(`/collaboration/rooms/${roomId}/messages`, token, {
    method: "POST",
    body: JSON.stringify({ body, attachments }),
  }).then((data) => ("message" in data ? data.message : data));
}

export function editMessage(messageId: string, body: string, token?: string) {
  return request<CollaborationMessage>(`/collaboration/messages/${messageId}`, token, {
    method: "PATCH",
    body: JSON.stringify({ body }),
  });
}

export function deleteMessage(messageId: string, token?: string) {
  return request<{ deleted: boolean; roomId: string }>(`/collaboration/messages/${messageId}`, token, {
    method: "DELETE",
  });
}

export function reactToMessage(messageId: string, emoji: string, token?: string) {
  return request<CollaborationMessage>(`/collaboration/messages/${messageId}/react`, token, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export function pinMessage(messageId: string, pinned: boolean, token?: string) {
  return request<CollaborationMessage>(`/collaboration/messages/${messageId}/pin`, token, {
    method: "PATCH",
    body: JSON.stringify({ pinned }),
  });
}

export function searchMessages(query: string, token?: string) {
  return request<CollaborationMessage[]>(`/collaboration/messages/search?q=${encodeURIComponent(query)}`, token);
}

export async function uploadAttachment(roomId: string, file: File, token?: string): Promise<CollaborationAttachment> {
  const formData = new FormData();
  formData.append("file", file);

  const requestToken = await getRequestToken(token);
  const response = await fetch(`${apiBaseUrl}/collaboration/rooms/${roomId}/attachments`, {
    method: "POST",
    headers: requestToken ? { Authorization: `Bearer ${requestToken}` } : undefined,
    body: formData,
  });

  const finalResponse = response.status === 401
    ? await refreshSession().then((session) =>
        session
          ? fetch(`${apiBaseUrl}/collaboration/rooms/${roomId}/attachments`, {
              method: "POST",
              headers: { Authorization: `Bearer ${session.accessToken}` },
              body: formData,
            })
          : response,
      )
    : response;

  if (!finalResponse.ok) {
    if (finalResponse.status === 401) {
      throw new Error("Session expired. Please sign in again.");
    }
    const body = (await finalResponse.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? `Upload failed (${finalResponse.status})`);
  }

  const body = (await finalResponse.json()) as ApiEnvelope<CollaborationAttachment>;
  return body.data;
}

export function resolveCollaborationAssetUrl(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  return `${apiAssetOrigin}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function fetchNote(roomId: string, token?: string) {
  return request<CollaborationNote>(`/collaboration/rooms/${roomId}/note`, token);
}

export function updateNote(roomId: string, title: string, body: string, token?: string) {
  return request<CollaborationNote>(`/collaboration/rooms/${roomId}/note`, token, {
    method: "PATCH",
    body: JSON.stringify({ title, body }),
  });
}
