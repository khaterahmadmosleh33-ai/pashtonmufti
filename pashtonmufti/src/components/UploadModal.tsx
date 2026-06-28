// د کتاب اپلوډ موډال — د اډمن پينل څخه پيل کيږي.

import { useState, useEffect } from "react";
import { uploadBook, isLiveBackend, fetchCategories } from "../lib/api"; // fetchCategories به په api.ts کي جوړوو

type Props = {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
};

export default function UploadModal({ open, onClose, onUploaded }: Props) {
  // د الماريو (فنونو) لومړنی ليسټ چي وروسته به د ډېټابېس څخه راځي
  const [categories, setCategories] = useState<string[]>(["فقه", "حديث", "تفسير", "سيرت او تاريخ", "عقايد"]);
  
  const [form, setForm] = useState({
    title: "",
    author: "",
    publisher: "",
    edition: "",
    defaultVolume: "",
    text: "",
    category: "فقه", // د المارۍ نوم
    customRule: "",  // د ځانګړو اصولو ليکلو بکس
    isMultiVolume: false, // آيا څو ټوکه دی؟
    folderName: "",  // د مرکزي فولډر نوم
  });
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  // د سوپابېس څخه د فنونو (الماريو) راوستل
  useEffect(() => {
    async function loadCategories() {
      try {
        if (typeof fetchCategories === 'function') {
          const cats = await fetchCategories();
          if (cats && cats.length > 0) {
            setCategories(cats.map((c: any) => c.name));
            setForm(p => ({ ...p, category: cats[0].name }));
          }
        }
      } catch (e) {
        console.error("د الماريو په راوستلو کي ستونزه", e);
      }
    }
    if (open) loadCategories();
  }, [open]);

  if (!open) return null;

  const update = (k: keyof typeof form, v: any) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleFile = async (file: File | null) => {
    setMsg(null);
    setSelectedFile(file);
    if (!file) return;
    if (!file.type.includes("text") && !file.name.endsWith(".txt")) {
      setMsg({ kind: "err", text: "مهرباني وکړی يوازي .txt يا text/plain فايل پورته کړی." });
      setSelectedFile(null);
      return;
    }
    const text = await file.text();
    update("text", text);
  };

  const submit = async () => {
    setMsg(null);
    if (!form.title || !form.author || !form.text.trim()) {
      setMsg({ kind: "err", text: "د کتاب نوم، مصنف، او متن حتمي دي." });
      return;
    }
    if (form.isMultiVolume && !form.folderName.trim()) {
      setMsg({ kind: "err", text: "د څو ټوکه کتاب لپاره د مرکزي فولډر نوم ليکل حتمي دي." });
      return;
    }

    setBusy(true);
    try {
      const r = await uploadBook({ ...form, file: selectedFile });
      
      // دلته سيسټم سکرين نه بندوي، تر څو بل کتاب پورته کړای سې
      setMsg({ kind: "ok", text: "کتاب په برياليتوب سره قطار ته واچول سو! اوس کولای سی بل کتاب پورته کړی." });
      onUploaded();
      
      // فورمه خالي کوو، خو مصنف، المارۍ او فولډر نوم ساتو تر څو د بل ټوک اپلوډ اسانه وي
      setForm((p) => ({
        ...p,
        title: "", edition: "", defaultVolume: "", text: "", customRule: "",
      }));
      setSelectedFile(null);
      
    } catch (e: any) {
      setMsg({ kind: "err", text: e.message || "د اپلوډ په وخت کي ستونزه پيدا سوه." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="fatwa-card relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-emerald-900 hover:bg-amber-200"
        >
          ✕
        </button>
        <h3 className="mb-1 text-2xl font-bold text-[#0f3d2e]">
          د نوي کتاب اپلوډ (کتابتون)
        </h3>
        <p className="mb-5 text-sm text-amber-900/80">
          ټول پروسسونه په بېکګراونډ کي تر سره کيږي. تاسو کولای سی پرله‌پسې څو کتابونه قطار ته واچوی بېله دې چي انتظار وباسی.
        </p>

        {!isLiveBackend && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-xs text-red-900">
            <b>حقيقي سرور نه دی تړل سوی:</b> د کتاب اپلوډ به هغه وخت کار کوي چي
            <span className="mono mx-1">VITE_API_BASE</span>
            د Express API ادرس ته برابر سي.
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="د کتاب نوم *" value={form.title} onChange={(v) => update("title", v)} />
          <Field label="مصنف *" value={form.author} onChange={(v) => update("author", v)} />
          
          {/* د الماريو (فنونو) انتخاب */}
          <div>
            <label className="mb-1 block text-xs font-bold text-emerald-900">المارۍ (فن) *</label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="w-full rounded-xl border border-amber-900/20 bg-white/80 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
            >
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* د متحرکو اصولو بکس */}
          <Field 
            label="ځانګړی اصول (مثلاً: سورة, المقصد)" 
            value={form.customRule} 
            onChange={(v) => update("customRule", v)} 
            placeholder="که خالي وي، عمومي اصول کارول کيږي"
          />

          <Field label="مطبعه / چاپ" value={form.publisher} onChange={(v) => update("publisher", v)} />
          <Field
            label="د جلد شمېره"
            value={form.defaultVolume}
            onChange={(v) => update("defaultVolume", v)}
            placeholder="مثلاً ۱"
          />
        </div>

        {/* د څو ټوکه کتابونو لپاره فولډر سيسټم */}
        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-emerald-900/10 bg-emerald-50/50 p-3">
          <label className="flex items-center gap-2 text-sm font-bold text-emerald-900 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isMultiVolume}
              onChange={(e) => update("isMultiVolume", e.target.checked)}
              className="rounded text-emerald-800 focus:ring-emerald-800 h-4 w-4"
            />
            دا کتاب څو مجلدات لري؟
          </label>
          {form.isMultiVolume && (
            <div className="flex-1 w-full">
              <input
                type="text"
                value={form.folderName}
                onChange={(e) => update("folderName", e.target.value)}
                placeholder="د مرکزي فولډر نوم (مثلاً: هدايه)"
                className="w-full rounded-lg border border-amber-900/20 bg-white px-3 py-1.5 text-sm focus:border-emerald-700 focus:outline-none"
              />
            </div>
          )}
        </div>

        <div className="mt-4 rounded-2xl border border-amber-900/15 bg-white/50 p-4">
          <label className="mb-2 block text-xs font-bold text-emerald-900">
            د ټېکسټ فايل اپلوډ (.txt)
          </label>
          <input
            type="file"
            accept=".txt,text/plain"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
            className="block w-full cursor-pointer rounded-xl border border-amber-900/20 bg-white/80 px-3 py-2 text-sm text-emerald-900 file:ml-3 file:rounded-lg file:border-0 file:bg-emerald-900 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-amber-100"
          />
          <div className="mt-2 text-[11px] leading-relaxed text-amber-900/70">
            فايل د براوزر په کچه يوازي د preview لپاره لوستل کيږي؛ چنکنګ او ويکټورول
            بيا هم سل په سله د سرور پر خوا کيږي.
          </div>
          {selectedFile && (
            <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[11px] font-bold text-emerald-900">
              ټاکل سوی فايل: {selectedFile.name} · {(selectedFile.size / 1024).toFixed(1)} KB
            </div>
          )}
        </div>

        <div className="mt-3">
          <label className="mb-1 block text-xs font-bold text-emerald-900">
            د کتاب بشپړ عربي متن *
          </label>
          <textarea
            value={form.text}
            onChange={(e) => update("text", e.target.value)}
            rows={5}
            dir="rtl"
            placeholder="دلته د کتاب بشپړ عربي متن کاپي کړی يا پورته سوی .txt فايل به دلته ښکاره سي…"
            className="w-full rounded-xl border border-amber-900/20 bg-white/80 p-3 font-arabic text-sm focus:border-emerald-700 focus:outline-none"
          />
          <div className="mt-1 text-[11px] text-amber-900/70">
            د متن طول: {form.text.length.toLocaleString("ar")} توري
          </div>
        </div>

        {msg && (
          <div
            className={`mt-3 rounded-xl border p-3 text-sm font-bold ${
              msg.kind === "ok"
                ? "border-green-300 bg-green-50 text-green-900"
                : "border-red-300 bg-red-50 text-red-900"
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3">
          <div className="text-xs text-amber-900/70">
            * نښان لرونکي ساحې حتمي دي
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-amber-900/20 bg-white/70 px-4 py-2 text-sm font-bold text-emerald-900 hover:bg-amber-50"
            >
              بندول
            </button>
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-xl bg-gradient-to-br from-[#0f3d2e] to-[#14533f] px-5 py-2 text-sm font-bold text-amber-100 shadow-md disabled:opacity-50"
            >
              {busy ? "انتظار..." : "قطار ته يې واچوی"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-emerald-900">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-amber-900/20 bg-white/80 px-3 py-2 text-sm focus:border-emerald-700 focus:outline-none"
      />
    </div>
  );
}
