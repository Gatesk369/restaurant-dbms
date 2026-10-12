import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  // Vitest globals are off, so Testing Library does not unmount on its own.
  cleanup();
  sessionStorage.clear();
});
