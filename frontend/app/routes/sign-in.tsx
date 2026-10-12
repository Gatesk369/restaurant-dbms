import { useState } from "react";
import { Form, redirect, useLoaderData, useNavigation, useRevalidator } from "react-router";
import { useActionData, useSearchParams } from "react-router";

import type { Route } from "./+types/sign-in";
import { StartupTile } from "~/components/staff/StartupTile";
import { Button } from "~/components/ui/Button";
import { Field, FieldError, Input } from "~/components/ui/Field";
import { Icon } from "~/components/ui/Icon";
import { LockedTile } from "~/components/ui/LockedTile";
import { RadioCard, RadioCardGroup } from "~/components/ui/RadioCard";
import { SCREENS, canAccess } from "~/lib/access";
import { ApiError } from "~/lib/api/client";
import { login, staffName } from "~/lib/api/auth";
import { ROLE_LABELS, type Role } from "~/lib/api/types";
import { demoCredentials } from "~/lib/demo";
import { clearStaffSession, getStaffSession, setStaffSession } from "~/lib/session";
import { CREDENTIALS_ERROR, canSignIn } from "~/lib/validation";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Sign in · Restaurant DBMS" }];
}

/** Role cards in the mock-up's order, with their captions. */
const ROLE_CARDS: { role: Role; hint: string }[] = [
  { role: "cashier", hint: "Takes payments" },
  { role: "wait_staff", hint: "Creates orders" },
  { role: "kitchen", hint: "Updates order status" },
  { role: "manager", hint: "Menu and reports" },
];

export async function clientLoader() {
  return { staff: getStaffSession()?.staff ?? null };
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!canSignIn(username, password)) return { error: CREDENTIALS_ERROR };

  try {
    setStaffSession(await login(username, password));
  } catch (error) {
    if (error instanceof ApiError) {
      const message = error.detail || error.fields.username || error.fields.password;
      return { error: `Error: ${message}` };
    }
    throw error;
  }
  // Same URL: the loader reruns and the page switches to the startup menu.
  return redirect("/");
}

function SignInForm() {
  const actionData = useActionData<typeof clientAction>();
  const navigation = useNavigation();
  const [params] = useSearchParams();
  const initial = demoCredentials("cashier");
  const [role, setRole] = useState<Role>("cashier");
  const [username, setUsername] = useState(initial?.username ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  // An error belongs to the attempt that produced it: editing a field or
  // picking a role dismisses that attempt's result (each submit returns a new
  // action object, so the same message shows again after a repeat failure).
  const [dismissed, setDismissed] = useState<unknown>(null);
  const error = actionData?.error && actionData !== dismissed ? actionData.error : null;
  const submitting = navigation.state === "submitting";

  function pickRole(next: Role) {
    setRole(next);
    const demo = demoCredentials(next);
    if (demo) {
      setUsername(demo.username);
      setPassword(demo.password);
    }
    setDismissed(actionData);
  }

  return (
    <Form method="post" noValidate className="flex flex-col gap-6">
      <div>
        <h2 className="m-0 text-title font-normal">Sign in</h2>
        <p className="mt-1 mb-0 text-body tracking-body text-moss">
          Choose your role. The startup menu then shows the screens that role can use.
        </p>
      </div>

      {params.get("reason") === "expired" ? (
        <p
          role="status"
          className="m-0 rounded-md bg-tea px-4 py-3 text-body font-bold tracking-body"
        >
          Your session has ended. Sign in again.
        </p>
      ) : null}

      <RadioCardGroup legend="Sign in as">
        {ROLE_CARDS.map((card) => (
          <RadioCard
            key={card.role}
            name="role"
            value={card.role}
            checked={role === card.role}
            onChange={() => pickRole(card.role)}
            label={ROLE_LABELS[card.role]}
            hint={card.hint}
          />
        ))}
      </RadioCardGroup>

      <div className="flex flex-wrap gap-4">
        <Field label="Username" className="flex-[1_1_200px]">
          <Input
            name="username"
            autoComplete="off"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setDismissed(actionData);
            }}
          />
        </Field>
        <Field label="Password" className="flex-[1_1_200px]">
          <Input
            name="password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setDismissed(actionData);
            }}
          />
        </Field>
      </div>

      {error ? <FieldError>{error}</FieldError> : null}

      <Button type="submit" size="lg" pending={submitting} className="min-w-40 self-start">
        Sign in
      </Button>
    </Form>
  );
}

function StartupMenu({
  staff,
}: {
  staff: NonNullable<Route.ComponentProps["loaderData"]["staff"]>;
}) {
  const revalidator = useRevalidator();

  function signOut() {
    clearStaffSession();
    void revalidator.revalidate();
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="m-0 text-title font-normal">Startup menu</h2>
          <p className="mt-1 mb-0 text-body tracking-body text-moss">
            Signed in as {staffName(staff)}, {ROLE_LABELS[staff.role]}
          </p>
        </div>
        <Button variant="tonal" size="lg" onClick={signOut}>
          <Icon name="signOut" />
          Sign out
        </Button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
        {SCREENS.map((screen) => (
          <div key={screen.key}>
            {canAccess(staff.role, screen.key) ? (
              <StartupTile
                to={screen.path}
                title={screen.title}
                description={screen.description}
                icon={screen.icon}
              />
            ) : (
              <LockedTile title={screen.title} roleLabel={ROLE_LABELS[staff.role]} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignIn() {
  const { staff } = useLoaderData<typeof clientLoader>();

  return (
    <div className="box-border flex min-h-screen items-center justify-center bg-page px-4 py-12 text-forest">
      {/* The mock-up card is content-box: 1040px of content plus its 1px border. */}
      <div className="box-content flex w-full max-w-signin flex-wrap overflow-hidden rounded-lg border border-tea">
        <aside className="box-border flex min-w-0 flex-[1_1_320px] flex-col justify-between gap-12 bg-forest px-8 py-12 text-page">
          <div className="flex flex-col gap-4">
            <h1 className="m-0 text-hero font-normal">Restaurant DBMS</h1>
            <p className="m-0 text-heading tracking-lede">
              Orders, payments, menu items and sales reports for the dining room, the kitchen and
              the till.
            </p>
          </div>
          <p className="m-0 text-label tracking-caption">
            Makerere University · CSC2107 Database Management Systems
          </p>
        </aside>
        <main className="box-border min-w-0 flex-[1.5_1_440px] bg-page px-8 py-12">
          {staff ? <StartupMenu staff={staff} /> : <SignInForm />}
        </main>
      </div>
    </div>
  );
}
