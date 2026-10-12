import { demoPassword, demoPrefill } from "./env";
import type { Role } from "./api/types";

/**
 * Seeded development accounts (seed.sql). Choosing a role card on the sign-in
 * form fills in the matching username when VITE_DEMO_PREFILL=true, as the
 * mock-up does. The server's role is authoritative either way.
 */
const DEMO_USERNAMES: Record<Role, string> = {
  cashier: "demo_amina",
  wait_staff: "demo_faridah",
  kitchen: "demo_kevin",
  manager: "demo_sarah",
};

export function demoUsername(role: Role, enabled: boolean = demoPrefill): string | null {
  return enabled ? DEMO_USERNAMES[role] : null;
}

export function demoCredentials(
  role: Role,
  enabled: boolean = demoPrefill,
  password: string = demoPassword,
): { username: string; password: string } | null {
  const username = demoUsername(role, enabled);
  return username === null ? null : { username, password };
}
