# The authoring kit

`engine/kit.js` lets you write a video as a short JavaScript program. It builds the plain-data
script described in `script-format.md`; it draws nothing and has no side effects. A video file
lives in `videos/<id>.mjs` and ends with `export default v.build();`.

## Contents

1. The idea: lines, references, shots
2. Starting a video
3. Speaking: `say`, `wait`, `beat`, `chapter`
4. Time references
5. Shots and clips: `shot`, `add`, boxes, transitions
6. Changing a clip over time: `cmd`, `keyframe`
7. Ready-made shots: `title`, `term`, `think`, `recap`
8. Scenes: `scene` and the director
9. Pointing over anything: `annotate`
10. Sound: `eventSounds`, `sfx`, `music`
11. Assets, pronunciation, translation, markers
12. Details: parts the requester can delete
13. Recipes
14. Mistakes the kit or the checker will catch

## 1. The idea: lines, references, shots

- **`say()` is the clock.** Each call adds a spoken line after the previous one and returns a
  **time reference** such as `"@n3"`. Pictures, pointers and effects are placed with those
  references, never with numbers of seconds from the start. When the voice is recorded and a line
  turns out longer or shorter, everything attached to it moves with it.
- **A shot is what is on screen together.** `shot()` starts a new one. Clips added after it
  appear just before the next line and leave when the following shot starts.
- **A clip is one component on screen** (a text, a scene, a chart). `add()` returns a handle used
  to change it later.

```js
import { video } from '../engine/kit.js';
const v = video('sky', 'Why the sky is blue');

v.chapter('The question');
const heading = v.add('heading', 'text', { text: v.t('Why is the sky blue?'), role: 'title' });
v.say('Look up on a clear day. The sky is blue.');
const b = v.say('But sunlight is white. So where does the blue come from?');
heading.cmd(b, 'setText', { text: v.t('Where does the blue come from?') });

export default v.build();
```

## 2. Starting a video

```js
import { video, take, cols, rows, inset, fitIn } from '../engine/kit.js';
const v = video(id, title, options);
```

| Option | Default | Meaning |
| --- | --- | --- |
| `size` | `[1920, 1080]` | Stage size. `[1080, 1920]` for vertical, `[1080, 1080]` for square. |
| `language` | `'en'` | The language the script is written in. |
| `fps` | `30` | Frames a second. |
| `background` | `'#0b1626'` | Stage colour. |
| `theme` | | Colours and fonts: `{ ink, dim, accent, accentInk, card, good, bad, font, mono }` (see `visual-design.md`). |
| `fontFamily` | system fonts | Font for everything. Load files with `fonts`. |
| `fonts` | | `[{ family, src, weight?, style? }]`; `src` is a path in the project. |
| `caption` | | `{ show, bottom, width, size, maxUnits }` (see `script-format.md`). |
| `gap` | `0.5` | Silence between lines, in seconds. |
| `voice` | | Voice settings for every line: `{ rate, say: {…}, elevenlabs: {…}, openai: {…} }` (see `voice-and-assets.md`). `rate: 0.9` is a little slower. |
| `speakers` | | `{ name: { voice: {…} } }` for more than one voice. |
| `eventSounds` | | `{ card, quiz, answer, volume }`: a sound for every word card, quiz start and answer (section 10). |
| `pace` | | Estimated speaking speed before a voice is recorded: `{ wordsPerSecond: 2.75, … }`. |
| `duration` | | Fixed length in seconds. Needed only for a video with no narration. |
| `tail` | `2` | Seconds of picture after the last line. |
| `layouts` | | Other shapes of the same video (see `localization.md`). |
| `omit` | | Names of details to leave out: `['the-phone-call', …]`, or `['all']` for the core alone (section 12). |

`v.id`, `v.stage`, `v.width`, `v.height` are available afterwards. Keep the `id` equal to the file
name.

## 3. Speaking: `say`, `wait`, `beat`, `chapter`

```js
const line = v.say('The real trip takes about six hours longer.');
```

`say(text, opts)` returns the line's reference. Options:

| Option | Meaning |
| --- | --- |
| `caption` | The caption text when it should differ from the spoken text (digits for numbers), or `false` for no caption. |
| `gap` | Silence before this line instead of the default. |
| `speaker` | A name from `speakers`. |
| `voice` | Voice settings for this line only, e.g. `{ rate: 0.85 }`. |
| `id` | Your own id instead of `n1`, `n2`, … Useful when recordings are supplied as files named by line. |
| `audio` | A recording to use for this line (a path or an asset key) instead of a generated voice. `tts` measures it and uses it whatever the provider. |

