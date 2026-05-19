import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as {
  __contactship_db?: ReturnType<typeof createClient>;
  __contactship_pg?: ReturnType<typeof postgres>;
};

function createClient(url: string) {
  const queryClient = postgres(url, {
    prepare: false,
    max: 1,
  });
  globalForDb.__contactship_pg = queryClient;
  return drizzle(queryClient, { schema, casing: "snake_case" });
}

export function getDb() {
  if (globalForDb.__contactship_db) return globalForDb.__contactship_db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = createClient(url);
  globalForDb.__contactship_db = client;
  return client;
}

export type Db = ReturnType<typeof getDb>;
