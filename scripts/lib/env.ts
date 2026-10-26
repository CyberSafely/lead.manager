// Database connection for scripts on this computer. Reads the git-ignored .env.cloud; never prints secrets.
// Use SUPABASE_DB_URL if set, otherwise DATABASE_PASSWORD + SUPABASE_DB_HOST (session pooler) + the project ref.
// TLS is verified against Supabase's root CA (supabase/prod-ca-2021.crt), so a network in between can't read the data.
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.join(import.meta.dirname, "../..");
const CA_FILE = path.join(ROOT, "supabase/prod-ca-2021.crt");

export function readEnv(): Record<string, string> {
  const file = path.join(ROOT, ".env.cloud");
  if (!fs.existsSync(file)) throw new Error(".env.cloud not found (copy .env.cloud.example)");
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

export async function connect(): Promise<pg.Client> {
  const env = readEnv();
  if (!fs.existsSync(CA_FILE)) throw new Error("supabase/prod-ca-2021.crt is missing (Supabase → Project Settings → Database → SSL → Download certificate)");
  const ssl = { ca: fs.readFileSync(CA_FILE, "utf8"), rejectUnauthorized: true };
  let cfg: pg.ClientConfig;
  if (env.SUPABASE_DB_URL && !/^postgres(ql)?:\/\//.test(env.SUPABASE_DB_URL))
    throw new Error("SUPABASE_DB_URL must be a postgresql:// connection string (Project Settings → Database → Connection string), not the project's https:// address. Or leave it empty and use DATABASE_PASSWORD + SUPABASE_DB_HOST.");
  if (env.SUPABASE_DB_URL) {
    // sslmode etc. in the URL would override the CA settings: drop them
    const u = new URL(env.SUPABASE_DB_URL);
    ["sslmode", "sslrootcert", "sslcert", "sslkey", "uselibpqcompat"].forEach(k => u.searchParams.delete(k));
    cfg = { connectionString: u.toString(), ssl };
  } else {
    const ref = (env.VITE_SUPABASE_URL || "").match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1];
    if (!env.DATABASE_PASSWORD || !ref) throw new Error("Set SUPABASE_DB_URL, or DATABASE_PASSWORD with VITE_SUPABASE_URL, in .env.cloud");
    if (!env.SUPABASE_DB_HOST) throw new Error("Set SUPABASE_DB_HOST in .env.cloud: the Session pooler host from Project Settings → Database → Connection string (e.g. aws-0-us-east-1.pooler.supabase.com)");
    cfg = { host: env.SUPABASE_DB_HOST, port: 5432, database: "postgres", user: `postgres.${ref}`, password: env.DATABASE_PASSWORD, ssl };
  }
  const c = new pg.Client({ connectionTimeoutMillis: 15_000, ...cfg }); await c.connect(); return c;
}

/** A database error without the row data Postgres sometimes adds ("Failing row contains …"): safe to print. */
export function safeError(e: any): string {
  return `${e?.code ? e.code + " " : ""}${String(e?.message ?? e).replace(/"[^"]*"/g, '"…"').slice(0, 200)}`;
}

export const ROOT_DIR = ROOT;
