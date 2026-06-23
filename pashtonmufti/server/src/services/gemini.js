// ============================================================
// د Google Gemini خدمت (د نويو ماډلونو او هوښيار نوبت سيسټم سره)
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("⚠️  [gemini] GEMINI_API_KEY نه دی ټاکل سوی — embedding او ځواب جوړونه به کار نه کوي.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";

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
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: 768,
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
    outputDimensionality: 768,
  });
  return result?.embedding?.values || [];
}

// ============================================================
// د RAG لپاره سخت پرامپټ
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

  // د مراجعو د context جوړول (يوازي لومړنۍ ۴ ټوټې چي سرور دروند نسي)
  const activeSources = sources.slice(0, 4);
  const refsBlock = activeSources
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

  // ستا د غوښتني مطابق د نويو ماډلونو هوښيار لست (له قوي څخه تر چټک پوري)
  const modelList = [
    "gemini-3.1-pro",         // لومړی: تر ټولو قوي او دقيق عالم
    "gemini-3.5-flash",       // دوهم: خورا تېز او نوی ماډل
    "gemini-1.5-pro-latest",  // درېيم: پخوانی قوي ماډل د احتياط دپاره
    "gemini-1.5-flash"        // څلورم: وروستی انتخاب
  ];
  
  let lastError = null;

  for (const modelName of modelList) {
    try {
      console.log(`🤖 [Gemini] د ځواب هڅه د دغه ماډل په مټ: ${modelName}`);
      const modelInstance = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: SYSTEM_PROMPT,
        generationConfig: {
          temperature: 0.2,
          topP: 0.85,
          maxOutputTokens: 2048,
        },
      });

      const result = await modelInstance.generateContent(userPrompt);
      const answer = result?.response?.text?.() || "";

      if (answer.trim()) {
        return { answer: answer.trim(), model: modelName };
      }
    } catch (error) {
      console.error(`⚠️ [Gemini] ماډل ${modelName} خطا ورکړه:`, error.message);
      lastError = error;
      // که دا ماډل فېل سي، حلقه مخته ځي او پر درجه راکښته کېږي
    }
  }

  return {
    answer: "په موجودو مراجعو کي واضح جواب ونه موندل سو. (سرور د تخنيکي وقفې سره مخ سو).",
    model: "ALL_MODELS_FAILED",
  };
}
