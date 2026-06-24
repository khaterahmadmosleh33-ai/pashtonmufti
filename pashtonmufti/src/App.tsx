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

  // کله چي اپليکېشن چالان سي، خوندي سوي رنګونه او فونټونه تطبيقوي
  useEffect(() => {
    const savedFont = localStorage.getItem("mufti_font");
    const savedThemeMain = localStorage.getItem("mufti_theme_main");
    const savedThemeLight = localStorage.getItem("mufti_theme_light");

    if (savedFont) {
      document.documentElement.style.setProperty("--site-font", savedFont);
    }
    if (savedThemeMain && savedThemeLight) {
      document.documentElement.style.setProperty("--theme-main", savedThemeMain);
      document.documentElement.style.setProperty("--theme-light", savedThemeLight);
    }

    const h = window.location.hash.replace("#", "");
    if (TABS.includes(h as Tab)) setTab(h as Tab);
  }, []);

  useEffect(() => {
    window.history.replaceState(null, "", `#${tab}`);
  }, [tab]);

  return (
    <div className="paper-bg min-h-screen text-emerald-950">
      <Header active={tab} onChange={setTab} />

      {!isLiveBackend && (
        <div className="bg-red-50 px-4 py-1.5 text-center text-[11px] text-red-900">
          ⚠️ حقيقي API نه دی تړل سوی — د کار کولو لپاره{" "}
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
