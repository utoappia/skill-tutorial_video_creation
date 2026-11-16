# Voice and assets

How the narration is recorded, and how to get the pictures, film, music and sounds a video needs,
including from paid services the user gives you access to.

## Contents

1. The order of work
2. Recording the voice
3. Voice services and their keys
4. Voice settings
5. Pronunciation
6. A person's own recordings
7. What happens when the script changes
8. Music and sound effects
9. Pictures and film
10. Services: use what is offered, ask for what is missing
11. Generated assets: how to work
12. Rights, credits and disclosure
13. Keeping assets in order

## 1. The order of work

1. **Write and review with no assets and the free voice.** Lines are timed by estimate; missing
   pictures are placeholders (section 13). Nothing here costs money.
2. **Record a free draft voice** to hear the pace and get real timings.
3. **When the script has passed both reviews,** gather the real assets and record the final
   voice. Only now is it worth paying for anything: every changed line before this point would
   have been paid for twice.
4. **Review the pictures again** with the real assets and the real timings (`visual-review.md`).

## 2. Recording the voice

```
node tools/tts.mjs <id>                         the free voice of this computer
node tools/tts.mjs <id> --dry                   only say how much would be recorded
node tools/tts.mjs <id> --provider elevenlabs   a studio voice
node tools/tts.mjs <id> --lang es               another language
node tools/tts.mjs <id> --fresh                 record every line again
```

What it does:

- Records **one sound file per line**, trims the silence at both ends, and measures each line.
- Keeps recordings in `out/tts/cache/`, named by a fingerprint of the provider, the voice
  settings, the language and the text. **Only lines that changed are recorded again.**
- Writes `out/tts/<id>.<lang>.<provider>.json`: the list of lines, files and lengths.
- From then on `check`, `stills`, `dump`, the player and `export` time the video to the real
  voice. They use the most recently recorded voice; `--voice <provider>` picks another.

It prints the new length of the video. Recorded speech is rarely the length that was estimated,
which is why everything in a script is timed from lines, not from numbers.

## 3. Voice services and their keys

| Provider | Needs | Good for |
| --- | --- | --- |
| `say` | macOS. Nothing to install. | Drafts and timing. The default on a Mac. |
| `espeak` | `espeak-ng` installed. | Drafts and timing on Linux and Windows. Robotic. The default elsewhere. |
| `command` | `TTS_COMMAND` set to any program that writes a sound file. | Local neural voices (Piper, Kokoro and the like): free, private, good quality. |
| `elevenlabs` | `ELEVENLABS_API_KEY`, and a voice id. Paid. | A final voice; many languages; voice cloning. |
| `openai` | `OPENAI_API_KEY`. Paid. | A final voice; can be given a speaking style in words. |
| `files` | Your own recordings in `assets/voice/`. | A human narrator. |

`TTS_COMMAND` example: `TTS_COMMAND='piper --model en.onnx --output_file {out}'`. The line is
given on standard input, or in place of `{text}` if the command contains it; `{out}` is the
`.wav` file to write.

**Keys are read from the environment and nowhere else.**

- The user sets them in their own shell (`export ELEVENLABS_API_KEY=…`) or in a `.env` file that
  is listed in `.gitignore` and loaded by their shell or by `node --env-file=.env tools/tts.mjs
  <id> --provider elevenlabs` (Node 20.6 or newer).
- **Never** write a key into a script, a note, a commit, a command you print, or your reply.
  If a key appears in something you are shown, do not repeat it.
- **Do not go looking for keys.** Never search the machine for a key, and never use one you
  happen to find. The one exception is a file **the user names**: "the key is in that folder"
  is permission to use that key, for the purpose they named and nothing else. Then:
  - load it into the environment of the one command that needs it, and nowhere else:
    `ELEVENLABS_API_KEY="$(sed -n 1p "$KEY_FILE" | tr -d '\r\n')" node tools/sound.mjs <id>`
    (check which line holds the key without printing it: `wc -l`, `cut -c1-3`);
  - do not copy the key into the project, a `.env` file, a note or a log, and filter it out of
    any output you keep;
  - touch no other file in that folder, however useful it looks;
  - keep to the purpose: a key offered "for sound effects" is not permission to record the whole
    narration with it. Offer that separately.
