import type { Route } from "./+types/sign-in";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Sign in · Restaurant DBMS" }];
}

// Placeholder until Phase 1 (sign-in and startup menu). It exists so the
// foundations can be built, served and token-tested end to end.
export default function SignIn() {
  return (
    <main className="mx-auto flex min-h-screen max-w-signin flex-col justify-center gap-4 px-4 py-12">
      <h1 className="text-hero font-normal">Restaurant DBMS</h1>
      <p className="text-heading tracking-lede">
        Orders, payments, menu items and sales reports for the dining room, the kitchen and the
        till.
      </p>
      <p className="text-label tracking-caption text-moss">
        Makerere University · CSC2107 Database Management Systems
      </p>
    </main>
  );
}
