// د لومړۍ پاڼي شاندار سر (Hero) برخه — يوازي د «د مفتي خونه» tab کي ښکاره کيږي.

type Props = {
  onAsk: () => void;
};

export default function Hero({ onAsk }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-amber-900/15">
      {/* د شاليد تزييني پټۍ */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-7xl items-center gap-10 px-6 py-14 md:grid-cols-[1.2fr,1fr]">
        {/* د کيڼ خوا متن */}
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-700/30 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 pulse-dot" />
            د حنفي فقهي د معتبرو کتابونو پر بنسټ — پړاو ۱: «البحر الرائق»
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight text-[#0b1220] md:text-5xl">
            د علم چراغ، د ايمان لاره —{" "}
            <span className="bg-gradient-to-l from-emerald-700 to-amber-700 bg-clip-text text-transparent">
              پښتون مفتي
            </span>
          </h1>
          <p className="mb-6 max-w-2xl text-lg leading-relaxed text-emerald-950/80">
            د حنفي فقهي د معتبرو کتابونو پر بنسټ خپلي اسلامي پوښتني ته د دقيقي او
            د حوالې لرونکې فتوا ترلاسه کړی. زموږ فلسفه: <b>«يو کتاب اول، بيا د
            نړۍ فکر»</b> — هر ځواب د کتاب، مصنف، جلد، مخ، باب او مسألې سره
            ملګری دی.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onAsk}
              className="rounded-2xl bg-gradient-to-br from-[#0f3d2e] to-[#14533f] px-6 py-3 text-base font-bold text-amber-100 shadow-lg shadow-emerald-900/20 transition-transform hover:-translate-y-0.5"
            >
              ✦ خپله پوښتنه وپوښتی
            </button>
            <a
              href="#roadmap"
              className="rounded-2xl border border-amber-700/30 bg-white/60 px-6 py-3 text-base font-bold text-emerald-900 backdrop-blur transition-colors hover:bg-amber-50"
            >
              🗺️ د ۷ پړاوونو نقشه ووينئ
            </a>
          </div>

          {/* د حقيقي کار د اصولو پټۍ */}
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              { v: "۱", l: "اول يو کتاب" },
              { v: "DB", l: "online ډيټابېس" },
              { v: "۹", l: "د حوالې ساحې" },
            ].map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-amber-900/15 bg-white/70 p-3 text-center backdrop-blur"
              >
                <div className="text-2xl font-extrabold text-emerald-900">
                  {s.v}
                </div>
                <div className="text-[11px] font-semibold text-amber-900/80">
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* د ښي خوا د حقيقي pipeline لنډيز */}
        <div className="relative">
          <div className="fatwa-card rounded-3xl p-6 shadow-xl">
            <div className="mb-3 flex items-center justify-between text-xs text-amber-900/80">
              <span className="font-bold">✦ حقيقي RAG جريان</span>
              <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] font-bold text-amber-200">
                server-side
              </span>
            </div>
            <div className="space-y-3 text-sm text-emerald-950">
              {[
                ["۱", "کتاب اپلوډ", "پاک UTF-8 .txt فايل سرور ته ځي"],
                ["۲", "فقهي چنکنګ", "کتاب/باب/فصل/مسأله پر بنسټ"],
                ["۳", "ويکټورول", "embedding_queue + Gemini text-embedding-004"],
                ["۴", "پوښتنه", "query embedding → pgvector `<=>` → context"],
                ["۵", "ځواب", "Gemini يوازي د ورکړل سوو مراجعو څخه ليکي"],
              ].map(([n, t, d]) => (
                <div key={n} className="flex gap-3 rounded-xl border border-amber-900/10 bg-white/60 p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-xs font-bold text-amber-200">
                    {n}
                  </span>
                  <div>
                    <div className="font-bold text-emerald-900">{t}</div>
                    <div className="text-xs text-amber-900/75">{d}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* د شاليد تزييني کارت */}
          <div className="absolute -top-4 -right-4 -z-10 h-full w-full rounded-3xl bg-gradient-to-br from-amber-200/40 to-emerald-200/40 blur-2xl" />
        </div>
      </div>

      {/* د شپږو خصوصيتونو پټۍ */}
      <div id="features" className="border-t border-amber-900/10 bg-white/40 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px overflow-hidden bg-amber-900/10 md:grid-cols-3 lg:grid-cols-6">
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
              className="flex flex-col items-center gap-1 bg-white/70 px-3 py-4 text-center"
            >
              <div className="text-2xl">{f.i}</div>
              <div className="text-xs font-bold text-emerald-900">{f.t}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