- **Paid work needs a yes, once.** If the user has already asked for the service ("use my key to
  make the sound effects"), that is the yes: do not ask again. Run with `--dry` first, make only
  what the video needs, make one and check it before the rest, and report what was made. If the
  user has not asked, run with `--dry`, say what would be sent, and wait. The tools say "this is
  a paid service and uses your credits" for the same reason.

To add another service, add an entry to `PROVIDERS` in `tools/tts.mjs`: a `settings(voice,
language)` function that returns what identifies the voice (it goes into the fingerprint), and a
`speak(text, settings, outFile, language)` function that writes a sound file and returns its
path. Check the service's current documentation; do not guess an API.

## 4. Voice settings

In the kit: `video(id, title, { voice: {…} })` for the whole video, `v.say(text, { voice: {…} })`
for one line. In a raw script: `voice` at the top, on a narration track, on a speaker, or on a
line; the more specific wins.

| Setting | Meaning |
| --- | --- |
| `rate` | Speaking speed, `1` is normal. `0.9` to `0.95` suits teaching. Used by every provider and by the estimate. Set it before the first recording, then run the check again: a recorded voice may be faster than the estimate, and a built-in voice may not slow below some rate (pick a slower voice then). |
| `say: { voice }` | The name of a macOS voice (`say -v '?'` lists them). Without it: the system voice for English, otherwise the first installed voice of the language. |
| `espeak: { voice }` | An espeak-ng voice name. Default: the language code. |
| `elevenlabs: { voiceId, modelId?, stability?, similarity?, speed? }` | `voiceId` may instead come from `ELEVENLABS_VOICE_ID` or `--voice-id`. Defaults: a multilingual model, stability 0.5, similarity 0.75. Speed is kept between 0.7 and 1.2. |
| `openai: { voice?, model?, instructions? }` | `instructions` describes the delivery in words ("calm, warm, unhurried, like a good teacher"). |

Choosing a voice for teaching:

- **Clear before characterful.** Unhurried, warm, even. Try three candidates on the two hardest
  lines of the script, not on the easy opening.
- **One voice per video,** unless two speakers have a reason to exist (a question-asker and an
  explainer). Give each a name in `speakers` and use `v.say(text, { speaker: 'ana' })`.
- **A voice id is not a secret, but it is account-specific.** For a script that will be shared,
  leave the id out and let each user supply `ELEVENLABS_VOICE_ID`.
- **Listen for** numbers, names, abbreviations, and the last word of each line. These are where
  generated voices go wrong.
- **Do not clone a real person's voice** without that person's clear permission, and do not use
  a voice that imitates a known person.

## 5. Pronunciation

Write the narration the way it should be **said**; give the caption the way it should be
**read**:

```js
v.say('It takes three hundred and sixty-five and a quarter days.', { caption: 'It takes 365¼ days.' });
```

For a word the voice gets wrong everywhere, add a pronunciation once. Captions keep the written
form:

```js
v.pronounce('CO2', 'C O two');
v.pronounce('Nguyen', 'nwin');
v.pronounce('km/h', 'kilometres an hour');
v.pronounce('1990s', 'nineteen nineties', 'en');     // for one language only
```

Whole words are matched. Changing a pronunciation makes the lines that contain the word stale,
so they are recorded again. Other fixes for a line that sounds wrong: add a comma for a breath,
split it in two, spell a number out, or reword it. A line that is hard for the voice is often
hard for the listener too.

## 6. A person's own recordings

1. Give the narrator the script: `node tools/dump.mjs <id> --text` for reading, and the list of
   line ids from `node tools/dump.mjs <id>`.
2. They record **one file per line**, named by the line's id:
   `assets/voice/<id>/<lang>/<lineId>.wav` (or `.mp3`, `.m4a`, `.aiff`, `.flac`, `.ogg`).
   A long take can be cut into lines in any sound editor.
3. `node tools/tts.mjs <id> --provider files` measures them. It lists any line with no
   recording.

One line can also name its own recording, which is then used whatever the provider:
`v.say('…', { audio: 'assets/voice/intro/hello.wav' })`. That allows a human voice for some lines
and a generated one for the rest, though mixing the two is rarely pleasant to listen to.

Advice for the narrator: a quiet room with soft furnishings; the microphone a hand's width from
the mouth, slightly to one side; the same distance for every line; a glass of water; smile on
the lines that should sound friendly. Record the whole script twice and keep the better take of
each line.

## 7. What happens when the script changes

- **A changed line is "stale":** its recording no longer matches its text. `check` warns,
  `export` refuses (`--allow-stale` makes a draft with those lines silent), and `tts` records
  just those lines.
- **Do not renumber lines** of a video that has a recorded voice or translations. Ids are how
  recordings and translations find their lines. Give a new line a new id; the kit numbers lines
  in order, so for a video with a human narrator give lines explicit ids (`v.say(text, { id:
  'tides-why' })`) from the start.
- **A changed caption** does not need a new recording. A changed spoken text does, even by one
  comma.
- **Changing voice settings** (rate, voice) changes the fingerprint of every line: all are
  recorded again.
- The cache is safe to delete (`out/tts/`); the cost is recording again.

## 8. Music and sound effects

A teaching video is mostly a voice and silence. Sound is added in two small, planned doses: a
few **event sounds**, and **music under story, never under teaching**. Plan both in the
storyboard (its "Sound" column), not after the export.

### Event sounds

```js
const v = video('tides', 'Why the sea rises and falls', {
  eventSounds: { card: 'assets/tides/card.wav', quiz: 'assets/tides/quiz.wav', answer: 'assets/tides/answer.wav', volume: 0.3 },
});
```

With `eventSounds`, the kit plays the same sound at every word card, at the start of every
quiz and at every answer. You do not place them by hand, so none is forgotten and none differs.
For a sound at any other moment: `v.sfx('assets/tides/splash.wav', line, { volume: 0.4 })`.

- **Effects mark events,** not decoration: "a new word", "a question", "the answer". The same
  sound for the same kind of event, every time. Three kinds are enough for most videos; no more
  than a few sounds a minute.
- **Short and soft:** about a second, one or two notes of a soft instrument, no echo. A sound
  that is fun the first time is tiring the tenth.
- **The video must work with the sound off.** Never put information only in a sound.

### Music: under chosen parts only

```js
// Under the history chapter only: from its first line to 2.5 seconds after its last.
v.music('assets/tides/story.m4a', { start: firstStoryLine, end: `${lastStoryLine}.end+2.5`, volume: 0.28, fadeIn: 1.5, fadeOut: 2.5 });
```

- **Default: no music.** While the voice explains something new, music competes with it; for a
  first-time viewer and for anyone listening in a second language, it costs understanding.
- **Where music helps:** a part that tells a **story** and teaches no new idea: a historic
  event, a real case, a short opening or ending. There it says "listen, this happened". As a
  guide, music under less than a quarter of the video; the export prints the share.
- **Never under** a line that introduces a new idea, a word card, a quiz and its thinking time,
  or the recap. If a story chapter ends with a teaching line, end the music before it, or move
  the line.
- **Give it a start and an end** with `start` and `end` (time references). A `v.music()` with
  neither plays under the whole video, which is almost never what a tutorial wants.
- **Music rests during deep details.** A deep detail (`references/deep-layer.md`) is boards of
  facts, and a story part may hold an hour of them. So the engine stops the music when a deep
  detail begins (it fades out over `fadeOut`, ending as the detail starts) and starts it again,
  from the beginning of the piece and with `fadeIn`, when the story picks up. A gap of under 20
  seconds between two deep details stays quiet, and so does any piece of story under 30 seconds.
  You write one `v.music()` for the part, as before; the mix report then has one line for each
  stretch that plays, and the share is counted from those. Without this rule a part given four
  minutes of music carried twenty-three once its deep details were in, with one piece going
  round thirteen times. `{ overDeep: true }` makes a piece play through, for the rare deep
  detail that is itself story; ask whether that detail should be deep at all.
- **The kind of music:** no singing, no strong melody, no drums, slow and steady, low energy.
  Say "leaves room for a narrator" in a generation prompt.
- **How loud:** `volume` 0.2 to 0.3. The export lowers music further while someone speaks,
  brings it back between lines, and fades it in and out. It then **prints a mix report** for
  each music clip:

  ```
  · music assets/tides/story.m4a, 7:32.6 to 9:07.1 (16% of the video): the voice is 19.0 dB above
    the music while someone speaks; the music alone, between lines, is -36.8 dB
  ```

  Aim for the voice 15 to 22 dB above the music. Under about 12 dB the music fights the voice:
  lower `volume`. Over about 24 dB it is close to inaudible: raise it or remove it. If you
  cannot listen, this line is your only evidence; copy it into `review/visual.md`.

### Making sounds with a generation service

`tools/sound.mjs` makes effects and music from a list, `assets/<id>/sounds.json`:

```json
{
  "service": "elevenlabs",
  "sounds": [
    { "file": "card.wav", "kind": "effect", "use": "a word card appears",
      "prompt": "one soft warm marimba note, gentle, short, clean, no echo", "seconds": 1, "influence": 0.6 },
    { "file": "story.m4a", "kind": "music", "use": "under the history chapter only",
      "prompt": "calm, curious documentary underscore, soft piano with light warm strings, slow and steady, low energy, no drums, no vocals, leaves room for a narrator" }
  ]
}
```

```
node tools/sound.mjs <id> --dry                    what would be made, and how long each is
node tools/sound.mjs <id> --only card.wav          make one first, and check its length and level
node tools/sound.mjs <id>                          make every sound that does not exist yet
node tools/sound.mjs <id> --only card.wav --fresh  make one again (it costs credits again)
node tools/sound.mjs <id> --measure                make nothing; measure the files that are there
```

- It is a **paid** service, and the key comes from the environment (section 3).
- **Leave `seconds` out for music.** The tool then measures the part of the video that the
  `v.music()` using that file plays under, and adds three seconds (where deep details split
  the part, the longest stretch that plays). So: write the `v.music()`
  line and **record the voice first**; before that the length is only an estimate, and music
  that is too short plays again from its beginning. The export blends each restart in over
  up to three seconds, and its mix report says how many times the piece repeats. A service
  has a longest piece it will make (often a few minutes). For a longer part, let the piece
  repeat, or put music under a shorter stretch. Do not pay for a second piece to avoid one
  repeat.
- Each effect has the silence at its start trimmed (so it sounds at the moment the script
  names), every file's loudest moment is set to the same level (so `volume` means the same for
  each), and a row with the service, the date and the prompt is written to
  `assets/<id>/CREDITS.md`.
