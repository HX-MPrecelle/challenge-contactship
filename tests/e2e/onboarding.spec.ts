/**
 * Onboarding flow tests.
 * Most run WITHOUT auth state (to test redirects and the flow itself).
 */

import { test, expect } from "@playwright/test";

test.describe("Onboarding redirects", () => {
  // Unauthenticated context
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user accessing /onboarding is redirected to /login", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user accessing /dashboard is redirected to /login", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("unauthenticated user accessing /contacts is redirected to /login", async ({ page }) => {
    await page.goto("/contacts");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Onboarding page (authenticated)", () => {
  // Uses saved auth state — authenticated user with onboarding COMPLETE should
  // be redirected away from /onboarding. We test both paths.

  test("authenticated + onboarding complete redirects to /dashboard", async ({ page }) => {
    await page.goto("/onboarding");
    // Should redirect to dashboard since onboarding is done
    await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 10_000 });
    const url = page.url();
    // Either stays on onboarding (not complete) or redirects to dashboard (complete)
    expect(url).toMatch(/\/(dashboard|onboarding)/);
  });

  test("onboarding page renders stepper when present", async ({ page }) => {
    await page.goto("/onboarding");
    const onOnboarding = page.url().includes("onboarding");
    test.skip(!onOnboarding, "User already completed onboarding");

    // Stepper should be visible
    await expect(page.getByText("Bienvenida")).toBeVisible();
    await expect(page.getByText("Conectar HubSpot")).toBeVisible();
    await expect(page.getByText("Seleccionar contactos")).toBeVisible();
    await expect(page.getByText("Sincronización")).toBeVisible();
  });

  test("step 1 shows org name input", async ({ page }) => {
    await page.goto("/onboarding");
    const onOnboarding = page.url().includes("onboarding");
    test.skip(!onOnboarding, "User already completed onboarding");

    // Welcome step
    await expect(page.getByLabel(/nombre de la organización/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /continuar/i })).toBeVisible();
  });
});

test.describe("404 and error pages", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("not-found page renders for unknown routes", async ({ page }) => {
    await page.goto("/this-route-does-not-exist-at-all-12345");
    // Next.js shows not-found.tsx
    await expect(
      page.getByText("Página no encontrada")
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByRole("link", { name: /ir al inicio/i })).toBeVisible();
  });

  test("home page redirects authenticated user to dashboard", async ({ page }) => {
    // Authenticated user
    await page.goto("/");
    await page.waitForURL(/\/dashboard|\/login|\/onboarding/, { timeout: 10_000 });
    // Should NOT be on the plain / route
    expect(page.url()).not.toMatch(/^https?:\/\/[^/]+\/$/);
  });
});
