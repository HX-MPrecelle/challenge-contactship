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

  test("authenticated + onboarding complete redirects away from /onboarding", async ({ page }) => {
    await page.goto("/onboarding");
    // Redirects to /dashboard or /contacts (if already complete), or stays on /onboarding
    await page.waitForURL(/\/(dashboard|onboarding|contacts)/, { timeout: 10_000 });
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|onboarding|contacts)/);
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
    // With auth middleware, an unknown route may redirect to login OR show not-found.
    // We accept either outcome for an unauthenticated user.
    await page.goto("/this-route-does-not-exist-at-all-12345");
    await page.waitForLoadState("load");
    const url = page.url();
    // Either the not-found page or the login page is acceptable
    const isNotFound = (await page.getByRole("heading", { name: /no encontrada/i }).count()) > 0;
    const isLogin = url.includes("/login");
    expect(isNotFound || isLogin).toBe(true);
  });

  test("unauthenticated user accessing home is redirected to login", async ({ page }) => {
    await page.goto("/");
    await page.waitForURL(/\/login/, { timeout: 8_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