- **You probably cannot hear the result.** Read what the tool measures (length, mean level,
  peak), read the export's mix report, and say plainly in the hand-over that a person needs to
  listen once. A sound that measures well can still be the wrong sound.
- Another service: add an entry to `SERVICES` in `tools/sound.mjs`, after reading that
  service's current documentation.

### Other sources, and the mix

- **Sources without generation:** the user's own files; libraries that state a licence allowing
  the intended use (commercial, on video sites); sounds released into the public domain.
  "Royalty-free" still has conditions: read them. Popular songs are not usable, however short
  the clip.
- **The whole mix** is kept from clipping by the export, which says so when it had to turn it
  down. `frames` reports levels and long silences (`visual-review.md` section 7).

Supported formats: anything `ffmpeg` reads (`.wav`, `.mp3`, `.m4a`, `.ogg`, `.flac`).

## 9. Pictures and film

Before looking for an asset, ask whether the engine can draw it. A diagram built from shapes,
labels and arrows (`scene`) is usually better teaching than a picture: it can be built up piece
by piece, pointed at, translated, and reshaped for vertical video. Use an asset when the viewer
needs to see **the real thing** or **a real interface**, or when a picture carries a feeling that
shapes cannot.

| Need | Options, cheapest first |
| --- | --- |
| A diagram, a process, a comparison, a map of ideas | Draw it with `scene`, `chart`, `list`. |
| An icon or a simple drawing | Write an SVG file by hand; emoji as text; an open-licensed icon set. |
| A photograph of a real thing or place | The user's own; public-domain and open-licensed collections (museums, space agencies, encyclopaedia media libraries, free stock sites). Record the licence. |
| A screen recording | The user records it, or you drive the application and record it if you have the tools. See `visual-design.md` section 7. |
| An illustration in a particular style | A picture-generation service. |
| Moving footage, a character, a scene that does not exist | A film-generation service, or stock footage. |
| A historical picture or document | Archives and libraries; check the rights statement; show the date and source on screen. |