- `v.wait(seconds)` adds silence before the next line, on top of the gap.
- `v.beat()` is `wait(0.7)`: use it after a question, before an answer, after a big idea.
- `v.chapter('Name')` starts a chapter at the next line. The first one starts at 0:00. Chapters
  go into the mp4, the `.chapters.txt` file and the player. Give every video over about a minute
  at least three, each at least 10 seconds long and none much over three minutes (the checker
  warns at six). A long video has as many as it needs: chapters are how a viewer finds one
  part of an hour. `chapter()` may be called inside a detail; the chapter goes when the detail
  goes.

## 4. Time references

A reference names a moment relative to something with an id (a line, a clip, a command, a marker).

| Reference | Moment |
| --- | --- |
| `line` (i.e. `"@n3"`) | When the line starts |
| `` `${line}.end` `` | When it ends |
| `` `${line}+1.5` ``, `` `${line}-0.25` `` | Seconds after or before its start |
| `` `${line}.end+0.5` `` | Seconds after its end |
| `` `${line}+40%` `` | 40% of the way through it |
| `'@start'`, `'@end'` | The start and end of the video |
| `clip.ref` | When a clip appears; `` `${clip.ref}.end` `` when it leaves |
| the value returned by `cmd()` | When that command starts; add `.end` for when it finishes |

**Ids may contain `-`,** so `"@n3-2"` is read as the thing called `n3-2` if there is one, and
otherwise as two seconds before `n3`. To leave no doubt, write `"@n3 - 2"` or `"@n3.start-2"`.

Only one offset is allowed (`"@n3+40%+1"` is an error). To chain, hang the second thing from the
first command's reference: `const k = box.cmd(line, …); box.cmd(`${k}.end+0.3`, …)`.

Use `+NN%` to hit a word inside a line: if "Earth" is the third word of eight, point at about
`+30%`. Check the still. After the voice is recorded the percentage still lands close, because
it scales with the line.

A plain number means seconds, but its meaning depends on where it is used: in `cmd()` and
`keyframe()` it counts from the **clip's** start; in `add(…, { start })`, `sfx` and `mark` it
counts from the start of the **video**. Prefer references everywhere.

## 5. Shots and clips: `shot`, `add`, boxes, transitions

```js
v.shot('orbit');                          // a new shot; the name is for you and for the dump
const head = v.add('head', 'text', { text: v.t('One year is one trip'), role: 'kicker' }, { box: headBox });
```

- A shot starts a quarter of a second before its first line, so the picture is there when the
  voice begins. A shot with no line in it has no time: say a line, or place it with
  `v.shot('name', { at: ref })`.
- Before the first `shot()` everything belongs to the opening shot.
- Clips of a shot fade out when the next shot begins. The clips of the last shot stay to the end.

`add(clipId, component, props, opts)` returns a handle `{ id, ref, cmd, keyframe }`.
Pass `null` as the id to have one made (`c1`, `c2`, …); name the clips you will point at.

| Option | Default | Meaning |
| --- | --- | --- |
| `box` | `v.area()` | Where it sits: `{ x, y, w, h }` in stage units. `'stage'` fills the whole picture (backgrounds, film). |
| `in` | `'fade'` | How it arrives: `fade`, `slide-up`, `slide-down`, `slide-left`, `slide-right`, `zoom`, `wipe`, `cut`, or `{ type, duration, ease }`. |
| `out` | fade with the shot | How it leaves. |
| `hold` | `false` | `true` keeps it to the end of the video (a logo, a background). |
| `start`, `end`, `duration` | the shot's | Place it yourself with references. |
| `track` | `'base'` | `'overlay'` draws above the base track; `'cards'` above both. Any other name makes a new track above those. |
| `opacity`, `scale`, `rotate` | `1`, `1`, `0` | Of the whole clip. |

Within a track, later clips are drawn over earlier ones.

**Boxes.** Always derive boxes from the safe area rather than typing pixel numbers, so the layout
survives a change of stage size.

```js
const area = v.area();                              // inside the margins, above the caption band
const full = v.area({ captions: false });           // when captions are off
const [headBox, rest] = take(area, 'top', 110, 20); // cut a 110-high strip off the top, 20 gap
const [left, right] = cols(rest, 2, 40);            // two columns, 40 apart
const [a, b, c] = rows(right, 3, 20);               // three rows
const padded = inset(left, 30);                     // 30 smaller on every side
const shotBox = fitIn(rest, 1280, 720);             // the largest 1280:720 box that fits, centred
```

`take(box, side, size, gap)` returns `[strip, remainder]` for `'top'`, `'bottom'`, `'left'` or
`'right'`.

## 6. Changing a clip over time: `cmd`, `keyframe`

