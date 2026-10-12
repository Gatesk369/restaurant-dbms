import { useRouteLoaderData } from "react-router";

import type { Staff } from "./api/types";

/** The signed-in staff member, from the staff shell's loader. */
export function useStaff(): Staff {
  const data = useRouteLoaderData<{ staff: Staff }>("routes/staff-shell");
  if (!data) throw new Error("useStaff must be used inside the staff shell");
  return data.staff;
}
