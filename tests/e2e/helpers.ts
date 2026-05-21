import { type Page, expect } from "@playwright/test";

/**
 * Navigate and wait for the page load event.
 * We use "load" instead of "networkidle" because Next.js pages with Supabase
 * Realtime subscriptions or ongoing fetches never reach "networkidle".
 */
export async function goto(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("load");
}

/** Confirm we are on a given path prefix. */
export async function expectPath(page: Page, prefix: string) {
  await expect(page).toHaveURL(new RegExp(`^.*${prefix}`));
}

/**
 * Click a sidebar nav link by its label and wait for navigation.
 * Relies on the Sidebar nav text matching the label exactly.
 */
export async function sidebarNav(page: Page, label: string) {
  await page.getByRole("navigation").getByText(label).click();
  await page.waitForLoadState("load");
}

/**
 * Returns true if there is at least one visible element matching the locator.
 * Useful for conditional test logic when data presence is unknown.
 */
export async function hasElement(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0;
}

/** Wait for an API response that matches a path segment. */
export async function waitForApi(page: Page, urlFragment: string) {
  return page.waitForResponse(
    (r) => r.url().includes(urlFragment) && r.status() < 400
  );
}

/** Wait for a toast/sonner notification containing text. */
export async function expectToast(page: Page, text: string | RegExp) {
  await expect(
    page.locator("[data-sonner-toast]").filter({ hasText: text })
  ).toBeVisible({ timeout: 8_000 });
}
