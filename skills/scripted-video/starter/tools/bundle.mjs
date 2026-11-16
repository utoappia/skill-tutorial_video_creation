#!/usr/bin/env node
// Packs a video for a web page or an app's web view, to be drawn live by the
// engine instead of played as a video file.
//
//   node tools/bundle.mjs intro                 out/web/intro/
//   node tools/bundle.mjs intro --lang en,es    only these languages (default: all the script has)
//   node tools/bundle.mjs intro --voice elevenlabs
//   node tools/bundle.mjs intro --no-voice      no narration files (captions only)
//
// Output: out/web/<id>/
//   index.html         a page with a simple player: serve the folder with any web server and open it
//   video.json         { script, voice: { <language>: { provider, durations, files } } }
//   engine/ modules/   the code that draws it
//   assets/…           the pictures, film, fonts and sounds the video uses
//   voice/<lang>/      the narration, one small file per line
//
// To use it in your own page, see engine/web/embed.js.
import { cpSync, existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { assetPath, compileVideo, die, ensureDir, languagesOf, loadVideo, main, needFfmpeg, OUT, parseArgs, pickVideos, rel, ROOT, run, sourcesOf, voiceFor } from './lib.mjs';

const args = parseArgs();

const page = (title, stage, languages, layouts) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title.replace(/[<&]/g, '')}</title>
    <style>
      html, body { margin: 0; background: #0d0f12; color: #d7dbe0; font: 15px/1.4 system-ui, sans-serif; }
      main { max-width: 1100px; margin: 0 auto; padding: 12px; }
      #stage { width: 100%; aspect-ratio: ${stage.width} / ${stage.height}; max-height: 82vh; background: #000; cursor: pointer; }
      #bar { display: flex; gap: 10px; align-items: center; padding: 10px 0; flex-wrap: wrap; }
      #seek { flex: 1; min-width: 160px; }
      button, select { background: #1b1f26; color: inherit; border: 1px solid #333a45; border-radius: 6px; padding: 6px 12px; font: inherit; }
      #time { font-variant-numeric: tabular-nums; }
    </style>
  </head>
  <body>
    <main>
      <div id="stage"></div>
      <div id="bar">
        <button id="play">Play</button>
        <input id="seek" type="range" min="0" max="1" step="0.001" value="0" aria-label="Position" />
        <span id="time"></span>
        <label><input id="captions" type="checkbox" checked /> captions</label>
        <select id="language" aria-label="Language"${languages.length > 1 ? '' : ' hidden'}>${languages.map((l) => `<option>${l}</option>`).join('')}</select>
        <select id="layout" aria-label="Layout"${layouts.length ? '' : ' hidden'}><option value="">default</option>${layouts.map((l) => `<option>${l}</option>`).join('')}</select>
      </div>
    </main>
    <script type="module">
      import { createPlayer } from './engine/web/embed.js';
      import modules from './modules/index.js';

      const $ = (id) => document.getElementById(id);
      const clock = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
      const data = await (await fetch('./video.json')).json();
      let player = null;

      function start(keep = 0) {
        player?.destroy();
        const language = $('language').value || data.script.defaultLanguage || 'en';
        const layout = $('layout').value || undefined;
        const size = { ...data.script.stage, ...(layout ? data.script.layouts[layout] : null) };
        $('stage').style.aspectRatio = (size.width ?? 1920) + ' / ' + (size.height ?? 1080);
        player = createPlayer($('stage'), {
          script: data.script,
          modules,
          base: './',
          language,
          layout,
          captions: $('captions').checked,
          voice: data.voice[language],
          onTime(t) {
            $('seek').value = t / player.duration;
            $('time').textContent = clock(t) + ' / ' + clock(player.duration);
          },
          onEnd: () => ($('play').textContent = 'Play'),
        });
        player.seek(Math.min(keep, player.duration));
        window.player = player;
      }
      const toggle = () => {
        player.toggle();
        $('play').textContent = player.playing ? 'Pause' : 'Play';
      };
      $('play').onclick = toggle;
      $('stage').onclick = toggle;
      $('seek').oninput = () => player.seek($('seek').value * player.duration);
      $('captions').onchange = () => player.setCaptions($('captions').checked);
      $('language').onchange = $('layout').onchange = () => {
        $('play').textContent = 'Play';
        start(player.time);
      };
      start();
    </script>
  </body>
</html>
`;

await main(async () => {
  const ids = pickVideos(args);
  for (const id of ids) {
    const script = await loadVideo(id);
    const all = languagesOf(script);
    const languages = args.lang ? String(args.lang).split(',') : all;
    for (const l of languages) if (!all.includes(l)) die(`${id} has no language "${l}" (it has: ${all.join(', ')})`);
    const dir = join(OUT, 'web', id);
    rmSync(dir, { recursive: true, force: true });
    ensureDir(dir);
    const notes = [];
    const voice = {};
    const need = new Map(); // path in the bundle → file on disk
    let stage = null;
    let title = null;
    let spoken = 0;

    for (const language of languages) {
      const tl = await compileVideo(script, { language });
      stage ??= tl.stage;
      title ??= tl.title;
      if (tl.untranslated.length) notes.push(`${tl.untranslated.length} text(s) have no ${language} translation and will appear in ${script.defaultLanguage ?? 'en'}`);
      for (const src of sourcesOf(tl)) {
        const path = tl.assets[src] ?? src;
        if (/^(https?:|data:)/.test(path)) continue;
        const file = assetPath(tl, src);
        if (!existsSync(file)) die(`${id}: missing file "${path}"`);
        if (rel(file) === file) die(`${id}: "${path}" is outside the project folder; move it into assets/`);
        need.set(rel(file), file);
      }
      voice[language] = { provider: null, durations: {}, files: {} };
      if (args['no-voice']) continue;
      const v = voiceFor(script, tl, { language, provider: args.voice });
      if (!v.provider) {
        notes.push(`no recorded voice for ${language}: it will play silent, timed by estimate (node tools/tts.mjs ${id}${language === (script.defaultLanguage ?? 'en') ? '' : ` --lang ${language}`})`);
        continue;
      }
      if (v.stale.length) notes.push(`${language}: ${v.stale.length} line(s) changed after the voice was recorded and will be silent (${v.stale.join(', ')})`);
      await needFfmpeg();
      ensureDir(join(dir, 'voice', language));
      for (const [line, file] of Object.entries(v.files)) {
        const out = `voice/${language}/${line}.m4a`;
        const r = await run('ffmpeg', ['-v', 'error', '-y', '-i', join(ROOT, file), '-c:a', 'aac', '-b:a', '96k', '-ac', '1', '-movflags', '+faststart', join(dir, out)]);
        if (r.code !== 0) die(`ffmpeg could not convert line ${line}: ${r.stderr.toString().trim()}`);
        voice[language].files[line] = out;
        voice[language].durations[line] = v.durations[line];
        spoken += 1;
      }
      voice[language].provider = v.provider;
    }

    for (const [to, from] of need) {
      ensureDir(dirname(join(dir, to)));
      cpSync(from, join(dir, to));
    }
    // The code: the engine without the authoring-only parts, and the project's modules.
    const skip = new Set(['kit.js', 'player.html', 'player.js', 'frame.html', 'page.js']);
    cpSync(join(ROOT, 'engine'), join(dir, 'engine'), { recursive: true, filter: (src) => !skip.has(src.split(/[\\/]/).pop()) });
    cpSync(join(ROOT, 'modules'), join(dir, 'modules'), { recursive: true });
    writeFileSync(join(dir, 'video.json'), `${JSON.stringify({ script, voice })}\n`);
    writeFileSync(join(dir, 'index.html'), page(String(title ?? id), stage, languages, Object.keys(script.layouts ?? {})));

    console.log(`${notes.length ? '!' : '✓'} ${rel(dir)}/  ${languages.join(', ')}; ${need.size} asset file(s), ${spoken} narration file(s)`);
    for (const n of notes) console.log(`    ! ${n}`);
    console.log(`    to look at it: npx serve ${rel(dir)}   (or any web server; opening index.html as a file does not work)`);
  }
});
