import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL ?? "postgres://captcf@localhost:5433/captcf";

// Reuse a single pool across HMR in dev to avoid exhausting connections.
const globalForDb = globalThis as unknown as {
  __captcf_sql?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__captcf_sql ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 5,
    idle_timeout: 20,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") globalForDb.__captcf_sql = client;

export const db = drizzle(client, { schema });
export { schema };
export type Db = typeof db;