Formats: pictures `.png`, `.jpg`, `.webp`, `.svg`, `.avif`; film `.mp4` (H.264) or `.webm`.
Keep files in the project (`assets/…`); the checker warns about anything loaded from the
internet, because it may not be there tomorrow.

## 10. Services: use what is offered, ask for what is missing

### The user named a service

When the request says "use service X for the pictures" or "my key for Y is in …", that is a
decision already made. Do not ask again, and do not quietly do without.

1. **Find out in a minute whether you can reach it.** Is there a tool for it in this session
   (look through the tools you have, including ones that load on demand)? Is its key in the
   environment (`[ -n "$X_API_KEY" ] && echo set`; never print the value)? Did the user name a
   file (section 3)?
2. **If you can reach it:** read its current documentation, write the asset list (section 11),
   make one, look or measure, make the rest, record the credits.
3. **If you cannot reach it: do not stop, and do not swap in another paid service.**
   - Finish the video with what you can make: drawn pictures, the free voice.
   - Write `notes/<id>/assets.md`: what is waiting, why, and for each asset the file name,
     where it goes, its shape and its full prompt, so that making it later is one command or
     one request.
   - Say it plainly in the hand-over, with the reason and how to fix it. A common reason: **a
     connection made in another product (a chat website, a desktop app) is not visible to the
     coding agent.** The fix is to connect the service as a tool of the agent that runs this
     project, or to set its API key in the environment of the shell that runs the tools.
   - Never invent a server address, an endpoint or a login.

