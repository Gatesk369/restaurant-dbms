import { redirect } from "react-router";

import { ApiError } from "./api/client";

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

/**
 * For clientLoader catch blocks: an ended session goes back to sign-in with a
 * reason; every other error is rethrown for the route's error boundary.
 */
export function rethrowApiError(error: unknown): never {
  if (error instanceof ApiError && error.isUnauthorized) throw signInRedirect("expired");
  throw error;
}
