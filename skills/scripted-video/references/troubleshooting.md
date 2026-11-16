# Troubleshooting

What the tools say when something is wrong, what it means, and what to do. Messages are quoted in
*italics* with the changing parts as `…`.

## Contents

1. Setting up
2. The script does not compile
3. What the checker reports: errors
4. What the checker reports: warnings
5. What the page audit reports
6. The picture is wrong
7. Voice and sound
8. Export
9. Translations and layouts
10. The live player and the web bundle
11. Where to look when stuck

## 1. Setting up

| Message or symptom | Cause | Fix |
| --- | --- | --- |
| *playwright-core is not installed* | `npm install` has not been run in the project folder. | `npm install`. Only `stills`, `export`, and browser checks need it; `check`, `dump`, `tts`, `i18n`, `mindmap` work without. |
| *Could not start a browser* | No Chrome, Edge or Chromium was found. | Install Google Chrome; or set `CHROME_PATH` to a Chrome, Edge or Chromium program; or `npx playwright-core install chromium`. |
| *ffmpeg is needed for this* | `ffmpeg` is not installed. | macOS `brew install ffmpeg` · Ubuntu `sudo apt install ffmpeg` · Windows `winget install ffmpeg`. Needed by `tts`, `export`, `frames`, `bundle`. |
| *The "say" voice only exists on macOS* | The default free voice was asked for on another system. | `--provider espeak` (install `espeak-ng`), or `command`, or a paid provider. |
| *espeak-ng is not installed* | | `brew install espeak-ng` · `sudo apt install espeak-ng`. |
| *No video "…". There are: …* | The id is not a file in `videos/`. | Ids are file names without the extension: `videos/tides.mjs` is `tides`. Files starting with `_` are helpers, not videos. |
| *… must default-export a script* | A `.mjs` video does not end with `export default v.build();`. | Add it. |
| `SyntaxError: Cannot use import statement outside a module` | The project's `package.json` lacks `"type": "module"`, or the starter's files were copied without it. | Copy the whole `starter/` folder, including `package.json`. |
| In a sandbox or container the browser will not start | Missing system libraries or sandbox restrictions. | `npx playwright-core install --with-deps chromium`. If stills cannot be made at all, say so in your report (`visual-review.md` section 9). |
| No pictures can be viewed by the agent | The agent has no way to open images. | Run `stills --audit` for what the page can measure, and hand the sheets to the user. |

Check a new setup in one go: `node tools/check.mjs` then `node tools/stills.mjs hello`. The
example video should give no errors.

## 2. The script does not compile

Compile errors come as a list, each with a **path** into the script (`/tracks/1/clips/3/props`)
and a message. With the kit, the path refers to the built script; print it to see what is at
that path:

```
node -e "import('./videos/<id>.mjs').then(m => console.log(JSON.stringify(m.default.tracks[1].clips[3], null, 2)))"
```

