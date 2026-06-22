// د مفتي خونه — د کاروونکي او اې آی مفتي ترمنځ د خبرو اترو انټرفيس.
// دا برخه د حقيقي Express API، PostgreSQL، pgvector، او Gemini pipeline ته تړلې ده.

import { useEffect, useRef, useState } from "react";
import { askMufti, getFatwaHistory, isLiveBackend } from "../lib/api";
import type { Fatwa } from "../types";
import FatwaCard from "./FatwaCard";
import Hero from "./Hero";

type HistoryItem = {
  id: string;
  fatwa: Fatwa & { model?: string; latency_ms?: number };
  at: number;
};

const suggestedQuestions = [
  "د اوبو د نه موندلو په صورت کي د تيمم حکم څه دی؟",
  "د جمعې لمانځه شرطونه کوم دي؟",
  "په زکات کي د نصاب اندازه څونه ده؟",
  "د مسافر د لمانځه قصر شرعي حد څه دی؟",
];

export default function FatwaRoom() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const askBoxRef = useRef<HTMLDivElement>(null);

  // د لومړي ځل تاريخ له سرور څخه راځي، نه له localStorage څخه.
  useEffect(() => {
    if (!isLiveBackend) return;
    getFatwaHistory(20)
      .then((items) => {
        setHistory(
          items.map((fatwa, i) => ({
            id: `server-${i}`,
            fatwa,
            at: Date.now() - i,
          }))
        );
      })
      .catch(() => {
        /* تاريخ اختياري دی؛ د پوښتني اصلي کار بايد بند نه کړي. */
      });
  }, []);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setError(null);
    setLoading(true);
    setQuestion(q);
    try {
      const f = await askMufti(q);
      setHistory((h) => [
        { id: crypto.randomUUID(), fatwa: f, at: Date.now() },
        ...h,
      ]);
      // د ښوود لپاره راز
      setTimeout(() => {
        document
          .getElementById("latest-fatwa")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (e: any) {
      setError(e.message || "ستونزه راپيدا سوه");
    } finally {
      setLoading(false);
    }
  };

  const scrollToAsk = () => {
    askBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const clearHistory = () => {
    if (confirm("د پردې ښکاره تاريخ پاکوی؟ اصلي سرور لاګ نه ړنګيږي.")) setHistory([]);
  };

  return (
    <>
      <Hero onAsk={scrollToAsk} />

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* د پوښتني انپوټ */}
        <div ref={askBoxRef} className="fatwa-card rounded-3xl p-6 md:p-8">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-bold text-emerald-950">
              ستاسي فقهي پوښتنه:
            </label>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs font-bold text-amber-700 hover:text-amber-900"
              >
                🗑️ د پردې تاريخ پاکول
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3 md:flex-row">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) ask(question);
              }}
              placeholder="د بېلګي په توګه: د روژي د نيت وخت کوم دی؟ (Ctrl+Enter د لېږلو لپاره)"
              rows={3}
              className="flex-1 resize-none rounded-2xl border border-amber-900/20 bg-white/80 px-4 py-3 text-base text-emerald-950 placeholder:text-amber-900/40 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              dir="rtl"
            />
            <button
              onClick={() => ask(question)}
              disabled={loading || !question.trim()}
              className="self-end rounded-2xl bg-gradient-to-br from-[#0f3d2e] to-[#14533f] px-8 py-3 font-bold text-amber-100 shadow-lg shadow-emerald-900/20 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "د لټون په حال کي…" : "پوښتنه وکړی"}
            </button>
          </div>

          {/* وړانديز سوي پوښتني */}
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="text-xs font-bold text-amber-900/70">
              چټکي پوښتني:
            </span>
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="rounded-full border border-amber-900/20 bg-amber-50/50 px-3 py-1 text-xs text-emerald-900 transition-colors hover:border-emerald-700/40 hover:bg-emerald-50"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* د خطا د ښودلو پټۍ */}
        {error && (
          <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            ⚠️ {error}
          </div>
        )}

        {/* د بار وېستلو حالت */}
        {loading && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-900/15 bg-white/60 p-6 text-emerald-900">
            <div className="flex items-center gap-2">
              <span className="pulse-dot h-3 w-3 rounded-full bg-emerald-700" />
              <span
                className="pulse-dot h-3 w-3 rounded-full bg-emerald-700"
                style={{ animationDelay: "0.2s" }}
              />
              <span
                className="pulse-dot h-3 w-3 rounded-full bg-emerald-700"
                style={{ animationDelay: "0.4s" }}
              />
            </div>
            <div className="text-sm">
              د pgvector څخه د اړوندو فقهي ټوټو لټون… (cosine similarity)
            </div>
            <div className="text-xs text-amber-900/70">
              بيا د Gemini سره د فتوا جوړونه…
            </div>
          </div>
        )}

        {/* د چټ تاريخ — وروستی فتوا تر ټولو پورته */}
        {history.length > 0 && !loading && (
          <div className="mt-10 space-y-12">
            {history.map((h, i) => (
              <div key={h.id} id={i === 0 ? "latest-fatwa" : undefined}>
                {i > 0 && (
                  <div className="ornament my-8 text-xs text-amber-700/60">
                    ✦ مخکنۍ پوښتنه ✦
                  </div>
                )}
                <FatwaCard fatwa={h.fatwa} meta={h.fatwa} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