```js
const k = chart.cmd(line, 'reveal', { count: 2 }, 0.6);          // at, command, args, duration
chart.cmd(`${k}.end+0.5`, 'highlight', { index: 1 });
box.cmd(line, 'set', { nodes: { coin: { x: 900 } } }, `${line}.end`);   // a reference as the 4th argument: "until then"
box.cmd(line, 'set', { nodes: { coin: { x: 900 } } }, 0.8, { ease: 'outBack' });
```

Each component has its own commands (`components.md`). A command with a duration glides; without
one it switches at once. The checker rejects a command the component does not have, or whose
arguments are wrong (a target that does not exist, a count beyond the list).

Easing names: `linear`, `hold`, `in`, `out`, `inOut` (the default), any of `in`/`out`/`inOut`
followed by `Sine`, `Quad`, `Cubic`, `Quart`, `Expo` or `Back` (`outBack`, `inOutSine`), `pop`,
or `cubic-bezier(x1, y1, x2, y2)`.

`keyframe(prop, points)` moves, resizes, fades, scales or turns the **whole clip**. `prop` is one
of `x`, `y`, `w`, `h`, `opacity`, `scale`, `rotate`; each point is `[at, value, ease?]`.

```js
const photo = v.add('photo', 'image', { src: 'assets/harbour.jpg' }, { box: 'stage' });
photo.keyframe('scale', [[line, 1], [`${line}.end`, 1.08, 'linear']]);    // a slow push-in
photo.keyframe('opacity', [[later, 1], [`${later}+0.5`, 0.25]]);          // dim it behind what comes next
```

## 7. Ready-made shots: `title`, `term`, `think`, `recap`

**`v.title(text, subtitle?, { name, captions, in })`** starts a shot with a large heading and an
optional line under it. Returns `{ heading, sub }` (clip handles). The heading slides in, so the
first frames of the shot are empty. When the title opens the video, pass `{ in: 'cut' }`: the
first frame is what a player shows before play, and it should not be an empty background.

**`v.term(word, meaning, line, { say, caption, example, sounds, hold })`** shows a word card: the
new word, large, in the middle, with its meaning; everything behind dims.

```js
const pathLine = v.say('The path it follows is called its orbit.');
v.term('orbit', 'The path one thing follows around another.', pathLine, {
  say: 'An orbit is the path one thing follows around another.',
});
```

- The card appears when `line` starts (default: the last line said) and stays until that line,
  and the `say` line if given, has ended, plus `hold` seconds (default 0.8). It never stays for
  less than the time needed to read it.
- **Give `say`**: a sentence stating the meaning in the narrator's voice while the card is up.
  Hearing and reading the meaning together is what makes the word stick. With `say`, `term()`
  must be called straight after the line it appears with.
- The next line waits until the card has gone. Do not attach commands to other clips during the
  card (the checker warns: the viewer is reading and will miss them).
- `example` adds a smaller line under the meaning; `sounds` adds how to say it; `caption` is the
  caption for the `say` sentence when it differs.
- The checker reports an error if the word is spoken before its card.

**`v.think(question, seconds = 4, { hint, intro, label, say, caption, shade })`** is a quick
quiz. It does four things in order, and the viewer is never left with a question that is only
on screen:

1. The narrator **says a question is coming** ("Here is a quick quiz.").
2. The question card appears and the narrator **reads the question aloud**. The countdown ring
   is full and does not move yet.
3. The narrator is **silent** for `seconds` while the ring counts down.
4. The next line starts when the card has gone. Make that line the answer.

```js
v.say('Six extra hours does not sound like much.');
v.think('Six extra hours every year.\nAfter four years, how many hours is that?', 4, { hint: '6 + 6 + 6 + 6' });
v.say('Twenty-four hours. That is one whole day.');
```

| Option | What it does |
| --- | --- |
| `hint` | A smaller line under the question: the first step, never the answer. It is not read aloud. |
| `intro` | The line that announces the quiz. Default `'Here is a quick quiz.'`. Change the words when a video has more than one (`'One more question.'`). Pass `false` only when the line just before already tells the viewer that a question is coming. |
| `label` | The small heading on the card. Default `'Quick quiz'`; `false` for none. |
| `say` | The question as it should be spoken, when that differs from the card (a sum shown as `6 × 4 = ?` is spoken as "What is six times four?"). Needed whenever the shown question is not plain text. |
| `caption` | The caption for the spoken question, when it differs from what is spoken. |
| `shade` | How much the card hides what is behind it, 0 to 1. Default `1` (hidden), so the picture cannot give the answer away. |

- The two spoken lines get the ids `<card>-intro` and `<card>-ask` (`think1-intro`,
  `think1-ask`), so they are recorded, captioned and translated like any other line.
- The card stays from the start of the spoken question until `seconds` after it ends. Whatever
  voice is recorded, the thinking time is never shortened by a long question.
