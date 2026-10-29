import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "tests",
  testMatch: ["e2e/**/*.spec.ts", "visual/**/*.spec.ts"],
  fullyParallel: true,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    ...devices["Desktop Chrome"],
  },
  // Tests run against the production build so they see what ships.
  webServer: {
    command: `npm run build && npx vite preview --outDir build/client --host 127.0.0.1 --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    // The primitives sheet (/styleguide) is only routed in this build.
    env: {
      VITE_STYLEGUIDE: "true",
      VITE_PROTOTYPE_CONTROLS: "true",
      VITE_DEMO_PREFILL: "false",
      VITE_DEMO_PASSWORD: "",
      VITE_TABLE_IDS: "1-12",
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
