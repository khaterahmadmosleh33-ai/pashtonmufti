// ============================================================
// د عربي کتابونو نړيوال چنکر (فقه، تفسير، حديث، تاريخ او سيرت)
// ============================================================
// اساسي اصل: هيڅکله د کلمو پر شمېر ړوند پرې کول نه کيږي.
// د کتاب جوړښت د فن مطابق (فقه، تفسير، سيرت) پرې کيږي.
// نوی والی: د اډمن د ځانګړو اصولو (customRule) مطلق مراعتول!
// ============================================================

// د ټولو اسلامي علومو لپاره د عمومي Regex نمونې (نړيوال اصول)
const HEADING_PATTERNS = [
  // لومړۍ کچه (کتاب، سورة، د تاريخ کال)
  { kind: "kitab",   re: /^\s*(?:[\(\[【]?\s*)?(?:كِتَابُ?|كتاب|سُورَةُ?|سورة|عَامَ?|عام|سَنَةَ?|سنة)\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  
  // دوهمه کچه (باب، فصل، د سيرت غزا، تفسير)
  { kind: "bab",     re: /^\s*(?:[\(\[【]?\s*)?(?:بَابُ?|باب)\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  { kind: "fasl",    re: /^\s*(?:[\(\[【]?\s*)?(?:فَصْلٌ?|فَصْلُ?|فصل|تَفْسِيرُ?|تفسير|غَزْوَةُ?|غزوة|سَرِيَّةُ?|سرية)(?:\s+(?:فِي|في))?\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  { kind: "mabhath", re: /^\s*(?:[\(\[【]?\s*)?(?:مَبْحَثٌ?|مبحث)\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  
  // درېيمه کچه (مسألة، مطلب، فرع، آية، حديث، د تاريخ ذکر)
  { kind: "matlab",  re: /^\s*(?:[\(\[【]?\s*)?(?:مَطْلَبٌ?|مطلب)(?:\s+(?:فِي|في))?\s+(.+?)\s*(?:[\)\]】])?\s*$/m },
  { kind: "masalah", re: /^\s*(?:[\(\[【]?\s*)?(?:مَسْأَلَةٌ?|مسألة|مَسْئَلَةٌ?|مسئلة|آيَةٌ?|آية|ذِكْرُ?|ذكر)\s*[:\-،]?\s*(.+?)?\s*(?:[\)\]】])?\s*$/m },
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
 * د عربي متن د فقهي جوړښت يا اډمن د ځانګړو اصولو پر بنسټ په بشپړو ټوټو پرې کول.
 *
 * @param {string} rawText - د کتاب بشپړ متن
 * @param {object} bookMeta - د کتاب اساسي ميټاډېټا
 * @param {string} bookMeta.bookName
 * @param {string} bookMeta.author
 * @param {string} [bookMeta.publisher]
 * @param {string} [bookMeta.defaultVolume]
 * @param {string} [bookMeta.category]
 * @param {string} [bookMeta.customRule]
 * @param {string} [bookMeta.folderName]
 * @returns {Array<Chunk>}
 */
export function chunkArabicFiqhText(rawText, bookMeta) {
  if (!rawText || !rawText.trim()) return [];
  if (!bookMeta?.bookName || !bookMeta?.author) {
    throw new Error("د کتاب نوم او مصنف د چنکنګ لپاره حتمي دي");
  }

  // ۱. د متحرکو اصولو (Dynamic Rules) ماشين جوړول
  let customRegex = null;
  if (bookMeta.customRule && bookMeta.customRule.trim()) {
    // اډمن کولای سي څو اصول په کامه (،) جلا کړي لکه: "سورة, آية" يا "سنة, غزوة"
    const ruleWords = bookMeta.customRule.split(/[,،]/).map(w => w.trim()).filter(Boolean);
    if (ruleWords.length > 0) {
      const rulePattern = ruleWords.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      customRegex = new RegExp(`^\\s*(?:[\\(\\[【]?\\s*)?(?:${rulePattern})\\b(?:\\s*[:\\-،]?\\s*(.+?))?\\s*(?:[\\)\\]】])?\\s*$`, 'm');
    }
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
    customHeading: undefined, // د اډمن د خاصو اصولو ساتلو لپاره
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
        // د ډېټابېس د خونديتوب لپاره نوي کلمات په زړو کالمونو کي ځای پر ځای کوو
        kitab: state.kitab,
        fasl: state.customHeading || state.fasl || state.mabhath || state.bab,
        masalah: state.masalah || state.matlab || state.fara,
        hadith_number: hadithNumber,
        category: bookMeta.category || "فقه", // د فن يا المارۍ نوم
        extra: {
          opened_by: chunkOpenedBy,
          custom_rule_applied: !!state.customHeading,
          folder_name: bookMeta.folderName || null,
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

    // ۲. لومړی د اډمن ځانګړي اصول (Custom Rules) ګورو چي مطلق واک لري
    if (customRegex) {
      const customMatch = line.match(customRegex);
      if (customMatch) {
        flush("custom_rule");
        buffer.push(line);
        state.customHeading = (customMatch[1] || "ځانګړی اصل").trim();
        continue; // کرښه د خاص قانون په واسطه پرې سوه، نو عمومي ته نه ځي
      }
    }

    // ۳. که ځانګړی قانون نه وي، د ټولو علومو عمومي اصول ګورو
    const heading = detectHeading(line);
    if (heading) {
      // د بشپړ مسألې / فرع په پيل کي چنک پرې کوو
      if (["masalah", "fara", "matlab"].includes(heading.kind)) {
        flush(heading.kind);
        buffer.push(line);
        if (heading.kind === "masalah") state.masalah = heading.title || "موضوع";
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
          state.bab = state.fasl = state.mabhath = state.masalah = state.matlab = state.fara = state.customHeading = undefined;
          break;
        case "bab":
          state.bab = heading.title;
          state.fasl = state.mabhath = state.masalah = state.matlab = state.fara = state.customHeading = undefined;
          break;
        case "fasl":
          state.fasl = heading.title;
          state.mabhath = state.masalah = state.matlab = state.fara = state.customHeading = undefined;
          break;
        case "mabhath":
          state.mabhath = heading.title;
          state.masalah = state.matlab = state.fara = state.customHeading = undefined;
          break;
      }
      continue;
    }

    // ۴. عادي کرښي بفر ته اضافه کوو
    buffer.push(line);

    // ۵. د خورا اوږدو متنونو طبيعي پرې کېدل (له ۳۰۰۰ تورو څخه زيات)
    if (buffer.join("\n").length > 3000) {
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
 * @property {string} [category]
 * @property {object} [extra]
 */
