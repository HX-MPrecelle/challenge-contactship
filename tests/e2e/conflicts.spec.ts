import { test, expect } from "@playwright/test";
import { goto } from "./helpers";

test.describe("Conflicts inbox", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/conflicts");
  });

  test("page renders with heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Conflictos" })).toBeVisible();
    await expect(
      page.getByText("Contactos con datos divergentes")
    ).toBeVisible();
  });

  test("sidebar Conflictos nav item is active", async ({ page }) => {
    const navLink = page
      .getByRole("navigation")
      .getByRole("link", { name: "Conflictos" });
    await expect(navLink).toHaveClass(/bg-bg-subtle/);
  });

  test("shows empty state or inbox after load", async ({ page }) => {
    // Scope to main so we don't catch sidebar "Conflictos" link
    const main = page.getByRole("main");
    await expect(
      main.getByText("Todo en sync").or(main.getByText("Conflictos pendientes"))
    ).toBeVisible({ timeout: 8_000 });
  });

  test("inbox shows two-panel layout when conflicts exist", async ({ page }) => {
    const main = page.getByRole("main");
    const hasConflicts =
      (await main.getByText("Conflictos pendientes").count()) > 0;
    test.skip(!hasConflicts, "No conflicts in this org");

    await expect(main.getByText("Conflictos pendientes")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2 }).first()).toBeVisible();
  });

  test("selecting a conflict item shows its detail", async ({ page }) => {
    const main = page.getByRole("main");
    const hasConflicts =
      (await main.getByText("Conflictos pendientes").count()) > 0;
    test.skip(!hasConflicts, "No conflicts in this org");

    await expect(page.getByText(/campo/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("conflict detail has resolution actions", async ({ page }) => {
    const main = page.getByRole("main");
    const hasConflicts =
      (await main.getByText("Conflictos pendientes").count()) > 0;
    test.skip(!hasConflicts, "No conflicts in this org");

    await expect(page.getByRole("button", { name: /posponer/i })).toBeVisible({ timeout: 8_000 });
    await expect(page.getByRole("button", { name: /aplicar selección/i })).toBeVisible();
  });

  test("bulk resolution buttons (todo local / todo hubspot) appear", async ({ page }) => {
    const main = page.getByRole("main");
    const hasConflicts =
      (await main.getByText("Conflictos pendientes").count()) > 0;
    test.skip(!hasConflicts, "No conflicts in this org");

    await expect(page.getByText("Todo local")).toBeVisible({ timeout: 8_000 });
    await expect(page.getByText("Todo HubSpot")).toBeVisible();
  });

  test("realtime badge count is visible in list header", async ({ page }) => {
    const main = page.getByRole("main");
    const hasConflicts =
      (await main.getByText("Conflictos pendientes").count()) > 0;
    test.skip(!hasConflicts, "No conflicts in this org");

    const badge = page.locator("span.animate-pulse-dot");
    await expect(badge).toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Conflict diff dialog (from contact detail)", () => {
  test("ConflictDiffDialog opens from ConflictBanner", async ({ page }) => {
    await goto(page, "/contacts?status=conflict");
    const firstConflictLink = page.getByRole("table").getByRole("link").first();
    test.skip((await firstConflictLink.count()) === 0, "No conflict contacts");

    await firstConflictLink.click();
    // Wait for client-side navigation to the contact detail
    await page.waitForURL(/\/contacts\/[a-f0-9-]+$/, { timeout: 10_000 });

    const resolveBtn = page.getByRole("button", { name: /resolver con diff/i });
    test.skip((await resolveBtn.count()) === 0, "Contact is not in conflict state");

    await resolveBtn.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Resolver conflicto")).toBeVisible();

    await expect(page.getByText("Local (vos)")).toBeVisible();
    await expect(page.getByText("HubSpot")).toBeVisible();

    await expect(page.getByRole("button", { name: /guardar merge/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cancelar/i })).toBeVisible();

    await page.keyboard.press("Escape");
  });
});
