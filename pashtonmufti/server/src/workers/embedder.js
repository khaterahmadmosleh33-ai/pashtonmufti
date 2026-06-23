// ============================================================
// د ويکټورولو شاليد ماشين (Background Embedder Worker)
// ============================================================
// دندې:
//   ۱. د `embedding_queue` څخه د «pending» ټوټي راپورته کول.
//   ۲. د Rate Limit (مثلاً په ثانيه کي ۵ غوښتني) سره د Gemini API بلل.
//   ۳. د 429 ايرر په وخت کي د Exponential Backoff (۱s→۲s→۴s→۸s→۱۶s→۳۲s)
//      پر بنسټ بياکوښښ.
//   ۴. د بريالۍ ويکټور خوندي کول او د books.embedded_chunks تازه کول.
//
// د چلولو لپاره: `npm run worker:only` يا د index.js سره يو ځای پيل کيږي.
// ============================================================

import "dotenv/config";
import os from "node:os";
import { pool, toVectorLiteral } from "../db/pool.js";
import { embedText } from "../services/gemini.js";

const RATE_PER_SEC = parseInt(process.env.EMBED_RATE_PER_SEC || "5", 10);
const MAX_RETRIES  = parseInt(process.env.EMBED_MAX_RETRIES || "6", 10);
const BATCH_SIZE   = parseInt(process.env.EMBED_BATCH_SIZE || "10", 10);
const POLL_MS      = parseInt(process.env.WORKER_POLL_INTERVAL_MS || "1000", 10);
const WORKER_ID    = `${os.hostname()}-${process.pid}`;

let running = false;

/**
 * د بند پاته سوو کارونو اتوماتيک خلاصول
 */
async function recoverStuckJobs() {
  try {
    const res = await pool.query(`
      UPDATE embedding_queue
      SET status = 'pending',
          locked_by = NULL,
          locked_at = NULL
      WHERE status = 'running'
        AND locked_at < NOW() - INTERVAL '15 minutes'
    `);
    if (res.rowCount > 0) {
      console.log(`♻️ [worker] اتوماتيک رغونه: ${res.rowCount} بند پاته سوي کارونه بېرته pending سول.`);
    }
  } catch (err) {
    console.error("❌ [worker] د بند سوو کارونو د خلاصولو پر مهال خطا:", err.message);
  }
}

/**
 * د قطار څخه د لاندي پروسس وړ ټوټو راپورته کول.
 * د `FOR UPDATE SKIP LOCKED` سره ډاډ ترلاسه کوو چي دوه worker يوه ټوټه ونه پروسس کړي.
 */
async function claimBatch(limit) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `
      SELECT q.id AS queue_id, q.chunk_id, q.attempts, c.arabic_text
      FROM embedding_queue q
      JOIN chunks c ON c.id = q.chunk_id
      WHERE q.status = 'pending'
        AND q.next_run_at <= NOW()
        AND c.embedding IS NULL
      ORDER BY q.next_run_at ASC
      LIMIT $1
      FOR UPDATE OF q SKIP LOCKED
      `,
      [limit]
    );

    if (rows.length === 0) {
      await client.query("COMMIT");
      return [];
    }

    const ids = rows.map((r) => r.queue_id);
    await client.query(
      `UPDATE embedding_queue
       SET status = 'running', locked_by = $1, locked_at = NOW(), updated_at = NOW()
       WHERE id = ANY($2::bigint[])`,
      [WORKER_ID, ids]
    );
    await client.query("COMMIT");
    return rows;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * د بريالۍ ويکټور د چنک لپاره خوندي کول.
 */
