import { Outlet, useMatches, useNavigate } from "react-router";

import type { Route } from "./+types/staff-shell";
import { PageHeader } from "~/components/staff/PageHeader";
import { Sidebar } from "~/components/staff/Sidebar";
import { LockedTile } from "~/components/ui/LockedTile";
import { canAccess, getScreen, type ScreenKey } from "~/lib/access";
import { ROLE_LABELS } from "~/lib/api/types";
import { requireStaffSession } from "~/lib/auth-guard";
import { clearStaffSession } from "~/lib/session";

export async function clientLoader() {
  const { staff } = requireStaffSession();
  return { staff };
}

/** Child routes declare which screen they are: `export const handle = { screen: "orders" }`. */
function useCurrentScreen(): ScreenKey | null {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const handle = matches[i].handle as { screen?: ScreenKey } | undefined;
    if (handle?.screen) return handle.screen;
  }
  return null;
}

export default function StaffShell({ loaderData }: Route.ComponentProps) {
  const { staff } = loaderData;
  const navigate = useNavigate();
  const key = useCurrentScreen();
  const screen = key ? getScreen(key) : null;
  const locked = key !== null && !canAccess(staff.role, key);

  function signOut() {
    clearStaffSession();
    navigate("/");
  }

  return (
    <div className="flex flex-wrap items-stretch bg-page text-forest">
      <Sidebar staff={staff} onSignOut={signOut} />
      <div className="min-w-0 flex-[1_1_640px]">
        <div className="mx-auto box-border flex max-w-content flex-col gap-6 px-6 pt-6 pb-12">
          {locked && screen ? (
            <>
              <PageHeader title={screen.title} />
              <LockedTile
                title={screen.title}
                icon="lock"
                roleLabel={ROLE_LABELS[staff.role]}
                className="max-w-sm"
              />
            </>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}
