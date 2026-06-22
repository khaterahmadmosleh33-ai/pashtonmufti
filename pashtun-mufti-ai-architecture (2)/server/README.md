# د «پښتون مفتي» بېک انډ سرور

دا د Node.js (Express) سرور د «پښتون مفتي» د درانه کارونو لپاره دی. ټول پروسسونه (د کتاب پارس، چنکنګ، ميټاډېټا استخراج، ويکټورول، او RAG د فتوا جوړونه) دلته ترسره کيږي. کلائنټ هيڅکله د دي درانو کارونو سره مستقيم تماس نه نيسي.

## ۱. د چلولو لپاره اړين شيان

- Node.js 20+
- PostgreSQL 16+ د `pgvector` پرزې سره (يا Supabase / Cloud SQL)
- د Google Gemini API کيلي (`GEMINI_API_KEY`)

## ۲. د چاپيريال متغيرونه (`.env`)

```
PORT=8080
DATABASE_URL=postgresql://user:pass@host:5432/poshtoon_mufti
GEMINI_API_KEY=your-gemini-key
GEMINI_EMBED_MODEL=text-embedding-004
GEMINI_REASON_MODEL=gemini-1.5-pro
EMBED_RATE_PER_SEC=5
EMBED_MAX_RETRIES=6
TOP_K=8
```

## ۳. د چلولو لارښوونه

```bash
cd server
npm install
npm run migrate     # د PG سکيما جوړوي او pgvector فعالوي
npm run dev         # API سرور + Worker يو ځای پيل کوي
```

## ۴. د API لاري (Routes)

| Method | Path                       | دنده                                              |
|--------|----------------------------|---------------------------------------------------|
| POST   | `/api/ask`                 | د کاروونکي پوښتني ته د RAG پر بنسټ ځواب           |
| POST   | `/api/books/upload`        | د کتاب د متن او ميټاډېټا اپلوډ (د قطار ته ورکول)  |
| GET    | `/api/admin/queue`         | د قطار، ويکټور سوو، او ټولو ټوټو حالت             |
| GET    | `/api/admin/books`         | د ټولو کتابونو لست د پرمختګ سره                   |
| GET    | `/api/eval/cases`          | د Golden Dataset د ازموينو لست                    |
| POST   | `/api/eval/cases`          | د نوي ازموينې اضافه کول                           |
| POST   | `/api/eval/run/:id`        | د يوې ازموينې چلول او د پايلې ساتنه               |
| GET    | `/api/eval/stats`          | د Phase 6 تاريخي پرمختګ شمېري                     |
| GET    | `/api/health`              | د سرور روغتيا                                     |

## ۵. د معمارۍ اساسي اصول

- **هيڅ Client-side پروسس نه:** ټول د کتاب کارونه دلته کيږي.
- **د قطار پر بنسټ ويکټورول:** د Gemini د 429 ايرر د مخنيوي لپاره د Rate-Limit + Exponential Backoff سره.
- **د فقهي جوړښت پر بنسټ چنکنګ:** هره ټوټه يوه نه پرې کېدونکې فقهي مسأله ده.
- **غني ميټاډېټا:** هره ټوټه ۹ ګونې ساحې لري ترڅو حواله سرورزه باوري وي.
- **د Hallucination مخنيوی:** د Gemini ماډل ته سخت پرامپټ ورکول کيږي چي يوازي د context پر بنسټ ځواب ووايي.
