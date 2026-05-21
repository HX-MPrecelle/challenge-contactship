import {
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  stepCountIs,
  type UIMessage,
  type ToolSet,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { NextResponse, type NextRequest } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { backfillMissingEmbeddings } from "@/lib/ai/embeddings";
import { retrieveRelevantContacts } from "@/lib/ai/chat";
import { getPersonaInstructions, type ChatPersona } from "@/lib/ai/persona";
import type { ChatUIMessage, ContactCitation } from "@/types/chat";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ─── Data model documentation ─────────────────────────────────────────────────
const DATA_MODEL = `
CRM DATA MODEL (HubSpot mirror):

lifecycle_stage values:
  subscriber | lead | marketingqualifiedlead | salesqualifiedlead | opportunity | customer | evangelist
  → "customer" = closed/won deals (always use this for "leads cerrados", "closed deals", "clients")
  → "opportunity" = active deals being worked, near close

lead_status values:
  NEW | OPEN | IN_PROGRESS | OPEN_DEAL | UNQUALIFIED | ATTEMPTED_TO_CONTACT | CONNECTED | BAD_TIMING
  → OPEN_DEAL = has an active deal | IN_PROGRESS = being actively worked
  → ATTEMPTED_TO_CONTACT = tried to reach, no response | BAD_TIMING = not ready now

properties (JSONB — custom fields that vary per company HubSpot portal):
  May include: industry, numemployees, annualrevenue, hs_buying_role, hs_analytics_source,
  message (CRM notes with deal context), hs_last_contacted, and any custom fields
  the company configured in HubSpot. Always check 'message' for sales notes.
`;

const SYSTEM_PROMPT = `You are an intelligent B2B sales assistant with full access to a CRM via tools.

RULES:
1. ALWAYS respond in the same language the user writes in — mirror their language exactly.
2. NEVER say "I don't have access" — use your tools to fetch whatever data you need.
3. Before answering, call the appropriate tool(s) to get real data.
4. For complex questions, call multiple tools or call the same tool with different parameters.
5. Be specific: cite contact names, use real numbers from the data, identify patterns.
6. When showing lists, include key context (stage, status, company, notes).

${DATA_MODEL}`;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return NextResponse.json({ error: "No org" }, { status: 400 });

  const { messages, persona } = (await request.json()) as {
    messages: UIMessage[];
    persona?: ChatPersona;
  };

  const admin = createServiceClient();
  await backfillMissingEmbeddings(admin, orgId);

  const { count: totalContacts } = await admin
    .from("contacts")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("is_archived", false);

  const total = totalContacts ?? 0;

  const system = `${SYSTEM_PROMPT}\n\n${getPersonaInstructions(persona)}\n\nTotal CRM contacts: ${total}. Use your tools to access them.`;

  const modelMessages = await convertToModelMessages(messages);

  // ─── Citation accumulator (filled by tool execute functions) ──────────────
  const citationMap = new Map<string, ContactCitation>();

  const CONTACT_FIELDS = "id, first_name, last_name, email, company, job_title, lifecycle_stage, lead_status, country, city, properties";

  function toRow(c: Record<string, unknown>) {
    const p = (c.properties ?? {}) as Record<string, string | null>;
    const row: Record<string, unknown> = {
      id: c.id,
      name: [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "—",
      email: c.email,
      company: c.company,
      jobTitle: c.job_title,
      lifecycleStage: c.lifecycle_stage,
      leadStatus: c.lead_status,
      country: c.country,
    };
    if (p.industry) row.industry = p.industry;
    if (p.message) row.crmNotes = p.message.slice(0, 400);
    if (p.hs_buying_role) row.buyingRole = p.hs_buying_role;
    if (p.numemployees) row.employees = p.numemployees;
    return row;
  }

  function addCitations(rows: Record<string, unknown>[], sim = 0.9) {
    rows.forEach((r) => {
      const id = r.id as string;
      if (!citationMap.has(id)) {
        citationMap.set(id, {
          id,
          name: r.name as string,
          company: (r.company as string | null) ?? null,
          similarity: sim,
        });
      }
    });
  }

  // ─── Tool set ───────────────────────────────────────────────────────────────
  // Typed as ToolSet so streamText infers correctly. Execute functions are
  // async closures over admin/orgId.

  const tools = {
    searchContacts: {
      description: `Filter contacts by structured CRM fields.
Use for: "closed deals" (lifecycleStage=customer), "near close" (opportunity),
"active deals" (leadStatus=OPEN_DEAL or IN_PROGRESS), "no response" (ATTEMPTED_TO_CONTACT),
contacts from a country, company, or industry.
Combine multiple filters for precision.`,
      inputSchema: z.object({
        lifecycleStage: z.string().optional().describe(
          "subscriber | lead | marketingqualifiedlead | salesqualifiedlead | opportunity | customer"
        ),
        leadStatus: z.string().optional().describe(
          "NEW | OPEN | IN_PROGRESS | OPEN_DEAL | UNQUALIFIED | ATTEMPTED_TO_CONTACT | CONNECTED | BAD_TIMING"
        ),
        country: z.string().optional().describe("Country name, partial match"),
        company: z.string().optional().describe("Company name, partial match"),
        industry: z.string().optional().describe("Industry from properties, partial match"),
        limit: z.number().min(1).max(50).default(25),
        orderBy: z.enum(["recent", "company", "name"]).default("recent"),
      }),
      execute: async (args: {
        lifecycleStage?: string;
        leadStatus?: string;
        country?: string;
        company?: string;
        industry?: string;
        limit?: number;
        orderBy?: string;
      }) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = admin
          .from("contacts")
          .select(CONTACT_FIELDS)
          .eq("org_id", orgId)
          .eq("is_archived", false);

        if (args.lifecycleStage) q = q.eq("lifecycle_stage", args.lifecycleStage);
        if (args.leadStatus) q = q.eq("lead_status", args.leadStatus);
        if (args.country) q = q.ilike("country", `%${args.country}%`);
        if (args.company) q = q.ilike("company", `%${args.company}%`);
        if (args.industry) q = q.filter("properties->>'industry'", "ilike", `%${args.industry}%`);

        const col = args.orderBy === "company" ? "company" : args.orderBy === "name" ? "first_name" : "local_updated_at";
        q = q.order(col, { ascending: args.orderBy === "name" || args.orderBy === "company" });

        const { data, error } = await q.limit(args.limit ?? 25);
        if (error) return { error: (error as { message: string }).message };

        const rows = ((data ?? []) as Record<string, unknown>[]).map(toRow);
        addCitations(rows);
        return { found: rows.length, contacts: rows };
      },
    },

    semanticSearch: {
      description: `Search contacts by meaning/concept, not exact fields.
Use for: open-ended queries like "decision makers in fintech", "contacts interested in AI",
"similar to our best customers", "contacts with budget approved", "compliance concerns".
Embeds the query and finds the most semantically similar contacts.`,
      inputSchema: z.object({
        query: z.string().describe("Natural language search query"),
        limit: z.number().min(1).max(30).default(15),
      }),
      execute: async (args: { query: string; limit?: number }) => {
        const results = await retrieveRelevantContacts(admin, orgId, args.query);
        const trimmed = results.slice(0, args.limit ?? 15);
        const rows = trimmed.map((c) => ({
          id: c.id,
          name: [c.first_name, c.last_name].filter(Boolean).join(" ") || "—",
          email: c.email,
          company: c.company,
          jobTitle: c.job_title,
          lifecycleStage: c.lifecycle_stage,
          leadStatus: c.lead_status,
          country: c.country,
          similarity: `${Math.round(c.similarity * 100)}%`,
        }));
        addCitations(rows as unknown as Record<string, unknown>[], trimmed[0]?.similarity ?? 0.5);
        return { found: rows.length, contacts: rows };
      },
    },

    getStats: {
      description: `Aggregate counts grouped by a field.
Use for: "how many per country / stage / lead status?", "pipeline distribution",
"which industry has most leads?", "breakdown of my customers by country".`,
      inputSchema: z.object({
        groupBy: z.enum(["lifecycle_stage", "lead_status", "country", "industry", "company"]),
        stageFilter: z.string().optional().describe("Optional: only count contacts in this lifecycle_stage"),
      }),
      execute: async (args: { groupBy: string; stageFilter?: string }) => {
        const isJsonb = args.groupBy === "industry";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let q: any = admin
          .from("contacts")
          .select(isJsonb ? "properties" : args.groupBy)
          .eq("org_id", orgId)
          .eq("is_archived", false);

        if (args.stageFilter) q = q.eq("lifecycle_stage", args.stageFilter);

        const { data, error } = await q;
        if (error) return { error: (error as { message: string }).message };

        const counts: Record<string, number> = {};
        for (const row of (data ?? []) as Record<string, unknown>[]) {
          const val = isJsonb
            ? (((row as { properties?: Record<string, string> }).properties?.industry) ?? "Unknown")
            : ((row as Record<string, string | null>)[args.groupBy] ?? "Unknown");
          counts[val] = (counts[val] ?? 0) + 1;
        }

        const n = (data ?? []).length;
        return {
          groupBy: args.groupBy,
          total: n,
          distribution: Object.entries(counts)
            .sort(([, a], [, b]) => b - a)
            .map(([value, count]) => ({ value, count, pct: `${Math.round((count / (n || 1)) * 100)}%` })),
        };
      },
    },

    getContactDetails: {
      description: `Get full details of a specific contact including CRM notes, custom properties, and recent activity. Use when you need deep context on one person.`,
      inputSchema: z.object({
        contactId: z.string().describe("Contact UUID"),
      }),
      execute: async (args: { contactId: string }) => {
        const { data, error } = await admin
          .from("contacts")
          .select("*, sync_events(event_type, created_at, direction)")
          .eq("id", args.contactId)
          .eq("org_id", orgId)
          .maybeSingle();

        if (error || !data) return { error: "Contact not found" };

        return {
          id: data.id,
          name: [data.first_name, data.last_name].filter(Boolean).join(" ") || "—",
          email: data.email,
          phone: data.phone,
          company: data.company,
          jobTitle: data.job_title,
          lifecycleStage: data.lifecycle_stage,
          leadStatus: data.lead_status,
          country: data.country,
          city: data.city,
          website: data.website,
          syncStatus: data.sync_status,
          lastUpdated: data.local_updated_at,
          allCustomProperties: data.properties,
          recentActivity: ((data as unknown as { sync_events?: Array<{ event_type: string; created_at: string; direction: string }> }).sync_events ?? [])
            .slice(0, 5)
            .map((e) => `${e.event_type} (${e.direction}) — ${new Date(e.created_at).toLocaleDateString()}`),
        };
      },
    },
  } satisfies ToolSet;

  // ─── Stream ──────────────────────────────────────────────────────────────────

  const stream = createUIMessageStream<ChatUIMessage>({
    execute: ({ writer }) => {
      const result = streamText({
        model: openai("gpt-4o-mini"),
        system,
        messages: modelMessages,
        tools,
        // Allow up to 5 tool call rounds so the model can chain searches
        stopWhen: stepCountIs(5),
        onStepFinish: () => {
          // Emit citations collected so far after each tool step
          if (citationMap.size > 0) {
            writer.write({
              type: "data-citations",
              id: `citations-${Date.now()}`,
              data: { contacts: Array.from(citationMap.values()) },
            });
          }
        },
      });

      writer.merge(result.toUIMessageStream());
    },
  });

  return createUIMessageStreamResponse({ stream });
}
