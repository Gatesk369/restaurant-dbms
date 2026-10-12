import { request } from "./client";
import type { Staff, StaffSession } from "./types";
import { isRole } from "./types";

function toStaff(raw: unknown): Staff {
  const row = raw as Record<string, unknown>;
  if (typeof row?.staff_id !== "number" || typeof row.username !== "string" || !isRole(row.role)) {
    throw new TypeError("Unexpected staff payload");
  }
  return {
    staff_id: row.staff_id,
    username: row.username,
    role: row.role,
    display_name: typeof row.display_name === "string" ? row.display_name : undefined,
  };
}

export async function login(username: string, password: string): Promise<StaffSession> {
  const data = await request<{ token: string; staff: unknown }>("/api/auth/login/", {
    method: "POST",
    body: { username, password },
    auth: "none",
  });
  return { token: data.token, staff: toStaff(data.staff) };
}

export async function me(): Promise<Staff> {
  return toStaff(await request<unknown>("/api/auth/me/"));
}

/** Name shown in the UI until the API serves display names (gap G9). */
export function staffName(staff: Staff): string {
  return staff.display_name || staff.username;
}
