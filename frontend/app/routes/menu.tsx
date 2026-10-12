import type { Route } from "./+types/menu";
import { PageHeader } from "~/components/staff/PageHeader";
import { getScreen } from "~/lib/access";

export const handle = { screen: "menu" } as const;

const screen = getScreen("menu");

export function meta({}: Route.MetaArgs) {
  return [{ title: `${screen.title} · Restaurant DBMS` }];
}

// Placeholder: the screen itself is built in Phase 4 of the frontend plan.
export default function Menu() {
  return (
    <>
      <PageHeader title={screen.title} subtitle={screen.subtitle} />
      <p className="m-0 text-body tracking-body text-moss">This screen is built in Phase 4.</p>
    </>
  );
}
