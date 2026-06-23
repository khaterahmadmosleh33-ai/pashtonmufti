// د اډمن پينل — د کتابونو د قطار حالت، د Worker معلومات، او د اپلوډ موډال.

import { useEffect, useState } from "react";
import { chunkingPipeline } from "../data/pipeline";
import type { BookStatus } from "../types";
import { getBooks, getQueueStats, isLiveBackend } from "../lib/api";
import UploadModal from "./UploadModal";
import SingleBookWorkbench from "./SingleBookWorkbench";

type Stats = Awaited<ReturnType<typeof getQueueStats>>;

export default function AdminPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [books, setBooks] = useState<BookStatus[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"workbench" | "all">("workbench");
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      setError(null);
      const [s, b] = await Promise.all([getQueueStats(), getBooks()]);
      setStats(s);
      setBooks(b);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "د اډمن ډيټا راپورته نه سول.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // د هرو ۵ ثانيو وروسته د تازه ډيټا راپورته کول (يوازي د حقيقي بېک انډ سره)
    if (isLiveBackend) {
      const t = setInterval(refresh, 5000);
      return () => clearInterval(t);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-emerald-800">
        <span className="pulse-dot mx-1 h-3 w-3 rounded-full bg-emerald-700" />
        <span
          className="pulse-dot mx-1 h-3 w-3 rounded-full bg-emerald-700"
          style={{ animationDelay: "0.2s" }}
        />
        <span
          className="pulse-dot mx-1 h-3 w-3 rounded-full bg-emerald-700"
          style={{ animationDelay: "0.4s" }}
        />
        <span className="mr-3 text-sm">د اډمن ډيټا راپورته کول…</span>
      </div>
    );
  }

  if (error || !stats) {
    const setup = "cd server\ncp .env.example .env\n# set DATABASE_URL and GEMINI_API_KEY\nnpm install\nnpm run migrate\nnpm run dev\n\n# frontend .env.local\nVITE_API_BASE=http://localhost:8080";
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-red-300 bg-red-50 p-8 text-red-900 shadow-sm">
          <h2 className="mb-2 text-2xl font-bold">حقيقي API ته تړلتيا نسته</h2>
          <p className="mb-4 text-sm leading-relaxed">
            اډمن پينل جعلي ډيټا نه ښيي. اول Express سرور، PostgreSQL/pgvector، او
            Gemini کيلي چالان کړی، بيا د frontend لپاره
            <span className="mono mx-1">VITE_API_BASE</span>
            وټاکی.
          </p>
          <pre className="mono overflow-x-auto rounded-xl bg-[#0b1220] p-4 text-xs text-amber-100" dir="ltr">
            {setup}
          </pre>
          {error && <div className="mt-3 text-xs">خطا: {error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <UploadModal
        open={open}
        onClose={() => setOpen(false)}
        onUploaded={refresh}
      />

      {/* د سر عنوان */}
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="mb-2 text-3xl font-bold text-[#0f3d2e]">
            د اډمن پينل
          </h2>
          <p className="text-amber-950/80">
            د کتابونو د پروسس، ويکټورولو، او د قطار د حالت څارنه. ټول درانه کارونه
            د سرور پر خوا د Background Worker لخوا ترسره کيږي.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="shrink-0 rounded-2xl bg-gradient-to-br from-[#0f3d2e] to-[#14533f] px-5 py-3 text-sm font-bold text-amber-100 shadow-lg"
        >
          ➕ نوی کتاب اپلوډ کړی
        </button>
      </div>

      {/* د لېدنو tabs */}
      <div className="mb-6 inline-flex gap-1 rounded-2xl border border-amber-900/15 bg-white/60 p-1">
        <button
          onClick={() => setView("workbench")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "workbench" ? "tab-active" : "text-emerald-900 hover:bg-amber-50"
          }`}
        >
          🎯 يو کتاب (پړاو ۱)
        </button>
        <button
          onClick={() => setView("all")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "all" ? "tab-active" : "text-emerald-900 hover:bg-amber-50"
          }`}
        >
          📚 ټول کتابونه او قطار
        </button>
      </div>

      {view === "workbench" && (
        <SingleBookWorkbench books={books} onOpenUpload={() => setOpen(true)} />
      )}
      {view === "all" && (
        <AllBooksView stats={stats} books={books} />
      )}
    </div>
  );
}

