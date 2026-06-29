// ============================================================
// د Google Gemini خدمت او د پښتون مفتي اوسپنيز قواعد
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("⚠️ [gemini] GEMINI_API_KEY نه دی ټاکل سوی.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";

export async function embedText(text) {
  if (!genAI) throw new Error("GEMINI_API_KEY ټاکل سوی نه دی");
  if (!text || !text.trim()) throw new Error("د ويکټورولو لپاره خالي متن ورکړل سو");

  const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text }] },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: 768,
  });

  const vec = result?.embedding?.values;
  if (!Array.isArray(vec) || vec.length === 0) throw new Error("Gemini له ويکټور پرته ځواب راليږلی");
  return vec;
}

export async function embedQuery(query) {
  if (!genAI) throw new Error("GEMINI_API_KEY ټاکل سوی نه دی");
  const model = genAI.getGenerativeModel({ model: EMBED_MODEL });
  const result = await model.embedContent({
    content: { role: "user", parts: [{ text: query }] },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: 768,
  });
  return result?.embedding?.values || [];
}

const BASE_SYSTEM_PROMPT = `
ته يو ستر islamي عالم او د حنفي مذهب پوه مفتي يې چي نوم دي «پښتون مفتي» دی.

مهم او اوسپنيز قواعد چي بايد په کلکه تطبيق سي:
1. يوازي او يوازي د ورکړل سوو فقهي مراجعو پر بنسټ يو روان, تفصيلي او علمي پښتو ځواب وليکه.
2. که واقعاً هيڅ اړوند متن موجود نه وي، نو ووايه: «په موجودو مراجعو کي واضح جواب ونه موندل سو.»
3. د پښتو ځواب په مينځ کي يا پای کي، نېغ په نېغه له مراجعو څخه يوازي او يوازي ۳ تر ټولو مهم او دقيق عربي عبارتونه د خپلو حوالو (کتاب, جلد, مخ) سره وليکه.
4. ⛔ قطعي امر: د ځواب په پای کي په هيڅ صورت "مأخذونه او مراجع" يا بل کوم اضافي لست مه جوړوه! هماغه ۳ عربي عبارتونه ستا يوازنۍ حوالې دي او بس. ځواب بايد تر تفصيل او ۳ عربي عبارتونو وروسته سمدستي ختم سي او ورپسې هيڅ اضافي متن يا لست ونه ليکل سي.
`.trim();

export async function generateFatwa(question, sources, activeRules = []) {
  if (!genAI) throw new Error("GEMINI_API_KEY ټاکل سوی نه دی");

  let dynamicRulesText = "";
  if (activeRules.length > 0) {
    dynamicRulesText = "\n\n⚠️ خورا مهم: د سيسټم د مشر (اډمن) لخوا ستا لپاره لاندي قطعي او نه ماتېدونکي اصول ټاکل سوي دي. که دي له دې اصولو څخه يوه ذره هم سرغړونه وکړه، ځواب دي بيخي د منلو وړ نه دئ:\n";
    activeRules.forEach((rule, index) => {
      dynamicRulesText += `${index + 1}. ${rule}\n`;
    });
  }

  const FINAL_SYSTEM_PROMPT = BASE_SYSTEM_PROMPT + dynamicRulesText;
  const activeSources = sources.slice(0, 5);

  const refsBlock = activeSources.map((s, i) => {
    const m = s.metadata || {};
    return [
      `[حواله ${i + 1}] ${m.book_name || ""}`,
      `مؤلف: ${m.author || "—"}`,
      `کتاب: ${m.kitab || "—"}`,
      `فصل: ${m.fasl || "—"}`,
      `مسأله: ${m.masalah || "—"}`,
      `جلد: ${m.volume || "—"}`,
      `مخ: ${m.page || "—"}`,
      `متن:\n${s.arabic_text}`,
    ].join("\n");
  }).join("\n\n====================\n\n");

  const userPrompt = `
# پوښتنه
${question}

# فقهي مراجع (يوازي له همدې مراجعو څخه کار واخله)
${refsBlock}

# لارښوونه:
يوازي پورته قواعد پلي کړه. اول بشپړ پښتو ځواب وليکه، بيا هغه ۳ عربي عبارتونه د حوالو سره راوړه. ⛔ خبرداری: په پای کي د مراجعو هيڅ اضافي لست مه ليکه او خپله خبره سمدستي ختمه کړه!
`.trim();

  // ستا غوښتل سوی ترتيب (تر ټولو نوي ماډلونه اول)
  const modelList = [
    "gemini-3.5-flash",
    "gemini-3.1-pro",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash"
  ];

  let lastError = null;

  for (const modelName of modelList) {
    try {
      console.log(`[Gemini] هڅه د ${modelName}`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: FINAL_SYSTEM_PROMPT,
        generationConfig: { temperature: 0.15, topP: 0.85, maxOutputTokens: 8192 },
      });

      const result = await model.generateContent(userPrompt);
      const answer = result?.response?.text?.() || "";

      if (answer.trim()) {
        return { answer: answer.trim(), model: modelName };
      }
    } catch (err) {
      lastError = err;
      console.error(`[Gemini] ${modelName} خطا:`, err.message);
    }
  }

  return {
    answer: "په موجودو مراجعو کي واضح جواب ونه موندل سو. (تخنيکي ستونزه رامينځته سوه)",
    model: "ALL_MODELS_FAILED",
  };
}

// ------------------------------------------------------------
// 🔥 ستا د نوي هوښیار جذب کونکي پلان لپاره متحرک فنکشن
// ------------------------------------------------------------
export async function generateRelatedQuestions(question, answer) {
  if (!genAI) throw new Error("GEMINI_API_KEY ټاکل سوی نه دی");

  const prompt = `تاسو د پښتون مفتي د سيسټم هوښيار ملګری ياست. د دې فقهي پوښتني: "${question}" او د دغه وړاندي سوي ځواب: "${answer}" پر بنسټ، کټ مټ ۵ داني داسي نوي، لنډي او کياستي پوښتني په پښتو (کندهارۍ لهجه) جوړي کړی چي کاروونکی يې د دغه ځواب تر لوستلو وروسته پوښتل غواړي ترڅو موضوع په بشپړ ډول روښانه سي. ځواب بايد يوازي او يوازي يو پاک JSON Array وي چي ۵ جملې (Strings) په کي وي، هيڅ ډول اضافي متن، نمبرونه يا کلمې مه ليکی. بيلګه: ["پوښتنه ۱", "پوښتنه ۲", "پوښتنه ۳", "پوښتنه ۴", "پوښتنه ۵"]`;

  const modelList = [
    "gemini-2.5-flash",
    "gemini-1.5-flash",
    "gemini-3.5-flash",
    "gemini-3.1-pro"
  ];

  for (const modelName of modelList) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { responseMimeType: "application/json", temperature: 0.3 },
      });

      const result = await model.generateContent(prompt);
      const text = result?.response?.text?.() || "";

      if (text.trim()) {
        return JSON.parse(text.trim());
      }
    } catch (err) {
      console.error(`[Gemini Suggestions] ${modelName} خطا:`, err.message);
    }
  }

  return [];
}
