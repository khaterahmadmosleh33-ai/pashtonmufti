# د «پښتون مفتي» د حقيقي سرور د چلولو لارښوونه

دا لارښود تاسو ته وايي چې څنګه خپل حقيقي سرور چالان کړئ، ډيټابېس ته وصل سي، او د نړۍ مخته وړاندې کړئ.

---

## ۱. د سرور چلول (لوکل)

### لومړی ګام: Dependencies نصب کول
```bash
cd server
npm install
```

### دوهم ګام: ډيټابېس جوړول (Migration)
دا به ستاسي په Supabase کي د `books`، `chunks`، `embedding_queue`، `fatwa_log`، `test_cases`، او `test_runs` جدولونه جوړ کړي:

```bash
npm run migrate
```

که بريالی سو، به دا وګورئ:
```
✅ [migrate] سکيما په بريالۍ توګه جوړه سوه.
```

### درېیم ګام: سرور چالان کول
دا به API او Worker دواړه پيل کړي:

```bash
npm run dev
```

بریالیتوب به دا وي:
```
✅ د «پښتون مفتي» API په http://localhost:8080 روان دی
🚀 [worker:...] د ويکټورولو ماشين پيل سو
```

---

## ۲. د Frontend چلول

په یوه بله terminal کي:

```bash
# ډاډ ترلاسه کړئ چې .env.local شته
# VITE_API_BASE=http://localhost:8080

npm run dev
```

بروسر کي `http://localhost:5173` خلاص کړئ.

---

## ۳. د لومړي کتاب اپلوډ

1. اډمن پينل ته ولاړ شئ
2. «🎯 يو کتاب (پړاو ۱)» ټاب وټاکئ
3. «➕ کتاب اپلوډ کړی» کليک کړئ
4. د کتاب معلومات ډک کړئ:
   - د کتاب نوم: لکه «البحر الرائق شرح کنز الدقائق»
   - مصنف: لکه «زين الدين ابن نجيم المصري»
   - مطبعه: لکه «دار الکتاب الإسلامي»
5. د `.txt` فايل اپلوډ کړئ (يا متن په textarea کي کاپي کړئ)
6. «اپلوډ او د قطار ته ولېږی» کليک کړئ

---

## ۴. د ويکټورولو څارنه

- په اډمن پينل کي به «ويکټور سوي» شمېره ورو ورو لوړه شي
- Worker په ثانيه کي ۵ غوښتني کوي (د Gemini د 429 ايرر د مخنيوي لپاره)
- کله چي ټولي ټوټي ويکټور سي، حالت به «بشپړ سوی» شي

---

## ۵. د پوښتني ازموينه

1. «د مفتي خونه» ټاب ته ولاړ شئ
2. یوه پوښتنه وکړئ، لکه: «د تيمم حکم څه دی؟»
3. سيستم به:
   - ستاسي پوښتنه ويکټور کړي
   - د pgvector څخه تر ټولو نږدې ټوټي راپورته کړي
   - د Gemini څخه د هماغو مراجعو پر بنسټ ځواب جوړ کړي
   - بشپړه حواله به درکړي

---

## ۶. د نړۍ مخته وړاندي کول (Deployment)

### د Backend Deployment

**Render.com** (تر ټولو اسانه):
1. په Render کي نوی «Web Service» جوړ کړئ
2. Repository وصل کړئ
3. Root Directory: `server`
4. Build Command: `npm install`
5. Start Command: `npm start`
6. Environment Variables اضافه کړئ:
   - `DATABASE_URL` (ستاسي د Supabase URL)
   - `GEMINI_API_KEY` (ستاسي API key)
   - `GEMINI_EMBED_MODEL=text-embedding-004`
   - `GEMINI_REASON_MODEL=gemini-1.5-pro`
   - `CLIENT_ORIGIN=https://your-frontend-domain.com`

**Railway.app** يا **Fly.io** هم کار کوي.

### د Frontend Deployment

**Vercel** (تر ټولو اسانه):
1. په Vercel کي نوی Project جوړ کړئ
2. Repository وصل کړئ
3. Environment Variable اضافه کړئ:
   - `VITE_API_BASE=https://your-backend-url.com`
4. Deploy کليک کړئ

**Netlify** يا **Cloudflare Pages** هم کار کوي.

---

## ۷. د امنيت يادوني

1. **هیڅکله `.env` فايلونه په GitHub کي اپلوډ مه کړئ**
2. د Supabase کي د password لپاره قوي authentication فعاله کړئ
3. د Gemini API key د environment variable په توګه وساتئ
4. د CORS په `CLIENT_ORIGIN` کي یوازې خپل ډومينونه اضافه کړئ

---

## ۸. د مشکل حل

### که migration ناكام سو:
- ډاډ ترلاسه کړئ چې `DATABASE_URL` سم دی
- په Supabase Dashboard کي `pgvector` extension فعاله کړئ
- په SQL Editor کي دا وچلوئ:
  ```sql
  CREATE EXTENSION IF NOT EXISTS vector;
  CREATE EXTENSION IF NOT EXISTS pg_trgm;
  ```

### که Worker ويکټور نه کوي:
- په server logs کي د 429 ايرر وګورئ
- `EMBED_RATE_PER_SEC` کم کړئ (لکه ۳ ته)
- ډاډ ترلاسه کړئ چې `GEMINI_API_KEY` سم دی

### که Frontend API ته نه شي وصلېدای:
- ډاډ ترلاسه کړئ چې `VITE_API_BASE` سم دی
- د CORS اجازه په سرور کي چک کړئ
- په Browser Console کي error وګورئ

---

## ۹. د ازموينې (Evaluation) چلول

1. «ازموينه» ټاب ته ولاړ شئ
2. «ټولي ازموينې وچلوی» کليک کړئ
3. که سموالی ≥ ۹۰٪ وي، نو ستاسو سيستم د پراخولو لپاره چمتو دی
4. که کم وي، د ناکامو پوښتنو root-cause تحلیل کړئ

---

## ۱۰. د پراخولو اصول

- **یو کتاب اول**: تر هغه چې یو کتاب په بشپړ ډول ازمويل سوی نه وي، بل کتاب مه اضافه کوئ
- **د ازموينې تکرار**: د هر نوي کتاب وروسته Evaluation بيا وچلوئ
- **د کيفيت ساتنه**: که سموالی راټيټ سي، نوي کتابونه مه اضافه کوئ

---

**بريالی اوسئ! ان شاء الله دا سيستم به د مسلمانانو لپاره د علم او لارښوونې سبب وګرځي.**
