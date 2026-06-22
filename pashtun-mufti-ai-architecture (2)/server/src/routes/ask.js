// ============================================================
// POST /api/ask
// د کاروونکي پوښتنه → ويکټورول → د pgvector لټون → د Gemini فتوا
// ============================================================

import { Router } from "express";
import { embedQuery, generateFatwa } from "../services/gemini.js";
import { hybridSearch } from "../services/retrieval.js";
import { pool } from "../db/pool.js";

const router = Router();

router.get("/history", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
  try {
    const { rows } = await pool.query(
      `SELECT id, question, answer, source_chunk_ids, model, latency_ms, created_at
       FROM fatwa_log
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  const t0 = Date.now();
  const { question, keyword } = req.body || {};

  if (!question || typeof question !== "string" || question.trim().length < 3) {
    return res.status(400).json({
      error: "د پوښتني متن بايد لږ تر لږه ۳ توري وي.",
    });
  }

  try {
    // ۱. د پوښتني ويکټور
    const queryVector = await embedQuery(question.trim());

    // ۲. د pgvector څخه د اړوندو ټوټو راپورته کول
    const sources = await hybridSearch(queryVector, keyword);

    if (sources.length === 0) {
      const answer = "په موجودو مراجعو کي واضح جواب ونه موندل سو.";
      const latency = Date.now() - t0;
      pool
        .query(
          `INSERT INTO fatwa_log(question, answer, source_chunk_ids, model, latency_ms)
           VALUES ($1, $2, '{}', $3, $4)`,
          [question, answer, process.env.GEMINI_REASON_MODEL, latency]
        )
        .catch((e) => console.warn("[ask] د لاګ ساتلو کي خطا:", e.message));
      return res.json({
        question,
        answer,
        sources: [],
        model: process.env.GEMINI_REASON_MODEL,
        latency_ms: latency,
      });
    }

    // ۳. د Gemini سره د فتوا جوړول
    const { answer, model } = await generateFatwa(question, sources);
    const latency = Date.now() - t0;

    // ۴. د لاګ ساتنه (د عمليات د څارني لپاره)
    pool
      .query(
        `INSERT INTO fatwa_log(question, answer, source_chunk_ids, model, latency_ms)
         VALUES ($1, $2, $3, $4, $5)`,
        [question, answer, sources.map((s) => s.id), model, latency]
      )
      .catch((e) => console.warn("[ask] د لاګ ساتلو کي خطا:", e.message));

    res.json({
      question,
      answer,
      sources,
      model,
      latency_ms: latency,
    });
  } catch (err) {
    console.error("[ask] خطا:", err);
    res.status(500).json({
      error: "د سرور په خوا کي د ځواب جوړولو پر مهال ستونزه راپيدا سوه.",
      detail: err.message,
    });
  }
});

export default router;
