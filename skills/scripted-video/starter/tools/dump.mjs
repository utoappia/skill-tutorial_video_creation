#!/usr/bin/env node
// Prints a video the way a viewer meets it: every spoken line, word card,
// on-screen text, pointer and pause, in the order and at the time it happens.
// This is what a reviewer reads; nobody should review the source file.
//
//   node tools/dump.mjs intro                    the watch-order transcript
//   node tools/dump.mjs intro --lang fr
//   node tools/dump.mjs intro --claims           everything said and shown, as a table to check against sources
//                                                (numbers, names and strong words like "always" are marked: check those first)
//   node tools/dump.mjs intro --quotes           every quotation spoken, and whether the research notes (notes/<id>/research/*.md)
//                                                hold it word for word: the ones that are not there are listed first
//   node tools/dump.mjs intro --figures          every figure said or shown that is not in the research notes as written
//                                                (a rounding, a sum of your own, a slip, or a figure with no source)
//   node tools/dump.mjs intro --chapters         the chapter list, ready to paste into a video description
//   node tools/dump.mjs intro --chapters --main  the same without the chapters inside deep details (the short list of a long video)
//   node tools/dump.mjs intro --text             the narration only, as plain paragraphs (for a voice artist)
//   node tools/dump.mjs intro --details          the parts that can be left out (kit: v.detail), with how long each is
//                                                and how to leave it out: the list to hand over with a detailed video
//   node tools/dump.mjs intro --omit a,b         any of the above with those details left out
//   node tools/dump.mjs intro > review/intro.txt
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { chapterClock, clock, compileVideo, deepChapters, loadVideo, main, parseArgs, pickVideos, ROOT, voiceFor } from './lib.mjs';

const args = parseArgs();
const TEXT_KEYS = new Set(['text', 'word', 'meaning', 'example', 'sounds', 'question', 'hint', 'heading', 'items', 'title', 'label', 'labels', 'code', 'source', 'name']);

/** The words a viewer would read in some props or command args. */
function words(value, key, out = []) {
  if (typeof value === 'string') {
    if (TEXT_KEYS.has(key) && value.trim()) out.push(value.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim());
  } else if (Array.isArray(value)) value.forEach((v) => words(v, key, out));
  else if (value && typeof value === 'object') {
    if (value.hidden === true || value.opacity === 0) return out; // not visible yet: it is listed when a command shows it
    for (const [k, v] of Object.entries(value)) words(v, k, out);
  }
  return out;
}
const flat = (text) => String(text ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
/** The words a scene's `set` command brings on screen: nodes that appear, and nodes whose words change. */
function revealed(c) {
  const out = [];
  for (const id of Object.keys(c.args?.nodes ?? {})) {
    const from = c.from?.nodes?.[id];
    const to = c.to?.nodes?.[id];
    const seen = (n) => n && !n.hidden && n.opacity !== 0 && typeof n.text === 'string' && n.text.trim();
    if (seen(to) && (!seen(from) || from.text !== to.text)) out.push(flat(to.text));
  }
  return out;
}
const brief = (value) => {
  const s = JSON.stringify(value);
  return s.length > 90 ? `${s.slice(0, 90)}…` : s;
};
const stamp = (t) => clock(t).padStart(7);
/** Everything a viewer reads on screen, with the time it arrives: [{ t, id, text }]. */
const onScreen = (tl) => [
  ...tl.layers.flatMap((L) => (L.module === 'chart' ? [] : words(L.props).map((text) => ({ t: L.start, id: L.id, text })))),
  ...tl.layers.flatMap((L) => L.commands.flatMap((c) => (L.module === 'scene' && c.name === 'set' ? revealed(c) : words(c.args)).map((text) => ({ t: c.start, id: L.id, text })))),
];

// What makes a statement risky: a number (in digits or in words), a strong word, or a name.
const NUMBER = /\d|%|\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|\w+teen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|percent|half|twice|double|dozen)\b/i;
// Absolute words always count; a superlative only as a claim ("the first", "its largest"), not as a
// description ("a first guess", "most of us").
const STRONG = /\b(only|never|always|every|all|none|no one|nobody|everyone|invented|discovered|founded|proved|proves|causes?|caused|because|average|record|must|cannot|impossible)\b|\b(the|its|his|her|their|our|world's)\s+(very\s+)?(first|last|biggest|largest|smallest|fastest|slowest|oldest|newest|most|least|best|worst)\b|\b(first|biggest|largest|fastest)\s+ever\b/i;
// "1." or "2)" at the start of a line is a list label, not a figure.
// A code that mixes letters and digits ("4F2C", "A380") is a name, not a figure; "1990s" and "3rd" stay.
const unlisted = (text) => String(text)
  .replace(/^\s*\d{1,2}[.)]\s+/gm, '')
  .replace(/\b(?=[A-Za-z]*\d)(?=\d*[A-Za-z])[A-Za-z\d]+\b/g, (m) => (/^\d+(s|st|nd|rd|th)$/i.test(m) ? m : ''));

