-- ============================================================
-- د «پښتون مفتي» د PostgreSQL سکيما
-- د pgvector پرزه فعالوي او د کتابونو، چنکونو، او قطار جدولونه جوړوي.
-- ============================================================

-- ۱. د pgvector پرزه (د ويکټور لټون لپاره حتمي)
CREATE EXTENSION IF NOT EXISTS vector;

-- د عربي پوره متن لټون (Full-Text Search) لپاره
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- جدول: books — د کتابونو ميټاډېټا
-- ============================================================
CREATE TABLE IF NOT EXISTS books (
  id              BIGSERIAL PRIMARY KEY,
  title           TEXT NOT NULL,
  author          TEXT NOT NULL,
  publisher       TEXT,
  edition         TEXT,
  total_chunks    INT NOT NULL DEFAULT 0,
  embedded_chunks INT NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'queued'
                  CHECK (status IN ('queued', 'processing', 'complete', 'paused', 'failed')),
  uploaded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS books_status_idx ON books(status);

-- ============================================================
-- جدول: chunks — د کتاب فقهي ټوټي د غني ميټاډېټا سره
-- ============================================================
CREATE TABLE IF NOT EXISTS chunks (
  id            BIGSERIAL PRIMARY KEY,
  book_id       BIGINT NOT NULL REFERENCES books(id) ON DELETE CASCADE,

  -- د چنک اصلي عربي متن (هره ټوټه يوه بشپړه فقهي مسأله ده)
  arabic_text   TEXT NOT NULL,

  -- د Gemini text-embedding-004 څخه ۷۶۸ بُعدي ويکټور
  -- توجه: د ويکټورولو څخه مخکي دا NULL پاتي کيږي او د worker لخوا ډکيږي
  embedding     vector(768),

  -- ============================================================
  -- ۹ ګونې غني ميټاډېټا ساحې (د قوي حوالې لپاره)
  -- ============================================================
  book_name       TEXT NOT NULL,    -- ۱. د کتاب نوم
  author          TEXT NOT NULL,    -- ۲. مصنف
  publisher       TEXT,             -- ۳. مطبعه / چاپ
  volume          TEXT,             -- ۴. جلد
  page            TEXT,             -- ۵. مخ
  kitab           TEXT,             -- ۶. کتاب / باب (لکه «کتاب الطهارة»)
  fasl            TEXT,             -- ۷. فصل (لکه «باب التيمم»)
  masalah         TEXT,             -- ۸. مسأله / مطلب / فرع
  hadith_number   TEXT,             -- ۹. د حديث شمېره (که شته)

  -- اضافي ميتاډېټا (JSONB د سپک پراختيا لپاره)
  extra           JSONB DEFAULT '{}'::jsonb,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ډاډ چي د يو کتاب په منځ کي بې ځايه تکرار نه وي
  UNIQUE (book_id, kitab, fasl, masalah, page)
);

-- د HNSW index د cosine distance لپاره — د چټک لټون لپاره حتمي.
-- يادونه: HNSW يوازي د pgvector 0.5+ څخه شته. د کم نسخې لپاره IVFFlat وکاروی.
CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw_idx
  ON chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- د Hybrid Search لپاره د trigram index
CREATE INDEX IF NOT EXISTS chunks_arabic_trgm_idx
  ON chunks USING gin (arabic_text gin_trgm_ops);

CREATE INDEX IF NOT EXISTS chunks_book_id_idx ON chunks(book_id);
CREATE INDEX IF NOT EXISTS chunks_kitab_idx ON chunks(kitab);

-- ============================================================
-- جدول: embedding_queue — د ويکټورولو قطار
-- د Gemini د 429 ايرر د مخنيوي لپاره ټول chunks دلته يو په يو پروسس کيږي
-- ============================================================
CREATE TABLE IF NOT EXISTS embedding_queue (
  id            BIGSERIAL PRIMARY KEY,
  chunk_id      BIGINT NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'running', 'done', 'failed')),
  attempts      INT NOT NULL DEFAULT 0,
  last_error    TEXT,
  next_run_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_by     TEXT,
  locked_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chunk_id)
);

