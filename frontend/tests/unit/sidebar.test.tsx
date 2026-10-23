import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, it, vi } from "vitest";

import { Sidebar } from "~/components/staff/Sidebar";
import { requireStaffSession, requireStaffScreen } from "~/lib/auth-guard";
import { setStaffSession } from "~/lib/session";
import { SCREENS, canAccess } from "~/lib/access";
import { ROLES, type Staff } from "~/lib/api/types";

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
  it("lists all four screens for managers and marks the current page", () => {
    renderSidebar({ ...peter, role: "manager" }, "/payments");
    const nav = screen.getByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Orders", "Payments", "Menu", "Reports"]);
    expect(links.map((l) => l.getAttribute("aria-current"))).toEqual([null, "page", null, null]);
  });

  it.each([
    ["cashier", ["Orders", "Payments"]],
    ["wait_staff", ["Orders"]],
    ["kitchen", ["Orders"]],
    ["manager", ["Orders", "Payments", "Menu", "Reports"]],
  ] as const)("shows only permitted links for %s", (role, labels) => {
    renderSidebar({ ...peter, role }, "/orders");
    expect(
      within(screen.getByRole("navigation", { name: "Main" }))
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(labels);
    expect(screen.queryByText(/Locked for/)).toBeNull();
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

describe("requireStaffScreen", () => {
  for (const role of ROLES) {
    for (const destination of SCREENS) {
      it(`${role} ${canAccess(role, destination.key) ? "can open" : "is redirected from"} ${destination.key}`, () => {
        setStaffSession({ token: "t", staff: { staff_id: 1, username: "u", role } });
        if (canAccess(role, destination.key)) {
          expect(requireStaffScreen(destination.key).staff.role).toBe(role);
        } else {
          let thrown: unknown;
          try {
            requireStaffScreen(destination.key);
          } catch (error) {
            thrown = error;
          }
          expect(thrown).toBeInstanceOf(Response);
          expect((thrown as Response).headers.get("Location")).toBe("/orders");
        }
      });
    }
  }
});