// Number words as digits, so that "five to six times" and "nineteen eighty" can be compared with
// the notes. A lone "one" stays a word ("one of them"); "one hundred" and "1.5 million" convert.
const SMALL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19 };
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const SCALES = { hundred: 100, thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12 };
const NUMWORD = `(?:${[...Object.keys(SMALL), ...Object.keys(TENS), ...Object.keys(SCALES)].join('|')})`;
// A run of number words: joined by spaces or hyphens, and by "and" only after a scale
// ("three hundred and sixty-six", "two thousand and ten"; not "three and four").
const WORD_RUN = new RegExp(`\\b${NUMWORD}(?:(?:[\\s-]+|(?<=hundred|thousand|million|billion|trillion)\\s+and\\s+)${NUMWORD})*\\b`, 'gi');
const DIGIT_SCALE = /\b(\d[\d,]*(?:\.\d+)?)\s+(hundred|thousand|million|billion|trillion)\b/gi;
function wordsToNumber(words) {
  let total = 0;
  let current = 0;
  for (const w of words.toLowerCase().split(/[\s-]+/).filter((x) => x && x !== 'and')) {
    if (w in SCALES) {
      if (SCALES[w] === 100) current = (current || 1) * 100;
      else { total += (current || 1) * SCALES[w]; current = 0; }
    } else {
      const v = SMALL[w] ?? TENS[w];
      // "nineteen eighty", "twenty twenty-four": a year said in two halves.
      if (current >= 10 && current < 100 && v >= 10) current = current * 100 + v;
      else current += v;
    }
  }
  return total + current;
}
// "two point eight": a decimal said aloud, one digit word at a time after "point".
const DIGIT_WORD = '(?:zero|one|two|three|four|five|six|seven|eight|nine)';
const SPOKEN_DECIMAL = new RegExp(`\\b(${NUMWORD}(?:[\\s-]+${NUMWORD})*)\\s+point\\s+(${DIGIT_WORD}(?:\\s+${DIGIT_WORD})*)\\b`, 'gi');
export function digitsFor(text) {
  return String(text)
    .replace(SPOKEN_DECIMAL, (m, whole, digits) => `${wordsToNumber(whole)}.${digits.toLowerCase().split(/\s+/).map((d) => SMALL[d]).join('')}`)
    .replace(DIGIT_SCALE, (m, n, scale) => String(Math.round(Number(n.replace(/,/g, '')) * SCALES[scale.toLowerCase()])))
    .replace(WORD_RUN, (m) => (/^one$/i.test(m) ? m : String(wordsToNumber(m))));
}

const NAME = /(?<=[a-z,] )[A-Z][a-z]+/;

