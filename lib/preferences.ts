export type TableDensity = "normal" | "compact";

export const DENSITY_COOKIE = "density";
export const DEFAULT_DENSITY: TableDensity = "normal";

export function getDensityFromCookieValue(
  value: string | undefined
): TableDensity {
  return value === "compact" ? "compact" : "normal";
}
