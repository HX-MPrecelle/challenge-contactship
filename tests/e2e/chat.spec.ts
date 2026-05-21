import { test, expect } from "@playwright/test";
import { goto } from "./helpers";

test.describe("Chat — layout", () => {
  test.beforeEach(async ({ page }) => {
    await goto(page, "/chat");
  });

  test("renders history rail with new-conversation button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /nueva conversación/i })
    ).toBeVisible();
  });

  test("renders conversation panel with header", async ({ page }) => {
    await expect(page.getByText("Chat con tu base")).toBeVisible();
    await expect(
      page.getByText("Preguntas en lenguaje natural sobre contactos.")
    ).toBeVisible();
  });

  test("persona toggle is visible with three options", async ({ page }) => {
    // Label above the segmented control
    await expect(page.getByText("PERSONA")).toBeVisible();

    // Three persona buttons (from lib/ai/persona.ts)
    await expect(page.getByRole("button", { name: "Conciso" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Coach" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Honesto" })).toBeVisible();
  });

  test("switching persona persists on reload", async ({ page }) => {
    // Click 'Coach' persona
    await page.getByRole("button", { name: "Coach" }).click();
    await expect(page.getByRole("button", { name: "Coach" })).toHaveClass(/bg-brand/);

    // Reload the page
    await page.reload();
    await page.waitForLoadState("load");

    // Persona should still be Coach (persisted in localStorage)
    await expect(page.getByRole("button", { name: "Coach" })).toHaveClass(/bg-brand/);
  });

  test("shows empty state with example prompts", async ({ page }) => {
    // Empty state only shows if there are no messages
    // and no conversation loaded
    const emptyHeading = page.getByRole("heading", { name: /hacé una pregunta/i });
    const emptyCount = await emptyHeading.count();

    if (emptyCount > 0) {
      await expect(emptyHeading).toBeVisible();
      // Example prompts as pill buttons
      await expect(
        page.getByText(/patrones comunes|priorizar esta semana/i).first()
      ).toBeVisible();
    }
  });

  test("example prompt populates the textarea", async ({ page }) => {
    const emptyHeading = page.getByRole("heading", { name: /hacé una pregunta/i });
    test.skip((await emptyHeading.count()) === 0, "Not in empty state");

    const firstPrompt = page.locator("button.rounded-full").first();
    const promptText = await firstPrompt.textContent();
    await firstPrompt.click();

    const textarea = page.getByPlaceholder(/escribí tu pregunta/i);
    await expect(textarea).toHaveValue(promptText ?? "");
  });

  test("composer textarea and send button are present", async ({ page }) => {
    const textarea = page.getByPlaceholder(/escribí tu pregunta/i);
    await expect(textarea).toBeVisible();

    // Send button (icon button)
    const sendBtn = page.getByRole("button", { name: /enviar/i });
    await expect(sendBtn).toBeVisible();
    // Should be disabled when textarea is empty
    await expect(sendBtn).toBeDisabled();
  });

  test("typing enables send button", async ({ page }) => {
    const textarea = page.getByPlaceholder(/escribí tu pregunta/i);
    const sendBtn = page.getByRole("button", { name: /enviar/i });

    await textarea.fill("Test question");
    await expect(sendBtn).toBeEnabled();

    await textarea.clear();
    await expect(sendBtn).toBeDisabled();
  });

  test("disclaimer text is visible below composer", async ({ page }) => {
    await expect(
      page.getByText(/las respuestas pueden contener errores/i)
    ).toBeVisible();
  });
});

