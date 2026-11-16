#!/usr/bin/env node
// Starts a new video: a folder of planning notes and an empty script.
//
//   node tools/new.mjs solar-power "How a solar panel makes electricity"
//   node tools/new.mjs solar-power "…" --json       a raw JSON script instead of a kit script
//   node tools/new.mjs solar-power "…" --vertical   a tall picture (1080×1920)
//
// It writes:
//   notes/<id>/        brief, research notes, mind map, storyboard, reviews (copied from notes/_template/)
//   videos/<id>.mjs    a script with the usual skeleton, ready to fill in
//
// Nothing that already exists is overwritten.
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { die, main, parseArgs, rel, ROOT } from './lib.mjs';

const args = parseArgs();

await main(async () => {
  const [id, title] = args._;
  if (!id || !title) die('Usage: node tools/new.mjs <id> "<Title of the video>"   (id: lower-case words joined by dashes)');
  if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) die(`"${id}" is not a good id: use lower-case letters, digits and dashes (it becomes file names).`);
  const fill = (text) => text.replaceAll('{{id}}', id).replaceAll('{{title}}', title);
  const written = [];
  const kept = [];

  const copy = (from, to) => {
    mkdirSync(to, { recursive: true });
    for (const name of readdirSync(from)) {
      const src = join(from, name);
      const dst = join(to, name);
      if (statSync(src).isDirectory()) copy(src, dst);
      else if (existsSync(dst)) kept.push(rel(dst));
      else {
        writeFileSync(dst, fill(readFileSync(src, 'utf8')));
        written.push(rel(dst));
      }
    }
  };
  const template = join(ROOT, 'notes', '_template');
  if (!existsSync(template)) die(`The note templates are missing (${rel(template)}).`);
  copy(template, join(ROOT, 'notes', id));

  const size = args.vertical ? ', { size: [1080, 1920] }' : '';
  const q = JSON.stringify;
  const kit = `// ${title}
// Notes, research and reviews: notes/${id}/
//
//   node tools/check.mjs ${id}       problems, before looking at anything
//   node tools/stills.mjs ${id}      pictures of every line (out/stills/${id}/)
//   node tools/tts.mjs ${id}         record the voice
//   node tools/export.mjs ${id}      out/${id}.mp4
import { take, video } from '../engine/kit.js';

const v = video(${q(id)}, ${q(title)}${size});

// --- 1. The question: what the viewer will be able to do, and why it matters ------
v.chapter('The question');
v.title(${q(title)});
v.say('Start with the question this video answers.');
v.beat();

// --- 2. The first idea: something to look at, then its name -----------------------
v.chapter('The first idea');
v.shot('first');
const [headBox, pictureBox] = take(v.area(), 'top', 110, 20);
v.add('firstHead', 'text', { text: v.t('One idea, in a few words'), role: 'kicker' }, { box: headBox });
const picture = v.scene(
  'first',
  [
    { id: 'thing', kind: 'box', x: 100, y: 200, w: 400, h: 240, text: 'A thing', fontSize: 56 },
    { id: 'other', kind: 'box', x: 1100, y: 200, w: 400, h: 240, text: 'Another thing', fontSize: 56, opacity: 0 },
  ],
  { box: pictureBox, width: 1600, height: 640 },
);
const showLine = v.say('Show one thing, and say what it is.');
picture.ring(showLine, 'thing');
const nextLine = v.say('Then bring in the next thing, when you talk about it.');
picture.clear(nextLine);
picture.show(nextLine, 'other');

// A new word gets a word card: v.term('word', 'What it means, in plain words.', line, { say: 'The meaning, spoken.' });
// A quick quiz before an answer worth working out. The narrator says one is coming, reads the
// question aloud, then is quiet while the countdown runs: v.think('The question?', 4, { hint: 'a nudge' });

// --- 3. Recap: the same points, in the same words ----------------------------------
v.chapter('What to remember');
v.recap('What to remember', [
  ['The first point, **as shown**', 'The first point, as it is spoken.'],
  ['The second point', 'The second point, as it is spoken.'],
]);

export default v.build();
`;
  const [width, height] = args.vertical ? [1080, 1920] : [1920, 1080];
  const json = {
    format: 'video-script',
    version: 1,
    id,
    title: { $t: 'title' },
    stage: { width, height, fps: 30, background: '#0b1626' },
    defaultLanguage: 'en',
    tail: 2,
    strings: { en: { title, question: 'Start with the question this video answers.' } },
    tracks: [
      { id: 'base', kind: 'visual', clips: [{ id: 'heading', module: 'text', start: '@start', box: { x: width * 0.08, y: height * 0.2, w: width * 0.84, h: height * 0.4 }, props: { text: { $t: 'title' }, role: 'title' }, in: 'slide-up' }] },
      { id: 'voice', kind: 'narration', segments: [{ id: 'question', text: { $t: 'question' } }] },
    ],
    markers: [{ kind: 'chapter', at: '@start', label: { $t: 'title' } }],
  };
  const file = join(ROOT, 'videos', `${id}.${args.json ? 'json' : 'mjs'}`);
  const other = ['mjs', 'js', 'json'].map((ext) => join(ROOT, 'videos', `${id}.${ext}`)).find(existsSync);
  if (other) kept.push(rel(other));
  else {
    mkdirSync(join(ROOT, 'videos'), { recursive: true });
    writeFileSync(file, args.json ? `${JSON.stringify(json, null, 2)}\n` : kit);
    written.push(rel(file));
  }

  for (const f of written) console.log(`  wrote  ${f}`);
  for (const f of kept) console.log(`  kept   ${f} (already there)`);
  console.log(`\nNext: fill in notes/${id}/brief.md, then follow the stages in order (research, mind map, storyboard, script, reviews).`);
});
