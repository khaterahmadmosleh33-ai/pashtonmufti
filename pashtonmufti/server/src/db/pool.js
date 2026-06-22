// د PostgreSQL د تړلتيا حوض (Connection Pool).
// د pgvector پرزه ته اړتيا لري چي په DATABASE_URL کي ښودل سوی ډيټابېس کي وي.

import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
  // د Supabase / Cloud SQL لپاره
  ssl: process.env.DATABASE_URL?.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

pool.on("error", (err) => {
  console.error("[pg-pool] د ډيټابېس تړلتيا کي ناڅاپي خطا:", err);
});

// د pgvector د vector ډول پارس کول — د ګټوري بدلون لپاره.
// د Gemini text-embedding-004 د ۷۶۸ بُعدي float آرې بېرته رالېږي.
export function toVectorLiteral(arr) {
  if (!Array.isArray(arr)) throw new Error("vector بايد د عددونو آرې وي");
  return `[${arr.join(",")}]`;
}
