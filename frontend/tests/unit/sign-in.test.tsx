import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import SignIn, { clientAction, clientLoader } from "~/routes/sign-in";
import { getStaffSession, setStaffSession } from "~/lib/session";

function mountSignIn(initialEntry = "/") {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        Component: SignIn,
        loader: clientLoader,
        // The framework passes route-module args; the plain router passes
        // only the request, which is all the action reads.
        action: ({ request }) => clientAction({ request } as Parameters<typeof clientAction>[0]),
      },
      { path: "/orders", element: <p>Orders screen</p> },
      { path: "/payments", element: <p>Payments screen</p> },
    ],
    { initialEntries: [initialEntry] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

function mockLogin(status: number, body: unknown) {
  // A fresh Response per call: a body can only be read once.
  return vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

const peter = {
  staff_id: 1004,
  username: "okello.peter",
  display_name: "Okello Peter",
  role: "wait_staff",
};

afterEach(() => vi.restoreAllMocks());

describe("sign-in form", () => {
  it("shows the four role cards with Cashier chosen first", async () => {
    mountSignIn();
    const group = await screen.findByRole("group", { name: "Sign in as" });
    const radios = within(group).getAllByRole("radio");
    expect(radios.map((r) => r.getAttribute("value"))).toEqual([
      "cashier",
      "wait_staff",
      "kitchen",
      "manager",
    ]);
    expect(radios[0]).toBeChecked();
    expect(within(group).getByText("Updates order status")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Restaurant DBMS" })).toBeInTheDocument();
  });

  it("explains the credential rule without calling the API", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    mountSignIn();
    await userEvent.type(await screen.findByLabelText("Username"), "okello.peter");
    await userEvent.type(screen.getByLabelText("Password"), "abc");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error: enter your username and a password of at least 4 characters.",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("shows the server's message when the credentials are wrong", async () => {
    mockLogin(401, { detail: "Invalid username or password." });
    mountSignIn();
    await userEvent.type(await screen.findByLabelText("Username"), "okello.peter");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Error: Invalid username or password.",
    );
    expect(getStaffSession()).toBeNull();
  });

  it("clears the error as soon as a field is edited, and shows a repeat failure again", async () => {
    mockLogin(401, { detail: "Invalid username or password." });
    mountSignIn();
    await userEvent.type(await screen.findByLabelText("Username"), "okello.peter");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByRole("alert");

    await userEvent.type(screen.getByLabelText("Password"), "!");
    expect(screen.queryByRole("alert")).toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password.");
  });

  it("reports an unreachable server", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"));
    mountSignIn();
    await userEvent.type(await screen.findByLabelText("Username"), "okello.peter");
    await userEvent.type(screen.getByLabelText("Password"), "DemoPass123!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Error: Could not reach the server");
  });

  it("says why the visitor was sent back when the session expired", async () => {
    mountSignIn("/?reason=expired");
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Your session has ended. Sign in again.",
    );
  });
});

describe("direct workspace entry", () => {
  const roles = [
    ["cashier", "/payments", "Payments screen"],
    ["wait_staff", "/orders", "Orders screen"],
    ["kitchen", "/orders", "Orders screen"],
    ["manager", "/orders", "Orders screen"],
  ] as const;

  it.each(roles)("sends authenticated %s directly to %s", async (role, path, heading) => {
    const fetchSpy = mockLogin(200, { token: "tok", staff: { ...peter, role } });
    const router = mountSignIn();
    await userEvent.type(await screen.findByLabelText("Username"), "okello.peter");
    await userEvent.type(screen.getByLabelText("Password"), "DemoPass123!");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText(heading)).toBeInTheDocument();
    expect(router.state.location.pathname).toBe(path);
    expect(getStaffSession()?.staff.role).toBe(role);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(String(url)).toBe("http://127.0.0.1:8000/api/auth/login/");
    expect(JSON.parse(String(init?.body))).toEqual({
      username: "okello.peter",
      password: "DemoPass123!",
    });
    expect(screen.queryByText("Startup menu")).toBeNull();
  });

  it.each(roles)(
    "redirects an existing %s session from root to %s",
    async (role, path, heading) => {
      setStaffSession({ token: "t", staff: { ...peter, role } });
      const router = mountSignIn("/?next=/reports");
      expect(await screen.findByText(heading)).toBeInTheDocument();
      await waitFor(() => expect(router.state.location.pathname).toBe(path));
    },
  );

  it("uses the server role rather than the role card or a return URL", async () => {
    mockLogin(200, { token: "tok", staff: { ...peter, role: "cashier" } });
    const router = mountSignIn("/?next=https://example.com&returnTo=/reports");
    await userEvent.click(await screen.findByRole("radio", { name: /^Manager/ }));
    await userEvent.type(screen.getByLabelText("Username"), "amina");
    await userEvent.type(screen.getByLabelText("Password"), "secret123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Payments screen")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/payments");
  });
});
