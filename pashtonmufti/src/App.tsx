// د «پښتون مفتي» اصلي اپليکيشن (نسخهٔ عیار سوې، نړيواله او کاملاً خوندي).

import { useEffect, useState } from "react";
import Header from "./components/Header";
import FatwaRoom from "./components/FatwaRoom";
import AdminPanel from "./components/AdminPanel";
import Architecture from "./components/Architecture";
import Roadmap from "./components/Roadmap";
import Evaluation from "./components/Evaluation";
import Footer from "./components/Footer";
import { isLiveBackend } from "./lib/api";

type Tab = "fatwa" | "roadmap" | "admin" | "evaluation" | "architecture";
const TABS: Tab[] = ["fatwa", "roadmap", "admin", "evaluation", "architecture"];

export default function App() {
  const [tab, setTab] = useState<Tab>("fatwa");

  // کله چي اپليکېشن چالان سي، خوندي سوي رنګونه، فونټونه او امنيت تطبيقوي
  useEffect(() => {
    // ۱. لومړی په ځايي ډول د کاروونکي خپل اووررایډونه (LocalStorage) ګورو ترڅو سمدستي پلي سي
    const savedFont = localStorage.getItem("mufti_font");
    const savedHeadingFont = localStorage.getItem("mufti_heading_font");
    const savedThemeMain = localStorage.getItem("mufti_theme_main");
    const savedThemeLight = localStorage.getItem("mufti_theme_light");

    if (savedFont) {
      document.documentElement.style.setProperty("--site-font", savedFont);
    }
    if (savedHeadingFont) {
      document.documentElement.style.setProperty("--heading-font", savedHeadingFont);
    }
    if (savedThemeMain && savedThemeLight) {
      document.documentElement.style.setProperty("--theme-main", savedThemeMain);
      document.documentElement.style.setProperty("--theme-light", savedThemeLight);
    }

    // ۲. په شاليد کي د اډمن نړيوال ډيفالټونه له بېک انډ څخه راوباسو (د خالي براوزرونو دپاره ثبات)
    const loadGlobalSettings = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_BASE || "";
        const response = await fetch(`${apiBase}/api/global-settings`);
        
        if (response.ok) {
          const settings = await response.json();
          
          // که کاروونکي پخپل موبایل کي شخصي انتخاب نه وي کړی، د اډمن د ډېټابېس فونټونه لګول کيږي
          if (!savedFont && settings.default_site_font) {
            document.documentElement.style.setProperty("--site-font", settings.default_site_font);
          }
          if (!savedHeadingFont && settings.default_heading_font) {
            document.documentElement.style.setProperty("--heading-font", settings.default_heading_font);
          }
          if (!savedThemeMain && settings.theme_main) {
            document.documentElement.style.setProperty("--theme-main", settings.theme_main);
          }
          if (!savedThemeLight && settings.theme_light) {
            document.documentElement.style.setProperty("--theme-light", settings.theme_light);
          }
        }
      } catch (error) {
        console.error("نړيوال تنظيمات له بېک انډ څخه چارج نه سول:", error);
      }
    };

    loadGlobalSettings();

    // 🛡️ د ننوتلو خوندي چک: که اډمن لاګ ان نه وي، په اتومات ډول هشت پاکوي او د مفتي خونې ته ځي
    const token = localStorage.getItem("mufti_token");
    const h = window.location.hash.replace("#", "");
    
    if (!token) {
      setTab("fatwa");
      window.history.replaceState(null, "", "#fatwa");
    } else if (TABS.includes(h as Tab)) {
      setTab(h as Tab);
    }
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `#${tab}`);
  }, [tab]);

  return (
    <div className="paper-bg min-h-screen text-emerald-950">
      <Header active={tab} onChange={setTab} />

      {!isLiveBackend && (
        <div className="bg-red-50 px-4 py-1.5 text-center text-[11px] text-red-900">
          ⚠️ حقيقي API نه دی تړل سوې — د کار کولو لپاره{" "}
          <span className="mono">VITE_API_BASE</span> چاپيريال متغير وټاکی.
        </div>
      )}

      <main className="min-h-[70vh]">
        {tab === "fatwa"        && <FatwaRoom />}
        {tab === "roadmap"      && <Roadmap />}
        {tab === "admin"        && <AdminPanel />}
        {tab === "evaluation"   && <Evaluation />}
        {tab === "architecture" && <Architecture />}
      </main>
      <Footer />
    </div>
  );
}
