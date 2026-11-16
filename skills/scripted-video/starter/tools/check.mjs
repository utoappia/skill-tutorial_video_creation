#!/usr/bin/env node
// Checks every video without drawing anything: fast enough to run after every edit.
//
//   node tools/check.mjs                 all videos, every language and layout
//   node tools/check.mjs intro           one video
//   node tools/check.mjs intro --strict  warnings fail too
//   node tools/check.mjs intro --omit a,b  with those details left out (kit: v.detail), to try a cut
//   options: --max-words 24  --cps 17  --grade 8  --still 20
//
// Errors are things that are wrong (a pointer aimed at nothing, a missing
// file, a blank screen, a missing translation, a word used before it is
// taught). Warnings are things a viewer will probably trip over (a line too
// long to follow, a caption too fast to read, a screen where nothing changes).
// It cannot see the picture: `stills` does that.
import { existsSync } from 'node:fs';
import { evaluate } from '../engine/evaluate.js';
import { readability, wordCount } from '../engine/speech.js';
import { assetPath, clock, compileVideo, languagesOf, loadModules, loadVideo, main, parseArgs, pickVideos, sourcesOf, voiceFor } from './lib.mjs';
import { ScriptError } from '../engine/compile.js';

const args = parseArgs();
const MAX_WORDS = Number(args['max-words'] ?? 24);
const MAX_CPS = Number(args.cps ?? 17);
const MAX_GRADE = Number(args.grade ?? 8);
const MAX_STILL = Number(args.still ?? 20);
const POINTING_WORDS = /\b(right here|over here|this one|that one|this (?:box|button|line|number|part|bar|arrow|word|area|corner|column|row)|look (?:at this|here)|as you can see|shown here|up here|down here)\b/i;

