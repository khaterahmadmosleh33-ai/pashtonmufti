// د مفتي خونه — د کاروونکي او اې آی مفتي ترمينځ د خبرو اترو انټرفيس، د سايټ ښکلا، شخصي حريم او متحرکو کياستي پوښتنو نسخه.

import { useEffect, useRef, useState } from "react";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { askMufti, isLiveBackend } from "../lib/api";
import type { Fatwa } from "../types";
import FatwaCard from "./FatwaCard";
import Hero from "./Hero";

type HistoryItem = {
  id: string;
  question: string; 
  fatwa: Fatwa & { model?: string; latency_ms?: number };
  at: number;
};

// د لومړي ځل فرعي پوښتنې (کله چي لا هيڅ پوښتنه نه وي سوې)
const initialSuggestedQuestions = [
  "د اوبو د نه موندلو په صورت کي د تيمم حکم څه دی؟",
  "د جمعې لمانځه شرطونه کوم دي؟",
  "په زکات کي د نصاب اندازه څونه ده？",
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
  
  // د هر کاروونکي لپاره د پوښتنو تر بکس لاندي د ۵ متحرکو مسايلو حالت
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>(initialSuggestedQuestions);
  const askBoxRef = useRef<HTMLDivElement>(null);

  // 🔒 لومړی لوډ: د تاريخچې تر څنګ، وروستۍ اړونده پوښتني هم د موبايل له دایمي حافظې څخه را لولي چي غيب نه سي
  useEffect(() => {
    try {
      const savedLocalData = localStorage.getItem("my_fatwa_history");
      if (savedLocalData) {
        setHistory(JSON.parse(savedLocalData));
      }
      
      // ستا د خوښي موافق د نويو پوښتنو بېرته راوړل تر څو د پاڼي په اړولو غيب نه سي
      const savedSuggestions = localStorage.getItem("my_dynamic_suggestions");
      if (savedSuggestions) {
        setDynamicSuggestions(JSON.parse(savedSuggestions));
      }
    } catch (e) {
      console.error("Local history read error:", e);
    }
  }, []);

  // د ژوندي ټايپينګ هوښیار او روان ماشين
  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    setError(null);
    setLoading(true);
    setQuestion(q);
    
    try {
      // له بېک انډ څخه د ځواب او اړونده پوښتنو يو ځای راوړل
      const f = await askMufti(q);
      
      const newId = crypto.randomUUID();
      const fullAnswer = f.answer; // اصلي بشپړ ځواب
      
      // لومړی کارډ خالي جوړوو چي توري يو يو پکي مېشته سي
      setHistory((h) => [
        { id: newId, question: q, fatwa: { ...f, answer: "" }, at: Date.now() },
        ...h,
      ]);

      setTimeout(() => {
        document.getElementById("latest-fatwa")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      let index = 0;
      const speed = 1; // په يوه ځل څو توري وليکي
      
      const typingInterval = setInterval(() => {
        index += speed;
        const currentText = fullAnswer.slice(0, index);
        
        setHistory((h) => 
          h.map(item => item.id === newId ? { ...item, fatwa: { ...item.fatwa, answer: currentText } } : item)
        );

        if (index >= fullAnswer.length) {
          clearInterval(typingInterval);
          
          // 🔥 د اې آی د ځواب تر خلاصېدو وروسته چټکي پوښتني اتومات بدليږي او په حافظه کي د تل لپاره لاک کيږي
          if (f.suggestedQuestions && f.suggestedQuestions.length > 0) {
            setDynamicSuggestions(f.suggestedQuestions);
            try {
              localStorage.setItem("my_dynamic_suggestions", JSON.stringify(f.suggestedQuestions));
            } catch (err) {
              console.error("LocalStorage suggestions error:", err);
            }
          }

          // سيمه ييزه حافظه کي د شخصي حريم ساتل
          try {
            const finalItem: HistoryItem = { id: newId, question: q, fatwa: f, at: Date.now() };
            const currentLocal = JSON.parse(localStorage.getItem("my_fatwa_history") || "[]");
            const updatedLocal = [finalItem, ...currentLocal].slice(0, 25); // حد اعظمي ۲۵ دانې ساتي
            localStorage.setItem("my_fatwa_history", JSON.stringify(updatedLocal));
          } catch (storageErr) {
            console.error("LocalStorage write error:", storageErr);
          }
        }
      }, 35);

    } catch (e: any) {
      setError(e.message || "ستونزه راپيدا سوه");
    } finally {
      setLoading(false);
    }
  };

  const scrollToAsk = () => {
    askBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  // د خپل موبايل د شخصي تاريخچې او خوندي سوو پوښتنو پاکول
  const clearHistory = () => {
    if (confirm("د پردي ښکاره تاريخ پاکوی؟ اصلي سرور لاګ نه ړنګيږي.")) {
      setHistory([]);
      localStorage.removeItem("my_fatwa_history");
      localStorage.removeItem("my_dynamic_suggestions"); // 🔒 د متحرکو پوښتنو د حافظې پاکول
      setDynamicSuggestions(initialSuggestedQuestions); // بېرته اصلي حالت ته راګرځي
    }
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

  const escapePdfText = (value: string) => {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  };

  const waitForPdfRender = () => new Promise((resolve) => setTimeout(resolve, 180));

  const handlePrintPDF = async (fatwa: Fatwa, questionText: string) => {
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

    host.innerHTML = `<div id="fatwa-pdf-pages" dir="rtl" lang="ps" style="width: 794px; background: #ffffff; direction: rtl; margin: 0; padding: 0; box-sizing: border-box;"></div>`;
    document.body.appendChild(host);

    if (document.fonts?.ready) await document.fonts.ready;
    const pages = host.querySelector("#fatwa-pdf-pages") as HTMLDivElement;

    const A4_WIDTH = 794;
    const A4_HEIGHT = 1123;

    const createPage = () => {
      const page = document.createElement("div");
      page.style.width = `${A4_WIDTH}px`;
      page.style.height = `${A4_HEIGHT}px`;
      page.style.boxSizing = "border-box";
      page.style.padding = `50px 15px 50px 15px`;
      page.style.background = "#ffffff";
      page.style.color = "#111111";
      page.style.direction = "rtl";
      page.style.fontFamily = bodyFont;
      page.style.overflow = "hidden";

      const content = document.createElement("div");
      content.style.width = "100%";
      content.style.height = "100%";
      content.style.boxSizing = "border-box";
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
      title.style.color = themeColor;
      title.style.fontFamily = headingFont;
      title.style.fontSize = "29px";
      title.style.fontWeight = "900";
      title.style.lineHeight = "1.45";
      title.style.textAlign = "right";
      return title;
    };

    const makeParagraph = (isQ = false) => {
      const p = document.createElement("p");
      p.style.margin = "0";
      p.style.color = "#111111";
      p.style.direction = "rtl";
      p.style.textAlign = "right";
      p.style.fontFamily = bodyFont;
      p.style.fontSize = "22px";
      p.style.lineHeight = isQ ? "2.05" : "2.08";
      return p;
    };

    const appendTitle = (text: string) => {
      const title = makeTitle(text);
      currentContent.appendChild(title);
      if (isOverflowing()) { title.remove(); newPage(); currentContent.appendChild(title); }
    };

    const appendTextSmart = (rawText: string, isQ = false) => {
      const cleanText = String(rawText || "").replace(/\s+/g, " ").trim();
      if (!cleanText) return;
      const words = cleanText.split(" ");
      let p = makeParagraph(isQ);
      currentContent.appendChild(p);
      let currentText = "";

      for (const word of words) {
        const nextText = currentText ? `${currentText} ${word}` : word;
        p.innerHTML = nextText;
        if (isOverflowing()) {
          p.innerHTML = currentText;
          newPage();
          p = makeParagraph(isQ);
          p.innerHTML = word;
          currentContent.appendChild(p);
          currentText = word;
        } else {
          currentText = nextText;
        }
      }
    };

    appendTitle("پوښتنه");
    appendTextSmart(question, true);
    appendTitle("الجواب");
    answer.split(/\n+/).map(p => p.trim()).filter(Boolean).forEach(p => appendTextSmart(p, false));

    await waitForPdfRender();
    try {
      await (html2pdf() as any).set({
        filename: "Pashton-Mufti-Fatwa.pdf",
        margin: 0,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff", windowWidth: A4_WIDTH, width: A4_WIDTH },
        jsPDF: { unit: "px", format: [A4_WIDTH, A4_HEIGHT], orientation: "portrait", hotfixes: ["px_scaling"] },
      }).from(pages).save();
    } finally { host.remove(); }
  };
  
  return (
    <>
      <div>
        <Hero onAsk={scrollToAsk} />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        
        <div className="mb-8">
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

        <div ref={askBoxRef} className="fatwa-card rounded-3xl p-6 md:p-8">
          <div className="mb-3 flex items-center justify-between">
            <label className="text-sm font-bold text-emerald-900">ستاسي فقهي پوښتنه:</label>
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-xs font-bold text-amber-700 hover:text-amber-900">
                🗑️ د پردي تاريخ پاکول
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
              placeholder="د بېلګي په توګه: د روژي د نيت وخت کوم دی؟"
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

          {/* 📊 د کياستي او اړونده پوښتنو ننداره چي د براوزر په حافظه کي لاک سوې ده */}
          <div className="mt-5 flex flex-col gap-2">
            <span className="text-xs font-bold text-amber-900/70">چټکي او اړونده پوښتني:</span>
            <div className="flex flex-wrap gap-2">
              {dynamicSuggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => ask(q)}
                  className="rounded-full border border-amber-900/20 bg-amber-50/50 px-3 py-1.5 text-xs font-medium text-emerald-950 hover:bg-amber-100 transition-all text-right"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-900">
            ⚠️ {error}
          </div>
        )}

        {loading && (
          <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-900/15 bg-white/60 p-6" style={{ color: "var(--theme-main, #0f3d2e)" }}>
            <div className="text-sm font-bold">
              په معتبرو فقهي کتابونو کي لټون روان دی…
            </div>
          </div>
        )}

        {history.length > 0 && !loading && (
          <div className="mt-10 space-y-12">
            {history.map((h, i) => (
              <div 
                key={h.id} 
                id={i === 0 ? "latest-fatwa" : undefined} 
              >
                {i > 0 && (
                  <div className="ornament my-8 text-xs text-amber-700/60">
                    ✦ مخکنۍ پوښتنه ✦
                  </div>
                )}
                
                <FatwaCard fatwa={h.fatwa} meta={h.fatwa} />
                
                <div className="mt-4 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => handlePrintPDF(h.fatwa, h.question)}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold shadow-sm border border-amber-900/10 transition-all hover:bg-amber-50 hover:shadow-md"
                    style={{ color: "var(--theme-main, #0f3d2e)" }}
                  >
                    📄 يوازي دا فتوا PDF کښته کړی
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
