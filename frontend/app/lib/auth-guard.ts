import { redirect } from "react-router";

import type { StaffSession } from "./api/types";
import { getStaffSession } from "./session";

/** Why the visitor was sent back to sign-in; the page words it. */
export type SignInReason = "expired";

/** Redirect to the sign-in page, optionally saying why. */
export function signInRedirect(reason?: SignInReason): Response {
  return redirect(reason ? `/?reason=${reason}` : "/");
}

/**
 * Call from a clientLoader. Without a staff session the visitor goes back to
 * the sign-in page; the API still enforces everything on its own.
 */
export function requireStaffSession(): StaffSession {
  const session = getStaffSession();
  if (!session) throw signInRedirect();
  return session;
}
