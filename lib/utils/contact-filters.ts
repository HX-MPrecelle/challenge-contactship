export type AiFilterOperator = "eq" | "ilike" | "lt" | "gt" | "lte" | "gte";

export type AiFilterClause = {
  field: string;
  operator: AiFilterOperator;
  value: string;
};

/**
 * Apply a single structured filter clause to a contact row.
 * Pure function — no side effects, easy to unit test.
 */
export function matchesFilter(
  contact: Record<string, unknown>,
  filter: AiFilterClause
): boolean {
  const rawValue = contact[filter.field];
  if (rawValue === null || rawValue === undefined) return false;
  const fieldValue = String(rawValue);

  switch (filter.operator) {
    case "eq":
      return fieldValue.toLowerCase() === filter.value.toLowerCase();
    case "ilike": {
      const needle = filter.value.replace(/%/g, "").toLowerCase();
      return fieldValue.toLowerCase().includes(needle);
    }
    case "lt":
      return new Date(fieldValue).getTime() < new Date(filter.value).getTime();
    case "gt":
      return new Date(fieldValue).getTime() > new Date(filter.value).getTime();
    case "lte":
      return new Date(fieldValue).getTime() <= new Date(filter.value).getTime();
    case "gte":
      return new Date(fieldValue).getTime() >= new Date(filter.value).getTime();
    default:
      return false;
  }
}