async function saveEmbedding(chunkId, vector, queueId) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE chunks SET embedding = $1::vector WHERE id = $2`,
      [toVectorLiteral(vector), chunkId]
    );
    await client.query(
      `UPDATE embedding_queue
       SET status = 'done', last_error = NULL, updated_at = NOW(), locked_by = NULL
       WHERE id = $1`,
      [queueId]
    );
    // د کتاب د embedded_chunks تازه کول
    await client.query(
      `UPDATE books SET
         embedded_chunks = (SELECT COUNT(*) FROM chunks WHERE book_id = books.id AND embedding IS NOT NULL),
         status = CASE
           WHEN (SELECT COUNT(*) FROM chunks WHERE book_id = books.id AND embedding IS NULL) = 0
             THEN 'complete' ELSE 'processing'
         END,
         updated_at = NOW()
       WHERE id = (SELECT book_id FROM chunks WHERE id = $1)`,
      [chunkId]
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * د خطا په وخت کي د قطار حالت تازه کول.
 * که د retries له حد څخه تېر سي → status=failed.
 * نه نه → د Exponential Backoff سره next_run_at تازه کول.
 */
async function recordFailure(queueId, attempts, err) {
  const isRateLimit = err?.status === 429 || /429|rate|quota/i.test(err?.message || "");
  const nextAttempts = attempts + 1;
  const failed = nextAttempts >= MAX_RETRIES;

  // Exponential backoff: 2^attempts ثانيي + jitter، حد اعظمي ۶۰ ثانيي
  const delaySec = Math.min(60, 2 ** nextAttempts) + Math.random() * 1.5;
  const errMsg = (err?.message || String(err)).slice(0, 500);

  await pool.query(
    `UPDATE embedding_queue
     SET status = $1,
         attempts = $2,
         last_error = $3,
         next_run_at = NOW() + ($4 || ' seconds')::interval,
         locked_by = NULL,
         updated_at = NOW()
     WHERE id = $5`,
    [
      failed ? "failed" : "pending",
      nextAttempts,
      `${isRateLimit ? "[429] " : ""}${errMsg}`,
      String(delaySec),
      queueId,
    ]
  );

  if (isRateLimit) {
    console.warn(`⏳ [worker] د Gemini سهميه پای ته رسېدلې — ${delaySec.toFixed(1)} ثانيي ځنډ`);
  }
}

/**
 * د Rate Limit پر بنسټ د پروسس کولو لپاره ساده throttler.
 * د هري ثانيي په منځ کي يوازي RATE_PER_SEC غوښتني ته اجازه ورکوي.
 */
class RateLimiter {
  constructor(perSec) {
    this.perSec = perSec;
    this.intervalMs = 1000 / perSec;
    this.nextSlot = Date.now();
  }
  async take() {
    const now = Date.now();
    const wait = Math.max(0, this.nextSlot - now);
    this.nextSlot = Math.max(now, this.nextSlot) + this.intervalMs;
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  }
}

const limiter = new RateLimiter(RATE_PER_SEC);

/**
 * د يوې ټوټي پروسس کول.
 */
async function processOne(item) {
  await limiter.take();
  try {
    const vector = await embedText(item.arabic_text);
    if (vector.length !== 768) {
      throw new Error(`غير منتظر د ويکټور بُعد: ${vector.length} (انتظار: 768)`);
    }
    await saveEmbedding(item.chunk_id, vector, item.queue_id);
  } catch (err) {
    // د 429 خطایانو لپاره ځانګړی ځنډ
    if (err?.status === 429 || /429|rate|quota/i.test(err?.message || "")) {
      console.warn("⚠️ سخت محدودیت: د ۵ ثانیو ځنډ...");
      await new Promise(r => setTimeout(r, 5000));
    }
    await recordFailure(item.queue_id, item.attempts, err);
  }
}

/**
 * د Worker اصلي حلقه (loop).
 */
export async function startWorker() {
  if (running) return;
  running = true;
  console.log(`🚀 [worker:${WORKER_ID}] د ويکټورولو ماشين پيل سو (rate=${RATE_PER_SEC}/s, retries=${MAX_RETRIES})`);

  // د نويو کارونو تر پيلولو مخکي، زاړه قلف سوي کارونه خلاصوو
  await recoverStuckJobs();

  while (running) {
    try {
      const batch = await claimBatch(BATCH_SIZE);
      if (batch.length === 0) {
        await new Promise((r) => setTimeout(r, POLL_MS));
        continue;
      }
      // په موازي ډول د ټولو پروسس کول (د limiter سره)
      await Promise.all(batch.map(processOne));
    } catch (err) {
      console.error("[worker] د حلقې په منځ کي خطا:", err.message);
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

export function stopWorker() { running = false; }

// که چيري دا فايل په مستقيم ډول چلول کيږي:
if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker().catch((e) => {
    console.error("[worker] د پيل کولو خطا:", e);
    process.exit(1);
  });

  process.on("SIGTERM", () => { console.log("SIGTERM — د Worker ودرول…"); stopWorker(); });
  process.on("SIGINT",  () => { console.log("SIGINT — د Worker ودرول…");  stopWorker(); });
}
