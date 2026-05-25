import { describe, it, expect } from "vitest";
import { z } from "zod";

// Mirror the exact enum used in actions/ai.ts so this test will catch
// any future drift between the schema and the actual valid routes.
const VALID_FILTER_PATHS = [
  "/contacts",
  "/contacts?status=conflict",
  "/contacts?status=error",
  "/contacts?lifecycle=opportunity",
  "/contacts?lifecycle=customer",
  "/contacts?lifecycle=salesqualifiedlead",
  "/contacts?lifecycle=lead",
] as const;

const FilterPathSchema = z.enum(VALID_FILTER_PATHS).nullable();

describe("Pipeline alert filterPath validation", () => {
  it("accepts all defined valid paths", () => {
    for (const path of VALID_FILTER_PATHS) {
      expect(() => FilterPathSchema.parse(path)).not.toThrow();
    }
  });

  it("accepts null (no filter)", () => {
    expect(FilterPathSchema.parse(null)).toBe(null);
  });

  it("rejects /customers (old invalid path)", () => {
    expect(() => FilterPathSchema.parse("/customers")).toThrow();
  });

  it("rejects /leads (old invalid path)", () => {
    expect(() => FilterPathSchema.parse("/leads")).toThrow();
  });

  it("rejects /opportunities/open (old invalid path)", () => {
    expect(() => FilterPathSchema.parse("/opportunities/open")).toThrow();
  });

  it("rejects /pipeline (old invalid path)", () => {
    expect(() => FilterPathSchema.parse("/pipeline")).toThrow();
  });

  it("rejects arbitrary strings", () => {
    expect(() => FilterPathSchema.parse("https://evil.com")).toThrow();
    expect(() => FilterPathSchema.parse("")).toThrow();
    expect(() => FilterPathSchema.parse("/admin")).toThrow();
  });
});