### The user named nothing, and the video needs something

When the video would be clearly better with assets you cannot make or find freely, **say so and
ask, once, while you carry on.** Do not quietly lower the ambition, and do not sign up for or
pay for anything yourself.

Tell the user, in one short message:

1. **What is needed and why,** as a list: "a narrator's voice (the free one sounds robotic)",
   "four illustrations: a harbour at low and high tide, …", "ten seconds of waves".
2. **What kind of service provides it,** with examples, and that any similar one will do:
   - voices: ElevenLabs, OpenAI, or a local model through `TTS_COMMAND`;
   - pictures and film: services such as Higgsfield, Runway, Luma, Kling, or an image model from
     any provider the user already has;
   - music and effects: a licensed library, or a generation service (`tools/sound.mjs`).
3. **How to give access safely:** set the service's API key as an environment variable in the
   shell that runs the tools (for example `ELEVENLABS_API_KEY`), or connect the service as a
   tool of this agent environment. Never paste a key into the chat or a file in the project.
4. **Roughly what it will use:** the number of characters of speech (`tts --dry`), the number of
   pictures, the seconds of film and of sound (`sound --dry`). Prices change; point to the
   service's price page instead of quoting one.
5. **What happens otherwise:** the free voice, drawn diagrams, no music, placeholders for the
   user to replace.

Then carry on with everything that does not depend on the answer. The video you hand over must
be complete without the missing assets.

## 11. Generated assets: how to work

Sound has a tool (`tools/sound.mjs`, section 8). There is no built-in tool for picture or film
services: they differ too much and change too often. With access, work like this.

1. **Read the service's current API documentation** before writing any call. Do not rely on
   memory for endpoints, model names or parameters.
2. **Write an asset list** first, in `notes/<id>/assets.md` (the template is there): for each
   asset, the file name, where it is used, the size and shape, the prompt, and its state
   (made, waiting, replaced by a drawing). Write it even when you cannot reach the service: it
   is what lets the next session finish the job.
3. **One style statement, reused in every prompt:** medium, palette, lighting, level of detail,
   point of view ("flat vector illustration, navy and gold, soft shadows, no outlines, no text").
   This is what makes twelve pictures look like one video. Use the service's own means of
   keeping a style or a character consistent (a reference picture, a seed, a style id) where it
   has them.
