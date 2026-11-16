#!/usr/bin/env node
// Draws the video in a headless browser and saves pictures to look at:
// one per narration line, plus contact sheets, plus a list of everything the
// page itself can tell is wrong (text cut off, labels off the stage, pictures
// that did not load).
//
//   node tools/stills.mjs intro                       one still per line, word card and pause
//   node tools/stills.mjs intro --lang fr --layout vertical
//   node tools/stills.mjs intro --at 12.5,1:05,@n7.end   these moments only (full size); seconds, timecodes or references
//   node tools/stills.mjs intro --every 0.5 --from 30 --to 40    a stretch, frame by frame
//   node tools/stills.mjs intro --shots               one still per shot, at its fullest: every layout of a long video in a few sheets
//   node tools/stills.mjs intro --from 7:40 --to 12:00   the usual stills for one part only (also with --shots)
//   node tools/stills.mjs intro --audit               no pictures: just the list of problems (fast)
//   options: --scale 0.5 (picture size)  --cols 3  --no-captions  --png  --voice <provider>
//
// Output: out/stills/<id>[.<lang>][.<layout>]/ (with --shots: <name>.shots/; with --at or --every: <name>.closer/)
//   001-0m04.2-n1.jpg …   the stills
//   sheet-01.jpg …        contact sheets (read these first)
//   index.txt             which still is which line
//   audit.txt             the problems found
import { readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { clock, compileVideo, ensureDir, launchBrowser, loadVideo, main, openStage, OUT, parseArgs, pickVideos, rel, serve, timeOption, voiceFor } from './lib.mjs';

const args = parseArgs();
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

await main(async () => {
  const server = await serve();
  const browser = await launchBrowser();
  let problems = 0;
  try {
    for (const id of pickVideos(args)) {
      const script = await loadVideo(id);
      const language = args.lang ?? script.defaultLanguage ?? 'en';
      const layout = args.layout;
      const first = await compileVideo(script, { language, layout });
      const voice = voiceFor(script, first, { language, provider: args.voice });
      const durations = voice.durations;
      const custom = args.at !== undefined || args.every !== undefined;
      const scale = Number(args.scale ?? (args.at !== undefined ? 1 : 0.5));
      const stage = await openStage(browser, server.url, script, { language, layout, durations, captions: !args['no-captions'], scale });
      const tl = stage.timeline;

      // Which moments to look at.
      let shots = [];
      if (args.at !== undefined) shots = String(args.at).split(',').map((t) => ({ t: timeOption(tl, t, 'at'), label: 'at' }));
      else if (args.every !== undefined) {
        const from = timeOption(tl, args.from ?? 0, 'from');
        const to = Math.min(tl.duration, timeOption(tl, args.to ?? tl.duration, 'to'));
        for (let t = from; t <= to + 1e-6; t += Number(args.every)) shots.push({ t, label: 'every' });
      } else if (args.shots) {
        // One still per shot, near the end of its last line: the shot at its fullest. For a long video,
        // this is the quick look at every layout before the line-by-line sheets.
        const marks = tl.markers.filter((m) => m.kind === 'note' && String(m.label).startsWith('shot: '));
        marks.forEach((m, i) => {
          const until = marks[i + 1]?.time ?? tl.duration;
          const lines = tl.segments.filter((s) => s.start >= m.time - 0.05 && s.start < until - 0.05);
          const lastLine = lines.at(-1);
          if (lastLine) shots.push({ t: lastLine.start + (lastLine.end - lastLine.start) * 0.85, label: lastLine.id, text: `[${String(m.label).slice(6)}, ${lines.length} line(s)] ${lastLine.text}` });
        });
      } else {
        // Near the end of each line, when everything it talks about has arrived.
        for (const s of tl.segments) shots.push({ t: s.start + (s.end - s.start) * 0.85, label: s.id, text: s.text });
        for (const L of tl.layers) if (L.module === 'term' || L.module === 'countdown') shots.push({ t: L.module === 'term' ? Math.min(L.start + 0.8, (L.start + L.end) / 2) : L.end - Math.min(L.end - L.start, L.props.seconds ?? Infinity) / 2, label: L.id, text: L.module === 'term' ? `[word card] ${L.props.word}: ${L.props.meaning}` : `[thinking time] ${String(L.props.question).replace(/\s*\n\s*/g, ' ')}` });
        shots.push({ t: 0.05, label: 'start', text: '[first frame]' }, { t: tl.duration - 0.05, label: 'end', text: '[last frame]' });
      }
      // --from and --to keep a part only (a new edition: look at what is new).
      if (!custom && (args.from !== undefined || args.to !== undefined)) {
        const from = timeOption(tl, args.from ?? 0, 'from');
        const to = timeOption(tl, args.to ?? tl.duration, 'to');
        shots = shots.filter((s) => s.t >= from && s.t <= to);
      }
      shots = shots.filter((s) => s.t >= 0 && s.t <= tl.duration).sort((a, b) => a.t - b.t);
      // Moments to audit without a picture: just after every clip arrives and every command lands.
      const auditTimes = new Set(shots.map((s) => s.t));
      if (!custom && !args.shots && args.from === undefined && args.to === undefined) {
        for (const L of tl.layers) {
          auditTimes.add(Math.min(L.end - 0.02, L.start + (L.in?.duration ?? 0) + 0.05));
          for (const c of L.commands) auditTimes.add(Math.min(tl.duration, c.end + 0.05));
        }
      }

      const name = [id, language !== (script.defaultLanguage ?? 'en') ? language : null, layout].filter(Boolean).join('.');
      // The quick look (--shots) and a closer look (--at, --every) never replace the line-by-line stills.
      const folder = args.shots ? `${name}.shots` : custom ? `${name}.closer` : name;
      const dir = join(OUT, 'stills', folder);
      if (!args.audit) {
        rmSync(dir, { recursive: true, force: true });
        ensureDir(dir);
      }
      const format = args.png ? 'png' : 'jpeg';
      const ext = args.png ? 'png' : 'jpg';
      const found = new Map();
      const index = [];
      const files = [];
      const wanted = new Map(shots.map((s) => [s.t, s]));
      let n = 0;
      for (const t of [...auditTimes].filter((x) => x >= 0 && x <= tl.duration).sort((a, b) => a - b)) {
        const shot = wanted.get(t);
        const { data } = await stage.shoot(t, { format, always: !!shot && !args.audit });
        for (const p of await stage.audit()) {
          const key = `${p.clip}: ${p.message}`;
          if (!found.has(key)) found.set(key, { ...p, t });
        }
        if (!shot || args.audit) continue;
        n += 1;
        const file = `${String(n).padStart(3, '0')}-${clock(t).replace(':', 'm')}-${shot.label}.${ext}`;
        writeFileSync(join(dir, file), data);
        files.push({ file, t, shot });
        index.push(`${file}\t${clock(t)}\t${shot.text ?? ''}`);
      }
      const pageErrors = [...new Set(stage.errors)];

      // Contact sheets: the same stills, small, in order, with their line under them.
      const sheets = [];
      if (!args.audit && files.length > 1) {
        const cols = Number(args.cols ?? 3);
        const per = cols * 3;
        const sheetContext = await browser.newContext({ deviceScaleFactor: 1 });
        const page = await sheetContext.newPage();
        const ratio = tl.stage.height / tl.stage.width;
        const cellW = Math.floor(1800 / cols);
        for (let i = 0; i < files.length; i += per) {
          const cells = files.slice(i, i + per);
          const html = `<body style="margin:0;background:#111;font:14px/1.3 system-ui,sans-serif;color:#ddd"><div style="display:grid;grid-template-columns:repeat(${cols},${cellW}px);gap:12px;padding:12px;width:max-content">${cells
            .map((c) => `<div><img src="${server.url}/out/stills/${encodeURIComponent(folder)}/${encodeURIComponent(c.file)}" style="width:${cellW}px;height:${Math.round(cellW * ratio)}px;display:block;background:#000"><div style="padding:4px 2px;height:38px;overflow:hidden"><b style="color:#ffcf3f">${esc(c.file.slice(0, 3))} · ${clock(c.t)} · ${esc(c.shot.label)}</b> ${esc(c.shot.text ?? '')}</div></div>`)
            .join('')}</div></body>`;
          await page.setViewportSize({ width: cols * (cellW + 12) + 12, height: Math.ceil(cells.length / cols) * (Math.round(cellW * ratio) + 58) + 12 });
          await page.setContent(html, { waitUntil: 'load' });
          // Wait until every picture is decoded and painted at the new size, or the last, shorter sheet comes out torn.
          await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))).then(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)))));
          const sheet = `sheet-${String(sheets.length + 1).padStart(2, '0')}.jpg`;
          await page.screenshot({ path: join(dir, sheet), type: 'jpeg', quality: 88 });
          sheets.push(sheet);
        }
        await sheetContext.close();
      }
      await stage.close();

      const errors = [...found.values()].filter((p) => p.severity === 'error');
      const warnings = [...found.values()].filter((p) => p.severity !== 'error');
      const report = [...pageErrors.map((e) => `error    page: ${e}`), ...[...errors, ...warnings].map((p) => `${p.severity.padEnd(8)} ${clock(p.t)}  ${p.clip}: ${p.message}`)];
      if (!args.audit) {
        writeFileSync(join(dir, 'index.txt'), `${index.join('\n')}\n`);
        writeFileSync(join(dir, 'audit.txt'), report.length ? `${report.join('\n')}\n` : 'No problems found by the page audit. Now look at the pictures.\n');
      }
      problems += errors.length + pageErrors.length;
      console.log(`${errors.length + pageErrors.length ? '✗' : warnings.length ? '!' : '✓'} ${name}: ${args.audit ? `${auditTimes.size} moments audited` : `${files.length} stills, ${sheets.length} contact sheet(s) in ${rel(dir)}/`}${voice.provider ? ` (timed to voice: ${voice.provider})` : ' (timing estimated: no recorded voice)'}`);
      for (const line of report) console.log(`    ${line}`);
      if (sheets.length) console.log(`    look at: ${sheets.map((s) => rel(join(dir, s))).join(', ')}`);
      if (!args.audit && !sheets.length) for (const f of readdirSync(dir).filter((f) => f.endsWith(ext))) console.log(`    ${rel(join(dir, f))}`);
    }
  } finally {
    await browser.close();
    await server.close();
  }
  if (problems) process.exit(1);
});
