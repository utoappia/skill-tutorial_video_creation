#!/usr/bin/env node
// Records the narration, one sound file per line, and measures each line.
// Everything else (stills, export, the player) then times the video to the
// real voice instead of an estimate.
//
//   node tools/tts.mjs intro                        the free voice of this computer
//   node tools/tts.mjs intro --provider elevenlabs  a studio voice (needs ELEVENLABS_API_KEY)
//   node tools/tts.mjs intro --lang fr
//   node tools/tts.mjs intro --dry                  only say how much would be recorded
//
// Providers
//   say         macOS built-in voice. Free. Options: voice.say = { voice: "Samantha" } (otherwise a voice of the language)
//   espeak      espeak-ng (Linux, Windows, macOS). Free, robotic, fine for timing.
//   command     any program: TTS_COMMAND='piper --model en.onnx --output_file {out}' (the line arrives on stdin,
//               or in place of {text}). Use it for local neural voices.
//   elevenlabs  ELEVENLABS_API_KEY; voice.elevenlabs = { voiceId, modelId?, stability?, similarity?, speed? }
//               (or ELEVENLABS_VOICE_ID / --voice-id)
//   openai      OPENAI_API_KEY; voice.openai = { voice?: "alloy", model?, instructions? }
//   files       your own recordings: assets/voice/<video>/<language>/<lineId>.wav (or .mp3, .m4a)
//
// A line with "audio" in the script (a path or an asset key) always uses that recording, whatever the provider.
//
// Work with the free voice until the script has passed its reviews: a paid
// voice is the last step, and only changed lines are recorded again
// (recordings are cached by provider, voice settings, language and text).
// Keys are read from the environment and nowhere else. Never put a key in a script.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spokenText } from '../engine/speech.js';
import { assetPath, clock, compileVideo, die, ensureDir, loadVideo, main, needFfmpeg, OUT, parseArgs, pickVideos, rel, ROOT, run, sha, voiceManifestPath } from './lib.mjs';

const args = parseArgs();
const CACHE = join(OUT, 'tts', 'cache');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let sayVoices = null;

async function fetchRetry(url, init, what) {
  for (let attempt = 1; ; attempt++) {
    let res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      if (attempt >= 6) throw new Error(`${what}: ${e.message}`);
      await sleep(1000 * 2 ** (attempt - 1));
      continue;
    }
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const body = (await res.text()).slice(0, 400);
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await sleep(1000 * 2 ** (attempt - 1));
      continue;
    }
    throw new Error(`${what}: HTTP ${res.status} ${body}`);
  }
}

