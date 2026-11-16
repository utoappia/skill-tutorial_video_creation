// Shared by the tools: finding videos, compiling them, a small file server,
// a headless browser, and ffmpeg.
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { closeSync, createReadStream, existsSync, mkdirSync, openSync, readdirSync, readFileSync, statSync, writeSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { compile, ScriptError } from '../engine/compile.js';
import { spokenText } from '../engine/speech.js';
import { parseTime } from '../engine/time.js';

/** The project folder: the one that holds engine/, modules/, tools/ and videos/. */
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = join(ROOT, 'out');
export const rel = (path) => (path.startsWith(ROOT + sep) ? path.slice(ROOT.length + 1) : path);
export const ensureDir = (dir) => (mkdirSync(dir, { recursive: true }), dir);

// --- Command line ---------------------------------------------------------------

// `--help` (or `-h`) on any tool prints the notes at the top of that tool and stops. Without this a
// tool would take `--help` for an option it does not know and start work on every video.
if (process.argv.slice(2).some((a) => a === '--help' || a === '-h') && process.argv[1]) {
  let head = [];
  try {
    for (const line of readFileSync(process.argv[1], 'utf8').split('\n')) {
      if (line.startsWith('#!')) continue;
      if (!line.startsWith('//')) break;
      head.push(line.replace(/^\/\/ ?/, ''));
    }
  } catch {
    head = [];
  }
  console.log(head.length ? head.join('\n') : 'No notes at the top of this tool. Read the file itself.');
  process.exit(0);
}

/** `node tool.mjs intro --lang fr --clean` → { _: ['intro'], lang: 'fr', clean: true } */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) out._.push(a);
    else if (a.includes('=')) out[a.slice(2, a.indexOf('='))] = a.slice(a.indexOf('=') + 1);
    else if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) out[a.slice(2)] = argv[++i];
    else out[a.slice(2)] = true;
  }
  return out;
}

export function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/** Runs a tool's main function and prints script problems the way a person wants to read them. */
export async function main(fn) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof ScriptError) die(e.message);
    die(e.stack ?? String(e));
  }
}

export const clock = (seconds) => {
  const s = Math.round(Math.max(0, seconds) * 10) / 10; // rounded first, so 59.96 never prints as 60.0
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
};

