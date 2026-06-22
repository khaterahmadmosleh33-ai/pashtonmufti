// ============================================================
// د هايبرېډ لټون خدمت (Hybrid Retrieval)
// ============================================================
// د pgvector د cosine distance (`<=>`) سره يو ځای د عربي د trigram لټون
// ترڅو معتبري نتيجي راپورته سي.
// ============================================================

import { pool, toVectorLiteral } from "../db/pool.js";

const TOP_K = parseInt(process.env.TOP_K || "8", 10);
const MIN_SIMILARITY = parseFloat(process.env.MIN_SIMILARITY || "0.55");

/**
 * د هايبرېډ لټون — د ويکټور لټون + د کلمو لټون (په عربي کي).
 *
 * @param {number[]} queryVector — د کاروونکي پوښتني ويکټور (۷۶۸ بُعده)
 * @param {string} [keyword]    — اختياري عربي کليدي کلمه د فلټر لپاره
 * @returns {Promise<Array>}
 */
export async function hybridSearch(queryVector, keyword) {
  const vecLiteral = toVectorLiteral(queryVector);

  // د cosine similarity = 1 - cosine_distance
  // د `<=>` اپرېټر د pgvector د cosine distance دی.
  const sql = `
    SELECT
      id,
      arabic_text,
      book_name,
      author,
      publisher,
      volume,
      page,
      kitab,
      fasl,
      masalah,
      hadith_number,
      1 - (embedding <=> $1::vector) AS similarity
    FROM chunks
    WHERE embedding IS NOT NULL
      ${keyword ? "AND arabic_text % $3" : ""}
    ORDER BY embedding <=> $1::vector
    LIMIT $2
  `;

  const params = keyword
    ? [vecLiteral, TOP_K, keyword]
    : [vecLiteral, TOP_K];

  const { rows } = await pool.query(sql, params);

  // د لږ تر لږه ورته والي پر بنسټ فلټر
  return rows
    .filter((r) => r.similarity >= MIN_SIMILARITY)
    .map((r) => ({
      id: r.id,
      arabic_text: r.arabic_text,
      similarity: parseFloat(r.similarity),
      metadata: {
        book_name: r.book_name,
        author: r.author,
        publisher: r.publisher,
        volume: r.volume,
        page: r.page,
        kitab: r.kitab,
        fasl: r.fasl,
        masalah: r.masalah,
        hadith_number: r.hadith_number,
      },
    }));
}
