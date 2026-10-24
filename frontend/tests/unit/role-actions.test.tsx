import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ReceiptPanel } from "~/components/staff/ReceiptPanel";
import { ROLES } from "~/lib/api/types";
import { canAccess } from "~/lib/access";
import { setStaffSession } from "~/lib/session";
import { clientLoader as menuLoader } from "~/routes/menu";
import { clientLoader as paymentsLoader } from "~/routes/payments";
import { clientLoader as reportsLoader } from "~/routes/reports";

afterEach(() => vi.restoreAllMocks());

describe("receipt actions", () => {
  it.each(ROLES)("only shows permitted report links for %s", (role) => {
    const router = createMemoryRouter([
      {
        path: "/",
        element: (
          <ReceiptPanel
            receipt={{
              paymentNumber: "PAY-1",
              orderNumber: "ORD-1",
              table: "Table 1",
              method: "Cash",
              amount: 12000,
              change: 0,
            }}
            cashier="Amina"
            role={role}
            roleLabel={role}
            moreWaiting={false}
            onNext={vi.fn()}
          />
        ),
      },
    ]);
    render(<RouterProvider router={router} />);
    expect(screen.queryByRole("link", { name: "See sales report" }) !== null).toBe(
      canAccess(role, "reports"),
    );
    expect(screen.getByRole("link", { name: "Back to orders" })).toHaveAttribute("href", "/orders");
  });
});

describe("protected loaders", () => {
  for (const role of ROLES) {
    for (const destination of ["menu", "payments", "reports"] as const) {
      if (canAccess(role, destination)) continue;
      it(`redirects ${role} from ${destination} before fetching data`, async () => {
        setStaffSession({ token: "t", staff: { staff_id: 1, username: "u", role } });
        const fetchSpy = vi.spyOn(globalThis, "fetch");
        const load =
          destination === "menu"
            ? menuLoader
            : destination === "payments"
              ? paymentsLoader
              : () =>
                  reportsLoader({ request: new Request("http://localhost/reports") } as Parameters<
                    typeof reportsLoader
                  >[0]);
        await expect(load()).rejects.toMatchObject({ status: 302 });
        expect(fetchSpy).not.toHaveBeenCalled();
      });
    }
  }
});