/** Each provider: settings(voice, language) → what identifies the voice; speak(text, settings, outFile, language) writes any sound file. */
const PROVIDERS = {
  say: {
    free: true,
    settings: (voice, language) => ({ voice: voice.say?.voice ?? null, rate: Math.round(160 * (voice.rate ?? 1)), auto: voice.say?.voice || /^en\b/i.test(language) ? undefined : language }),
    async speak(text, s, out, language) {
      if (process.platform !== 'darwin') die('The "say" voice only exists on macOS. Use --provider espeak, command, elevenlabs or openai.');
      const file = `${out}.aiff`;
      // No voice chosen: the system voice for English, otherwise the first installed voice of that language.
      let voice = s.voice;
      if (!voice && !/^en\b/i.test(language)) {
        sayVoices ??= (await run('say', ['-v', '?'])).stdout.toString().split('\n').map((l) => /^(.+?)\s{2,}([a-z]{2,3})[_-]/i.exec(l)).filter(Boolean);
        voice = sayVoices.find((m) => m[2].toLowerCase() === language.slice(0, 2).toLowerCase())?.[1].trim();
        if (!voice) die(`This computer has no "say" voice for "${language}" (System Settings → Accessibility → Spoken Content → System Voice → Manage Voices), or use another provider.`);
      }
      const r = await run('say', [...(voice ? ['-v', voice] : []), '-r', String(s.rate), '-o', file, text]);
      if (r.code !== 0) throw new Error(`say failed: ${r.stderr.trim()}`);
      return file;
    },
  },
  espeak: {
    free: true,
    settings: (voice, language) => ({ voice: voice.espeak?.voice ?? language, rate: Math.round(165 * (voice.rate ?? 1)) }),
    async speak(text, s, out) {
      const file = `${out}.wav`;
      const r = await run('espeak-ng', ['-v', s.voice, '-s', String(s.rate), '-w', file, text]).catch(() => die('espeak-ng is not installed ("brew install espeak-ng", "sudo apt install espeak-ng").'));
      if (r.code !== 0) throw new Error(`espeak-ng failed: ${r.stderr.trim()}`);
      return file;
    },
  },
  command: {
    free: true,
    settings: () => ({ command: process.env.TTS_COMMAND ?? die('Set TTS_COMMAND, for example: TTS_COMMAND=\'piper --model voice.onnx --output_file {out}\'') }),
    async speak(text, s, out) {
      const file = `${out}.wav`;
      const parts = s.command.split(/\s+/).map((p) => p.replace('{out}', file).replace('{text}', text));
      const r = await run(parts[0], parts.slice(1), { input: s.command.includes('{text}') ? undefined : text });
      if (r.code !== 0 || !existsSync(file)) throw new Error(`TTS_COMMAND failed: ${r.stderr.trim()}`);
      return file;
    },
  },
  elevenlabs: {
    settings(voice) {
      const v = voice.elevenlabs ?? {};
      const voiceId = args['voice-id'] ?? v.voiceId ?? process.env.ELEVENLABS_VOICE_ID;
      if (!voiceId) die('ElevenLabs needs a voice: set voice.elevenlabs.voiceId in the script, or ELEVENLABS_VOICE_ID, or pass --voice-id.');
      return { voiceId, modelId: v.modelId ?? 'eleven_multilingual_v2', stability: v.stability ?? 0.5, similarity: v.similarity ?? 0.75, speed: Math.min(1.2, Math.max(0.7, v.speed ?? voice.rate ?? 1)) };
    },
    async speak(text, s, out) {
      const key = process.env.ELEVENLABS_API_KEY ?? die('Set ELEVENLABS_API_KEY in your environment (never in a file that is shared).');
      const data = await fetchRetry(
        `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(s.voiceId)}?output_format=mp3_44100_128`,
        { method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' }, body: JSON.stringify({ text, model_id: s.modelId, voice_settings: { stability: s.stability, similarity_boost: s.similarity, speed: s.speed } }) },
        'ElevenLabs',
      );
      writeFileSync(`${out}.mp3`, data);
      return `${out}.mp3`;
    },
  },
  openai: {
    settings: (voice) => ({ voice: voice.openai?.voice ?? 'alloy', model: voice.openai?.model ?? 'gpt-4o-mini-tts', instructions: voice.openai?.instructions ?? null, speed: voice.rate ?? 1 }),
    async speak(text, s, out) {
      const key = process.env.OPENAI_API_KEY ?? die('Set OPENAI_API_KEY in your environment (never in a file that is shared).');
      const data = await fetchRetry(
        'https://api.openai.com/v1/audio/speech',
        { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: s.model, voice: s.voice, input: text, response_format: 'mp3', speed: s.speed, ...(s.instructions ? { instructions: s.instructions } : {}) }) },
        'OpenAI',
      );
      writeFileSync(`${out}.mp3`, data);
      return `${out}.mp3`;
    },
  },
  files: {
    free: true,
    own: true,
    settings: () => ({}),
  },
};

