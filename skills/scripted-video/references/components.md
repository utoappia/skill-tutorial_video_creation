# Components

A component (the code calls it a **module**) draws one kind of thing: a text, a picture, a chart.
A clip puts one component on screen for a stretch of time, with `props` (how it starts) and
`commands` (how it changes). This file lists the standard components and shows how to write your
own when none of them can draw what the storyboard needs.

Examples use the kit (`authoring-kit.md`). The same props and commands go in a raw script
(`script-format.md`) as `"props": {…}` and `"commands": [{ "at", "name", "args", "duration" }]`.

## Contents

1. Choosing a component
2. `text`
3. `rect`
4. `image`
5. `video`
6. `scene`
7. `annotate`
8. `chart`
9. `code`
10. `list`
11. `term` (the word card)
12. `countdown` (pause and think)
13. Writing your own component
14. Rules for every component

## 1. Choosing a component

| To show | Use |
| --- | --- |
| A heading, a sentence, a number, a quote | `text` |
| A diagram, a process, a mock screen, anything that moves | `scene` |
| A photograph, a drawing, a screenshot | `image` (+ `annotate` to point into it) |
| A screen recording or film clip | `video` (+ `annotate`) |
| Numbers compared | `chart` |
| Code or terminal text | `code` |
| Steps, an agenda, a recap | `list` |
| A new word | `term` |
| A question for the viewer | `countdown` |
| A plain panel or background | `rect` |
| Something none of these can draw | your own (section 13) |

Try `scene` before writing a new component: boxes, circles, lines, texts, pictures and inline
SVG, each movable and pointable, cover most diagrams.

Sizes that are not given are a share of the stage's **short side**, so a video reads the same at
any resolution. Every text shrinks to fit its box (down to half size) rather than being cut off;
the visual review reports text that was shrunk a lot or still does not fit.

## 2. `text`

Words in a box.

| Prop | Meaning |
| --- | --- |
| `text` | The words. `**strong**` is drawn in the accent colour; newlines are kept. |
| `role` | `title`, `subtitle`, `kicker` (small, accent colour, capitals: a running heading), `body` (default), `caption`, `label`, `quote`. Sets size, weight and colour. |
| `size`, `color`, `weight`, `lineHeight`, `italic`, `mono` | Override the role. `size` is in stage units. |
| `align` | `center` (default), `left`, `right`. |
| `valign` | `center` (default), `top`, `bottom`. |
| `bg`, `radius`, `padding` | A filled panel behind the words. |
| `fit` | `false` stops the shrinking (the text may then be cut off; avoid). |

Commands: `setText { text }`, `setStyle { any props }`. Both switch at once. To make a change
visible, prefer a new clip that fades in over swapping the words of an old one.

```js
const head = v.add('head', 'text', { text: v.t('Step 1: measure'), role: 'kicker' }, { box: headBox });
head.cmd(later, 'setText', { text: v.t('Step 2: cut') });
```

Role sizes (share of the short side): title 0.085, subtitle 0.046, kicker 0.034, body 0.042,
caption 0.034, label 0.03, quote 0.05.

## 3. `rect`

A filled box: a panel behind something, a colour wash, a divider.

Props: `fill` (a colour; black if left out), `gradient` (a CSS gradient instead), `radius`,
`borderWidth`, `borderColor`, `shadow` (`true` for a soft one, or a CSS box shadow). Command:
`set { any props }` (switches at once; fade or move a rect with clip keyframes).

```js
v.add('panel', 'rect', { fill: '#1b3354', radius: 28 }, { box: inset(left, -20), in: 'fade' });
```

## 4. `image`

A picture: `.png`, `.jpg`, `.webp`, `.svg`, or a still `.gif`. An animated `.gif` plays by its
own clock, so it will not be in step in an export: turn it into a film (`ffmpeg -i in.gif
-pix_fmt yuv420p -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" out.mp4`) and use `video`.

| Prop | Meaning |
| --- | --- |
| `src` | An asset key (`v.asset('plant', 'assets/plant.svg')`) or a path from the project folder. |
| `fit` | `cover` (default: fill the box, cropping), `contain` (all of it, with bars), `fill` (stretch). |
| `radius` | Rounded corners. |
| `zoom` | `{ scale, x, y }`: start zoomed in about a point (`x`, `y` from 0 to 1 of the picture). |

Commands: `set { src?, fit?, radius? }`; `zoom { scale, x?, y? }` (with a duration it glides: a
slow push-in, or a move to a detail).