function AllBooksView({ stats, books }: { stats: Stats; books: BookStatus[] }) {
  return (
    <div className="space-y-10">
      
      {/* د حقيقي کار د اصولو پټۍ (له مخ‌پاڼي څخه راوړل سوې) */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { v: "۱", l: "اول يو کتاب" },
          { v: "DB", l: "online ډيټابېس" },
          { v: "۹", l: "د حوالې ساحې" },
        ].map((s) => (
          <div
            key={s.l}
            className="rounded-2xl border border-amber-900/15 bg-white/70 p-4 text-center shadow-sm"
          >
            <div className="text-2xl font-extrabold text-emerald-900">
              {s.v}
            </div>
            <div className="text-xs font-semibold text-amber-900/80">
              {s.l}
            </div>
          </div>
        ))}
      </div>

      {/* د عمومي شمېرو ګريډ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="ټولي ټوټي"
          value={Number(stats.totalChunks).toLocaleString("ar")}
          sub={`${stats.totalBooks} کتابونه`}
          icon="🧩"
          tone="amber"
        />
        <StatCard
          label="ويکټور سوي"
          value={Number(stats.embeddedChunks).toLocaleString("ar")}
          sub={`${((stats.embeddedChunks / Math.max(stats.totalChunks, 1)) * 100).toFixed(1)}٪ بشپړ سوی`}
          icon="✅"
          tone="green"
        />
        <StatCard
          label="په قطار / پاته"
          value={Number(stats.queuedChunks).toLocaleString("ar")}
          sub={`د هري ثانيي ${stats.rateLimit} غوښتني`}
          icon="⏳"
          tone="orange"
        />
      </div>

      {/* د Worker د حالت کارت */}
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard
          title="د Worker حالت"
          main={
            <span className="flex items-center gap-2">
              <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-green-500" />
              {stats.workerStatus}
            </span>
          }
          sub={`وروستی ويکټور: ${stats.lastEmbeddedAt}`}
        />
        <InfoCard
          title="د Rate Limit"
          main={`په ثانيه کي ${stats.rateLimit} غوښتني`}
          sub="د Gemini د ۴۲۹ ايرر د مخنيوي لپاره"
        />
        <InfoCard
          title="د Backoff تګلاره"
          main={stats.backoffStrategy}
          sub="په هر ناکامۍ ځنډ دوه برابره کيږي"
          small
        />
      </div>

      {/* د حقيقي RAG جريان (له مخ‌پاڼي څخه راوړل سوی) */}
      <div className="rounded-3xl border border-amber-900/15 bg-white/40 p-6">
        <div className="mb-4 flex items-center justify-between text-sm text-amber-900/80">
          <span className="text-lg font-bold text-[#0f3d2e]">د حقيقي RAG جريان</span>
          <span className="rounded-full bg-emerald-900 px-3 py-1 text-[11px] font-bold text-amber-200">
            server-side
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-5">
          {[
            ["۱", "کتاب اپلوډ", "پاک UTF-8 .txt فايل سرور ته ځي"],
            ["۲", "فقهي چنکنګ", "کتاب/باب/فصل/مسأله پر بنسټ"],
            ["۳", "ويکټورول", "embedding_queue + Gemini text-embedding-004"],
            ["۴", "پوښتنه", "query embedding → pgvector `<=>` → context"],
            ["۵", "ځواب", "Gemini يوازي د ورکړل سوو مراجعو څخه ليکي"],
          ].map(([n, t, d]) => (
            <div key={n} className="flex flex-col gap-3 rounded-2xl border border-amber-900/10 bg-white/80 p-4 shadow-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900 text-sm font-bold text-amber-200">
                {n}
              </span>
              <div>
                <div className="font-bold text-emerald-900">{t}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-amber-900/80">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* د کتابونو لست */}
      <div className="fatwa-card rounded-2xl">
        <div className="flex items-center justify-between border-b border-amber-900/15 px-6 py-4">
          <h3 className="text-lg font-bold text-emerald-900">
            د کتابونو د پروسس حالت
          </h3>
          <span className="text-xs text-amber-900/70">
            {isLiveBackend ? "🟢 د حقيقي API سره وصل" : "🔴 API نه دی تړل سوی"}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-amber-50/50 text-xs uppercase tracking-wider text-amber-900/80">
              <tr>
                <th className="px-6 py-3">د کتاب نوم</th>
                <th className="px-6 py-3">مصنف</th>
                <th className="px-6 py-3">ټولي ټوټي</th>
                <th className="px-6 py-3">ويکټور سوي</th>
                <th className="px-6 py-3">په قطار / پاته</th>
                <th className="px-6 py-3">پرمختګ</th>
                <th className="px-6 py-3">حالت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-900/10">
              {books.map((b) => {
                const pct = (b.embeddedChunks / Math.max(b.totalChunks, 1)) * 100;
                return (
                  <tr key={b.id} className="transition-colors hover:bg-amber-50/40">
                    <td className="max-w-xs px-6 py-4 font-bold text-emerald-950">
                      {b.title}
                    </td>
                    <td className="px-6 py-4 text-amber-900/80">{b.author}</td>
                    <td className="px-6 py-4 mono text-emerald-900">
                      {b.totalChunks.toLocaleString("ar")}
                    </td>
                    <td className="px-6 py-4 mono text-green-700">
                      {b.embeddedChunks.toLocaleString("ar")}
                    </td>
                    <td className="px-6 py-4 mono text-orange-700">
                      {b.queuedChunks.toLocaleString("ar")}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-amber-100">
                          <div
                            className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-700 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-emerald-900">
                          {pct.toFixed(0)}٪
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                );
              })}
              {books.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-amber-900/70">
                    لا تر اوسه کوم کتاب نه دی اپلوډ سوی.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* د چنکنګ پايپلاين */}
      <div>
        <h3 className="mb-4 text-xl font-bold text-[#0f3d2e]">
          د فقهي چنکنګ (Chunking) پايپلاين
        </h3>
        <p className="mb-6 text-sm text-amber-950/80">
          هيڅکله د کلمو په شمېر پرې کول نه کاروو. د کتاب جوړښت (کتاب، باب، فصل،
          مبحث، مطلب، مسأله، فرع) د پرې کولو بنسټ دی، ترڅو هره ټوټه يوه بشپړه
          او نه پرې کېدونکې فقهي مسأله وي.
        </p>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {chunkingPipeline.map((p) => (
            <div key={p.step} className="fatwa-card rounded-2xl p-5">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-lg font-bold text-white shadow-md">
                {p.step}
              </div>
              <h4 className="mb-2 text-base font-bold text-emerald-950">
                {p.title}
              </h4>
              <p className="text-xs leading-relaxed text-amber-950/80">
                {p.detail}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* د سيسټم ۶ خصوصيتونه (له مخ‌پاڼي څخه راوړل سوي) */}
      <div>
        <h3 className="mb-4 text-xl font-bold text-[#0f3d2e]">د سيسټم ځانګړتياوي</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { i: "📜", t: "د حوالې سره" },
            { i: "🚫", t: "د Hallucination مخنيوی" },
            { i: "🧠", t: "د فقهي چنکنګ" },
            { i: "⚡", t: "د pgvector لټون" },
            { i: "🛡️", t: "د 429 ايرر مخنيوی" },
            { i: "🕌", t: "حنفي مذهب" },
          ].map((f) => (
            <div
              key={f.t}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-amber-900/10 bg-white/60 p-4 text-center shadow-sm transition-all hover:bg-white/80"
            >
              <div className="text-3xl">{f.i}</div>
              <div className="text-xs font-bold text-emerald-900">{f.t}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  tone: "emerald" | "amber" | "green" | "orange";
}) {
  const toneMap = {
    emerald: "from-emerald-50 to-emerald-100/40 text-emerald-900 border-emerald-700/20",
    amber: "from-amber-50 to-amber-100/40 text-amber-900 border-amber-700/20",
    green: "from-green-50 to-green-100/40 text-green-900 border-green-700/20",
    orange: "from-orange-50 to-orange-100/40 text-orange-900 border-orange-700/20",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${toneMap[tone]}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-wider opacity-70">
          {label}
        </span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-3xl font-extrabold">{value}</div>
      {sub && <div className="mt-1 text-xs opacity-70">{sub}</div>}
    </div>
  );
}

function InfoCard({
  title,
  main,
  sub,
  small,
}: {
  title: string;
  main: React.ReactNode;
  sub?: string;
  small?: boolean;
}) {
  return (
    <div className="fatwa-card rounded-2xl p-5">
      <div className="mb-1 text-xs font-bold text-amber-700">{title}</div>
      <div className={`font-bold text-emerald-900 ${small ? "text-sm" : "text-lg"}`}>
        {main}
      </div>
      {sub && <div className="mt-2 text-xs text-amber-900/70">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    processing: { label: "په پروسس کي", cls: "bg-blue-100 text-blue-800 ring-blue-300" },
    complete: { label: "بشپړ سوی", cls: "bg-green-100 text-green-800 ring-green-300" },
    queued: { label: "په قطار کي", cls: "bg-amber-100 text-amber-800 ring-amber-300" },
    paused: { label: "ودرول سوی", cls: "bg-gray-100 text-gray-800 ring-gray-300" },
    failed: { label: "نا کام سوی", cls: "bg-red-100 text-red-800 ring-red-300" },
  };
  const s = map[status] || map.queued;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${s.cls}`}>
      {s.label}
    </span>
  );
}
