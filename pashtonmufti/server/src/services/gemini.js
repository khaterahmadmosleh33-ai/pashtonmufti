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
// SYSTEM PROMPT (ثابت بنياد او متحرک قوانين)
// ============================================================

const BASE_SYSTEM_PROMPT = `
ته يو ستر اسلامي عالم او د حنفي مذهب پوه مفتي يې چي نوم دي «پښتون مفتي» دی.

مهم او نه ماتېدونکي قواعد:
1. يوازي او يوازي د ورکړل سوو فقهي مراجعو پر بنسټ ځواب ورکړه.
2. که واقعاً هيڅ اړوند متن موجود نه وي، نو ووايه: «په موجودو مراجعو کي واضح جواب ونه موندل سو.»
3. له ځانه فتوا مه جوړوه او د مراجعو څخه دباندي معلومات مه ور زياتوه.
`.trim();

/**
 * د فتوا جوړول
 * @param {string} question - د کاروونکي پوښتنه
 * @param {Array} sources - د فقهي مراجعو ټوټې (Chunks)
 * @param {Array} activeRules - 🧠 د سوپابيس څخه راغلي متحرک قوانين
 */
export async function generateFatwa(question, sources, activeRules = []) {
  if (!genAI) {
    throw new Error(
      "GEMINI_API_KEY ټاکل سوی نه دی"
    );
  }

  // د اډمن د اصولو يو ځای کول (Dynamic Brain Injection)
  let dynamicRulesText = "";
  if (activeRules.length > 0) {
    dynamicRulesText = "\n\nد سيسټم د مشر (اډمن) لخوا ستا لپاره ځانګړي اصول او قوانين:\n";
    activeRules.forEach((rule, index) => {
      dynamicRulesText += `${index + 1}. ${rule}\n`;
    });
  }

  // د جيمينای مکمل او نهايي سيسټم پرامپټ
  const FINAL_SYSTEM_PROMPT = BASE_SYSTEM_PROMPT + dynamicRulesText;

  // مخکې ۲۵ وې، اوس ۱۰ ته راکښته سول تر څو انپوټ ټوکنونه کم سي
  const activeSources = sources.slice(0, 10);

  const refsBlock = activeSources
    .map((s, i) => {
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
    })
    .join("\n\n====================\n\n");

  const userPrompt = `
# پوښتنه

${question}

# فقهي مراجع (يوازي له همدې مراجعو څخه کار واخله)

${refsBlock}

# ځواب وليکه:
`.trim();

  // د ماډلونو نوی لست
  const modelList = [
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash"
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
          systemInstruction: FINAL_SYSTEM_PROMPT,
          generationConfig: {
            temperature: 0.15,
            topP: 0.85,
            maxOutputTokens: 8192,
          },
        });

      const result =
        await model.generateContent(
          userPrompt
        );

      const finishReason =
        result?.response?.candidates?.[0]?.finishReason;

      console.log(
        "[Gemini] Finish Reason:",
        finishReason
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

