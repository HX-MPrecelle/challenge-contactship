"use server";

import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getOrGenerateInsights, type CachedInsights } from "@/lib/ai/insights";
import { parseSearchQuery, type ParsedSearch } from "@/lib/ai/search";
import {
  buildContactText,
  normalizeHubSpotContact,
} from "@/lib/hubspot/sync";
import type { HubSpotContact } from "@/lib/hubspot/contacts";

type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string; code?: string };

const InsightsInputSchema = z.object({
  contactId: z.string().uuid(),
  forceRefresh: z.boolean().optional(),
});

export async function generateInsightsAction(
  input: z.infer<typeof InsightsInputSchema>
): Promise<ActionResult<CachedInsights>> {
  const parsed = InsightsInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Datos inválidos", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const { data: contact, error: lookupError } = await supabase
    .from("contacts")
    .select(
      "id, hubspot_id, first_name, last_name, email, phone, company, job_title, lifecycle_stage, lead_status, country, city, website, properties"
    )
    .eq("id", parsed.data.contactId)
    .eq("org_id", orgId)
    .maybeSingle();

  if (lookupError || !contact) {
    return { success: false, error: "Contacto no encontrado", code: "NOT_FOUND" };
  }

  const admin = createServiceClient();

  if (parsed.data.forceRefresh) {
    await admin
      .from("ai_insights")
      .delete()
      .eq("org_id", orgId)
      .eq("contact_id", contact.id);
  }

  const fakeHubSpot: HubSpotContact = {
    id: contact.hubspot_id,
    properties: {
      firstname: contact.first_name,
      lastname: contact.last_name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      jobtitle: contact.job_title,
      lifecyclestage: contact.lifecycle_stage,
      hs_lead_status: contact.lead_status,
      country: contact.country,
      city: contact.city,
      website: contact.website,
    },
    createdAt: "",
    updatedAt: "",
    archived: false,
  };
  const text = buildContactText(normalizeHubSpotContact(fakeHubSpot));

  const result = await getOrGenerateInsights(admin, orgId, contact.id, text);
  if ("error" in result) {
    return { success: false, error: result.error, code: "AI_ERROR" };
  }

  return { success: true, data: result };
}

const SearchInputSchema = z.object({
  query: z.string().min(1).max(400),
});

export async function naturalLanguageSearch(
  input: z.infer<typeof SearchInputSchema>
): Promise<ActionResult<ParsedSearch & { resultCount: number }>> {
  const parsed = SearchInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Consulta vacía", code: "VALIDATION_ERROR" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "No autorizado", code: "UNAUTHORIZED" };

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return { success: false, error: "Sin organización", code: "NO_ORG" };

  const parsedSearch = await parseSearchQuery(parsed.data.query);
  if ("error" in parsedSearch) {
    return { success: false, error: parsedSearch.error, code: "AI_ERROR" };
  }

  // Apply filters to a head request just to count rows — the actual contact
  // list rerenders client-side with the filters via URL state.
  let query = supabase
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_archived", false);

  for (const filter of parsedSearch.filters) {
    // PostgREST exposes ilike/eq/lt/gt/lte/gte directly. We whitelisted the
    // operator set in the schema; cast keeps the dynamic dispatch happy.
    query = (query as unknown as {
      filter: (col: string, op: string, val: string) => typeof query;
    }).filter(filter.field, filter.operator, filter.value);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[naturalLanguageSearch] count failed", error);
    return {
      success: false,
      error: "Falló la búsqueda. Intentá reformularla.",
      code: "INTERNAL_ERROR",
    };
  }

  return {
    success: true,
    data: { ...parsedSearch, resultCount: count ?? 0 },
  };
}
