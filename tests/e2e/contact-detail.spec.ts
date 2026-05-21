import { test, expect, type Page } from "@playwright/test";
import { goto } from "./helpers";

/** Navigate to the first contact in the list and return its URL. */
async function openFirstContact(page: Page): Promise<string | null> {
  await goto(page, "/contacts");
  const link = page.getByRole("table").getByRole("link").first();
  if ((await link.count()) === 0) return null;
  await link.click();
  // Next.js Link uses history.pushState — waitForLoadState("load") fires
  // immediately (already loaded). We must wait for the URL to actually change.
  await page.waitForURL(/\/contacts\/[a-f0-9-]+$/, { timeout: 10_000 });
  return page.url();
}

test.describe("Contact detail", () => {
  let contactUrl: string | null = null;

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext({
      storageState: "tests/e2e/.auth-state.json",
    });
    const page = await ctx.newPage();
    contactUrl = await openFirstContact(page);
    await ctx.close();
  });

  test.beforeEach(async ({ page }) => {
    test.skip(!contactUrl, "No contacts available in this org");
    await goto(page, contactUrl!);
  });

  test("back button navigates to contact list", async ({ page }) => {
    const backLink = page.getByRole("link", { name: /volver a contactos/i });
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/contacts$/);
  });

  test("renders contact name as page heading", async ({ page }) => {
    const heading = page.getByRole("heading", { level: 1 });
    await expect(heading).toBeVisible();
    const text = await heading.textContent();
    expect(text?.trim().length).toBeGreaterThan(0);
  });

  test("shows sync status badge in header", async ({ page }) => {
    const badge = page.locator("span").filter({ hasText: /synced|pending|conflict|error/ }).first();
    await expect(badge).toBeVisible();
  });

  test("contact form with editable fields is present", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Datos del contacto" })
    ).toBeVisible();
    await expect(page.getByLabel("Nombre")).toBeVisible();
    await expect(page.getByLabel("Apellido")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Empresa")).toBeVisible();
    await expect(page.getByRole("button", { name: /guardar cambios/i })).toBeVisible();
  });

  test("editing a field and saving shows success toast", async ({ page }) => {
    const companyField = page.getByLabel("Empresa");
    const originalValue = await companyField.inputValue();

    // Make a change
    await companyField.fill(`${originalValue} (test)`);
    await page.getByRole("button", { name: /guardar cambios/i }).click();

    // Toast notification
    await expect(
      page.locator("[data-sonner-toast]").filter({ hasText: /actualizado|sincronizado/i })
    ).toBeVisible({ timeout: 10_000 });

    // Restore original value
    await companyField.fill(originalValue);
    await page.getByRole("button", { name: /guardar cambios/i }).click();
  });

  test("activity timeline section is present", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "Actividad" })
    ).toBeVisible();

    // Either shows timeline events or empty message
    await expect(
      page.getByRole("list").or(page.getByText(/sin eventos/i))
    ).toBeVisible({ timeout: 5_000 });
  });

  test("AI Insights panel is present", async ({ page }) => {
    await expect(page.getByText("AI Insights")).toBeVisible();
    // Panel contains either: skeleton, error, insights, or inline empty state
    await expect(
      page.locator("section").filter({ hasText: "AI Insights" })
    ).toBeVisible();
  });

  test("metadata sidebar is present", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /metadata/i })
    ).toBeVisible();
    await expect(page.getByText("Lifecycle stage")).toBeVisible();
    await expect(page.getByText("País")).toBeVisible();
  });

  test("similar contacts panel is present", async ({ page }) => {
    await expect(page.getByText("Contactos similares")).toBeVisible();
    // Panel shows either skeleton rows or contacts or empty message
    const panel = page.locator("section").filter({ hasText: "Contactos similares" });
    await expect(panel).toBeVisible();
  });

  test("conflict banner shows for conflict contacts", async ({ page }) => {
    // Only meaningful if contact has conflict status
    const badge = page.locator("span").filter({ hasText: /^conflict$/ }).first();
    const isConflict = (await badge.count()) > 0;

    if (isConflict) {
      await expect(
        page.getByText("Conflicto detectado")
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: /resolver con diff/i })
      ).toBeVisible();
    }
  });
});

test.describe("Contact detail — Email draft dialog", () => {
  test("email draft dialog opens and renders tone picker", async ({ page }) => {
    await goto(page, "/contacts");
    const link = page.getByRole("table").getByRole("link").first();
    test.skip((await link.count()) === 0, "No contacts");

    await link.click();
    await page.waitForLoadState("load");

    // Open email dialog
    const emailBtn = page.getByRole("button", { name: /borrador de email/i });
    await expect(emailBtn).toBeVisible();
    await emailBtn.click();

    // Dialog should open
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Borrador de email con IA")).toBeVisible();

    // Tone picker — scope to dialog to avoid matching "Director" in contact metadata
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Cálido", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Conciso", { exact: true })).toBeVisible();
    await expect(dialog.getByText("Directo", { exact: true })).toBeVisible();

    // Close dialog
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible({ timeout: 3_000 });
  });
});
