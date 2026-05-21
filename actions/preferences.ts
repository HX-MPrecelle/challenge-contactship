"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export type TableDensity = "normal" | "compact";

export const DENSITY_COOKIE = "density";
export const DEFAULT_DENSITY: TableDensity = "normal";

export async function setDensity(density: TableDensity): Promise<void> {
  if (density !== "normal" && density !== "compact") return;

  const cookieStore = await cookies();
  cookieStore.set(DENSITY_COOKIE, density, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  revalidatePath("/contacts", "page");
}

export function getDensityFromCookieValue(value: string | undefined): TableDensity {
  return value === "compact" ? "compact" : "normal";
}
