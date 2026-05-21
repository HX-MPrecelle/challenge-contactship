/**
 * One-shot migration runner using the Supabase Management API.
 *
 * Requirements:
 *   SUPABASE_ACCESS_TOKEN — Personal Access Token from
 *   https://supabase.com/dashboard/account/tokens
 *
 * Usage:
 *   set SUPABASE_ACCESS_TOKEN=your_token_here
 *   node scripts/run-migration.mjs
 *
 * Or inline:
 *   SUPABASE_ACCESS_TOKEN=your_token node scripts/run-migration.mjs
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "elzhqctmsauuotfgbjsl";
const MIGRATION_FILE = resolve(__dirname, "../supabase/migrations/008_chat.sql");

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error(`
ERROR: SUPABASE_ACCESS_TOKEN not set.

Get your token from: https://supabase.com/dashboard/account/tokens

Then run:
  set SUPABASE_ACCESS_TOKEN=your_token_here  (PowerShell)
  node scripts/run-migration.mjs
`);
  process.exit(1);
}

const sql = readFileSync(MIGRATION_FILE, "utf8");

console.log(`Running migration: 008_chat.sql`);
console.log(`Project: ${PROJECT_REF}`);

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }
);

if (!res.ok) {
  const body = await res.text();
  console.error(`FAILED (${res.status}): ${body}`);
  process.exit(1);
}

const result = await res.json().catch(() => ({}));
console.log("Migration applied successfully.");
if (result) console.log(JSON.stringify(result, null, 2));
