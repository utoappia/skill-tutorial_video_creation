# Export and publish

Turning a reviewed script into files: an `.mp4`, subtitles, chapters, a thumbnail, a bundle for a
web page or an app, and the text that goes with an upload.

## Contents

1. Before exporting
2. Making the video file
3. What is written
4. Options
5. Shapes and sizes for different places
6. Captions: in the picture or as a file
7. Chapters
8. The thumbnail
9. A web page or an app: playing the script live
10. Using the engine from your own code
11. The publishing kit
12. After publishing

## 1. Before exporting

- `node tools/check.mjs <id> --strict` reports nothing.
- Both script reviews are done (`script-review.md`) and the stills have been looked at
  (`visual-review.md`).
- **Every line added or changed since the accuracy review has its row** in `review/accuracy.md`,
  read against its source (`script-review.md` section 1). This is the check that most often
  costs a second export when it is left until afterwards.
- The voice is recorded and not stale: `node tools/tts.mjs <id>` (`voice-and-assets.md`).
- Sounds are made and placed: event sounds through `eventSounds`; music, if any, with a `start`
  and an `end` (`voice-and-assets.md` section 8).
- No placeholder assets remain. Assets that are waiting for a service are listed in
  `notes/<id>/assets.md`, and the video is complete without them.
- Stills were made again after the last change and the changed ones looked at.
- `ffmpeg` and a Chrome, Edge or Chromium browser are installed (`troubleshooting.md`).

## 2. Making the video file

```
node tools/export.mjs <id> --preview     a quick draft: half size, 15 frames a second
node tools/export.mjs <id>               the real file: out/<id>.mp4
node tools/frames.mjs out/<id>.mp4       look at what was made (visual-review.md)
```

The export draws every frame in a headless browser, exactly as the stills and the player draw
it, mixes the narration, effects and music, and encodes with `ffmpeg`. Frames that are identical
to the one before are not drawn again, so a video that holds still while the voice talks exports
quickly, and one with constant motion does not.

It ends with a report:

```
✓ out/leap-year.mp4  1:43.1, 1920×1080, 30 fps, 5.1 MB, sound: say + 2 sound clip(s)  (931 of 3093 frames differ; 41 s)
    out/leap-year.srt, .vtt, .chapters.txt
```

If the video has music, a line for each music clip follows: where it plays, what share of the
video that is, and how far the voice is above it. Read it (`visual-review.md` section 7); for
an agent that cannot hear, it is the only check of the mix.

An export of a long video takes minutes. Start it in the background, and use the time for the
notes that do not depend on it. Do not start it while you still expect to change a line, and
do not edit the script, the engine or the recordings while it runs.

**A video of several hours** exports the same way; there is no limit on its length. Plan for
it: the sound of the whole video is mixed in memory, about 1.4 GB for each hour of video, and
the working files need about 0.7 GB of disk for each hour. Drawing time depends on how often
the picture changes. Measured in one job, on a ten-core laptop: a video of 5 hours 51 minutes,
made mostly of boards that hold still, took 1 hour 43 minutes (a little under a third of its
own length), used 8.7 GB of memory at its peak, and made a file of 894 MB (about 150 MB for
each hour). The sound is mixed first and takes a few minutes; if no line of progress has
appeared after a quarter of an hour, something is wrong (`troubleshooting.md`). If the tool
that runs your commands stops a command after a fixed time, find that limit first and export in
the background within it. Check the free memory before a long export: a computer with less
than the mix needs will slow to a crawl or stop it. A change to the sound alone never
needs the pictures again (`--sound-only`, section 4).

**Shorter versions of the same video.** When the script marks details (`deep-layer.md`), the
requester may want the full video and a shorter one to watch first:

```
node tools/export.mjs <id>               everything               out/<id>.mp4
node tools/export.mjs <id> --omit deep   core and first layer     out/<id>.no-deep.mp4
node tools/export.mjs <id> --omit all    the core alone           out/<id>.core.mp4
```