```js
const map = v.add('map', 'image', { src: 'assets/map.png', fit: 'contain' });
map.cmd(line, 'zoom', { scale: 2.2, x: 0.7, y: 0.3 }, 1.2);     // go to the harbour
map.cmd(`${line}.end+1`, 'zoom', { scale: 1 }, 1);               // and back
```

The checker reports a missing file; the visual review reports a picture that did not load.

## 5. `video`

A film clip: a screen recording, b-roll, a generated shot. `.mp4` (H.264) and `.webm` are safest.

| Prop | Meaning |
| --- | --- |
| `src` | An asset key or a path. |
| `fit`, `radius` | As for `image`. |
| `from` | Seconds into the file to start at (default 0). |
| `rate` | Playback speed (default 1; `2` for double speed, `0.5` for slow motion). |
| `loop` | Start again when the file ends. |
| `autoplay` | `false` starts paused on the first frame. |

Commands: `play`, `pause`, `seek { to }` (seconds into the file).

- **The clip is silent on the stage.** To hear the file's own sound, add it as a sound at the
  same moment: `v.sfx('demo', film.ref, { volume: 0.4 })`. Pausing the picture does not pause
  that sound, so for a recording with spoken commentary, cut the film into pieces instead.
- Every frame seeks the file, so the export is exact to the frame; the live player looks less
  smooth than the export. Judge motion from the exported file.
- Trim long recordings before using them. A recording that waits ten seconds for a page to load
  should be cut, or played at `rate: 4` through the wait.
- Point into it with `annotate` (section 7).

## 6. `scene`

A drawing made of named **nodes** in its own coordinate space. The general-purpose component.

Props: `nodes` (a list), `width` and `height` (the scene's own units; default the clip's box
size), `background`. The scene is scaled to fit the clip's box, keeping its proportions.

A node:

| Field | Meaning |
| --- | --- |
| `id` | Its name. Needed to change it or point at it. |
| `x`, `y`, `w`, `h` | Its box in scene units (top-left corner and size). |
| `kind` | `box` (default), `text`, `circle`, `image`, `svg`, `line`. Guessed if left out: `src` → image, `svg` → svg, `x2` → line, `text` without `fill` → text. |
| `text` | Words inside it (`**strong**` and newlines work). |
| `fill`, `stroke`, `strokeWidth`, `radius` | Its look. |
| `color`, `fontSize`, `weight`, `align`, `valign`, `padding` | Its words. `fontSize` is in scene units. |
| `opacity`, `scale`, `rotate`, `hidden` | `opacity: 0` for a node that will be shown later. |
| `src`, `fit` | For `image`: an asset key or path. |
| `svg` | For `svg`: inline SVG markup, drawn to fill the node's box. |
| `x2`, `y2`, `arrow`, `dash` | For `line`: the far end; `arrow: true` adds a head; `dash: true` dashes it. |

Later nodes are drawn over earlier ones.

Commands (the kit's scene director wraps each one; see `authoring-kit.md` section 8):

| Command | Args |
| --- | --- |
| `set` | `{ nodes: { id: { fields } \| null }, arc? }`: change nodes, add a new id, or remove with `null`. |
| `point` | `{ target, style?, from?, label?, side? }`: `style` is `spot` (default), `ring`, `arrow` or `finger`. |
| `clear` | Remove the pointing. |
| `tap` | `{ target, from? }`: a fingertip travels to the target and presses. |
| `drag` | `{ node, to }`: a fingertip carries a node to `{ x, y }` or onto another node. |
| `swipe` | `{ from: { x, y }, to: { x, y } }`. |
| `camera` | `{ target, pad? }`, `{ x, y, w, h }` or `{ reset: true }`: zoom the view. |

**What glides and what switches.** With a duration, the numeric fields (`x`, `y`, `w`, `h`, `x2`,
`y2`, `opacity`, `scale`, `rotate`, `fontSize`, `radius`, `strokeWidth`) glide. Everything else
(text, colours, kind) switches when the command starts. So a colour change is instant: to make it
noticeable, cross-fade two nodes, or ring the node as it changes.

```js
const s = v.scene('bank', [
  { id: 'you', x: 100, y: 250, w: 320, h: 200, fill: '#1b3354', radius: 24, text: 'You', fontSize: 56 },
  { id: 'gov', x: 1180, y: 250, w: 320, h: 200, fill: '#1b3354', radius: 24, text: 'Government', fontSize: 56 },
  { id: 'coin', kind: 'circle', x: 210, y: 500, w: 100, h: 100, fill: '#ffcf3f', text: '100', color: '#3a1d00', fontSize: 40, opacity: 0 },
  { id: 'flow', x: 440, y: 350, x2: 1160, y2: 350, arrow: true, stroke: '#ffffff', strokeWidth: 6, opacity: 0 },
], { width: 1600, height: 700 });

const lend = v.say('You lend the government one hundred coins.');
s.show(lend, ['coin', 'flow']);
s.move(`${lend}+40%`, 'coin', { x: 1290, y: 500 }, 1.2, { arc: 120 });
```

The checker reports a command that names a node that is not there, a node without a size, and a
`show` on a node that was never created.

## 7. `annotate`

Pointing drawn over the whole stage, on top of the other clips: for pictures, recordings, charts
and texts, which cannot point at themselves. No props. In the kit, `v.annotate(id)`.

| Command | Args |
| --- | --- |
| `point` | `{ target, style?, from?, label?, side? }`: `spot`, `ring`, `arrow` (`from`: above, below, left, right) or `finger`. |
| `tap` | `{ target, from? }`. |
| `label` | `{ target, text, side?, key? }`: a label that stays. `key` names it for `unlabel`. |
| `unlabel` | `{ key? }`: remove one label, or all. |
| `clear` | Remove the pointing and every label. |

A target is `"clipId"`, a box `{ x, y, w, h }` in stage units, a part of a clip
`{ clip: "clipId", rect: [x, y, w, h] }` with fractions of the clip's box, or a list of these (the
ring style draws one ring for each).

