// ============================================================
// POST /api/ask (خوندي او متحرک حالت — د غوره ۱۰ پوښتنو د اې پي آی سره)
// ============================================================

import { Router } from "express";
import { embedQuery, generateFatwa } from "../services/gemini.js";
import { hybridSearch } from "../services/retrieval.js";
import { pool } from "../db/pool.js";

const router = Router();

// ------------------------------------------------------------
// 🔥 نوي متحرکه لاره: د ټولې نړۍ تر ټولو مشهورې ۱۰ پوښتنې حسابوي او لېږي
// ------------------------------------------------------------
router.get("/suggested", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT question, COUNT(*) as usage_count 
       FROM fatwa_log 
       GROUP BY question 
       ORDER BY usage_count DESC 
       LIMIT 10`
    );
    // يوازي د پوښتنو متن د يوه پاک ليست (Array of strings) په توګه فرنټ انډ ته لېږي
    const popularQuestions = rows.map((r) => r.question);
    res.json({ questions: popularQuestions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------
// د کاروونکو د خپل موبايل د پردې د ارشيف پخوانۍ لاره
// ------------------------------------------------------------
router.get("/history", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "20", 10), 100);
  try {
    const { rows } = await pool.query(
      `SELECT id, question, answer, source_chunk_ids, model, latency_ms, created_at FROM fatwa_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ items: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ------------------------------------------------------------
// د عامو خلګو د نوې پوښتنې او فقهي چنکنګ پخوانۍ لاره
// ------------------------------------------------------------
router.post("/", async (req, res) => {
  const t0 = Date.now();
  const { question, keyword } = req.body || {};

  if (!question || typeof question !== "string" || question.trim().length < 3) {
    return res.status(400).json({ error: "د پوښتني متن بايد لږ تر لږه ۳ توري وي." });
  }

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

      return res.json({ question: cleanQuestion, answer, sources: [], model: process.env.GEMINI_REASON_MODEL || "unknown", latency_ms: latency });
    }

    const { rows: ruleRows } = await pool.query("SELECT rule_text FROM ai_rules WHERE is_active = true ORDER BY created_at ASC");
    const activeRules = ruleRows.map((r) => r.rule_text);

    const { answer, model } = await generateFatwa(cleanQuestion, sources, activeRules);
    const latency = Date.now() - t0;

    pool.query(
      `INSERT INTO fatwa_log (question, answer, source_chunk_ids, model, latency_ms) VALUES ($1,$2,$3,$4,$5)`,
      [cleanQuestion, answer, sources.map((s) => s.id), model, latency]
    ).catch((e) => console.warn("[ask] د لاګ ساتلو کي خطا:", e.message));

    return res.json({ question: cleanQuestion, answer, sources, model, latency_ms: latency });

  } catch (err) {
    console.error("[ask] خطا:", err);
    return res.status(500).json({ error: "د سرور په خوا کي د ځواب جوړولو پر مهال ستونزه رامينځته سوه.", detail: err.message });
  }
});

export default router;
