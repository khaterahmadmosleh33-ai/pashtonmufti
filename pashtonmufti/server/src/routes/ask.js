// ============================================================
// POST /api/ask (Streaming / Live Typing Version)
// د کاروونکي پوښتنه → ويکټورول → Retrieval → Gemini (ژوندی ټايپينګ)
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

  if (!question || typeof question !== "string" || question.trim().length < 3) {
    return res.status(400).json({
      error: "د پوښتني متن بايد لږ تر لږه ۳ توري وي.",
    });
  }

  // ========================================================
  // 🔴 سټريمينګ (SSE) فعالول: دا سرور ته وايي چي ځواب ټوټه ټوټه لېږم
  // ========================================================
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const cleanQuestion = question.trim();

    const queryVector = await embedQuery(cleanQuestion);

    const autoKeyword = cleanQuestion
      .split(/\s+/)
      .filter((w) => w.length >= 3)
      .slice(0, 3)
      .join(" ");

    const sources = await hybridSearch(queryVector, keyword || autoKeyword);

    if (sources.length === 0) {
      const answer = "په موجودو مراجعو کي واضح جواب ونه موندل سو.";
      const latency = Date.now() - t0;

      pool.query(
        `INSERT INTO fatwa_log (question, answer, source_chunk_ids, model, latency_ms) VALUES ($1,$2,'{}',$3,$4)`,
        [cleanQuestion, answer, process.env.GEMINI_REASON_MODEL || "unknown", latency]
      ).catch((e) => console.warn("[ask] د لاګ ساتلو کي خطا:", e.message));

      // ژوندی سټريم د نه موندل سوي ځواب لپاره
      res.write(`data: ${JSON.stringify({ type: "meta", sources: [], model: process.env.GEMINI_REASON_MODEL || "unknown", latency_ms: latency })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "text", text: answer })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
      return res.end();
    }

    const { rows: ruleRows } = await pool.query(
      "SELECT rule_text FROM ai_rules WHERE is_active = true ORDER BY created_at ASC"
    );
    const activeRules = ruleRows.map((r) => r.rule_text);

    // ========================================================
    // د جيمينای څخه د ژوندي سټريم راکښل
    // ========================================================
    const { stream, model, error } = await generateFatwa(cleanQuestion, sources, activeRules);

    if (error || !stream) {
      res.write(`data: ${JSON.stringify({ type: "error", error: error || "ماډل کار نه کوي" })}\n\n`);
      return res.end();
    }

    const latency = Date.now() - t0;

    // لومړی د مراجعو او ماډل معلومات فرونټ‌اېنډ ته استوو چي کارډونه جوړ سي
    res.write(`data: ${JSON.stringify({ type: "meta", sources, model, latency_ms: latency })}\n\n`);

    let fullAnswer = "";

    // ========================================================
    // 🔴 ژوندی ټايپينګ: هره ټوټه چي راځي، سمدستي يې کاروونکي ته ښيو
    // ========================================================
    for await (const chunk of stream) {
      const textChunk = chunk.text();
      fullAnswer += textChunk;
      res.write(`data: ${JSON.stringify({ type: "text", text: textChunk })}\n\n`);
    }

    // ========================================================
    // کله چي ځواب بشپړ سو، بېرته يې په ډيټابېس کي سېف کوو
    // ========================================================
    pool.query(
      `INSERT INTO fatwa_log (question, answer, source_chunk_ids, model, latency_ms) VALUES ($1,$2,$3,$4,$5)`,
      [cleanQuestion, fullAnswer, sources.map((s) => s.id), model, Date.now() - t0]
    ).catch((e) => console.warn("[ask] د لاګ ساتلو کي خطا:", e.message));

    // سټريم رسماً بندوو
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();

  } catch (err) {
    console.error("[ask] خطا:", err);
    res.write(`data: ${JSON.stringify({ type: "error", error: "د سرور په خوا کي د ځواب جوړولو پر مهال ستونزه رامينځته سوه." })}\n\n`);
    res.end();
  }
});

export default router;