| Message | Cause and fix |
| --- | --- |
| *unknown reference "@x"* | Nothing has that id. A typo; or a clip id used in a reference before the clip exists; or a line's handle was not kept (`const a = v.say(…)`). |
| *circular time reference* | Two things are each timed from the other (a clip ending at a line that starts when the clip ends). Time one of them from something else. |
| *malformed time reference "…"* | References are `@id`, `@id.start`, `@id.end`, with one offset: `+1.5`, `-0.25`, `+40%`. For two steps, give the first command an id and refer to that. |
| *two things are called "x"* | Ids are shared by lines, clips, commands, sounds and markers; each must be unique. `start` and `end` are reserved (*"start" is a reserved id*). |
| *no module "x" (registered: …)* | The clip's `module` is not registered. A typo, or a custom module not added to `modules/index.js`. |
| *… needs "…"* (for example *text needs "text" (a string)*) | A component's required prop is missing or of the wrong kind. See the component in `components.md`. A common cause with the kit: arguments in the wrong order (`v.title(text, subtitle, options)`). |
| *… has no command "x" (it has: …)* / *… needs { … }* | The component has no such command, or its arguments are wrong. `components.md` lists each component's commands. |
| *no node "x" to use as a target (there is: …)*, *no node "x" to change (there is: …)* | A scene command names a node that the scene does not have at that moment. Node ids are local to their scene; a node added later with `set` does not exist earlier. |
| *can't find target "x"* (annotate) | A pointer names a clip that does not exist. Use a clip id, `{ x, y, w, h }`, or `{ clip, rect }`. To point at a scene's node, use the scene's own `point`. |
| *shot "x" has no narration, so it has no time to start at* | A shot with clips and no `say()`. Say a line in it, or `v.shot(name, { at: … })`. |
| *term("x", { say }) must come straight after the line it appears with* | Something was said between the line and its card. |
| *nothing is said; give the video a duration* (raw script: *a script with no narration needs a "duration"*) | No narration at all, and no `duration`. |
| *a narration line needs text* | An empty line. |
| *no string "key" for "en"* / *no text for "en"* | A `{ "$t": … }` text has no entry in the script's own language. |
| *clip "x" ends (…) before it starts (…)* | The `end` is earlier than the `start`: usually an end typed as a number in a video whose lines moved. Time the end from a line. |
| *no layout "x"* | `--layout` names a layout the script does not have. |
| *no speaker "x"* | `speaker` names someone not in `speakers`. |
| Warning: *command "x" at … is outside clip "y"* | The command is timed before its clip appears or after it has gone. Usually the clip belongs to an earlier shot, or its `end` is too early. |
| Warning: *line "b" starts before "a" has finished* | A line was given a `start` that cuts into the line before it. Remove the `start`, or move it later. |

**`@n3-2` and ids with hyphens.** `@n3-2` means two seconds before `n3`, unless something is
actually called `n3-2`, which then wins. Write `@n3 - 2` or `@n3.start-2` to be unambiguous.

**A plain number means different things in different places:** from the video's start for a
clip's `start`/`end`, from the clip's start for a command's `at`. References are always absolute.
When something lands at the wrong moment, check which kind you wrote (`script-format.md`
section 4).

## 3. What the checker reports: errors

`node tools/check.mjs <id>`. Errors must be fixed; `export` problems usually trace back to one.

