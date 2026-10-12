import type { CustomerSession, StaffSession } from "./api/types";
import { isRole } from "./api/types";

/**
 * Tokens live in sessionStorage (plan D4): the store is tab-scoped, so a shared
 * counter terminal forgets the session when the tab closes. Every access is
 * wrapped because storage can be missing or throw (private windows, tests).
 */

const STAFF_KEY = "rdbms.staff";
const CUSTOMER_KEY = "rdbms.customer";

function read(key: string): unknown {
  try {
    if (typeof sessionStorage === "undefined") return null;
    const text = sessionStorage.getItem(key);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable: the session simply will not survive a refresh.
  }
}

function remove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing to clear.
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getStaffSession(): StaffSession | null {
  const data = read(STAFF_KEY);
  if (!isObject(data) || typeof data.token !== "string" || !isObject(data.staff)) {
    return null;
  }
  const staff = data.staff;
  if (
    typeof staff.staff_id !== "number" ||
    typeof staff.username !== "string" ||
    !isRole(staff.role)
  ) {
    return null;
  }
  return {
    token: data.token,
    staff: {
      staff_id: staff.staff_id,
      username: staff.username,
      role: staff.role,
      ...(typeof staff.display_name === "string" ? { display_name: staff.display_name } : {}),
    },
  };
}

export function setStaffSession(session: StaffSession): void {
  write(STAFF_KEY, session);
}

export function clearStaffSession(): void {
  remove(STAFF_KEY);
}

export function getCustomerSession(): CustomerSession | null {
  const data = read(CUSTOMER_KEY);
  if (
    !isObject(data) ||
    typeof data.customer_id !== "number" ||
    typeof data.table_id !== "number" ||
    typeof data.session_token !== "string"
  ) {
    return null;
  }
  return {
    customer_id: data.customer_id,
    table_id: data.table_id,
    session_token: data.session_token,
  };
}

export function setCustomerSession(session: CustomerSession): void {
  write(CUSTOMER_KEY, session);
}

export function clearCustomerSession(): void {
  remove(CUSTOMER_KEY);
}