const luminance = (hex) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  return x === null || y === null ? null : (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const mentions = (text, word) => (/[぀-鿿가-힯]/.test(word) ? text.includes(word) : new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(word)}(?:s|es)?(?![\\p{L}\\p{N}])`, 'iu').test(text));

function checkTimeline(script, timeline, modules, { lint, language }) {
  const errors = [];
  const warnings = [];
  const err = (where, message) => errors.push(`${where}: ${message}`);
  const warn = (where, message) => warnings.push(`${where}: ${message}`);
  const registry = new Map(modules.map((m) => [m.type, m]));
  const { duration, stage } = timeline;
  for (const i of timeline.issues) warn(i.path, i.message);

  // What each module says is wrong with its own state, at the start and after every command.
  for (const L of timeline.layers) {
    const mod = registry.get(L.module);
    if (!mod.mount) err(L.id, `module "${L.module}" has no renderer (no mount function)`);
    if (!mod.audit) continue;
    // A problem that lasts is reported once, where it starts, with how many later commands still have it.
    const seen = new Map();
    const report = (where, p) => {
      if (seen.has(p)) { seen.get(p).count++; return; }
      seen.set(p, { where, count: 0 });
    };
    for (const p of mod.audit(L.initial, L)) report(L.id, p);
    for (const c of L.commands) for (const p of mod.audit(c.to, L)) report(`${L.id} at ${clock(c.start)} (${c.name})`, p);
    for (const [p, { where, count }] of seen) err(where, count ? `${p} (and after ${count} later command(s))` : p);
  }

  // Files.
  for (const src of sourcesOf(timeline)) {
    const path = timeline.assets[src] ?? src;
    if (/^(https?:|data:)/.test(path)) {
      if (path.startsWith('http')) warn('assets', `"${src}" is loaded from the internet: download it into assets/ so the video still builds tomorrow`);
    } else if (!existsSync(assetPath(timeline, src))) err('assets', `missing file "${path}"${path === src ? '' : ` (asset "${src}")`}`);
  }

  // The stage is never empty, and something changes often enough to hold attention.
  const QUIET = new Set(['annotate']);
  let blankFrom = null;
  for (let t = 0; t <= duration + 1e-6; t += 0.1) {
    const f = evaluate(timeline, Math.min(t, duration));
    const shown = f.layers.some((l) => !QUIET.has(l.module) && l.opacity > 0.05);
    if (!shown && blankFrom === null) blankFrom = t;
    if ((shown || t + 0.1 > duration) && blankFrom !== null) {
      if (t - blankFrom >= 0.6) err(`${clock(blankFrom)}–${clock(t)}`, 'nothing is on screen (a clip ends before the next one starts)');
      blankFrom = null;
    }
  }
  const events = [...new Set([0, duration, ...timeline.layers.flatMap((L) => [L.start, L.end, ...L.commands.map((c) => c.start)])].map((t) => Math.round(t * 10) / 10))].filter((t) => t >= 0 && t <= duration).sort((a, b) => a - b);
  for (let i = 1; i < events.length; i++) if (events[i] - events[i - 1] > MAX_STILL) warn(`${clock(events[i - 1])}–${clock(events[i])}`, `nothing changes on screen for ${Math.round(events[i] - events[i - 1])} s: add a step, a pointer or a new picture`);

  // Clips sit on the stage.
  for (const L of timeline.layers) {
    const b = L.box;
    if (!Object.keys(L.keyframes).length && (b.x < -1 || b.y < -1 || b.x + b.w > stage.width + 1 || b.y + b.h > stage.height + 1)) warn(L.id, `its box (${b.x}, ${b.y}, ${b.w}×${b.h}) is partly off the ${stage.width}×${stage.height} stage`);
  }

  // Word cards.
  const cards = timeline.layers.filter((L) => L.module === 'term');
  for (const card of cards) {
    const word = String(card.props.word ?? '').replace(/\*\*/g, '');
    const early = timeline.segments.find((s) => s.end <= card.start + 0.01 && mentions(s.text, word));
    if (early) err(card.id, `"${word}" is said at ${clock(early.start)} (line ${early.id}) before its word card at ${clock(card.start)}: teach the word the first time it is used`);
    const words = wordCount(`${card.props.word} ${card.props.meaning} ${card.props.example ?? ''}`);
    const needs = 1.5 + words / 3;
    if (card.end - card.start < needs - 0.15) warn(card.id, `word card "${word}" is up for ${(card.end - card.start).toFixed(1)} s; a reader needs about ${needs.toFixed(1)} s for ${words} words`);
    for (const L of timeline.layers) {
      if (L === card || L.module === 'annotate') continue;
      const during = L.commands.find((c) => c.start > card.start + 0.05 && c.start < card.end - 0.05);
      if (during) warn(card.id, `"${L.id}" changes (${during.name} at ${clock(during.start)}) while the word card "${word}" covers it: the viewer will miss it`);
    }
  }
  [...cards].sort((a, b) => a.start - b.start).forEach((c, i, list) => {
    if (i && c.start - list[i - 1].start < 15) warn(c.id, `two new words within ${Math.round(c.start - list[i - 1].start)} s ("${list[i - 1].props.word}", "${c.props.word}"): give each one time to be used first`);
  });

  // Pauses ask a question.
  for (const L of timeline.layers) if (L.module === 'countdown' && !/[?？]\s*$/.test(String(L.props.question).replace(/\*\*/g, ''))) warn(L.id, `a pause should ask the viewer a question: "${L.props.question}"`);

  // A question on screen is also read aloud, and then the narrator is quiet while the viewer thinks.
  if (timeline.segments.length) {
    for (const L of timeline.layers) {
      if (L.module !== 'countdown') continue;
      const thinking = Math.min(L.end - L.start, L.props.seconds ?? L.end - L.start);
      const countFrom = L.end - thinking;
      const read = timeline.segments.find((s) => s.start >= L.start - 0.5 && s.start < countFrom - 0.05);
      if (!read) err(L.id, `the question is not read aloud: "${L.props.question}" (the narrator says a question is coming, then reads it as the card appears, then the countdown runs; the kit's think() does this)`);
      const over = timeline.segments.find((s) => s.end > countFrom + 0.3 && s.start < L.end - 0.1);
      if (over && over !== read) warn(L.id, `"${over.id}" is spoken during the thinking time of "${L.props.question}": leave it silent`);
      else if (over) warn(L.id, `"${over.id}" is still being spoken when the countdown of "${L.props.question}" starts: let the card last until the line has ended, plus the thinking time`);
    }
  }

  // Music is for chosen parts of a lesson (an opening, a story, the ending), not for all of it:
  // under an explanation it competes with the words for the same attention.
  const music = timeline.sounds.filter((s) => s.loop || s.end !== null).map((s) => ({ ...s, end: s.end ?? duration })).sort((a, b) => a.start - b.start);
  if (music.length) {
    let covered = 0;
    let upTo = 0;
    for (const m of music) {
      covered += Math.max(0, m.end - Math.max(m.start, upTo));
      upTo = Math.max(upTo, m.end);
    }
    const share = covered / Math.max(0.001, duration);
    if (duration > 90 && share > 0.5) warn('music', `music plays under ${Math.round(share * 100)}% of a ${clock(duration)} video: keep it to chosen parts (the opening, a story, the ending) with music(src, { start, end }), and leave the explaining without it`);
    for (const L of timeline.layers) {
      if (L.module !== 'countdown' && L.module !== 'term') continue;
      const over = music.find((m) => m.start < L.end - 0.1 && m.end > L.start + 0.1);
      if (over) warn(L.id, `music (${over.src}) plays during ${L.module === 'term' ? `the word card "${L.props.word}"` : `the quiz "${L.props.question}"`}: a new word and a question need quiet`);
    }
  }
  // Sound effects mark events; many of them is noise.
  const effects = timeline.sounds.filter((s) => !s.loop && s.end === null);
  if (effects.length > Math.max(4, (duration / 60) * 4)) warn('sound', `${effects.length} sound effects in ${clock(duration)}: more than about four a minute stops meaning anything`);

  // Chapters.
  if (duration > 150 && timeline.chapters.length === 0) warn('chapters', `a ${clock(duration)} video has no chapters: add them so viewers can find their place`);
  if (timeline.chapters.length) {
    if (timeline.chapters[0].start > 0.01) warn('chapters', 'the first chapter does not start at 0:00 (video sites need that to show chapters)');
    for (const c of timeline.chapters) {
      if (!String(c.label).trim()) err('chapters', `the chapter at ${clock(c.start)} has no name`);
      if (c.end - c.start > 360) warn('chapters', `chapter "${c.label}" runs ${clock(c.end - c.start)}: break it up`);
      if (c.end - c.start < 10) warn('chapters', `chapter "${c.label}" is under 10 s (video sites ignore chapters that short)`);
    }
  }

  // Colours.
  const theme = { ink: '#ffffff', accent: '#ffcf3f', card: '#14233a', ...stage.theme };
  for (const [a, b, what] of [[theme.ink, stage.background, 'text on the background'], [theme.ink, theme.card, 'text on cards'], [theme.accent, theme.card, 'the accent colour on cards'], [theme.accent, stage.background, 'the accent colour on the background']]) {
    const c = contrast(a, b);
    if (c !== null && c < 4.5) warn('colours', `${what} (${a} on ${b}) has a contrast of ${c.toFixed(1)}:1; aim for 4.5:1 or more`);
  }

  if (lint) {
    // Lines a listener can follow.
    const pointingAt = (t) => evaluate(timeline, t).layers.some((l) => (l.state && l.state.point) || l.active.some((a) => ['tap', 'drag', 'point'].includes(a.command.name)));
    for (const s of timeline.segments) {
      const words = wordCount(s.text);
      if (words > MAX_WORDS) warn(`line ${s.id} at ${clock(s.start)}`, `${words} words in one line (limit ${MAX_WORDS}): "${s.text}"`);
      if (POINTING_WORDS.test(s.text)) {
        let pointed = false;
        for (let t = s.start; t <= s.end; t += 0.2) pointed ||= pointingAt(t);
        if (!pointed) warn(`line ${s.id} at ${clock(s.start)}`, `says "${POINTING_WORDS.exec(s.text)[0]}" but nothing is pointed at while it is spoken: "${s.text}"`);
      }
    }
    // A quotation is told once: hearing the same words again, minutes later, sounds like a mistake.
    const quoted = new Map();
    for (const s of timeline.segments) {
      for (const m of String(s.text).matchAll(/["“]([^"“”]{20,})["”]/g)) {
        if (wordCount(m[1]) < 5) continue;
        const key = m[1].toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
        const first = quoted.get(key);
        if (!first) quoted.set(key, s);
        else if (s.start - first.end > 30) warn(`line ${s.id} at ${clock(s.start)}`, `the quotation "${m[1]}" was already spoken at ${clock(first.start)}: tell it once, or give it in your own words the second time`);
      }
    }
    for (const c of timeline.captions) {
      const cps = [...c.text].length / Math.max(0.1, c.end - c.start);
      const limit = /[぀-鿿가-힯]/.test(c.text) ? MAX_CPS / 2 : MAX_CPS;
      if (cps > limit + 0.5) warn(`caption at ${clock(c.start)}`, `${cps.toFixed(0)} characters a second (limit ${limit}): "${c.text}"`);
    }
    // A date spoken as words and captioned in digits, joined wrongly: heard as "the eighth of May"
    // (right) and read as "the 8 May" (wrong). In one long video this slip was in 205 captions.
    if (String(language).startsWith('en')) {
      const MONTH = 'January|February|March|April|May|June|July|August|September|October|November|December';
      const slip = new RegExp(`\\bthe \\d{1,2}(?:\\s*(?:to|and|or|-|–)\\s*\\d{1,2})? (?:${MONTH})\\b`, 'i');
      const slips = timeline.captions.filter((c) => slip.test(c.text));
      if (slips.length) warn(`${slips.length} caption(s)`, `read "the 8 May" (first at ${clock(slips[0].start)}: "${slips[0].text}"). The voice is right to say "the eighth of May"; the caption should read "8 May". Where a helper writes both forms from one text, the word "the" belongs to the spoken form only`);
    }
    // On-screen text stays long enough to read.
    for (const L of timeline.layers.filter((l) => l.module === 'text')) {
      const steps = [{ t: L.start, text: L.initial.text }, ...L.commands.filter((c) => c.name === 'setText').map((c) => ({ t: c.start, text: c.to.text })), { t: L.end }];
      for (let i = 0; i + 1 < steps.length; i++) {
        const words = wordCount(String(steps[i].text).replace(/\*\*/g, ''));
        const needs = 1 + words / 3;
        const has = steps[i + 1].t - steps[i].t;
        if (has > 0 && has < needs) warn(`${L.id} at ${clock(steps[i].t)}`, `"${steps[i].text}" is on screen ${has.toFixed(1)} s; reading ${words} words takes about ${needs.toFixed(1)} s`);
      }
    }
    if (timeline.language.startsWith('en') && timeline.segments.length) {
      const all = timeline.segments.map((s) => s.text).join(' ');
      const r = readability(all);
      if (r.grade > MAX_GRADE) warn('reading level', `the narration reads at about grade ${r.grade.toFixed(1)} (limit ${MAX_GRADE}): shorter sentences and plainer words${r.longWords.length ? `; long words: ${[...new Set(r.longWords)].slice(0, 8).join(', ')}` : ''}`);
      // Every one is listed (a long video can have many): fixing five at a time hides how much is left.
      for (const s of r.longSentences.slice(0, 40)) warn('reading level', `long sentence: "${s}"`);
      if (r.longSentences.length > 40) warn('reading level', `and ${r.longSentences.length - 40} more long sentences`);
      // Two speeds matter: how fast the voice talks while it talks, and how many words a minute the viewer gets overall.
      const speaking = timeline.segments.reduce((n, s) => n + (s.end - s.start), 0);
      const voiceWpm = (wordCount(all) / speaking) * 60;
      const overallWpm = (wordCount(all) / Math.max(1, timeline.segments.at(-1).end - timeline.segments[0].start)) * 60;
      if (voiceWpm > 200) warn('pace', `the voice talks at ${Math.round(voiceWpm)} words a minute: slow it down (voice.rate) for a general audience`);
      if (overallWpm > 165) warn('pace', `${Math.round(overallWpm)} words a minute overall (aim for 120 to 150): add pauses between ideas, or say less`);
    }
  }
  return { errors, warnings };
}

