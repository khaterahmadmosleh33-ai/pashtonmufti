// د اډمن پينل — د کتابونو د قطار حالت، د Worker معلومات، اپلوډ موډال، د سايټ تنظيمات، د اې آی مغز او د ټولو خونو د مدګم کولو قفل سوې نسخه.

import { useEffect, useState } from "react";
import { chunkingPipeline } from "../data/pipeline";
import type { BookStatus } from "../types";
import { 
  getBooks, 
  getQueueStats, 
  isLiveBackend,
  getAiRules,
  addAiRule,
  updateAiRule,
  deleteAiRule,
  fetchCategories,
  addCategory,
  deleteBook,
  loginAdmin 
} from "../lib/api";
import UploadModal from "./UploadModal";
import SingleBookWorkbench from "./SingleBookWorkbench";

// د هغو فرعي خونو راغوښتل چي له هېډر څخه د ننه را کډه سوې دي
import Architecture from "./Architecture";
import Evaluation from "./Evaluation";
import Roadmap from "./Roadmap";

// ==========================================
// ستا د پي ډي اېف (PDF) د چاپولو پخوانی کوډ
// ==========================================
const escapePdfText = (value: string) => {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const waitForPdfRender = () => new Promise((resolve) => setTimeout(resolve, 180));

const handlePrintPDF = async (fatwa: any, questionText: string) => {
  const bodyFont = getComputedStyle(document.documentElement).getPropertyValue("--site-font").trim() || '"Noto Naskh Arabic", "Scheherazade New", "Amiri", serif';
  const headingFont = getComputedStyle(document.documentElement).getPropertyValue("--heading-font").trim() || bodyFont;
  const themeColor = getComputedStyle(document.documentElement).getPropertyValue("--theme-main").trim() || "#0f3d2e";

  const question = escapePdfText(questionText || "");
  const answer = escapePdfText(fatwa.answer || "");

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-10000px";
  host.style.top = "0";
  host.style.width = "794px";
  host.style.background = "#ffffff";
  host.style.zIndex = "-9999";
  host.style.direction = "rtl";

  host.innerHTML = `
    <div id="fatwa-pdf-pages" dir="rtl" lang="ps" style="width: 794px; background: #ffffff; direction: rtl; margin: 0; padding: 0; box-sizing: border-box;"></div>
  `;
  document.body.appendChild(host);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const pages = host.querySelector("#fatwa-pdf-pages") as HTMLDivElement;
  const A4_WIDTH = 794;
  const A4_HEIGHT = 1123;
  const TOP_PADDING = 50;
  const SIDE_PADDING_RIGHT = 15;
  const SIDE_PADDING_LEFT = 15;
  const BOTTOM_PADDING = 50;

  const createPage = () => {
    const page = document.createElement("div");
    page.style.width = `${A4_WIDTH}px`;
    page.style.height = `${A4_HEIGHT}px`;
    page.style.boxSizing = "border-box";
    page.style.padding = `${TOP_PADDING}px ${SIDE_PADDING_RIGHT}px ${BOTTOM_PADDING}px ${SIDE_PADDING_LEFT}px`;
    page.style.margin = "0";
    page.style.background = "#ffffff";
    page.style.color = "#111111";
    page.style.direction = "rtl";
    page.style.fontFamily = bodyFont;
    page.style.overflow = "hidden";

    const content = document.createElement("div");
    content.style.width = "100%";
    content.style.height = "100%";
    content.style.boxSizing = "border-box";
    content.style.margin = "0";
    content.style.padding = "0";
    content.style.overflow = "hidden";
    content.style.direction = "rtl";

    page.appendChild(content);
    pages.appendChild(page);
    return content;
  };

  let currentContent = createPage();

  const isOverflowing = () => currentContent.scrollHeight > currentContent.clientHeight + 1;
  const newPage = () => { currentContent = createPage(); };

  const makeTitle = (text: string) => {
    const title = document.createElement("h2");
    title.innerHTML = text;
    title.style.margin = "0 0 24px 0";
    title.style.padding = "0";
    title.style.color = themeColor;
    title.style.fontFamily = headingFont;
    title.style.fontSize = "29px";
    title.style.fontWeight = "900";
    title.style.lineHeight = "1.45";
    title.style.textAlign = "right";
    title.style.direction = "rtl";
    return title;
  };

  const makeParagraph = (isQuestion = false) => {
    const p = document.createElement("p");
    p.style.margin = "0";
    p.style.padding = "0";
    p.style.color = "#111111";
    p.style.direction = "rtl";
    p.style.textAlign = "right";
    p.style.fontFamily = bodyFont;
    p.style.fontSize = "22px";
    p.style.lineHeight = isQuestion ? "2.05" : "2.08";
    return p;
  };

  const appendTitle = (text: string) => {
    const title = makeTitle(text);
    currentContent.appendChild(title);
    if (isOverflowing()) { title.remove(); newPage(); currentContent.appendChild(title); }
  };

  const appendParagraph = (paragraphText: string, isQuestion = false) => {
    const p = makeParagraph(isQuestion);
    p.innerHTML = paragraphText;
    currentContent.appendChild(p);
    if (isOverflowing()) { p.remove(); newPage(); currentContent.appendChild(p); }
  };

  appendTitle("پوښتنه");
  appendParagraph(question, true);
  appendTitle("الجواب");
  answer.split(/\n+/).map(p => p.trim()).filter(Boolean).forEach(paragraph => appendParagraph(paragraph, false));

  await waitForPdfRender();

  try {
    // @ts-ignore
    await html2pdf().set({
      filename: "Pashton-Mufti-Fatwa.pdf",
      margin: 0,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: A4_WIDTH, width: A4_WIDTH },
      jsPDF: { unit: "px", format: [A4_WIDTH, A4_HEIGHT], orientation: "portrait", hotfixes: ["px_scaling"] },
    }).from(pages).save();
  } finally {
    host.remove();
  }
};
// ==========================================

