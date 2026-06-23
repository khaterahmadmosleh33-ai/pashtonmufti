// ============================================================
// POST /api/ask
// د کاروونکي پوښتنه → ويکټورول → Retrieval → Gemini
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
      `
      SELECT
        id,
        question,
        answer,
        source_chunk_ids,
        model,
        latency_ms,
        created_at
      FROM fatwa_log
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

router.post("/", async (req, res) => {
  const t0 = Date.now();

  const { question, keyword } = req.body || {};

  if (
    !question ||
    typeof question !== "string" ||
    question.trim().length < 3
  ) {
    return res.status(400).json({
      error: "د پوښتني متن بايد لږ تر لږه ۳ توري وي.",
    });
  }

  try {
    const cleanQuestion = question.trim();

    // ========================================================
    // د پوښتني ويکټور
    // ========================================================
    const queryVector = await embedQuery(cleanQuestion);

    // ========================================================
    // اتومات keyword جوړول
    // ========================================================
    const autoKeyword = cleanQuestion
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 3)
      .join(" ");

    // ========================================================
    // Retrieval
    // ========================================================
    const sources = await hybridSearch(
      queryVector,
      keyword || autoKeyword
    );

    // ========================================================
    // که هيڅ مرجع پيدا نسي
    // ========================================================
    if (sources.length === 0) {
      const answer =
        "په موجودو مراجعو کي واضح جواب ونه موندل سو.";

      const latency = Date.now() - t0;

      pool
        .query(
          `
          INSERT INTO fatwa_log
          (
            question,
            answer,
            source_chunk_ids,
            model,
            latency_ms
          )
          VALUES ($1,$2,'{}',$3,$4)
          `,
          [
            cleanQuestion,
            answer,
            process.env.GEMINI_REASON_MODEL || "unknown",
            latency,
          ]
        )
        .catch((e) =>
          console.warn(
            "[ask] د لاګ ساتلو کي خطا:",
            e.message
          )
        );

      return res.json({
        question: cleanQuestion,
        answer,
        sources: [],
        model:
          process.env.GEMINI_REASON_MODEL || "unknown",
        latency_ms: latency,
      });
    }

    // ========================================================
    // Gemini جواب جوړوي
    // ========================================================
    const { answer, model } =
      await generateFatwa(cleanQuestion, sources);

    const latency = Date.now() - t0;

    // ========================================================
    // لاګ
    // ========================================================
    pool
      .query(
        `
        INSERT INTO fatwa_log
        (
          question,
          answer,
          source_chunk_ids,
          model,
          latency_ms
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
        [
          cleanQuestion,
          answer,
          sources.map((s) => s.id),
          model,
          latency,
        ]
      )
      .catch((e) =>
        console.warn(
          "[ask] د لاګ ساتلو کي خطا:",
          e.message
        )
      );

    return res.json({
      question: cleanQuestion,
      answer,
      sources,
      model,
      latency_ms: latency,
    });
  } catch (err) {
    console.error("[ask] خطا:", err);

    return res.status(500).json({
      error:
        "د سرور په خوا کي د ځواب جوړولو پر مهال ستونزه راپيدا سوه.",
      detail: err.message,
    });
  }
});

export default router;
