"use client";

import type { AuthSession } from "@/types/domain";

const STORAGE_KEY = "zhiyuan-agent-session";
const LEGACY_USER_KEY = "zhiyuan-agent-current-user";

export function getStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.removeItem(LEGACY_USER_KEY);
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function storeSession(session: AuthSession) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.localStorage.removeItem(LEGACY_USER_KEY);
}

export function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(LEGACY_USER_KEY);
}
