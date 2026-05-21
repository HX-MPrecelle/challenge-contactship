/**
 * Auth setup — runs once before all tests.
 *
 * Needs credentials in .env.local (or env vars):
 *   E2E_EMAIL=your@email.com
 *   E2E_PASSWORD=yourpassword
 *
 * The saved session is stored in tests/e2e/.auth-state.json and reused by
 * all test suites so the login flow isn't repeated.
 */

import { test as setup, expect } from "@playwright/test";
import { AUTH_STATE } from "../../playwright.config";

const EMAIL = process.env.E2E_EMAIL ?? "test@contactship.dev";
const PASSWORD = process.env.E2E_PASSWORD ?? "password123";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");

  // Login page should render the email field
  await expect(page.getByLabel("Email")).toBeVisible();

  await page.getByLabel("Email").fill(EMAIL);
  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();

  // After login, Supabase sets auth cookies and redirects to /dashboard
  // (or /onboarding if first time). Either way, we're out of /login.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 15_000,
  });

  // Persist auth cookies + localStorage for all subsequent tests
  await page.context().storageState({ path: AUTH_STATE });
});