type Stats = Awaited<ReturnType<typeof getQueueStats>>;

export type AiRule = {
  id: string;
  rule_text: string;
  is_active: boolean;
  created_at?: string;
};

export default function AdminPanel() {
  const [token, setToken] = useState(() => localStorage.getItem("mufti_token"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [stats, setStats] = useState<Stats | null>(null);
  const [books, setBooks] = useState<BookStatus[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [view, setView] = useState<"workbench" | "all" | "library" | "ai_rules" | "settings" | "architecture" | "evaluation" | "roadmap">("workbench");
  const [error, setError] = useState<string | null>(null);
  const [unlocking, setUnlocking] = useState(false);

  // 🔒 د اډمن پينل د خپلواکه رنګ او خطونو پلي کول چي د بلې خوني په بدلېدو خراب نه سي
  useEffect(() => {
    const savedAdminFont = localStorage.getItem("admin_font") || '"Cairo", sans-serif';
    const savedAdminThemeMain = localStorage.getItem("admin_theme_main") || "#0f3d2e";
    const savedAdminThemeLight = localStorage.getItem("admin_theme_light") || "#14533f";

    document.documentElement.style.setProperty("--admin-font", savedAdminFont);
    document.documentElement.style.setProperty("--admin-theme-main", savedAdminThemeMain);
    document.documentElement.style.setProperty("--admin-theme-light", savedAdminThemeLight);
  }, []);

  const refresh = async () => {
    if (!token) return;
    try {
      setError(null);
      const [s, b] = await Promise.all([getQueueStats(), getBooks()]);
      setStats(s);
      setBooks(b);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "د اډمن ډيټا راپورته نه سوې.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refresh();
      if (isLiveBackend) {
        const t = setInterval(refresh, 5000);
        return () => clearInterval(t);
      }
    }
  }, [token]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setLoginError("مهرباني وکړی ايميل او شفر دواړه داخل کړی.");
      return;
    }
    setSubmitting(true);
    setLoginError(null);
    try {
      const data = await loginAdmin(email.trim(), password.trim());
      if (data.ok && data.token) {
        setToken(data.token);
        window.location.reload();
      }
    } catch (e: any) {
      setLoginError(e instanceof Error ? e.message : "شفر يا ايميل غلط دی!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("mufti_token");
    setToken(null);
    window.location.reload();
  };

  const handleUnlockJobs = async () => {
    if (!window.confirm("آيا غواړی چي ټول قلف سوي او بند پاته کارونه خلاص کړی؟")) return;
    setUnlocking(true);
    try {
      const baseUrl = import.meta.env.VITE_API_BASE || "";
      const res = await fetch(`${baseUrl}/api/admin/unlock-stuck-jobs`, { 
        method: "POST",
        headers: { "x-admin-token": token || "" }
      });
      const data = await res.json();
      if (data.ok) {
        alert(`برياليتوب! ${data.unlocked_count} بند سوي کارونه بېرته خلاص سول.`);
        refresh();
      } else {
        alert(`خطا: ${data.error}`);
      }
    } catch (e: any) {
      alert("د سرور سره د اړيکي پر مهال خطا پېښه سوه.");
    } finally {
      setUnlocking(false);
    }
  };

  if (!token) {
    return (
      <div className="mx-auto max-w-md px-6 py-20">
        <div className="rounded-3xl border border-amber-900/15 bg-white p-8 shadow-xl">
          <h3 className="mb-2 text-2xl font-bold text-center text-emerald-950">🔐 اډمن ته ننوتل</h3>
          <p className="mb-6 text-xs text-center text-amber-900/70">د پښتون مفتي د پټو خونو د خلاصولو لپاره خپل معلومات داخل کړی.</p>
          {loginError && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-800 text-center">
              {loginError}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-emerald-950">ايميل ادرس:</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-xl border border-amber-900/20 focus:outline-none focus:border-emerald-700 bg-amber-50/10 text-sm"
                placeholder="admin@pashtonmufti.com"
                dir="ltr"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-emerald-950">پټ نوم (Password):</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-amber-900/20 focus:outline-none focus:border-emerald-700 bg-amber-50/10 text-sm"
                placeholder="••••••••"
                dir="ltr"
              />
            </div>
            <button 
              onClick={handleLogin}
              disabled={submitting}
              className="w-full bg-emerald-700 text-amber-100 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-800 transition-all text-sm"
            >
              {submitting ? "د دروازې د خلاصولو هڅه..." : "دروازه خلاصه کړه 🔑"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-emerald-800">
        <span className="pulse-dot mx-1 h-3 w-3 rounded-full bg-emerald-700" />
        <span className="pulse-dot mx-1 h-3 w-3 rounded-full bg-emerald-700" style={{ animationDelay: "0.2s" }} />
        <span className="pulse-dot mx-1 h-3 w-3 rounded-full bg-emerald-700" style={{ animationDelay: "0.4s" }} />
        <span className="mr-3 text-sm">د اډمن ډېټا راپورته کول…</span>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="rounded-3xl border border-red-300 bg-red-50 p-8 text-red-900 shadow-sm">
          <h2 className="mb-2 text-2xl font-bold">حقيقي API ته تړلتيا نسته</h2>
          <p className="mb-4 text-sm leading-relaxed">
            اډمن پينل جعلي ډيټا نه ښيي. ډاډ ترلاسه کړی چي رېنډر او ډېټابېس چالان دي.
          </p>
          {error && <div className="mt-3 text-xs">خطا: {error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-10" style={{ fontFamily: "var(--admin-font, 'Cairo', sans-serif)" }}>
      <UploadModal
        open={open}
        onClose={() => setOpen(false)}
        onUploaded={refresh}
      />

      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="mb-2 text-3xl font-bold" style={{ color: "var(--admin-theme-main, #0f3d2e)" }}>
            د اډمن پينل
          </h2>
          <p className="text-amber-950/80">
            د کتابونو د پروسس، ويکټورولو، د قطار د حالت څارنه او د سايټ تنظيمات.
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            onClick={handleUnlockJobs}
            disabled={unlocking}
            className="rounded-2xl bg-gradient-to-br from-orange-600 to-orange-800 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:from-orange-500 hover:to-orange-700 disabled:opacity-50"
          >
            {unlocking ? "په خلاصولو بوخت..." : "🔄 قلف سوي کارونه خلاص کړی"}
          </button>
          <button
            onClick={() => setOpen(true)}
            className="rounded-2xl px-5 py-3 text-sm font-bold text-amber-100 shadow-lg transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--admin-theme-main, #0f3d2e), var(--admin-theme-light, #14533f))" }}
          >
            ➕ نوی کتاب اپلوډ کړی
          </button>
          <button
            onClick={handleLogout}
            className="rounded-2xl bg-gray-200 px-4 py-3 text-sm font-bold text-gray-700 shadow-md hover:bg-gray-300 transition-all"
          >
            وتل 🚪
          </button>
        </div>
      </div>

      <div className="mb-6 inline-flex flex-wrap gap-1 rounded-2xl border border-amber-900/15 bg-white/60 p-1 shadow-sm">
        <button
          onClick={() => setView("workbench")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "workbench" ? "tab-active bg-emerald-800 text-amber-100" : "text-emerald-900 hover:bg-amber-50"
          }`}
          style={view === "workbench" ? { background: "var(--admin-theme-main)" } : {}}
        >
          🎯 يو کتاب (پړاو ۱)
        </button>
        <button
          onClick={() => setView("all")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "all" ? "tab-active bg-emerald-800 text-amber-100" : "text-emerald-900 hover:bg-amber-50"
          }`}
          style={view === "all" ? { background: "var(--admin-theme-main)" } : {}}
        >
          📚 قطار او پروسس
        </button>
        <button
          onClick={() => setView("library")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "library" ? "tab-active bg-emerald-800 text-amber-100" : "text-emerald-900 hover:bg-amber-50"
          }`}
          style={view === "library" ? { background: "var(--admin-theme-main)" } : {}}
        >
          📚 کتابتون او المارۍ
        </button>
        <button
          onClick={() => setView("architecture")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "architecture" ? "tab-active bg-emerald-800 text-amber-100" : "text-emerald-900 hover:bg-amber-50"
          }`}
          style={view === "architecture" ? { background: "var(--admin-theme-main)" } : {}}
        >
          🏛️ معماري
        </button>
        <button
          onClick={() => setView("evaluation")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "evaluation" ? "tab-active bg-emerald-800 text-amber-100" : "text-emerald-900 hover:bg-amber-50"
          }`}
          style={view === "evaluation" ? { background: "var(--admin-theme-main)" } : {}}
        >
          ⚖️ ازموينه
        </button>
        <button
          onClick={() => setView("roadmap")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "roadmap" ? "tab-active bg-emerald-800 text-amber-100" : "text-emerald-900 hover:bg-amber-50"
          }`}
          style={view === "roadmap" ? { background: "var(--admin-theme-main)" } : {}}
        >
          🗺️ د ۷ پړاوونو نقشه
        </button>
        <button
          onClick={() => setView("ai_rules")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "ai_rules" ? "tab-active bg-emerald-800 text-amber-100" : "text-emerald-900 hover:bg-amber-50"
          }`}
          style={view === "ai_rules" ? { background: "var(--admin-theme-main)" } : {}}
        >
          🧠 د اې آی مغز
        </button>
        <button
          onClick={() => setView("settings")}
          className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
            view === "settings" ? "tab-active bg-emerald-800 text-amber-100" : "text-emerald-900 hover:bg-amber-50"
          }`}
          style={view === "settings" ? { background: "var(--admin-theme-main)" } : {}}
        >
          ⚙️ د سايټ تنظيمات
        </button>
      </div>

      {view === "workbench" && <SingleBookWorkbench books={books} onOpenUpload={() => setOpen(true)} />}
      {view === "all" && <AllBooksView stats={stats} books={books} />}
      {view === "library" && <LibraryView books={books} refresh={refresh} />}
      {view === "architecture" && <Architecture />}
      {view === "evaluation" && <Evaluation />}
      {view === "roadmap" && <Roadmap />}
      {view === "ai_rules" && <AiRulesView />}
      {view === "settings" && <SettingsView />}
    </div>
  );
}

function AllBooksView({ stats, books }: { stats: Stats; books: BookStatus[] }) {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-3 gap-4">
        {[
          { v: "۱", l: "اول يو کتاب" },
          { v: "DB", l: "online ډيټابېس" },
          { v: "۹", l: "د حوالې ساحې" },
        ].map((s) => (
          <div key={s.l} className="rounded-2xl border border-amber-900/15 bg-white/70 p-4 text-center shadow-sm">
            <div className="text-2xl font-extrabold text-emerald-900">{s.v}</div>
            <div className="text-xs font-semibold text-amber-900/80">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="ټولي ټوټي" value={Number(stats.totalChunks).toLocaleString("ar")} sub={`${stats.totalBooks} کتابونه`} icon="🧩" tone="amber" />
        <StatCard label="ويکټور سوي" value={Number(stats.embeddedChunks).toLocaleString("ar")} sub={`${((stats.embeddedChunks / Math.max(stats.totalChunks, 1)) * 100).toFixed(1)}٪ بشپړ سوی`} icon="✅" tone="green" />
        <StatCard label="په قطار / پاته" value={Number(stats.queuedChunks).toLocaleString("ar")} sub={`د هري ثانيي ${stats.rateLimit} غوښتني`} icon="⏳" tone="orange" />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard title="د Worker حالت" main={<span className="flex items-center gap-2"><span className="pulse-dot h-2.5 w-2.5 rounded-full bg-green-500" />{stats.workerStatus}</span>} sub={`وروستی ويکټور: ${stats.lastEmbeddedAt}`} />
        <InfoCard title="د Rate Limit" main={`په ثانيه کي ${stats.rateLimit} غوښتني`} sub="د Gemini د ۴۲۹ خطا د مخنيوي لپاره" />
        <InfoCard title="د Backoff تګلاره" main={stats.backoffStrategy} sub="په هره ناکامي کي ځنډ دوه برابره کيږي" small />
      </div>

      <div className="rounded-3xl border border-amber-900/15 bg-white/40 p-6">
        <div className="mb-4 flex items-center justify-between text-sm text-amber-900/80">
          <span className="text-lg font-bold text-[#0f3d2e]">د حقيقي RAG جريان</span>
          <span className="rounded-full bg-emerald-900 px-3 py-1 text-[11px] font-bold text-amber-200">server-side</span>
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
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-900 text-sm font-bold text-amber-200">{n}</span>
              <div>
                <div className="font-bold text-emerald-900">{t}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-amber-900/80">{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="fatwa-card rounded-2xl">
        <div className="flex items-center justify-between border-b border-amber-900/15 px-6 py-4">
          <h3 className="text-lg font-bold text-emerald-900">د کتابونو د پروسس حالت</h3>
          <span className="text-xs text-amber-900/70">{isLiveBackend ? "🟢 د حقيقي API سره وصل" : "🔴 API نه دی تړل سوی"}</span>
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
                    <td className="max-w-xs px-6 py-4 font-bold text-emerald-950">{b.title}</td>
                    <td className="px-6 py-4 text-amber-900/80">{b.author}</td>
                    <td className="px-6 py-4 mono text-emerald-900">{b.totalChunks.toLocaleString("ar")}</td>
                    <td className="px-6 py-4 mono text-green-700">{b.embeddedChunks.toLocaleString("ar")}</td>
                    <td className="px-6 py-4 mono text-orange-700">{b.queuedChunks.toLocaleString("ar")}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-24 overflow-hidden rounded-full bg-amber-100">
                          <div className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-700 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-bold text-emerald-900">{pct.toFixed(0)}٪</span>
                      </div>
                    </td>
                    <td className="px-6 py-4"><StatusBadge status={b.status} /></td>
                  </tr>
                );
              })}
              {books.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-amber-900/70">لا تر اوسه کدام کتاب نه دی اپلوډ سوی.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function LibraryView({ books, refresh }: { books: BookStatus[], refresh: () => void }) {
  const [categories, setCategories] = useState<any[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<number>(0);

  useEffect(() => { loadCategories(); }, []);

  async function loadCategories() {
    try {
      const data = await fetchCategories();
      if (data) setCategories(data);
    } catch (e) { console.error("خطا", e); }
  }

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const pId = parentId ? parseInt(parentId, 10) : null;
      await addCategory(newCategory, pId, sortOrder);
      setNewCategory(""); setParentId(""); setSortOrder(0);
      loadCategories();
    } catch (e) { alert("د المارۍ په ثبتولو کي ستونزه پېښه سوه."); }
  };

  const handleDeleteBook = async (id: string) => {
    if (!confirm("آيا واقعاً غواړی چي دا کتاب د تل لپاره ړنګ کړی؟")) return;
    try {
      await deleteBook(id);
      refresh();
    } catch (e) { alert("د کتاب په ړنګولو کي ستونزه پېښه سوه."); }
  };

  return (
    <div className="space-y-6">
      <div className="fatwa-card rounded-2xl p-8">
        <h3 className="mb-6 text-2xl font-bold" style={{ color: "var(--admin-theme-main, #0f3d2e)" }}>📚 د کتابتون، فنونو او مذهبونو اداره</h3>
        <div className="mb-8 rounded-2xl border border-emerald-900/20 bg-emerald-50/50 p-5">
          <label className="mb-2 block text-sm font-bold text-emerald-900">نوی فن (المارۍ يا فرعي فولډر) جوړول:</label>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="p-3 rounded-xl border border-emerald-900/20 bg-white" placeholder="د فولډر نوم (مثلاً: فقه حنفي)" />
            <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="p-3 rounded-xl border border-emerald-900/20 bg-white text-sm">
              <option value="">📁 اصلي کټګوري (بې پلار)</option>
              {categories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>تر دغه لاندي راسي: {c.name}</option>)}
            </select>
            <input type="number" value={sortOrder} onChange={(e) => setSortOrder(parseInt(e.target.value, 10) || 0)} className="p-3 rounded-xl border border-emerald-900/20 bg-white" placeholder="د ترتيب نمبر (مثلاً: 1)" />
            <button onClick={handleAddCategory} className="bg-emerald-700 text-amber-100 px-6 py-3 rounded-xl font-bold shadow-md hover:bg-emerald-800 transition-all">فولډر جوړول</button>
          </div>
        </div>

        <div className="space-y-8">
          {categories.filter(c => !c.parent_id).map((mainCat) => {
            const mainCatBooks = books.filter((b: any) => b.category === mainCat.name);
            const subCats = categories.filter(c => c.parent_id === mainCat.id);
            return (
              <div key={mainCat.id} className="border border-amber-900/10 p-6 rounded-3xl bg-white shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-2xl font-bold text-emerald-900">📁 {mainCat.name}</h3>
                  <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-md font-bold">ترتيب: {mainCat.sort_order}</span>
                </div>
                {mainCatBooks.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {mainCatBooks.map(book => (
                      <div key={book.id} className="flex flex-col p-4 bg-emerald-50/30 border border-emerald-900/5 rounded-2xl transition hover:shadow-md">
                        <span className="font-bold text-emerald-900 text-lg mb-1">{book.title}</span>
                        <span className="text-sm text-amber-900/80 mb-4">{book.author}</span>
                        <div className="mt-auto flex gap-2">
                          <button onClick={() => handlePrintPDF({ answer: "کتاب..." }, book.title)} className="flex-1 text-xs bg-amber-100 text-amber-900 px-3 py-2 rounded-lg font-bold">چاپ</button>
                          <button onClick={() => handleDeleteBook(book.id)} className="flex-1 text-xs bg-red-100 text-red-900 px-3 py-2 rounded-lg font-bold">ړنګول</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {subCats.length > 0 && (
                  <div className="mr-6 pr-4 border-r-2 border-emerald-800/20 space-y-6">
                    {subCats.map((subCat) => {
                      const subCatBooks = books.filter((b: any) => b.category === subCat.name);
                      return (
                        <div key={subCat.id} className="bg-amber-50/20 p-4 rounded-2xl border border-amber-900/5">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-bold text-amber-900">📂 {subCat.name}</h4>
                            <span className="text-xs text-amber-700/70">ترتيب: {subCat.sort_order}</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {subCatBooks.map(book => (
                              <div key={book.id} className="flex flex-col p-4 bg-white border border-emerald-900/10 rounded-xl transition hover:shadow-sm">
                                <span className="font-bold text-emerald-900 text-base mb-1">{book.title}</span>
                                <span className="text-xs text-amber-900/70 mb-3">{book.author}</span>
                                <div className="mt-auto flex gap-2">
                                  <button onClick={() => handlePrintPDF({ answer: "کتاب..." }, book.title)} className="flex-1 text-[11px] bg-amber-100 text-amber-900 py-1.5 rounded-md font-bold">چاپ</button>
                                  <button onClick={() => handleDeleteBook(book.id)} className="flex-1 text-[11px] bg-red-100 text-red-900 py-1.5 rounded-md font-bold">ړنګول</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AiRulesView() {
  const [rules, setRules] = useState<AiRule[]>([]);
  const [newRule, setNewRule] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchRules = async () => {
    try { setLoading(true); const data = await getAiRules(); setRules(data); } catch (e) { console.error("خطا:", e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleAddRule = async () => {
    if (!newRule.trim()) return;
    setSubmitting(true);
    try { await addAiRule(newRule); setNewRule(""); await fetchRules(); } catch (e) { alert("د قانون په ثبتولو کي ستونزه پېښه سوه."); } finally { setSubmitting(false); }
  };

  const handleToggle = async (id: string, currentStatus: boolean) => {
    try { await updateAiRule(id, !currentStatus); await fetchRules(); } catch (e) { alert("د قانون په بدلولو کي ستونزه پېښه سوه."); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آيا غواړی چي دا قانون د تل لپاره ړنګ کړی؟")) return;
    try { await deleteAiRule(id); await fetchRules(); } catch (e) { alert("د قانون په ړنګولو کي ستونزه پېښه سوه."); }
  };

  return (
    <div className="space-y-6">
      <div className="fatwa-card rounded-2xl p-8">
        <h3 className="mb-2 text-2xl font-bold" style={{ color: "var(--admin-theme-main, #0f3d2e)" }}>🧠 د مصنوعي ځيرکتيا (AI) مغز او لارښووني</h3>
        <p className="mb-8 text-sm text-amber-900/80">دلته هغه اصول وليکی چي جيمينای يې بايد د فتوا پر مهال د الهي قانون په څېر په کلکه مراعات کړي.</p>
        <div className="mb-8 rounded-2xl border border-emerald-900/20 bg-emerald-50/50 p-5">
          <label className="mb-2 block text-sm font-bold text-emerald-900">نوی قانون ور زيات کړی:</label>
          <div className="flex flex-col gap-3 md:flex-row">
            <textarea value={newRule} onChange={(e) => setNewRule(e.target.value)} placeholder="د بېلګي په توګه: ځواب بايد په سوچه کندهارۍ پښتو وي..." rows={2} className="flex-1 resize-none rounded-xl border border-emerald-900/20 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-emerald-700" dir="rtl" />
            <button onClick={handleAddRule} disabled={submitting || !newRule.trim()} className="rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white shadow-md transition-all hover:bg-emerald-800 disabled:opacity-50">{submitting ? "ثبتيږي..." : "➕ ور زيات يې کړی"}</button>
          </div>
        </div>
        <div>
          <h4 className="mb-4 text-lg font-bold text-emerald-900">موجوده فعال او غير فعال قوانين:</h4>
          {loading ? ( <div className="text-sm text-emerald-700">قوانين راټوليږي...</div> ) : rules.length === 0 ? ( <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">تر اوسه کدام قانون نه دی ثبت سوی.</div> ) : (
            <div className="space-y-3">
              {rules.map((rule, index) => (
                <div key={rule.id} className={`flex flex-col justify-between gap-4 rounded-xl border p-4 shadow-sm transition-all md:flex-row md:items-center ${rule.is_active ? 'border-emerald-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-75'}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">{index + 1}</span>
                      <span className={`text-xs font-bold ${rule.is_active ? 'text-emerald-600' : 'text-gray-500'}`}>{rule.is_active ? 'فعال قانون' : 'غير فعال (بند)'}</span>
                    </div>
                    <p className={`text-sm leading-relaxed ${rule.is_active ? 'text-gray-900 font-medium' : 'text-gray-500 line-through'}`}>{rule.rule_text}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 border-t border-gray-100 pt-3 md:border-0 md:pt-0">
                    <button onClick={() => handleToggle(rule.id, rule.is_active)} className="rounded-lg px-4 py-2 text-xs font-bold bg-emerald-100 text-emerald-800">{rule.is_active ? 'بند يې کړی' : 'فعال يې کړی'}</button>
                    <button onClick={() => handleDelete(rule.id)} className="rounded-lg bg-red-50 p-2 text-red-600">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ⚙️ د سایټ تنظیمات — د ډېټابېس له لارې په پوره کمال او ژوندي بڼه متحرک سوی
// ============================================================
function SettingsView() {
  const bodyFonts = [
    { name: "زرين (Zareen)", value: '"Zareen", "Noto Naskh Arabic", sans-serif' },
    { name: "مرزا (Mirza)", value: '"Mirza", "Noto Naskh Arabic", sans-serif' },
    { name: "باهيج (Bahij)", value: '"Bahij", "Cairo", sans-serif' },
    { name: "کابل (Kabul)", value: '"Kabul", "Scheherazade New", serif' },
    { name: "عصري (Cairo)", value: '"Cairo", "Noto Naskh Arabic", sans-serif' },
    { name: "رسمي (Amiri)", value: '"Amiri", "Scheherazade New", serif' },
    { name: "کلاسيک (Scheherazade)", value: '"Scheherazade New", serif' },
    { name: "نوټو (Noto Naskh)", value: '"Noto Naskh Arabic", sans-serif' },
    { name: "تجاول (Tajawal)", value: '"Tajawal", sans-serif' },
    { name: "المراعي (Almarai)", value: '"Almarai", sans-serif' },
    { name: "چنګا (Changa)", value: '"Changa", sans-serif' },
    { name: "مرکزي (Markazi)", value: '"Markazi Text", serif' },
    { name: "المسيري (El Messiri)", value: '"El Messiri", sans-serif' },
    { name: "لطيف (Lateef)", value: '"Lateef", serif' },
    { name: "کوفام (Kufam)", value: '"Kufam", sans-serif' },
    { name: "ريم کوفي (Reem Kufi)", value: '"Reem Kufi", sans-serif' },
    { name: "عارف رقعة (Aref Ruqaa)", value: '"Aref Ruqaa", serif' },
    { name: "وزير (Vazir)", value: '"Vazirmatn", sans-serif' },
    { name: "رقاص (Rakkas)", value: '"Rakkas", cursive' },
    { name: "کتيبه (Katibeh)", value: '"Katibeh", cursive' },
  ];

  const headingFonts = [
    { name: "امير (Amir Bold)", value: '"Amir Bold", "Amiri", serif' },
    { name: "لاله‌زار (Lalezar)", value: '"Lalezar", cursive' },
    { name: "قاهره تور (Cairo Black)", value: '"Cairo Black", "Cairo", sans-serif' },
    { name: "اميري بولډ (Amiri Bold)", value: '"Amiri Bold", "Amiri", serif' },
    { name: "نوټو بولډ (Noto ExtraBold)", value: '"Noto Naskh Arabic ExtraBold", sans-serif' },
    { name: "ريم کوفي (Reem Kufi)", value: '"Reem Kufi", sans-serif' },
    { name: "عارف رقعة (Aref Ruqaa)", value: '"Aref Ruqaa", serif' },
    { name: "کوفام (Kufam)", value: '"Kufam", sans-serif' },
    { name: "المسيري (El Messiri)", value: '"El Messiri", sans-serif' },
    { name: "چنګا (Changa)", value: '"Changa", sans-serif' },
    { name: "المراعي (Almarai)", value: '"Almarai", sans-serif' },
    { name: "رقعة (Ruqaa)", value: '"Aref Ruqaa", serif' },
  ];

  const themes = [
    { name: "زمردي شين", main: "#0f3d2e", light: "#14533f" },
    { name: "شين", main: "#15803d", light: "#166534" },
    { name: "شين آبي", main: "#0f766e", light: "#115e59" },
    { name: "اسماني", main: "#0e7490", light: "#155e75" },
    { name: "آبي", main: "#1d4ed8", light: "#1e40af" },
    { name: "شين بحري", main: "#1e3a8a", light: "#172554" },
    { name: "انډيګو", main: "#4338ca", light: "#3730a3" },
    { name: "بنفش", main: "#6d28d9", light: "#5b21b6" },
    { name: "ارغواني", main: "#7e22ce", light: "#6b21a8" },
    { name: "تېز ګلابي", main: "#a21caf", light: "#86198f" },
    { name: "ګلابي", main: "#be185d", light: "#9d174d" },
    { name: "سره ګلابي", main: "#e11d48", light: "#be123c" },
    { name: "سور", main: "#b91c1c", light: "#991b1b" },
    { name: "نارنجي", main: "#c2410c", light: "#9a3412" },
    { name: "تېز زېړ", main: "#d97706", light: "#b45309" },
    { name: "سرو زرو", main: "#b08742", light: "#8a6a32" },
    { name: "خړ", main: "#334155", light: "#1e293b" },
    { name: "تور", main: "#111111", light: "#222222" },
    { name: "قهوه يي", main: "#4a2c0f", light: "#381e08" },
    { name: "شاهي سور", main: "#831843", light: "#500724" },
  ];

  // 🔒 په ډېټابېس کي د ډيفالټونو ژوندی حالت
  const [dbSettings, setDbSettings] = useState<any>(null);

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE || "";
    fetch(`${baseUrl}/api/global-settings`)
      .then(res => res.json())
      .then(data => {
        if (data) setDbSettings(data);
      })
      .catch(e => console.error("ډېټابېس څخه د تنظيماتو د راوړلو پر مهال خطا پېښه سوه:", e));
  }, []);

  // 🔒 ډېټابېس ته د نوي امر د قفل کولو نوي ځواکمن تابع
  const saveToDb = async (updatedFields: any) => {
    try {
      const baseUrl = import.meta.env.VITE_API_BASE || "";
      await fetch(`${baseUrl}/api/global-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": localStorage.getItem("mufti_token") || ""
        },
        body: JSON.stringify(updatedFields)
      });
    } catch (e) {
      console.error("ډېټابېس ته د معلوماتو لېږلو پر مهال خطا پېښه سوه:", e);
    }
  };

  const handleMuftiBodyFont = async (val: string) => {
    document.documentElement.style.setProperty("--site-font", val);
    localStorage.setItem("mufti_font", val);
    await saveToDb({ default_site_font: val });
    setDbSettings((prev: any) => ({ ...prev, default_site_font: val }));
  };

  const handleMuftiHeadingFont = async (val: string) => {
    document.documentElement.style.setProperty("--heading-font", val);
    localStorage.setItem("mufti_heading_font", val);
    await saveToDb({ default_heading_font: val });
    setDbSettings((prev: any) => ({ ...prev, default_heading_font: val }));
  };

  const handleMuftiTheme = async (main: string, light: string) => {
    document.documentElement.style.setProperty("--theme-main", main);
    document.documentElement.style.setProperty("--theme-light", light);
    localStorage.setItem("mufti_theme_main", main);
    localStorage.setItem("mufti_theme_light", light);
    await saveToDb({ theme_main: main, theme_light: light });
    setDbSettings((prev: any) => ({ ...prev, theme_main: main, theme_light: light }));
  };

  const handleAdminFont = (val: string) => {
    document.documentElement.style.setProperty("--admin-font", val);
    localStorage.setItem("admin_font", val);
  };

  const handleAdminTheme = (main: string, light: string) => {
    document.documentElement.style.setProperty("--admin-theme-main", main);
    document.documentElement.style.setProperty("--admin-theme-light", light);
    localStorage.setItem("admin_theme_main", main);
    localStorage.setItem("admin_theme_light", light);
  };

  const handleDeepColorChange = (key: string, cssVar: string, color: string) => {
    document.documentElement.style.setProperty(cssVar, color);
    localStorage.setItem(key, color);
  };

  return (
    <div className="space-y-10">
      
      {/* د مفتي خانې د عامه پاڼې پوره واکونه */}
      <div className="fatwa-card rounded-2xl p-8 border border-emerald-950/10 bg-white">
        <h3 className="mb-2 text-2xl font-bold text-emerald-900">🕌 د مفتي خانې عمومي بڼه او ډيفالټ خطونه</h3>
        <p className="mb-6 text-xs text-amber-900/70">له دغه ځایه چي هره کلمه وټاکل سي، په ډېټابېس کي ثبتیږي او د نندارې په خونه کي د عامو خلګو د ډيفالټ په توګه تنظيميږي.</p>
        
        <div className="mb-6">
          <label className="mb-3 block text-sm font-bold text-amber-900">۱. د مفتي خانې د عام متن خط (Body Font) — (۲۰ واړه واکونه):</label>
          <div className="flex flex-wrap gap-2">
            {bodyFonts.map(f => {
              const isSelected = dbSettings?.default_site_font === f.value;
              return (
                <button 
                  key={f.name} 
                  onClick={() => handleMuftiBodyFont(f.value)} 
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all hover:bg-amber-100 ${
                    isSelected ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20' : 'border-amber-900/10 bg-amber-50/40'
                  }`} 
                  style={{ fontFamily: f.value }}
                >
                  {f.name} {isSelected && "🎯"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-3 block text-sm font-bold text-amber-900">۲. د مفتي خانې د لوړو عنوانونو خط (Heading Font) — (۱۲ واړه واکونه):</label>
          <div className="flex flex-wrap gap-2">
            {headingFonts.map(f => {
              const isSelected = dbSettings?.default_heading_font === f.value;
              return (
                <button 
                  key={f.name} 
                  onClick={() => handleMuftiHeadingFont(f.value)} 
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition-all hover:bg-amber-100 ${
                    isSelected ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-600/20' : 'border-amber-900/10 bg-amber-50/40'
                  }`} 
                  style={{ fontFamily: f.value }}
                >
                  {f.name} {isSelected && "🎯"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">
          <label className="mb-4 block text-sm font-bold text-amber-900">۳. د مفتي خانې اصلي رنګونه (۲۰ بډایه رنګونه):</label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {themes.map(t => {
              const isSelected = dbSettings?.theme_main === t.main;
              return (
                <button 
                  key={t.name} 
                  onClick={() => handleMuftiTheme(t.main, t.light)} 
                  className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-center transition-all hover:scale-105 ${
                    isSelected ? 'border-emerald-600 bg-emerald-50/30 ring-2 ring-emerald-600/20' : 'border-amber-900/10 bg-amber-50/10'
                  }`}
                >
                  <div className="h-8 w-8 rounded-full shadow-inner" style={{ background: `linear-gradient(135deg, ${t.main}, ${t.light})` }} />
                  <span className="text-[11px] font-bold text-amber-950">{t.name} {isSelected && "🎯"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* د ديوال او فرش د رنګونو پوره کنټرول بکس */}
        <div className="border-t border-amber-900/10 pt-6">
          <h4 className="mb-4 text-base font-bold text-emerald-950">🏡 د ديوال، فرش، فقهي بکسونو او بټنونو تفصيلي رنګونه:</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            
            <div className="rounded-xl border border-amber-900/10 bg-amber-50/10 p-4 text-center">
              <span className="mb-2 block text-xs font-bold text-amber-900">د ديوال رنګ (Wall BG)</span>
              <input type="color" className="h-10 w-full cursor-pointer rounded-lg border-0 bg-transparent" onChange={(e) => handleDeepColorChange("mufti_bg_wall", "--mufti-bg-wall", e.target.value)} />
            </div>

            <div className="rounded-xl border border-amber-900/10 bg-amber-50/10 p-4 text-center">
              <span className="mb-2 block text-xs font-bold text-amber-900">د فرش رنګ (Floor BG)</span>
              <input type="color" className="h-10 w-full cursor-pointer rounded-lg border-0 bg-transparent" onChange={(e) => handleDeepColorChange("mufti_bg_floor", "--mufti-bg-floor", e.target.value)} />
            </div>

            <div className="rounded-xl border border-amber-900/10 bg-amber-50/10 p-4 text-center">
              <span className="mb-2 block text-xs font-bold text-amber-900">د فقهي بکسونو رنګ</span>
              <input type="color" className="h-10 w-full cursor-pointer rounded-lg border-0 bg-transparent" onChange={(e) => handleDeepColorChange("mufti_bg_box", "--mufti-bg-box", e.target.value)} />
            </div>

            <div className="rounded-xl border border-amber-900/10 bg-amber-50/10 p-4 text-center">
              <span className="mb-2 block text-xs font-bold text-amber-900">د بټنونو پوره ځلا</span>
              <input type="color" className="h-10 w-full cursor-pointer rounded-lg border-0 bg-transparent" onChange={(e) => handleDeepColorChange("mufti_bg_btn", "--mufti-bg-btn", e.target.value)} />
            </div>

          </div>
        </div>
      </div>

      {/* د اډمن پينل د خپل مېز خپلواکه بڼه */}
      <div className="fatwa-card rounded-2xl p-8 border border-amber-950/10 bg-amber-50/10">
        <h3 className="mb-2 text-2xl font-bold text-emerald-950">⚙️ د اډمن پينل د خپل مېز مستقل سټايلونه</h3>
        <p className="mb-6 text-xs text-amber-900/70">له دغه ځایه يوه کلمه هم پر عامه ننداره اغېزه ne کوي، يوازي ستا د اډمن پينل مېز په کمال باسي.</p>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold text-amber-900">د اډمن پينل خط (Admin Font):</label>
            <div className="flex flex-wrap gap-2">
              {bodyFonts.slice(4, 7).map(f => (
                <button key={f.name} onClick={() => handleAdminFont(f.value)} className="rounded-lg border border-amber-900/10 bg-white px-3 py-1.5 text-xs font-bold hover:bg-amber-50">
                  {f.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-amber-900">د اډمن پينل د رنګونو تېزوالی:</label>
            <div className="flex gap-2">
              {themes.slice(0, 4).map(t => (
                <button key={t.name} onClick={() => handleAdminTheme(t.main, t.light)} className="h-7 w-7 rounded-full border border-white shadow-sm" style={{ background: t.main }} title={t.name} />
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

function StatCard({ label, value, sub, icon, tone }: { label: string; value: string; sub?: string; icon: string; tone: "emerald" | "amber" | "green" | "orange" }) {
  const toneMap = {
    emerald: "from-emerald-50 to-emerald-100/40 text-emerald-900 border-emerald-700/20",
    amber: "from-amber-50 to-amber-100/40 text-amber-900 border-amber-700/20",
    green: "from-green-50 to-green-100/40 text-green-900 border-green-700/20",
    orange: "from-orange-50 to-orange-100/40 text-orange-900 border-orange-700/20",
  };
  return (
    <div className={`rounded-2xl border bg-gradient-to-br p-5 shadow-sm ${toneMap[tone]}`}>
      <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</span><span className="text-2xl">{icon}</span></div>
      <div className="text-3xl font-extrabold">{value}</div>
      {sub && <div className="mt-1 text-xs opacity-70">{sub}</div>}
    </div>
  );
}

function InfoCard({ title, main, sub, small }: { title: string; main: React.ReactNode; sub?: string; small?: boolean }) {
  return (
    <div className="fatwa-card rounded-2xl p-5">
      <div className="mb-1 text-xs font-bold text-amber-700">
        {title}
      </div>
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
    failed: { label: "ناکام سوی", cls: "bg-red-100 text-red-800 ring-red-300" },
  };
  const s = map[status] || map.queued;
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${s.cls}`}>{s.label}</span>;
}
