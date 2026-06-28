// ============================================================
// د بېک انډ API کلائنټ — نړيوال او متحرک پُل
// ============================================================
// دا کلائنټ يوازي حقيقي Express سرور ته کار کوي.
// که `VITE_API_BASE` نه وي ټاکل سوی، اپليکيشن قصداً خطا ورکوي؛ جعلي ډيمو ډيټا نه کاروي.
// ============================================================

import type { Fatwa } from "../types";

const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

export const isLiveBackend = Boolean(API_BASE);

function requireApiBase() {
  if (!API_BASE) {
    throw new Error(
      "VITE_API_BASE نه دی ټاکل سوی. اول حقيقي Express سرور چالان کړی او frontend ته د API ادرس ورکړی."
    );
  }
}

export type AskResponse = Fatwa & { model?: string; latency_ms?: number };

export async function askMufti(question: string, keyword?: string): Promise<AskResponse> {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/ask`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, keyword }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = await res.json();
  
  return {
    question: data.question,
    answer: data.answer,
    sources: (data.sources || []).map((s: any) => ({
      arabicText: s.arabic_text,
      similarity: s.similarity,
      metadata: {
        bookName: s.metadata.book_name,
        author: s.metadata.author,
        publisher: s.metadata.publisher,
        volume: s.metadata.volume,
        page: s.metadata.page,
        kitab: s.metadata.kitab,
        fasl: s.metadata.fasl,
        masalah: s.metadata.masalah,
        hadithNumber: s.metadata.hadith_number,
        category: s.metadata.category, // د مأخذ د المارۍ (فن) پېژندنه
      },
    })),
    model: data.model,
    latency_ms: data.latency_ms,
  };
}

export async function getQueueStats() {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/queue`);
  if (!res.ok) throw new Error(await readApiError(res));
  const d = await res.json();
  return {
    totalBooks: parseInt(d.total_books),
    totalChunks: parseInt(d.total_chunks),
    embeddedChunks: parseInt(d.embedded_chunks),
    queuedChunks: parseInt(d.queued_chunks),
    rateLimit: d.rate_per_sec,
    backoffStrategy: `Exponential (1s → 2s → 4s … حد اعظمي ۶۰ ثانيي)`,
    workerStatus: d.worker_status,
    lastEmbeddedAt: d.last_embedded_at || "اوس مهال",
  };
}

export async function getBooks() {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/books`);
  if (!res.ok) throw new Error(await readApiError(res));
  const d = await res.json();
  return d.books.map((b: any) => ({
    id: String(b.id),
    title: b.title,
    author: b.author,
    totalChunks: b.total_chunks,
    embeddedChunks: b.embedded_chunks,
    queuedChunks: b.queued_chunks,
    uploadedAt: new Date(b.uploaded_at).toLocaleDateString("ar"),
    status: b.status,
    category: b.category || "فقه", // د کتاب المارۍ چي په اډمن پینل کي یې جلا کوي
  }));
}

// د کتاب اپلوډ کولو اصلاح سوی فنکشن د نويو فیلډونو سره
export async function uploadBook(payload: {
  title: string;
  author: string;
  publisher?: string;
  edition?: string;
  defaultVolume?: string;
  text: string;
  category: string;     // المارۍ (فن)
  customRule?: string;   // ځانګړي اصول
  folderName?: string;   // د مجلداتو فولډر نوم
  file?: File | null;
}) {
  requireApiBase();

  if (payload.file) {
    const form = new FormData();
    form.set("title", payload.title);
    form.set("author", payload.author);
    form.set("publisher", payload.publisher || "");
    form.set("edition", payload.edition || "");
    form.set("defaultVolume", payload.defaultVolume || "");
    form.set("category", payload.category);
    form.set("customRule", payload.customRule || "");
    form.set("folderName", payload.folderName || "");
    form.set("file", payload.file);

    const res = await fetch(`${API_BASE}/api/books/upload`, {
      method: "POST",
      body: form,
    });
    if (!res.ok) throw new Error(await readApiError(res));
    return res.json();
  }

  const res = await fetch(`${API_BASE}/api/books/upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function getFatwaHistory(limit = 20): Promise<AskResponse[]> {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/ask/history?limit=${limit}`);
  if (!res.ok) throw new Error(await readApiError(res));
  const d = await res.json();
  return (d.items || []).map((r: any) => ({
    question: r.question,
    answer: r.answer,
    sources: [],
    model: r.model,
    latency_ms: r.latency_ms,
  }));
}

// ============================================================
// د کټګوريو او الماريو (Categories) مديريت
// ============================================================

export async function fetchCategories() {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/categories`);
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json(); // دا د الماريو لیست راباسي
}

// ============================================================
// د اې آی د قوانينو او مغز مديريت
// ============================================================

export async function getAiRules() {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/rules`);
  if (!res.ok) throw new Error(await readApiError(res));
  const d = await res.json();
  return d.rules || [];
}

export async function addAiRule(rule_text: string) {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/rules`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rule_text }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function updateAiRule(id: string, is_active: boolean) {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/rules/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function deleteAiRule(id: string) {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/rules/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

// ============================================================
// د خطا لوستلو مرستندوی
// ============================================================
async function readApiError(res: Response) {
  try {
    const data = await res.json();
    return data?.error || data?.detail || `API error ${res.status}`;
  } catch {
    return `API error ${res.status}`;
  }
}
