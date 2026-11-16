# Visual design

How to lay out a shot so that it is readable on a phone, the eye goes where the voice is, and
nothing collides with the captions. The numbers here are the ones the checker and the page audit
measure against.

## Contents

1. The stage and the safe area
2. Layout
3. Text
4. Colour
5. Pointing
6. Motion
7. Charts, pictures and recordings
8. Vertical and square video
9. A house style
10. Before you look at the stills

## 1. The stage and the safe area

The stage is 1920 × 1080 units by default. Everything is placed in stage units and scaled on
export, so the same script gives 720p, 1080p or 4K.

```
┌──────────────────────────────────────────────┐
│  margin: 6% of the short side                │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │        v.area()                        │  │
│  │        everything goes in here         │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│  caption band: the bottom 17% of the height  │
└──────────────────────────────────────────────┘
```

- **`v.area()`** is the box inside the margins and above the caption band: on a 1920 × 1080 stage
  about 1790 × 832. Derive every box from it with `take`, `cols`, `rows`, `inset`, `fitIn`.
- **The caption band belongs to the captions.** The page audit reports any text a caption
  covers. Use `v.area({ captions: false })` only when the video is exported without captions in
  the picture (`--clean`) and will never be shown with them.
- **Backgrounds and film** may fill the whole stage (`box: 'stage'`); words and anything pointed
  at stay in the area.
- Video sites cover parts of the picture with their own controls: the bottom edge and the top
  corners on a wide video, more on a vertical one (section 8). The margins allow for the wide
  case.

## 2. Layout

- **One thing per shot.** If a shot has two subjects, the viewer picks one, and it may be the
  wrong one.
- **Plan the whole shot at once.** Lay out every element the shot will contain, including those
  that appear later (create them with `opacity: 0`). Then nothing has to move aside when
  something arrives, and nothing jumps.
- **A steady frame.** Keep a small heading strip at the top (a `kicker`), the picture in the
  middle, and the captions at the bottom, shot after shot. The viewer learns the frame once.
- **The same thing in the same place.** If the Sun is on the left in shot 2, it is on the left in
  shot 7. If "before" is on the left once, it is on the left always.
- **Reading order.** In left-to-right languages the eye starts top-left. Put causes left and
  effects right, earlier left and later right, the question above and the answer below. Mirror
  the layout for right-to-left languages.
- **Group by nearness.** Things that belong together sit close; things that differ are apart.
  Space does the work of boxes and lines.
- **Leave room.** A shot that fills every corner has no place for the eye to rest and no room
  for a longer translation. Aim to leave a quarter of the area empty.
- **Align.** Edges that nearly line up look like mistakes. `cols` and `rows` give boxes that do.
- **Labels on the thing,** not in a legend.

## 3. Text

Sizes are a share of the stage's **short side** (1080 on the default stage), so they hold for any
shape.

| Role | Share | On 1080 | Use |
| --- | --- | --- | --- |
| `title` | 8.5% | 92 | The opening and chapter headings |
| `quote` | 5% | 54 | A quotation |
| `subtitle` | 4.6% | 50 | Under a title |
| `body` | 4.2% | 45 | A sentence on screen |
| captions | 3.8% | 41 | Set by the stage |
| `kicker`, `caption` | 3.4% | 37 | Running heading; a credit |
| `label` | 3% | 32 | A label on a diagram |
| **smallest allowed** | **2.2%** | **24** | The page audit warns below this |

- **Test at phone size.** Most viewing is on a phone held upright, where a wide video is about
  7 cm across. The contact sheets from `stills` show each frame small: if you cannot read a text
  on the sheet, a phone viewer cannot read it in the video.
- **Few words.** A heading: up to about six. A label: one to three. A sentence on screen: one,
  and only when the voice is saying the same thing or nothing.
- **Text shrinks to fit its box** rather than being cut off. A text shrunk below 75% is reported:
  shorten it or give it a larger box. Do not rely on shrinking to make a layout work.
- **Line length.** Up to about 40 characters a line for body text; break headings by meaning
  (`\n`), not wherever they happen to wrap.
