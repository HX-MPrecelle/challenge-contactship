/**
 * Logout test — intentionally runs LAST (z- prefix = alphabetically after all
 * other spec files). Supabase signOut() revokes the server-side session
 * (scope:'global'), which would invalidate the shared .auth-state.json and
 * cause all subsequent tests to fail if run earlier.
 *
 * auth.setup.ts always runs first on each new test run and creates a fresh
 * session, so a revoked session from the previous run is never a problem.
 */

import { test, expect } from "@playwright/test";

test.describe("Logout (runs last)", () => {
  test("logout via sidebar redirects to login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    const logoutBtn = page.getByRole("button", { name: /cerrar sesión/i });
    await expect(logoutBtn).toBeVisible({ timeout: 10_000 });
    await logoutBtn.click();

    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);

    // Confirm we're on the login page
    await expect(
      page.getByRole("heading", { name: "Bienvenido" })
    ).toBeVisible();
  });

  test("after logout, accessing protected route redirects to login", async ({ page }) => {
    // First log out using a fresh page instance
    await page.goto("/dashboard");
    await page.waitForLoadState("load");

    // Check if still logged in — might already be logged out from previous test
    const logoutBtn = page.getByRole("button", { name: /cerrar sesión/i });
    const isLoggedIn = (await logoutBtn.count()) > 0;

    if (isLoggedIn) {
      await logoutBtn.click();
      await page.waitForURL(/\/login/, { timeout: 10_000 });
    }

    // Now try a protected route
    await page.goto("/contacts");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
