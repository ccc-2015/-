"use client";

import type { CurrentUser } from "@/types/domain";
import { mockUsers } from "@/lib/mock-data";

const STORAGE_KEY = "zhiyuan-agent-current-user";

export function getStoredUser(): CurrentUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as CurrentUser;
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function storeUser(user: CurrentUser) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  window.localStorage.removeItem(STORAGE_KEY);
}

export function mockLogin(identifier: string, password: string) {
  const normalized = identifier.trim();

  if (!password.trim()) {
    throw new Error("请输入密码");
  }

  if (normalized.includes("admin")) {
    return mockUsers.admin;
  }

  if (normalized.includes("advisor")) {
    return mockUsers.multiRole;
  }

  return mockUsers.student;
}
