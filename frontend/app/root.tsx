import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useNavigation,
} from "react-router";

import type { Route } from "./+types/root";
import { Button, Spinner } from "./components/ui/Button";
import { SCREENS } from "./lib/access";
import { ApiError } from "./lib/api/client";
import "./app.css";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const navigation = useNavigation();
  const destination = SCREENS.find((screen) => screen.path === navigation.location?.pathname);
  const label = `Loading ${destination?.title ?? (navigation.location?.pathname === "/station" ? "menu" : "sign-in")}…`;
  return (
    <>
      {navigation.state === "loading" ? (
        <p
          role="status"
          className="fixed top-3 left-1/2 z-50 m-0 flex -translate-x-1/2 items-center gap-2 rounded-md bg-forest px-4 py-3 text-body font-bold text-white shadow-toast"
        >
          <Spinner />
          {label}
        </p>
      ) : null}
      <Outlet />
    </>
  );
}

export function HydrateFallback() {
  return (
    <p role="status" aria-busy="true" className="flex items-center gap-2 p-6 text-body text-moss">
      <Spinner /> Loading…
    </p>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Something went wrong";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "Page not found" : "Error";
    details =
      error.status === 404 ? "The requested page could not be found." : error.statusText || details;
  } else if (error instanceof ApiError) {
    // A failed request: say what the server or network said and let them retry.
    message = error.isNetwork ? "Can't reach the server" : "Couldn't load this page";
    details = error.detail;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-signin p-6">
      <h1 className="text-title font-normal">{message}</h1>
      <p role="alert" className="mt-1 text-body tracking-body text-moss">
        {details}
      </p>
      {error instanceof ApiError ? (
        <Button className="mt-4" onClick={() => window.location.reload()}>
          Try again
        </Button>
      ) : null}
      {stack && (
        <pre className="mt-4 w-full overflow-x-auto rounded-md border border-tea p-4 text-label">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
