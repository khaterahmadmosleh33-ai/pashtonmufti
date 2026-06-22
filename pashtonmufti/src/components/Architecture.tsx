// د سيسټم معماري — د «پښتون مفتي» د بشپړ ټيکنالوژيکي جوړښت يو ښکلی او تعاملي ډياګرام.

import { useState } from "react";

const layers = [
  {
    id: "client",
    title: "د کاروونکي پرت (Client Layer)",
    color: "from-sky-50 to-sky-100",
    border: "border-sky-300",
    items: [
      { name: "React + Vite + Tailwind", role: "يوازي UI/UX، هيڅ درانه پروسس نه" },
      { name: "د RTL کندهارۍ پښتو انټرفيس", role: "د عربي او پښتو فونټونه" },
      { name: "د فتوا تاريخ په fatwa_log کي", role: "د سرور او PostgreSQL له لاري" },
    ],
  },
  {
    id: "api",
    title: "د API پرت (Express Backend)",
    color: "from-emerald-50 to-emerald-100",
    border: "border-emerald-400",
    items: [
      { name: "POST /api/ask", role: "د کاروونکي پوښتنه ويکټوروي او د RAG چلوي" },
      { name: "POST /api/books/upload", role: "د کتاب متن د قطار ته ورکوي" },
      { name: "GET /api/admin/queue", role: "د قطار، ويکټور سوو، او ټولو حالت" },
      { name: "GET /api/admin/books", role: "د کتابونو لست د پرمختګ سره" },
    ],
  },
  {
    id: "worker",
    title: "د پروسس پرت (Worker & Queue)",
    color: "from-amber-50 to-amber-100",
    border: "border-amber-500",
    items: [
      { name: "Chunker (عربي فقهي پارسر)", role: "د کتاب → باب → فصل → مسأله پارس" },
      { name: "د ميټاډېټا استخراج", role: "۹ ګونې ساحې (مصنف، جلد، مخ، …)" },
      { name: "embedding_queue (په PG کي)", role: "د پاته ټوټو خوندي قطار" },
      { name: "Worker + Rate Limiter", role: "په ثانيه کي ۵ غوښتني + Backoff" },
    ],
  },
  {
    id: "ai",
    title: "د اې آی پرت (Google Gemini)",
    color: "from-violet-50 to-violet-100",
    border: "border-violet-400",
    items: [
      { name: "text-embedding-004", role: "۷۶۸ بُعدي ويکټورونه" },
      { name: "gemini-1.5-pro", role: "د context پر بنسټ د فتوا جوړونه" },
      { name: "د سختي پرامپټ تګلاره", role: "د Hallucination مخنيوی" },
    ],
  },
  {
    id: "db",
    title: "د ډيټا پرت (PostgreSQL + pgvector)",
    color: "from-rose-50 to-rose-100",
    border: "border-rose-400",
    items: [
      { name: "chunks(embedding vector(768), metadata)", role: "د چنکونو جدول" },
      { name: "embedding_queue", role: "د قطار سيسټم" },
      { name: "HNSW index پر embedding باندي", role: "د cosine `<=>` چټک لټون" },
      { name: "pg_trgm index پر arabic_text", role: "د Hybrid لټون لپاره" },
    ],
  },
];

const principles = [
  {
    icon: "🚫",
    title: "هيڅ Client-side پروسس نه",
    detail:
      "د کتاب پرې کول او ويکټورول هيڅکله د براوزر په کچه نه کيږي. ټول کارونه د Express سرور پر خوا ترسره کيږي.",
  },
  {
    icon: "🧠",
    title: "د فقهي جوړښت پر بنسټ چنکنګ",
    detail:
      "د کلمو ړوند پرې کول ممنوع دي. د «کتاب/باب/فصل/مبحث/مطلب/مسأله/فرع» نښي د پرې کولو بنسټ دي.",
  },
  {
    icon: "📜",
    title: "د Hallucination مخنيوی",
    detail:
      "اې آی يوازي او يوازي د راپورته سوي context پر بنسټ ځواب ورکوي. د معلوماتو د نه شتون په صورت کي په زغرده وايي چي جواب موجود نه دی.",
  },
  {
    icon: "🛡️",
    title: "د 429 ايرر مخنيوی",
    detail:
      "د Rate Limit (۵ ر.ث) او Exponential Backoff (۱s→۲s→۴s→۸s→۱۶s→۶۰s) سره د Gemini API د سهميي د تېرېدلو مخه ډب کيږي.",
  },
  {
    icon: "🔍",
    title: "د Hybrid Search ملاتړ",
    detail:
      "په pgvector کي د cosine distance (`<=>`) سره يو ځای د عربي trigram لټون د معتبري نتيجي لپاره.",
  },
  {
    icon: "📚",
    title: "د حوالې سرورزه باور",
    detail:
      "هره ټوټه د ۹ ګونو ميټاډېټا ساحو سره ملګري ده ترڅو حواله سرورزه باوري، ښکلې، او د څېړني وړ وي.",
  },
];

