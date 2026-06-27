// د فتوا د ښودلو کارت — د ځواب متن، د حواله سوو مراجعو لست، او بشپړه جامع حواله.

import { useState, useRef, useEffect } from "react";
import type { Fatwa, FatwaSource } from "../types";

type Props = {
  fatwa: Fatwa;
  meta?: { model?: string; latency_ms?: number };
};

export default function FatwaCard({ fatwa, meta }: Props) {
  const [openSource, setOpenSource] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const answerRef = useRef<HTMLDivElement>(null);

  // مراجع ۵ ته راکموي تر څو پر پرده ګډوډي رامينځته نه سي
  const displaySources = fatwa.sources.slice(0, 5);

  // دا برخه ګوري چي آيا د فتوې متن دومره اوږد دی چي «نور لوستل» بټن ته اړتيا ولري که نه.
  useEffect(() => {
    if (answerRef.current) {
      // که د متن اصلي لوړوالی تر ۴۰۰ پيکسل (غوره حد) لوړ وي، نو بټن ښکاره کړه
      if (answerRef.current.scrollHeight > 400) {
        setNeedsExpansion(true);
      }
    }
  }, [fatwa.answer]);

    const copyAnswer = async () => {
    const citation = displaySources
      .map(
        (s, i) =>
          `${i + 1}. ${s.metadata.bookName} | ${s.metadata.author} | جلد: ${s.metadata.volume || "-"} | مخ: ${s.metadata.page || "-"}`
      )
      .join("\n");

    const text = `بسم الله الرحمن الرحيم
    
پوښتنه
${fatwa.question || ""}

•••••°°°°•••••°°°°•••••°°°°•••••


${fatwa.answer || ""}

•••••°°°°•••••°°°°•••••°°°°•••••`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.alert("کاپي ونه سو");
    }
  };

  return (
    <div className="space-y-6">
      {/* د ځواب اصلي کارت */}
      <div className="fatwa-card rounded-3xl p-8 md:p-10">
        {/* د سر سجاوټ */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-amber-700">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor">
              <path d="M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7l2-7z" />
            </svg>
            <span className="text-sm font-bold uppercase tracking-wider">
              د «پښتون مفتي» ځواب
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-amber-900/70">
            {meta?.model && (
              <span className="rounded-full bg-emerald-900/90 px-2 py-0.5 font-bold text-amber-200">
                {meta.model}
              </span>
            )}
            {meta?.latency_ms && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 font-bold text-amber-900">
                {(meta.latency_ms / 1000).toFixed(2)} ث.
              </span>
            )}
            <button
              onClick={copyAnswer}
              className="rounded-full border border-amber-900/20 bg-white/70 px-2 py-0.5 font-bold text-emerald-900 hover:bg-amber-50"
            >
              {copied ? "✓ کاپي سو" : "📋 کاپي"}
            </button>
          </div>
        </div>

        <div className="ornament mb-4">۞</div>

        {/* پوښتنه */}
        <div className="mb-6 rounded-2xl border border-amber-900/15 bg-amber-50/40 p-4">
          <div className="mb-1 text-xs font-bold text-amber-900/70">
            پوښتنه:
          </div>
          <div className="text-emerald-950 font-bold leading-relaxed">{fatwa.question}</div>
        </div>

        {/* ځواب د Read More په سيسټم سمبال */}
        <div className="relative">
          <div 
            ref={answerRef}
            className={`font-pashto whitespace-pre-wrap text-lg leading-loose text-emerald-950 transition-all duration-500 ease-in-out ${!isExpanded && needsExpansion ? "max-h-[400px] overflow-hidden" : ""}`}
          >
            {fatwa.answer}
          </div>
          
          {/* د متن په پای کي سیوری (Fade Out) که چېري متن لنډ سوی وي */}
          {!isExpanded && needsExpansion && (
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#fcf9f2] to-transparent pointer-events-none"></div>
          )}
        </div>

        {/* د Read More بټن */}
        {needsExpansion && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-full border border-amber-900/20 bg-white px-5 py-2 text-sm font-bold shadow-sm transition-all hover:bg-amber-50 hover:shadow-md"
              style={{ color: "var(--theme-main, #0f3d2e)" }}
            >
              {isExpanded ? "▲ لنډول (پټول)" : "📖 بشپړ ځواب لوستل (نور...)"}
            </button>
          </div>
        )}

        <div className="ornament mt-8">۞</div>

        {/* د بشپړي جامعي حوالې برخه چي ۵ ته محدوده سوې ده */}
        {displaySources.length > 0 && <CitationBlock sources={displaySources} />}
      </div>

      {/* د مراجعو راپورته سوي ټوټي چي ۵ ته محدودې سوې دي */}
      {displaySources.length > 0 && (
        <div>
          <h3 className="mb-4 flex items-center gap-2 text-xl font-bold text-[#0f3d2e]">
            <span className="text-amber-600">◆</span>
            راپورته سوي فقهي ټوټي
            <span className="rounded-full bg-emerald-900 px-2.5 py-0.5 text-xs font-bold text-amber-200">
              {displaySources.length}
            </span>
          </h3>
          <div className="space-y-3">
            {displaySources.map((src, i) => (
              <SourceItem
                key={i}
                source={src}
                index={i}
                open={openSource === i}
                onToggle={() => setOpenSource(openSource === i ? null : i)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SourceItem({
  source,
  index,
  open,
  onToggle,
}: {
  source: FatwaSource;
  index: number;
  open: boolean;
  onToggle: () => void;
}) {
  const simPercent = (source.similarity * 100).toFixed(1);
  return (
    <div className="overflow-hidden rounded-2xl border border-amber-900/15 bg-white/70 shadow-sm">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-right transition-colors hover:bg-amber-50/50"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-900 text-sm font-bold text-amber-200">
            {index + 1}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold text-emerald-950">
              {source.metadata.bookName}
            </div>
            <div className="truncate text-xs text-amber-900/70">
              {source.metadata.author}
              {source.metadata.volume && ` · جلد ${source.metadata.volume}`}
              {source.metadata.page && ` · مخ ${source.metadata.page}`}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-900">
            {simPercent}٪ ورته والی
          </span>
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 text-amber-700 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="border-t border-amber-900/15 bg-amber-50/30 px-5 py-5">
          {/* د عربي اصلي متن */}
          <div className="mb-4 rounded-xl border border-amber-900/15 bg-[#fffdf6] p-5">
            <div className="mb-2 text-xs font-bold text-amber-700">
              ﴿ د کتاب اصلي متن ﴾
            </div>
            <div className="font-arabic text-emerald-950 leading-loose" dir="rtl">
              {source.arabicText}
            </div>
          </div>
          {/* ميټاډېټا ګريډ */}
          <MetadataGrid m={source.metadata} />
        </div>
      )}
    </div>
  );
}

function MetadataGrid({ m }: { m: FatwaSource["metadata"] }) {
  const rows: { label: string; value?: string }[] = [
    { label: "کتاب", value: m.bookName },
    { label: "مصنف", value: m.author },
    { label: "مطبعه / چاپ", value: m.publisher },
    { label: "جلد", value: m.volume },
    { label: "مخ", value: m.page },
    { label: "کتاب / باب", value: m.kitab },
    { label: "فصل", value: m.fasl },
    { label: "مسأله / مطلب", value: m.masalah },
    { label: "د حديث شمېره", value: m.hadithNumber },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows
        .filter((r) => r.value)
        .map((r) => (
          <div
            key={r.label}
            className="rounded-lg border border-amber-900/10 bg-white/60 px-3 py-2"
          >
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
              {r.label}
            </div>
            <div className="text-sm text-emerald-950">{r.value}</div>
          </div>
        ))}
    </div>
  );
}

function CitationBlock({ sources }: { sources: FatwaSource[] }) {
  return (
    <div className="mt-6 rounded-2xl border-2 border-double border-amber-700/40 bg-gradient-to-br from-amber-50/80 to-amber-100/50 p-5">
      <div className="mb-3 flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-amber-700" fill="currentColor">
          <path d="M9 2v2H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2V2H9zm0 4h6v2H9V6zm-2 5h10v2H7v-2zm0 4h10v2H7v-2z" />
        </svg>
        <span className="text-sm font-bold text-amber-900">
          ﴿ بشپړي جامعي حوالې ﴾
        </span>
      </div>
      <ol className="space-y-2 text-sm leading-relaxed text-emerald-950">
        {sources.map((s, i) => (
          <li key={i} className="flex gap-2">
            <span className="font-bold text-amber-700">[{i + 1}]</span>
            <span>
              <span className="font-bold">{s.metadata.bookName}</span>
              {" · "}
              تصنيف: {s.metadata.author}
              {s.metadata.kitab && ` · ${s.metadata.kitab}`}
              {s.metadata.fasl && ` › ${s.metadata.fasl}`}
              {s.metadata.masalah && ` › ${s.metadata.masalah}`}
              {s.metadata.volume && ` · جلد ${s.metadata.volume}`}
              {s.metadata.page && `، مخ ${s.metadata.page}`}
              {s.metadata.publisher && (
                <span className="text-amber-900/80"> ({s.metadata.publisher})</span>
              )}
              {s.metadata.hadithNumber && ` · حديث #${s.metadata.hadithNumber}`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