await main(async () => {
  for (const id of pickVideos(args)) {
    const script = await loadVideo(id);
    const language = args.lang ?? script.defaultLanguage ?? 'en';
    const first = await compileVideo(script, { language, layout: args.layout });
    const voice = voiceFor(script, first, { language, provider: args.voice });
    const tl = Object.keys(voice.durations).length ? await compileVideo(script, { language, layout: args.layout, durations: voice.durations }) : first;

    if (args.details) {
      const list = script.details ?? [];
      console.log(`# Details you can leave out: ${tl.title}\n`);
      if (!list.length) {
        console.log('This video marks no details. Wrap a part that can go in v.detail(name, () => { … }) to list it here.');
        continue;
      }
      const startOf = Object.fromEntries(tl.segments.map((s, i) => [s.id, { s, next: tl.segments[i + 1] }]));
      const cell = (text) => flat(text).replace(/\|/g, '/');
      console.log(`The video runs ${clock(tl.duration).replace(/\.\d$/, '')} with everything in. Each part below can be taken out by itself and the rest still makes sense.`);
      console.log(`To take parts out, list their names in the script, videos/${id}.mjs: video('${id}', …, { omit: ['name', 'another'] }),`);
      console.log(`then run tts, check and export again. To try a cut first: node tools/check.mjs ${id} --omit name,another`);
      console.log(`The name all stands for every detail: node tools/dump.mjs ${id} --text --omit all prints the core alone.`);
      const layered = list.some((d) => d.deep);
      if (layered) console.log('The name deep stands for every detail of the second layer ("deep" below): --omit deep gives the core and the first layer.\nA detail that names another under "Goes with" builds on it, and goes whenever that one goes.');
      console.log(`\n| Detail | ${layered ? 'Layer | Goes with | ' : ''}Chapter | Starts | Saves | Lines | What it tells |`);
      console.log(`| --- | ${layered ? '--- | --- | ' : ''}--- | --- | --- | --- | --- |`);
      const layer = (d) => (layered ? `${d.deep ? 'deep' : 'detail'} | ${d.within ? `\`${d.within}\`` : ''} | ` : '');
      let total = 0;
      let deep = 0;
      for (const d of list) {
        if (d.omitted) {
          console.log(`| \`${d.name}\` | ${layer(d)} | left out |  |  | ${cell(d.about ?? '')} |`);
          continue;
        }
        const first = startOf[d.lines[0]];
        const last = startOf[d.lines[d.lines.length - 1]];
        if (!first || !last) continue;
        const saves = (last.next ? last.next.start : tl.duration) - first.s.start;
        const nested = list.some((o) => o !== d && !o.omitted && o.lines.length > d.lines.length && d.lines.every((l) => o.lines.includes(l)));
        if (!nested) total += saves;
        if (!nested && d.deep) deep += saves;
        const chapter = [...tl.chapters].reverse().find((c) => c.start <= first.s.start + 0.3);
        const about = d.about ?? `"${first.s.text.length > 110 ? `${first.s.text.slice(0, 110)}…` : first.s.text}"`;
        console.log(`| \`${d.name}\` | ${layer(d)}${chapter ? cell(chapter.label) : ''} | ${clock(first.s.start).replace(/\.\d$/, '')} | ${Math.round(saves)} s | ${d.lines.length} | ${cell(about)} |`);
      }
      const left = list.filter((d) => d.omitted).length;
      console.log(`\n${list.length - left} detail(s) in the video, about ${clock(total).replace(/\.\d$/, '')} together; without any of them the video runs about ${clock(tl.duration - total).replace(/\.\d$/, '')}.${deep ? ` Without the deep ones alone it runs about ${clock(tl.duration - deep).replace(/\.\d$/, '')}.` : ''}${left ? ` ${left} left out now.` : ''}`);
      continue;
    }
    if (args.chapters) {
      // --main: only the chapters that do not begin inside a deep detail, at the times of the whole video.
      const deep = args.main ? deepChapters(script, tl) : new Set();
      tl.chapters.filter((c) => !deep.has(c)).forEach((c, i) => console.log(`${chapterClock(i === 0 ? 0 : c.start)} ${c.label}`));
      continue;
    }
    if (args.text) {
      let chapter = null;
      for (const s of tl.segments) {
        const c = [...tl.chapters].reverse().find((ch) => ch.start <= s.start + 0.3);
        if (c && c !== chapter) console.log(`\n## ${c.label}\n`);
        chapter = c ?? chapter;
        console.log(s.text);
      }
      continue;
    }
    if (args.quotes) {
      // Words inside quotation marks are a promise that someone said exactly this. The research notes
      // are where each one was copied from its source, so a quotation that is not in the notes word
      // for word was changed on the way, or was never a quotation.
      const dir = join(ROOT, 'notes', id, 'research');
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
      const plain = (t) => String(t).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
      const notes = ` ${plain(files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n'))} `;
      const inQuotes = (t) => [...String(t ?? '').matchAll(/["“]([^"“”]+)["”]/g)].map((m) => m[1].trim());
      const held = (q) => q.split(/…|\.\.\./).every((part) => !plain(part) || notes.includes(` ${plain(part)} `));
      const rows = [];
      for (const s of tl.segments) {
        const spoken = inQuotes(s.text);
        const written = inQuotes(typeof s.caption === 'string' ? s.caption : '');
        spoken.forEach((q, i) => {
          if (q.split(/\s+/).length < 4) return;
          // A number is spoken as words and written as digits in the caption: either form may be the note's.
          const forms = written.length === spoken.length ? [written[i], q] : [q];
          const c = [...tl.chapters].reverse().find((ch) => ch.start <= s.start + 0.3);
          rows.push({ s, q: forms[0], found: files.length > 0 && forms.some(held), chapter: c?.label ?? '' });
        });
      }
      const lost = rows.filter((r) => !r.found);
      console.log(`# Quotations: ${tl.title}\n`);
      if (!files.length) console.log(`There are no research notes in notes/${id}/research/, so nothing could be compared.\n`);
      console.log(`${rows.length} quotation(s) of four words or more are spoken. ${rows.length - lost.length} are in the research notes word for word; ${lost.length} are not.`);
      console.log('Capital letters and punctuation are not compared. Shorter quotations, and words quoted on screen only, are not listed: read those against the notes.\n');
      if (lost.length) {
        console.log('## Not in the notes\n');
        console.log('For each: if someone really said it, copy the exact words from the source into the note and into the script.');
        console.log('If it is a retelling, a recollection or a summary, take the quotation marks away and say whose account it is.');
        console.log('Speech made up for a teaching story (a farmer and a baker agreeing a price) is fine: the viewer knows nobody is being quoted.\n');
        console.log('| Time | Line | Chapter | Quotation |');
        console.log('| --- | --- | --- | --- |');
        for (const r of lost) console.log(`| ${clock(r.s.start).replace(/\.\d$/, '')} | ${r.s.id} | ${r.chapter} | "${r.q.replace(/\|/g, '\\|')}" |`);
        console.log('');
      }
      if (args.all && rows.length > lost.length) {
        console.log('## In the notes\n');
        console.log('| Time | Line | Chapter | Quotation |');
        console.log('| --- | --- | --- | --- |');
        for (const r of rows.filter((x) => x.found)) console.log(`| ${clock(r.s.start).replace(/\.\d$/, '')} | ${r.s.id} | ${r.chapter} | "${r.q.replace(/\|/g, '\\|')}" |`);
      } else if (rows.length > lost.length) console.log('Add --all to list the ones that were found as well.');
      continue;
    }
    if (args.figures) {
      // A figure in the video should be a figure in the notes. One that is not there as written is a
      // rounding, a sum or a conversion made while writing, a slip of the hand, or a figure with no source.
      const dir = join(ROOT, 'notes', id, 'research');
      const files = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')) : [];
      const FIGURE = /\d[\d,.]*\d|\d/g;
      const bare = (m) => m.replace(/,/g, '').replace(/\.$/, '');
      const notesText = digitsFor(unlisted(files.map((f) => readFileSync(join(dir, f), 'utf8')).join('\n'))).toLowerCase();
      const noted = new Set((notesText.match(FIGURE) ?? []).map(bare));
      const notesFlat = notesText.replace(/\s+/g, ' ');
      // A figure of one or two digits is in every note by chance: it counts as noted only with the
      // word beside it ("6 times", "about 5 to 6"), so "5 to 6 times" is checked as "6 times".
      const near = (text, index, m) => {
        const after = text.slice(index + m.length).match(/^\s*(%|[a-z]+)/i)?.[1];
        const before = text.slice(0, index).match(/([a-z]+)\s*$/i)?.[1];
        return after ? `${bare(m)}${after === '%' ? '' : ' '}${after}`.toLowerCase() : before ? `${before} ${bare(m)}`.toLowerCase() : null;
      };
      const chartText = (L) => [...(L.props.labels ?? []), ...(L.props.series ?? [{ values: L.props.values ?? [] }]).flatMap((x) => x.values ?? [])].join(' ');
      const rows = [
        ...tl.segments.map((s) => ({ t: s.start, id: s.id, text: s.text })),
        ...tl.segments.filter((s) => typeof s.caption === 'string' && s.caption !== s.text).map((s) => ({ t: s.start, id: s.id, text: s.caption })),
        ...tl.layers.filter((L) => L.module === 'chart').map((L) => ({ t: L.start, id: L.id, text: chartText(L) })),
        ...onScreen(tl),
      ].sort((a, b) => a.t - b.t);
      let count = 0;
      const lost = [];
      const lostShort = [];
      const seen = new Set();
      const once = new Set(); // a line and its caption say the same figure: list it once
      for (const r of rows) {
        if (seen.has(`${r.id}|${r.text}`)) continue;
        seen.add(`${r.id}|${r.text}`);
        const text = digitsFor(unlisted(r.text));
        for (const hit of text.matchAll(FIGURE)) {
          const m = hit[0];
          if (once.has(`${r.id}|${bare(m)}`)) continue;
          once.add(`${r.id}|${bare(m)}`);
          count++;
          if (bare(m).length >= 3) { if (!noted.has(bare(m))) lost.push({ ...r, figure: m }); continue; }
          const pair = near(text, hit.index, m);
          if (!pair || !notesFlat.includes(pair)) lostShort.push({ ...r, figure: pair ?? m });
        }
      }
      console.log(`# Figures: ${tl.title}\n`);
      if (!files.length) console.log(`There are no research notes in notes/${id}/research/, so nothing could be compared.\n`);
      console.log(`${count} figure(s) are said or shown. ${count - lost.length - lostShort.length} are in the research notes; ${lost.length} of three characters or more and ${lostShort.length} shorter ones are not.`);
      console.log('Number words count as figures ("five to six" is 5 to 6). Only figures are compared, not what they count: a figure that is in the notes can still be on the wrong thing.\n');
      const table = (list) => {
        console.log('| Time | Where | Figure | What is said or shown |');
        console.log('| --- | --- | --- | --- |');
        for (const r of list) console.log(`| ${clock(r.t).replace(/\.\d$/, '')} | ${r.id} | ${r.figure} | ${flat(r.text).replace(/\|/g, '/')} |`);
        console.log('');
      };
      if (lost.length) {
        console.log('## Not in the notes as written\n');
        console.log('For each, find the figure it came from in the notes and write the verdict in review/accuracy.md:');
        console.log('- a rounding ("nearly 44,000" for 43,792): fine when the line says about, nearly, almost or more than, and rounds the right way;');
        console.log('- a sum, a difference or a conversion made while writing: put the working into the note, marked as your own, and check it again;');
        console.log('- a slip (digits swapped, a wrong unit, a year one off): correct the script from the note;');
        console.log('- nowhere in the notes: find the source and add it to the note, or take the figure out.\n');
        table(lost);
      }
      if (lostShort.length) {
        console.log('## Short figures not in the notes with the word beside them\n');
        console.log('One and two digits are compared together with the word next to them ("6 times"). Most of these are from invented examples ("Mia pays Leo $30") or labels ("page 2"): skip those. Check each one that is a claim about the world, as above.\n');
        table(lostShort);
      }
      continue;
    }
    if (args.claims) {
      console.log(`# Claims to check: ${tl.title}\n`);
      console.log('Everything the video says and shows, in order. A viewer takes each one as true: find a source for it, or change it.');
      console.log('"Check first" marks numbers, names and strong words. Pictures make claims too (sizes, order, direction): look at the stills as well.\n');
      console.log('| Time | Where | What is said or shown | Check first | Source | Verdict |');
      console.log('| --- | --- | --- | --- | --- | --- |');
      // A chart's numbers are claims too: one row per chart, with every value next to its label.
      const chartRow = (L) => {
        const p = L.props;
        const series = p.series ?? [{ name: null, values: p.values ?? [] }];
        return `${p.title ? `${flat(p.title)}: ` : ''}${series.map((s) => `${s.name ? `${flat(s.name)}: ` : ''}${(p.labels ?? []).map((l, i) => `${flat(l)} = ${p.prefix ?? ''}${s.values?.[i]}${p.suffix ?? ''}`).join(', ')}`).join('; ')}${p.source ? ` (source shown: ${flat(p.source)})` : ''}`;
      };
      const rows = [
        ...tl.segments.map((s) => ({ t: s.start, id: s.id, text: s.text })),
        ...tl.layers.flatMap((L) => (L.module === 'chart' ? [{ t: L.start, id: L.id, text: chartRow(L), always: true }] : [])),
        ...onScreen(tl),
      ].sort((a, b) => a.t - b.t);
      const seen = new Set();
      for (const r of rows) {
        if (seen.has(`${r.id}|${r.text}`)) continue;
        seen.add(`${r.id}|${r.text}`);
        const why = [r.always || NUMBER.test(unlisted(r.text)) ? 'number' : null, STRONG.test(r.text) ? 'strong word' : null, NAME.test(r.text) ? 'name' : null].filter(Boolean).join(', ');
        console.log(`| ${clock(r.t)} | ${r.id} | ${r.text.replace(/\|/g, '/')} | ${why} |  |  |`);
      }
      continue;
    }

    const events = [];
    const push = (t, order, text) => events.push({ t, order, text });
    for (const c of tl.chapters) push(c.start, 0, `CHAPTER  ${c.label}`);
    const pauses = tl.layers.filter((L) => L.module === 'countdown');
    for (const m of tl.markers) {
      if (m.kind === 'chapter' || (m.kind === 'pause' && pauses.some((L) => m.time > L.start - 0.1 && m.time < L.end + 0.1))) continue;
      push(m.time, 1, `${m.kind.toUpperCase().padEnd(8)} ${flat(m.label)}`);
    }
    for (const s of tl.segments) push(s.start, 5, `SAY ${`${s.id} `.padEnd(5)}${s.speaker ? `(${s.speaker}) ` : ''}"${s.text}"  [${(s.end - s.start).toFixed(1)} s${s.measured ? '' : ' est.'}]`);
    for (const L of tl.layers) {
      const shown = words(L.props);
      if (L.module === 'term') push(L.start, 3, `[WORD CARD ${(L.end - L.start).toFixed(1)} s] ${L.props.word}: ${L.props.meaning}${L.props.example ? ` (${L.props.example})` : ''}`);
      else if (L.module === 'countdown') push(L.start, 3, `[QUIZ CARD, ${Math.min(L.end - L.start, L.props.seconds ?? Infinity).toFixed(1)} s to think after it is read] ${flat(L.props.question)}${L.props.hint ? ` (hint: ${flat(L.props.hint)})` : ''}`);
      else push(L.start, 2, `[ON SCREEN ${L.id}: ${L.module}${L.in ? `, ${L.in.type} in` : ''}]${shown.length ? ` ${shown.map((w) => `"${w}"`).join(' · ')}` : ''}`);
      for (const c of L.commands) {
        const said = L.module === 'scene' && c.name === 'set' ? [...new Set([...revealed(c), ...words(c.args)])] : words(c.args);
        push(c.start, 4, `  ${L.id}.${c.name}${c.duration ? ` (${c.duration.toFixed(1)} s)` : ''} ${said.length ? said.map((w) => `"${w}"`).join(' · ') : brief(c.args)}`);
      }
      if (L.end < tl.duration - 0.05) push(L.end, 1.5, `[OFF ${L.id}]`);
    }
    events.sort((a, b) => a.t - b.t || a.order - b.order);
    console.log(`# ${tl.title} [${id}, ${language}${args.layout ? `, ${args.layout}` : ''}] ${clock(tl.duration)}, ${tl.stage.width}×${tl.stage.height}, voice: ${voice.provider ?? 'estimated'}\n`);
    for (const e of events) console.log(`${stamp(e.t)}  ${e.text}`);
    console.log(`${stamp(tl.duration)}  END\n`);
  }
});
