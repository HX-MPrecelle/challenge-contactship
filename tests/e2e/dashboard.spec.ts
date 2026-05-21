import { test, expect } from "@playwright/test";
import { goto, sidebarNav } from "./helpers";

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/dashboard");
  });

  test("renders hero with greeting", async ({ page }) => {
    // Hero heading — starts with "Hola,"
    await expect(
      page.getByRole("heading", { name: /hola,/i })
    ).toBeVisible();

    // Eyebrow date (mono uppercase)
    const eyebrow = page.locator("p.font-mono").first();
    await expect(eyebrow).toBeVisible();
  });

  test("shows three stat cards", async ({ page }) => {
    await expect(page.getByText("Contactos totales")).toBeVisible();
    await expect(page.getByText("Países distintos")).toBeVisible();
    await expect(page.getByText("Conflictos sin resolver")).toBeVisible();
  });

  test("shows breakdown cards (stage + countries)", async ({ page }) => {
    await expect(page.getByText("Por etapa del ciclo")).toBeVisible();
    await expect(page.getByText("Top países")).toBeVisible();
  });

  test("shows AI Priorities section", async ({ page }) => {
    await expect(page.getByText("Prioridades de la semana")).toBeVisible();

    // Either shows skeleton, error, empty message, or actual priorities
    await expect(
      page
        .locator("section")
        .filter({ hasText: "Prioridades de la semana" })
    ).toBeVisible();
  });

  test("quick links navigate correctly", async ({ page }) => {
    // Chat quick link
    const chatLink = page.getByRole("link", { name: /hablá con tu base/i });
    await expect(chatLink).toBeVisible();
    await chatLink.click();
    await expect(page).toHaveURL(/\/chat/);

    await page.goBack();
    await page.waitForLoadState("load");

    // Contacts quick link
    const contactsLink = page.getByRole("link", { name: /ver todos los contactos/i });
    await expect(contactsLink).toBeVisible();
    await contactsLink.click();
    await expect(page).toHaveURL(/\/contacts/);
  });

  test("conflict stat card links to /conflicts when > 0", async ({ page }) => {
    // Find the conflict stat card by its label — use a scoped selector
    const conflictLabel = page.getByText("Conflictos sin resolver");
    await expect(conflictLabel).toBeVisible({ timeout: 10_000 });

    // Check if the card has a numeric value > 0
    const card = conflictLabel.locator("..").locator("..");
    const cardText = await card.textContent().catch(() => "0");
    const conflictsCount = parseInt(cardText?.match(/\d+/)?.[0] ?? "0");

    if (conflictsCount > 0) {
      // Card should be wrapped in a link to /conflicts
      const linkCard = page.locator("a").filter({ has: page.getByText("Conflictos sin resolver") });
      await expect(linkCard).toHaveAttribute("href", /\/conflicts/);
    }
  });
});

test.describe("Sidebar navigation", () => {
  test("all nav items are present", async ({ page }) => {
    await page.goto("/dashboard");
    const nav = page.getByRole("navigation");
    await expect(nav.getByText("Dashboard")).toBeVisible();
    await expect(nav.getByText("Contactos")).toBeVisible();
    await expect(nav.getByText("Conflictos")).toBeVisible();
    await expect(nav.getByText("Chat")).toBeVisible();
    await expect(nav.getByText("Sync")).toBeVisible();
    await expect(nav.getByText("Settings")).toBeVisible();
  });

  test("active nav item is highlighted", async ({ page }) => {
    await page.goto("/contacts");
    // The Contactos nav link should have the active class (bg-bg-subtle)
    const contactsLink = page
      .getByRole("navigation")
      .getByRole("link", { name: "Contactos" });
    await expect(contactsLink).toHaveClass(/bg-bg-subtle/);
  });
});
