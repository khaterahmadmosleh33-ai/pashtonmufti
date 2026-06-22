// ============================================================
// د ازموينې (Phase 6) لاري
// ============================================================
//   GET    /api/eval/cases        — د ټولو ازموينو لست
//   POST   /api/eval/cases        — د نوي ازموينې اضافه کول
//   POST   /api/eval/run/:id      — د يوې ازموينې چلول او پايله ساتل
//   GET    /api/eval/stats        — د تاريخي پرمختګ شمېري
// ============================================================

import { Router } from "express";
import { pool } from "../db/pool.js";
import { embedQuery, generateFatwa } from "../services/gemini.js";
import { hybridSearch } from "../services/retrieval.js";

const router = Router();

// د ټولو ازموينو لست — د هر يو وروستی score هم سره راوړو
router.get("/cases", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        c.*,
        r.score AS last_score,
        r.run_at AS last_run_at,
        r.matched_keywords AS last_matched,
        r.missed_keywords AS last_missed
      FROM test_cases c
      LEFT JOIN LATERAL (
        SELECT score, run_at, matched_keywords, missed_keywords
        FROM test_runs
        WHERE test_case_id = c.id
        ORDER BY run_at DESC
        LIMIT 1
      ) r ON TRUE
      WHERE c.active = TRUE
      ORDER BY c.id ASC
    `);
    res.json({ cases: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// د نوي ازموينې اضافه کول
router.post("/cases", async (req, res) => {
  try {
    const { topic, question, scholar_answer, scholar_reference, expected_keywords } = req.body || {};
    if (!topic || !question || !scholar_answer || !Array.isArray(expected_keywords)) {
      return res.status(400).json({ error: "ټولي ساحې حتمي دي." });
    }
    const { rows } = await pool.query(
      `INSERT INTO test_cases(topic, question, scholar_answer, scholar_reference, expected_keywords)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [topic, question, scholar_answer, scholar_reference || "", expected_keywords]
    );
    res.json({ ok: true, case: rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// د يوې ازموينې چلول — د RAG د بشپړ pipeline لاندي
router.post("/run/:id", async (req, res) => {
  const t0 = Date.now();
  try {
    const { rows: cases } = await pool.query(
      `SELECT * FROM test_cases WHERE id = $1`,
      [req.params.id]
    );
    if (cases.length === 0) return res.status(404).json({ error: "ازموينه ونه موندل سوه" });
    const tc = cases[0];

    // د RAG د بشپړ pipeline چلول
    const qv = await embedQuery(tc.question);
    const sources = await hybridSearch(qv);

    let answer = "په موجودو مراجعو کي واضح جواب ونه موندل سو.";
    let model = process.env.GEMINI_REASON_MODEL;
    if (sources.length > 0) {
      const r = await generateFatwa(tc.question, sources);
      answer = r.answer;
      model = r.model;
    }

    // د کليدي کلمو موندل
    const lower = answer.toLowerCase();
    const matched = tc.expected_keywords.filter((k) => lower.includes(k.toLowerCase()));
    const missed  = tc.expected_keywords.filter((k) => !lower.includes(k.toLowerCase()));
    const score = tc.expected_keywords.length
      ? matched.length / tc.expected_keywords.length
      : 0;
    const latency = Date.now() - t0;

    // د پايلې ساتل
    await pool.query(
      `INSERT INTO test_runs(
         test_case_id, system_answer, matched_keywords, missed_keywords,
         score, sources_found, latency_ms, model
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [tc.id, answer, matched, missed, score.toFixed(3), sources.length, latency, model]
    );

    res.json({
      ok: true,
      case_id: tc.id,
      system_answer: answer,
      matched_keywords: matched,
      missed_keywords: missed,
      score,
      sources_found: sources.length,
      latency_ms: latency,
      model,
    });
  } catch (err) {
    console.error("[eval/run] خطا:", err);
    res.status(500).json({ error: err.message });
  }
});

// د تاريخي شمېرو راپور
router.get("/stats", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      WITH latest AS (
        SELECT DISTINCT ON (test_case_id)
          test_case_id, score, run_at
        FROM test_runs
        ORDER BY test_case_id, run_at DESC
      )
      SELECT
        (SELECT COUNT(*) FROM test_cases WHERE active)             AS total_cases,
        (SELECT COUNT(*) FROM latest)                              AS evaluated,
        (SELECT COUNT(*) FROM latest WHERE score >= 0.7)           AS passed,
        COALESCE((SELECT AVG(score) FROM latest), 0)::NUMERIC(5,3) AS avg_score
    `);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
