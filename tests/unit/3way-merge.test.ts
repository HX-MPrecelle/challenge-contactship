import { describe, it, expect } from "vitest";
import { getChangedFields, analyzeThreeWayMerge, type MergeState } from "@/lib/utils/3way-merge";

const base: MergeState = {
  first_name: "Leonardo",
  last_name:  "Pereyra",
  email:      "leo@example.com",
  phone:      "+54 11 1234",
  company:    "MercaDigital",
  job_title:  "CTO",
};

describe("getChangedFields", () => {
  it("returns empty set when nothing changed", () => {
    expect(getChangedFields(base, { ...base })).toEqual(new Set());
  });

  it("detects a single changed field", () => {
    const changed = getChangedFields(base, { ...base, first_name: "Leo" });
    expect(changed).toEqual(new Set(["first_name"]));
  });

  it("detects multiple changed fields", () => {
    const changed = getChangedFields(base, {
      ...base,
      first_name: "Leo",
      phone: "+54 11 9999",
    });
    expect(changed).toEqual(new Set(["first_name", "phone"]));
  });

  it("treats null and empty string as different values", () => {
    const changed = getChangedFields(
      { ...base, phone: null },
      { ...base, phone: "" }
    );
    // null !== "" so it should detect a change
    expect(changed).toEqual(new Set(["phone"]));
  });

  it("treats two nulls as equal (no change)", () => {
    const changed = getChangedFields(
      { ...base, phone: null },
      { ...base, phone: null }
    );
    expect(changed).toEqual(new Set());
  });
});

describe("analyzeThreeWayMerge", () => {
  it("no conflict when only hubspot changed a field", () => {
    const hubspot = { ...base, phone: "+59 2342 48-4223" };
    const result  = analyzeThreeWayMerge(base, base, hubspot);

    expect(result.hasConflict).toBe(false);
    expect(result.trueConflicts).toEqual(new Set());
    expect(result.autoFromHubspot).toEqual(new Set(["phone"]));
    expect(result.autoFromLocal).toEqual(new Set());
  });

  it("no conflict when only local changed a field", () => {
    const local  = { ...base, first_name: "Leonardo Andrés" };
    const result = analyzeThreeWayMerge(base, local, base);

    expect(result.hasConflict).toBe(false);
    expect(result.trueConflicts).toEqual(new Set());
    expect(result.autoFromLocal).toEqual(new Set(["first_name"]));
    expect(result.autoFromHubspot).toEqual(new Set());
  });

  it("detects true conflict when BOTH sides changed the same field", () => {
    const local   = { ...base, first_name: "Leonardo Andrés" };
    const hubspot = { ...base, first_name: "Leo" };
    const result  = analyzeThreeWayMerge(base, local, hubspot);

    expect(result.hasConflict).toBe(true);
    expect(result.trueConflicts).toEqual(new Set(["first_name"]));
  });

  it("mixes conflict and auto-merge when different fields changed on each side", () => {
    const local   = { ...base, first_name: "Leonardo Andrés" }; // local changed name
    const hubspot = { ...base, first_name: "Leo", phone: "+59 9999" }; // hs changed name + phone

    const result = analyzeThreeWayMerge(base, local, hubspot);

    expect(result.hasConflict).toBe(true);
    expect(result.trueConflicts).toEqual(new Set(["first_name"]));   // both changed name
    expect(result.autoFromHubspot).toEqual(new Set(["phone"]));      // only hs changed phone
    expect(result.autoFromLocal).toEqual(new Set());
  });

  it("no conflict when both sides converged on the same new value", () => {
    // Both sides changed first_name to the same value — not a real conflict
    const local   = { ...base, first_name: "Leo" };
    const hubspot = { ...base, first_name: "Leo" };
    const result  = analyzeThreeWayMerge(base, local, hubspot);

    // Both changed from "Leonardo" to "Leo" — they agree, no conflict
    expect(result.hasConflict).toBe(false);
    expect(result.trueConflicts).toEqual(new Set());
  });

  it("returns all fields as hubspot-only when local is identical to base", () => {
    const hubspot = {
      first_name: "Leo", last_name: "P", email: "new@x.com",
      phone: "+1", company: "NewCo", job_title: "CEO",
    };
    const result = analyzeThreeWayMerge(base, base, hubspot);

    expect(result.hasConflict).toBe(false);
    expect(result.autoFromHubspot.size).toBe(6);
    expect(result.autoFromLocal.size).toBe(0);
  });
});
