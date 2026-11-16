#!/usr/bin/env node
// Makes the video file: draws every frame in a headless browser, mixes the
// narration, sound effects and music, and encodes an .mp4 with ffmpeg.
// Subtitle files and a chapter list are written next to it.
//
//   node tools/export.mjs intro                    out/intro.mp4 (+ .srt, .vtt, .chapters.txt)
//   node tools/export.mjs intro --preview          a quick small draft (half size, 15 frames a second)
//   node tools/export.mjs intro --clean            no captions in the picture (upload the .srt instead)
//   node tools/export.mjs intro --lang fr          another language   → out/intro.fr.mp4
//   node tools/export.mjs intro --layout vertical  another shape      → out/intro.vertical.mp4
//   node tools/export.mjs intro --from 30 --to 45  a stretch of it (seconds, "1:05", or a reference: --from @n7 --to @n9.end)
//   node tools/export.mjs intro --thumbnail 12.5   a full-size picture of one moment (no video); with no time, the middle of the video
//   node tools/export.mjs intro --subs-only        only the subtitle and chapter files
//   node tools/export.mjs intro --sound-only       mix the sound again and put it into the file already exported; the pictures
//                                                  are kept, so it takes seconds. For a change to music or sound levels only.
//   node tools/export.mjs intro --omit deep        a shorter version: without the deep details → out/intro.no-deep.mp4
//                                                  (--omit all → out/intro.core.mp4; --omit name,name → out/intro.cut.mp4)
//   options: --scale 2 (4K from a 1080p stage)  --fps 60  --crf 18 (smaller = better and bigger)
//            --voice <provider>  --no-audio  --out <file.mp4>  --allow-stale
//
// The video is timed to the recorded voice (tools/tts.mjs). With no recorded
// voice the export is silent and timed by estimate: fine for a draft, not for
// publishing.
import { spawn } from 'node:child_process';
import { existsSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { subtitleCues, toSrt, toVtt } from '../engine/evaluate.js';
import { assetPath, chapterClock, clock, compileVideo, decodeAudio, deepChapters, die, ensureDir, launchBrowser, loadVideo, main, needFfmpeg, openStage, OUT, parseArgs, pickVideos, RATE, rel, ROOT, run, serve, pcmInput, timeOption, voiceFor, writePcm } from './lib.mjs';

const args = parseArgs();

/**
 * The whole soundtrack as one stereo buffer: every narration line where the
 * timeline puts it, every sound and music clip with its volume, fades and loop,
 * and music turned down while someone is speaking.
 */
async function mix(timeline, voice, from, to) {
  const frames = Math.ceil((to - from) * RATE);
  const out = new Float32Array(frames * 2);
  const notes = [];
  const speech = timeline.segments.filter((s) => voice.files[s.id]).map((s) => [s.start, s.start + voice.durations[s.id]]);
  // How far music is turned down at a moment: 1 away from speech, DUCK under it, with a short slope either side.
  const DUCK = 0.35;
  const SLOPE = 0.3;
  // This is asked once for every sample of music, so it must not look through every line:
  // a long video has thousands of lines and its music has millions of samples. The lines are in
  // order of time, so the first line that ends at or after the moment is found by halving, and
  // only that line and the one before it can be near.
  speech.sort((x, y) => x[0] - y[0]);
  for (let i = 1; i < speech.length; i++) speech[i][1] = Math.max(speech[i][1], speech[i - 1][1]);
  const duckAt = (t) => {
    let lo = 0;
    let hi = speech.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (speech[mid][1] < t) lo = mid + 1;
      else hi = mid;
    }
    let near = Infinity;
    if (lo < speech.length) {
      if (t >= speech[lo][0]) return DUCK;
      near = speech[lo][0] - t;
    }
    if (lo > 0) near = Math.min(near, t - speech[lo - 1][1]);
    return near >= SLOPE ? 1 : DUCK + (1 - DUCK) * (near / SLOPE);
  };
  // Loudness in short windows, kept apart for the voice and for each piece of music,
  // so the two can be compared afterwards: nobody may be listening.
  const WINDOW = 0.05;
  const windows = Math.ceil((to - from) / WINDOW) + 1;
  const add = (samples, at, gainAt, energy) => {
    const count = samples.length / 2;
    const first = Math.round((at - from) * RATE);
    for (let i = Math.max(0, -first); i < count && first + i < frames; i++) {
      const g = gainAt ? gainAt(i / RATE) : 1;
      const l = samples[i * 2] * g;
      const r = samples[i * 2 + 1] * g;
      out[(first + i) * 2] += l;
      out[(first + i) * 2 + 1] += r;
      if (energy) energy[Math.floor((first + i) / RATE / WINDOW)] += (l * l + r * r) / 2;
    }
  };
  const voiceEnergy = new Float32Array(windows);
  for (const seg of timeline.segments) {
    const file = voice.files[seg.id];
    if (file && seg.start < to && seg.end > from) add(await decodeAudio(join(ROOT, file)), seg.start, null, voiceEnergy);
  }
  const report = [];
  const dB = (meanSquare) => 10 * Math.log10(Math.max(meanSquare, 1e-12));
  const decoded = new Map();
  let musicTotal = 0;
  let musicPieces = 0;
  for (const s of timeline.sounds) {
    const file = assetPath(timeline, s.src);
    if (!existsSync(file)) {
      notes.push(`sound not found, left out: ${s.src}`);
      continue;
    }
    if (!decoded.has(file)) decoded.set(file, await decodeAudio(file));
    let samples = decoded.get(file).subarray(Math.round(s.from * RATE) * 2);
    const natural = samples.length / 2 / RATE;
    if (natural <= 0) continue;
    const length = s.end !== null ? s.end - s.start : s.loop ? timeline.duration - s.start : natural;
    let repeats = 0;
    let blend = 0;
    if (s.loop && length > natural) {
      // The piece is shorter than its part, so it plays again. A plain restart can click or
      // jump, so each restart fades in over the last seconds of the round before it.
      blend = Math.min(3, natural / 4);
      const have = samples.length / 2;
      const over = Math.round(blend * RATE);
      const period = have - over;
      const count = Math.ceil(length * RATE);
      const looped = new Float32Array(count * 2);
      for (let i = 0; i < count; i++) {
        const p = i % period;
        const round = Math.floor(i / period);
        if (round > 0 && p < over) {
          const k = (p / over) * (Math.PI / 2);
          const up = Math.sin(k);
          const down = Math.cos(k);
          looped[i * 2] = samples[p * 2] * up + samples[(period + p) * 2] * down;
          looped[i * 2 + 1] = samples[p * 2 + 1] * up + samples[(period + p) * 2 + 1] * down;
        } else {
          looped[i * 2] = samples[p * 2];
          looped[i * 2 + 1] = samples[p * 2 + 1];
        }
      }
      repeats = Math.floor((count - 1) / period);
      samples = looped;
    } else if (length < natural) samples = samples.subarray(0, Math.round(length * RATE) * 2);
    const played = Math.min(length, samples.length / 2 / RATE);
    const isMusic = s.loop || s.end !== null;
    const energy = isMusic ? new Float32Array(windows) : null;
    add(samples, s.start, (local) => {
      let g = s.volume;
      if (s.fadeIn > 0 && local < s.fadeIn) g *= local / s.fadeIn;
      if (s.fadeOut > 0 && local > played - s.fadeOut) g *= Math.max(0, (played - local) / s.fadeOut);
      return s.duck ? g * duckAt(s.start + local) : g;
    }, energy);
    if (!isMusic) continue;
    // Compare the music with the voice where both sound, and measure it alone where nobody speaks.
    const per = WINDOW * RATE;
    const speechFloor = 1e-5 * per; // a window counts as speech above about −50 dB
    let voiceSum = 0;
    let underSum = 0;
    let under = 0;
    let aloneSum = 0;
    let alone = 0;
    const a = Math.max(0, Math.floor((s.start - from) / WINDOW));
    const b = Math.min(windows, Math.ceil((s.start + played - from) / WINDOW));
    for (let w = a; w < b; w++) {
      if (voiceEnergy[w] > speechFloor) {
        voiceSum += voiceEnergy[w];
        underSum += energy[w];
        under++;
      } else {
        aloneSum += energy[w];
        alone++;
      }
    }
    const span = `${clock(s.start)} to ${clock(s.start + played)}${repeats ? ` (the file is ${natural.toFixed(0)} s long, so it starts again from its beginning ${repeats} time(s), each time blended in over ${blend.toFixed(1)} s; make the piece longer if a repeat should not be heard)` : ''}`;
    const percent = (played / Math.max(0.001, timeline.duration)) * 100;
    const share = percent < 10 ? percent.toFixed(1) : Math.round(percent);
    musicTotal += played;
    musicPieces += 1;
    if (!under) report.push({ text: `music ${s.src}, ${span} (${share}% of the video): nobody speaks over it; its level is ${dB(aloneSum / Math.max(1, alone) / per).toFixed(1)} dB` });
    else {
      const gap = dB(voiceSum / under / per) - dB(underSum / under / per);
      const low = gap < 12;
      report.push({
        warn: low,
        text: `music ${s.src}, ${span} (${share}% of the video): the voice is ${gap.toFixed(1)} dB above the music while someone speaks${alone ? `; the music alone, between lines, is ${dB(aloneSum / alone / per).toFixed(1)} dB` : ''}${low ? `. That is too close: the music may cover the words. Lower its volume (now ${s.volume}) until the voice is 15 dB or more above it` : gap < 15 ? '. Just enough; 15 dB or more is safer' : ''}`,
      });
    }
  }
  if (musicPieces > 1) report.push({ text: `music in all: ${musicPieces} stretches, ${clock(musicTotal)}, ${((musicTotal / Math.max(0.001, timeline.duration)) * 100).toFixed(1)}% of the video` });
  // Never clip: if the loudest moment is over full scale, turn everything down to fit.
  let peak = 0;
  for (let i = 0; i < out.length; i++) peak = Math.max(peak, Math.abs(out[i]));
  if (peak > 0.97) {
    const k = 0.97 / peak;
    for (let i = 0; i < out.length; i++) out[i] *= k;
    notes.push(`the mix was turned down ${Math.round((1 - k) * 100)}% to stop it clipping (lower a sound's volume)`);
  }
  return { samples: out, notes, report, silent: peak === 0 };
}

