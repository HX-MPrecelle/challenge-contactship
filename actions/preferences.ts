"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import type { TableDensity } from "@/lib/preferences";
import { DENSITY_COOKIE } from "@/lib/preferences";

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
