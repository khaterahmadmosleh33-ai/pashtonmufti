// ============================================================
// د «پښتون مفتي» د Express سرور د دروازې (entry) فايل
// ============================================================
// API + Background Worker يو ځای پيل کيږي.
// ============================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import pool from "./db/pool.js"; // د ډېټابېس د پول راغوښتل د نوي متحرک پُل لپاره
import askRouter from "./routes/ask.js";
import booksRouter from "./routes/books.js";
import adminRouter from "./routes/admin.js";
import evalRouter from "./routes/evaluation.js";
import { startWorker } from "./workers/embedder.js";

const app = express();

app.use(cors({
  origin: (process.env.CLIENT_ORIGIN || "*").split(","),
  credentials: true,
}));
app.use(express.json({ limit: "5mb" }));
app.use(morgan("tiny"));

// د روغتيا چک
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, name: "پښتون مفتي API", time: new Date().toISOString() });
});

// ============================================================
// 🎨 د پاڼي د ډيفالټ خطونو او رنګونو متحرک پُل (Global Settings)
// ============================================================

// ۱. د ډيفالټ تنظیماتو لوستل (GET) چي هر نوی موبایل يې په خلاصولو کي په اتومات ډول لولي
app.get("/api/global-settings", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM site_settings WHERE id = 1");
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("[Settings GET Error]:", err);
    res.status(500).json({ error: "Database read error" });
  }
});

// ۲. له اډمن پينل څخه د نوي ډيفالټ فونټ او رنګ ثبتول (POST) چي په مځکه کي يې قفل کوي
app.post("/api/global-settings", async (req, res) => {
  const { default_site_font, default_heading_font, theme_main, theme_light } = req.body;
  try {
    await pool.query(`
      UPDATE site_settings 
      SET 
        default_site_font = COALESCE($1, default_site_font),
        default_heading_font = COALESCE($2, default_heading_font),
        theme_main = COALESCE($3, theme_main),
        theme_light = COALESCE($4, theme_light),
        updated_at = NOW()
      WHERE id = 1
    `, [default_site_font, default_heading_font, theme_main, theme_light]);
    
    res.json({ ok: true });
  } catch (err) {
    console.error("[Settings POST Error]:", err);
    res.status(500).json({ error: "Database write error" });
  }
});

app.use("/api/ask", askRouter);
app.use("/api/books", booksRouter);
app.use("/api/admin", adminRouter);
app.use("/api/eval", evalRouter);

const PORT = parseInt(process.env.PORT || "8080", 10);

// دلته مو د رېنډر دپاره 0.0.0.0 دروازه خلاصه کړه
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ د «پښتون مفتي» API په http://0.0.0.0:${PORT} روان دی`);
});

// د سرور سره يو ځای د Worker پيل کول
startWorker().catch((e) => console.error("[worker] د پيل کولو خطا:", e));
