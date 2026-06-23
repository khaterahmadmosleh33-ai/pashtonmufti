// د «پښتون مفتي» د ازموينې سيستم (اصلاح سوی)

import { useMemo, useState } from "react";
import { goldenTests, type TestCase } from "../data/roadmap";
import { askMufti } from "../lib/api";

type TestResult = {
  caseId: string;
  systemAnswer: string;
  matchedKeywords: string[];
  missedKeywords: string[];
  score: number; // ۰..۱
  latencyMs: number;
  sourcesFound: number;
};

export default function Evaluation() {
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [runningAll, setRunningAll] = useState(false);

  // د عمومي شمېرو محاسبه
  const stats = useMemo(() => {
    const all = Object.values(results);
    if (all.length === 0)
      return { avg: 0, pass: 0, fail: 0, completed: 0 };
    const sum = all.reduce((s, r) => s + r.score, 0);
    const pass = all.filter((r) => r.score >= 0.7).length; // دلته سختګيري د 0.7 په حد کي ده
    return {
      avg: (sum / all.length) * 100,
      pass,
      fail: all.length - pass,
      completed: all.length,
    };
  }, [results]);

  const evaluateOne = async (tc: TestCase): Promise<TestResult> => {
    const t0 = Date.now();
    // اصلاح: د پوښتني تر څنګ موضوع (topic) هم لېږو تر څو لټون دقيقه سي
    const f = await askMufti(tc.question, tc.topic); 
    const latency = Date.now() - t0;
    const answer = f.answer || "";
    const lower = answer.toLowerCase();
    const matched = tc.expectedKeywords.filter((k) =>
      lower.includes(k.toLowerCase())
    );
    const missed = tc.expectedKeywords.filter(
      (k) => !lower.includes(k.toLowerCase())
    );
    const score = tc.expectedKeywords.length
      ? matched.length / tc.expectedKeywords.length
      : 0;
    return {
      caseId: tc.id,
      systemAnswer: answer,
      matchedKeywords: matched,
      missedKeywords: missed,
      score,
      latencyMs: latency,
      sourcesFound: f.sources?.length || 0,
    };
  };

  const runOne = async (tc: TestCase) => {
    setRunning(tc.id);
    try {
      const r = await evaluateOne(tc);
      setResults((p) => ({ ...p, [tc.id]: r }));
    } catch (e: any) {
      alert(`ازموينه ناکامه سوه: ${e.message}`);
    } finally {
      setRunning(null);
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const tc of goldenTests) {
      setRunning(tc.id);
      try {
        const r = await evaluateOne(tc);
        setResults((p) => ({ ...p, [tc.id]: r }));
      } catch {
        /* ادامه ورکوو */
      }
    }
    setRunning(null);
    setRunningAll(false);
  };

  const reset = () => {
    if (confirm("ټولي نتيجي پاکوی؟")) setResults({});
  };

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="mb-8">
        <div className="ornament mb-4">۞</div>
        <h2 className="mb-2 text-3xl font-bold text-[#0f3d2e]">
          ⚖️ د ازموينې سيستم — پړاو ۶
        </h2>
        <p className="text-amber-950/80">
          د Golden Dataset پر بنسټ د «پښتون مفتي» سموالی پرتله کوو.
        </p>
      </div>

      {/* د عمومي شمېرو ګريډ */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <BigStat
          label="اوسط سموالی"
          value={`${stats.avg.toFixed(1)}٪`}
          tone={stats.avg >= 90 ? "green" : stats.avg >= 70 ? "amber" : "red"}
          icon="📊"
        />
        <BigStat
          label="بريالۍ ازموينې"
          value={stats.pass.toLocaleString("ar")}
          tone="green"
          icon="✅"
        />
        <BigStat
          label="ناکامي ازموينې"
          value={stats.fail.toLocaleString("ar")}
          tone="red"
          icon="❌"
        />
        <BigStat
          label="بشپړي سوي"
          value={`${stats.completed}/${goldenTests.length}`}
          tone="amber"
          icon="🧪"
        />
      </div>

      <div className="fatwa-card mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="text-sm text-emerald-900">
          <b>{goldenTests.length}</b> پوښتني په لومړني Golden Dataset کي شته
        </div>
        <div className="flex gap-2">
          {Object.keys(results).length > 0 && (
            <button
              onClick={reset}
              className="rounded-xl border border-amber-900/20 bg-white/70 px-4 py-2 text-sm font-bold text-emerald-900 hover:bg-amber-50"
            >
              🗑️ پاکول
            </button>
          )}
          <button
            onClick={runAll}
            disabled={runningAll}
            className="rounded-xl bg-gradient-to-br from-[#0f3d2e] to-[#14533f] px-5 py-2 text-sm font-bold text-amber-100 shadow-md disabled:opacity-50"
          >
            {runningAll ? "د ټولو په چلولو کي…" : "▶ ټولي ازموينې وچلوی"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {goldenTests.map((tc) => (
          <TestCard
            key={tc.id}
            tc={tc}
            result={results[tc.id]}
            running={running === tc.id}
            disabled={runningAll && running !== tc.id}
            onRun={() => runOne(tc)}
          />
        ))}
      </div>
    </div>
  );
}

// ... پاته برخې (BigStat, TestCard, StatusBadge) دي په خپل ځای پرېږدی.