4. **Ask for no lettering in pictures.** Generated text is often garbled and cannot be
   translated. Add words with `text` clips and labels.
5. **Match the box:** request the shape the picture will be shown at (16:9 for a full stage, a
   square for half), at least as many pixels as it will occupy at export size.
6. **Leave room** in the composition for captions and labels: "subject on the left third, empty
   sky on the right".
7. **Make one, look at it, then make the rest.** Generation costs money per try.
8. **Write a small script** in `tools/` (for example `tools/assets-<service>.mjs`) that reads the
   key from the environment, sends each prompt, and saves to `assets/<id>/<name>.png`, skipping
   files that already exist. A script is repeatable; pasted commands are not.
9. **Check every result by looking at it:** wrong numbers of fingers, legs or wheels; impossible
   mechanisms; flags, maps and instruments drawn wrongly; anything that states a false fact
   about the subject. A picture in a teaching video is a claim (`script-review.md` section 1).
10. **For film:** keep clips short (a few seconds), expect to discard some, check the first and
    last frames, and place them with the `video` component. Slow, simple camera moves hold up
    best. Never use generated film to show a real event as if it were footage.
    The same for pictures of real events and real people: draw the place and the time, not the
    named person, and never in a style that could pass for a photograph of the event.
11. **Record what was made:** service, model, prompt, date, in `assets/<id>/CREDITS.md`.

## 12. Rights, credits and disclosure

For every asset that you did not draw with the engine, record in `assets/<id>/CREDITS.md`:

```markdown
| File | What | Source | Author | Licence | Notes |
| --- | --- | --- | --- | --- | --- |
| harbour-low.jpg | Harbour at low tide | https://… | A. Name | CC BY 4.0 | credit on screen and in description |
| story.m4a | Music under the history chapter | library name, track id | B. Name | library standard licence | no credit required |
| moon.png | Illustration | generated: service, model, 2026-03-02 | n/a | service terms | prompt: "…" |
```

- **No recorded licence, no use.** "Found on the internet" is not a licence.
- **Follow the licence's conditions:** credit where required (on screen with a small `caption`
  text, and in the description), share-alike, non-commercial limits.
- **People:** a recognisable person needs their permission, and a child needs a guardian's.
  Do not generate a real person's likeness or voice.
- **Trade marks and interfaces:** showing a product to teach its use is normally accepted;
  implying endorsement is not. The user decides; point it out.
- **Disclose generated or altered content** that looks real, where the publishing platform or
  local law asks for it. Video sites have a setting for this at upload. Put a line in
  `notes/<id>/publish.md` so that it is not forgotten.
- **Generated material may carry its own terms** (commercial use only on paid plans, for
  example). The user should check the plan they are on.
- You are not a lawyer; for anything doubtful, say what the doubt is and let the user decide.

## 13. Keeping assets in order

```
assets/
  <id>/               pictures, film and sounds for one video
    sounds.json       the list tools/sound.mjs makes sounds from
    CREDITS.md
  shared/             logos, fonts, sounds used by several videos
  voice/<id>/<lang>/  a narrator's own recordings
```

- **Name assets by what they show** (`harbour-low-tide.jpg`), and give each a key in the script:
  `v.asset('harbourLow', 'assets/tides/harbour-low-tide.jpg')`. Replacing the file later then
  changes nothing else.
- **Placeholders keep the work moving.** Until an asset exists, put a labelled box where it will
  go and note what is needed:

  ```js
  v.add('harbourPhoto', 'text', { text: 'PLACEHOLDER\nphoto: a harbour at low tide', role: 'label', bg: '#553300', radius: 16 }, { box: left });
  v.mark('note', '@start', 'needs asset: harbour at low tide (photo, landscape)');
  ```

  List every placeholder in your final message. Never export for publishing with one in place.
- **Sizes:** a full-stage picture needs 1920 × 1080 pixels (3840 × 2160 if exporting at
  `--scale 2`). Much larger files only slow the export.
- **Large files** (film, music) may not belong in version control; tell the user where they are
  and let them decide.
- **Fonts** are assets too: a file in the project, a licence that allows embedding in video, and
  an entry in `fonts`.
