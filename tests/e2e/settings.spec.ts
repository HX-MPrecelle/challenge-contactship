import { test, expect } from "@playwright/test";
import { goto } from "./helpers";

test.describe("Settings — layout and navigation", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/settings");
  });

  test("renders main heading and sub-nav", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    // Sub-nav groups — scope to the aside to avoid matching the HubSpot section heading
    const nav = page.locator("aside");
    await expect(nav.getByText("Organización", { exact: true })).toBeVisible();
    await expect(nav.getByText("IA", { exact: true })).toBeVisible();

    // Section links
    await expect(page.getByRole("link", { name: "General" })).toBeVisible();
    await expect(page.getByRole("link", { name: "HubSpot" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sincronización" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Modelos y comportamiento" })
    ).toBeVisible();
  });

  test("General section is active by default", async ({ page }) => {
    const generalLink = page.getByRole("link", { name: "General" });
    await expect(generalLink).toHaveClass(/bg-bg-subtle/);
  });
});

test.describe("Settings — General section", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/settings?section=general");
  });

  test("shows org name row with edit button", async ({ page }) => {
    await expect(page.getByText("Nombre de la organización")).toBeVisible();
    await expect(page.getByRole("button", { name: /editar/i })).toBeVisible();
  });

  test("org name inline edit flow", async ({ page }) => {
    await page.getByRole("button", { name: /editar/i }).click();

    // Input should appear
    const input = page.getByRole("textbox").filter({ hasText: /./ });
    const nameInput = input.or(page.locator("input[class*='w-48']"));
    await expect(nameInput).toBeVisible();

    // Cancel button
    await expect(page.getByRole("button", { name: /cancelar/i })).toBeVisible();

    // ESC cancels
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: /editar/i })).toBeVisible();
  });

  test("shows email domain row", async ({ page }) => {
    await expect(page.getByText("Dominio de email")).toBeVisible();
  });
});

test.describe("Settings — HubSpot section", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/settings?section=hubspot");
  });

  test("renders HubSpot connection card", async ({ page }) => {
    // Either the connected card (shows portal name or Live badge)
    // or the empty state when no connection exists
    await expect(
      page.getByText(/live/i)
        .or(page.getByText(/portal/i).first())
        .or(page.getByText(/sin portal conectado/i))
    ).toBeVisible({ timeout: 8_000 });
  });

  test("shows connection status badge when connected", async ({ page }) => {
    const isConnected = (await page.getByText("Live").count()) > 0;
    if (isConnected) {
      await expect(page.getByText("Live")).toBeVisible();
      // Should show action buttons
      await expect(page.getByRole("button", { name: /re-sync/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /desconectar/i })).toBeVisible();
    }
  });

  test("shows connect button when not connected", async ({ page }) => {
    const notConnected =
      (await page.getByRole("link", { name: /conectar hubspot/i }).count()) > 0 ||
      (await page.getByText(/sin portal conectado/i).count()) > 0;

    if (notConnected) {
      await expect(
        page
          .getByRole("link", { name: /conectar hubspot/i })
          .or(page.getByText(/sin portal conectado/i))
      ).toBeVisible();
    }
  });
});

test.describe("Settings — Sync section", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/settings?section=sync");
  });

  test("renders sync toggles", async ({ page }) => {
    await expect(page.getByText("Sync bidireccional")).toBeVisible();
    await expect(page.getByText("Webhooks de HubSpot")).toBeVisible();
    await expect(page.getByText("Estrategia de conflictos")).toBeVisible();
  });

  test("renders sync health panel", async ({ page }) => {
    // SyncHealthPanel is embedded in the sync section.
    // Scope to main to avoid picking up sidebar "Conflictos" nav link.
    const main = page.getByRole("main");
    await expect(main.getByText("Estado del sync")).toBeVisible();
    await expect(main.getByText("Sincronizados")).toBeVisible();
    await expect(main.getByText("Pendientes")).toBeVisible();
    await expect(main.getByText("Conflictos", { exact: true }).first()).toBeVisible();
    await expect(main.getByText("Errores")).toBeVisible();
  });
});

test.describe("Settings — AI section", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/settings?section=ai");
  });

  test("renders AI configuration rows", async ({ page }) => {
    await expect(page.getByText("Generar insights automáticamente")).toBeVisible();
    await expect(page.getByText("Modelo de lenguaje")).toBeVisible();
    await expect(page.getByText("Embeddings")).toBeVisible();
    // Model names in mono
    await expect(page.getByText(/claude|haiku/i)).toBeVisible();
    await expect(page.getByText(/text-embedding/i)).toBeVisible();
  });
});
