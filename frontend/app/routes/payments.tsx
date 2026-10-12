import type { Route } from "./+types/payments";
import { PageHeader } from "~/components/staff/PageHeader";
import { getScreen } from "~/lib/access";

export const handle = { screen: "payments" } as const;

const screen = getScreen("payments");

export function meta({}: Route.MetaArgs) {
  return [{ title: `${screen.title} · Restaurant DBMS` }];
}

// Placeholder: the screen itself is built in Phase 3 of the frontend plan.
export default function Payments() {
  return (
    <>
      <PageHeader title={screen.title} subtitle={screen.subtitle} />
      <p className="m-0 text-body tracking-body text-moss">This screen is built in Phase 3.</p>
    </>
  );
}
