import { Outlet, useNavigate, useNavigation, useRevalidator } from "react-router";

import type { Route } from "./+types/staff-shell";
import { Sidebar } from "~/components/staff/Sidebar";
import { requireStaffSession } from "~/lib/auth-guard";
import { clearStaffSession } from "~/lib/session";

export async function clientLoader() {
  const { staff } = requireStaffSession();
  return { staff };
}

export default function StaffShell({ loaderData }: Route.ComponentProps) {
  const { staff } = loaderData;
  const navigate = useNavigate();
  const navigation = useNavigation();
  const revalidator = useRevalidator();

  function signOut() {
    clearStaffSession();
    navigate("/");
  }

  return (
    <div className="flex min-h-dvh items-stretch bg-page max-[880px]:flex-col text-forest">
      <Sidebar staff={staff} onSignOut={signOut} />
      <main
        className="min-w-0 flex-1"
        aria-busy={navigation.state !== "idle" || revalidator.state !== "idle" || undefined}
      >
        <div className="box-border flex w-full flex-col gap-6 px-6 pt-6 pb-12">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
