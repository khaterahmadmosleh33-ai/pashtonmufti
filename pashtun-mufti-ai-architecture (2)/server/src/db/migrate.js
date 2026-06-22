// د ډيټابېس migration ماشين — د schema.sql چلوي.
// د چلولو لپاره: `npm run migrate`

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./pool.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function migrate() {
  const sqlPath = path.join(__dirname, "schema.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  console.log("[migrate] د سکيما د جوړولو پيل کيږي…");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✅ [migrate] سکيما په بريالۍ توګه جوړه سوه.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ [migrate] د سکيما د جوړولو په وخت کي خطا:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
