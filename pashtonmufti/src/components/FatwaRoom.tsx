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
  "د جمعې لمانځه شرطونه کوم دي",
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

export default function FatwaRoom() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
  // د هر کاروونکي لپاره د پوښتنو تر بکس لاندي د ۵ متحرکو مسايلو حالت
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>(initialSuggestedQuestions);
  const askBoxRef = useRef<HTMLDivElement>(null);

  // 🔒 يوازي د دغې خوني د سټايلونو لپاره ځانګړي متغیرونه (Scope Isolated State)
  const [siteFont, setSiteFont] = useState('"Cairo", "Noto Naskh Arabic", sans-serif');
  const [headingFont, setHeadingFont] = useState('"Cairo Black", "Cairo", sans-serif');
  const [themeMain, setThemeMain] = useState("#0f3d2e");
  const [themeLight, setThemeLight] = useState("#14533f");
  const [wallBg, setWallBg] = useState("transparent");
  const [floorBg, setFloorBg] = useState("transparent");
  const [boxBg, setBoxBg] = useState("");
  const [btnBg, setBtnBg] = useState("");

  // 🔒 لومړی لوډ: د تاريخچې او اډمن رنګونو سره يو ځای د فونټونو خوندي راوړل
  useEffect(() => {
    try {
      const savedLocalData = localStorage.getItem("my_fatwa_history");
      if (savedLocalData) {
        setHistory(JSON.parse(savedLocalData));
      }
      
      const savedSuggestions = localStorage.getItem("my_dynamic_suggestions");
      if (savedSuggestions) {
        setDynamicSuggestions(JSON.parse(savedSuggestions));
      }

      // ۱. لومړی چک کول چي ایا دغه ځانګړي کاروونکي خپل د خوښي فونټ بدل کړی دی که نه
      const userFont = localStorage.getItem("mufti_user_font_override");
      const userHeadingFont = localStorage.getItem("mufti_user_heading_font_override");

      if (userFont) setSiteFont(userFont);
      if (userHeadingFont) setHeadingFont(userHeadingFont);

      // ۲. که کاروونکي پخپله خوښه فونټ نه وي بدل کړی، له ډېټابېس (اډمن ډيفالټونو) څخه غوښتنه کوو
      if (!userFont || !userHeadingFont) {
        fetch(`${import.meta.env.VITE_API_BASE || ''}/api/global-settings`)
          .then(res => res.json())
          .then(data => {
            if (data) {
              if (!userFont && data.default_site_font) setSiteFont(data.default_site_font);
              if (!userHeadingFont && data.default_heading_font) setHeadingFont(data.default_heading_font);
              if (data.theme_main) setThemeMain(data.theme_main);
              if (data.theme_light) setThemeLight(data.theme_light);
            }
          })
          .catch(e => console.error("ډېټابېس څخه د ډيفالټونو په لوډولو کي ستونزه پېښه سوه:", e));
      }

      // د نورو عمومي رنګونو او پس منظرونو راوړل
      const tm = localStorage.getItem("mufti_theme_main");
      const tl = localStorage.getItem("mufti_theme_light");
      if (tm) setThemeMain(tm);
      if (tl) setThemeLight(tl);

      const wBg = localStorage.getItem("mufti_bg_wall");
      const fBg = localStorage.getItem("mufti_bg_floor");
      const bBg = localStorage.getItem("mufti_bg_box");
      const btn = localStorage.getItem("mufti_bg_btn");

      if (wBg) setWallBg(wBg);
      if (fBg) setFloorBg(fBg);
      if (bBg) setBoxBg(bBg);
      if (btn) setBtnBg(btn);
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
      const f = await askMufti(q);
      const newId = crypto.randomUUID();
      const fullAnswer = f.answer; 
      
      setHistory((h) => [
        { id: newId, question: q, fatwa: { ...f, answer: "" }, at: Date.now() },
        ...h,
      ]);

      setTimeout(() => {
        document.getElementById("latest-fatwa")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);

      let index = 0;
      const speed = 1; 
      
      const typingInterval = setInterval(() => {
        index += speed;
        const currentText = fullAnswer.slice(0, index);
        
        setHistory((h) => 
          h.map(item => item.id === newId ? { ...item, fatwa: { ...item.fatwa, answer: currentText } } : item)
        );

        if (index >= fullAnswer.length) {
          clearInterval(typingInterval);
          
          if (f.suggestedQuestions && f.suggestedQuestions.length > 0) {
            setDynamicSuggestions(f.suggestedQuestions);
            try {
              localStorage.setItem("my_dynamic_suggestions", JSON.stringify(f.suggestedQuestions));
            } catch (err) {
              console.error("LocalStorage suggestions error:", err);
            }
          }

          try {
            const finalItem: HistoryItem = { id: newId, question: q, fatwa: f, at: Date.now() };
            const currentLocal = JSON.parse(localStorage.getItem("my_fatwa_history") || "[]");
            const updatedLocal = [finalItem, ...currentLocal].slice(0, 25); 
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

  const clearHistory = () => {
    if (confirm("د پردي ښکاره تاريخ پاکوی؟ اصلي سرور لاګ نه ړنګيږي.")) {
      setHistory([]);
      localStorage.removeItem("my_fatwa_history");
      localStorage.removeItem("my_dynamic_suggestions"); 
      setDynamicSuggestions(initialSuggestedQuestions); 
    }
  };

  // 🔒 د فونټ بدلولو نوې خپلواکه طريقه (يوازې د دغه مشخص کاروونکي په موبايل کي قفل کيږي)
  const applyFont = (variable: string, val: string, storageKey: string) => {
    if (variable === "--site-font") {
      setSiteFont(val);
      localStorage.setItem("mufti_user_font_override", val); // د کاروونکي انفرادي انتخاب
    } else if (variable === "--heading-font") {
      setHeadingFont(val);
      localStorage.setItem("mufti_user_heading_font_override", val); // د کاروونکي انفرادي انتخاب
    }
    localStorage.setItem(storageKey, val);
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
    const bodyF = siteFont || '"Noto Naskh Arabic", "Scheherazade New", "Amiri", serif';
    const headF = headingFont || bodyF;
    const tColor = themeMain || "#0f3d2e";

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
      page.style.fontFamily = bodyF;
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
      title.style.color = tColor;
      title.style.fontFamily = headF;
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
      p.style.fontFamily = bodyF;
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
    <div style={{ 
      '--site-font': siteFont, 
      '--heading-font': headingFont, 
      '--theme-main': themeMain, 
      '--theme-light': themeLight,
      fontFamily: siteFont,
      background: floorBg, 
      minHeight: "100vh" 
    } as React.CSSProperties}>
      <div>
        <Hero onAsk={scrollToAsk} />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10" style={{ background: wallBg }}>
        
        <div className="mb-8">
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold shadow-sm transition-all hover:shadow-md border border-amber-900/10"
            style={{ color: themeMain }}
          >
            🎨 {showSettings ? "تنظيمات پټ کړی" : "د پاڼي د خطونو تنظيمات وټاکی"}
          </button>

          {showSettings && (
            <div className="mt-4 rounded-3xl border border-amber-900/20 bg-white/90 p-6 shadow-lg backdrop-blur-sm">
              <div className="mb-6">
                <h4 className="mb-3 text-sm font-bold text-amber-900">۱. د عام متن فونټ وټاکی:</h4>
                <div className="flex flex-wrap gap-2">
                  {bodyFonts.map(f => (
                    <button key={f.name} onClick={() => applyFont("--site-font", f.value, "mufti_font")} className="rounded-xl border border-amber-900/10 bg-amber-50/50 px-3 py-2 text-xs font-bold transition-all hover:bg-amber-100" style={{ fontFamily: f.value, color: themeMain }}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-2">
                <h4 className="mb-3 text-sm font-bold text-amber-900">۲. د عنوانونو فونټ وټاکی:</h4>
                <div className="flex flex-wrap gap-2">
                  {headingFonts.map(f => (
                    <button key={f.name} onClick={() => applyFont("--heading-font", f.value, "mufti_heading_font")} className="rounded-xl border border-amber-900/10 bg-amber-50/50 px-3 py-2 text-xs font-bold transition-all hover:bg-amber-100" style={{ fontFamily: f.value, color: themeMain }}>
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div ref={askBoxRef} className="fatwa-card rounded-3xl p-6 md:p-8" style={{ backgroundColor: boxBg }}>
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
              placeholder="د بېلګي په توګه: د روژي د نيت وخت کوم دی..."
              rows={3}
              className="flex-1 resize-none rounded-2xl border border-amber-900/20 bg-white/80 px-4 py-3 text-base placeholder:text-amber-900/40 focus:outline-none focus:ring-2 focus:ring-amber-900/20"
              style={{ color: themeMain }}
              dir="rtl"
            />
            <button
              onClick={() => ask(question)}
              disabled={loading || !question.trim()}
              className="self-end rounded-2xl px-8 py-3 font-bold text-amber-100 shadow-lg transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
              style={{ background: btnBg || `linear-gradient(135deg, ${themeMain}, ${themeLight})` }}
            >
              {loading ? "د لټون په حال کي…" : "پوښتنه وکړی"}
            </button>
          </div>

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
          <div className="mt-8 flex flex-col items-center justify-center gap-3 rounded-2xl border border-amber-900/15 bg-white/60 p-6" style={{ color: themeMain }}>
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
                    style={{ color: themeMain }}
                  >
                    📄 يوازي دا فتوا PDF کښته کړی
                  </button>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
