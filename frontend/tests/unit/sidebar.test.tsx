import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "~/components/staff/Sidebar";
import { requireStaffSession } from "~/lib/auth-guard";
import { setStaffSession } from "~/lib/session";
import type { Staff } from "~/lib/api/types";

function renderSidebar(staff: Staff, path: string, onSignOut = vi.fn()) {
  const router = createMemoryRouter(
    [{ path: "*", element: <Sidebar staff={staff} onSignOut={onSignOut} /> }],
    { initialEntries: [path] },
  );
  render(<RouterProvider router={router} />);
  return onSignOut;
}

const peter: Staff = {
  staff_id: 1,
  username: "okello.peter",
  display_name: "Okello Peter",
  role: "wait_staff",
};

describe("Sidebar", () => {
  it("lists the four screens in order and marks the current page", () => {
    renderSidebar(peter, "/payments");
    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Orders", "Payments", "Menu", "Reports"]);
    expect(links.map((l) => l.getAttribute("aria-current"))).toEqual([null, "page", null, null]);
  });

  it("shows who is signed in and their role", () => {
    renderSidebar(peter, "/orders");
    expect(screen.getByText("Okello Peter")).toBeInTheDocument();
    expect(screen.getByText("Wait Staff")).toBeInTheDocument();
  });

  it("falls back to the username when there is no display name", () => {
    renderSidebar({ staff_id: 2, username: "demo_amina", role: "cashier" }, "/orders");
    expect(screen.getByText("demo_amina")).toBeInTheDocument();
    expect(screen.getByText("Cashier")).toBeInTheDocument();
  });

  it("signs out through a button", async () => {
    const onSignOut = renderSidebar(peter, "/orders");
    await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
    expect(onSignOut).toHaveBeenCalledOnce();
  });
});

describe("requireStaffSession", () => {
  it("redirects to sign-in when there is no session", () => {
    let thrown: unknown;
    try {
      requireStaffSession();
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).headers.get("Location")).toBe("/");
  });

  it("returns the session when signed in", () => {
    setStaffSession({ token: "t", staff: { staff_id: 1, username: "u", role: "manager" } });
    expect(requireStaffSession().staff.role).toBe("manager");
  });
});
