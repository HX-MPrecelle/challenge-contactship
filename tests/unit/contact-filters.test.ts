import { describe, it, expect } from "vitest";
import { matchesFilter } from "@/lib/utils/contact-filters";

const baseContact = {
  id: "uuid-1",
  first_name: "María",
  last_name: "García",
  email: "maria@acme.com",
  company: "Acme Corp",
  job_title: "VP Sales",
  lifecycle_stage: "opportunity",
  lead_status: "IN_PROGRESS",
  country: "Argentina",
  local_updated_at: "2024-01-15T10:00:00Z",
};

describe("matchesFilter", () => {
  it("returns true when eq operator matches case-insensitively", () => {
    expect(
      matchesFilter(baseContact, { field: "lifecycle_stage", operator: "eq", value: "OPPORTUNITY" })
    ).toBe(true);
  });

  it("returns false when eq operator does not match", () => {
    expect(
      matchesFilter(baseContact, { field: "lifecycle_stage", operator: "eq", value: "customer" })
    ).toBe(false);
  });

  it("returns true when ilike finds substring (strips % wildcards)", () => {
    expect(
      matchesFilter(baseContact, { field: "company", operator: "ilike", value: "%acme%" })
    ).toBe(true);
  });

  it("returns false when ilike finds no match", () => {
    expect(
      matchesFilter(baseContact, { field: "company", operator: "ilike", value: "%hubspot%" })
    ).toBe(false);
  });

  it("returns true when lt compares dates correctly", () => {
    expect(
      matchesFilter(baseContact, {
        field: "local_updated_at",
        operator: "lt",
        value: "2024-06-01T00:00:00Z",
      })
    ).toBe(true);
  });

  it("returns false when gt fails because date is older", () => {
    expect(
      matchesFilter(baseContact, {
        field: "local_updated_at",
        operator: "gt",
        value: "2025-01-01T00:00:00Z",
      })
    ).toBe(false);
  });

  it("returns false for null field value regardless of operator", () => {
    const contactWithNullCountry = { ...baseContact, country: null };
    expect(
      matchesFilter(contactWithNullCountry, { field: "country", operator: "eq", value: "Argentina" })
    ).toBe(false);
  });

  it("returns false for unknown operator", () => {
    expect(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      matchesFilter(baseContact, { field: "company", operator: "regex" as any, value: "Acme" })
    ).toBe(false);
  });
});