- **One font family,** two weights. The default is the system's own sans-serif, which is always
  available and covers most scripts. To use another, give `fonts` with files in the project (and
  check the licence); the audit reports a font that fails to load.
- **Sentence case.** Whole words in capitals only in the `kicker`.
- **Numbers** that are compared line up: same size, same number of decimals, units stated.
- **In a `scene`,** `fontSize` is in scene units and the scene is scaled into its box. For a
  scene 1600 wide in a box about 1790 wide the scale is near 1; for a small box, raise the
  `fontSize` to compensate. The audit measures the size as seen.

## 4. Colour

The default theme is dark, because bright text on a dark ground survives small screens, poor
projectors and video compression.

| Name | Default | Used for |
| --- | --- | --- |
| stage background | `#0b1626` | Behind everything |
| `ink` | `#ffffff` | Text |
| `dim` | white at 72% | Secondary text |
| `accent` | `#ffcf3f` | **"Look here":** pointing, the `**strong**` word, the highlighted bar |
| `accentInk` | `#3a1d00` | Text on the accent colour |
| `card` | `#1b3354` | Panels: word cards, chart and code backgrounds |
| `good`, `bad` | `#3ddc97`, `#ff6b6b` | Right and wrong, up and down |

Change them with the `theme` option: `video(id, title, { background: '#fdf6e3', theme: { ink: '#1b1b1b', dim: 'rgba(0,0,0,0.65)', card: '#ffffff', accent: '#c2410c', accentInk: '#ffffff' } })`.

- **Contrast of at least 4.5 to 1** between text and what is behind it. The checker measures
  ink on background, ink on card, and the accent on both, and warns below that.
- **The accent means one thing.** If gold marks "look here", nothing else on screen is gold: not
  a decoration, not a category in a chart, not a logo. The viewer learns in the first minute that
  gold is where to look; every other use teaches them to ignore it.
- **Few colours.** Background, ink, accent, and at most two or three more that each stand for
  something throughout the video (the Sun is always yellow; costs are always red).
- **Never colour alone.** About one viewer in twelve cannot tell some colours apart, most often
  red from green. Pair colour with a word, a shape, a position or a mark (✓ and ✗, "before" and
  "after").
- **Text over a picture** needs a panel behind it (`bg` on a `text`, or a `rect`), or the picture
  dimmed (`opacity` keyframes to about 0.3).
- **Light themes** are right for print-like subjects and bright rooms. Check the pointing still
  shows: marks have a dark edge so they read on both.

## 5. Pointing

See `teaching-techniques.md` section 3 for when to point. For how it looks:

- **One mark at a time.** A second ring replaces the first.
- **The mark arrives with the word** and leaves when the voice moves on (`clear`). A ring left
  on screen for three more lines points at nothing.
- **Leave room around targets.** A ring is drawn a little outside its target and a label beside
  it. Targets pressed against the edge of the area give labels that run off the stage (the audit
  reports it): move the target, or choose the label's `side`.
- **A spotlight dims everything else.** Use it when the picture is busy. Do not spotlight during
  a line that also talks about something outside the spot.
- **A camera move** (zooming a scene to a node) is for detail that is too small at full view.
  Zoom in, talk, zoom back out; do not cut between zoom levels.
- **A fingertip** is for what a hand does on a screen: tap, drag, swipe. On a diagram, use a ring
  or an arrow.

## 6. Motion

Motion is a signal. The eye goes to whatever moves, so every movement must be the thing the
voice is talking about.

- **Appearing is the main motion.** Most shots need nothing more than things fading in as they
  are named. That is what the default `in: 'fade'` does.
- **Move things to show a change in the idea:** a coin goes from one box to another; a bar grows;
  the Earth goes round. Do not move things for decoration.
- **Durations.** Fades and small moves 0.3 to 0.6 seconds. A journey across the stage 0.8 to 1.5.
  A slow push-in on a picture, the length of the line. Under 0.2 looks like a glitch; over 2
  holds up the voice.
- **Easing.** `inOut` (the default) for things that travel; `out` for things that arrive;
  `outBack` or `pop` sparingly, for something landing or a point being made; `linear` only for
  steady things (a clock hand, a slow zoom).
