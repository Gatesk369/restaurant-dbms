import { type RouteConfig, index, layout, route } from "@react-router/dev/routes";

export default [
  index("routes/sign-in.tsx"),
  // The customer ordering station: no staff session, its own full-screen canvas.
  route("station", "routes/station.tsx"),
  layout("routes/staff-shell.tsx", [
    route("orders", "routes/orders.tsx"),
    route("payments", "routes/payments.tsx"),
    route("menu", "routes/menu.tsx"),
    route("reports", "routes/reports.tsx"),
  ]),
  // The primitives sheet used by the visual tests. Built only when
  // VITE_STYLEGUIDE=true, so it never ships in the production image.
  ...(process.env.VITE_STYLEGUIDE === "true" ? [route("styleguide", "routes/styleguide.tsx")] : []),
] satisfies RouteConfig;