To find the fractions for a spot inside a picture: open the picture in any viewer, read the pixel
position of the spot, and divide by the picture's width and height. Give the clip a box with the
picture's proportions (the kit's `fitIn(box, width, height)` makes one) so fractions of the box are
fractions of the picture. Then check the still.

In a raw script, put the annotate clip on the last visual track so it is on top.

## 8. `chart`

A bar or line chart that can build itself while the voice gives the numbers.

| Prop | Meaning |
| --- | --- |
| `type` | `bar` (default) or `line`. |
| `title` | A heading. State the point, not the topic: "Summer is the dry season". |
| `labels` | The names along the bottom. |
| `values` | One number per label. |
| `series` | Instead of `values`, for grouped bars or several lines: `[{ name, values, color? }]`. |
| `min`, `max` | The scale. Bars start at 0 unless `min` is given; do not cut a bar chart's axis. |
| `prefix`, `suffix`, `decimals` | How values are written: `suffix: ' mm'`, `prefix: '$'`. |
| `shown` | How many points are drawn at the start (default all). Use `0` and `reveal`. |
| `highlight` | Index of the one point to colour (from 0). |
| `source` | A short credit under the chart: "Source: …, 2024". Always give one for real data. |
| `colors` | Series colours, instead of the theme's. |

Commands: `reveal { count? }` (bars grow, lines draw on, over the duration), `highlight { index }`
(`null` to undo), `setValues { values }` or `{ series }` (numbers glide).

Keep to seven bars or fewer and one or two series. A chart makes one point: highlight the bar
that carries it. If the viewer must compare exact numbers, use a table drawn with `scene` instead.

## 9. `code`

A block of code or terminal text.

Props: `code`, `title` (a file name or a prompt), `size`, `numbers` (line numbers; default
`true`), `highlight` (line numbers lit at the start), `typed` (characters showing at the start;
default all).

