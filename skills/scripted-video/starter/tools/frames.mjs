#!/usr/bin/env node
// Looks at a finished video file the way a viewer's player shows it: pulls
// frames out of the .mp4, lays them out on contact sheets, and measures the
// sound. Use it to review the real export (not the page it was drawn from),
// and for any other video file: a screen recording, a clip from a generator.
//
//   node tools/frames.mjs out/intro.mp4                 a frame every 2 seconds, on contact sheets
//   node tools/frames.mjs out/intro.mp4 --every 0.5 --from 30 --to 40    a stretch, closely (or --from 0:30)
//   node tools/frames.mjs out/intro.mp4 --all --from 12 --to 13          every single frame of one second
//   node tools/frames.mjs out/intro.mp4 --at 12.5       one frame, full size
//   options: --cols 4  --width 480 (of each cell)
//
// Output: out/frames/<name>/sheet-01.jpg … and index.txt (which cell is which moment).
import { existsSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { clock, die, ensureDir, main, needFfmpeg, OUT, parseArgs, rel, run } from './lib.mjs';

// A time on the command line: seconds ("336"), or a timecode ("5:36", "1:02:03.5").
function seconds(value, name) {
  const parts = String(value).split(':');
  const n = parts.reduce((sum, part) => sum * 60 + Number(part), 0);
  if (!parts.every((part) => /^\d+(\.\d+)?$/.test(part)) || !Number.isFinite(n)) die(`--${name} ${value}: give seconds (336) or a timecode (5:36)`);
  return n;
}

const args = parseArgs();

await main(async () => {
  await needFfmpeg();
  if (!args._.length) die('Which file? node tools/frames.mjs out/intro.mp4');
  for (const given of args._) {
    const file = resolve(process.cwd(), given);
    if (!existsSync(file)) die(`No file ${given}`);
    const probe = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height,avg_frame_rate,pix_fmt,channels,sample_rate', '-of', 'json', file]);
    if (probe.code !== 0) die(`ffprobe could not read ${given}: ${probe.stderr.trim()}`);
    const info = JSON.parse(probe.stdout.toString());
    const v = info.streams.find((s) => s.codec_type === 'video');
    const a = info.streams.find((s) => s.codec_type === 'audio');
    const duration = Number(info.format.duration);
    if (!v) die(`${given} has no picture`);
    const [num, den] = String(v.avg_frame_rate).split('/').map(Number);
    const fps = den ? num / den : num;
    const dir = join(OUT, 'frames', basename(file).replace(/\.[^.]+$/, ''));

    if (args.at !== undefined) {
      ensureDir(dir);
      const out = join(dir, `at-${String(args.at).replace('.', '_')}.png`);
      const r = await run('ffmpeg', ['-v', 'error', '-y', '-ss', String(args.at), '-i', file, '-frames:v', '1', out]);
      if (r.code !== 0) die(r.stderr.trim());
      console.log(`✓ ${rel(out)}`);
      continue;
    }

    rmSync(dir, { recursive: true, force: true });
    ensureDir(dir);
    const from = Math.max(0, seconds(args.from ?? 0, 'from'));
    const to = Math.min(duration, seconds(args.to ?? duration, 'to'));
    const every = args.all ? 1 / fps : Number(args.every ?? Math.max(2, Math.ceil((to - from) / 96)));
    const cols = Number(args.cols ?? 4);
    const rows = 3;
    const width = Number(args.width ?? 480);
    // Each cell is stamped with its own time, so a sheet can be read without the index.
    const label = "drawtext=text='%{pts\\:hms}':x=8:y=8:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=4";
    // The first frame at or after each step (an "fps" filter would pick frames half a step late).
    const pick = `select='isnan(prev_selected_t)+gte(floor((t-${from})/${every})\\,floor((prev_selected_t-${from})/${every})+1)',`;
    const chain = `${args.all ? '' : pick}scale=${width}:-2,${label},tile=${cols}x${rows}:padding=6:margin=6:color=0x111111`;
    const read = (filters) => run('ffmpeg', ['-v', 'error', '-y', '-ss', String(from), '-to', String(to), '-copyts', '-i', file, '-vf', filters, '-fps_mode', 'passthrough', '-q:v', '3', join(dir, 'sheet-%02d.jpg')]);
    let r = await read(chain);
    if (r.code !== 0) {
      // An ffmpeg built without text drawing: the same sheets, without the stamps.
      r = await read(chain.replace(`${label},`, ''));
      if (r.code !== 0) die(`ffmpeg could not read frames: ${r.stderr.trim()}`);
    }
    const sheets = readdirSync(dir).filter((f) => f.startsWith('sheet-')).sort();
    const count = Math.floor(Math.max(0, to - from - 0.5 / fps) / every) + 1;
    const index = [];
    for (let i = 0; i < count; i++) index.push(`sheet-${String(Math.floor(i / (cols * rows)) + 1).padStart(2, '0')}  row ${Math.floor((i % (cols * rows)) / cols) + 1} col ${(i % cols) + 1}  ${clock(from + i * every)}`);
    writeFileSync(join(dir, 'index.txt'), `${index.join('\n')}\n`);

    // Sound: how loud it is, and where it goes quiet for a long time.
    let sound = 'no sound';
    const notes = [];
    if (a) {
      const m = await run('ffmpeg', ['-v', 'info', '-nostats', '-i', file, '-af', 'volumedetect,silencedetect=noise=-45dB:d=4', '-vn', '-f', 'null', '-']);
      const mean = /mean_volume: ([-\d.]+) dB/.exec(m.stderr)?.[1];
      const max = /max_volume: ([-\d.]+) dB/.exec(m.stderr)?.[1];
      sound = `sound ${a.codec_name} ${a.sample_rate} Hz, mean ${mean} dB, peak ${max} dB`;
      if (Number(max) > -0.1) notes.push('the sound hits full scale: it may be clipping');
      if (Number(mean) < -35) notes.push('the sound is very quiet');
      const quiet = [...m.stderr.matchAll(/silence_start: ([\d.]+)[\s\S]*?silence_end: ([\d.]+)/g)].map((x) => `${clock(Number(x[1]))}–${clock(Number(x[2]))}`);
      if (quiet.length) notes.push(`silent for more than 4 s at: ${quiet.join(', ')} (meant, or a missing line?)`);
    }
    console.log(`✓ ${given}: ${clock(duration)}, ${v.width}×${v.height}, ${fps.toFixed(2)} fps, ${v.codec_name} ${v.pix_fmt}; ${sound}`);
    console.log(`    ${sheets.length} sheet(s), one frame every ${every < 1 ? every.toFixed(3) : every} s: ${sheets.map((s) => rel(join(dir, s))).join(', ')}`);
    for (const n of notes) console.log(`    ! ${n}`);
  }
});
