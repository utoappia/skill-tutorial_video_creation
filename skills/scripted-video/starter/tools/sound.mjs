#!/usr/bin/env node
// Makes the sound effects and the music a video needs with a generation service,
// from a list you write: assets/<video>/sounds.json. Then measures every file,
// because whoever runs this may not be able to listen.
//
//   node tools/sound.mjs intro              make every sound in the list that does not exist yet
//   node tools/sound.mjs intro --dry        only say what would be made
//   node tools/sound.mjs intro --only pop.wav --fresh    make one again (a new try costs credits again)
//   node tools/sound.mjs intro --measure    make nothing; measure the files that are there
//
// The list (assets/<video>/sounds.json):
//   {
//     "service": "elevenlabs",
//     "sounds": [
//       { "file": "card.wav", "kind": "effect", "use": "a word card appears",
//         "prompt": "one soft marimba note, warm, short, no echo", "seconds": 1, "influence": 0.6 },
//       { "file": "story.m4a", "kind": "music", "use": "under the history chapter",
//         "prompt": "calm, curious documentary underscore, soft piano and light strings, slow, no drums, no vocals", "seconds": 60 }
//     ]
//   }
//   kind      "effect" (0.5 to 30 seconds) or "music" (3 seconds to 10 minutes; always without singing)
//   seconds   how long. Leave it out for music and the tool measures the part of the video the
//             music plays under (the v.music() that uses the file) and adds three seconds.
//             Record the voice first: before that, the length is only an estimate.
//   influence effects only, 0 to 1: how closely to follow the prompt (default 0.5)
//   use       where the sound is used; it goes into the credits file
//
// Services
//   elevenlabs  ELEVENLABS_API_KEY. A paid service: every sound made uses the account's credits.
//
// What it does with each result: trims silence from the start of an effect (so it
// plays at the moment the script names), sets the loudest moment to the same level
// in every file (so `volume` means the same for each), and writes a row in
// assets/<video>/CREDITS.md with the service, the date and the prompt.
// Keys are read from the environment and nowhere else. Never put a key in a file.
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join } from 'node:path';
import { assetPath, compileVideo, die, ensureDir, listVideos, loadVideo, main, needFfmpeg, parseArgs, rel, ROOT, run, voiceFor } from './lib.mjs';

const args = parseArgs();
const PEAK = -3; // dB: the loudest moment of every file after levelling
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(url, headers, body, what) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
    } catch (e) {
      if (attempt >= 4) throw new Error(`${what}: ${e.message}`);
      await sleep(1500 * 2 ** (attempt - 1));
      continue;
    }
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const text = (await res.text()).slice(0, 600);
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(1500 * 2 ** (attempt - 1));
      continue;
    }
    throw new Error(`${what}: HTTP ${res.status} ${text}`);
  }
}

/** Each service: make(sound) → { data, ext, model } (a sound file as the service returns it). */
const SERVICES = {
  elevenlabs: {
    name: 'ElevenLabs',
    key: () => process.env.ELEVENLABS_API_KEY ?? die('Set ELEVENLABS_API_KEY in the environment of this command (never in a file of the project).'),
    limits: { effect: [0.5, 30], music: [3, 600] },
    async make(sound) {
      const headers = { 'xi-api-key': this.key() };
      if (sound.kind === 'music') {
        const body = { prompt: sound.prompt, music_length_ms: Math.round(sound.seconds * 1000), force_instrumental: true, ...(sound.model ? { model_id: sound.model } : {}) };
        return { data: await post('https://api.elevenlabs.io/v1/music', headers, body, 'ElevenLabs music'), ext: 'mp3', model: sound.model ?? 'the default music model' };
      }
      const body = { text: sound.prompt, duration_seconds: sound.seconds, prompt_influence: sound.influence ?? 0.5, ...(sound.model ? { model_id: sound.model } : {}) };
      return { data: await post('https://api.elevenlabs.io/v1/sound-generation', headers, body, 'ElevenLabs sound effects'), ext: 'mp3', model: sound.model ?? 'the default sound-effect model' };
    },
  },
};

