import type { AgentChatResponse, CurrentUser } from "@/types/domain";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

type ApiRequestOptions = RequestInit & {
  token?: string;
};

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers);

  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let message = "请求失败，请稍后重试";
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) {
        message = body.detail;
      }
    } catch {
      // Keep the generic message when the backend returns non-JSON errors.
    }

    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

type BackendUser = {
  id: number;
  username: string;
  phone?: string | null;
  display_name: string;
  roles: CurrentUser["roles"];
  permissions: CurrentUser["permissions"];
  default_portal: CurrentUser["defaultPortal"];
};

type LoginResponse = {
  access_token: string;
  token_type: string;
  user: BackendUser;
};

function mapUser(user: BackendUser): CurrentUser {
  return {
    id: String(user.id),
    name: user.display_name || user.username,
    phone: user.phone ?? user.username,
    roles: user.roles,
    permissions: user.permissions,
    defaultPortal: user.default_portal
  };
}

export async function login(username: string, password: string) {
  const response = await request<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });

  return {
    token: response.access_token,
    user: mapUser(response.user)
  };
}

export async function getCurrentUser(token: string) {
  const user = await request<BackendUser>("/api/auth/me", { token });
  return mapUser(user);
}

export async function sendAgentMessage({
  token,
  message,
  conversationId,
  threadId
}: {
  token: string;
  message: string;
  conversationId?: number;
  threadId?: string;
}) {
  return request<AgentChatResponse>("/api/agent/chat", {
    method: "POST",
    token,
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      thread_id: threadId
    })
  });
}
