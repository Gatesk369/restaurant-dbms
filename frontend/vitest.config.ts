import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/unit/setup.ts"],
    restoreMocks: true,
    // jsdom route tests are slow when several workers compete for the CPU.
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
