import type { Page } from "@playwright/test";

type Role = "cashier" | "wait_staff" | "kitchen" | "manager";

export const PERSONAS = {
  waiter: {
    staff_id: 1004,
    username: "okello.peter",
    display_name: "Okello Peter",
    role: "wait_staff",
  },
  cashier: {
    staff_id: 1001,
    username: "nakato.sarah",
    display_name: "Nakato Sarah",
    role: "cashier",
  },
  manager: {
    staff_id: 1018,
    username: "tumusiime.ruth",
    display_name: "Tumusiime Ruth",
    role: "manager",
  },
  kitchen: {
    staff_id: 1011,
    username: "mugisha.brian",
    display_name: "Mugisha Brian",
    role: "kitchen",
  },
} as const satisfies Record<
  string,
  { staff_id: number; username: string; display_name: string; role: Role }
>;

/** Starts the page signed in, as the app itself would after a successful login. */
export async function signInAs(page: Page, persona: (typeof PERSONAS)[keyof typeof PERSONAS]) {
  await page.addInitScript(
    (session) => {
      sessionStorage.setItem("rdbms.staff", JSON.stringify(session));
    },
    { token: "e2e-token", staff: persona },
  );
}
