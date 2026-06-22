// د سايټ د پښو برخه — د درناوي او د پروژي د لنډي معرفي.

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-amber-900/15 bg-gradient-to-b from-transparent to-amber-50/60">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="ornament mb-6">۞</div>
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#0f3d2e] to-[#14533f]">
                <span className="text-lg text-amber-300">۞</span>
              </div>
              <h4 className="text-xl font-bold text-emerald-900">پښتون مفتي</h4>
            </div>
            <p className="text-sm leading-relaxed text-amber-950/80">
              «پښتون مفتي» د نړيوالي کچي يو اې آی سيسټم دی چي د حنفي مذهب د
              زرګونو معتبرو فقهي کتابونو پر بنسټ د اسلامي مسايلو ته د حوالې
              لرونکې فتوا چمتو کوي. سيسټم په Production-Level جوړ سوی او د
              څيړونکو، طالبانو، او عامو مسلمانانو لپاره خلاص دی.
            </p>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-900">
              د ټيکنالوژۍ جوړښت
            </h4>
            <ul className="space-y-1.5 text-xs text-amber-950/80">
              <li>• React + Vite + Tailwind</li>
              <li>• Node.js + Express</li>
              <li>• PostgreSQL + pgvector</li>
              <li>• Google Gemini (Embed + Pro)</li>
              <li>• Background Worker + Queue</li>
            </ul>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-bold uppercase tracking-wider text-emerald-900">
              مهمي يادوني
            </h4>
            <ul className="space-y-1.5 text-xs text-amber-950/80">
              <li>• هر ځواب د بشپړي حوالې سره</li>
              <li>• د Hallucination مخنيوی</li>
              <li>• د فقهي چنکنګ پر بنسټ</li>
              <li>• په پېچلو مسايلو کي د معتبرو علماوو مشوره ضروري ده</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-amber-900/10 pt-5 text-xs text-amber-900/70 md:flex-row">
          <div>© {new Date().getFullYear()} «پښتون مفتي» — د علم او ايمان په خدمت کي</div>
          <div className="font-arabic text-base text-emerald-900" dir="rtl">
            ﴿ وَقُل رَّبِّ زِدْنِي عِلْمًا ﴾
          </div>
        </div>
      </div>
    </footer>
  );
}