- Do not attach commands to other clips during the card, and put the answer in the next line,
  never on the card.
- A pause marker is added where the thinking time starts.
- The checker reports an error for any question card whose question is not read aloud.

**`v.recap(heading, rows, { name, style })`** starts a shot with a list whose points arrive one by
one, each with its own spoken line. Each row is `[shownText, spokenLine, caption?]`. `style` is
`'checks'` (default), `'bullets'` or `'numbers'`. Returns the list's handle.

```js
v.recap('What to remember', [
  ['The real year is about **365 days and 6 hours**', 'The real year is about six hours longer than the calendar year.'],
  ['4 × 6 hours = **1 extra day**', 'After four years, those hours add up to one extra day.'],
]);
```

## 8. Scenes: `scene` and the director

A scene is a drawing made of named nodes (boxes, circles, texts, pictures, lines) in its own
coordinate space. It is the component for diagrams and anything that moves.

```js
const sky = v.scene('sky', [
  { id: 'sun', kind: 'circle', x: 380, y: 280, w: 140, h: 140, fill: '#ffcf3f', text: 'Sun', color: '#3a1d00' },
  { id: 'earth', kind: 'circle', x: 715, y: 315, w: 70, h: 70, fill: '#4aa3ff' },
  { id: 'note', x: 900, y: 150, w: 620, h: 150, text: 'Calendar year\n**365 days**', fontSize: 50, opacity: 0 },
], { box: sceneBox, width: 1600, height: 700 });
```

`v.scene(clipId, nodes, { box, width, height, background, …add options })`. Give `width` and
`height`: they are the scene's own units, scaled to fit the box, so node positions do not depend
on the stage size. Node fields are listed in `components.md`.

The director's methods all take the time first and return the command's reference:

| Method | Does |
| --- | --- |
| `set(at, { id: fields, other: null }, duration?, { arc, ease })` | Change nodes; `null` removes one; a new id adds one. Numbers glide over the duration. |
| `add(at, [nodes], duration = 0.4)` | Add nodes (they fade in). |
| `remove(at, ids, duration = 0.3)` | Remove nodes. |
| `show(at, ids, duration = 0.4)` / `hide(at, ids, 0.3)` | Fade nodes in or out. Create nodes that appear later with `opacity: 0`. |
| `move(at, id, { x, y }, duration = 0.6, { arc, ease })` | Glide a node. `arc: 80` lifts the path by 80 units in the middle (a hop). |
| `text(at, id, text)` | Change a node's words. |
| `ring(at, target, { label, side })` | A ring around a target. |
| `spot(at, target, { label, side })` | Dim everything but the target. |
| `arrow(at, target, from = 'above', { label, side })` | An arrow from `above`, `below`, `left` or `right`. |
| `finger(at, target)` | A fingertip resting on it. |
| `clear(at, duration = 0.25)` | Remove the pointing. |
| `tap(at, target, duration = 0.9)` | A fingertip travels to it and presses. |
| `drag(at, id, to, duration = 1.4)` | A fingertip carries a node to `{ x, y }` or onto another node. |
| `swipe(at, { x, y }, { x, y }, duration = 0.8)` | A fingertip swipes. |
| `camera(at, target, duration = 0.8, { pad })` / `reset(at, duration = 0.8)` | Zoom to a node, a list of nodes or a box; and back. |

A target is a node id, a list of ids, or `{ x, y, w, h }` in scene units. A label's `side` is
`above`, `below` (the default here), `left` or `right`. One pointing mark shows at a time: a new
`ring` replaces the last. Texts in nodes and labels are filed for translation automatically.

## 9. Pointing over anything: `annotate`

`v.annotate(clipId)` adds a transparent layer over the whole stage, above the other clips of the
shot, for pointing at clips that cannot point at themselves (a picture, a film, a chart, a text).

```js
const shotBox = fitIn(v.area(), 1280, 720);          // a box with the picture's own shape (it is 1280 × 720)
const shotImg = v.add('screen', 'image', { src: 'assets/settings.png' }, { box: shotBox });
const mark = v.annotate('mark');
const l1 = v.say('The search box is at the top.');
mark.ring(l1, { clip: 'screen', rect: [0.22, 0.04, 0.56, 0.09] }, { label: 'Search', side: 'below' });
const l2 = v.say('Type a name, then press the blue button.');
mark.tap(`${l2}+55%`, { clip: 'screen', rect: [0.80, 0.04, 0.12, 0.09] });
mark.clear(`${l2}.end`);
```

Targets: `'clipId'` (the whole clip), `{ x, y, w, h }` in stage units,
`{ clip: 'clipId', rect: [x, y, w, h] }` (a part of a clip, as fractions of its box from 0 to 1;
this is how to point inside a picture or a recording), or a list of these.

