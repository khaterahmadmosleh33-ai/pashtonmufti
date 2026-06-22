// د سايټ د سر برخه — د لوګو، عنوان، او د tabs د بدلون لپاره.

type Tab = "fatwa" | "roadmap" | "admin" | "evaluation" | "architecture";

type Props = {
  active: Tab;
  onChange: (t: Tab) => void;
};

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "fatwa",        label: "د مفتي خونه",  icon: "📜" },
  { id: "roadmap",      label: "د ۷ پړاوونو نقشه", icon: "🗺️" },
  { id: "admin",        label: "اډمن پينل",    icon: "⚙️" },
  { id: "evaluation",   label: "ازموينه",      icon: "⚖️" },
  { id: "architecture", label: "معماري",       icon: "🏛️" },
];

export default function Header({ active, onChange }: Props) {
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
            <span className="absolute -bottom-1 -left-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-[#faf6ee]" />
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

        {/* د tabs */}
        <nav className="flex flex-wrap items-center gap-1 rounded-2xl border border-amber-900/15 bg-white/60 p-1 shadow-sm">
          {tabs.map((t) => {
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className={[
                  "rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 sm:text-sm",
                  isActive
                    ? "tab-active"
                    : "text-emerald-950/70 hover:bg-amber-100/60 hover:text-emerald-900",
                ].join(" ")}
              >
                <span className="ml-1.5">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
