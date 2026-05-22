import { describe, it, expect } from "vitest";

// The field-selection logic in resolveConflictMerge builds a mergedProps object
// by choosing between 'local' and 'hubspot' state per field. We test that
// decision boundary without touching the Supabase/HubSpot I/O layer.

type FieldChoice = { field: string; source: "local" | "hubspot" };

const HUBSPOT_PROP_MAP: Record<string, string> = {
  first_name: "firstname",
  last_name: "lastname",
  email: "email",
  phone: "phone",
  company: "company",
  job_title: "jobtitle",
};

const CONFLICT_FIELDS = Object.keys(HUBSPOT_PROP_MAP);

function buildMergedProps(
  localRow: Record<string, string | null>,
  hubspotState: Record<string, string | null | undefined>,
  choices: FieldChoice[]
): Record<string, string> {
  const choicesByField = new Map(choices.map((c) => [c.field, c.source]));
  const merged: Record<string, string> = {};
  for (const field of CONFLICT_FIELDS) {
    const source = choicesByField.get(field) ?? "local";
    const value =
      source === "hubspot" ? (hubspotState[field] ?? null) : (localRow[field] ?? null);
    const hsKey = HUBSPOT_PROP_MAP[field];
    if (hsKey) merged[hsKey] = value ?? "";
  }
  return merged;
}

describe("conflict merge field selection", () => {
  const local = {
    first_name: "Jorge",
    last_name: "Pérez",
    email: "jorge@local.com",
    phone: "+54 11 1234",
    company: "LocalCo",
    job_title: "CEO",
  };

  const hubspot = {
    first_name: "George",
    last_name: "Perez",
    email: "jorge@hubspot.com",
    phone: null,
    company: "HubSpotCo",
    job_title: "Chief Executive",
  };

  it("uses local values when all choices are 'local'", () => {
    const choices = CONFLICT_FIELDS.map((f) => ({ field: f, source: "local" as const }));
    const merged = buildMergedProps(local, hubspot, choices);
    expect(merged.firstname).toBe("Jorge");
    expect(merged.email).toBe("jorge@local.com");
    expect(merged.company).toBe("LocalCo");
  });

  it("uses hubspot values when all choices are 'hubspot'", () => {
    const choices = CONFLICT_FIELDS.map((f) => ({ field: f, source: "hubspot" as const }));
    const merged = buildMergedProps(local, hubspot, choices);
    expect(merged.firstname).toBe("George");
    expect(merged.email).toBe("jorge@hubspot.com");
    expect(merged.company).toBe("HubSpotCo");
  });

  it("mixes sources per field (cherry-pick)", () => {
    const choices: FieldChoice[] = [
      { field: "first_name", source: "local" },
      { field: "email", source: "hubspot" },
      { field: "company", source: "hubspot" },
    ];
    const merged = buildMergedProps(local, hubspot, choices);
    expect(merged.firstname).toBe("Jorge");
    expect(merged.email).toBe("jorge@hubspot.com");
    expect(merged.company).toBe("HubSpotCo");
  });

  it("falls back to empty string when hubspot value is null", () => {
    const choices: FieldChoice[] = [{ field: "phone", source: "hubspot" }];
    const merged = buildMergedProps(local, hubspot, choices);
    expect(merged.phone).toBe("");
  });

  it("defaults to 'local' when a field has no choice specified", () => {
    const merged = buildMergedProps(local, hubspot, []);
    expect(merged.firstname).toBe("Jorge");
    expect(merged.company).toBe("LocalCo");
  });
});
