import type { Page } from "@playwright/test";

type Role = "cashier" | "wait_staff" | "kitchen" | "manager";

export interface Persona {
  staff_id: number;
  username: string;
  display_name: string;
  role: Role;
}

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
export async function signInAs(page: Page, persona: Persona) {
  await page.addInitScript(
    (session) => {
      sessionStorage.setItem("rdbms.staff", JSON.stringify(session));
    },
    { token: "e2e-token", staff: persona },
  );
}

const API = "http://127.0.0.1:8000";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
};

interface Reply {
  status?: number;
  body: unknown;
}

/**
 * Answers one API path from the test. Handles the CORS preflight the browser
 * sends for JSON requests from another origin.
 */
export async function mockApi(page: Page, path: string, reply: () => Reply) {
  await page.route(`${API}${path}`, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const { status = 200, body } = reply();
    await route.fulfill({
      status,
      headers: { ...CORS, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  });
}

export function loginResponse(persona: Persona) {
  return { token: "e2e-token", staff: persona };
}

/**
 * Wait until Lato 400 and 700 are loaded. `document.fonts.ready` alone can
 * resolve before a lazily requested face has started loading, which leaves the
 * screenshot in the fallback font.
 */
export async function fontsReady(page: Page) {
  await page.evaluate(async () => {
    await Promise.all([document.fonts.load("400 16px Lato"), document.fonts.load("700 16px Lato")]);
    await document.fonts.ready;
  });
}