**Fractions are of the clip's box, not of the picture.** A picture shown with `fit: 'contain'` in
a box of another shape has empty bands, and every ring lands beside its target. Give the clip a
box of the picture's own shape with `fitIn(box, pictureWidth, pictureHeight)`, as above.

Methods: `ring`, `spot`, `arrow`, `finger` (each `(at, target, { from, label, side })`),
`tap(at, target, duration = 0.9)`, `label(at, target, text, { side, key })` for a label that
stays, `unlabel(at, key?)`, `clear(at)`.

With `fit: 'contain'` a picture may not fill its box, and fractions are of the **box**. Give the
clip a box with the picture's own proportions and the fractions match the picture.

## 10. Sound: `eventSounds`, `sfx`, `music`

```js
// The same sound at every word card, every quiz and every answer. The kit places them.
const v = video('tides', 'Why the sea rises and falls', {
  eventSounds: { card: 'assets/tides/card.wav', quiz: 'assets/tides/quiz.wav', answer: 'assets/tides/answer.wav', volume: 0.3 },
});

v.sfx('assets/tides/splash.wav', line, { volume: 0.5 });   // one sound at one moment

// Music under one part only: from the first line of the story to 2.5 seconds after its last.
const first = v.say('In 1953, the sea came over the walls.');
// …
const last = v.say('After that, the walls were built higher.');
v.music('assets/tides/story.m4a', { start: first, end: `${last}.end+2.5`, volume: 0.28, fadeIn: 1.5, fadeOut: 2.5 });
```

- **`eventSounds: { card, quiz, answer, volume = 0.35 }`** (an option of `video()`): each is an
  asset key or a path; leave one out and that event is silent. `term()` plays `card`, `think()`
  plays `quiz` when the question starts and `answer` when the answer is given.
- **`sfx(src, at, { volume = 0.6 })`**: `src` is an asset key or a path.
- **`music(src, { start, end, volume = 0.25, loop = true, fadeIn = 1, fadeOut = 2, duck = true, overDeep = false })`**:
  `start` and `end` are time references. **Always give both for a video that teaches**: without
  them the music plays under the whole video. The export lowers music while someone speaks
  (`duck`) and prints, for each music clip, how far the voice is above it. Music **rests while a
  deep detail is told** and begins again after it (`voice-and-assets.md`, section 8);
  `overDeep: true` makes it play through.

Sound is heard in the export and the live player, not in stills. Which sounds, where music is
allowed (under story, never under a line that teaches, a word card or a quiz), how to make the
files with `tools/sound.mjs` and how to read the export's mix report:
`voice-and-assets.md` section 8.

## 11. Assets, pronunciation, translation, markers

- **`v.asset(key, path)`** names a file so that clips and sounds can use the key. Paths are from
  the project folder (`assets/…`). Returns the key.
- **`v.pronounce(written, spoken, language?)`** tells the voice how to read something it gets
  wrong, while captions keep the written form: `v.pronounce('CO2', 'C O two')`,
  `v.pronounce('Nguyen', 'nwin')`. Whole words only; applies to every line.
- **`v.t(text)`** files a text for translation and returns what to put in its place. `say`,
  `title`, `term`, `think`, `recap`, `chapter`, scene node texts and pointer labels do this for
  you. **You must call `v.t()` yourself for texts inside `add()` props** (`text`, `title`,
  `labels`, `items`, `heading`, `question`, …). A plain string still works, but it will not be
  translated.
- **`v.translate(lang, { key: text })`** adds translations inline; normally they live in
  `videos/i18n/` (see `localization.md`).
- **`v.mark(kind, at, label)`** adds a marker: `'note'` (for you), `'cue'` (for an editor),
  `'pause'`, `'chapter'`.

## 12. Details: parts the requester can delete

The default video is the core, with no details. When the requester asks for a longer version,
everything added beyond the core is wrapped in a **detail**, so that they can shorten it again
without reading the code (`planning.md`, section 3, says what belongs in the core).

```js
v.detail('moon-the-alarms', () => {
  v.chapter('The alarms');
  v.shot('alarms');
  // … clips, lines, commands: everything that only this part needs …
  v.say('Minutes before landing, the computer raised an alarm.');
}, { about: 'The computer alarms during the landing, and why the crew carried on' });
```

- **`v.detail(name, fn, { about })`** runs `fn` and records the lines it says as one detail.
  `name` is unique, lower case with hyphens, and starts with the story it belongs to
  (`moon-the-alarms`), so that the list sorts by story. `about` is one sentence for the list:
  what the viewer learns, not what the code does.
- **Leaving out:** `video(id, title, { omit: ['moon-the-alarms'] })`, or `--omit a,b` on any
  tool for one run. `omit: ['all']` and `--omit all` leave out every detail. A name that does
  not exist is an error, so a typing mistake cannot silently keep a part in.