/** Length, levels and the silence at the start: what a listener would notice first. */
async function measure(file) {
  const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file]);
  const m = await run('ffmpeg', ['-v', 'info', '-nostats', '-i', file, '-af', 'volumedetect,silencedetect=noise=-50dB:d=0.05', '-vn', '-f', 'null', '-']);
  const lead = /silence_start: (-?[\d.]+)[\s\S]*?silence_end: ([\d.]+)/.exec(m.stderr);
  return {
    seconds: Number(probe.stdout.toString().trim()),
    mean: Number(/mean_volume: ([-\d.]+) dB/.exec(m.stderr)?.[1]),
    peak: Number(/max_volume: ([-\d.]+) dB/.exec(m.stderr)?.[1]),
    lead: lead && Number(lead[1]) <= 0.02 ? Number(lead[2]) : 0,
  };
}
const describe = (m) => `${m.seconds.toFixed(2)} s, mean ${m.mean.toFixed(1)} dB, peak ${m.peak.toFixed(1)} dB${m.lead > 0.05 ? `, ${m.lead.toFixed(2)} s of silence at the start` : ''}`;

/** How long the script plays each file as music: { path: seconds }, and whether the voice was recorded. */
async function musicLengths(id) {
  if (!listVideos().includes(id)) return { lengths: {}, measured: false };
  const script = await loadVideo(id);
  const first = await compileVideo(script);
  const voice = voiceFor(script, first);
  const measured = first.segments.length > 0 && !voice.missing.length && !voice.stale.length;
  const timeline = Object.keys(voice.durations).length ? await compileVideo(script, { durations: voice.durations }) : first;
  const lengths = {};
  for (const s of timeline.sounds) {
    if (!s.loop && s.end === null) continue;
    const file = assetPath(timeline, s.src);
    lengths[file] = Math.max(lengths[file] ?? 0, (s.end ?? timeline.duration) - s.start);
  }
  return { lengths, measured };
}

const CODECS = { '.wav': ['-c:a', 'pcm_s16le'], '.m4a': ['-c:a', 'aac', '-b:a', '192k'], '.mp3': ['-c:a', 'libmp3lame', '-b:a', '192k'], '.ogg': ['-c:a', 'libvorbis', '-q:a', '6'], '.flac': ['-c:a', 'flac'] };

/** One row for the file in assets/<video>/CREDITS.md (replaced when the file is made again). */
function credit(dir, sound, service, model) {
  const path = join(dir, 'CREDITS.md');
  const head = '| File | What | Source | Author | Licence | Notes |\n| --- | --- | --- | --- | --- | --- |\n';
  const cell = (s) => String(s).replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
  const row = `| ${sound.file} | ${cell(`${sound.kind === 'music' ? 'Music' : 'Sound effect'}: ${sound.use ?? 'not stated'}`)} | generated: ${service}, ${cell(model)}, ${new Date().toISOString().slice(0, 10)} | n/a | the service's terms for the account's plan (check them before publishing) | prompt: "${cell(sound.prompt)}" |`;
  let text = existsSync(path) ? readFileSync(path, 'utf8') : `# Credits\n\nEvery file here that was not drawn by the script: where it came from and what may be done with it.\n\n${head}`;
  if (!text.includes('| File |')) text += `\n${head}`;
  const lines = text.replace(/\n+$/, '').split('\n').filter((l) => !l.startsWith(`| ${sound.file} |`));
  writeFileSync(path, `${[...lines, row].join('\n')}\n`);
}

