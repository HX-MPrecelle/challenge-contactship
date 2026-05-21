/**
 * Auth flow tests — run WITHOUT saved auth state (use default context).
 * Tests the login page UI and the logout flow.
 */

import { test, expect } from "@playwright/test";

// These tests don't use the saved auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders split-pane layout", async ({ page }) => {
    // Brand panel (left) — hidden on small viewports, check it exists in DOM
    await expect(page.getByText("A CRM workspace that mirrors HubSpot in real time.")).toBeVisible();

    // Form panel (right)
    await expect(page.getByRole("heading", { name: "Bienvenido" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Contraseña")).toBeVisible();
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
  });

  test("shows toggle to sign up mode", async ({ page }) => {
    await expect(page.getByText("¿No tenés cuenta?")).toBeVisible();
    await page.getByRole("button", { name: "Crear una" }).click();

    // Should show signup form with confirm password
    await expect(page.getByRole("button", { name: /crear cuenta/i })).toBeVisible();
    await expect(page.getByLabel("Confirmar contraseña")).toBeVisible();

    // Toggle back
    await page.getByRole("button", { name: "Iniciar sesión" }).click();
    await expect(page.getByRole("button", { name: /iniciar sesión/i })).toBeVisible();
  });

  test("shows error for empty email", async ({ page }) => {
    await page.getByLabel("Contraseña").fill("somepassword");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();
    // HTML5 validation should prevent submission
    await expect(page).toHaveURL(/\/login/);
  });

  test("shows error for wrong credentials", async ({ page }) => {
    await page.getByLabel("Email").fill("nobody@nowhere.xyz");
    await page.getByLabel("Contraseña").fill("wrongpassword");
    await page.getByRole("button", { name: /iniciar sesión/i }).click();

    // Should stay on login page and show an error message
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    // Error message appears in the form (Supabase returns auth error)
    await expect(
      page.locator(".text-error").or(page.locator("[class*='error']"))
    ).toBeVisible({ timeout: 10_000 });
  });

  test("redirects unauthenticated users from protected routes", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe("Logout", () => {
  // This test uses the saved auth state
  test.use({ storageState: "tests/e2e/.auth-state.json" });

  test("logout via sidebar clears session", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("button", { name: /cerrar sesión/i })).toBeVisible();

    await page.getByRole("button", { name: /cerrar sesión/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });
});
