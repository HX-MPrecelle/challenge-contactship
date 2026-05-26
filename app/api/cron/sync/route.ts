import { NextResponse, type NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getHubSpotClient } from "@/lib/hubspot/client";
import { listContactsPage } from "@/lib/hubspot/contacts";
import { upsertContactFromHubSpot } from "@/lib/hubspot/sync";
import { getPortalContactProperties } from "@/lib/hubspot/properties";
import { backfillMissingEmbeddings } from "@/lib/ai/embeddings";
import { HubSpotAuthError } from "@/lib/errors";
import { createNotification } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Hourly delta-sync. Vercel Cron calls this with an `Authorization: Bearer
 * <CRON_SECRET>` header (set in vercel.json + Project Settings). Webhooks
 * remain the primary path; this is the safety net for when ngrok / Vercel /
 * HubSpot itself was unreachable.
 *
 * For every connection we paginate contacts that changed after last_synced_at
 * and run the standard upsert. The sync_hash / order checks inside the
 * upsert make this idempotent — a contact that webhooks already brought in
 * is a no-op here.
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createServiceClient();
  const { data: connections, error: connError } = await admin
    .from("hubspot_connections")
    .select("org_id, last_synced_at, needs_reconnect")
    .eq("needs_reconnect", false);

  if (connError) {
    return NextResponse.json(
      { error: connError.message },
      { status: 500 }
    );
  }

  const report: { orgId: string; processed: number; error?: string }[] = [];

  for (const connection of connections ?? []) {
    let processed = 0;
    try {
      const client = await getHubSpotClient(connection.org_id);

      // Fetch all property definitions once per org — includes custom fields
      const portalProps = await getPortalContactProperties(client);

      let cursor: string | undefined;

      do {
        const page = await listContactsPage(client, {
          after: cursor,
          limit: 100,
          propertyNames: portalProps.names,
        });

        // For each contact, check our stored hubspot_updated_at and only
        // upsert if the HubSpot version is newer (or absent). The upsert
        // itself short-circuits on hash + ordering, but this saves the
        // round-trip for the obvious no-ops.
        const candidates = page.results.filter((contact) => {
          if (!connection.last_synced_at) return true;
          const ts =
            contact.properties?.hs_lastmodifieddate ?? contact.updatedAt;
          if (!ts) return true;
          return (
            new Date(ts).getTime() >=
            new Date(connection.last_synced_at).getTime()
          );
        });

        for (const contact of candidates) {
          try {
            // Upsert without embedding — backfill runs at end of cron pass.
            await upsertContactFromHubSpot(admin, connection.org_id, contact, {
              embedding: null,
            });
            processed++;
          } catch (err) {
            console.error(
              `[cron sync] upsert ${contact.id} failed`,
              err
            );
          }
        }

        cursor = page.paging?.next?.after;
      } while (cursor);

      await admin
        .from("hubspot_connections")
        .update({ last_synced_at: new Date().toISOString() })
        .eq("org_id", connection.org_id);

      // Backfill any missing embeddings for this org after the sync pass.
      const { filled } = await backfillMissingEmbeddings(admin, connection.org_id);
      if (filled > 0) {
        console.log(`[cron sync] embedded ${filled} contacts for org ${connection.org_id}`);
      }

      // Notify the org if any contacts were synced
      if (processed > 0) {
        await createNotification(admin, connection.org_id, {
          type: "hubspot_update",
          title: `Sync diario completado — ${processed} contacto${processed === 1 ? "" : "s"} actualizados`,
          body: "El cron de sincronización diaria finalizó correctamente.",
          link: "/sync",
        });
      }

      // Check for duplicate contacts (best-effort: sample 1 contact)
      try {
        const { data: sample } = await admin
          .from("contacts")
          .select("id, embedding")
          .eq("org_id", connection.org_id)
          .eq("is_archived", false)
          .not("embedding", "is", null)
          .limit(1)
          .single();

        if (sample?.embedding) {
          const { data: matches } = await admin.rpc("match_contacts", {
            query_embedding: sample.embedding as unknown as string,
            match_org_id: connection.org_id,
            match_threshold: 0.88,
            match_count: 2,
          });

          const hasDuplicates = (matches ?? []).some(
            (m: { id: string }) => m.id !== sample.id
          );

          if (hasDuplicates) {
            const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
            const { count: recentCount } = await admin
              .from("notifications")
              .select("id", { count: "exact", head: true })
              .eq("org_id", connection.org_id)
              .eq("type", "duplicate")
              .eq("read", false)
              .gte("created_at", since);

            if (!recentCount || recentCount === 0) {
              await createNotification(admin, connection.org_id, {
                type: "duplicate",
                title: "Se detectaron posibles duplicados",
                body: "Revisá y mergeá los contactos duplicados para mantener tu base limpia.",
                link: "/contacts/duplicates",
              });
            }
          }
        }
      } catch {
        // Non-critical — don't fail the cron if duplicate check errors
      }

      report.push({ orgId: connection.org_id, processed });
    } catch (err) {
      const message =
        err instanceof HubSpotAuthError
          ? "auth"
          : err instanceof Error
            ? err.message
            : "unknown";
      report.push({ orgId: connection.org_id, processed, error: message });
    }
  }

  return NextResponse.json({ ok: true, report });
}
