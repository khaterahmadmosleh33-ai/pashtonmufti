// د لومړۍ پاڼي شاندار سر (Hero) برخه — يوازي د «د مفتي خونه» tab کي ښکاره کيږي.

type Props = {
  onAsk: () => void;
};

export default function Hero({ onAsk }: Props) {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden border-b border-amber-900/15 py-20 text-center">
      {/* د شاليد تزييني پټۍ */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-amber-300/20 blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl px-6">
        {/* د سر ليکنه او عنوان */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-amber-700/30 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-600 pulse-dot" />
          د حنفي فقهي د معتبرو کتابونو پر بنسټ
        </div>
        
        <h1 className="mb-6 text-4xl font-extrabold leading-tight text-[#0b1220] md:text-5xl lg:text-6xl">
          د علم چراغ، د ايمان لاره —{" "}
          <br className="hidden md:block mt-2" />
          <span className="bg-gradient-to-l from-emerald-700 to-amber-700 bg-clip-text text-transparent">
            پښتون مفتي
          </span>
        </h1>
        
        <p className="mb-10 mx-auto max-w-2xl text-lg leading-relaxed text-emerald-950/80 md:text-xl">
          د حنفي فقهي د معتبرو کتابونو پر بنسټ خپلي اسلامي پوښتني ته د دقيقي او
          د حوالې لرونکې فتوا ترلاسه کړی. زموږ فلسفه: <b>«يو کتاب اول، بيا د
          نړۍ فکر»</b> — هر ځواب د کتاب، مصنف، جلد، مخ، باب او مسألې سره
          ملګری دی.
        </p>
        
        {/* د پوښتني کولو اصلي تڼۍ */}
        <div className="flex justify-center">
          <button
            onClick={onAsk}
            className="rounded-full bg-gradient-to-br from-[#0f3d2e] to-[#14533f] px-10 py-4 text-lg font-bold text-amber-100 shadow-xl shadow-emerald-900/20 transition-transform hover:-translate-y-1"
          >
            ✦ خپله پوښتنه وپوښتی
          </button>
        </div>
      </div>
    </section>
  );
}
