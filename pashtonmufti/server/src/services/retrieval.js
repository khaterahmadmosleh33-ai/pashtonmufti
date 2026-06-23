// ============================================================
// د هايبرېډ لټون خدمت (Hybrid Retrieval)
// ============================================================
// د pgvector د cosine similarity +
// د عربي متن د keyword bonus سره
// ============================================================

import { pool, toVectorLiteral } from "../db/pool.js";

const TOP_K = parseInt(process.env.TOP_K || "25", 10);
const MIN_SIMILARITY = parseFloat(
  process.env.MIN_SIMILARITY || "0.45"
);

/**
 * د کليدي کلمې پاکول
 */
function normalizeKeyword(keyword = "") {
  return keyword.trim();
}

/**
 * د هايبرېډ لټون
 *
 * @param {number[]} queryVector
 * @param {string} keyword
 * @returns {Promise<Array>}
 */
export async function hybridSearch(queryVector, keyword = "") {
  const vecLiteral = toVectorLiteral(queryVector);
  const searchKeyword = normalizeKeyword(keyword);

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

      (
        1 - (embedding <=> $1::vector)
      ) AS similarity,

      CASE
        WHEN $3 <> ''
         AND (
           arabic_text ILIKE '%' || $3 || '%'
           OR COALESCE(kitab,'') ILIKE '%' || $3 || '%'
           OR COALESCE(fasl,'') ILIKE '%' || $3 || '%'
           OR COALESCE(masalah,'') ILIKE '%' || $3 || '%'
         )
        THEN 0.10
        ELSE 0
      END AS keyword_bonus

    FROM chunks
    WHERE embedding IS NOT NULL

    ORDER BY
      (
        (1 - (embedding <=> $1::vector))
        +
        CASE
          WHEN $3 <> ''
           AND (
             arabic_text ILIKE '%' || $3 || '%'
             OR COALESCE(kitab,'') ILIKE '%' || $3 || '%'
             OR COALESCE(fasl,'') ILIKE '%' || $3 || '%'
             OR COALESCE(masalah,'') ILIKE '%' || $3 || '%'
           )
          THEN 0.10
          ELSE 0
        END
      ) DESC

    LIMIT $2
  `;

  const { rows } = await pool.query(sql, [
    vecLiteral,
    TOP_K,
    searchKeyword,
  ]);

  return rows
    .filter(
      (r) =>
        parseFloat(r.similarity || 0) >= MIN_SIMILARITY
    )
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
