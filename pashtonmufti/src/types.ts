export type ChunkMetadata = {
  bookName: string;
  author: string;
  publisher?: string;
  volume?: string;
  page?: string;
  kitab?: string;
  fasl?: string;
  masalah?: string;
  hadithNumber?: string;
};

export type BookStatus = {
  id: string;
  title: string;
  author: string;
  totalChunks: number;
  embeddedChunks: number;
  queuedChunks: number;
  uploadedAt: string;
  status: "processing" | "complete" | "queued" | "paused" | "failed";
};

export type FatwaSource = {
  arabicText: string;
  similarity: number;
  metadata: ChunkMetadata;
};

export type Fatwa = {
  question: string;
  answer: string;
  sources: FatwaSource[];
};