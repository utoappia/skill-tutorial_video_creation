# Languages and shapes

One script can be published in several languages and in several shapes (wide, vertical, square).
The words change; the timing follows the new voice by itself, because everything is timed from
lines. What does not adapt by itself is room on screen, and that is what this file is mostly
about.

## Contents

1. How it works
2. Writing a script that can be translated
3. Adding a language
4. Translating well
5. After translating
6. Languages that need more care
7. Layouts: the same video in another shape
8. Done

## 1. How it works

- Every text in a video (spoken lines, captions, words on screen, chapter names, the title) has
  a **key**. The script holds the text in its own language; a translation is a file of key →
  text: `videos/i18n/<id>.<lang>.json`.
- The kit makes the keys for you. A key is a fingerprint of the source text, so **when a source
  line changes, its key changes:** the old translation becomes unused and the line shows up as
  missing. A translation cannot silently go out of date.
- Tools take `--lang xx`. A regional code falls back to its language and then to the script's
  own: `fr-CA` → `fr` → the default.
- A text with no translation is shown in the script's own language, and reported: `check`
  treats it as an error, so a half-translated video cannot be exported by accident.
- Each language has its own recorded voice, so each language's video has its own length.

## 2. Writing a script that can be translated

Decide early whether the video will be translated; it is cheap to prepare for and tedious to
retrofit.

