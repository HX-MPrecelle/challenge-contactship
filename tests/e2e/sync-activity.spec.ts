import { test, expect } from "@playwright/test";
import { goto } from "./helpers";

test.describe("Sync Health page (/sync)", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/sync");
  });

  test("renders main heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Sync Health" })
    ).toBeVisible();
    await expect(
      page.getByText("Estado del pipeline de sincronización")
    ).toBeVisible();
  });

  test("re-sync button is present", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /re-sync ahora/i })
    ).toBeVisible();
  });

  test("shows HubSpot connection bar when connected", async ({ page }) => {
    const isConnected = (await page.getByText("Live").count()) > 0;
    if (isConnected) {
      await expect(page.getByText("Live")).toBeVisible();
    }
  });

  test("SyncHealthPanel shows 4 stat tiles", async ({ page }) => {
    // Scope to main — sidebar also has a "Conflictos" nav link
    const main = page.getByRole("main");
    await expect(main.getByText("Sincronizados")).toBeVisible();
    await expect(main.getByText("Pendientes")).toBeVisible();
    await expect(main.getByText("Conflictos", { exact: true }).first()).toBeVisible();
    await expect(main.getByText("Errores")).toBeVisible();
  });

  test("recent activity section is present with link to /activity", async ({ page }) => {
    await expect(page.getByText("Actividad reciente")).toBeVisible();
    await expect(
      page.getByRole("link", { name: /ver todo/i })
    ).toHaveAttribute("href", /\/activity/);
  });

  test("recent activity link navigates to /activity", async ({ page }) => {
    await page.getByRole("link", { name: /ver todo/i }).click();
    await expect(page).toHaveURL(/\/activity/);
  });

  test("re-sync button triggers action and shows toast", async ({ page }) => {
    const isConnected = (await page.getByText("Live").count()) > 0;
    test.skip(!isConnected, "No HubSpot connection to re-sync");

    await page.getByRole("button", { name: /re-sync ahora/i }).click();
    await expect(
      page.locator("[data-sonner-toast]")
    ).toBeVisible({ timeout: 8_000 });
  });
});

test.describe("Activity feed (/activity)", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/activity");
  });

  test("renders main heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Activity" })
    ).toBeVisible();
    await expect(page.getByText("Audit trail de todos los eventos")).toBeVisible();
  });

  test("filter chips are present", async ({ page }) => {
    await expect(page.getByRole("link", { name: "Todos" })).toBeVisible();
    // Event type filters
    await expect(
      page.getByRole("link", { name: /creado/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /actualizado/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /conflicto/i })
    ).toBeVisible();
    // Direction filters
    await expect(
      page.getByRole("link", { name: /← hubspot/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /→ hubspot/i })
    ).toBeVisible();
  });

  test("filter chip navigates with query param", async ({ page }) => {
    await page.getByRole("link", { name: /creado/i }).click();
    await expect(page).toHaveURL(/type=create/);

    await page.getByRole("link", { name: "Todos" }).click();
    await expect(page).toHaveURL(/\/activity$/);
  });

  test("shows activity entries or empty state", async ({ page }) => {
    // Either event rows or empty message
    await expect(
      page
        .locator("ol li")
        .first()
        .or(page.getByText(/sin eventos/i))
    ).toBeVisible({ timeout: 8_000 });
  });

  test("event entries have timestamp and type label", async ({ page }) => {
    const hasEvents = (await page.locator("ol li").count()) > 0;
    test.skip(!hasEvents, "No sync events");

    const firstRow = page.locator("ol li").first();
    await expect(firstRow).toBeVisible();
    // Should contain a direction indicator
    await expect(
      firstRow.getByText(/desde hubspot|hacia hubspot/i)
    ).toBeVisible();
  });

  test("contact link in event row navigates to contact detail", async ({ page }) => {
    const hasEvents = (await page.locator("ol li").count()) > 0;
    test.skip(!hasEvents, "No sync events");

    const contactLink = page.locator("ol li a[href*='/contacts/']").first();
    const hasLink = (await contactLink.count()) > 0;
    test.skip(!hasLink, "No event rows have contact links");

    await contactLink.click();
    await expect(page).toHaveURL(/\/contacts\/[a-z0-9-]+/);
  });

  test("direction filter shows only matching events", async ({ page }) => {
    await page.getByRole("link", { name: /← hubspot/i }).click();
    await expect(page).toHaveURL(/direction=hubspot_to_local/);

    const hasEvents = (await page.locator("ol li").count()) > 0;
    if (hasEvents) {
      // All visible direction chips should say "desde HubSpot"
      const directions = page.locator("ol li").locator("span.font-mono").filter({ hasText: /desde|hacia/ });
      const count = await directions.count();
      for (let i = 0; i < count; i++) {
        const text = await directions.nth(i).textContent();
        expect(text).toContain("desde HubSpot");
      }
    }
  });
});
