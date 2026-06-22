// ============================================================
// د اډمن پينل لپاره API لاري
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

// د ټولو کتابونو لست
router.get("/books", async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, title, author, publisher,
             total_chunks, embedded_chunks,
             (total_chunks - embedded_chunks) AS queued_chunks,
             status, uploaded_at, updated_at
      FROM books
      ORDER BY uploaded_at DESC
    `);
    res.json({ books: rows });
  } catch (err) {
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

export default router;