- **A second layer:** `v.detail(name, fn, { about, deep: true, within: 'moon-the-alarms' })`.
  `deep: true` marks a deep detail: one of the many that tell everything else the research
  holds. `omit: ['deep']` and `--omit deep` leave out all of them at once. `within` names the
  detail it builds on, declared before it; leaving that one out leaves this one out too. A deep
  detail without `within` leans on the core only and stays when its neighbours go. The names
  `all` and `deep` are reserved. The list then shows the layer of each detail and what it goes
  with. Writing a deep layer from data files, with a helper that places each one:
  `deep-layer.md`, section 3.
- **The list:** `node tools/dump.mjs <id> --details` prints a table of every detail: its
  chapter, where it starts, how many seconds it saves, and its `about`. Save it as
  `notes/<id>/details.md` and put it in the hand-over message.
- **`check` builds the video once more without each detail**, without the deep layer and
  without all details, and reports a detail that cannot be removed, with the reason (a reference to a line that is gone, a shot left with nothing
  said, a word used before its card).

What makes a detail removable:

| Rule | Why |
| --- | --- |
| A detail is whole shots, or whole rows of a shot that keeps at least one line outside the detail. | A shot whose every line is gone has no time to start at. |
| Nothing outside a detail uses a reference to a line inside it, a clip made inside it, a word whose card is inside it, or a person it introduces. | The rest must build and make sense without it. |
| A detail depends only on the core or on itself, never on another detail. | Any combination can be deleted. (A detail may sit inside another, or name one with `within`; it then goes with it.) |
| Music starts and ends on core lines. | A piece tied to a line that is gone has no start. |
| Music is not written for a deep detail, and not split by hand around one. | The engine rests the music while a deep detail is told, so each shorter version keeps the same music over the same story lines. |
| A hedge or an attribution is in the same detail as its fact. | Deleting must not turn "one inquiry estimated" into a flat statement. |
| A detail that tells again, in more depth, what the core just told says so in its first line. | "Now the same week again, day by day." |
| A detail over about a minute starts its own chapter, inside the detail. | The viewer can skip it; the chapter list shows the depth. |

A detail keeps every writing rule: one idea a line, numbers spoken as words, a word card for a
new term, a change on screen with every line or two.

## 13. Recipes

**Numbers spoken as words, captioned as digits, written once.**

```js
// '{nineteen sixty-nine|1969}' is spoken as words and captioned as digits.
const both = (text) =>
  text.includes('{') ? [text.replace(/\{([^|}]*)\|([^}]*)\}/g, '$1'), text.replace(/\{([^|}]*)\|([^}]*)\}/g, '$2')] : [text];
const tell = (text) => {
  const [spoken, caption] = both(text);
  return v.say(spoken, caption ? { caption } : {});
};
tell('On the {sixteenth|16th} of July, {nineteen sixty-nine|1969}, three people left Florida on a rocket.');
```

**A board: many short facts of one kind, with rows that can be deleted.** A timeline, the
people of a story, a list of warnings or findings. Each row has a label, a few words on screen
and one or more spoken lines, and arrives with its first line. A group of rows may be a detail.
The lines are said first and the picture is built from the rows that were said, so a group that
is left out leaves no empty row.

```js
// board(name, heading, parts): one shot with a heading and up to six rows.
//   a part is a row:                     [label, onScreen, line, line, …, { then: 'later words' }?]
//   or a group of rows that is a detail: { detail, about, rows: [row, …] }
let boards = 0;
function board(name, heading, parts) {
  const id = `board${++boards}`;
  v.shot(name);
  const [headBox, body] = take(v.area(), 'top', 110, 20);
  v.add(`${id}Head`, 'text', { text: v.t(heading), role: 'kicker' }, { box: headBox });
  const shown = [];
  const sayRow = (row) => {
    const more = typeof row.at(-1) === 'object' ? row.at(-1) : {};
    const [label, text, ...lines] = typeof row.at(-1) === 'object' ? row.slice(0, -1) : row;
    const refs = lines.map(tell);
    shown.push({ label, text, at: refs[0], then: more.then && { at: refs[1], text: more.then } });
  };
  for (const part of parts) {
    if (Array.isArray(part)) sayRow(part);
    else v.detail(part.detail, () => part.rows.forEach(sayRow), { about: part.about });
  }
  const rowH = Math.min(124, Math.floor(620 / shown.length));
  const size = shown.length > 5 ? 36 : 40;
  const cell = { kind: 'text', h: rowH - 14, align: 'left', opacity: 0 };
  const nodes = shown.flatMap((r, i) => [
    { ...cell, id: `r${i}Label`, x: 50, y: 10 + i * rowH, w: 280, text: r.label, fontSize: size - 4, weight: 800, color: '#4aa3ff' },
    { ...cell, id: `r${i}Text`, x: 354, y: 10 + i * rowH, w: 1216, text: r.text, fontSize: size, weight: 600, color: '#ffffff' },
  ]);
  const sc = v.scene(id, nodes, { box: body, width: 1600, height: 640 });
  shown.forEach((r, i) => {
    sc.show(r.at, [`r${i}Label`, `r${i}Text`]);
    if (r.then) sc.text(r.then.at, `r${i}Text`, r.then.text);
  });
  return sc;
}

board('the landing', 'July 1969: four days to the Moon', [
  ['16 July', 'Lift-off from Florida, three people on board',
    'On the {sixteenth|16th} of July, {nineteen sixty-nine|1969}, three people left Florida on a rocket.'],
  { detail: 'moon-the-alarms', about: 'The computer alarms during the landing, and why the crew carried on', rows: [
    ['20 July, landing', 'Alarm "1202": the computer has too much to do',
      'Minutes before landing, the computer raised an alarm.', 'It meant: too much work at once.',
      { then: 'Alarm "1202": too much work. Ground control: carry on' }],
  ] },
  ['20 July', 'Two of them land on the Moon', 'Four days later, two of them landed on the Moon.'],
]);
```