Each gets its own subtitle and chapter files. Record the voice once, for the full video: when
details are left out, the lines after them get new numbers, and each line's recording is then
found by its words. A version cut in the script itself (`omit: [...]` in `video(...)`) is the
video, and keeps the plain name.

`✓` fine · `!` finished with warnings, listed below it · `✗` something is wrong with the file.
While exporting, the page audit runs on every half second of changed picture, and afterwards the
file itself is checked: it has a picture, it has sound, and its length is the script's length.
Read the warnings; the common ones:

| Warning | Meaning |
| --- | --- |
| no recorded voice | The file is silent and timed by estimate. A draft only. |
| stale lines | The export stops, unless `--allow-stale`, which leaves those lines silent. Record again. |
| a sound file is missing | It was left out of the mix. |
| the mix was turned down | The sounds together were too loud; lower the music or effects. |
| a chapter is under 10 s | Video sites ignore a chapter list that contains one that short. |
| audit problems, with times | Look at those moments: `node tools/stills.mjs <id> --at <time>`. |

## 3. What is written

All in `out/`. The name is built from the video id and what was asked for:

| Command | File |
| --- | --- |
| `export.mjs intro` | `intro.mp4` |
| `… --lang es` | `intro.es.mp4` (the default language adds nothing to the name) |
| `… --layout vertical` | `intro.vertical.mp4` |
| `… --clean` | `intro.clean.mp4` |
| `… --preview` | `intro.preview.mp4` |
| `… --from 30 --to 45` | `intro.30-45.mp4` |
| `… --omit deep` | `intro.no-deep.mp4` (`--omit all`: `intro.core.mp4`; `--omit name,name`: `intro.cut.mp4`) |
| `… --lang es --layout vertical --clean` | `intro.es.vertical.clean.mp4` |

Next to every `.mp4`:

| File | What it is |
| --- | --- |
| `<name>.srt` | Subtitles, for upload to a video site. |
| `<name>.vtt` | Subtitles, for a web page's `<track>`. |
| `<name>.chapters.txt` | The chapter list, as `0:00 Title` lines, ready to paste into a description. From one hour on the times are written `1:04:05`, the form video sites read. |
| `<name>.chapters.main.txt` | Only for a video with deep details (`deep-layer.md`): the chapters that do not begin inside one, at the times of this same file. The short list of a long video. |

The `.mp4` itself is H.264 with AAC sound, plays from the start while still downloading, and
carries the title and chapters inside the file. It is accepted by every common video site and
plays in every browser and phone.

## 4. Options

