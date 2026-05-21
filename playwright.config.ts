import { defineConfig, devices } from "@playwright/test";
import path from "path";

// Auth state is saved once and reused across all test suites.
export const AUTH_STATE = path.join(__dirname, "tests/e2e/.auth-state.json");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,         // ordered by dependency: auth → features
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,                   // sequential to avoid auth conflicts
  reporter: [
    ["html", { open: "never" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    // 1. Auth setup — runs first, saves session state
    {
      name: "auth-setup",
      testMatch: "**/auth.setup.ts",
    },
    // 2. All feature tests — use saved session
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: AUTH_STATE,
      },
      dependencies: ["auth-setup"],
      testIgnore: "**/auth.setup.ts",
    },
  ],
  // Start dev server if not already running
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
