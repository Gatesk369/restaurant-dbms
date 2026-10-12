import type { Route } from "./+types/orders";
import { PageHeader } from "~/components/staff/PageHeader";
import { getScreen } from "~/lib/access";

export const handle = { screen: "orders" } as const;

const screen = getScreen("orders");

export function meta({}: Route.MetaArgs) {
  return [{ title: `${screen.title} · Restaurant DBMS` }];
}

// Placeholder: the screen itself is built in Phase 2 of the frontend plan.
export default function Orders() {
  return (
    <>
      <PageHeader title={screen.title} subtitle={screen.subtitle} />
      <p className="m-0 text-body tracking-body text-moss">This screen is built in Phase 2.</p>
    </>
  );
}