| Message | Cause and fix |
| --- | --- |
| *nothing is on screen (a clip ends before the next one starts)* | A gap of 0.6 s or more with no clip. A hand-placed `end`, a shot with no clips, or a first clip that starts late. End the earlier clip at the next shot's start, or add a background that spans the video. |
| *"word" is said at … before its word card at …* | The term is used in a line before the card teaches it. Move the card to the first use, or reword the earlier line. |
| *missing file "…"* | An asset path or key points at nothing. Paths are from the project folder (`assets/…`). Use a placeholder until the file exists. |
| *module "x" has no renderer* | A custom module has no `mount` function. |
| *the chapter at … has no name* | `v.chapter('')`. |
| *… text(s) not translated to …* | `node tools/i18n.mjs <id> --lang xx`, then fill them in. |
| Messages from a component (for example *node "x" is partly outside the scene*, *the pointer's target "x" is gone*, *… is off the stage*) | The component's own check of its state at the start and after each command. The message names the clip, the time and the command. |

## 4. What the checker reports: warnings

Warnings are judgements. Fix them, or note in the review why one stands. `--strict` makes the
command fail on warnings.

| Message | What to do |
| --- | --- |
| *nothing changes on screen for … s* | Over 20 s of still picture. Add a build step, a pointer, a new element, or cut words. (`--still 30` changes the limit.) |
| *its box … is partly off the … stage* | A clip's box runs past the edge: often a wide box in a vertical layout. Derive boxes from `v.area()`. |
| *word card "x" is up for … s; a reader needs about … s* | Give the card a longer line, or use `{ say }` so that its meaning is spoken while it shows. |
| *"x" changes … while the word card "y" covers it* | Move the command after the card. |
| *two new words within … s* | Spread the terms out, or drop one. |
| *a pause should ask the viewer a question* | `v.think()` text should end with a question mark. |
| *the question is not read aloud: "…"* (error) | A question card has no narration line starting with it. Use `v.think()`, which announces the quiz and reads the question. In a JSON script, add a line with the question, start the `countdown` clip at that line, and end it at the line's end plus the thinking time (`components.md` section 12). |
| *"x" is spoken during the thinking time of "…"* | Move the line after the card: the viewer is working out the answer and cannot listen. |
| *"x" is still being spoken when the countdown of "…" starts* | The card is too short for its spoken question. End the clip at `@line.end+seconds`, not after a fixed time. |
| *think() needs { say } when the question is not plain text* | The question is a translated text or another object. Give `{ say: '…' }`: the words the narrator reads. |
| *a … video has no chapters* | Add `v.chapter()` calls. |
| *the first chapter does not start at 0:00* | Call `v.chapter()` before the first `say()`. |
| *chapter "x" is under 10 s* / *runs …* | Merge or split. |
| *… has a contrast of …:1* | Change the theme colours (`visual-design.md` section 4). |
| *… words in one line (limit 24)* | Split the line. |
| *says "this" but nothing is pointed at while it is spoken* | Point at the thing during the line, or name it instead of saying "this"/"here". |
| *… characters a second (limit 17)* (caption) | The caption is too long for the time it is up. Shorten the caption text (`{ caption }`) or slow the line. If it appears on many lines only after the voice is recorded, the voice is faster than the estimate: lower `voice.rate` (0.85 to 0.95) and record again. A computer's built-in voice may stop slowing below some rate; if the warnings stay, choose a slower built-in voice (`voice.say.voice`) and record again. |
| *the quotation "…" was already spoken at …* | The same words inside quotation marks are spoken twice, more than half a minute apart. Tell the quotation once, where it belongs; the second time, say it in your own words and name who said it ("as you heard, the report found no cover-up"). It happens most when several writers each wrote a part. |
| *"…" is on screen … s; reading … words takes about … s* | Text is replaced before it can be read. Hold it longer or shorten it. |
| *the narration reads at about grade …* | Shorter sentences and plainer words; the message lists the long words. For an expert audience, raise the limit: `--grade 11`. |
| *the voice talks at … words a minute* | Lower `voice.rate`. |
| *… words a minute overall* | Add `beat()`s between ideas, or say less. |
| *"…" is loaded from the internet* | Download the file into `assets/`. |
| *voice "…": … line(s) changed since it was recorded* | `node tools/tts.mjs <id>` records the changed lines again. |
| *command "x" at … is outside clip "y"*, *line "b" starts before "a" has finished* | Passed on from the compiler: see section 2. |

## 5. What the page audit reports

From `stills` (`audit.txt`), `export`, and the `A` key in the player. Each has a time and a clip.

| Message | Cause and fix |
| --- | --- |
| *text is cut off: "…" needs W×H but its box has W×H* | The text does not fit its box even at the smallest size it may shrink to. Shorten the text or enlarge the box. |
| *text was shrunk to …% to fit* | It fits, but much smaller than intended. Same fixes. |
| *text runs off the stage* / *label runs off the stage* | A text or a pointer's label crosses the stage edge: a label next to a target at the edge (set its `side`), or a box placed past the edge. |
| *text is small (N px on a N px stage)* | Under 2.2% of the short side as drawn: hard to read on a phone. Often a scene scaled down into a small box: raise `fontSize`, enlarge the box, or zoom the camera in. |
| *picture did not load* / *film did not load* | Wrong path, unsupported format, or a film the browser cannot decode. Film should be H.264 `.mp4` or `.webm`: convert with `ffmpeg -i in.mov -c:v libx264 -pix_fmt yuv420p -an out.mp4`. |
| *font did not load* | The `fonts` entry's `src` is wrong, or the file is not a web font format (`.woff2`, `.woff`, `.ttf`, `.otf`). |
| *the caption covers "…"* | Something sits in the caption band. Keep content inside `v.area()`, or move it up. |
| *caption takes N lines* | The line is long. Shorten the caption, split the line, or lower `caption.maxUnits`. |
| *module "x" has no renderer* | A custom module without a `mount` function is on screen. |

A problem that appears at one time only is found with `node tools/stills.mjs <id> --at <time>`.

## 6. The picture is wrong

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| A blank still | The clip has not started yet at that time, starts at `opacity: 0` and was never shown, or sits behind another. | `node tools/dump.mjs <id>` shows when each clip arrives. Check clip order: later tracks and later clips are drawn on top. |
| Something appears too early or too late | A number where a reference was meant, or the wrong line's handle. | Time it from the line that names it: `{ at: line }`. |
| A ring is beside its target | The target moved (a layout, a keyframe) or the pointer was given raw coordinates. | Point at a clip id or a scene node id. For scene nodes, point with the scene's own commands. |
| An element jumps when another appears | Boxes were computed from content, or two clips share a box by accident. | Lay out the whole shot first, with fixed boxes from `cols`/`rows`. |
| Text is tiny in a scene | The scene's own size (`w`, `h`) is much larger than its box. | Keep the scene's size near its box size, or raise `fontSize`. |
| A picture is stretched or cropped | `fit`. | `contain` shows all of it; `cover` fills and crops. |
| Colours differ in the exported file | Video encoding narrows colour slightly, and thin bright lines soften. | Avoid 1-unit lines and very saturated small text. Use `--crf 16` for delicate pictures. |
| Emoji or symbols look different on another machine | They come from the system's fonts. | Use an SVG picture for anything that must look the same everywhere. |
| Letters appear as boxes | The exporting machine has no font for that script. | Install one, or load one with `fonts`. |
| Stills differ between two runs | Something depends on real time or randomness (in a custom component). | Components must draw from `layer.state` and `layer.active` only (`components.md` section 14). |
| A transition shows a flash of the old shot | Two shots' clips overlap by a frame or leave a frame empty. | End the old shot's clips at the new shot's start (the kit does this); avoid hand-typed ends. |

## 7. Voice and sound

| Symptom or message | Cause and fix |
| --- | --- |
| *… line(s) changed after the voice was recorded* | Stale lines. `node tools/tts.mjs <id>` records only those. `--allow-stale` exports a draft with them silent. |
| *… text(s) are not translated to … yet; recording them would put the wrong language in the video* | Finish the translation first (`--force` records anyway). |
| *Set ELEVENLABS_API_KEY in your environment* (or `OPENAI_API_KEY`) | The key is not in the environment of the shell that ran the command. The user sets it; never write it into a file in the project. |
| *ElevenLabs needs a voice* | Set `voice.elevenlabs.voiceId`, or `ELEVENLABS_VOICE_ID`, or `--voice-id`. |
| *HTTP 401* / *403* from a voice service | Wrong or expired key, or the plan does not include that voice or model. |
| *HTTP 429* | Too many requests or out of credits. The tool has already retried several times with growing waits; wait longer, or check the account. Lines recorded so far are kept, so the next run continues where this one stopped. |
| *line … came out silent* | The service returned nothing audible for that text (often a line of only symbols). Reword it; delete the named cache file and run again. |
| *This computer has no "say" voice for "…"* | Install a voice for that language in the system settings, or use another provider. |
| *no recording for … line(s)* (`files`) | Record the listed lines as `assets/voice/<id>/<lang>/<lineId>.wav`. |
| The voice mispronounces a word | `v.pronounce(written, spoken)`; or respell in the line and give a `caption`. |
| The timing changed after recording | Expected: recorded lines are not the estimated length. Everything timed by reference follows. Look at the stills again. |
| The wrong voice is used | Tools use the most recently recorded voice. Pick one: `--voice elevenlabs`. |
| The video is silent | No voice was recorded for that language (the export says so), or `--no-audio`. |
| Music drowns the voice | Lower its `volume` (0.2 to 0.3). The export already lowers it under speech and prints how far the voice is above it: aim for 15 to 22 dB. |
| Music plays under the whole video | `v.music()` was given no `start` and `end`. Give it the first and last line of the part it belongs to. |
| Music stops in the middle of a part and comes back later; the mix report has several lines for one `v.music()` | A deep detail sits there. Music rests while a deep detail is told and begins again when the story picks up. That is meant. `overDeep: true` makes it play through. |
| A tool started work on every video | It was run with no video id (or, in an older copy of the tools, with `--help`). Stop it. `node tools/<tool>.mjs --help` prints the tool's notes and does nothing else. |
| A long export prints no progress for many minutes, the computer is busy and no file appears | The sound mix had to look through every line for every sample of music. Fixed in the starter's `export.mjs` (the lines are searched by halving). If a copied project has an older `tools/export.mjs`, copy the starter's again. The mix of a six-hour video now takes about four minutes. |
| Music cannot be heard (the report says the voice is more than about 24 dB above it) | Raise `volume`, or remove the music. |
| Music stops early or repeats | The file is shorter than the part it plays under; it plays again by default, each restart blended in over up to three seconds, and the export's mix report says how many times. Make it again without `seconds` after the voice is recorded (`tools/sound.mjs` measures the part), or shorten the part. A part longer than the service's longest piece has to repeat. |
| Only a music level or a sound changed, and the export takes many minutes | `node tools/export.mjs <id> --sound-only` mixes the sound again and keeps the pictures. |
| No sound at a word card or a quiz | `eventSounds` is not set in `video()`, or the file it names does not exist (the export says *a sound file is missing*). |
| An event sound comes late | The file starts with silence. `tools/sound.mjs` trims it for files it makes; trim others in a sound editor. |
| *Set ELEVENLABS_API_KEY in the environment of this command* (`sound.mjs`) | As for the voice: the key comes from the environment only. If the user named a file that holds it, load it for that one command (`voice-and-assets.md` section 3). |
| A sound was made but is wrong | `node tools/sound.mjs <id> --only <file> --fresh` after changing its prompt. Each try uses credits: change the prompt first, try once. |
| A service the user named cannot be reached | No tool for it in this session and no key in the environment. Carry on with drawings, write the prompts in `notes/<id>/assets.md`, and tell the user how to connect it (`voice-and-assets.md` section 10). |
| *the mix was turned down* | Sounds together passed full level. Lower the loudest effect or the music. |
| A long silence in the sound report | The thinking time of a pause-and-think (fine, when it comes just after the question is read), a stale or missing line, or a long `wait()`. |
| The quiz question is not heard in a draft export | The voice was recorded before the question was added, and the draft was made with `--allow-stale`: `check` says *N line(s) changed since it was recorded*. Run `node tools/tts.mjs <id>` again; only new and changed lines are recorded. |

## 8. Export

| Symptom | Cause and fix |
| --- | --- |
| Export is slow | Every changed frame is drawn and captured. Constant motion (a drifting background, a long camera move, film) makes every frame different. Use `--preview` while working; `--from`/`--to` for one stretch; remove decoration that moves all the time. |
| The file is large | Same cause: motion and film. `--crf 23` roughly halves the size. A still-heavy teaching video is normally a few megabytes a minute or less. |
| ✗ *the file is … s long but the video is … s* | The encoded file is not as long as the script. Usually an interrupted run or a full disk; export again. |
| ✗ *the file has no picture* / *the file has no sound* | `ffmpeg` failed part-way; its message is printed above. An `ffmpeg` built without H.264 (`libx264`) or AAC cannot encode: install a standard build. |
| *The stage page did not start* | A module threw an error while loading (the message follows), usually a syntax error in a custom module or a wrong import path in `modules/index.js`. |
| Film in the video stutters or shows the wrong frame | Film is seeked frame by frame for export. Use H.264 `.mp4` with frequent keyframes: `ffmpeg -i in.mp4 -c:v libx264 -g 15 -pix_fmt yuv420p -an out.mp4`. |
| *--out names one file* | `--out` can only be used when exporting one video. |
| *--from … --to …: nothing to export* | The range is empty or past the end of the video. |
| *sound not found, left out: …* | A music or effect file is missing; the export went on without it. |
| *--at: nothing in "…" is called "x"* | A reference on the command line names nothing in the video. `node tools/dump.mjs <id>` shows the ids of lines and clips. In zsh and bash, quote references: `--at "@n7.end"`. |
| A video site re-encodes the upload and it looks soft | Upload a higher resolution: `--scale 2`. Sites give higher-resolution uploads a better encoding. |
| A site ignores the chapters | First chapter not at 0:00, fewer than three, or one under 10 s. Or the list did not fit: a description usually holds about 5,000 characters, and the export says when the list is longer and writes a short one (`<name>.chapters.main.txt`). |

## 9. Translations and layouts

| Symptom | Cause and fix |
| --- | --- |
| A text stays in the source language | It was never given a key: a plain string in `add()` props. Wrap it in `v.t()`. Or its translation is empty. |
| A translated text reverted after an edit | The source text changed, so its key changed. `node tools/i18n.mjs <id> --lang xx` lists it as missing; translate it again and `--prune` the old key. |
| *… text(s) have no … translation and will appear in …* (export), *… has no language "…"* (bundle) | No `videos/i18n/<id>.<lang>.json` yet, or it is incomplete. |
| Translated headings shrink or wrap badly | Longer words. Shorten the translation, widen the box, or break the heading by hand. |
| In a layout, clips are off the stage | The layout does not mention them, so they keep their wide boxes. Give every clip an entry. |
| In a layout, a clip flies across the stage | It has `x`/`y`/`w`/`h` keyframes, which a layout does not adjust. |

## 10. The live player and the web bundle

| Symptom | Cause and fix |
| --- | --- |
| The player shows an old version | Press `R` (reload the script) after editing. For a change to a module or the engine, reload the page. |
| The address does not open | The server prints its address; the default is `http://127.0.0.1:4173/`. Use `--port` if that one is taken. It listens on this machine only. |
| No sound in the player | No voice recorded; or the browser blocked sound until a click: press play with the mouse or keyboard. |
| Music is louder than in the export | The player does not lower music under speech; the export does. |
| Film is less smooth than in the export | Live play follows the clock; the export draws exact frames. |
| The bundle's `index.html` is blank when double-clicked | Browsers do not load modules from `file:` addresses. Serve the folder: `npx serve out/web/<id>`. |
| The embedded player has no sound until tapped | Browsers require a tap or click before sound. Start play from a button. |
| *Cannot read properties of null* in your own page's `onTime` | `onTime` used the player variable before `createPlayer` returned. The first call comes after it returns; if you call `seek` inside the same statement, guard it. |

## 11. Where to look when stuck

1. `node tools/check.mjs <id>`: most problems are named here, with the clip and the time.
2. `node tools/dump.mjs <id>`: what happens when, in order. Compare it with what you meant.
3. `node tools/stills.mjs <id> --at <time>`: what the moment looks like.
4. The built script (the one-line command in section 2): what the kit actually produced.
5. The component's file in `engine/modules/`: each starts with a comment listing its props and
   commands, and the code is short.
6. The engine is yours to change. It is a few small files copied into the project, not a
   package. If a component lacks something a video needs, add it there or write a custom
   component (`components.md` section 13), and keep `check` and the example video passing.
