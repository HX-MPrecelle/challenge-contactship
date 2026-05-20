#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
if (!TOKEN) {
  console.error(
    "HUBSPOT_PRIVATE_APP_TOKEN no está seteado. Generá un Private App en\n" +
      "tu test account de HubSpot (Settings → Integrations → Private Apps)\n" +
      "y exportá el token antes de correr este script:\n" +
      "  export HUBSPOT_PRIVATE_APP_TOKEN=pat-na1-..."
  );
  process.exit(1);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, "seed-data.json");
const contacts = JSON.parse(readFileSync(dataPath, "utf8"));

console.log(`Cargando ${contacts.length} contactos a HubSpot...`);

// HubSpot's batch create endpoint accepts up to 100 contacts per call.
const CHUNK = 100;
let created = 0;
let updated = 0;
let failed = 0;

for (let i = 0; i < contacts.length; i += CHUNK) {
  const slice = contacts.slice(i, i + CHUNK);
  const response = await fetch(
    "https://api.hubapi.com/crm/v3/objects/contacts/batch/create",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({
        inputs: slice.map((c) => ({ properties: c })),
      }),
    }
  );

  const body = await response.json();

  if (response.status === 207 || response.status === 200 || response.status === 201) {
    created += body.results?.length ?? 0;
    if (body.numErrors > 0) {
      // Treat existing-email errors as a successful upsert via PATCH-by-email.
      // The simplest path for a dev sandbox is to ignore them — the contacts
      // already exist, which is the desired state.
      const conflicts = (body.errors ?? []).filter(
        (e) => e?.category === "CONFLICT"
      );
      updated += conflicts.length;
      failed += body.numErrors - conflicts.length;
    }
  } else if (response.status === 409) {
    // All contacts in this slice conflicted (already exist).
    updated += slice.length;
  } else {
    console.error(
      `Batch ${i / CHUNK + 1} falló (HTTP ${response.status}):`,
      JSON.stringify(body, null, 2)
    );
    failed += slice.length;
  }
}

console.log(
  `Resultado — creados: ${created}, ya existían: ${updated}, errores: ${failed}`
);
process.exit(failed > 0 ? 1 : 0);
