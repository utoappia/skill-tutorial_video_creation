#!/usr/bin/env node
// Translations. Every text of a video (spoken lines, captions, words on screen)
// has a key; a translation is a file of key → text:
//
//   videos/i18n/<video>.<language>.json
//
//   node tools/i18n.mjs intro --lang fr        add the missing keys to videos/i18n/intro.fr.json (empty, to fill in)
//                                              and write a translator's brief: out/i18n/intro.fr.md
//   node tools/i18n.mjs intro --status         how complete each language is
//   node tools/i18n.mjs intro --lang fr --prune   drop keys the video no longer uses
//
// Keys made by the authoring kit are a fingerprint of the source text: when a
// source line changes, its key changes, the old translation becomes unused and
// the new line shows up as missing. A translation can never silently go stale.
//
// After translating: node tools/check.mjs intro   (checks every language and every layout)
//                    node tools/stills.mjs intro --lang fr   (longer words: look for text that no longer fits)
//                    node tools/tts.mjs intro --lang fr      (a voice for that language)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { compileVideo, die, ensureDir, languagesOf, loadVideo, main, OUT, parseArgs, pickVideos, rel, ROOT } from './lib.mjs';

const args = parseArgs();

/** Every text key a script uses, with where it is used: [{ key, where }]. */
function usedKeys(script) {
  const found = new Map();
  const note = (key, where) => found.set(key, [...(found.get(key) ?? []), where]);
  const walk = (value, where) => {
    if (Array.isArray(value)) value.forEach((v) => walk(v, where));
    else if (value && typeof value === 'object') {
      if (typeof value.$t === 'string' && Object.keys(value).length === 1) note(value.$t, where);
      else for (const [k, v] of Object.entries(value)) walk(v, where === 'on screen' && k === 'caption' ? 'caption' : where);
    }
  };
  walk(script.title, 'title of the video');
  for (const track of script.tracks ?? []) {
    if (track.kind === 'narration') {
      for (const seg of track.segments ?? []) {
        walk(seg.text, `spoken (line ${seg.id})`);
        walk(seg.caption, `caption of line ${seg.id}`);
      }
    } else for (const clip of track.clips ?? []) walk(clip, clip.module === 'term' ? 'word card' : `on screen (${clip.module ?? 'sound'}${clip.id ? ` "${clip.id}"` : ''})`);
  }
  walk(script.markers, 'chapter title');
  walk(script.pronunciations, 'pronunciation');
  return found;
}

await main(async () => {
  for (const id of pickVideos(args)) {
    const script = await loadVideo(id);
    const source = script.defaultLanguage ?? 'en';
    const base = script.strings?.[source] ?? {};
    const used = usedKeys(script);
    const keys = [...used.keys()].filter((k) => base[k] !== undefined);

    if (args.status || !args.lang) {
      console.log(`${id}: ${keys.length} texts, written in ${source}`);
      for (const lang of languagesOf(script).filter((l) => l !== source)) {
        const table = script.strings[lang] ?? {};
        const done = keys.filter((k) => typeof table[k] === 'string' && table[k] !== '').length;
        const unused = Object.keys(table).filter((k) => !used.has(k)).length;
        const same = keys.filter((k) => table[k] === base[k] && /\p{L}{4,}/u.test(base[k])).length;
        console.log(`  ${done === keys.length ? '✓' : '!'} ${lang}: ${done}/${keys.length} translated${unused ? `, ${unused} no longer used (--prune)` : ''}${same ? `, ${same} identical to the source (left untranslated?)` : ''}`);
      }
      if (!args.lang) console.log(`  add a language: node tools/i18n.mjs ${id} --lang <code>`);
      continue;
    }

    const lang = String(args.lang);
    if (lang === source) die(`${lang} is the language the video is written in.`);
    const file = join(ensureDir(join(ROOT, 'videos', 'i18n')), `${id}.${lang}.json`);
    const existing = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
    // Translations written in the script itself (v.translate) count as done.
    const inScript = script.strings?.[lang] ?? {};
    const table = {};
    const missing = [];
    for (const k of keys) {
      table[k] = existing[k] ?? '';
      if (!table[k] && !inScript[k]) missing.push(k);
    }
    const dropped = Object.keys(existing).filter((k) => !used.has(k));
    if (!args.prune) for (const k of dropped) table[k] = existing[k];
    writeFileSync(file, `${JSON.stringify(table, null, 2)}\n`);

    const brief = join(ensureDir(join(OUT, 'i18n')), `${id}.${lang}.md`);
    const timeline = await compileVideo(script, { language: source });
    const order = new Map(timeline.segments.map((s, i) => [s.id, i]));
    const rows = keys
      .map((k) => ({ k, where: used.get(k), text: base[k], line: Math.min(...used.get(k).map((w) => order.get(/line (\S+?)\)?$/.exec(w)?.[1]) ?? Infinity)) }))
      .sort((a, b) => a.line - b.line);
    writeFileSync(
      brief,
      [
        `# Translate "${timeline.title}" from ${source} to ${lang}`,
        '',
        `Fill in \`${rel(file)}\`: one entry per key below. ${missing.length} of ${keys.length} are still empty.`,
        '',
        '## How to translate',
        '',
        '- Write what a good teacher who grew up speaking the language would say out loud. Translate the meaning, not the words.',
        '- Keep the level: short sentences, everyday words. If the source avoids a hard word, avoid it too.',
        '- Spoken lines are read by a voice. Write numbers, symbols and abbreviations the way they should be heard; the matching caption can keep digits.',
        '- Pick one translation for each key term (the word cards) and use exactly that word everywhere. List them in the glossary below first.',
        '- Keep `**strong**` marks around the same idea, and keep line breaks (`\\n`) where the source has them.',
        '- Words on screen have limited room: keep them about as long as the source. Spoken lines can be longer; the video stretches to fit.',
        '- Do not translate names of products, people or places unless the language has its own usual form.',
        '- Examples that only work in the source culture (idioms, units, money, holidays) should be swapped for ones the audience knows, when the facts allow.',
        '',
        '## Glossary (fill in before the rest)',
        '',
        '| Source term | Translation |',
        '| --- | --- |',
        ...timeline.layers.filter((L) => L.module === 'term').map((L) => `| ${L.props.word} |  |`),
        '',
        '## Texts, in the order they appear',
        '',
        '| Key | Where | Source text | Done |',
        '| --- | --- | --- | --- |',
        ...rows.map((r) => `| \`${r.k}\` | ${[...new Set(r.where)].join('; ')} | ${String(r.text).replace(/\n/g, '\\n').replace(/\|/g, '/')} | ${table[r.k] || inScript[r.k] ? 'yes' : ''} |`),
        '',
      ].join('\n'),
    );
    console.log(`${missing.length ? '!' : '✓'} ${rel(file)}: ${keys.length - missing.length}/${keys.length} translated${dropped.length ? (args.prune ? `, ${dropped.length} unused removed` : `, ${dropped.length} no longer used (--prune)`) : ''}`);
    console.log(`    translator's brief: ${rel(brief)}`);
  }
});