const fileTree = [
  { p: "server/src/index.js", d: "د Express سرور د ننوتو ټکی" },
  { p: "server/src/db/schema.sql", d: "د PG سکيما، pgvector، او HNSW index" },
  { p: "server/src/db/pool.js", d: "د PG connection pool او د vector helper" },
  { p: "server/src/db/migrate.js", d: "د سکيما د چلولو ماشين" },
  { p: "server/src/services/chunker.js", d: "د عربي فقهي چنکر (د جوړښت پر بنسټ)" },
  { p: "server/src/services/gemini.js", d: "د Gemini embed + reasoning خدمت" },
  { p: "server/src/services/retrieval.js", d: "د pgvector هايبرېډ لټون" },
  { p: "server/src/workers/embedder.js", d: "د قطار Worker + Rate Limit + Backoff" },
  { p: "server/src/routes/ask.js", d: "POST /api/ask — د RAG د فتوا جوړونه" },
  { p: "server/src/routes/books.js", d: "POST /api/books/upload — د کتاب اپلوډ" },
  { p: "server/src/routes/admin.js", d: "د اډمن لاري (queue, books, retry)" },
];

export default function Architecture() {
  const [view, setView] = useState<"layers" | "code" | "files">("layers");

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-10 text-center">
        <div className="ornament mb-4">۞</div>
        <h2 className="mb-3 text-3xl font-bold text-[#0f3d2e]">
          د سيسټم معماري
        </h2>
        <p className="mx-auto max-w-3xl text-amber-950/80">
          د «پښتون مفتي» معماري د پنځو خپلواکو پرتو (Layers) پر بنسټ جوړه ده. هر
          پرت يوه ځانګړې دنده پر غاړه لري چي د Production-Level باور وړتيا او
          بشپړ مقياس وړتيا (Scalability) ته پلی کيږي.
        </p>
      </div>

      {/* د لېدنو tabs */}
      <div className="mb-8 flex justify-center">
        <div className="flex gap-1 rounded-2xl border border-amber-900/15 bg-white/60 p-1">
          {([
            { id: "layers", label: "🏛️ د پرتو ډياګرام" },
            { id: "code", label: "🗄️ د PG سکيما" },
            { id: "files", label: "📁 د فايلونو جوړښت" },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                view === t.id ? "tab-active" : "text-emerald-900 hover:bg-amber-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {view === "layers" && (
        <>
          <div className="mb-12 space-y-3">
            {layers.map((layer, idx) => (
              <div key={layer.id} className="relative">
                <div
                  className={`rounded-2xl border-2 bg-gradient-to-br p-6 shadow-sm ${layer.color} ${layer.border}`}
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-emerald-950">
                      <span className="mr-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-sm font-bold text-emerald-900">
                        {idx + 1}
                      </span>
                      {layer.title}
                    </h3>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {layer.items.map((it) => (
                      <div
                        key={it.name}
                        className="rounded-xl border border-white/60 bg-white/70 p-3 backdrop-blur"
                      >
                        <div className="mono mb-1 text-xs font-bold text-emerald-900">
                          {it.name}
                        </div>
                        <div className="text-xs text-amber-950/80">{it.role}</div>
                      </div>
                    ))}
                  </div>
                </div>
                {idx < layers.length - 1 && (
                  <div className="my-1 flex justify-center">
                    <svg viewBox="0 0 24 24" className="h-6 w-6 text-amber-700" fill="currentColor">
                      <path d="M12 16l-6-6h12z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mb-10">
            <h3 className="mb-6 text-2xl font-bold text-[#0f3d2e]">
              ✦ د معمارۍ شپږ اساسي اصول
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {principles.map((p) => (
                <div key={p.title} className="fatwa-card rounded-2xl p-5">
                  <div className="mb-3 text-3xl">{p.icon}</div>
                  <h4 className="mb-2 font-bold text-emerald-950">{p.title}</h4>
                  <p className="text-sm leading-relaxed text-amber-950/80">
                    {p.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === "code" && (
        <div className="space-y-6">
          <div className="fatwa-card rounded-2xl p-6">
            <h3 className="mb-3 text-lg font-bold text-emerald-900">
              د pgvector د جدول سکيما (د schema.sql برخه)
            </h3>
            <pre className="mono overflow-x-auto rounded-xl bg-[#0b1220] p-5 text-xs leading-relaxed text-amber-100" dir="ltr">{`-- د pgvector پرزه فعالول
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE chunks (
  id            BIGSERIAL PRIMARY KEY,
  book_id       BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  arabic_text   TEXT NOT NULL,
  embedding     vector(768),          -- text-embedding-004

  -- 9 fields rich metadata for trusted citation
  book_name     TEXT NOT NULL,
  author        TEXT NOT NULL,
  publisher     TEXT,
  volume        TEXT,
  page          TEXT,
  kitab         TEXT,
  fasl          TEXT,
  masalah       TEXT,
  hadith_number TEXT,
  extra         JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for fast cosine distance search
CREATE INDEX chunks_embedding_hnsw_idx
  ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Trigram index for hybrid Arabic full-text search
CREATE INDEX chunks_arabic_trgm_idx
  ON chunks USING gin (arabic_text gin_trgm_ops);`}</pre>
          </div>

          <div className="fatwa-card rounded-2xl p-6">
            <h3 className="mb-3 text-lg font-bold text-emerald-900">
              د هايبرېډ لټون پوښتنه
            </h3>
            <pre className="mono overflow-x-auto rounded-xl bg-[#0b1220] p-5 text-xs leading-relaxed text-amber-100" dir="ltr">{`-- Hybrid Search: vector similarity + trigram match
SELECT
  id, arabic_text, book_name, author, volume, page,
  kitab, fasl, masalah, hadith_number,
  1 - (embedding <=> $1::vector) AS similarity
FROM chunks
WHERE embedding IS NOT NULL
  AND ($2::text IS NULL OR arabic_text % $2)
ORDER BY embedding <=> $1::vector
LIMIT 8;`}</pre>
          </div>

          <div className="fatwa-card rounded-2xl p-6">
            <h3 className="mb-3 text-lg font-bold text-emerald-900">
              د Exponential Backoff (د Worker برخه)
            </h3>
            <pre className="mono overflow-x-auto rounded-xl bg-[#0b1220] p-5 text-xs leading-relaxed text-amber-100" dir="ltr">{`async function recordFailure(queueId, attempts, err) {
  const isRateLimit = err?.status === 429
    || /429|rate|quota/i.test(err?.message);
  const next = attempts + 1;
  const failed = next >= MAX_RETRIES;

  // 2^n seconds + jitter, capped at 60s
  const delaySec = Math.min(60, 2 ** next) + Math.random() * 1.5;

  await pool.query(
    \`UPDATE embedding_queue
       SET status      = $1,
           attempts    = $2,
           last_error  = $3,
           next_run_at = NOW() + ($4 || ' seconds')::interval
     WHERE id = $5\`,
    [failed ? 'failed' : 'pending', next,
     err.message.slice(0, 500), delaySec, queueId]
  );
}`}</pre>
          </div>
        </div>
      )}

      {view === "files" && (
        <div className="fatwa-card rounded-2xl p-6">
          <h3 className="mb-4 text-lg font-bold text-emerald-900">
            د بېک انډ د فايلونو جوړښت
          </h3>
          <div className="space-y-1.5">
            {fileTree.map((f) => (
              <div
                key={f.p}
                className="flex flex-col gap-1 rounded-xl border border-amber-900/10 bg-white/60 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <code className="mono text-xs font-bold text-emerald-900" dir="ltr">
                  {f.p}
                </code>
                <span className="text-xs text-amber-950/80">{f.d}</span>
              </div>
            ))}
          </div>
          <div className="ornament my-6">۞</div>
          <div className="rounded-2xl border border-emerald-700/30 bg-emerald-50/50 p-5 text-sm text-emerald-900">
            <div className="mb-2 font-bold">د بېک انډ د چلولو لارښوونه:</div>
            <pre className="mono overflow-x-auto rounded-lg bg-[#0b1220] p-4 text-xs text-amber-100" dir="ltr">{`cd server
cp .env.example .env       # set GEMINI_API_KEY + DATABASE_URL
npm install
npm run migrate            # creates schema + pgvector
npm run dev                # starts API + Worker together

# Frontend
echo "VITE_API_BASE=http://localhost:8080" > .env.local
npm run dev`}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
