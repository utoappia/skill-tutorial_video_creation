#!/usr/bin/env node
// Checks a video's mind map (notes/<video>/mindmap.json) and prints it as an
// outline. The mind map is the bridge between the research notes and the
// script: every idea of the video, in a tree, each one pointing at the place in
// the research where its details and sources are.
//
//   node tools/mindmap.mjs intro             check, then print the outline
//   node tools/mindmap.mjs intro --order     the ideas in teaching order, with what each one needs first
//   node tools/mindmap.mjs path/to/mindmap.json
//
// The file:
//   { "title": "...", "audience": "...", "promise": "what the viewer can do after watching",
//     "nodes": [
//       { "id": "tilt", "label": "The Earth is tilted",            ≤ 10 words
//         "note": "23.4°, the same direction all year",           ≤ 40 words (details live in the research)
//         "kind": "claim",        claim | example | analogy | story | counterpoint | term | question | step
//         "use": "core",          core (must be in the video) | support | cut (researched, left out)
//         "research": ["02-tilt.md#How big is the tilt"],         file#heading inside notes/<video>/research/
//         "needs": ["orbit"],     ideas the viewer must already have (checked against the order)
//         "links": [{ "to": "seasons", "why": "tilt is the cause of seasons" }],
//         "children": [ … ] } ] }
//
// Teaching order is the order of the file, read top to bottom, children after
// their parent. An idea listed in "needs" must come earlier.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { wordCount } from '../engine/speech.js';
import { die, main, parseArgs, rel, ROOT } from './lib.mjs';

const args = parseArgs();
const KINDS = ['claim', 'example', 'analogy', 'story', 'counterpoint', 'term', 'question', 'step'];
const USES = ['core', 'support', 'cut'];
// Files in research/ that list the notes, the leads or the next videos. They are not notes, so no idea points at them.
const LISTS = ['index.md', 'leads.md', 'next-videos.md'];
const slug = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');

