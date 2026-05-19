import { defineConfig } from "drizzle-kit";

const directUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!directUrl) {
  throw new Error(
    "DIRECT_URL (preferred) or DATABASE_URL must be set to run drizzle-kit.",
  );
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: directUrl,
  },
  schemaFilter: ["public"],
  strict: true,
  verbose: true,
});