- **Every text goes through a key.** `say`, `title`, `term`, `think` (with its "Here is a quick
  quiz." line and its "Quick quiz" heading), `recap`, `chapter`, scene node texts and pointer
  labels do this themselves. **For texts in `add()` props, call `v.t()`:**

  ```js
  v.add('rain', 'chart', { type: 'bar', title: v.t('Rain each month'), labels: [v.t('Jan'), v.t('Feb')], values: [80, 62] }, { box });
  ```

  A plain string still works, but stays in the source language. `node tools/i18n.mjs <id>
  --lang xx` lists what it found; a text that is missing from the list was never given a key.
- **Leave room.** Translations are often a third longer than English, and some far more for
  short labels. Boxes that are just big enough will shrink or wrap. A layout with a quarter of
  the area free survives translation.
- **No text inside pictures.** Lettering baked into an image cannot be translated. Put words on
  top with `text` clips and labels.
- **Whole sentences as one text.** Never build a sentence from pieces (`v.t('You have') + n +
  v.t('days')`): word order differs between languages. Write the whole sentence, number
  included.
- **Time things to lines, never to numbers.** A line that takes 3 seconds in English may take 5
  in German. References (`@line`, `@line.end`, `@line+40%`) follow; typed seconds do not.
- **Be careful with `@line+40%`:** the word a mark should land on may be at 40% of the English
  sentence and 80% of the Japanese one. For marks that must hit a word, split the sentence in
  two lines and mark at the start of the second.
- **Avoid examples that only work in one culture:** idioms, puns, sports, holidays, school
  grades, currency, units. If the video needs one, note for the translator that it may be
  swapped.
- **Give lines stable ids** if a human will narrate or translate over a long time:
  `v.say(text, { id: 'why-drift' })`.

## 3. Adding a language

```
node tools/i18n.mjs <id> --lang es
```

This creates or updates `videos/i18n/<id>.es.json` with every key the video uses (new ones
empty), and writes a **translator's brief** to `out/i18n/<id>.es.md`:

- rules for translating a spoken teaching script;
- a **glossary**: the word-card terms, to be settled first;
- every text **in the order it appears**, with where it is used (spoken, caption, on screen) and
  its key.

Translate by filling in the JSON file. Then:

```
node tools/i18n.mjs <id> --status          done/total for each language; unused keys; entries equal to the source
node tools/i18n.mjs <id> --lang es --prune   drop keys the video no longer uses
```

An entry identical to its source is listed, because it is usually a text someone forgot; for a
name or a number that is right as it is, ignore the note.

In a raw JSON script, translations may also live in the script's own `strings` table
(`script-format.md` section 9), and in the kit they can be given inline with `v.translate(lang,
{ key: text })`. Files in `videos/i18n/` are the usual place, because a translator can work on
one without touching the script.

## 4. Translating well

Whoever translates (you, another agent, a person), the brief says this, and it matters:

- **Translate the meaning, as a good teacher who grew up in the language would say it aloud.**
  Not word for word.
- **Keep the level.** Short sentences, everyday words. Where the source avoids a hard word,
  avoid it too. Re-run the reading-level thinking of `writing-for-everyone.md` in the target
  language: a plain English word may only have a formal equivalent, and then a short phrase is
  better.
- **Settle the terms first.** Choose one translation for each word-card term, write it in the
  glossary, and use exactly that everywhere. Check how the subject's own textbooks in that
  language name it.
- **Spoken lines are for the ear:** numbers, symbols and abbreviations written as they should be
  heard. The matching caption (a separate key) can keep digits.
- **On-screen words have limited room:** keep them about as long as the source. Spoken lines may
  run longer; the video stretches.
- **Keep `**strong**` marks** around the same idea, and line breaks (`\n`) where the source has
  them, moved to a natural place.
- **Names** of people, places and products stay, unless the language has its own usual form.
- **Units, money and dates:** convert or restate where the audience would expect it and the
  facts allow, and say so to the user. Never change a fact to make an example fit.
- **Formality:** choose one form of address for the viewer and keep it.

A translation is new material. It needs its own checks:

- **Accuracy:** did any claim become stronger, weaker or different? Numbers and names against
  the source.
- **Comprehension:** read the translated dump (`node tools/dump.mjs <id> --lang es`) as a
  first-time viewer in that language. A short learner's diary for each language is worth it for
  anything that will be widely seen.
- **A fluent reader** should look over anything that will be published. If you are not sure of a
  language, say so plainly to the user rather than guessing.

## 5. After translating

```
node tools/check.mjs <id>                 checks every language and every layout
node tools/stills.mjs <id> --lang es      look at every sheet again
node tools/tts.mjs <id> --lang es         a voice for that language
node tools/export.mjs <id> --lang es      out/<id>.es.mp4, .es.srt, .es.vtt
```

- **Look at the stills of every language.** The checker catches missing texts and long
  captions; only looking catches a heading that now wraps to three lines or a label that shrank.
  Fixes, in order of preference: a shorter translation; a larger box (which then applies to all
  languages); a per-language override in a layout (section 7) if nothing else works.
- **The voice:** pick a voice that is native to the language. With the free macOS voice, the
  tool chooses an installed voice of that language (install more in the system's settings).
  With a paid service, choose a voice suited to the language and set it per language, for
  example by recording with `ELEVENLABS_VOICE_ID` set differently for each run.
- **Pronunciations are per language:** `v.pronounce('CO2', 'ce o dos', 'es')`.
- **Pace:** the checker's words-per-minute and reading-level measures are tuned to languages
  written with spaces; for others it estimates from characters. Listen to the result.
- **Captions** are split by length with wide characters counted double, so Chinese, Japanese and
  Korean captions stay readable. Check that splits fall at sensible places; a shorter caption, or
  splitting the line in two, fixes a bad one.
- **Subtitles for more languages than voices:** one video with one voice can carry subtitle
  files in many languages. `node tools/export.mjs <id> --lang es --subs-only` writes the `.srt`
  for a language (timed to that language's voice if one is recorded, otherwise to its estimate).
  For subtitles that match another language's sound track exactly, time is taken from that
  track: that needs the translated captions on the source timing, which is a job for the
  platform's own subtitle editor or a subtitle tool.

## 6. Languages that need more care

- **Right-to-left (Arabic, Hebrew, Persian, Urdu):** text and captions run in the direction of
  their own script inside their boxes. The arrangement of a shot does not mirror itself: a
  layout that reads left to right (cause on the left, effect on the right; a timeline; a
  before/after) should be mirrored with a layout used for those languages. Check every arrow,
  and every left-aligned text.
- **Fonts:** the system's default font covers most scripts, but the machine that exports must
  have a font for the language, or boxes appear in place of letters. Look at the stills; if
  needed, add a font file with `fonts`.
- **Long compound words (German, Finnish, Dutch):** a single word may be wider than its box and
  cannot wrap. Give labels width, or choose a shorter word.
- **No spaces between words (Chinese, Japanese, Thai):** lines can break anywhere, so headings
  may break in the middle of a word. Break headings by hand with `\n`.
- **Plural and gender agreement:** another reason for whole sentences and against assembling
  text from pieces.
- **Numbers:** decimal commas, digit grouping and the order of dates differ. Captions and
  on-screen numbers should follow the language's habit.

## 7. Layouts: the same video in another shape

A layout re-places the clips of a video for another stage size, with the same script, voice and
timing.

```js
const v = video('tides', 'Why the sea goes in and out', {
  layouts: {
    vertical: {
      width: 1080, height: 1920,
      clips: {
        heading: { box: { x: 70, y: 220, w: 940, h: 260 } },
        sea: { box: { x: 40, y: 560, w: 1000, h: 700 } },
        moonChart: { box: { x: 40, y: 1300, w: 1000, h: 300 }, props: { title: 'Pull' } },
        logo: { hidden: true },
      },
    },
  },
});
```

For each clip a layout may give a new `box` (merged over the clip's own, so `{ y: 600 }` alone
moves it), extra `props` (merged), or `hidden: true`. It may also set `width`, `height` and
`background`.

```
node tools/check.mjs <id>                       every layout is checked
node tools/stills.mjs <id> --layout vertical
node tools/export.mjs <id> --layout vertical    out/<id>.vertical.mp4
```

- **Every clip normally needs an entry.** A clip the layout does not mention keeps its wide
  box, which on a narrow stage is partly off it; the checker warns.
- **Clip ids are the handles,** so give clips meaningful ids, and do not rename them later.
- **Things made by kit helpers** (`title`, `term`, `think`, `recap`) fill the safe area of the
  default stage; give them entries too. `node tools/dump.mjs <id>` lists every clip id.
- **Pointers follow their targets:** a ring on a scene node or on a clip moves with it. Pointers
  given as raw coordinates do not; avoid those in videos with layouts.
- **Keyframes on `x`, `y`, `w`, `h` are not adjusted;** avoid them on clips a layout moves, or
  the clip will fly to its wide position.
- **Scenes scale as a whole** into their new box, so their text gets smaller in a narrow box.
  Check the smallest label; a `props` override can raise `fontSize`, or split the scene.
- **Shorter texts for narrow shapes** are done with `props` overrides, in the script's own
  language only. For a translated vertical video, prefer boxes large enough for the full text.
- **When to make a separate video instead:** when the vertical version should be shorter, be
  ordered differently or show less. A layout changes where things are, not what is said. A
  40-second vertical cut of a 5-minute video is a new, small script that reuses the same
  functions and assets.

## 8. Done

- [ ] `node tools/i18n.mjs <id> --status` shows every language complete, with no unused keys.
- [ ] The glossary terms are used consistently, and match the word cards.
- [ ] `check` passes for every language and layout.
- [ ] Stills of every language and layout to be published have been looked at.
- [ ] Each language has its voice, recorded after the last text change.
- [ ] A fluent reader has seen each translation, or the user has been told that none has.
