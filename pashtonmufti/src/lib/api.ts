// ============================================================
// د بېک انډ API کلائنټ — نړيوال او متحرک پُل (د امنيتي ټوکن سره)
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

function getAuthHeaders(isJson = true) {
  const token = localStorage.getItem("mufti_token") || "";
  const headers: Record<string, string> = {
    "x-admin-token": token,
  };
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export type AskResponse = Fatwa & { model?: string; latency_ms?: number };

export async function loginAdmin(email: string, password: string) {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = await res.json();
  if (data.token) {
    localStorage.setItem("mufti_token", data.token);
  }
  return data;
}

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
        category: s.metadata.category,
      },
    })),
    model: data.model,
    latency_ms: data.latency_ms,
  };
}

// ------------------------------------------------------------
// 🔥 نوی پُل: له بېک انډ څخه د غوره ۱۰ متحرکو پوښتنو راوستل
// ------------------------------------------------------------
export async function getSuggestedQuestions(): Promise<string[]> {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/ask/suggested`);
  if (!res.ok) throw new Error(await readApiError(res));
  const data = await res.json();
  return data.questions || [];
}

export async function getQueueStats() {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/queue`, {
    headers: getAuthHeaders(false),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function getBooks() {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/books`, {
    headers: getAuthHeaders(false),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const d = await res.json();
  return d.books.map((b: any) => ({
    id: String(b.id),
    title: b.title,
    author: b.author,
    totalChunks: parseInt(b.total_chunks || "0", 10),
    embeddedChunks: parseInt(b.embedded_chunks || "0", 10), // 🛠️ په پوره کمال سره په سنيک_کېس اصلاح سو ترڅو سکرین سپین نه سي
    queuedChunks: parseInt(b.queued_chunks || "0", 10),
    uploadedAt: new Date(b.uploaded_at).toLocaleDateString("ar"),
    status: b.status,
    category: b.category || "فقه",
  }));
}

export async function uploadBook(payload: {
  title: string;
  author: string;
  publisher?: string;
  edition?: string;
  defaultVolume?: string;
  text: string;
  category: string;
  customRule?: string;
  folderName?: string;
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
      headers: getAuthHeaders(false),
      body: form,
    });
    if (!res.ok) throw new Error(await readApiError(res));
    return res.json();
  }

  const res = await fetch(`${API_BASE}/api/books/upload`, {
    method: "POST",
    headers: getAuthHeaders(true),
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

export async function fetchCategories() {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/categories`, {
    headers: getAuthHeaders(false),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function addCategory(name: string, parent_id?: number | null, sort_order?: number) {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/categories`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify({ name, parent_id, sort_order }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function deleteBook(id: string) {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/books/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(false),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function getAiRules() {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/rules`, {
    headers: getAuthHeaders(false),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const d = await res.json();
  return d.rules || [];
}

export async function addAiRule(rule_text: string) {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/rules`, {
    method: "POST",
    headers: getAuthHeaders(true),
    body: JSON.stringify({ rule_text }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function updateAiRule(id: string, is_active: boolean) {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/rules/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(true),
    body: JSON.stringify({ is_active }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

export async function deleteAiRule(id: string) {
  requireApiBase();
  const res = await fetch(`${API_BASE}/api/admin/rules/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(false),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json();
}

async function readApiError(res: Response) {
  try {
    const data = await res.json();
    return data?.error || data?.detail || `API error ${res.status}`;
  } catch {
    return `API error ${res.status}`;
  }
}

