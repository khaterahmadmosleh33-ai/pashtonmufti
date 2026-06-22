// ============================================================
// د عربي فقهي چنکر (Chunker)
// ============================================================
// اساسي اصل: هيڅکله د کلمو پر شمېر ړوند پرې کول نه کيږي.
// د کتاب جوړښت (کتاب → باب → فصل → مبحث → مطلب → مسأله → فرع)
// د پرې کولو بنسټ دی. هره ټوټه يوه بشپړه او نه پرې کېدونکې فقهي
// مسأله ده ترڅو د جواب باوري کول وسي.
// ============================================================

// د فقهي عناوينو لپاره د Regex نمونې.
// د عربي د واول نښو سره (تشکيل) او پرته نه يي پېژني.
const HEADING_PATTERNS = [
  // د «کتاب الـ…» نمونه
  { kind: "kitab",   re: /^\s*(?:[\(\[【]?\s*)?(?:كِتَابُ?|كتاب)\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  // د «بابُ …»
  { kind: "bab",     re: /^\s*(?:[\(\[【]?\s*)?(?:بَابُ?|باب)\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  // د «فصلٌ في…»
  { kind: "fasl",    re: /^\s*(?:[\(\[【]?\s*)?(?:فَصْلٌ?|فَصْلُ?|فصل)(?:\s+(?:فِي|في))?\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  // د «مبحث»
  { kind: "mabhath", re: /^\s*(?:[\(\[【]?\s*)?(?:مَبْحَثٌ?|مبحث)\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  // د «مطلبٌ في…»
  { kind: "matlab",  re: /^\s*(?:[\(\[【]?\s*)?(?:مَطْلَبٌ?|مطلب)(?:\s+(?:فِي|في))?\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  // د «مسألةٌ» — تر ټولو مهمه نښه
  { kind: "masalah", re: /^\s*(?:[\(\[【]?\s*)?(?:مَسْأَلَةٌ?|مسألة|مَسْئَلَةٌ?|مسئلة)\s*[:\-،]?\s*(.+?)?\s*(?:[\)\]】])?\s*$/m },
  // د «فرعٌ»
  { kind: "fara",    re: /^\s*(?:[\(\[【]?\s*)?(?:فَرْعٌ?|فرع)\s*[:\-،]?\s*(.+?)?\s*(?:[\)\]】])?\s*$/m },
];

// د حديث د شمېرې بياموندنه (لکه «حديث رقم: ٤٥٢»)
const HADITH_NUMBER_RE = /(?:حديث|الحديث|رقم الحديث|رقم)\s*(?:رقم|:)?\s*([٠-٩0-9]{1,6})/;

// د جلد او مخ بياموندنه (د pageheader يا footnote څخه)
const VOLUME_RE = /(?:ج|جـ|جلد|الجزء|ج\.)\s*\.?\s*([٠-٩0-9IVXLC]{1,5})/i;
const PAGE_RE   = /(?:ص|مخ|صفحة|ص\.)\s*\.?\s*([٠-٩0-9]{1,6})/;

/**
 * د عربي د هندي عددونو په لاتيني بدلول.
 * مثلاً: «۴۵۲» → «452».
 */
function normalizeArabicDigits(str) {
  if (!str) return str;
  const map = { "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
                "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9" };
  return str.replace(/[٠-٩۰-۹]/g, (d) => map[d] || d);
}

/**
 * د يوې کرښي د عنوان پېژندنه. که عنوان وي، کنډک (kind) او متن بېرته رالېږي.
 */
function detectHeading(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 160) return null; // عنوانونه معمولاً لنډ وي
  for (const { kind, re } of HEADING_PATTERNS) {
    const m = trimmed.match(re);
    if (m) {
      return { kind, title: (m[1] || "").trim() };
    }
  }
  return null;
}

/**
 * د pagebreak نښي پېژني (لکه «[ص ۴۵]» يا «(ج۱/۲۳)»).
 */
function detectPageMarker(line) {
  const v = line.match(VOLUME_RE);
  const p = line.match(PAGE_RE);
  if (!v && !p) return null;
  return {
    volume: v ? normalizeArabicDigits(v[1]) : undefined,
    page:   p ? normalizeArabicDigits(p[1]) : undefined,
  };
}

/**
 * د عربي متن د فقهي جوړښت پر بنسټ په بشپړو ټوټو پرې کول.
 *
 * @param {string} rawText - د کتاب بشپړ متن
 * @param {object} bookMeta - د کتاب اساسي ميټاډېټا
 * @param {string} bookMeta.bookName
 * @param {string} bookMeta.author
 * @param {string} [bookMeta.publisher]
 * @param {string} [bookMeta.defaultVolume]
 * @returns {Array<Chunk>}
 */
export function chunkArabicFiqhText(rawText, bookMeta) {
  if (!rawText || !rawText.trim()) return [];
  if (!bookMeta?.bookName || !bookMeta?.author) {
    throw new Error("د کتاب نوم او مصنف د چنکنګ لپاره حتمي دي");
  }

  const lines = rawText.split(/\r?\n/);

  /** @type {Array<Chunk>} */
  const chunks = [];

  // د اوسني جوړښتي حالت ساتنه
  let state = {
    kitab: undefined,
    bab: undefined,
    fasl: undefined,
    mabhath: undefined,
    matlab: undefined,
    masalah: undefined,
    fara: undefined,
    volume: bookMeta.defaultVolume,
    page: undefined,
    hadithNumber: undefined,
  };

  // د اوسني چنک د کرښو بفر
  let buffer = [];
  let chunkOpenedBy = null; // کوم عنوان دا چنک پيل کړی

  // د چنک د ختمولو او ساتلو لپاره مرستياله
  const flush = (newOpener) => {
    const text = buffer.join("\n").trim();
    if (text.length >= 40) {
      // د حديث شمېره د چنک په متن کي ولټوه
      const hm = text.match(HADITH_NUMBER_RE);
      const hadithNumber = hm ? normalizeArabicDigits(hm[1]) : state.hadithNumber;

      chunks.push({
        arabic_text: text,
        book_name: bookMeta.bookName,
        author: bookMeta.author,
        publisher: bookMeta.publisher,
        volume: state.volume,
        page: state.page,
        kitab: state.kitab,
        // د «باب» او «کتاب» يو ځای: که باب وي، هغه به د kitab په کالم کي وي،
        // او «fasl» به د فصل/مبحث وي.
        fasl: state.fasl || state.mabhath || state.bab,
        masalah: state.masalah || state.matlab || state.fara,
        hadith_number: hadithNumber,
        extra: {
          opened_by: chunkOpenedBy,
          bab: state.bab,
          mabhath: state.mabhath,
          matlab: state.matlab,
          fara: state.fara,
        },
      });
    }
    buffer = [];
    chunkOpenedBy = newOpener || null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      buffer.push("");
      continue;
    }

    // ۱. د pagebreak نښه — يوازي حالت پاکوي، نه چنک پرې کوي
    const pageInfo = detectPageMarker(line);
    if (pageInfo && line.length < 30) {
      if (pageInfo.volume) state.volume = pageInfo.volume;
      if (pageInfo.page) state.page = pageInfo.page;
      continue;
    }

    // ۲. د عنوان پېژندنه
    const heading = detectHeading(line);
    if (heading) {
      // د بشپړ مسألې / فرع په پيل کي چنک پرې کوو — ترڅو هره مسأله يوه ټوټه وي
      if (["masalah", "fara", "matlab"].includes(heading.kind)) {
        flush(heading.kind);
        // د عنوان متن د اوسني چنک د لومړۍ کرښي په توګه ساتو
        buffer.push(line);
        // د جوړښتي حالت تازه کول
        if (heading.kind === "masalah") state.masalah = heading.title || "مسألة";
        if (heading.kind === "fara")    state.fara    = heading.title || "فرع";
        if (heading.kind === "matlab")  state.matlab  = heading.title || "مطلب";
        continue;
      }

      // د «کتاب»/«باب»/«فصل»/«مبحث» نښي يوازي حالت بدلوي او چنک هم پرې کوي
      flush(heading.kind);
      buffer.push(line);
      switch (heading.kind) {
        case "kitab":
          state.kitab = heading.title;
          state.bab = state.fasl = state.mabhath = undefined;
          state.masalah = state.matlab = state.fara = undefined;
          break;
        case "bab":
          state.bab = heading.title;
          state.fasl = state.mabhath = undefined;
          state.masalah = state.matlab = state.fara = undefined;
          break;
        case "fasl":
          state.fasl = heading.title;
          state.mabhath = undefined;
          state.masalah = state.matlab = state.fara = undefined;
          break;
        case "mabhath":
          state.mabhath = heading.title;
          state.masalah = state.matlab = state.fara = undefined;
          break;
      }
      continue;
    }

    // ۳. د عادي کرښي په حال کي د بفر ته اضافه کوو
    buffer.push(line);

    // د خوندي پاتي کېدلو لپاره: که چيري يو چنک د معقولي اندازې (مثلاً ۳۰۰۰
    // توري) څخه ډېر سو او هيڅ عنوان ونه راغی، نو په طبيعي وقفه (د «.» يا
    // «؟» يا فقرې په پای) کي يي پرې کوو ترڅو ډېر اوږد ويکټورونه ونه جوړ سي.
    if (buffer.join("\n").length > 3000) {
      // ولټوه چي د بفر په پای کي يوه فقره ختمه ده که نه
      const joined = buffer.join("\n");
      const lastBreak = Math.max(joined.lastIndexOf("."), joined.lastIndexOf("؟"), joined.lastIndexOf("!"));
      if (lastBreak > 1500) {
        const keep = joined.slice(0, lastBreak + 1);
        const carry = joined.slice(lastBreak + 1).trim();
        buffer = [keep];
        flush("auto-split");
        if (carry) buffer.push(carry);
      }
    }
  }

  // د پاتي بفر ساتل
  flush(null);

  return chunks;
}

/**
 * @typedef {Object} Chunk
 * @property {string} arabic_text
 * @property {string} book_name
 * @property {string} author
 * @property {string} [publisher]
 * @property {string} [volume]
 * @property {string} [page]
 * @property {string} [kitab]
 * @property {string} [fasl]
 * @property {string} [masalah]
 * @property {string} [hadith_number]
 * @property {object} [extra]
 */
