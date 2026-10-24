import { useState } from "react";
import { Form, redirect, useNavigation } from "react-router";
import { useActionData, useSearchParams } from "react-router";

import type { Route } from "./+types/sign-in";
import { Button } from "~/components/ui/Button";
import { Field, FieldError, Input } from "~/components/ui/Field";
import { RadioCard, RadioCardGroup } from "~/components/ui/RadioCard";
import { defaultScreenForRole } from "~/lib/access";
import { ApiError } from "~/lib/api/client";
import { login } from "~/lib/api/auth";
import { ROLE_LABELS, type Role } from "~/lib/api/types";
import { demoCredentials } from "~/lib/demo";
import { getStaffSession, setStaffSession } from "~/lib/session";
import { CREDENTIALS_ERROR, canSignIn } from "~/lib/validation";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Sign in · Restaurant DBMS" }];
}

/** Role cards in the mock-up's order, with their captions. */
const ROLE_CARDS: { role: Role; hint: string }[] = [
  { role: "cashier", hint: "Takes payments" },
  { role: "wait_staff", hint: "Serves assigned orders" },
  { role: "kitchen", hint: "Updates order status" },
  { role: "manager", hint: "Menu and reports" },
];

export async function clientLoader() {
  const session = getStaffSession();
  if (session) return redirect(defaultScreenForRole(session.staff.role).path);
  return null;
}

export async function clientAction({ request }: Route.ClientActionArgs) {
  const form = await request.formData();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!canSignIn(username, password)) return { error: CREDENTIALS_ERROR };

  try {
    const session = await login(username, password);
    setStaffSession(session);
    return redirect(defaultScreenForRole(session.staff.role).path);
  } catch (error) {
    if (error instanceof ApiError) {
      const message = error.detail || error.fields.username || error.fields.password;
      return { error: `Error: ${message}` };
    }
    throw error;
  }
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
          Sign in to go straight to your workspace.
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

export default function SignIn() {
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
          <SignInForm />
        </main>
      </div>
    </div>
  );
}