await main(async () => {
  const id = args._[0] ?? die('Which video? node tools/sound.mjs <video>   (the list is assets/<video>/sounds.json)');
  const dir = join(ROOT, 'assets', id);
  const listPath = join(dir, 'sounds.json');
  if (!existsSync(listPath)) die(`No list at ${rel(listPath)}. Write one first (the top of tools/sound.mjs shows the form).`);
  let list;
  try {
    list = JSON.parse(readFileSync(listPath, 'utf8'));
  } catch (e) {
    die(`${rel(listPath)} is not valid JSON: ${e.message}`);
  }
  const service = SERVICES[list.service ?? 'elevenlabs'] ?? die(`Unknown service "${list.service}". There are: ${Object.keys(SERVICES).join(', ')}`);
  await needFfmpeg();
  const seen = new Set();
  let fit = null;
  for (const s of list.sounds ?? []) {
    if (s.kind === 'music' && s.seconds === undefined) {
      fit ??= await musicLengths(id);
      const length = fit.lengths[join(dir, s.file)];
      if (!length) die(`${rel(listPath)}: "${s.file}" has no "seconds", and videos/${id} does not use it as music yet. Add v.music() with a start and an end to the script first, or give "seconds".`);
      s.seconds = Math.ceil(length) + 3;
      s.fitted = `${length.toFixed(1)} s in the script${fit.measured ? '' : ', ESTIMATED: the voice is not recorded (or lines changed since), so the real length will differ'}`;
    }
    if (!s.file || !s.prompt || !['effect', 'music'].includes(s.kind)) die(`${rel(listPath)}: every sound needs "file", "prompt" and "kind" ("effect" or "music"): ${JSON.stringify(s)}`);
    if (!CODECS[extname(s.file)]) die(`${rel(listPath)}: "${s.file}" must end in ${Object.keys(CODECS).join(', ')}`);
    if (seen.has(s.file)) die(`${rel(listPath)}: two sounds are called "${s.file}"`);
    seen.add(s.file);
    const [min, max] = service.limits[s.kind];
    if (!(s.seconds >= min && s.seconds <= max)) die(`${rel(listPath)}: "${s.file}" needs "seconds" between ${min} and ${max} for ${s.kind === 'music' ? 'music' : 'an effect'}`);
  }
  const wanted = (list.sounds ?? []).filter((s) => !args.only || s.file === args.only);
  if (args.only && !wanted.length) die(`No sound called "${args.only}" in ${rel(listPath)}`);
  const todo = args.measure ? [] : wanted.filter((s) => args.fresh || !existsSync(join(dir, s.file)));
  const seconds = (kind) => todo.filter((s) => s.kind === kind).reduce((n, s) => n + s.seconds, 0);
  console.log(`${id}: ${wanted.length} sound(s) in the list, ${todo.length} to make with ${service.name}${todo.length ? ` (${seconds('effect')} s of effects, ${seconds('music')} s of music): this is a paid service and uses the account's credits` : ''}`);
  if (args.dry) {
    for (const s of todo) console.log(`  would make ${s.file}  ${s.kind}, ${s.seconds} s${s.fitted ? ` (${s.fitted})` : ''}: "${s.prompt}"`);
    return;
  }

  for (const s of todo) {
    const target = join(dir, s.file);
    ensureDir(dirname(target));
    const made = await service.make(s);
    const raw = join(tmpdir(), `sound-${process.pid}-${Date.now()}.${made.ext}`);
    writeFileSync(raw, made.data);
    try {
      // An effect must start at once; music keeps its own opening.
      const trim = s.kind === 'effect' ? 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.01,' : '';
      const before = await measure(raw);
      if (!Number.isFinite(before.peak) || before.peak < -80) throw new Error(`${s.file} came back silent. Try again with --only ${s.file} --fresh, or change the prompt.`);
      const r = await run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', `${trim}volume=${(PEAK - before.peak).toFixed(2)}dB`, '-ar', '48000', '-ac', '2', ...CODECS[extname(s.file)], target]);
      if (r.code !== 0) throw new Error(`ffmpeg could not convert ${s.file}: ${r.stderr.trim()}`);
    } finally {
      rmSync(raw, { force: true });
    }
    credit(dir, s, service.name, made.model);
    console.log(`  made ${rel(target)}`);
  }

  // The report: read it as you would listen.
  for (const s of wanted) {
    const file = join(dir, s.file);
    if (!existsSync(file)) {
      console.log(`  ! ${s.file}: not made yet`);
      continue;
    }
    const m = await measure(file);
    const notes = [];
    if (m.seconds < s.seconds * 0.6) notes.push(`much shorter than the ${s.seconds} s asked for`);
    if (s.fitted && m.seconds < s.seconds - 3.5) notes.push(`shorter than the part it plays under (${s.fitted}): it will repeat from its start. Make it again: --only ${s.file} --fresh`);
    if (s.kind === 'effect' && m.lead > 0.08) notes.push('starts late: it will sound after the thing it marks');
    if (s.kind === 'effect' && m.seconds > 3) notes.push('long for an effect: it may run under the next line');
    console.log(`  ${notes.length ? '!' : '✓'} ${s.file}  ${s.kind}, ${describe(m)}${notes.length ? `  (${notes.join('; ')})` : ''}`);
  }
  console.log(`  Nobody has listened yet: play each file once (or ask the user to) before the video goes out.\n  Credits: ${rel(join(dir, 'CREDITS.md'))}`);
});
