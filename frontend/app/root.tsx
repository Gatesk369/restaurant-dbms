import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";

import type { Route } from "./+types/root";
import { Button } from "./components/ui/Button";
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
  return <Outlet />;
}

export function HydrateFallback() {
  return (
    <p role="status" className="p-6 text-body text-moss">
      Loading…
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
      <p className="mt-1 text-body tracking-body text-moss">{details}</p>
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
