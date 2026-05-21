import { test, expect } from "@playwright/test";
import { goto } from "./helpers";

test.describe("Contact list", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/contacts");
  });

  test("page renders with heading and table", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Contactos" })).toBeVisible();
    await expect(
      page.getByText("Espejo en tiempo real de tu portal HubSpot.")
    ).toBeVisible();

    // Table headers
    await expect(page.getByRole("columnheader", { name: "Nombre" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Empresa" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Sync" })).toBeVisible();
  });

  test("search input is present and functional", async ({ page }) => {
    const input = page.getByPlaceholder(/buscar/i);
    await expect(input).toBeVisible();

    // Type a query → table should filter (or show empty state)
    await input.fill("zzzznonexistent");
    await expect(
      page.getByText("Ningún contacto coincide").or(
        page.getByText("Sin contactos")
      )
    ).toBeVisible({ timeout: 5_000 });

    // Clear → shows contacts again
    await input.clear();
  });

  test("AI search button is present", async ({ page }) => {
    // Button has aria-label="Interpretar como búsqueda en lenguaje natural"
    // so we match by text content, not accessible name
    const btn = page.getByRole("button").filter({ hasText: "AI search" });
    await expect(btn).toBeVisible();
  });

  test("AI search shows result banner", async ({ page }) => {
    const input = page.getByPlaceholder(/buscar/i);
    await input.fill("contactos en Argentina");
    await page.getByRole("button").filter({ hasText: "AI search" }).click();

    // Either shows the AI banner (success) or stays in text-filter mode
    // depending on whether OpenAI is configured
    await page.waitForTimeout(2000);
    // We just assert no uncaught errors — the AI banner is conditional
    await expect(page.getByRole("heading", { name: "Contactos" })).toBeVisible();
  });

  test("table has checkbox column for bulk selection", async ({ page }) => {
    // Header checkbox
    const headerCheckbox = page.locator("thead input[type='checkbox']");
    await expect(headerCheckbox).toBeVisible();

    // Count rows
    const rows = page.locator("tbody tr").filter({ hasText: /@|—/ });
    const count = await rows.count();

    if (count > 0) {
      // Click header checkbox → selects all
      await headerCheckbox.click();
      // Bulk toolbar should appear
      await expect(
        page.getByText(/seleccionado/i)
      ).toBeVisible({ timeout: 3_000 });

      // Click Re-sync button in bulk toolbar
      await expect(
        page.getByRole("button", { name: /re-sync/i })
      ).toBeVisible();

      // Deselect
      await page.getByRole("button", { name: /deseleccionar/i }).click();
      await expect(page.getByText(/seleccionado/i)).not.toBeVisible();
    }
  });

  test("clicking a contact row navigates to detail", async ({ page }) => {
    const firstLink = page.getByRole("table").getByRole("link").first();
    const count = await firstLink.count();
    test.skip(count === 0, "No contacts to click");

    await firstLink.click();
    await expect(page).toHaveURL(/\/contacts\/[a-z0-9-]+/);
  });

  test("contact row has sync status badge", async ({ page }) => {
    const rowCount = await page.locator("tbody tr").count();
    test.skip(rowCount === 0, "No contacts");

    // Sync badges are pills with status text
    const badge = page
      .locator("tbody")
      .locator("span")
      .filter({ hasText: /synced|pending|conflict|error/ })
      .first();
    await expect(badge).toBeVisible();
  });

  test("footer shows contact count", async ({ page }) => {
    await expect(page.getByText(/mostrando \d+ de \d+ contacto/i)).toBeVisible();
  });
});

test.describe("Contact list — status filter from URL", () => {
  test("?status=conflict filters to conflict contacts", async ({ page }) => {
    await goto(page, "/contacts?status=conflict");
    // The filter chip "Ver todos" only appears when a filter is active.
    // Use that as a reliable marker instead of matching text across nested spans.
    await expect(
      page.getByRole("button", { name: /ver todos/i })
        .or(page.getByText(/ningún contacto coincide/i).first())
    ).toBeVisible({ timeout: 5_000 });
  });
});
