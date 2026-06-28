// ============================================================
// د اډمن پينل لپاره API لاري — نړيوال او متحرک نسخه
// ============================================================

import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

// د عمومي قطار حالت
router.get("/queue", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM books)                                AS total_books,
        (SELECT COUNT(*) FROM chunks)                               AS total_chunks,
        (SELECT COUNT(*) FROM chunks WHERE embedding IS NOT NULL)   AS embedded_chunks,
        (SELECT COUNT(*) FROM chunks WHERE embedding IS NULL)       AS queued_chunks,
        (SELECT COUNT(*) FROM embedding_queue WHERE status='failed') AS failed_chunks,
        (SELECT MAX(updated_at) FROM embedding_queue WHERE status='done') AS last_embedded_at
    `);
    res.json({
      ...rows[0],
      rate_per_sec: parseInt(process.env.EMBED_RATE_PER_SEC || "5", 10),
      max_retries: parseInt(process.env.EMBED_MAX_RETRIES || "6", 10),
      worker_status: "فعال",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// د ټولو کتابونو لست (د المارۍ کالم ور زيات سو)
router.get("/books", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, title, author, publisher,
             total_chunks, embedded_chunks,
             (total_chunks - embedded_chunks) AS queued_chunks,
             status, uploaded_at, updated_at, category
      FROM books
      ORDER BY uploaded_at DESC
    `);
    res.json({ books: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// د سوپابېس څخه د ټولو فعالو فنونو (الماريو) رايستل د اډمن پینل لپاره
router.get("/categories", async (_req, res) => {
  try {
    const result = await pool.query("SELECT name FROM categories ORDER BY name ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("[admin/categories] خطا:", err);
    res.status(500).json({ error: "د فنونو د راوړلو په وخت کي ستونزه پېښه سوه." });
  }
});

// د نوي کتاب ړنګول د تل لپاره د اډمن له خوا (Cascade الوتنه)
router.delete("/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    // څرنګه چي په schema کي ON DELETE CASCADE شته، د کتاب په پاکولو سره ټول اړوند چنکونه په اتومات ډول پاکيږي
    const result = await pool.query(`DELETE FROM books WHERE id = $1`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "کتاب ونه موندل سو." });
    }
    res.json({ ok: true, message: "کتاب او د هغه ټول اړوند ويکټورونه په برياليتوب سره پاک سول." });
  } catch (err) {
    console.error("[admin/delete-book] خطا:", err);
    res.status(500).json({ error: err.message });
  }
});

// د نا کامو ټوټو لست (د ډيبګ لپاره)
router.get("/failed", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT q.id, q.chunk_id, q.attempts, q.last_error,
             c.book_name, c.kitab, c.fasl, c.masalah, c.page
      FROM embedding_queue q
      JOIN chunks c ON c.id = q.chunk_id
      WHERE q.status = 'failed'
      ORDER BY q.updated_at DESC
      LIMIT 100
    `);
    res.json({ failed: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// د يو نا کام چنک بياکوښښ
router.post("/retry/:queueId", async (req, res) => {
  try {
    await pool.query(
      `UPDATE embedding_queue
       SET status='pending', attempts=0, last_error=NULL, next_run_at=NOW()
       WHERE id=$1`,
      [req.params.queueId]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔄 د ټولو بند پاته سوو کارونو خلاصول (Unlock Stuck Jobs)
router.post("/unlock-stuck-jobs", async (_req, res) => {
  try {
    const { rowCount } = await pool.query(`
      UPDATE embedding_queue
      SET status = 'pending',
          locked_by = NULL,
          locked_at = NULL
      WHERE status = 'running'
    `);
    res.json({ ok: true, unlocked_count: rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// ============================================================
// 🧠 نوي API لاري د اې آی د قوانينو (مغز) لپاره — پوره خوندي دي
// ============================================================

// ۱. د ټولو قوانينو راوړل
router.get("/rules", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, rule_text, is_active, created_at 
      FROM ai_rules 
      ORDER BY created_at ASC
    `);
    res.json({ rules: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ۲. نوی قانون ثبتول
router.post("/rules", async (req, res) => {
  try {
    const { rule_text } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO ai_rules (rule_text) VALUES ($1) RETURNING *`,
      [rule_text]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ۳. د قانون حالت بدلول (فعال / غير فعال)
router.patch("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const { rows } = await pool.query(
      `UPDATE ai_rules SET is_active = $1 WHERE id = $2 RETURNING *`,
      [is_active, id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ۴. د قانون ړنګول د تل لپاره
router.delete("/rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM ai_rules WHERE id = $1`, [id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
