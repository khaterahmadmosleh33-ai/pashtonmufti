// د پړاو ۱ لپاره حقيقي workbench — يو کتاب، د ډيټابېس د واقعي حالت پر بنسټ.
// دلته هيڅ جعلي کتاب، جعلي ټوټي، يا جعلي ويکټورونه نه ښودل کيږي.

import type { BookStatus } from "../types";

type Props = {
  books: BookStatus[];
  onOpenUpload: () => void;
};

type Step = {
  num: number;
  title: string;
  desc: string;
  status: "done" | "active" | "pending";
  icon: string;
  detail?: string;
};

export default function SingleBookWorkbench({ books, onOpenUpload }: Props) {
  const book = books[0];
  const progress = book
    ? (book.embeddedChunks / Math.max(book.totalChunks, 1)) * 100
    : 0;
  const steps = buildSteps(book);
  const doneCount = steps.filter((s) => s.status === "done").length;
  const pct = (doneCount / steps.length) * 100;

  return (
    <div className="space-y-6">
      <div className="fatwa-card rounded-3xl p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-900">
              🎯 پړاو ۱ — يو کتاب اول
            </div>
            {book ? (
              <>
                <h3 className="text-2xl font-bold text-[#0f3d2e]">{book.title}</h3>
                <div className="text-sm text-amber-900/80">
                  {book.author} · {book.uploadedAt}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-bold text-[#0f3d2e]">
                  لا تر اوسه حقيقي کتاب نه دی اپلوډ سوی
                </h3>
                <div className="text-sm text-amber-900/80">
                  اول يو پاک UTF-8 عربي .txt فايل اپلوډ کړی، بيا به چنکنګ او قطار پيل سي.
                </div>
              </>
            )}
          </div>
          <button
            onClick={onOpenUpload}
            className="rounded-2xl bg-gradient-to-br from-[#0f3d2e] to-[#14533f] px-5 py-2.5 text-sm font-bold text-amber-100 shadow-md"
          >
            ➕ کتاب اپلوډ کړی
          </button>
        </div>

        <div className="mb-2 flex items-end justify-between text-xs">
          <span className="font-bold text-emerald-900">د پړاو پرمختګ</span>
          <span className="font-bold text-emerald-900">
            {doneCount.toLocaleString("ar")} / {steps.length.toLocaleString("ar")} مرحلې
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-emerald-700 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {book && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Mini label="ټولي ټوټي" value={book.totalChunks} />
          <Mini label="ويکټور سوي" value={book.embeddedChunks} highlight />
          <Mini label="په قطار / پاته" value={book.queuedChunks} />
          <div className="rounded-xl border border-amber-900/15 bg-white/70 p-3 text-center text-amber-900">
            <div className="text-2xl font-extrabold">{progress.toFixed(0)}٪</div>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
              پرمختګ
            </div>
          </div>
        </div>
      )}

      <div>
        <h4 className="mb-3 text-lg font-bold text-emerald-900">
          د هري مرحلې وضعيت
        </h4>
        <div className="space-y-2">
          {steps.map((s) => (
            <StepRow key={s.num} step={s} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-double border-amber-700/40 bg-amber-50/70 p-5 text-sm text-amber-900">
        <div className="mb-2 flex items-center gap-2 font-bold text-amber-900">
          💡 د حقيقي کار اصل
        </div>
        <p className="leading-relaxed">
          دلته يوازي هغه شمېرې ښکاري چي له online ډيټابېس څخه راځي. که کتاب نه
          وي، هيڅ جعلي شمېره نه ښودل کيږي. کتاب اپلوډ سي، سرور يي په فقهي جوړښت
          چنک کوي، قطار ته يي اچوي، Worker يي ويکټوروي، او بيا د پوښتني په وخت کي
          pgvector د اړوندو ټوټو لټون کوي.
        </p>
      </div>
    </div>
  );
}

function buildSteps(book?: BookStatus): Step[] {
  const hasBook = Boolean(book);
  const hasChunks = Boolean(book && book.totalChunks > 0);
  const allEmbedded = Boolean(book && book.totalChunks > 0 && book.embeddedChunks === book.totalChunks);
  const hasQueued = Boolean(book && book.queuedChunks > 0);

  return [
    {
      num: 1,
      title: "د کتاب اپلوډ",
      desc: "د عربي UTF-8 متن يا .txt فايل سرور ته لېږل",
      status: hasBook ? "done" : "active",
      icon: "📤",
      detail: hasBook ? "کتاب د books جدول کي خوندي سوی" : "اول کتاب اپلوډ کړی",
    },
    {
      num: 2,
      title: "د جوړښت پارس او چنکنګ",
      desc: "کتاب/باب/فصل/مسأله پر بنسټ ټوټې جوړول",
      status: hasChunks ? "done" : hasBook ? "active" : "pending",
      icon: "✂️",
      detail: hasChunks ? `${book?.totalChunks.toLocaleString("ar")} ټوټي جوړي سوي` : undefined,
    },
    {
      num: 3,
      title: "د ميټاډېټا ساتنه",
      desc: "کتاب، مصنف، مطبعه، جلد، مخ، باب، فصل، مسأله، حديث شمېره",
      status: hasChunks ? "done" : "pending",
      icon: "🏷️",
      detail: hasChunks ? "ميټاډېټا د chunks جدول په جلا کالمونو کي خوندي ده" : undefined,
    },
    {
      num: 4,
      title: "قطار ته اچول",
      desc: "ټوټي د embedding_queue جدول ته ورکول",
      status: hasChunks ? "done" : "pending",
      icon: "📥",
      detail: hasQueued ? `${book?.queuedChunks.toLocaleString("ar")} ټوټي لا پاتي دي` : undefined,
    },
    {
      num: 5,
      title: "ويکټورول (Embedding)",
      desc: "د Gemini text-embedding-004 سره ۷۶۸-بُعدي ويکټورونه",
      status: allEmbedded ? "done" : hasChunks ? "active" : "pending",
      icon: "🧮",
      detail: book ? `${book.embeddedChunks.toLocaleString("ar")} / ${book.totalChunks.toLocaleString("ar")} ويکټور سوي` : undefined,
    },
    {
      num: 6,
      title: "د لټون ازموينه",
      desc: "پوښتنه → ويکټور → pgvector cosine search → اړوندي مسألې",
      status: allEmbedded ? "active" : "pending",
      icon: "🔍",
      detail: allEmbedded ? "اوس د Search او Evaluation ازموينه وچلوی" : undefined,
    },
  ];
}

function Mini({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-xl border p-3 text-center ${
        highlight
          ? "border-emerald-500/40 bg-emerald-50 text-emerald-900"
          : "border-amber-900/15 bg-white/70 text-amber-900"
      }`}
    >
      <div className="text-2xl font-extrabold">{value.toLocaleString("ar")}</div>
      <div className="text-[11px] font-bold uppercase tracking-wider opacity-70">
        {label}
      </div>
    </div>
  );
}

function StepRow({ step }: { step: Step }) {
  const styles = {
    done: { bg: "bg-green-50/60", ring: "border-green-300", icon: "bg-green-600 text-white", badge: "bg-green-600 text-white", badgeText: "✓ بشپړ" },
    active: { bg: "bg-amber-50/80", ring: "border-amber-400", icon: "bg-amber-500 text-white", badge: "bg-amber-500 text-white", badgeText: "● روان" },
    pending: { bg: "bg-white/60", ring: "border-amber-900/15", icon: "bg-gray-200 text-gray-600", badge: "bg-gray-200 text-gray-700", badgeText: "○ پاتي" },
  };
  const s = styles[step.status];

  return (
    <div className={`flex items-center gap-4 rounded-2xl border p-4 ${s.bg} ${s.ring}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg ${s.icon}`}>
        {step.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-emerald-950">
            <span className="opacity-60">{step.num.toLocaleString("ar")}.</span> {step.title}
          </span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.badge}`}>
            {s.badgeText}
          </span>
        </div>
        <div className="text-xs text-amber-900/80">{step.desc}</div>
        {step.detail && (
          <div className="mt-1 text-[11px] font-bold text-emerald-900">
            ► {step.detail}
          </div>
        )}
      </div>
    </div>
  );
}