CREATE INDEX IF NOT EXISTS queue_status_next_run_idx
  ON embedding_queue(status, next_run_at)
  WHERE status IN ('pending', 'running');

-- ============================================================
-- جدول: fatwa_log — د پوښتنو او ځوابونو لاګ
-- ============================================================
CREATE TABLE IF NOT EXISTS fatwa_log (
  id                BIGSERIAL PRIMARY KEY,
  question          TEXT NOT NULL,
  answer            TEXT NOT NULL,
  source_chunk_ids  BIGINT[] NOT NULL DEFAULT '{}',
  model             TEXT NOT NULL,
  latency_ms        INT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS fatwa_log_created_idx ON fatwa_log(created_at DESC);

-- ============================================================
-- جدول: test_cases — د Phase 6 ازموينې Golden Dataset
-- ============================================================
-- د «انساني عالم vs پښتون مفتي» پرتلې لپاره. هدف د ۹۰٪+ سموالی.
CREATE TABLE IF NOT EXISTS test_cases (
  id                  BIGSERIAL PRIMARY KEY,
  topic               TEXT NOT NULL,             -- وتر، زکات، طلاق، …
  question            TEXT NOT NULL,
  scholar_answer      TEXT NOT NULL,             -- د انساني عالم ځواب
  scholar_reference   TEXT NOT NULL,             -- د عالم د حوالې لپاره
  expected_keywords   TEXT[] NOT NULL,           -- د سيستم په ځواب کي چي بايد شته وي
  active              BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- جدول: test_runs — د هر «وچلوی» د پايلې ساتنه (د وخت تېرېدلو سره د ښه والي تعقيب)
-- ============================================================
CREATE TABLE IF NOT EXISTS test_runs (
  id                BIGSERIAL PRIMARY KEY,
  test_case_id      BIGINT NOT NULL REFERENCES test_cases(id) ON DELETE CASCADE,
  system_answer     TEXT NOT NULL,
  matched_keywords  TEXT[] NOT NULL,
  missed_keywords   TEXT[] NOT NULL,
  score             NUMERIC(4,3) NOT NULL,      -- ۰.۰۰۰..۱.۰۰۰
  sources_found     INT NOT NULL DEFAULT 0,
  latency_ms        INT,
  model             TEXT,
  run_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS test_runs_case_idx ON test_runs(test_case_id, run_at DESC);

-- ============================================================
-- د دري پوښتنو نمونه (Seed data)
-- ============================================================
INSERT INTO test_cases (topic, question, scholar_answer, scholar_reference, expected_keywords)
VALUES
  ('وتر',
   'وتر واجب دی او که سنت؟',
   'د حنفي مذهب پر بنسټ وتر واجب دی، نه فرض او نه سنت.',
   'الهداية — کتاب الصلاة، باب الوتر، جلد ۱، مخ ۷۲',
   ARRAY['واجب','حنفي','ابو حنيفه']),
  ('زکات',
   'د سپينو زرو نصاب څونه دی؟',
   'دوه سوه (۲۰۰) درهمه (نږدې ۶۱۲.۳۶ ګرامه).',
   'بدائع الصنائع — کتاب الزکاة، جلد ۲، مخ ۱۷',
   ARRAY['۲۰۰','درهم','زکات','قمري']),
  ('نکاح',
   'د نکاح صحت لپاره ولي ضروري دی؟',
   'د بالغي عاقلي ښځي نکاح د ولي پرته هم صحيح ده (د کفؤ سره).',
   'البحر الرائق — کتاب النکاح، جلد ۳، مخ ۱۱۷',
   ARRAY['ولي','بالغه','کفؤ','حنفي'])
ON CONFLICT DO NOTHING;
