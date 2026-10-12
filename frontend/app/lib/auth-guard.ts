import { redirect } from "react-router";

import type { StaffSession } from "./api/types";
import { getStaffSession } from "./session";

/**
 * Call from a clientLoader. Without a staff session the visitor goes back to
 * the sign-in page; the API still enforces everything on its own.
 */
export function requireStaffSession(): StaffSession {
  const session = getStaffSession();
  if (!session) throw redirect("/");
  return session;
}