/** A time for a chapter list: 4:05, and 1:04:05 from one hour on, the form video sites read. Never later than the moment. */
export const chapterClock = (seconds) => {
  const s = Math.floor(Math.max(0, seconds) + 1e-6);
  const h = Math.floor(s / 3600);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}:${sec}` : `${Math.floor(s / 60)}:${sec}`;
};

/**
 * The chapters of a timeline that begin inside a deep detail (kit: v.detail(…, { deep: true })).
 * A layered video can have well over a hundred chapters; the ones that are left are the short
 * list for a description, at the times of this same video.
 */
export function deepChapters(script, timeline) {
  const lines = new Set((script.details ?? []).filter((d) => d.deep && !d.omitted).flatMap((d) => d.lines));
  const found = new Set();
  if (!lines.size) return found;
  for (const c of timeline.chapters) {
    const line = timeline.segments.find((s) => s.start >= c.start - 0.3);
    if (line && lines.has(line.id)) found.add(c);
  }
  return found;
}

// --- Videos ---------------------------------------------------------------------

const VIDEO_DIR = join(ROOT, 'videos');

/** Ids of the videos in videos/ (one file each: <id>.mjs, <id>.js or <id>.json). */
export function listVideos() {
  if (!existsSync(VIDEO_DIR)) return [];
  return readdirSync(VIDEO_DIR)
    .filter((f) => /\.(mjs|js|json)$/.test(f) && !f.startsWith('_'))
    .map((f) => f.replace(/\.(mjs|js|json)$/, ''))
    .sort();
}

/**
 * Loads a video's script. A .mjs/.js file default-exports the script (or a
 * function that returns it); a .json file is the script. Translations in
 * videos/i18n/<id>.<language>.json are merged into `strings`.
 */
// A script may mark parts as details (kit: v.detail). `--omit a,b` on any tool leaves those out for that run;
// `--omit all` leaves out every detail, and `--omit deep` every detail marked { deep: true }.
export const omitted = (argv = process.argv.slice(2)) => {
  const i = argv.findIndex((a) => a === '--omit' || a.startsWith('--omit='));
  const value = i < 0 ? '' : argv[i].includes('=') ? argv[i].slice(argv[i].indexOf('=') + 1) : (argv[i + 1] ?? '');
  return value.split(',').map((s) => s.trim()).filter(Boolean);
};

let loads = 0;
export async function loadVideo(id, { omit = omitted() } = {}) {
  const file = ['mjs', 'js', 'json'].map((ext) => join(VIDEO_DIR, `${id}.${ext}`)).find(existsSync);
  if (!file) die(`No video "${id}". There ${listVideos().length === 1 ? 'is' : 'are'}: ${listVideos().join(', ') || '(none; add one to videos/)'}`);
  let script;
  if (file.endsWith('.json')) script = JSON.parse(readFileSync(file, 'utf8'));
  else {
    globalThis.__VIDEO_OMIT__ = omit;
    try {
      const mod = await import(`${pathToFileURL(file).href}?t=${Date.now()}-${loads++}`);
      script = typeof mod.default === 'function' ? await mod.default() : mod.default;
    } catch (e) {
      // A mistake in the script file itself (two things with one name, a detail that says nothing) is a script problem.
      if (!(e instanceof ScriptError) && /^video "/.test(e?.message ?? '')) throw new ScriptError([{ path: rel(file), message: e.message.replace(/^video "[^"]*": /, '') }], id);
      throw e;
    } finally {
      delete globalThis.__VIDEO_OMIT__;
    }
  }
  if (!script || script.format !== 'video-script') die(`${rel(file)} must default-export a script ({ format: "video-script", … })`);
  const i18n = join(VIDEO_DIR, 'i18n');
  if (existsSync(i18n)) {
    for (const f of readdirSync(i18n)) {
      const m = /^(.+)\.([A-Za-z-]+)\.json$/.exec(f);
      if (!m || m[1] !== id) continue;
      const table = JSON.parse(readFileSync(join(i18n, f), 'utf8'));
      script = { ...script, strings: { ...script.strings, [m[2]]: { ...script.strings?.[m[2]], ...Object.fromEntries(Object.entries(table).filter(([, v]) => typeof v === 'string' && v !== '')) } } };
    }
  }
  return script;
}

/** Which videos a command means: the ids given, or all of them. */
export function pickVideos(args) {
  const all = listVideos();
  if (args._.length === 0 || args.all) return all;
  for (const id of args._) if (!all.includes(id)) die(`No video "${id}". There ${all.length === 1 ? 'is' : 'are'}: ${all.join(', ')}`);
  return args._;
}

export const languagesOf = (script) => Object.keys(script.strings ?? { [script.defaultLanguage ?? 'en']: {} });

let modulesPromise = null;
/** The project's modules (modules/index.js): the standard ones plus the project's own. */
export function loadModules() {
  modulesPromise ??= import(pathToFileURL(join(ROOT, 'modules', 'index.js')).href).then((m) => m.default);
  return modulesPromise;
}

export async function compileVideo(script, options = {}) {
  return compile(script, { modules: await loadModules(), ...options });
}

// --- Voices ---------------------------------------------------------------------

/**
 * A time given on the command line: seconds ("12.5"), a timecode ("1:05.2"), or a
 * reference to a line, clip, command, sound or marker of the video
 * ("@n7", "@n7.end", "@ring+0.5", "@n7+40%", "@end-2").
 */
export function timeOption(timeline, value, name = 'at') {
  const all = [...timeline.segments, ...timeline.layers, ...timeline.layers.flatMap((L) => L.commands ?? []), ...(timeline.sounds ?? []), ...(timeline.markers ?? []).map((m) => ({ ...m, start: m.time, end: m.time }))];
  let p;
  try {
    p = parseTime(/^-?\d+(\.\d+)?$/.test(String(value)) ? Number(value) : String(value), (id) => all.some((x) => x.id === id));
  } catch (e) {
    die(`--${name}: ${e.message}`);
  }
  if (p.kind === 'relative') return p.seconds;
  let found = null;
  if (p.id === 'start') found = { start: 0, end: 0 };
  else if (p.id === 'end') found = { start: timeline.duration, end: timeline.duration };
  else found = all.find((x) => x.id === p.id) ?? null;
  if (!found) die(`--${name}: nothing in "${timeline.id}" is called "${p.id}" (lines, clips, commands, sounds and markers can be referred to)`);
  const start = found.start;
  const end = found.end ?? found.start;
  return (p.edge === 'end' ? end : start) + p.offset + p.fraction * (end - start);
}

export const voiceManifestPath = (id, language, provider) => join(OUT, 'tts', `${id}.${language}.${provider}.json`);
export const sha = (text) => createHash('sha256').update(text).digest('hex');

/**
 * The recorded voice for a video, if there is one: measured line lengths and
 * the sound files. Lines whose words have changed since they were recorded are
 * listed in `stale` and left out.
 *   provider: which voice (default: the one recorded most recently)
 */
export function voiceFor(script, timeline, { language, provider } = {}) {
  const lang = language ?? timeline.language;
  const dir = join(OUT, 'tts');
  let file = provider ? voiceManifestPath(script.id, lang, provider) : null;
  if (!provider && existsSync(dir)) {
    const prefix = `${script.id}.${lang}.`;
    const found = readdirSync(dir)
      .filter((f) => f.startsWith(prefix) && f.endsWith('.json'))
      .map((f) => join(dir, f))
      .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
    file = found[0] ?? null;
  }
  if (!file || !existsSync(file)) return { provider: null, durations: {}, files: {}, stale: [], missing: timeline.segments.map((s) => s.id) };
  const manifest = JSON.parse(readFileSync(file, 'utf8'));
  const durations = {};
  const files = {};
  const stale = [];
  const missing = [];
  // Leaving details out (--omit), or adding a line, renumbers the lines that follow. Their words
  // are the same, so a recording that is not under the line's number is looked up by its words.
  const byText = new Map();
  for (const rec of Object.values(manifest.lines ?? {})) if (!byText.has(rec.text)) byText.set(rec.text, rec);
  for (const seg of timeline.segments) {
    const text = spokenText(seg.text, timeline.pronunciations, lang);
    let rec = manifest.lines?.[seg.id];
    if (!rec || rec.text !== text) rec = byText.get(text) ?? rec;
    if (!rec) missing.push(seg.id);
    else if (rec.text !== text || !existsSync(join(ROOT, rec.file))) stale.push(seg.id);
    else {
      durations[seg.id] = rec.duration;
      files[seg.id] = rec.file;
    }
  }
  return { provider: manifest.provider, durations, files, stale, missing };
}

// --- File server ----------------------------------------------------------------

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf', '.srt': 'text/plain; charset=utf-8', '.vtt': 'text/vtt; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

/**
 * Serves the project folder over http on this machine only (ES modules and
 * film need a server; file:// will not do). Returns { url, close }.
 *   /__videos              the list of videos
 *   /__video/<id>?lang=…   a video's script, measured line lengths and voice files
 */
export function serve({ port = 0 } = {}) {
  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const send = (status, body, type = 'application/json; charset=utf-8') => {
        res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
        res.end(body);
      };
      if (url.pathname === '/') {
        res.writeHead(302, { Location: '/engine/web/player.html' });
        return res.end();
      }
      if (url.pathname === '/favicon.ico') {
        res.writeHead(204);
        return res.end();
      }
      if (url.pathname === '/__videos') return send(200, JSON.stringify(listVideos()));
      if (url.pathname.startsWith('/__video/')) {
        const id = decodeURIComponent(url.pathname.slice('/__video/'.length));
        if (!listVideos().includes(id)) return send(404, JSON.stringify({ error: `no video "${id}"` }));
        try {
          const script = await loadVideo(id);
          const language = url.searchParams.get('lang') || script.defaultLanguage || 'en';
          const timeline = await compileVideo(script, { language });
          const voice = voiceFor(script, timeline, { language, provider: url.searchParams.get('voice') || undefined });
          return send(200, JSON.stringify({ script, languages: languagesOf(script), layouts: Object.keys(script.layouts ?? {}), voice }));
        } catch (e) {
          return send(200, JSON.stringify({ error: e.message }));
        }
      }
      const file = normalize(join(ROOT, decodeURIComponent(url.pathname)));
      if (!file.startsWith(ROOT + sep) || !existsSync(file) || !statSync(file).isFile()) return send(404, 'not found', 'text/plain');
      const size = statSync(file).size;
      const headers = { 'Content-Type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
      // Film is fetched in ranges; without them a browser cannot seek in it.
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        if (start > end || start >= size) {
          res.writeHead(416, { 'Content-Range': `bytes */${size}` });
          return res.end();
        }
        res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
        return createReadStream(file, { start, end }).pipe(res);
      }
      res.writeHead(200, { ...headers, 'Content-Length': size });
      createReadStream(file).pipe(res);
    } catch (e) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(String(e.stack ?? e));
    }
  });
  return new Promise((done, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => done({ url: `http://127.0.0.1:${server.address().port}`, close: () => new Promise((r) => (server.closeAllConnections?.(), server.close(r))) }));
  });
}

