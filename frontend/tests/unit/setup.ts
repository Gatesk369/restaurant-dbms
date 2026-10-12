import "@testing-library/jest-dom/vitest";
import { cleanup, configure } from "@testing-library/react";
import { afterEach } from "vitest";

// findBy* and waitFor give a slow CI worker time to render a route.
configure({ asyncUtilTimeout: 5000 });

afterEach(() => {
  // Vitest globals are off, so Testing Library does not unmount on its own.
  cleanup();
  sessionStorage.clear();
});
