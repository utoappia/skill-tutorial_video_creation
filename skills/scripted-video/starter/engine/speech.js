// Words that are spoken and words that are shown: how long a line takes to
// say, what a voice should actually read, and how a long caption is split.

/** Characters read as one unit each: CJK ideographs, kana, hangul syllables. */
const SYLLABIC = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/g;
const KANA = /[぀-ヿ]/g;
const HANGUL = /[가-힯]/g;
/** Thai letters (not the marks written over or under them): Thai has no spaces between words. */
const THAI_LETTER = /[ก-ะาำเ-ๆ๐-๙]/g;
const THAI = /[฀-๿]+/g;
const PAUSE = /[.!?;:。！？；：…]+|[,，、]/g;

/**
 * A rough speaking time for a line, used until a real voice has been measured.
 * `rate` is the voice's speed (1 = normal, 0.9 = a little slower).
 * Defaults: about 165 words a minute for spaced scripts.
 */
export function estimateSpeechDuration(text, options = {}) {
  const { wordsPerSecond = 2.75, charsPerSecond = 4.5, kanaPerSecond = 7, hangulPerSecond = 6, thaiPerSecond = 13, rate = 1 } = options;
  const kana = (text.match(KANA) ?? []).length;
  const hangul = (text.match(HANGUL) ?? []).length;
  const han = (text.match(SYLLABIC) ?? []).length - kana - hangul;
  const thai = (text.match(THAI_LETTER) ?? []).length;
  const syllabic = han / charsPerSecond + kana / kanaPerSecond + hangul / hangulPerSecond + thai / thaiPerSecond;
  const rest = text.replace(SYLLABIC, ' ').replace(THAI, ' ');
  const words = rest.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const pauses = (text.match(PAUSE) ?? []).reduce((sum, p) => sum + (/[,，、]/.test(p) ? 0.1 : 0.25), 0);
  return Math.max(0.3, (syllabic + words / wordsPerSecond + pauses) / Math.max(0.1, rate));
}

/** Words in a line (a CJK character or Thai letter group counts as one). */
export function wordCount(text) {
  const syllabic = (text.match(SYLLABIC) ?? []).length;
  const rest = text.replace(SYLLABIC, ' ');
  return syllabic + rest.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

const UNSPACED = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const WORD_CHAR = '(?:(?![\\p{Script=Han}\\p{Script=Hangul}\\p{Script=Hiragana}\\p{Script=Katakana}])[\\p{L}\\p{N}])';
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Does a pronunciation entry apply to this language? ("en" applies to "en-GB".) */
function matchesLanguage(p, language) {
  if (!p.language) return true;
  const want = p.language.toLowerCase();
  const have = String(language).toLowerCase();
  return have === want || have.startsWith(`${want}-`);
}

/**
 * The text a voice should read: `text` with every pronunciation entry
 * `{ text, say, language?, matchCase? }` replaced by its `say`. The caption
 * keeps the written form ("3.5%", "CO2", a surname); the voice gets the
 * spoken one ("three and a half percent", "C O two", a respelling).
 * Longer entries win over shorter ones they contain; entries match whole words.
 */
export function spokenText(text, pronunciations = [], language = 'en') {
  const list = pronunciations
    .filter((p) => p && p.say !== undefined && p.text && matchesLanguage(p, language))
    .sort((a, b) => b.text.length - a.text.length);
  let out = text;
  for (const p of list) {
    const bounded = !UNSPACED.test(p.text);
    const body = escapeRegExp(p.text);
    const pattern = new RegExp(bounded ? `(?<!${WORD_CHAR})${body}(?!${WORD_CHAR})` : body, p.matchCase ? 'gu' : 'giu');
    out = out.replace(pattern, () => p.say);
  }
  return out;
}

/** Width units of a caption: wide (East Asian) characters count 2, everything else 1. */
export function captionUnits(text) {
  let units = 0;
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    const wide =
      cp >= 0x1100 &&
      (cp <= 0x115f || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) || (cp >= 0xffe0 && cp <= 0xffe6));
    units += wide ? 2 : 1;
  }
  return units;
}

/** Sentences with their trailing space ("0.5" and "e.g" inside a word stay whole). */
function sentences(text) {
  const out = [];
  const re = /[.!?]["'”’)]*\s+|[。！？][」』”’)）]*\s*/g;
  let from = 0;
  for (let m = re.exec(text); m; m = re.exec(text)) {
    const end = m.index + m[0].length;
    if (end < text.length) {
      out.push(text.slice(from, end));
      from = end;
    }
  }
  out.push(text.slice(from));
  return out.filter((s) => s.trim().length > 0);
}

/** A sentence longer than `maxUnits`, cut at the comma, colon or semicolon that gives the most even halves. */
function clauses(sentence, maxUnits) {
  if (captionUnits(sentence.trim()) <= maxUnits) return [sentence];
  const re = /[,;:]\s+|[，、；：]/g;
  let best = null;
  for (let m = re.exec(sentence); m; m = re.exec(sentence)) {
    const at = m.index + m[0].length;
    if (at >= sentence.trimEnd().length) continue;
    const worst = Math.max(captionUnits(sentence.slice(0, at).trim()), captionUnits(sentence.slice(at).trim()));
    if (!best || worst < best.worst) best = { at, worst };
  }
  if (!best) return [sentence];
  return [...clauses(sentence.slice(0, best.at), maxUnits), ...clauses(sentence.slice(best.at), maxUnits)];
}

/** `text` in parts of at most `maxUnits` where it can be split (sentence ends first, then clauses). */
export function splitCaption(text, maxUnits = 84) {
  if (captionUnits(text) <= maxUnits) return [text];
  const parts = [];
  let current = '';
  for (const s of sentences(text).flatMap((x) => clauses(x, maxUnits))) {
    if (current && captionUnits((current + s).trim()) > maxUnits) {
      parts.push(current.trim());
      current = s;
    } else current += s;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

// --- Readability (English) ----------------------------------------------------

function syllables(word) {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/**
 * Flesch-Kincaid grade of English text (US school grade: 3 ≈ an 8-year-old),
 * with the longest sentences and the long words, to find what to rewrite.
 */
export function readability(text) {
  const parts = text.split(/(?<=[.!?]["'”’)]?)\s+/) // a sentence may end inside quotation marks
   .map((s) => s.trim()).filter(Boolean);
  const words = text.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  if (words.length === 0 || parts.length === 0) return { grade: 0, words: 0, sentences: 0, longSentences: [], longWords: [] };
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  const grade = 0.39 * (words.length / parts.length) + 11.8 * (syl / words.length) - 15.59;
  const longWords = [...new Set(words.map((w) => w.replace(/[^A-Za-z'-]/g, '')).filter((w) => syllables(w) >= 4).map((w) => w.toLowerCase()))];
  const longSentences = parts.filter((s) => s.split(/\s+/).length > 18);
  return { grade: Math.round(grade * 10) / 10, words: words.length, sentences: parts.length, longSentences, longWords };
}
