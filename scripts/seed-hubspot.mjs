#!/usr/bin/env node
/**
 * Seeds HubSpot with contacts from seed-data.json and seed-data-v2.json.
 * Run with: HUBSPOT_PRIVATE_APP_TOKEN=pat-... node scripts/seed-hubspot.mjs
 *
 * Pass --v2 to seed only the new v2 batch (100 contacts).
 * Pass --all to seed both batches (default).
 */
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
const args = process.argv.slice(2);
const v2Only = args.includes("--v2");

let contacts = [];

if (!v2Only) {
  const v1 = JSON.parse(readFileSync(join(__dirname, "seed-data.json"), "utf8"));
  contacts = contacts.concat(v1);
  console.log(`seed-data.json: ${v1.length} contactos`);
}

const v2 = JSON.parse(readFileSync(join(__dirname, "seed-data-v2.json"), "utf8"));
contacts = contacts.concat(v2);
console.log(`seed-data-v2.json: ${v2.length} contactos`);
console.log(`Total a cargar: ${contacts.length} contactos`);

// HubSpot's batch create endpoint accepts up to 100 contacts per call.
const CHUNK = 100;
let created = 0;
let updated = 0;
let failed = 0;

for (let i = 0; i < contacts.length; i += CHUNK) {
  const slice = contacts.slice(i, i + CHUNK);
  const chunkNum = Math.floor(i / CHUNK) + 1;
  const totalChunks = Math.ceil(contacts.length / CHUNK);
  process.stdout.write(`  Chunk ${chunkNum}/${totalChunks} (${slice.length} contacts)... `);

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
    const chunkCreated = body.results?.length ?? 0;
    created += chunkCreated;
    if (body.numErrors > 0) {
      const conflicts = (body.errors ?? []).filter(
        (e) => e?.category === "CONFLICT"
      );
      updated += conflicts.length;
      failed += body.numErrors - conflicts.length;
      console.log(`OK (${chunkCreated} nuevos, ${conflicts.length} ya existían)`);
    } else {
      console.log(`OK (${chunkCreated} nuevos)`);
    }
  } else if (response.status === 409) {
    updated += slice.length;
    console.log(`OK (${slice.length} ya existían)`);
  } else {
    console.error(`ERROR HTTP ${response.status}:`, JSON.stringify(body, null, 2));
    failed += slice.length;
  }
}

console.log(`\nResultado final:`);
console.log(`  ✓ Creados:       ${created}`);
console.log(`  ~ Ya existían:   ${updated}`);
console.log(`  ✗ Errores:       ${failed}`);

process.exit(failed > 0 ? 1 : 0);
