import { nanoid } from "nanoid";

const KEY = "pc_session_id";
let memoryId: string | null = null;

/** Anonymous session id, persisted in localStorage; falls back to memory if storage is blocked. */
export function getSessionId(): string {
  if (memoryId) return memoryId;
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) {
      memoryId = existing;
      return existing;
    }
  } catch (err) {
    console.warn("localStorage unavailable; session lasts for this page only", err);
  }
  const id = nanoid(21);
  memoryId = id;
  try {
    window.localStorage.setItem(KEY, id);
  } catch (err) {
    console.warn("could not persist session id", err);
  }
  return id;
}

export function sessionHeaders(): Record<string, string> {
  return { "x-session-id": getSessionId() };
}