await main(async () => {
  const given = args._[0] ?? die('Which video? node tools/mindmap.mjs <video>');
  const file = given.endsWith('.json') ? resolve(process.cwd(), given) : join(ROOT, 'notes', given, 'mindmap.json');
  if (!existsSync(file)) die(`No mind map at ${rel(file)}`);
  let map;
  try {
    map = JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    die(`${rel(file)} is not valid JSON: ${e.message}`);
  }
  const research = join(dirname(file), 'research');
  const errors = [];
  const warnings = [];
  for (const key of ['title', 'audience', 'promise']) if (typeof map[key] !== 'string' || !map[key].trim()) errors.push(`"${key}" is missing (one sentence)`);
  if (!Array.isArray(map.nodes) || !map.nodes.length) die(`${rel(file)} has no "nodes"`);

  // Flatten in teaching order.
  const flat = [];
  const walk = (nodes, depth, parent) => {
    for (const n of nodes) {
      flat.push({ n, depth, parent });
      if (n.children !== undefined && !Array.isArray(n.children)) errors.push(`${n.id}: "children" must be a list`);
      else walk(n.children ?? [], depth + 1, n);
    }
  };
  walk(map.nodes, 0, null);
  const position = new Map();
  for (const [i, { n }] of flat.entries()) {
    if (typeof n.id !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(n.id)) errors.push(`a node has a bad id ${JSON.stringify(n.id)} (use lower-case words joined by dashes)`);
    else if (position.has(n.id)) errors.push(`two nodes are called "${n.id}"`);
    else position.set(n.id, i);
  }

  // Research files and their headings.
  const files = new Map();
  if (existsSync(research)) {
    for (const f of readdirSync(research).filter((f) => f.endsWith('.md') && !f.startsWith('_'))) {
      const text = readFileSync(join(research, f), 'utf8');
      const lines = text.split('\n');
      files.set(f, { headings: new Set(lines.filter((l) => /^#{1,6}\s/.test(l)).map((l) => slug(l.replace(/^#+\s*/, '')))), used: false });
      // Each note opens with a summary, so a reader can tell in ten seconds whether to read on.
      const opening = lines.filter((l) => l.trim()).slice(0, 6).join('\n');
      if (!/summary/i.test(opening) && !LISTS.includes(f)) warnings.push(`research/${f} does not open with a summary (a few sentences, right under the title, starting "Summary:")`);
    }
  } else warnings.push(`there is no research folder next to the mind map (${rel(research)}); fine only if the video needed no research`);

  for (const { n, depth } of flat) {
    const at = `${n.id}:`;
    if (typeof n.label !== 'string' || !n.label.trim()) errors.push(`${at} needs a "label"`);
    else if (wordCount(n.label) > 10) warnings.push(`${at} the label is ${wordCount(n.label)} words (keep it under 10; details belong in the research)`);
    if (n.note && wordCount(n.note) > 40) warnings.push(`${at} the note is ${wordCount(n.note)} words (keep it under 40 and point at the research instead)`);
    if (n.kind !== undefined && !KINDS.includes(n.kind)) errors.push(`${at} unknown kind "${n.kind}" (${KINDS.join(', ')})`);
    if (n.use !== undefined && !USES.includes(n.use)) errors.push(`${at} unknown use "${n.use}" (${USES.join(', ')})`);
    if (depth > 3) warnings.push(`${at} is ${depth + 1} levels deep (a viewer can hold about three levels)`);
    for (const ref of n.research ?? []) {
      const [f, heading] = String(ref).split('#');
      const entry = files.get(f);
      if (!entry) errors.push(`${at} research file "${f}" does not exist in ${rel(research)}/`);
      else {
        entry.used = true;
        if (heading && !entry.headings.has(slug(heading))) errors.push(`${at} research/${f} has no heading "${heading}"`);
      }
    }
    if (['claim', 'example', 'story', 'counterpoint'].includes(n.kind) && n.use !== 'cut' && !(n.research ?? []).length && files.size) warnings.push(`${at} is a ${n.kind} with no research behind it: point at the note that supports it, or research it`);
    for (const need of n.needs ?? []) {
      if (!position.has(need)) errors.push(`${at} needs "${need}", which is not in the map`);
      else if (position.get(need) > position.get(n.id)) errors.push(`${at} needs "${need}", but "${need}" comes later: teach it first, or move this idea down`);
      else if (flat[position.get(need)].n.use === 'cut' && n.use !== 'cut') errors.push(`${at} needs "${need}", which is marked cut`);
    }
    for (const link of n.links ?? []) {
      if (!position.has(link.to)) errors.push(`${at} links to "${link.to}", which is not in the map`);
      if (!link.why) warnings.push(`${at} the link to "${link.to}" does not say why`);
    }
  }
  for (const [f, entry] of files) if (!entry.used && !LISTS.includes(f) && !f.startsWith('00-')) warnings.push(`research/${f} is not used by any node: place it in the map, or decide it is out of scope`);
  if (map.nodes.length > 5) warnings.push(`${map.nodes.length} main branches: viewers remember three to five; group them`);
  const core = flat.filter(({ n }) => (n.use ?? 'core') === 'core');
  if (!flat.some(({ n }) => n.kind === 'counterpoint') && files.size) warnings.push('no counterpoint anywhere: what would someone who disagrees say? (research it even if it stays out of the video)');
  const terms = flat.filter(({ n }) => n.kind === 'term' && n.use !== 'cut');
  if (terms.length > 7) warnings.push(`${terms.length} new terms: more than about five in one video and viewers stop keeping up`);

  if (args.order) {
    console.log(`# ${map.title}: teaching order\n`);
    let i = 0;
    for (const { n } of flat) {
      if (n.use === 'cut') continue;
      console.log(`${String(++i).padStart(2)}. ${n.label}${n.kind ? ` [${n.kind}]` : ''}${n.needs?.length ? `   (needs: ${n.needs.join(', ')})` : ''}`);
    }
  } else {
    console.log(`# ${map.title}`);
    console.log(`  for: ${map.audience}`);
    console.log(`  promise: ${map.promise}\n`);
    for (const { n, depth } of flat) {
      const tags = [n.kind, n.use && n.use !== 'core' ? n.use : null].filter(Boolean).join(', ');
      console.log(`${'  '.repeat(depth)}- ${n.label}${tags ? ` [${tags}]` : ''}${n.research?.length ? `  → ${n.research.join(', ')}` : ''}`);
      for (const link of n.links ?? []) console.log(`${'  '.repeat(depth + 1)}↔ ${link.to}: ${link.why ?? ''}`);
    }
  }
  console.log(`\n${flat.length} ideas (${core.length} core, ${flat.filter(({ n }) => n.use === 'cut').length} cut), ${terms.length} new terms, ${files.size} research notes`);
  for (const w of warnings) console.log(`  warning  ${w}`);
  for (const e of errors) console.log(`  error    ${e}`);
  console.log(`\n${errors.length} error(s), ${warnings.length} warning(s)`);
  if (errors.length) process.exit(1);
});
