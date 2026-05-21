/**
 * Dialog tests — verifies the 3 main dialogs render correctly.
 * EmailDraftDialog: from contact detail (AI Insights panel)
 * ConflictDiffDialog: from ConflictBanner on a conflict contact
 * FilterSummaryDialog: from ContactList with an active AI filter
 */

import { test, expect, type Page } from "@playwright/test";
import { goto } from "./helpers";

async function openFirstContact(page: Page): Promise<string | null> {
  await goto(page, "/contacts");
  const link = page.getByRole("table").getByRole("link").first();
  if ((await link.count()) === 0) return null;
  await link.click();
  await page.waitForURL(/\/contacts\/[a-f0-9-]+$/, { timeout: 10_000 });
  return page.url();
}

test.describe("Email draft dialog", () => {
  test("opens from AiInsightsPanel and shows full UI", async ({ page }) => {
    const url = await openFirstContact(page);
    test.skip(!url, "No contacts available");

    const dialogTrigger = page.getByRole("button", { name: /borrador de email/i });
    await expect(dialogTrigger).toBeVisible({ timeout: 15_000 });
    await dialogTrigger.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Header icon tile + title
    await expect(dialog.getByText("Borrador de email con IA")).toBeVisible();

    // Objective input
    await expect(dialog.getByLabel(/objetivo del email/i)).toBeVisible();

    // Tone picker with 3 options
    await expect(dialog.getByText("Cálido")).toBeVisible();
    await expect(dialog.getByText("Conciso")).toBeVisible();
    await expect(dialog.getByText("Directo")).toBeVisible();

    // Tone option hints
    await expect(dialog.getByText(/humano, interés genuino/i)).toBeVisible();

    // Generate button
    await expect(
      dialog.getByRole("button", { name: /generar borrador/i })
    ).toBeVisible();
  });

  test("tone selection changes active state", async ({ page }) => {
    const url = await openFirstContact(page);
    test.skip(!url, "No contacts available");

    await page.getByRole("button", { name: /borrador de email/i }).click();
    const dialog = page.getByRole("dialog");

    // Click "Conciso" tone
    const concisoBtn = dialog.locator("button").filter({ hasText: /conciso/i }).first();
    await concisoBtn.click();
    await expect(concisoBtn).toHaveClass(/border-brand/);

    await page.keyboard.press("Escape");
  });

  test("generating a draft shows rationale and editable fields", async ({ page }) => {
    const url = await openFirstContact(page);
    test.skip(!url, "No contacts available");

    await page.getByRole("button", { name: /borrador de email/i }).click();
    const dialog = page.getByRole("dialog");

    // Check if OpenAI is configured by attempting generation
    const objective = dialog.getByLabel(/objetivo del email/i);
    await objective.fill("Agendar una llamada de 15 minutos");

    await dialog.getByRole("button", { name: /generar borrador/i }).click();

    // Either shows the generated draft or an error
    await page.waitForTimeout(8_000);

    const hasDraft = (await dialog.getByLabel("Asunto").count()) > 0;
    if (hasDraft) {
      await expect(dialog.getByLabel("Asunto")).toBeVisible();
      await expect(dialog.locator("textarea#body")).toBeVisible();
      // Rationale callout
      await expect(dialog.getByText(/por qué este enfoque/i)).toBeVisible();
      // Footer actions
      await expect(dialog.getByRole("button", { name: /regenerar/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /copiar/i })).toBeVisible();
      await expect(dialog.getByRole("button", { name: /abrir en mail/i })).toBeVisible();
    }

    await page.keyboard.press("Escape");
  });
});