| Option | Effect |
| --- | --- |
| `--preview` | Half size, 15 frames a second, lighter encoding. For checking timing and sound. Never publish it. |
| `--clean` | No captions drawn in the picture. Use with the `.srt` (section 6). |
| `--lang xx` | Another language (text, captions, and that language's voice). |
| `--layout name` | Another shape defined in the script (`localization.md` section 7). |
| `--from a --to b` | Only a stretch. Times are seconds, `1:05`, or references: `--from @n7 --to @n9.end`. |
| `--scale 2` | Twice the pixels: 3840 × 2160 from a 1920 × 1080 stage. Slower, larger. |
| `--fps 60` | Frame rate (default: the script's, normally 30). Only worth it for a lot of fast motion. |
| `--crf 18` | Quality: lower is better and bigger. 18 is the default; 23 is noticeably smaller and still good. |
| `--voice provider` | Which recorded voice to use (default: the most recent). |
| `--no-audio` | A silent file. |
| `--allow-stale` | Export although some lines changed after recording; they are silent. |
| `--out file.mp4` | Where to write (one video only). |
| `--thumbnail t` | One full-size picture and no video (section 8). |
| `--subs-only` | Only the subtitle and chapter files. Needs no browser. |
| `--sound-only` | Mixes the sound again and puts it into the `.mp4` that is already there. The pictures are kept, so it takes a small part of the time of a full export (a minute or two for a video of several hours). Use it when only a music volume, a fade or a sound file changed. It refuses if the length of the video changed. If a word, a picture or the timing changed, export in full. |

Without an id, every video in `videos/` is exported. `node tools/export.mjs --help` prints the
options and exports nothing.

## 5. Shapes and sizes for different places

| Where | Stage | Notes |
| --- | --- | --- |
| A video site, a lesson, a presentation | 1920 × 1080 (the default) | `--scale 2` for 4K if the content has fine detail. |
| Phone feeds and "shorts" | 1080 × 1920 | Under a minute; keep clear of the top and bottom bands (`visual-design.md` section 8). |
| Social feeds | 1080 × 1080 or 1080 × 1350 | Often watched silent: captions in the picture. |
| Inside an app or a web page | Whatever the space is | Consider playing the script live instead of a file (section 9). |
| A slide in a presentation | 1920 × 1080 | Export each chapter with `--from`/`--to` to get one clip per slide. |

One script can serve several shapes through layouts: `--layout vertical`. A video planned for
both from the start (one subject per shot, large text) converts easily; a dense wide video does
not, and a short vertical cut of its best 40 seconds is usually the better plan.

Platforms change their limits. Before uploading somewhere new, check its current help page for
the accepted length, size and shape.

## 6. Captions: in the picture or as a file

| | Captions drawn in the picture (the default) | `--clean` plus the `.srt` |
| --- | --- | --- |
| Always visible | Yes: also in feeds that play silently | Only when the viewer switches them on |
| Viewer can switch off, resize, restyle | No | Yes |
| Translated by the site, searchable | No | Yes |
| Several languages on one upload | No: one file per language | Yes: one video, many `.srt` files |

- **For a video site with a caption feature:** export `--clean` and upload the `.srt` for every
  language. It is the more accessible choice, and the picture is not covered twice when a
  viewer turns the site's captions on.
- **For feeds, messaging and anywhere that plays silently:** captions in the picture.
- **Either way the layout keeps the caption band free,** so a clean export does not look empty
  at the bottom when the site draws its own captions there.

Captions come from the narration (or each line's `caption`), split into readable pieces. Read
them once against the voice before publishing.

## 7. Chapters

`v.chapter('Name')` before the first line of each part. The export writes them into the file and
into `<name>.chapters.txt`:

```
0:00 Why February changes
0:21 The leftover hours
0:48 Adding a day
1:12 The exceptions
1:31 Recap
```

Video sites that read chapters from the description need: the first at `0:00`, at least three,
each at least 10 seconds long, in order. The checker warns about a first chapter that is not at
the start and about one under 10 seconds; counting to three is up to you. Name chapters by what the viewer gets ("Why the Moon pulls the sea"), not by the
part of the lesson ("Explanation").

**A long list.** A description usually holds about 5,000 characters, and a video of several
hours with a deep layer can have 170 chapters: in one job that list was 6,800 characters. The
export says so when it happens, and writes a second file, `<name>.chapters.main.txt`, with the
chapters that do not begin inside a deep detail (in that job 54 of the 170, 1,800 characters).
Paste that one; the `.mp4` itself still carries every chapter for players that show them.
`node tools/dump.mjs <id> --chapters --main` prints the same list. Do not paste the list of a
shorter version (`--omit deep`) under the full video: its titles are right and its times are
not.

## 8. The thumbnail

```
node tools/export.mjs <id> --thumbnail 42.5        out/<id>.thumbnail.png, captions off
node tools/export.mjs <id> --thumbnail @n12.end    at a line
```

A frame of the video is rarely the best thumbnail. Better: a picture made for it, as a tiny
video of its own that reuses the main video's style and assets:

```js
// videos/leap-year-thumb.mjs
import { video } from '../engine/kit.js';

const v = video('leap-year-thumb', 'Thumbnail', { duration: 3 });
v.add('words', 'text', { text: 'Why **29** days?', role: 'title', size: 230 }, { box: v.area({ captions: false }) });
export default v.build();
```

`node tools/export.mjs leap-year-thumb --thumbnail` writes `out/leap-year-thumb.thumbnail.png`.
With no time given, the picture is taken at the middle of the video, when everything has arrived.

A thumbnail must be readable at the size of a postage stamp: one subject, strong contrast, the
words far larger than a title in the video (`size: 200` or more on a 1080-high stage; the plain
`title` size is too small here). Look at the picture shrunk to the width of a thumb before using
it. It must promise only what the video delivers.

## 9. A web page or an app: playing the script live

Instead of a video file, the engine can draw the script in the page. That gives a picture that
is sharp at any size, a download of a few hundred kilobytes plus the narration, and language,
captions and layout that can be switched on the spot. It suits lessons inside a web application
and tutorials inside an app (through a web view).

```
node tools/bundle.mjs <id>                    out/web/<id>/
node tools/bundle.mjs <id> --lang en,es
```

| In the folder | What it is |
| --- | --- |
| `index.html` | A page with a simple player. Serve the folder with any web server and open it (for a look: `npx serve out/web/<id>`). It does not work opened as a file. |
| `video.json` | `{ script, voice: { <language>: { provider, durations, files } } }` |
| `engine/`, `modules/` | The code that draws it. No build step. |
| `assets/` | Only the files this video uses. |
| `voice/<lang>/` | The narration, one small file per line. |

To put it in your own page, copy the folder next to the page and use the player:

```html
<div id="lesson" style="width: 100%; aspect-ratio: 16 / 9"></div>
<button id="play">Play</button>

<script type="module">
  import { createPlayer } from './leap-year/engine/web/embed.js';
  import modules from './leap-year/modules/index.js';

  const data = await (await fetch('./leap-year/video.json')).json();
  const language = data.script.defaultLanguage;
  const player = createPlayer(document.getElementById('lesson'), {
    script: data.script,
    modules,
    base: './leap-year/',            // where assets/ and voice/ are
    language,
    voice: data.voice[language],
    onEnd: () => console.log('finished'),
  });
  document.getElementById('play').onclick = () => player.toggle();
</script>
```

| Player | |
| --- | --- |
| `play()`, `pause()`, `toggle()` | Browsers only start sound after a tap or a click, so call these from one. |
| `seek(seconds)` | Jump. |
| `time`, `duration`, `playing` | Read the state. |
| `setCaptions(on)`, `setRate(1.25)` | Captions and speed. |
| `timeline` | The compiled video: `timeline.chapters` for a chapter menu, `timeline.segments` for a transcript. |
| `destroy()` | Stop and remove it. For a new language or layout, destroy and create again. |
| options `onTime(t, frame)`, `onEnd()` | For a progress bar, or for unlocking the next step. |

Things to know:

- **It needs a browser engine.** In a native app, show it in a web view. Where there is none, use
  the `.mp4`.
- **Music is not lowered under speech** in live play as it is in the export. Keep music quiet or
  leave it out of videos meant to be played live.
- **Film clips** (`video` component) follow the clock less tightly in live play than in an
  export.
- **The page audit still applies:** check the bundle's languages and layouts with `stills` as
  usual. `player.audit()` gives the same list for the frame on screen.
- **Make it accessible:** give the play button a label, offer the transcript
  (`node tools/dump.mjs <id> --text`), and keep the captions switch.
- **Custom components** are ordinary modules in `modules/`; they are bundled with the rest.

## 10. Using the engine from your own code

The engine is plain ES modules with no dependencies. The two functions everything else is built
on:

```js
import { compile } from './engine/compile.js';
import { evaluate } from './engine/evaluate.js';
import modules from './modules/index.js';

const timeline = compile(script, { modules, language: 'en' });   // throws ScriptError with .issues
const frame = evaluate(timeline, 12.5);                           // what is on screen at 12.5 s
```

`compile` and `evaluate` run anywhere JavaScript runs (Node, a browser, a worker). Drawing uses
the DOM: `createRenderer(container, { modules, base })` in `engine/web/renderer.js`, which the
player, the stills and the export all share. A renderer for another surface (a canvas, a native
view) would take the same `frame` and draw each layer's `state`; see `script-format.md`
section 12 and `components.md` section 13 for the shapes involved.

## 11. The publishing kit

`notes/<id>/publish.md` collects what an upload needs. Fill it in; do not leave it to the user
to work out.

| Item | Guidance |
| --- | --- |
| **Title** | Under 60 characters. Says what the viewer gets, in the words they would search for. No promise the video does not keep. Offer two alternatives. |
| **Description** | The first two lines are what shows before "more": the promise, in a sentence. Then the disclosures, the chapter list, the sources, the credits. **Count its characters with the chapter list in it, and write the count into the kit.** A description usually holds about 5,000. When it does not fit, the description keeps the promise, the disclosures, the chapters, the new words and the four or five main sources; "what the video made simpler", "more to know" and the full list of sources go into a second block, for a page the description links to or for pinned comments. In one job the notes and sources alone were 8,000 characters, and two editions were handed over with a description nobody could have pasted. |
| **Chapters** | Paste `<name>.chapters.txt`; if the export says the list is too long for a description, `<name>.chapters.main.txt` (section 7). One list for each file you hand over: the times of a shorter version are different. |
| **Captions** | Upload the `.srt` for each language. |
| **Thumbnail** | Section 8. |
| **Sources** | The sources behind the claims, from `review/accuracy.md`, as links. Viewers and reviewers both value them. For a real event told at length, put the records first (the official report, the court's judgment, the record of the parliament), then the studies, then the summaries. |
| **Versions** | When the video is handed over in more than one length (`deep-layer.md`): one row for each file with its length, what it holds and the command that makes it; one chapter list for each; and "decide the length" as the first box of the list below. |
| **Credits and licences** | From `assets/<id>/CREDITS.md`: every picture, sound and piece of music not drawn by the script, with the service, date and prompt for generated ones. |
| **Disclosures** | Generated voice, music or pictures; anything that looks real and is not; paid services used; sponsorship or free products; "general information, not advice" where the subject needs it; for videos aimed at children, the platform's made-for-children setting. |
| **More to know** | What the video left out on purpose and a careful viewer may ask about: what happened next in a real story, who else was involved, where a real case differs from what the video teaches. From the simplifications table in `review/accuracy.md`. |
| **Next step** | The one thing to do after watching: the next video, an exercise, a link. |

Before it goes out:

- [ ] The exported file has been watched once from start to finish, with sound, at normal speed,
      by a person. Give them the times to listen at: the hard words, each quiz, one of each
      event sound, and where the music starts and stops.
- [ ] Captions were read against the voice.
- [ ] Title and thumbnail promise only what the video delivers.
- [ ] Rights are clear for every asset and for the voice.
- [ ] Someone who was not involved has watched it, or the learner's diary is clean.

**Uploading is the user's action.** Do not upload, post or schedule anything on the user's
behalf unless they ask for exactly that and have set up the access. Hand over the files and the
filled-in kit.

## 12. After publishing

A scripted video can be corrected and exported again in minutes, which most videos cannot.

- **Keep the project** (script, notes, assets, credits) with the published file. Commit it to
  version control without `out/` and `node_modules/`.
- **When a fact changes, a mistake is found, or the requester asks for changes:** follow
  `finishing-and-revising.md` section 3 (a new edition), then replace the file where the
  platform allows it (or note the correction in the description and a pinned comment where it
  does not).
- **Learn from the audience:** where viewers stop watching, what they ask in comments, which
  moment they replay. Write it at the end of `publish.md`; it is the best input for the next
  script.
