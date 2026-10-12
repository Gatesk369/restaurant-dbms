import { apiUrl } from "../env";
import { clearStaffSession, getCustomerSession, getStaffSession } from "../session";

/**
 * Error raised for every failed API call. `fields` maps a request field to its
 * message so forms can show it under the right input; `detail` is the general
 * message ("Invalid username or password.").
 */
export class ApiError extends Error {
  readonly status: number;
  readonly detail: string;
  readonly fields: Record<string, string>;

  constructor(status: number, detail: string, fields: Record<string, string> = {}) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.fields = fields;
  }

  /** The request never reached the server (offline, CORS, server down). */
  get isNetwork(): boolean {
    return this.status === 0;
  }

  /** Missing, expired or invalid credentials. */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** Signed in, but the role may not do this. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** Request was understood but conflicts with current state (e.g. already paid). */
  get isConflict(): boolean {
    return this.status === 409;
  }

  get isThrottled(): boolean {
    return this.status === 429;
  }
}

export type AuthKind = "staff" | "customer" | "none";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Which credential to attach. Defaults to "staff". */
  auth?: AuthKind;
  signal?: AbortSignal;
}

const NETWORK_MESSAGE = "Could not reach the server. Check your connection and try again.";
const GENERIC_MESSAGE = "Something went wrong. Please try again.";

function messageOf(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

/**
 * DRF error bodies are `{detail}`, `{field: message | [messages]}` or a list.
 * Normalise them to a general message plus per-field messages.
 */
export function parseErrorBody(body: unknown): {
  detail: string | null;
  fields: Record<string, string>;
} {
  const fields: Record<string, string> = {};
  let detail: string | null = null;

  if (Array.isArray(body)) {
    detail = messageOf(body);
  } else if (typeof body === "object" && body !== null) {
    for (const [key, value] of Object.entries(body)) {
      const text = messageOf(value);
      if (text === null) continue;
      if (key === "detail" || key === "non_field_errors") detail ??= text;
      else fields[key] = text;
    }
  }
  return { detail, fields };
}

function buildUrl(path: string, query: RequestOptions["query"]): string {
  const url = new URL(path, `${apiUrl}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function authHeaders(kind: AuthKind): Record<string, string> {
  if (kind === "staff") {
    const session = getStaffSession();
    return session ? { Authorization: `Bearer ${session.token}` } : {};
  }
  if (kind === "customer") {
    const session = getCustomerSession();
    return session ? { "X-Session-Token": session.session_token } : {};
  }
  return {};
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = "staff", signal } = options;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...authHeaders(auth),
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, NETWORK_MESSAGE);
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const { detail, fields } = parseErrorBody(data);
    // An expired or revoked staff token ends the session everywhere at once.
    if (response.status === 401 && auth === "staff") clearStaffSession();
    throw new ApiError(response.status, detail ?? GENERIC_MESSAGE, fields);
  }

  return data as T;
}
