# Scripted video project

Videos written as scripts. A script says what is spoken and what is on screen; the tools here
check it, show it, give it a voice and export it as an `.mp4` with subtitles and chapters. The
same script can also play live in a web page.

There is no build step and no framework: plain JavaScript modules, one small dependency for
taking pictures of the page.

## What you need

- **Node.js 18 or newer.**
- **Google Chrome** (or Edge or Chromium) for stills and export. Set `CHROME_PATH` if it is in an
  unusual place, or run `npx playwright-core install chromium`.
- **ffmpeg** for voice and export (`brew install ffmpeg`, `sudo apt install ffmpeg`,
  `winget install ffmpeg`).

```
npm install
node tools/check.mjs          the example video should pass
node tools/serve.mjs          the live player, at http://127.0.0.1:4173
```

## Making a video

```
node tools/new.mjs tides "Why the sea goes in and out"    notes/tides/ and videos/tides.mjs
node tools/check.mjs tides                                structure, timing, teaching rules
node tools/dump.mjs tides                                 the video as a viewer meets it, as text
node tools/stills.mjs tides                               pictures of every moment: out/stills/tides/
node tools/tts.mjs tides                                  record the narration
node tools/export.mjs tides                               out/tides.mp4, .srt, .vtt, .chapters.txt
```

| Tool | What it does |
| --- | --- |
| `new.mjs <id> "<Title>" [--json] [--vertical]` | A notes folder and a script skeleton. |
| `mindmap.mjs <id> [--order]` | Checks `notes/<id>/mindmap.json`; prints it as an outline or in teaching order. |
| `check.mjs [id] [--strict]` | Checks scripts without drawing them, and that every detail can be left out. |
| `dump.mjs <id> [--claims\|--quotes\|--figures\|--chapters [--main]\|--text\|--details]` | The timeline as text; the claims to verify; the quotations and figures that are not in `notes/<id>/research/` as written; the chapters (`--main`: without those inside deep details); the narration alone; the parts that can be deleted, with their lengths. |
| `stills.mjs <id> [--shots] [--at …] [--every s --from a --to b] [--audit]` | Stills and contact sheets, and what the page itself found wrong. `--shots`: one still per shot, for a quick look at every layout of a long video. |
| `serve.mjs [--port n]` | The live player: scrub, step, switch language and layout, audit a frame. |
| `tts.mjs <id> [--provider …] [--lang xx] [--dry]` | Records the narration: `say` (macOS), `espeak`, `command`, `elevenlabs`, `openai`, or your own `files`. |
| `sound.mjs <id> [--dry] [--only file] [--fresh] [--measure]` | Makes the sound effects and music listed in `assets/<id>/sounds.json` with a generation service (needs its key in the environment), levels them and writes their credits. |
| `export.mjs <id> [--preview] [--clean] [--lang xx] [--layout name] [--from a --to b] [--thumbnail t] [--sound-only]` | The video file, subtitles and chapter list; reports how far the voice is above each piece of music. `--sound-only` mixes the sound again into the file already made, in seconds. |
| `frames.mjs <file.mp4>` | Contact sheets and sound levels of any video file, to review what was exported. |
| `i18n.mjs <id> --lang xx \| --status \| --prune` | Translation files and a translator's brief. |
| `bundle.mjs <id>` | `out/web/<id>/`: the video as a small web page that draws it live. |

## Making a video shorter

A script marks everything beyond its short core as a named **detail**
(`v.detail('name', () => { … }, { about: '…' })`). Any detail can be deleted without breaking
the rest:

```
node tools/dump.mjs tides --details              every detail: where it is, what it tells, the seconds it saves
node tools/check.mjs tides --omit name,another   try a cut
node tools/dump.mjs tides --text --omit all      the core alone
node tools/dump.mjs tides --text --omit deep     without the deep layer, if the video has one
node tools/export.mjs tides --omit deep          a shorter file beside the full one: out/tides.no-deep.mp4
```

`node tools/<tool>.mjs --help` prints the options of any tool and does nothing else.

To make the cut permanent, list the names in the script: `video('tides', '…', { omit: ['name',
'another'] })`, then run `tts`, `check` and `export` again. Recorded lines are reused.

Each tool lists all of its options in the comment at the top of its file. Add `--lang`,
`--layout` and `--omit` to most of them. Times on the command line may be seconds, timecodes or references to
things in the script: `--at "12.5,1:05,@n7.end"`.

## What is where

```
videos/            one file per video: <id>.mjs (written with the kit) or <id>.json (plain data)
videos/i18n/       translations: <id>.<language>.json
notes/<id>/        research, mind map, storyboard, reviews for a video (notes/_template/ is copied by new.mjs)
assets/            pictures, film, fonts, music, sound effects; assets/<id>/sounds.json lists sounds to generate;
                   assets/voice/<id>/<language>/ for your own recordings
modules/index.js   the list of components videos may use: add your own here
engine/            the code that turns a script into frames
  kit.js             the authoring kit: say(), add(), term(), scene() …
  compile.js         script → timeline (every time resolved, every problem reported)
  evaluate.js        timeline + a time → what is on screen
  modules/           the standard components: text, image, video, scene, chart, code, list, term, countdown, annotate, rect
  web/               the renderer, the live player, the page used for stills and export, the embeddable player
tools/             the commands above
out/               everything the tools make (not kept in version control)
```

## The example

`videos/hello.json`: fifteen seconds in plain JSON, with a Spanish translation and a vertical
layout. The smallest complete script, and a quick test that the setup works. Delete it when you
no longer need it.

## Keys

Voice services read their keys from the environment (`ELEVENLABS_API_KEY`, `OPENAI_API_KEY`).
Never write a key into a script or a note. `.env` files are ignored by version control here.

## Changing the engine

The engine is part of the project, not a package: read it and change it. Keep `node
tools/check.mjs --strict` and the example video passing after a change.
