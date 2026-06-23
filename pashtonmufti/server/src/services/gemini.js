// ============================================================
// د Google Gemini خدمت
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn(
    "⚠️ [gemini] GEMINI_API_KEY نه دی ټاکل سوی."
  );
}

const genAI = apiKey
  ? new GoogleGenerativeAI(apiKey)
  : null;

const EMBED_MODEL =
  process.env.GEMINI_EMBED_MODEL ||
  "text-embedding-004";

/**
 * د سند ويکټورول
 */
export async function embedText(text) {
  if (!genAI) {
    throw new Error(
      "GEMINI_API_KEY ټاکل سوی نه دی"
    );
  }

  if (!text || !text.trim()) {
    throw new Error(
      "د ويکټورولو لپاره خالي متن ورکړل سو"
    );
  }

  const model = genAI.getGenerativeModel({
    model: EMBED_MODEL,
  });

  const result = await model.embedContent({
    content: {
      role: "user",
      parts: [{ text }],
    },
    taskType: "RETRIEVAL_DOCUMENT",
    outputDimensionality: 768,
  });

  const vec = result?.embedding?.values;

  if (!Array.isArray(vec) || vec.length === 0) {
    throw new Error(
      "Gemini له ويکټور پرته ځواب راليږلی"
    );
  }

  return vec;
}

/**
 * د پوښتني ويکټورول
 */
export async function embedQuery(query) {
  if (!genAI) {
    throw new Error(
      "GEMINI_API_KEY ټاکل سوی نه دی"
    );
  }

  const model = genAI.getGenerativeModel({
    model: EMBED_MODEL,
  });

  const result = await model.embedContent({
    content: {
      role: "user",
      parts: [{ text: query }],
    },
    taskType: "RETRIEVAL_QUERY",
    outputDimensionality: 768,
  });

  return result?.embedding?.values || [];
}

// ============================================================
// SYSTEM PROMPT
// ============================================================

const SYSTEM_PROMPT = `
ته يو ستر اسلامي عالم او د حنفي مذهب پوه مفتي يې چي نوم دي «پښتون مفتي» دی.

مهم قواعد:

1. يوازي د ورکړل سوو فقهي مراجعو پر بنسټ ځواب ورکړه.

2. که د پوښتني عين لفظ په مراجعو کي موجود نه وي، نو د نژدې فقهي متنونو څخه استنباط وکړه.

3. که واقعاً هيڅ اړوند متن موجود نه وي، نو ووايه:
«په موجودو مراجعو کي واضح جواب ونه موندل سو.»

4. ځواب بايد په کندهارۍ پښتو وي.

5. "چې" -> "چي"
   "کې" -> "کي"
   "دې" -> "دي"
   "شي" -> "سي"
   "شو" -> "سو"
   "هېڅ" -> "هيڅ"

6. ځواب د:
"بسم الله الرحمن الرحيم"
سره پيل کړه.

7. د مراجعو [1] [2] [3] نښانې وکاروه.

8. د ټولو مراجعو متنونه په دقت ولوله.
يوازي لومړۍ مرجع مه کاروه.

9. که په څو مراجعو کي اړوند معلومات وي،
هغوی سره يو ځای کړه.

10. د کتاب، باب، فصل او مسئلې نومونو ته پام وکړه.

11. له ځانه فتوا مه جوړوه.

12. ځواب لنډ، علمي او واضح وي.
`.trim();

/**
 * د فتوا جوړول
 */
export async function generateFatwa(
  question,
  sources
) {
  if (!genAI) {
    throw new Error(
      "GEMINI_API_KEY ټاکل سوی نه دی"
    );
  }

  // مخکې ۴ وې، اوس ۱۵
  const activeSources = sources.slice(0, 15);

  const refsBlock = activeSources
    .map((s, i) => {
      const m = s.metadata || {};

      return [
        `[${i + 1}] ${m.book_name || ""}`,
        `مؤلف: ${m.author || "—"}`,
        `کتاب: ${m.kitab || "—"}`,
        `فصل: ${m.fasl || "—"}`,
        `مسأله: ${m.masalah || "—"}`,
        `جلد: ${m.volume || "—"}`,
        `مخ: ${m.page || "—"}`,
        `متن:`,
        s.arabic_text,
      ].join("\n");
    })
    .join("\n\n====================\n\n");

  const userPrompt = `
# پوښتنه

${question}

# فقهي مراجع

${refsBlock}

# ځواب
`.trim();

  const modelList = [
"gemini-3.1-pro",         // لومړی: تر ټولو قوي او دقيق عالم
"gemini-3.5-flash",       // دوهم: خورا تېز او نوی ماډل
"gemini-1.5-pro-latest",  // درېيم: پخوانی قوي ماډل د احتياط دپاره
"gemini-1.5-flash"        // څلورم: وروستی انتخاب
];


  let lastError = null;

  for (const modelName of modelList) {
    try {
      console.log(
        `[Gemini] هڅه د ${modelName}`
      );

      const model =
        genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: SYSTEM_PROMPT,
          generationConfig: {
            temperature: 0.15,
            topP: 0.85,
            maxOutputTokens: 2500,
          },
        });

      const result =
        await model.generateContent(
          userPrompt
        );

      const answer =
        result?.response?.text?.() || "";

      if (answer.trim()) {
        return {
          answer: answer.trim(),
          model: modelName,
        };
      }
    } catch (err) {
      lastError = err;

      console.error(
        `[Gemini] ${modelName} خطا:`,
        err.message
      );
    }
  }

  console.error(
    "[Gemini] ټول ماډلونه ناکام سول:",
    lastError?.message
  );

  return {
    answer:
      "په موجودو مراجعو کي واضح جواب ونه موندل سو. (تخنيکي ستونزه رامنځته سوه)",
    model: "ALL_MODELS_FAILED",
  };
}
