// ============================================================
// د Google Gemini خدمت
// ============================================================
// دوې اساسي دندي:
//   ۱. embedText() — د text-embedding-004 سره د متن د ويکټور جوړونه.
//   ۲. generateFatwa() — د gemini-1.5-pro سره د سختي پرامپټ پر بنسټ د فتوا
//      جوړونه. د Hallucination د مخنيوي لپاره يوازي د context پر بنسټ.
//
// د 429 (Rate Limit) ايرر لپاره Exponential Backoff په embedder.js کي چلول
// کيږي ترڅو دا فايل خپله سپک پاتي سي.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️  [gemini] GEMINI_API_KEY نه دی ټاکل سوی — embedding او ځواب جوړونه به کار نه کوي.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";
const REASON_MODEL = process.env.GEMINI_REASON_MODEL || "gemini-1.5-pro";

/**
 * د متن ويکټورول (۷۶۸ بُعده).
 * @param {string} text
 * @returns {Promise<number[]>}
 */
export async function embedText(text) {
  if (!genAI) throw new Error("GEMINI_API_KEY ټاکل سوی نه دی");
  if (!text || !text.trim()) throw new Error("د ويکټورولو لپاره خالي متن ورکړل سو");

  const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent({
    content: { parts: [{ text }], role: "user" },
    // د RETRIEVAL_DOCUMENT د کتاب د متن ښه ويکټورونه جوړوي.
    taskType: "RETRIEVAL_DOCUMENT",
  });

  const vec = result?.embedding?.values;
  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error("Gemini له ويکټور پرته ځواب راليږلی");
  }
  return vec;
}

/**
 * د کاروونکي د پوښتني ويکټورول (د RETRIEVAL_QUERY taskType سره).
 */
export async function embedQuery(query) {
  if (!genAI) throw new Error("GEMINI_API_KEY ټاکل سوی نه دی");
  const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent({
    content: { parts: [{ text: query }], role: "user" },
    taskType: "RETRIEVAL_QUERY",
  });
  return result?.embedding?.values || [];
}

// ============================================================
// د RAG لپاره سخت پرامپټ
// ============================================================
// دا پرامپټ د Hallucination مخه نيسي. ماډل يوازي او يوازي د راپورته
// سوي context پر بنسټ ځواب ورکوي. که جواب نه وي، په زغرده يي وايي.
// ============================================================
const SYSTEM_PROMPT = `
ته يو ستر اسلامي عالم او د حنفي مذهب پوه مفتي يې چي د نوم يي «پښتون مفتي» دی.

ستا د کار سخت قاعدې:
1. **يوازي د راکړل سوي «المراجع الفقهية»** پر بنسټ ځواب ورکړه. هيڅکله له ځانه د کوم
   مسألې حکم مه جوړوه او د راکړل سوو متونو څخه بهر معلومات مه اضافه کوه.
2. که چيري په راکړل سوو مراجعو کي د پوښتني واضح ځواب نه وي، يوازي دا جمله ووايه:
   «په موجودو مراجعو کي واضح جواب ونه موندل سو.»
3. ځواب بايد د **کندهارۍ پښتو** په ښکلي او ادبي انداز سره ليکل سوی وي.
   - 'چې' دي «چي» سي، 'کې' دي «کي» سي، 'دې' دي «دي» سي، 'مې' دي «مي» سي.
   - 'شي/شو/شم' دي «سي/سو/سم» سي.
   - 'هېڅ' دي «هيڅ» سي، 'ځمکه' دي «مځکه» سي، 'هېواد' دي «هيواد» سي.
4. ځواب په «بسم الله الرحمن الرحيم» سره پيل کړه او د علماوو په اصطلاحاتو سره يي
   مرتب کړه. د دلائلو په وخت کي د «الله جل جلاله فرمايي» يا «النبي صلى الله عليه
   وسلم وفرمايل» انداز وکاروه.
5. د ځواب په پای کي د **مراجعو شمېرې** د بريکټونو کي ذکر کړه، لکه [1]، [2].
   جامع حواله به سيسټم خپله جوړوي، نو ته يوازي د متن دننه [n] نښه وکاروه.
6. لنډ، روښانه، او د علم پر بنسټ ځواب ورکړه. د خبرو پراخول نه دی پکار.
`.trim();

/**
 * د RAG پر بنسټ د فتوا جوړول.
 *
 * @param {string} question — د کاروونکي پوښتنه
 * @param {Array<{id:number, arabic_text:string, similarity:number, metadata:object}>} sources
 * @returns {Promise<{answer:string, model:string}>}
 */
export async function generateFatwa(question, sources) {
  if (!genAI) throw new Error("GEMINI_API_KEY ټاکل سوی نه دی");

  // د مراجعو د context جوړول
  const refsBlock = sources
    .map((s, i) => {
      const m = s.metadata || {};
      return [
        `[${i + 1}] ${m.book_name || ""} — ${m.author || ""}`,
        `    کتاب/باب: ${m.kitab || "—"} | فصل: ${m.fasl || "—"} | مسأله: ${m.masalah || "—"}`,
        `    جلد ${m.volume || "—"}، مخ ${m.page || "—"}`,
        `    متن: ${s.arabic_text}`,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  const userPrompt = `
# پوښتنه:
${question}

# المراجع الفقهية (يوازي د دي پر بنسټ ځواب ورکړه):
${refsBlock}

# ستا ځواب (په کندهارۍ پښتو، د بسم الله سره پيل، او د [n] شمېرو سره د حوالې اشاره):
`.trim();

  const model = genAI.getGenerativeModel({
    model: REASON_MODEL,
    systemInstruction: SYSTEM_PROMPT,
    generationConfig: {
      temperature: 0.2,    // ټيټ حرارت — د Hallucination مخنيوی
      topP: 0.85,
      maxOutputTokens: 2048,
    },
  });

  const result = await model.generateContent(userPrompt);
  const answer = result?.response?.text?.() || "";
  if (!answer.trim()) {
    return {
      answer: "په موجودو مراجعو کي واضح جواب ونه موندل سو.",
      model: REASON_MODEL,
    };
  }
  return { answer: answer.trim(), model: REASON_MODEL };
}