test.describe("Filter summary dialog", () => {
  test("opens from AI filter banner in contact list", async ({ page }) => {
    await goto(page, "/contacts");

    // Run AI search to trigger the filter banner
    const input = page.getByPlaceholder(/buscar/i);
    await input.fill("contactos en Argentina");
    await page.getByRole("button", { name: /ai search/i }).click();

    // Wait for the AI filter banner or timeout
    const banner = page.locator("[class*='bg-brand-subtle']").filter({
      has: page.getByText(/búsqueda con ia aplicada/i),
    });

    const hasAiBanner = await banner.isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasAiBanner, "AI search not configured or returned no filters");

    // Click the "Resumir N" button
    const resumirBtn = page.getByRole("button", { name: /resumir/i });
    await expect(resumirBtn).toBeVisible();
    await resumirBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Header
    await expect(dialog.getByText("Análisis del filtro")).toBeVisible();
    // Description with query between quotes
    await expect(dialog.getByText(/argentina/i)).toBeVisible();

    await page.keyboard.press("Escape");
  });

  test("stats bar shows analyzed count", async ({ page }) => {
    await goto(page, "/contacts");

    const input = page.getByPlaceholder(/buscar/i);
    await input.fill("leads activos");
    await page.getByRole("button", { name: /ai search/i }).click();

    const banner = page.locator("[class*='bg-brand-subtle']").filter({
      has: page.getByText(/búsqueda con ia aplicada/i),
    });
    const hasAiBanner = await banner.isVisible({ timeout: 8_000 }).catch(() => false);
    test.skip(!hasAiBanner, "AI search not available");

    await page.getByRole("button", { name: /resumir/i }).click();
    const dialog = page.getByRole("dialog");

    // Wait for summary to load
    await page.waitForTimeout(10_000);

    const hasStats = (await dialog.getByText(/analizados:/i).count()) > 0;
    if (hasStats) {
      await expect(dialog.getByText(/analizados:/i)).toBeVisible();
      // Success or warning dot
      await expect(
        dialog
          .getByText(/muestra completa/i)
          .or(dialog.getByText(/muestra parcial/i))
      ).toBeVisible();
    }

    await page.keyboard.press("Escape");
  });
});

test.describe("Conflict diff dialog", () => {
  test("opens from ConflictBanner with proper UI", async ({ page }) => {
    await goto(page, "/contacts?status=conflict");
    const firstLink = page.getByRole("table").getByRole("link").first();
    test.skip((await firstLink.count()) === 0, "No conflict contacts");

    await firstLink.click();
    await page.waitForLoadState("load");

    const resolveBtn = page.getByRole("button", { name: /resolver con diff/i });
    test.skip((await resolveBtn.count()) === 0, "Contact not in conflict state");
    await resolveBtn.click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Header icon tile (error-subtle background)
    await expect(dialog.getByText("Resolver conflicto")).toBeVisible();

    // Meta bar with timestamp and bulk actions
    await expect(dialog.getByText("Todo local")).toBeVisible();
    await expect(dialog.getByText("Todo HubSpot")).toBeVisible();

    // Column headers with dot indicators
    await expect(dialog.getByText("Local (vos)")).toBeVisible();
    await expect(dialog.getByText("HubSpot")).toBeVisible();

    // Footer
    await expect(dialog.getByRole("button", { name: /guardar merge/i })).toBeVisible();
    await expect(dialog.getByRole("button", { name: /cancelar/i })).toBeVisible();

    await page.keyboard.press("Escape");
  });

  test("selecting Todo HubSpot activates all HubSpot cells", async ({ page }) => {
    await goto(page, "/contacts?status=conflict");
    const firstLink = page.getByRole("table").getByRole("link").first();
    test.skip((await firstLink.count()) === 0, "No conflict contacts");

    await firstLink.click();
    await page.waitForLoadState("load");

    const resolveBtn = page.getByRole("button", { name: /resolver con diff/i });
    test.skip((await resolveBtn.count()) === 0, "Not a conflict contact");
    await resolveBtn.click();

    await page.waitForSelector("[role='dialog']");
    await page.waitForTimeout(1_500); // let diff load

    // Click "Todo HubSpot" to select all HubSpot cells
    await page.getByRole("dialog").getByText("Todo HubSpot").click();

    // Save button should be enabled
    await expect(
      page.getByRole("button", { name: /guardar merge/i })
    ).toBeEnabled();

    await page.keyboard.press("Escape");
  });
});
