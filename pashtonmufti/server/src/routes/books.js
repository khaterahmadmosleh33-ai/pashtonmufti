// ============================================================
// POST /api/books/upload
// د کتاب د بشپړ متن او ميټاډېټا اپلوډ.
// د سرور پر خوا چنکنګ کيږي، چنکونه د DB ته ساتل کيږي، او د قطار ته اچول
// کيږي ترڅو Worker وي يي ويکټور کړي.
// ============================================================

import { Router } from "express";
import multer from "multer";
import { pool } from "../db/pool.js";
import { chunkArabicFiqhText } from "../services/chunker.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // ۵۰ MB
});

router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { title, author, publisher, edition, defaultVolume } = req.body || {};
    let arabicText = req.body?.text;

    if (req.file && req.file.buffer) {
      arabicText = req.file.buffer.toString("utf8");
    }

    if (!title || !author) {
      return res.status(400).json({ error: "د کتاب نوم او مصنف حتمي دي." });
    }
    if (!arabicText || arabicText.trim().length < 200) {
      return res.status(400).json({
        error: "د کتاب متن خورا لنډ دی يا نه دی موندل سوی.",
      });
    }

    // ۱. د چنکنګ (د سرور پر خوا، نه د کلائنټ)
    const chunks = chunkArabicFiqhText(arabicText, {
      bookName: title,
      author,
      publisher,
      defaultVolume,
    });

    if (chunks.length === 0) {
      return res.status(422).json({
        error: "د چنکنګ په پايله کي هيڅ معتبره ټوټه ونه پيدا سوه.",
      });
    }

    // ۲. د کتاب او د چنکونو په يوه transaction کي ساتنه
    const client = await pool.connect();
    let bookId;
    try {
      await client.query("BEGIN");

      const bookRes = await client.query(
        `INSERT INTO books(title, author, publisher, edition, total_chunks, status)
         VALUES ($1, $2, $3, $4, $5, 'processing')
         RETURNING id`,
        [title, author, publisher || null, edition || null, chunks.length]
      );
      bookId = bookRes.rows[0].id;

      // د چنکونو په bulk insert سره ساتنه
      for (const c of chunks) {
        const ins = await client.query(
          `INSERT INTO chunks(
             book_id, arabic_text,
             book_name, author, publisher,
             volume, page, kitab, fasl, masalah, hadith_number, extra
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
           ON CONFLICT (book_id, kitab, fasl, masalah, page) DO NOTHING
           RETURNING id`,
          [
            bookId,
            c.arabic_text,
            c.book_name,
            c.author,
            c.publisher || null,
            c.volume || null,
            c.page || null,
            c.kitab || null,
            c.fasl || null,
            c.masalah || null,
            c.hadith_number || null,
            JSON.stringify(c.extra || {}),
          ]
        );
        // د قطار ته اچول
        if (ins.rows[0]?.id) {
          await client.query(
            `INSERT INTO embedding_queue(chunk_id, status) VALUES ($1, 'pending')
             ON CONFLICT (chunk_id) DO NOTHING`,
            [ins.rows[0].id]
          );
        }
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    res.json({
      ok: true,
      book_id: bookId,
      total_chunks: chunks.length,
      message: `کتاب په بريالۍ توګه اپلوډ سو. ${chunks.length} فقهي ټوټي د قطار ته ولېږل سوې.`,
    });
  } catch (err) {
    console.error("[books/upload] خطا:", err);
    res.status(500).json({ error: err.message || "د اپلوډ په وخت کي ستونزه" });
  }
});

export default router;
