// ============================================================
// د «پښتون مفتي» د Express سرور د دروازې (entry) فايل
// ============================================================
// API + Background Worker يو ځای پيل کيږي.
// ============================================================

import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";

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