Rules for a board:

- **At most six rows,** and a row of at most two lines of text at that size. More facts make a
  second board with its own heading.
- **A row with three or more spoken lines changes its words** (`then`), so the screen does not
  sit still while the voice goes on. The new words must still carry the row's main fact: a
  viewer who looks up late sees only the last version.
- **The label is the handle:** a date, an hour, a name, a number in order. The same kind in
  every row of one board.
- **What the voice hedges, the row hedges.** "Reported", "one estimate", "disputed" are part of
  the words on screen.
- Give a long story several boards in time order, each in its own detail and chapter, and keep
  the first board, with the spine of the story, in the core.

**A whole shot as a detail, with its own chapter.**

```js
const detailBoard = (name, about, heading, rows, chapter) =>
  v.detail(name, () => {
    if (chapter) v.chapter(chapter);
    board(name, heading, rows);
  }, { about });
```

**A heading strip over a scene.**

```js
v.shot('parts');
const [headBox, body] = take(v.area(), 'top', 110, 20);
v.add('partsHead', 'text', { text: v.t('The three parts of a flower'), role: 'kicker' }, { box: headBox });
const flower = v.scene('flower', nodes, { box: body, width: 1600, height: 700 });
```

**Build a diagram one part per line.** Create every node at the start with `opacity: 0`, so the
layout is planned as a whole, then show each with its line.

```js
flower.show(v.say('At the bottom is the stem.'), 'stem');
flower.show(v.say('The stem holds up the petals.'), 'petals');
```

**Point at a thing in the middle of a line, then let go.**

```js
const l = v.say('The smallest part, the seed, is in the middle.');
flower.ring(`${l}+35%`, 'seed', { label: 'seed', side: 'right' });
flower.clear(`${l}.end`);
```

**A chart that builds as the numbers are said.**

```js
const c = v.add('rain', 'chart', {
  title: v.t('Rain each season'), labels: [v.t('Spring'), v.t('Summer'), v.t('Autumn')],
  values: [120, 40, 90], suffix: ' mm', shown: 0, source: v.t('Source: city weather office, 2024'),
});
c.cmd(v.say('In spring, 120 millimetres of rain fell.'), 'reveal', { count: 1 }, 0.6);
c.cmd(v.say('In summer, only 40.'), 'reveal', { count: 2 }, 0.6);
const last = v.say('Autumn brought 90.');
c.cmd(last, 'reveal', { count: 3 }, 0.6);
c.cmd(v.say('Summer was the dry season.'), 'highlight', { index: 1 });
```

**A screen recording with pointing and its own sound.**

```js
v.shot('demo');
v.asset('demo', 'assets/demo.mp4');
const film = v.add('film', 'video', { src: 'demo' }, { box: fitIn(v.area(), 1280, 720) });   // the recording is 1280 × 720
v.sfx('demo', film.ref, { volume: 0.4 });               // the film is silent on the stage; this plays its sound
const mark = v.annotate('demoMark');
const open = v.say('Open the menu in the corner.');
mark.tap(open, { clip: 'film', rect: [0.9, 0.02, 0.08, 0.08] });
film.cmd(`${open}.end`, 'pause');                        // hold the picture while explaining
const explain = v.say('This menu lists every saved file.');
film.cmd(`${explain}.end`, 'play');
```

**Code that types itself, with the line under discussion lit.**

