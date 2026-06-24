// د مفتي خونه — د کاروونکي او اې آی مفتي ترمنځ د خبرو اترو انټرفيس، د سايټ ښکلا او ډانلوډ.

import { useEffect, useRef, useState } from "react";
import { askMufti, getFatwaHistory, isLiveBackend } from "../lib/api";
import type { Fatwa } from "../types";
import FatwaCard from "./FatwaCard";
import Hero from "./Hero";

// د تاريخچې په ماډل کي مي د 'question' برخه ور زياته کړه تر څو هره فتوا خپله پوښتنه خوندي وساتي
type HistoryItem = {
  id: string;
  question: string; 
  fatwa: Fatwa & { model?: string; latency_ms?: number };
  at: number;
};

const suggestedQuestions = [
  "د اوبو د نه موندلو په صورت کي د تيمم حکم څه دی؟",
  "د جمعې لمانځه شرطونه کوم دي؟",
  "په زکات کي د نصاب اندازه څونه ده؟",
  "د مسافر د لمانځه قصر شرعي حد څه دی؟",
];

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

export default function FatwaRoom() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const askBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLiveBackend) return;
    getFatwaHistory(20)
      .then((items) => {
        setHistory(
          items.map((fatwa, i) => ({
            id: `server-${i}`,
            question: "فقهي پوښتنه", // د سرور زړو پوښتنو لپاره
            fatwa,
            at: Date.now() - i,
          }))
        );
      })
      .catch(() => {});
  }, []);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setError(null);
    setLoading(true);
    setQuestion(q);
    try {
      const f = await askMufti(q);
      setHistory((h) => [
        { id: crypto.randomUUID(), question: q, fatwa: f, at: Date.now() },
        ...h,
      ]);
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

  const applyFont = (variable: string, val: string, storageKey: string) => {
    document.documentElement.style.setProperty(variable, val);
    localStorage.setItem(storageKey, val);
  };

  const applyTheme = (main: string, light: string) => {
    document.documentElement.style.setProperty("--theme-main", main);
    document.documentElement.style.setProperty("--theme-light", light);
    localStorage.setItem("mufti_theme_main", main);
    localStorage.setItem("mufti_theme_light", light);
  };

  // تر ټولو قوي Word ايکسپورټ فنکشن (خوندي شوی او بې‌نقص)
  const exportToWord = (fatwa: Fatwa, qText: string) => {
    try {
      const safeAnswer = (fatwa.answer || "").replace(/\n/g, "<br/>");
      const safeRefs = (fatwa.references || []).map(r => 
        `<li style="margin-bottom: 8px;"><b>${r.book || ""}</b> (ټوک ${r.volume || ""}، مخ ${r.page || ""}): ${r.text || ""}</li>`
      ).join('');

      const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Pashton Mufti</title></head><body>`;
      const footer = "</body></html>";
      const content = `
        <div style="text-align: right; direction: rtl; font-family: 'Arial', sans-serif;">
          <h1 style="color: #0f3d2e; border-bottom: 2px solid #b08742; padding-bottom: 10px;">پښتون مفتي - فقهي ځواب</h1>
          <div style="background-color: #faf6ee; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <strong>پوښتنه:</strong><br/>${qText}
          </div>
          <div style="font-size: 16px; line-height: 2; margin-bottom: 30px;">
            <strong>الجواب حامداً ومصلياً:</strong><br/><br/>${safeAnswer}
          </div>
          <div style="margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 15px;">
            <strong>د حنفي فقهي مراجع:</strong>
            <ul>${safeRefs}</ul>
          </div>
        </div>
      `;
      const sourceHTML = header + content + footer;
      const blob = new Blob(['\ufeff', sourceHTML], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      
      const fileDownload = document.createElement("a");
      fileDownload.href = url;
      fileDownload.download = `Fatwa_${Date.now()}.doc`;
      document.body.appendChild(fileDownload);
      fileDownload.click();
      
      setTimeout(() => {
        document.body.removeChild(fileDownload);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (e) {
      console.error("Word Download Error: ", e);
      alert("د ورډ فايل په جوړولو کي تخنيکي ستونزه پېښه سوه.");
    }
  };

  // د PDF ايکسپورټ پټ آی‌فرېم (Hidden iFrame) ټيکنالوژي - د نړيوالو شرکتونو سټنډرډ
  const exportToPDF = (fatwa: Fatwa, qText: string) => {
    try {
      const safeAnswer = (fatwa.answer || "").replace(/\n/g, "<br/>");
      const safeRefs = (fatwa.references || []).map(r => 
        `<li style="margin-bottom: 10px;"><b>${r.book || ""}</b> (ټوک ${r.volume || ""}، مخ ${r.page || ""}): ${r.text || ""}</li>`
      ).join('');

      // د پرنټ لپاره يو پټ چوکاټ (iFrame) جوړوو
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) throw new Error("iFrame not supported");

      iframeDoc.open();
      iframeDoc.write(`
        <html dir="rtl">
          <head>
            <title>Fatwa_Print</title>
            <style>
              body { font-family: Tahoma, sans-serif; padding: 30px; color: #000; line-height: 2.2; direction: rtl; text-align: right; }
              h1 { color: #0f3d2e; border-bottom: 2px solid #b08742; padding-bottom: 10px; font-size: 24px; }
              .box { background-color: #faf6ee; padding: 20px; border-radius: 8px; margin-bottom: 25px; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <h1>پښتون مفتي - فقهي ځواب</h1>
            <div class="box"><strong>پوښتنه:</strong><br/>${qText}</div>
            <div class="box" style="background-color: #fff;"><strong>الجواب حامداً ومصلياً:</strong><br/><br/>${safeAnswer}</div>
            <div style="margin-top: 30px;">
              <strong>د حنفي فقهي مراجع:</strong>
              <ul style="padding-right: 20px;">${safeRefs}</ul>
            </div>
          </body>
        </html>
      `);
      iframeDoc.close();

      // انتظار باسو تر څو پټ چوکاټ اماده سي، بيا يې پرنټ کوو
      iframe.onload = () => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        
        // تر پرنټ وروسته پټ چوکاټ ړنګوو
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 3000);
      };
    } catch (e) {
      console.error("PDF Download Error: ", e);
      alert("د PDF په پرنټولو کي تخنيکي ستونزه پېښه سوه.");
    }
  };

  return (
    <>
      <div className="print:hidden">
        <Hero onAsk={scrollToAsk} />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        
        <div className="print:hidden mb-8">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold shadow-sm transition-all hover:shadow-md border border-amber-900/10"
            style={{ color: "var(--theme-main, #0f3d2e)" }}
          >
            🎨 {showSettings ? "تنظيمات پټ کړی" : "د پاڼي ښکلا او تنظيمات (فونټ او رنګ)"}
          </button>

          {showSettings && (
            <div className="mt-4 rounded-3xl border border-amber-900/20 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
              <div className="mb-6">
                <h4 className="mb-3 text-sm font-bold text-amber-900">۱. د عام متن فونټ وټاکی:</h4>
                <div className="flex flex-wrap gap-2">
                  {bodyFonts.map(f => (
                    <button key={f.name} onClick={() => applyFont("--site-font", f.value, "mufti_font")} className="rounded-xl border border-amber-900/10 bg-amber-50/50 px-3 py-2 text-xs font-bold transition-all hover:bg-amber-100" style={{ fontFamily: f.value, color: "var(--theme-main)" }}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <h4 className="mb-3 text-sm font-bold text-amber-900">۲. د عنوانونو فونټ وټاکی:</h4>
                <div className="flex flex-wrap gap-2">
                  {headingFonts.map(f => (
                    <button key={f.name} onClick={() => applyFont("--heading-font", f.value, "mufti_heading_font")} className="rounded-xl border border-amber-900/10 bg-amber-50/50 px-3 py-2 text-xs font-bold transition-all hover:bg-amber-100" style={{ fontFamily: f.value, color: "var(--theme-main)" }}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-3 text-sm font-bold text-amber-900">۳. د سايټ رنګ وټاکی:</h4>
                <div className="flex flex-wrap gap-2">
                  {themes.map(t => (
                    <button key={t.name} onClick={() => applyTheme(t.main, t.light)} className="h-8 w-8 rounded-full border border-white shadow-md transition-all hover:scale-110" style={{ background: `linear-gradient(135deg, ${t.main}, ${t.light})` }} title={t.name} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={askBoxRef} className="print:hidden fatwa-card rounded-3xl p-6 md:p-8">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-bold" style={{ color: "var(--theme-main, #0f3d2e)" }}>
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
              className="flex-1 resize-none rounded-2xl border border-amber-900/20 bg-white/80 px-4 py-3 text-base placeholder:text-amber-900/40 focus:outline-none focus:ring-2 focus:ring-amber-900/20"
              style={{ color: "var(--theme-main, #0f3d2e)" }}
              dir="rtl"
            />
            <button
              onClick={() => ask(question)}
              disabled={loading || !question.trim()}
              className="self-end rounded-2xl px-8 py-3 font-bold text-amber-100 shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--theme-main, #0f3d2e), var(--theme-light, #14533f))" }}
            >
              {loading ? "د لټون په حال کي…" : "پوښتنه وکړی"}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="text-xs font-bold text-amber-900/70">
              چټکي پوښتني:
            </span>
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                onClick={() => ask(q)}
                className="rounded-full border border-amber-900/20 bg-amber-50/50 px-3 py-1 text-xs transition-colors hover:bg-amber-100"
                style={{ color: "var(--theme-main, #0f3d2e)" }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="print:hidden mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="print:hidden mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-900/15 bg-white/60 p-6" style={{ color: "var(--theme-main, #0f3d2e)" }}>
            <div className="flex items-center gap-2">
              <span className="pulse-dot h-3 w-3 rounded-full" style={{ backgroundColor: "var(--theme-light, #14533f)" }} />
              <span className="pulse-dot h-3 w-3 rounded-full" style={{ backgroundColor: "var(--theme-light, #14533f)", animationDelay: "0.2s" }} />
              <span className="pulse-dot h-3 w-3 rounded-full" style={{ backgroundColor: "var(--theme-light, #14533f)", animationDelay: "0.4s" }} />
            </div>
            <div className="text-sm font-bold">
              په معتبرو فقهي کتابونو کي لټون روان دی…
            </div>
            <div className="text-xs text-amber-900/70">
              د ځواب په چمتو کولو کي لږ تم سی…
            </div>
          </div>
        )}

        {history.length > 0 && !loading && (
          <div className="mt-10 space-y-12">
            {history.map((h, i) => (
              <div key={h.id} id={i === 0 ? "latest-fatwa" : undefined} className="print:my-0 print:break-inside-avoid">
                {i > 0 && (
                  <div className="print:hidden ornament my-8 text-xs text-amber-700/60">
                    ✦ مخکنۍ پوښتنه ✦
                  </div>
                )}
                
                <FatwaCard fatwa={h.fatwa} meta={h.fatwa} />
                
                <div className="print:hidden mt-4 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => exportToPDF(h.fatwa, h.question)}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold shadow-sm border border-amber-900/10 transition-all hover:bg-amber-50 hover:shadow-md"
                    style={{ color: "var(--theme-main, #0f3d2e)" }}
                  >
                    📄 PDF کښته کړه
                  </button>
                  <button 
                    onClick={() => exportToWord(h.fatwa, h.question)}
                    className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:shadow-md"
                    style={{ background: "linear-gradient(135deg, var(--theme-main, #0f3d2e), var(--theme-light, #14533f))" }}
                  >
                    📝 Word کښته کړه
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
