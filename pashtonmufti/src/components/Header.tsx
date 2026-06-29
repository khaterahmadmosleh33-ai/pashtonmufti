// د سايټ د سر برخه — د لوګو، عنوان، او د کټګوريو د بدلون لپاره (نسخهٔ فولادي او قفل سوې)

import { useState } from "react";

type Tab = "fatwa" | "roadmap" | "admin" | "evaluation" | "architecture";

type Props = {
  active: Tab;
  onChange: (t: Tab) => void;
};

export default function Header({ active, onChange }: Props) {
  // که د اډمن پټ ټوکن مخکي له مخکي په حافظه کي وي، د اډمن تڼۍ اتومات ښکاري
  const [showAdmin, setShowAdmin] = useState(() => Boolean(localStorage.getItem("mufti_token")));
  const [clicks, setClicks] = useState(0);

  // 🤫 د پټي دروازې چل: که پر دغه ژېړ نښان ۳ واره کليک سي، د اډمن تڼۍ را ښکاره کېږي
  const handleSecretClick = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);
    if (newClicks >= 3) {
      setShowAdmin(true);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-amber-900/15 bg-[#faf6ee]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        
        {/* لوګو او عنوان */}
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0f3d2e] to-[#14533f] shadow-lg shadow-emerald-900/30">
            <svg viewBox="0 0 24 24" className="h-7 w-7 text-amber-300" fill="currentColor">
              <path d="M4 4h11a3 3 0 0 1 3 3v13H7a3 3 0 0 1-3-3V4zm2 2v11a1 1 0 0 0 1 1h9V7a1 1 0 0 0-1-1H6z" opacity="0.9" />
              <path d="M19 5.5a4.5 4.5 0 1 0 0 9 3.6 3.6 0 0 1 0-9z" opacity="0.6" />
            </svg>
            
            {/* پټ پيره دار نښان چي عام خلګ يې يوازي ډيزاين بولي خو ستا لپاره د ننوتلو پټه کيلي ده */}
            <span 
              onClick={handleSecretClick}
              className="absolute -bottom-1 -left-1 h-3 w-3 cursor-pointer rounded-full bg-amber-400 ring-2 ring-[#faf6ee]" 
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#0b1220]">
              پښتون مفتي
            </h1>
            <p className="text-xs text-amber-900/70">
              د زرګونو فقهي کتابونو پر بنسټ د اې آی (AI) لارښوونه
            </p>
          </div>
        </div>

        {/* د ټابونو مېنو — که پټ شفر نه وي وهل سوی، عام خلګ هيڅ ډول تڼۍ نه ويني او يوازي د مفتي خونه فعاله وي */}
        {showAdmin && (
          <nav className="flex flex-wrap items-center gap-1 rounded-2xl border border-amber-900/15 bg-white/60 p-1 shadow-sm">
            <button
              onClick={() => onChange("fatwa")}
              className={[
                "rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 sm:text-sm",
                active === "fatwa"
                  ? "tab-active"
                  : "text-emerald-950/70 hover:bg-amber-100/60 hover:text-emerald-900",
              ].join(" ")}
            >
              <span className="ml-1.5">📜</span>
              د مفتي خونه
            </button>

            <button
              onClick={() => onChange("admin")}
              className={[
                "rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 sm:text-sm",
                active === "admin"
                  ? "tab-active"
                  : "text-emerald-950/70 hover:bg-amber-100/60 hover:text-emerald-900",
              ].join(" ")}
            >
              <span className="ml-1.5">⚙️</span>
              اډمن پينل
            </button>
          </nav>
        )}
        
      </div>
    </header>
  );
}

