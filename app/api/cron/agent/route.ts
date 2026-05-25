import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { runFollowUpAgent } from "@/lib/ai/agent";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily autonomous agent cron. Vercel Cron calls this with an
 * `Authorization: Bearer <CRON_SECRET>` header.
 * Iterates over all connected orgs and runs the follow-up agent for each.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const admin = createServiceClient();
  const { data: connections } = await admin
    .from("hubspot_connections")
    .select("org_id")
    .eq("needs_reconnect", false);

  const report: { orgId: string; actionsGenerated: number; errors: number; error?: string }[] = [];

  for (const conn of connections ?? []) {
    try {
      // thresholdDays=0 → analyze all contacts regardless of last activity date.
      // Use AGENT_THRESHOLD_DAYS env var to override (default 0 for demos).
      const threshold = parseInt(process.env.AGENT_THRESHOLD_DAYS ?? "0", 10);
      const result = await runFollowUpAgent(admin, conn.org_id, "es", threshold);

      if (result.actionsGenerated > 0) {
        const n = result.actionsGenerated;
        await createNotification(admin, conn.org_id, {
          type: "agent_run",
          title: `Agente IA — ${n} acción${n === 1 ? "" : "es"} nueva${n === 1 ? "" : "s"}`,
          body: "El agente detectó contactos en riesgo y generó recomendaciones.",
          link: "/agent",
        });
      }

      report.push({ orgId: conn.org_id, ...result });
    } catch (err) {
      report.push({
        orgId: conn.org_id,
        actionsGenerated: 0,
        errors: 1,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({ ok: true, report });
}