/** An ffmpeg that takes pictures on its standard input. */
function encoder(ffArgs) {
  const child = spawn('ffmpeg', ffArgs, { stdio: ['pipe', 'ignore', 'pipe'] });
  let stderr = '';
  child.stderr.on('data', (d) => (stderr = (stderr + d).slice(-4000)));
  let failed = null;
  child.stdin.on('error', (e) => (failed = e));
  const closed = new Promise((done) => child.on('close', (code) => done(code)));
  return {
    async write(buffer) {
      if (failed) throw new Error(`ffmpeg stopped: ${stderr.trim()}`);
      if (!child.stdin.write(buffer)) await new Promise((r) => child.stdin.once('drain', r));
    },
    async finish() {
      child.stdin.end();
      const code = await closed;
      if (code !== 0) throw new Error(`ffmpeg failed (${code}):\n${stderr.trim()}`);
    },
  };
}

const metaEscape = (s) => String(s).replace(/([=;#\\\n])/g, '\\$1');

await main(async () => {
  const ids = pickVideos(args);
  if (args.out && ids.length > 1) die('--out names one file: export one video at a time with it.');
  const needsBrowser = !args['subs-only'] && !args['sound-only'];
  if ((needsBrowser && args.thumbnail === undefined) || args['sound-only']) await needFfmpeg();
  const server = needsBrowser ? await serve() : null;
  const browser = needsBrowser ? await launchBrowser() : null;
  try {
    for (const id of ids) {
      const began = Date.now();
      const script = await loadVideo(id);
      const language = args.lang ?? script.defaultLanguage ?? 'en';
      const layout = args.layout;
      const first = await compileVideo(script, { language, layout });
      if (first.untranslated.length) console.log(`! ${id}: ${first.untranslated.length} text(s) have no ${language} translation and will appear in ${script.defaultLanguage ?? 'en'}`);
      const voice = voiceFor(script, first, { language, provider: args.voice });
      if (voice.stale.length && !args['allow-stale']) die(`${id}: ${voice.stale.length} line(s) changed after the voice was recorded (${voice.stale.join(', ')}). Record again: node tools/tts.mjs ${id}${language !== (script.defaultLanguage ?? 'en') ? ` --lang ${language}` : ''}${voice.provider ? ` --provider ${voice.provider}` : ''}   (or pass --allow-stale for a draft)`);
      const timeline = await compileVideo(script, { language, layout, durations: voice.durations });
      const from = Math.max(0, timeOption(timeline, args.from ?? 0, 'from'));
      const to = Math.min(timeline.duration, timeOption(timeline, args.to ?? timeline.duration, 'to'));
      if (!(to > from)) die(`--from ${from} --to ${to}: nothing to export (the video is ${clock(timeline.duration)} long)`);
      const whole = from === 0 && to === timeline.duration;
      // A version with details left out on the command line gets its own name, so that it never replaces the full video.
      const cut = typeof args.omit === 'string' ? (args.omit === 'all' ? 'core' : args.omit === 'deep' ? 'no-deep' : 'cut') : null;
      const name = [id, language !== (script.defaultLanguage ?? 'en') ? language : null, layout, cut, args.clean ? 'clean' : null, args.preview ? 'preview' : null, whole ? null : `${Math.round(from)}-${Math.round(to)}`].filter(Boolean).join('.');
      const target = args.out ? resolve(String(args.out)) : join(ensureDir(OUT), `${name}.mp4`);
      ensureDir(dirname(target));
      const base = target.replace(/\.mp4$/i, '');

      // One picture of one moment.
      if (args.thumbnail !== undefined) {
        const stage = await openStage(browser, server.url, script, { language, layout, durations: voice.durations, captions: false, scale: Number(args.scale ?? 1) });
        const t = args.thumbnail === true ? timeline.duration / 2 : timeOption(timeline, args.thumbnail, 'thumbnail'); // no time given: the middle, when things have arrived
        const { data } = await stage.shoot(t, { format: 'png' });
        await stage.close();
        writeFileSync(`${base}.thumbnail.png`, data);
        console.log(`✓ ${rel(`${base}.thumbnail.png`)} (${clock(t)})`);
        continue;
      }

      // Subtitles and chapters, for the upload page and for players.
      const cues = subtitleCues(timeline)
        .filter((c) => c.end > from && c.start < to)
        .map((c) => ({ ...c, start: Math.max(from, c.start), end: Math.min(to, c.end) }));
      writeFileSync(`${base}.srt`, toSrt(cues, from));
      writeFileSync(`${base}.vtt`, toVtt(cues, from));
      const shown = timeline.chapters.filter((c) => c.end > from && c.start < to);
      const shift = (c) => ({ ...c, start: Math.max(0, c.start - from), end: Math.min(to, c.end) - from });
      const chapters = shown.map(shift);
      const chapterList = (list) => `${list.map((c, i) => `${chapterClock(i === 0 ? 0 : c.start)} ${c.label}`).join('\n')}\n`;
      if (chapters.length) writeFileSync(`${base}.chapters.txt`, chapterList(chapters));
      // A second, short list: the chapters that do not begin inside a deep detail, at the times of this file.
      const deep = deepChapters(script, timeline);
      const mainChapters = shown.filter((c) => !deep.has(c)).map(shift);
      const hasMain = mainChapters.length > 0 && mainChapters.length < chapters.length;
      if (hasMain) writeFileSync(`${base}.chapters.main.txt`, chapterList(mainChapters));
      else rmSync(`${base}.chapters.main.txt`, { force: true });
      const DESCRIPTION = 5000; // characters a description usually holds
      const chapterNotes = [];
      if (hasMain) chapterNotes.push(`· ${rel(`${base}.chapters.main.txt`)}: the ${mainChapters.length} chapters outside the deep details (${chapterList(mainChapters).length} characters); .chapters.txt has all ${chapters.length}`);
      if (chapters.length && chapterList(chapters).length > DESCRIPTION) chapterNotes.push(`! the full chapter list is ${chapterList(chapters).length} characters, and a description usually holds about ${DESCRIPTION}. ${hasMain ? 'Paste the short list (.chapters.main.txt)' : 'Paste fewer chapters'}; the mp4 file itself carries all ${chapters.length}`);
      const captionFiles = `${rel(`${base}.srt`)}, .vtt${chapters.length ? ', .chapters.txt' : ''}`;
      if (args['subs-only']) {
        console.log(`✓ ${captionFiles}`);
        for (const n of chapterNotes) console.log(`    ${n}`);
        continue;
      }

      const preview = !!args.preview;
      const fps = Number(args.fps ?? (preview ? 15 : timeline.fps));
      const scale = Number(args.scale ?? (preview ? 0.5 : 1));
      const crf = Number(args.crf ?? (preview ? 28 : 18));

      // Sound.
      const work = join(tmpdir(), `export-${process.pid}-${Date.now()}`);
      const wav = `${work}.pcm`;
      const meta = `${work}.txt`;
      let sound = { samples: null, notes: [], report: [], silent: true };
      if (!args['no-audio']) {
        sound = await mix(timeline, voice, from, to);
        if (!sound.silent) writePcm(wav, sound.samples);
      }
      writeFileSync(meta, `;FFMETADATA1\ntitle=${metaEscape(timeline.title)}\n${chapters.map((c) => `\n[CHAPTER]\nTIMEBASE=1/1000\nSTART=${Math.round(c.start * 1000)}\nEND=${Math.round(c.end * 1000)}\ntitle=${metaEscape(c.label)}\n`).join('')}`);

      // Only the sound again, into the file that is already there. The pictures are not drawn again.
      if (args['sound-only']) {
        const stop = (message) => {
          rmSync(wav, { force: true });
          rmSync(meta, { force: true });
          die(message);
        };
        if (!existsSync(target)) stop(`--sound-only puts new sound into ${rel(target)}, and that file does not exist yet. Export it once without --sound-only.`);
        if (sound.silent) stop('--sound-only: there is no sound to put in (no recorded voice and no sound clip).');
        const before = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', target]);
        const had = Number(before.stdout.toString().trim());
        if (!(Math.abs(had - (to - from)) <= 0.25)) stop(`--sound-only: ${rel(target)} is ${had.toFixed(2)} s long but the video is now ${(to - from).toFixed(2)} s. The timing changed, so the pictures must be drawn again: export without --sound-only.`);
        const next = `${base}.sound-only.mp4`;
        const made = await run('ffmpeg', ['-v', 'error', '-y', '-i', target, ...pcmInput(wav), '-i', meta, '-map', '0:v', '-map', '1:a', '-map_metadata', '2', '-map_chapters', '2', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', String(RATE), '-movflags', '+faststart', '-t', (to - from).toFixed(4), next]);
        rmSync(wav, { force: true });
        rmSync(meta, { force: true });
        if (made.code !== 0) {
          rmSync(next, { force: true });
          die(`ffmpeg failed (${made.code}):\n${made.stderr.trim()}`);
        }
        renameSync(next, target);
        console.log(`✓ ${rel(target)}  new sound, same pictures (${((Date.now() - began) / 1000).toFixed(0)} s)`);
        console.log('    The pictures were not drawn again. If a word, a picture or the timing changed, export without --sound-only.');
        for (const n of chapterNotes) console.log(`    ${n}`);
        for (const n of sound.notes) console.log(`    ! ${n}`);
        for (const r of sound.report) console.log(`    ${r.warn ? '!' : '·'} ${r.text}`);
        continue;
      }

      // Pictures.
      const stage = await openStage(browser, server.url, script, { language, layout, durations: voice.durations, captions: !args.clean, scale });
      const total = Math.max(1, Math.ceil((to - from) * fps - 1e-9));
      const hasSound = !sound.silent;
      const ff = encoder([
        '-v', 'error', '-y',
        '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
        ...(hasSound ? pcmInput(wav) : []),
        '-i', meta,
        '-map', '0:v', ...(hasSound ? ['-map', '1:a'] : []),
        '-map_metadata', hasSound ? '2' : '1', '-map_chapters', hasSound ? '2' : '1',
        // Even dimensions (the codec needs them) and the colour range and tags players expect.
        '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p',
        '-c:v', 'libx264', '-preset', preview ? 'veryfast' : 'medium', '-crf', String(crf), '-r', String(fps),
        '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
        ...(hasSound ? ['-c:a', 'aac', '-b:a', '192k', '-ar', String(RATE)] : []),
        '-movflags', '+faststart', '-t', (total / fps).toFixed(4),
        target,
      ]);
      const found = new Map();
      const steps = total > 54000 ? 20 : 4; // a line of progress every 25%, or every 5% of a video over half an hour
      let lastData = null;
      let drawn = 0;
      let lastAudit = -Infinity;
      try {
        for (let i = 0; i < total; i++) {
          const t = from + i / fps;
          const { changed, data } = await stage.shoot(t, { quality: preview ? 80 : 95, always: lastData === null });
          if (data) {
            lastData = data;
            drawn += 1;
          }
          // A frame that looks the same as the one before is not drawn again: the last picture is sent once more.
          await ff.write(lastData);
          if (changed && t - lastAudit >= 0.5) {
            lastAudit = t;
            for (const p of await stage.audit()) {
              const key = `${p.clip}: ${p.message}`;
              if (!found.has(key)) found.set(key, { ...p, t });
            }
          }
          if (process.stdout.isTTY) {
            if (i % 30 === 0 || i === total - 1) process.stdout.write(`\r  ${name}: frame ${i + 1}/${total} (${Math.round(((i + 1) / total) * 100)}%)   `);
          } else if (Math.floor(((i + 1) / total) * steps) > Math.floor((i / total) * steps)) console.log(`  ${name}: ${Math.round(((i + 1) / total) * 100)}% (${Math.round((Date.now() - began) / 60000)} min)`);
        }
        await ff.finish();
      } finally {
        if (process.stdout.isTTY) process.stdout.write('\n');
        await stage.close();
        rmSync(wav, { force: true });
        rmSync(meta, { force: true });
      }

      // Check what was made.
      const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate', '-of', 'json', target]);
      const info = probe.code === 0 ? JSON.parse(probe.stdout.toString()) : null;
      const v = info?.streams?.find((s) => s.codec_type === 'video');
      const a = info?.streams?.find((s) => s.codec_type === 'audio');
      const length = Number(info?.format?.duration ?? 0);
      const problems = [];
      if (!v) problems.push('the file has no picture');
      if (Math.abs(length - (to - from)) > 0.25) problems.push(`the file is ${length.toFixed(2)} s long but the video is ${(to - from).toFixed(2)} s`);
      if (hasSound && !a) problems.push('the file has no sound');
      const pageErrors = [...new Set(stage.errors)];
      const auditErrors = [...found.values()].filter((p) => p.severity === 'error');
      const mb = (statSync(target).size / 1e6).toFixed(1);
      const ok = !problems.length && !pageErrors.length;
      console.log(`${ok ? (auditErrors.length || !voice.provider ? '!' : '✓') : '✗'} ${rel(target)}  ${clock(length)}, ${v?.width}×${v?.height}, ${fps} fps, ${mb} MB, ${a ? `sound: ${voice.provider ?? 'no voice'}${timeline.sounds.length ? ` + ${timeline.sounds.length} sound clip(s)` : ''}` : 'silent'}  (${drawn} of ${total} frames differ; ${((Date.now() - began) / 1000).toFixed(0)} s)`);
      console.log(`    ${captionFiles}`);
      for (const n of chapterNotes) console.log(`    ${n}`);
      if (!voice.provider && !args['no-audio']) console.log(`    ! no recorded voice: the export is silent and timed by estimate. Record one: node tools/tts.mjs ${id}`);
      if (voice.stale.length) console.log(`    ! ${voice.stale.length} line(s) are silent: their words changed after recording (${voice.stale.join(', ')})`);
      if (whole && chapters.length && chapters.some((c, i) => i > 0 && c.end - c.start < 10)) console.log('    ! a chapter is under 10 s: video sites ignore chapter lists with one that short');
      for (const n of sound.notes) console.log(`    ! ${n}`);
      for (const r of sound.report) console.log(`    ${r.warn ? '!' : '·'} ${r.text}`);
      for (const p of problems) console.log(`    ✗ ${p}`);
      for (const e of pageErrors) console.log(`    ✗ page: ${e}`);
      for (const p of found.values()) console.log(`    ${p.severity === 'error' ? '✗' : '!'} ${clock(p.t)} ${p.clip}: ${p.message}`);
      if (!ok) process.exitCode = 1;
    }
  } finally {
    await browser?.close();
    await server?.close();
  }
});
