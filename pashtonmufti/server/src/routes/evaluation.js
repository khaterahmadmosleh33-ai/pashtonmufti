// د «پښتون مفتي» د ازموينې سيستم (Phase 6).
// د Golden Dataset پر بنسټ د سيستم سموالی پرتله کول:
//   انساني عالم  VS  پښتون مفتي
//
// که د سيستم سموالی ≥ ۹۰٪ سي، نو سيستم قوي دی او د Phase 7 (پراخول) ته
// چمتو دی.

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
    const pass = all.filter((r) => r.score >= 0.7).length;
    return {
      avg: (sum / all.length) * 100,
      pass,
      fail: all.length - pass,
      completed: all.length,
    };
  }, [results]);

  const evaluateOne = async (tc: TestCase): Promise<TestResult> => {
    const t0 = Date.now();
    const f = await askMufti(tc.question);
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
      {/* د سر برخه */}
      <div className="mb-8">
        <div className="ornament mb-4">۞</div>
        <h2 className="mb-2 text-3xl font-bold text-[#0f3d2e]">
          ⚖️ د ازموينې سيستم — پړاو ۶
        </h2>
        <p className="text-amber-950/80">
          د Golden Dataset پر بنسټ د «پښتون مفتي» سموالی پرتله کوو. د هر
          ځواب دننه د عالم د کليدي کلمو موجوديت ګورو، او د ۹۰٪+ سموالي په صورت
          کي سيستم د پراخولو لپاره چمتو دی.
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

      {/* د کنټرول پټۍ */}
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

      {/* د ازموينو لست */}
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

      {/* د پايلې پيغام */}
      {stats.completed === goldenTests.length && stats.completed > 0 && (
        <div
          className={`mt-10 rounded-3xl border-2 border-double p-6 text-center ${
            stats.avg >= 90
              ? "border-green-500/50 bg-green-50"
              : "border-amber-500/50 bg-amber-50"
          }`}
        >
          {stats.avg >= 90 ? (
            <>
              <div className="mb-2 text-4xl">🎉</div>
              <h3 className="mb-2 text-xl font-bold text-green-900">
                سيستم قوي دی — د Phase 7 ته چمتو دی
              </h3>
              <p className="text-sm text-green-800">
                سموالی <b>{stats.avg.toFixed(1)}٪</b> دی — اوس کولی سو يو نوی کتاب
                ور زيات کړو. خو په ياد ولرئ: د هر نوي کتاب وروسته بايد ازموينه
                بيا چلول سي.
              </p>
            </>
          ) : (
            <>
              <div className="mb-2 text-4xl">🛑</div>
              <h3 className="mb-2 text-xl font-bold text-amber-900">
                لا پراخول مه کوی
              </h3>
              <p className="text-sm text-amber-800">
                سموالی <b>{stats.avg.toFixed(1)}٪</b> دی — د ۹۰٪ څخه ټيټ. لومړی
                د ناکامو ازموينو root-cause تحليل وکړی او بيا د پراخولو فکر کوی.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function BigStat({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone: "green" | "amber" | "red";
  icon: string;
}) {
  const tones = {
    green: "from-green-50 to-green-100/40 text-green-900 border-green-700/20",
    amber: "from-amber-50 to-amber-100/40 text-amber-900 border-amber-700/20",
    red:   "from-red-50 to-red-100/40 text-red-900 border-red-700/20",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${tones[tone]}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
          {label}
        </span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function TestCard({
  tc,
  result,
  running,
  disabled,
  onRun,
}: {
  tc: TestCase;
  result?: TestResult;
  running: boolean;
  disabled: boolean;
  onRun: () => void;
}) {
  const [open, setOpen] = useState(false);
  const score = result ? result.score * 100 : null;
  const badgeCls = score === null
    ? "bg-gray-100 text-gray-700"
    : score >= 70
    ? "bg-green-100 text-green-900"
    : score >= 40
    ? "bg-amber-100 text-amber-900"
    : "bg-red-100 text-red-900";

  return (
    <div className="fatwa-card overflow-hidden rounded-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="shrink-0 rounded-full bg-emerald-900 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-200">
            {tc.topic}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-emerald-950">{tc.question}</div>
            <div className="truncate text-xs text-amber-900/70">
              ګمارل سوي کليدي کلمې:{" "}
              {tc.expectedKeywords.map((k) => `«${k}»`).join("، ")}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {score !== null && (
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${badgeCls}`}>
              {score.toFixed(0)}٪
            </span>
          )}
          {result && (
            <button
              onClick={() => setOpen((o) => !o)}
              className="rounded-full border border-amber-900/20 bg-white/70 px-3 py-1 text-xs font-bold text-emerald-900"
            >
              {open ? "بندول" : "تفصيل"}
            </button>
          )}
          <button
            onClick={onRun}
            disabled={running || disabled}
            className="rounded-xl bg-gradient-to-br from-[#0f3d2e] to-[#14533f] px-3 py-1.5 text-xs font-bold text-amber-100 disabled:opacity-40"
          >
            {running ? "روان…" : result ? "بياکوښښ" : "وچلوی"}
          </button>
        </div>
      </div>

      {open && result && (
        <div className="border-t border-amber-900/15 bg-amber-50/30 p-5">
          <div className="grid gap-4 md:grid-cols-2">
            {/* د عالم ځواب */}
            <div className="rounded-xl border border-amber-900/15 bg-white/70 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-700">
                <span>👤</span> د انساني عالم ځواب
              </div>
              <div className="text-sm leading-relaxed text-emerald-950">
                {tc.scholarAnswer}
              </div>
              <div className="mt-3 text-[11px] text-amber-900/70">
                <b>حواله:</b> {tc.scholarReference}
              </div>
            </div>

            {/* د سيستم ځواب */}
            <div className="rounded-xl border border-emerald-700/30 bg-emerald-50/40 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold text-emerald-700">
                <span>🤖</span> د «پښتون مفتي» ځواب
              </div>
              <div className="max-h-48 overflow-y-auto text-sm leading-relaxed text-emerald-950">
                {result.systemAnswer}
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-amber-900/70">
                <span>⏱ {(result.latencyMs / 1000).toFixed(2)} ث.</span>
                <span>📚 {result.sourcesFound} مراجع</span>
              </div>
            </div>
          </div>

          {/* د کليدي کلمو پرتله */}
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-green-200 bg-green-50/60 p-3">
              <div className="mb-1 text-[11px] font-bold uppercase text-green-800">
                ✓ موندل سوي کليدي کلمې ({result.matchedKeywords.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {result.matchedKeywords.length === 0 && (
                  <span className="text-xs text-gray-500">— هيڅوک نه دي موندل سوي —</span>
                )}
                {result.matchedKeywords.map((k) => (
                  <span key={k} className="rounded bg-green-200/60 px-2 py-0.5 text-xs font-bold text-green-900">
                    {k}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-3">
              <div className="mb-1 text-[11px] font-bold uppercase text-red-800">
                ✗ ورک سوي کليدي کلمې ({result.missedKeywords.length})
              </div>
              <div className="flex flex-wrap gap-1">
                {result.missedKeywords.length === 0 && (
                  <span className="text-xs text-gray-500">— ټولي موندل سوي —</span>
                )}
                {result.missedKeywords.map((k) => (
                  <span key={k} className="rounded bg-red-200/60 px-2 py-0.5 text-xs font-bold text-red-900">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