```js
const code = v.add('code', 'code', { code: 'total = 0\nfor n in numbers:\n    total += n\nprint(total)', title: 'sum.py', typed: 0 });
code.cmd(v.say('Here is a short program.'), 'type', {}, 2.5);
code.cmd(v.say('The loop visits every number in the list.'), 'highlight', { lines: [2] });
code.cmd(v.say('Each one is added to the total.'), 'highlight', { lines: [3] });
```

**Before and after, side by side.**

```js
v.shot('compare');
const [left, right] = cols(v.area(), 2, 60);
v.add('before', 'image', { src: 'assets/before.png', fit: 'contain' }, { box: left });
const after = v.add('after', 'image', { src: 'assets/after.png', fit: 'contain' }, { box: right, opacity: 0 });
v.say('This is the wall before.');
const l = v.say('And this is the same wall after one coat.');
after.keyframe('opacity', [[l, 0], [`${l}+0.5`, 1]]);
```

**An agenda that returns between parts.**

```js
const parts = [v.t('The trip'), v.t('The leftover hours'), v.t('The fix')];
function agenda(current) {
  v.shot(`agenda ${current + 1}`);
  const list = v.add(null, 'list', { heading: v.t('Three steps'), items: parts, style: 'numbers', shown: 3 }, { box: inset(v.area(), 80) });
  list.cmd(0, 'highlight', { index: current });
}
agenda(0);
v.say('First, the trip around the Sun.');
```

**A background or logo that stays through every shot.**

```js
v.add('bg', 'image', { src: 'assets/paper.jpg' }, { box: 'stage', hold: true, in: 'cut' });
v.add('logo', 'image', { src: 'assets/logo.svg', fit: 'contain' }, { box: { x: 1740, y: 40, w: 140, h: 70 }, hold: true, track: 'overlay' });
```

**Two speakers.**

```js
const v = video('talk', 'A short talk', { speakers: { ana: { voice: { say: { voice: 'Samantha' } } }, ben: { voice: { say: { voice: 'Karen' } } } } });
v.say('What is a tide?', { speaker: 'ana' });
v.say('It is the sea rising and falling, twice a day.', { speaker: 'ben' });
```

**A placeholder for an asset that does not exist yet.** The work continues, and the still shows
clearly what is missing.

```js
v.add('harbourPhoto', 'text', { text: 'PLACEHOLDER\nphoto: a harbour at low tide', role: 'label', bg: '#553300', radius: 16 }, { box: left });
v.mark('note', '@start', 'needs asset: harbour at low tide (photo, landscape)');
```

**A vertical short.** `video(id, title, { size: [1080, 1920] })`, larger text, one thing per
shot, stacked with `rows()` instead of `cols()`. See `visual-design.md`.

**Reuse.** A kit script is a program: write functions for patterns you repeat (a step card, a
labelled picture), loop over data, compute positions. Keep the spoken lines readable in the file,
in order, because people will review and translate them.

## 14. Mistakes the kit or the checker will catch

| Message | Cause |
| --- | --- |
| *two things are called "x"* | Two clips, lines or cards share an id. |
| *shot "x" has no narration, so it has no time to start at* | A shot with clips but no `say()`. Say a line, or `shot(name, { at })`. |
| *term("x", { say }) must come straight after the line it appears with* | Something was said between the line and its card. |
| *nothing is said; give the video a duration* | No `say()` at all and no `duration` option. |
| *unknown reference "@x"* | A reference to an id that does not exist (often a typo, or a clip id used before `add`). |
| *command "x" at … is outside clip "y"* | A command timed before its clip appears or after it has gone (often: the clip belongs to an earlier shot). |
| *"word" is said … before its word card* | The term was used in an earlier line. Move the card or reword the line. |
| *"x" changes … while the word card "y" covers it* | A command lands during a word card. Move it after the card. |
| *nothing is on screen* | A shot ended before the next began (a hand-placed `end`), or a shot has no clips. |
| *no string "…" for "xx"* / *not translated* | A translation is missing. `node tools/i18n.mjs <id> --lang xx`. |
| *two details are called "x"* | Detail names must be unique. |
| *detail "x" says nothing* | A detail with no `say()` inside it. A detail is something the narrator tells. |
| *omit names "x", but there is no detail with that name* | A typing mistake in `omit` or `--omit`. The message lists the names that exist. |
| *detail "x" cannot be left out by itself: …* | Something outside the detail needs it: a reference to one of its lines, a shot with no other line, a word card. Move that thing inside, or give the shot a core line. |
| *nothing changes on screen for … s* | A row or a picture with several lines and no change. Add a `then`, a pointer, or split the row. |

To see exactly what the kit produced, print it: `node -e "import('./videos/<id>.mjs').then(m => console.log(JSON.stringify(m.default, null, 2)))"`.