- **One movement at a time.** Two things moving at once split attention. Stagger them with a
  reference to the first command's end.
- **Transitions between shots:** a fade for nearly everything. A slide when the next shot is the
  "next page" of the same thing. A cut for a deliberate jolt. Do not mix many kinds.
- **No constant motion:** no drifting backgrounds, no looping decoration. Besides distracting,
  it makes every frame different, which makes exports slow and files large.
- **Nothing flashes.** Never more than three flashes a second; it can cause seizures.
- **Hold still under a word card and a pause.** A quiz card hides the picture behind it, so that
  nothing there can give the answer away.
- **The first and last frames are stills** worth looking at: the first is the thumbnail a player
  shows before play, the last sits under the end screen. Anything that fades or slides in at
  0:00 leaves the first frame empty: let the opening clip arrive with `in: 'cut'`
  (`v.title(text, subtitle, { in: 'cut' })`).

## 7. Charts, pictures and recordings

**Charts.** One chart makes one point. Title it with the point. Highlight the bar or line that
carries it. At most seven bars, two or three lines. Start bar charts at zero. Label values
directly; state units; give a `source`. Build it as the numbers are said.

**Pictures.** Use a picture when the viewer needs to see what a real thing looks like. Crop to
the subject. Prefer a few large pictures to many small ones. Keep one style through a video:
do not mix photographs, flat drawings and 3D renders unless the difference means something.
`fit: 'contain'` shows the whole picture; `fit: 'cover'` fills the box and crops, so check what
was cropped.

**Screen recordings.** Record at the stage's proportions, at a large interface size (zoom the
application in before recording: 125 to 150%), with a clean window: no bookmarks bar, no
notifications, no personal information, no real customer data. Small interface text is the
commonest failure: zoom the clip to the area being discussed (`camera` on a scene, or the
`image`/`video` clip's `scale` keyframes) and ring the control. Cut waiting.

**Generated pictures and film.** Check them for wrong details (extra fingers, garbled lettering,
impossible machines) and for anything that states a false fact. A generated picture of a real
place, person or event is a claim; see `voice-and-assets.md`.

## 8. Vertical and square video

`video(id, title, { size: [1080, 1920] })`. For a second shape of an existing video, use a layout
(`localization.md`).

- The short side is still 1080, so text roles keep their size, but a line holds half as many
  words. Shorten on-screen texts; break headings by hand.
- **Stack, do not sit side by side:** `rows()` in place of `cols()`.
- **One element per shot,** large. A diagram that works wide may need to be split into two shots.
- **Keep clear of the platform's own controls:** roughly the top 10 to 15% (account name, search)
  and the bottom 20 to 25% (description, buttons), and the right-hand edge where buttons sit.
  Captions are drawn in the band `v.area()` leaves free at the bottom; for a feed that covers the
  bottom, raise them: `caption: { bottom: 420 }`, and keep content above with a larger margin.
- **Pace is quicker** and the promise smaller: one idea, 20 to 60 seconds, the point in the first
  two seconds.
- Square (`[1080, 1080]`) sits between the two; treat it like a narrow wide video.

## 9. A house style

For a series, fix these once and reuse them, in a small shared file that every video imports:

```js
// videos/_style.mjs  (files starting with "_" are not treated as videos)
import { video } from '../engine/kit.js';

export const brand = {
  background: '#0b1626',
  theme: { accent: '#ffcf3f', card: '#1b3354' },
  voice: { rate: 0.95 },
};
export const lesson = (id, title, options = {}) => video(id, title, { ...brand, ...options });
```

Also decide: the heading strip, the chapter title look, how a recap looks, the music (if any),
the opening two seconds and the closing shot. A viewer of the third video should recognise the
frame from the first.

## 10. Before you look at the stills

A quick self-check of a shot, from the script alone:

- Is everything derived from `v.area()`?
- Is there one subject?
- Does each thing named by the voice get marked as it is named?
- Is the accent colour used only for that?
- Is every text a few words, at a role size?
- Does anything move that the voice is not talking about?

Then look. The stills decide; see `visual-review.md`.