// --- Browser --------------------------------------------------------------------

/** Starts a headless Chrome (the one installed on this machine, or the one in CHROME_PATH). */
export async function launchBrowser() {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    die('playwright-core is not installed. Run "npm install" in the project folder first.');
  }
  const args = ['--autoplay-policy=no-user-gesture-required', '--force-color-profile=srgb', '--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text'];
  const tries = [process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : null, { channel: 'chrome' }, { channel: 'msedge' }, { channel: 'chromium' }, {}].filter(Boolean);
  const errors = [];
  for (const how of tries) {
    try {
      return await chromium.launch({ ...how, headless: true, args });
    } catch (e) {
      errors.push(String(e.message).split('\n')[0]);
    }
  }
  die(`Could not start a browser. Install Google Chrome, or set CHROME_PATH to a Chrome, Edge or Chromium program, or run "npx playwright-core install chromium".\n${errors.map((e) => `  - ${e}`).join('\n')}`);
}

/**
 * Opens the stage page with a script loaded. Returns { page, info, shoot, errors }.
 *   scale: picture pixels per stage unit (0.5 gives a half-size picture, 2 a 4K one from a 1080p stage)
 */
export async function openStage(browser, baseUrl, script, { language, layout, durations, captions = true, scale = 1 } = {}) {
  const probe = await compileVideo(script, { language, layout, durations });
  const { width, height } = probe.stage;
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  // A browser cancels its own requests for film and sound when it switches to reading them in ranges: not a failure.
  page.on('requestfailed', (r) => {
    if (!/ERR_ABORTED/.test(r.failure()?.errorText ?? '')) errors.push(`could not load ${r.url().replace(baseUrl, '')}`);
  });
  await page.goto(`${baseUrl}/engine/web/frame.html`);
  await page.waitForFunction('window.__ready === true', null, { timeout: 20000 }).catch(() => die(`The stage page did not start.\n${errors.join('\n')}`));
  const info = await page.evaluate(([s, o]) => window.__video.load(s, o), [script, { language, layout, durations, captions }]);
  const client = await context.newCDPSession(page);
  /** Seeks to `time` and takes a picture. Returns { changed, data }: `data` is a Buffer (JPEG or PNG). */
  const shoot = async (time, { format = 'jpeg', quality = 92, always = true } = {}) => {
    const changed = await page.evaluate((t) => window.__video.seek(t), time);
    if (!changed && !always) return { changed, data: null };
    // The clip's scale draws the page again at that size (text stays sharp at 2, and small at 0.5).
    const shot = await client.send('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality } : {}), optimizeForSpeed: format === 'jpeg', clip: { x: 0, y: 0, width, height, scale } });
    return { changed, data: Buffer.from(shot.data, 'base64') };
  };
  const audit = () => page.evaluate(() => window.__video.audit());
  return { page, context, info, timeline: probe, shoot, audit, errors, close: () => context.close() };
}

// --- ffmpeg ---------------------------------------------------------------------

export function run(cmd, args, { input } = {}) {
  return new Promise((done, fail) => {
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    const out = [];
    const err = [];
    child.stdout.on('data', (d) => out.push(d));
    child.stderr.on('data', (d) => err.push(d));
    child.on('error', (e) => fail(e.code === 'ENOENT' ? new Error(`"${cmd}" is not installed (or not on the PATH)`) : e));
    child.on('close', (code) => done({ code, stdout: Buffer.concat(out), stderr: Buffer.concat(err).toString() }));
    child.stdin.on('error', () => {});
    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

export async function needFfmpeg() {
  try {
    const r = await run('ffmpeg', ['-version']);
    if (r.code === 0) return;
  } catch {}
  die('ffmpeg is needed for this. Install it (macOS: "brew install ffmpeg", Ubuntu: "sudo apt install ffmpeg", Windows: "winget install ffmpeg") and try again.');
}

export const RATE = 48000;

/** Decodes any sound file to 48 kHz stereo floats (interleaved). */
export async function decodeAudio(file) {
  const r = await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'f32le', '-ac', '2', '-ar', String(RATE), '-']);
  if (r.code !== 0) throw new Error(`ffmpeg could not read ${rel(file)}: ${r.stderr.trim()}`);
  const buf = r.stdout;
  return new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
}

/**
 * Interleaved stereo floats → a file of plain 16-bit samples (no header), written a piece at a time.
 * A .wav file cannot hold more than about six hours of this, and one buffer for a long video takes
 * gigabytes; plain samples have neither limit. ffmpeg reads the file with `pcmInput(file)`.
 */
export function writePcm(file, samples) {
  const fd = openSync(file, 'w');
  try {
    const step = 1 << 20;
    const piece = Buffer.alloc(step * 2);
    for (let at = 0; at < samples.length; at += step) {
      const n = Math.min(step, samples.length - at);
      for (let i = 0; i < n; i++) piece.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[at + i])) * 32767), i * 2);
      let done = 0;
      while (done < n * 2) done += writeSync(fd, piece, done, n * 2 - done);
    }
  } finally {
    closeSync(fd);
  }
}

/** The ffmpeg input options for a file made by `writePcm`. */
export const pcmInput = (file, channels = 2) => ['-f', 's16le', '-ar', String(RATE), '-ac', String(channels), '-i', file];

/** The file a `src` means: an asset key of the script, or a path from the project folder. */
/** Every file a timeline uses: each "src" in clip props and states, sounds, and fonts (asset keys or paths). */
export function sourcesOf(timeline) {
  const out = new Set();
  const walk = (value) => {
    if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) k === 'src' && typeof v === 'string' ? out.add(v) : walk(v);
  };
  for (const L of timeline.layers) {
    walk(L.initial);
    for (const c of L.commands) walk(c.to);
  }
  for (const s of timeline.sounds) out.add(s.src);
  for (const f of timeline.fonts) out.add(f.src);
  return out;
}

export const assetPath = (timeline, src) => resolve(ROOT, timeline.assets?.[src] ?? src);