await main(async () => {
  const provider = args.provider ?? (process.platform === 'darwin' ? 'say' : 'espeak');
  const P = PROVIDERS[provider] ?? die(`Unknown provider "${provider}". There are: ${Object.keys(PROVIDERS).join(', ')}`);
  await needFfmpeg();
  ensureDir(CACHE);
  for (const id of pickVideos(args)) {
    const script = await loadVideo(id);
    const language = args.lang ?? script.defaultLanguage ?? 'en';
    const tl = await compileVideo(script, { language });
    if (tl.untranslated.length && !args.force) die(`${id}: ${tl.untranslated.length} text(s) are not translated to ${language} yet; recording them would put the wrong language in the video. (--force to record anyway)`);
    const jobs = tl.segments.map((seg) => {
      const text = spokenText(seg.text, tl.pronunciations, language);
      let settings = seg.audio || P.own ? {} : P.settings(seg.voice ?? {}, language);
      let source = null;
      if (seg.audio) {
        // The script names a recording for this line: it is used whatever the provider.
        source = assetPath(tl, seg.audio);
        if (!existsSync(source)) die(`${id}: line ${seg.id} names the recording "${seg.audio}", which does not exist (${rel(source)})`);
      } else if (P.own) {
        source = ['wav', 'mp3', 'm4a', 'aiff', 'flac', 'ogg'].map((e) => join(ROOT, 'assets', 'voice', id, language, `${seg.id}.${e}`)).find(existsSync) ?? null;
      }
      if (source) settings = { source: rel(source), bytes: readFileSync(source).length };
      else if (P.own) settings = {};
      const key = sha(JSON.stringify([source ? 'files' : provider, settings, language, text]));
      return { seg, text, settings, source, file: join(CACHE, `${key}.wav`) };
    });
    const todo = jobs.filter((j) => !existsSync(j.file) || args.fresh);
    const chars = todo.reduce((n, j) => n + (j.source ? 0 : j.text.length), 0);
    if (P.own) {
      const absent = jobs.filter((j) => !j.source);
      if (absent.length) die(`${id}: no recording for ${absent.length} line(s). Record them as assets/voice/${id}/${language}/<lineId>.wav:\n${absent.map((j) => `  ${j.seg.id}  ${j.text}`).join('\n')}`);
    }
    console.log(`${id} (${language}) with "${provider}": ${jobs.length} lines, ${todo.length} to record (${chars} characters)${P.free ? '' : ': this is a paid service and uses your credits'}`);
    if (args.dry) continue;

    let done = 0;
    const work = async (job) => {
      const tmp = join(tmpdir(), `tts-${process.pid}-${job.seg.id}-${Date.now()}`);
      const raw = job.source ?? (await P.speak(job.text, job.settings, tmp, language));
      // One format for everything, with the silence at each end trimmed so lines sit where the script puts them.
      const trim = 'silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.04,areverse,silenceremove=start_periods=1:start_threshold=-55dB:start_silence=0.08,areverse';
      const r = await run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', trim, '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', job.file]);
      if (r.code !== 0) throw new Error(`ffmpeg could not convert line ${job.seg.id}: ${r.stderr.trim()}`);
      done += 1;
      process.stdout.write(`\r  recorded ${done}/${todo.length}`);
    };
    // A few at a time: fast enough, and gentle on rate limits.
    const queue = [...todo];
    await Promise.all(Array.from({ length: P.free ? 4 : 2 }, async () => {
      while (queue.length) await work(queue.shift());
    }));
    if (todo.length) process.stdout.write('\n');

    const lines = {};
    let total = 0;
    for (const j of jobs) {
      // 44-byte header, 16-bit mono at 48 kHz: the length is exact.
      const duration = (readFileSync(j.file).length - 44) / (48000 * 2);
      if (!(duration > 0.05)) die(`${id}: line ${j.seg.id} came out silent ("${j.text}"). Delete ${rel(j.file)} and try again.`);
      lines[j.seg.id] = { file: rel(j.file), duration: Math.round(duration * 1000) / 1000, text: j.text };
      total += duration;
    }
    const manifest = voiceManifestPath(id, language, provider);
    writeFileSync(manifest, `${JSON.stringify({ provider, language, created: new Date().toISOString(), lines }, null, 2)}\n`);
    const timed = await compileVideo(script, { language, durations: Object.fromEntries(Object.entries(lines).map(([k, v]) => [k, v.duration])) });
    console.log(`  ${clock(total)} of speech; the video is now ${clock(timed.duration)} long (was estimated at ${clock(tl.duration)})`);
    console.log(`  ${rel(manifest)}`);
  }
});