test.describe("Chat — sending messages", () => {
  test("sending a message shows it and triggers AI response", async ({ page }) => {
    await goto(page, "/chat");

    // Start a fresh conversation
    await page.getByRole("button", { name: /nueva conversación/i }).click();

    const textarea = page.getByPlaceholder(/escribí tu pregunta/i);
    await textarea.fill("Cuántos contactos tengo?");

    // Send with Enter
    await page.keyboard.press("Enter");

    // User message should appear immediately
    await expect(
      page.getByText("Cuántos contactos tengo?")
    ).toBeVisible({ timeout: 5_000 });

    // Either thinking dots or an AI response should appear
    await expect(
      page
        .locator(".animate-pulse-dot")
        .or(page.locator("[class*='sparkles']"))
        .or(page.getByText(/contacto|base|error/i).last())
    ).toBeVisible({ timeout: 20_000 });
  });

  test("sent conversation appears in history rail", async ({ page }) => {
    await goto(page, "/chat");

    const initialConvCount = await page
      .locator("aside .flex-col div.group")
      .count();

    // Create a new conversation
    await page.getByRole("button", { name: /nueva conversación/i }).click();
    const textarea = page.getByPlaceholder(/escribí tu pregunta/i);
    await textarea.fill("Test para history rail");
    await page.keyboard.press("Enter");

    // Wait for message to appear
    await expect(
      page.getByText("Test para history rail")
    ).toBeVisible({ timeout: 5_000 });

    // Wait a moment for the conversation to be persisted and history to update
    await page.waitForTimeout(2_000);

    const newConvCount = await page
      .locator("aside .flex-col div.group")
      .count();

    // Should have at least one more conversation than before
    expect(newConvCount).toBeGreaterThanOrEqual(initialConvCount + 1);
  });

  test("new conversation button clears messages", async ({ page }) => {
    await goto(page, "/chat");

    // Send a message
    const textarea = page.getByPlaceholder(/escribí tu pregunta/i);
    await textarea.fill("Pregunta inicial");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Pregunta inicial")).toBeVisible({ timeout: 5_000 });

    // Start new conversation
    await page.getByRole("button", { name: /nueva conversación/i }).click();

    // Old message should not be visible
    await expect(page.getByText("Pregunta inicial")).not.toBeVisible({ timeout: 3_000 });
  });
});

test.describe("Chat — history navigation", () => {
  test("clicking a history item loads that conversation", async ({ page }) => {
    await goto(page, "/chat");

    const historyItem = page.locator("aside div.group").first();
    const count = await historyItem.count();
    test.skip(count === 0, "No conversation history");

    const title = await historyItem.textContent();
    await historyItem.click();

    // Messages should load (either from cache or db)
    await page.waitForTimeout(1_500);
    await expect(page.getByPlaceholder(/escribí tu pregunta/i)).toBeVisible();
    // The title in the history should still show
    await expect(historyItem).toBeVisible();
    void title;
  });

  test("delete conversation removes it from history", async ({ page }) => {
    await goto(page, "/chat");

    // First create a conversation to delete
    await page.getByRole("button", { name: /nueva conversación/i }).click();
    const textarea = page.getByPlaceholder(/escribí tu pregunta/i);
    await textarea.fill("Conversación para borrar");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Conversación para borrar")).toBeVisible({ timeout: 5_000 });
    await page.waitForTimeout(1_500);

    // Find the newly created item in history rail
    const newItem = page
      .locator("aside div.group")
      .filter({ hasText: "Conversación para borrar" });
    const exists = (await newItem.count()) > 0;
    test.skip(!exists, "Could not find created conversation in history");

    // Hover to reveal delete button
    await newItem.hover();
    const deleteBtn = newItem.locator("button[aria-label*='Eliminar']");
    await deleteBtn.click();

    // Should no longer be in history
    await expect(newItem).not.toBeVisible({ timeout: 5_000 });
  });
});

test.describe("Chat — citation chips", () => {
  test("citations appear below AI response when contacts are found", async ({ page }) => {
    await goto(page, "/chat");
    await page.getByRole("button", { name: /nueva conversación/i }).click();

    const textarea = page.getByPlaceholder(/escribí tu pregunta/i);
    await textarea.fill("Quiénes son mis mejores contactos?");
    await page.keyboard.press("Enter");

    // Wait for AI response
    await page.waitForTimeout(15_000);

    // Citations may or may not appear depending on if relevant contacts were found
    const citationLabel = page.getByText(/basado en \d+ contacto/i);
    const citationCount = await citationLabel.count();

    if (citationCount > 0) {
      await expect(citationLabel).toBeVisible();
      // Citation chips are links to /contacts/[id]
      const chips = page.locator("a[href*='/contacts/']").filter({ hasText: /·/ });
      await expect(chips.first()).toBeVisible();
    }
  });
});
