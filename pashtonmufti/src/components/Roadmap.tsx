// د «پښتون مفتي» د بريا د لاري ۷ پړاوونه.
// د مشاور د خبرو پر بنسټ: «يو کتاب صحيح، بيا ۱۰، بيا ۵۰».

import { phases, type Phase } from "../data/roadmap";

export default function Roadmap() {
  const done = phases.filter((p) => p.status === "done").length;
  const active = phases.filter((p) => p.status === "active").length;
  const total = phases.length;
  const pct = (done / total) * 100;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* د سر برخه */}
      <div className="mb-10 text-center">
        <div className="ornament mb-4">۞</div>
        <h2 className="mb-3 text-3xl font-bold text-[#0f3d2e]">
          د بريا د لاري ۷ پړاوونه
        </h2>
        <p className="mx-auto max-w-3xl text-amber-950/80">
          د يو واقعي انجينر فلسفه: <b>«يو کتاب اول، بيا د نړۍ فکر»</b>. د دي
          پروژي اصلي هدف Cloud SQL يا Gemini نه دی — اصلي هدف دا دی چي يو کس
          پوښتنه وکړي او سيستم د حنفي فقهي کتابونو څخه <b>صحيح، مستند، او د
          حوالې لرونکی</b> جواب ورکړي. بس همدا.
        </p>
      </div>

      {/* د عمومي پرمختګ بار */}
      <div className="fatwa-card mb-10 rounded-2xl p-6">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs font-bold text-amber-700">د پروژي عمومي پرمختګ</div>
            <div className="text-2xl font-extrabold text-emerald-900">
              {done.toLocaleString("ar")} / {total.toLocaleString("ar")} پړاوونه بشپړ سوي
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <Legend color="bg-green-600" label={`${done} بشپړ`} />
            <Legend color="bg-amber-500" label={`${active} روان`} />
            <Legend color="bg-gray-300" label={`${total - done - active} پاتي`} />
          </div>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-700 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* د پړاوونو لست */}
      <div className="space-y-4">
        {phases.map((p, i) => (
          <PhaseCard key={p.num} phase={p} isLast={i === phases.length - 1} />
        ))}
      </div>

      {/* د اساسي پيغام تکرار */}
      <div className="mt-12 rounded-3xl border-2 border-double border-amber-700/40 bg-gradient-to-br from-amber-50 to-emerald-50 p-8 text-center">
        <div className="font-arabic mb-3 text-2xl text-emerald-900" dir="rtl">
          ﴿ وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ ﴾
        </div>
        <p className="mx-auto max-w-2xl text-sm leading-relaxed text-emerald-950">
          د دي ۷ پړاوونو سره منظم کار، تر اوبجلتي ډېرو غوره دی. هر پړاو چي په
          عجله تير سي، په راتلونکي پړاو کي يي قرباني ورکيږي. د «يو کتاب» سم
          ساتنه د «۱۰۰ کتابونو» د ګډوډي ساتني څخه ډېره با ارزښته ده.
        </p>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 font-bold text-emerald-900">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function PhaseCard({ phase, isLast }: { phase: Phase; isLast: boolean }) {
  const statusMap = {
    done: {
      ring: "ring-2 ring-green-500/40",
      badge: "bg-green-600 text-white",
      badgeText: "✓ بشپړ",
      stripe: "from-green-500 to-emerald-600",
      iconBg: "bg-gradient-to-br from-green-500 to-emerald-700 text-white",
    },
    active: {
      ring: "ring-2 ring-amber-500/60 shadow-lg shadow-amber-500/10",
      badge: "bg-amber-500 text-white",
      badgeText: "● روان",
      stripe: "from-amber-400 to-amber-600",
      iconBg: "bg-gradient-to-br from-amber-500 to-amber-700 text-white",
    },
    pending: {
      ring: "ring-1 ring-amber-900/10",
      badge: "bg-gray-200 text-gray-700",
      badgeText: "○ پاتي",
      stripe: "from-gray-300 to-gray-400",
      iconBg: "bg-white text-amber-700 border border-amber-300",
    },
  };
  const s = statusMap[phase.status];

  return (
    <div className="relative">
      <div className={`relative overflow-hidden rounded-2xl bg-white/80 ${s.ring} transition-all`}>
        {/* د کيڼ خوا رنګين پټۍ */}
        <div className={`absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b ${s.stripe}`} />

        <div className="p-6 pr-8">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${s.iconBg}`}>
                {phase.icon}
              </div>
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-amber-700">
                  پړاو {phase.num.toLocaleString("ar")}
                </div>
                <h3 className="text-xl font-bold text-emerald-950">
                  {phase.title}
                </h3>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${s.badge}`}>
              {s.badgeText}
            </span>
          </div>

          <p className="mb-4 text-sm leading-relaxed text-amber-950/85">
            <span className="font-bold text-emerald-900">د دي پړاو هدف: </span>
            {phase.goal}
          </p>

          {/* د بريا نښي */}
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50/60 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-800">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              د بريا نښي
            </div>
            <ul className="space-y-1 text-sm text-emerald-950">
              {phase.successCriteria.map((c) => (
                <li key={c} className="flex items-start gap-2">
                  <span className="mt-1 text-green-600">✓</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* د ګواښونو نښي */}
          {phase.pitfalls && phase.pitfalls.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-800">
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                  <path d="M12 2L1 21h22L12 2zm0 6l7.53 13H4.47L12 8zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                </svg>
                له دي ګواښونو څخه ځان وساتی
              </div>
              <ul className="space-y-1 text-sm text-red-950">
                {phase.pitfalls.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-1 text-red-600">⚠</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* د تړونکي خط (د بل پړاو لور ته) */}
      {!isLast && (
        <div className="flex justify-center py-1">
          <div className="h-6 w-0.5 rounded-full bg-gradient-to-b from-amber-400 to-transparent" />
        </div>
      )}
    </div>
  );
}