await main(async () => {
  const modules = await loadModules();
  let failed = 0;
  let warned = 0;
  for (const id of pickVideos(args)) {
    const script = await loadVideo(id);
    const languages = languagesOf(script);
    const layouts = [null, ...Object.keys(script.layouts ?? {})];
    const seen = new Set();
    const errors = [];
    const warnings = [];
    let summary = '';
    for (const language of languages) {
      for (const layout of layouts) {
        const tag = `${language}${layout ? `/${layout}` : ''}`;
        let timeline;
        try {
          const first = await compileVideo(script, { language, layout });
          const voice = voiceFor(script, first, { language, provider: args.voice });
          timeline = Object.keys(voice.durations).length ? await compileVideo(script, { language, layout, durations: voice.durations }) : first;
          if (!layout && voice.provider && (voice.stale.length || voice.missing.length)) warnings.push(`[${tag}] voice "${voice.provider}": ${voice.stale.length + voice.missing.length} line(s) changed since it was recorded (run tools/tts.mjs again)`);
          if (!layout && language === (script.defaultLanguage ?? 'en')) summary = `${clock(timeline.duration)}, ${timeline.segments.length} lines, ${timeline.chapters.length} chapters${voice.provider ? `, voice: ${voice.provider}` : ', voice: estimated'}`;
        } catch (e) {
          if (!(e instanceof ScriptError)) throw e;
          for (const i of e.issues) errors.push(`[${tag}] ${i.path}: ${i.message}`);
          continue;
        }
        if (timeline.untranslated.length) errors.push(`[${tag}] ${timeline.untranslated.length} text(s) not translated to ${language}: ${timeline.untranslated.slice(0, 6).join(', ')}${timeline.untranslated.length > 6 ? '…' : ''} (run tools/i18n.mjs ${id} --lang ${language})`);
        const r = checkTimeline(script, timeline, modules, { lint: !layout, language });
        // The same problem in every language and layout is one problem.
        for (const [list, into] of [[r.errors, errors], [r.warnings, warnings]]) {
          for (const m of list) {
            if (seen.has(m)) continue;
            seen.add(m);
            into.push(languages.length * layouts.length > 1 ? `[${tag}] ${m}` : m);
          }
        }
      }
    }
    // Every detail must be removable by itself: the person who gets the video will take some out.
    const present = (script.details ?? []).filter((d) => !d.omitted);
    for (const d of present) {
      try {
        const without = await loadVideo(id, { omit: [...(script.details ?? []).filter((o) => o.omitted).map((o) => o.name), d.name] });
        await compileVideo(without, { language: script.defaultLanguage ?? languages[0] });
      } catch (e) {
        if (!(e instanceof ScriptError)) throw e;
        for (const i of e.issues) errors.push(`detail "${d.name}" cannot be left out by itself: ${i.path}: ${i.message} (keep a detail whole: its own shots go inside it, a shot it shares keeps a line outside it, and nothing outside uses a line or a clip from inside)`);
      }
    }
    // The layers the person may ask for by one name: the core alone, and the video without its deep details.
    for (const name of ['all', ...(present.some((d) => d.deep) ? ['deep'] : [])]) {
      if (!present.length) break;
      try {
        const without = await loadVideo(id, { omit: [...(script.details ?? []).filter((o) => o.omitted).map((o) => o.name), name] });
        await compileVideo(without, { language: script.defaultLanguage ?? languages[0] });
      } catch (e) {
        if (!(e instanceof ScriptError)) throw e;
        for (const i of e.issues) errors.push(`the video does not build with --omit ${name}: ${i.path}: ${i.message}`);
      }
    }
    if (present.length) summary += `, ${present.length} details${present.some((d) => d.deep) ? ` (${present.filter((d) => d.deep).length} deep)` : ''}`;
    const mark = errors.length ? '✗' : warnings.length ? '!' : '✓';
    console.log(`${mark} ${id} (${languages.join(', ')}${layouts.length > 1 ? `; layouts: ${layouts.slice(1).join(', ')}` : ''}) ${summary}`);
    for (const e of errors) console.log(`    error    ${e}`);
    for (const w of warnings) console.log(`    warning  ${w}`);
    failed += errors.length;
    warned += warnings.length;
  }
  console.log(`\n${failed} error(s), ${warned} warning(s)`);
  if (failed || (args.strict && warned)) process.exit(1);
});