Commands: `type` (the text types itself over the command's duration), `highlight { lines }`
(numbered from 1; `null` to undo), `setCode { code }`.

About ten short lines is what a viewer can read. Show the lines being discussed, not the file;
light the one line being talked about. Type at a speed the eye can follow: roughly one second per
short line.

## 10. `list`

A heading and points that arrive one at a time: an agenda, steps, a recap.

Props: `items` (a list of texts), `heading`, `style` (`bullets` default, `numbers`, `checks`),
`shown` (how many are visible at the start; default 0), `size`.

Commands: `show { count }`, `next`, `highlight { index }` (dims the others; `null` to undo).

The text size is fitted to the whole list at once, so points do not jump as later ones arrive.
Three to five points. Each point is a few words; the voice says the sentence. The kit's
`v.recap()` builds a list with one spoken line per point.

## 11. `term` (the word card)

The new word, large, in the middle of the stage, with its meaning; everything behind it dims.

Props: `word`, `meaning`, `example` (a smaller line under the meaning), `sounds` (how to say it:
`"say: OR-bit"`). No commands. It pops in when the clip starts and fades as it ends.

Use the kit's `v.term()`, which also places it on the top track, times it to the line, keeps it
up long enough to read, and holds the next line until it has gone. See `writing-for-everyone.md`
section 5 for when a word needs a card and how to word the meaning.

## 12. `countdown` (the quick quiz: pause and think)

A small heading, a question, an optional hint, and a ring that counts down the thinking time.

Props: `question`, `label` (the small heading above it, such as "Quick quiz"), `hint`, `seconds`
(the thinking time: the ring stays full until the last `seconds` of the clip, then drains;
default the clip's whole length), `shade` (0 to 1: how much to hide what is behind it). No
commands.

**The question is always read aloud.** Use the kit's `v.think()`, which has the narrator say
that a question is coming, read the question as the card appears, and stay silent while the
ring counts down. If you place the clip by hand (in a JSON script), keep the same three parts:

```json
{ "id": "quiz-intro", "text": "Here is a quick quiz." },
{ "id": "quiz-ask", "text": "After four years, how many hours is that?" }
```

```json
{ "id": "quiz", "module": "countdown", "start": "@quiz-ask", "end": "@quiz-ask.end+4",
  "props": { "label": "Quick quiz", "question": "After four years, how many hours is that?", "seconds": 4, "shade": 1 } }
```

and give the line after it a `start` of `@quiz.end+0.3`, so that the answer waits for the card to
go. The checker reports an error when no narration line starts with the card (*the question is
not read aloud*), and warns when a line is spoken during the thinking time.

## 13. Writing your own component

Write one when the storyboard needs a picture that a `scene` cannot draw or would draw clumsily:
a clock face, a number line, a map with a route, a piano keyboard, a board for a game, a dial.
Build the component for the **idea**, with commands named for what happens in the lesson
(`setTime`, `jumpTo`, `press`), and it stays readable in the script.

A component is one object in its own file under `modules/`:

```js
// modules/meter.js — a labelled bar that fills.  props { label, value?, max?, unit? }   command: fill { value }
import { lerp } from '../engine/easing.js';
import { el, fitBox, px, richText, set } from '../engine/modules/dom.js';

export default {
  type: 'meter',
  commands: ['fill'],

  // Problems with the props, as a list of sentences. Shown by `check` with the clip's path.
  validateProps: (p) => (typeof p.label === 'string' ? [] : ['a meter needs "label"']),

  // The starting state: plain data, worked out from the props.
  init: (props) => ({ label: props.label, value: props.value ?? 0, max: props.max ?? 100, unit: props.unit ?? '' }),

  // Problems with one command, given the state just before it.
  validateCommand: (state, cmd) =>
    typeof cmd.args.value === 'number' && cmd.args.value >= 0 && cmd.args.value <= state.max ? [] : [`fill needs { value } from 0 to ${state.max}`],

  // The state after a command. Pure: return a new object, never change the old one.
  apply: (state, cmd) => ({ ...state, value: cmd.args.value }),

  // The picture. Build the elements once; `update` sets everything from the frame, every time.
  mount(host, env) {
    const theme = env.theme;
    const labelBox = el('div', { position: 'absolute', left: '0', top: '0', width: '100%', height: '45%' }, host);
    const label = fitBox(labelBox);
    const track = el('div', { position: 'absolute', left: '0', top: '55%', width: '100%', height: '30%', background: 'rgba(255,255,255,0.14)', overflow: 'hidden' }, host);
    const bar = el('div', { position: 'absolute', left: '0', top: '0', height: '100%', background: theme.accent }, track);
    return {
      update(layer) {
        const s = layer.state;
        // While a command is running, glide from the state before it to the state after it.
        let value = s.value;
        for (const a of layer.active) value = lerp(a.from.value, a.to.value, a.progress);
        const short = Math.min(env.stage.width, env.stage.height);
        set(label.inner, { color: theme.ink, fontFamily: theme.font, fontWeight: '700', textAlign: 'left' });
        const shown = `${richText(s.label, theme.accent)}: ${Math.round(value)}${s.unit}`;
        label.write(shown, short * 0.05, [shown, layer.box.w, layer.box.h].join('|'));
        set(track, { borderRadius: px(layer.box.h * 0.15) });
        set(bar, { width: `${((value / s.max) * 100).toFixed(2)}%` });
      },
    };
  },
};
```

Register it in `modules/index.js`:

```js
import { standardModules } from '../engine/modules/index.js';
import meter from './meter.js';

export default [...standardModules, meter];
```

Use it like any other:

```js
const m = v.add('battery', 'meter', { label: v.t('Battery'), unit: '%' }, { box: { x: 360, y: 400, w: 1200, h: 220 } });
m.cmd(v.say('After one hour of charging, the battery is half full.'), 'fill', { value: 50 }, 1.5);
```

**The parts.**

| Part | When it runs | What it does |
| --- | --- | --- |
| `type` | | The name used in scripts. |
| `commands` | | The command names it accepts. Anything else is an error. |
| `validateProps(props, ctx)` | `check`, compile | Returns a list of problems (empty when fine). |
| `init(props, ctx)` | compile | Returns the starting state. |
| `validateCommand(state, cmd, ctx)` | compile | Returns a list of problems with this command at this point. |
| `apply(state, cmd, ctx)` | compile | Returns the state after the command. |
| `audit(state, layer)` | `check` | Optional. Problems with a state as a whole (two things in one place, a label with no room). Run on the starting state and after every command. |
| `mount(host, env)` | in the browser | Builds elements inside `host` (already sized to the clip's box) and returns `{ update(layer, frame) }`. |

- `cmd` is `{ id, name, args, start, end, duration, time, ease }`.
- `ctx` is `{ stage, language, assets, box, start, end, clipBox(id) }`: the stage, the clip's own
  box and life, and the boxes of other clips.
- `env` is `{ stage, theme, language, asset(src), wait(promise), clipBox(id) }`. `env.asset(src)`
  turns an asset key or path into a URL. Pass any promise the picture depends on (an image
  loading) to `env.wait()`, and stills and exports will wait for it.
- `layer` in `update` has `state` (after every command that has started), `active` (the commands
  running right now: `{ command, from, to, linear, progress }`, with `progress` already eased),
  `box`, `localTime` (seconds since the clip appeared), `start`, `end`, `props`.

**The rules that make export work.**

1. **The picture is a pure function of the frame.** No CSS transitions, no CSS animations, no
   timers, no `Date.now()`, no random numbers. Motion comes from `layer.active[].progress` and
   `layer.localTime`. The exporter jumps to each frame in turn, and the reviewer jumps to any
   moment: both must get exactly the picture that playing would show.
2. **`init`, `apply` and the validators are pure and never touch the page.** They run in Node.
   The file must import cleanly there: no `document` or `window` outside `mount`.
3. **Validate hard.** Every mistake a script could make (a missing prop, an index out of range, a
   target that is not there) should come back from `validateProps` or `validateCommand` as a
   sentence that says what is wrong and what is allowed. An agent fixes what `check` reports; it
   cannot fix what silently draws nothing.
4. **Put text in a `fitBox`.** It shrinks to fit, and the page audit can then see cut-off, tiny
   and off-stage text. Text inside an `<svg>` is audited for size and position too.
5. **Sizes from the box and the stage,** never fixed pixel numbers: `layer.box.h * 0.3`,
   `Math.min(env.stage.width, env.stage.height) * 0.05`.
6. **Colours and fonts from `env.theme`** (`ink`, `dim`, `accent`, `accentInk`, `card`, `good`,
   `bad`, `font`, `mono`), so the component matches the rest and follows a change of theme. Keep
   the accent colour for "look here".
7. **Texts arrive already translated** in `props` and `args`. Do not hard-code words in a
   component; take them as props.
8. **Changes should be visible.** If a command changes a value, glide it, or mark it, so the
   viewer notices (`teaching-techniques.md` section 3).

Helpers in `engine/modules/dom.js`: `el(tag, style, parent)`, `set(node, style)` (writes only
what changed), `px(n)`, `fill` (a style that fills the parent), `richText(text, accent)` (escapes
and handles `**strong**`), `fitBox(parent)` → `{ box, inner, write(html, size, key) }` (the `key`
must change whenever the text or the room changes). In `engine/easing.js`: `lerp`, `clamp01`,
`pop`, `easing(name)`.

Read `engine/modules/cards.js` (three short components) before writing one, and
`engine/modules/scene.js` for one with pointing built in. After writing: `node tools/check.mjs`,
then stills at the moments just before, during and after each command.

## 14. Rules for every component

- One clip, one job. Two ideas are two clips.
- Name the clips and nodes you will point at; names appear in error messages and in the dump.
- Start with everything the shot will contain already laid out (hidden parts at `opacity: 0`),
  so nothing has to move aside when a later part arrives.
- Keep content inside `v.area()`; the bottom of the stage belongs to the captions.
- After any change to props or boxes, look at a still. A component that passes `check` can still
  look wrong.
