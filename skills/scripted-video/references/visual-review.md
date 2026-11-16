# Visual review

Look at the video itself, not the script. A script that passes every check can still put a label
on top of another, leave a ring beside its target, or show the answer while asking the question.
Only looking finds those.

There are three passes: **stills** while you are still writing, **the exported file** once the
voice is recorded, and **every language and layout** you will publish. Write what you saw in
`notes/<id>/review/visual.md`.

## Contents

1. What you need
2. Pass 1: stills
3. Looking closer
4. Pass 2: the exported file
5. Pass 3: languages and layouts
6. What to look for
7. Sound
8. What the page audit can and cannot see
9. If you cannot look
10. Done

## 1. What you need

- A Chrome, Edge or Chromium browser on the machine (it is run without a window). Stills need
  nothing else.
- `ffmpeg` for the export and for `frames`.
- A way to look at pictures. If you are an agent, open the `.jpg` files with your file-reading
  tool: they are made for that. If you cannot view pictures at all, see section 9.

## 2. Pass 1: stills

```
node tools/stills.mjs <id>
```

This writes to `out/stills/<id>/`:

| File | What it is |
| --- | --- |
| `sheet-01.jpg`, `sheet-02.jpg`, … | Contact sheets: nine stills each, in order, each labelled with its time and line. **Open every one.** |
| `NNN-0m04.2-<label>.jpg` | The single stills, for a closer look. |
| `index.txt` | Which still is which: number, time, line, what is being said. |
| `audit.txt` | What the page audit found, with the time of each problem. |

By default there is one still for each spoken line, taken near the end of the line when
everything the line brings in has arrived, plus one for each word card and one for each quiz
card (taken half-way through its thinking time), and the first and last frames. The audit also looks just after every clip arrives and every command lands, so
it covers moments the stills do not show.

How to go through them:

1. **Read `audit.txt` first** and fix every error: text cut off, text off the stage, a picture
   that did not load, a caption covering text. Then the warnings: text shrunk a long way, text
   too small, a caption over two lines.
2. **Open each sheet.** For each still, read the line being said (it is in `index.txt` and in the
   caption) and ask: *is the thing being talked about the thing my eye went to?* Write down any
   still where it was not.
3. **Go through the checklist** in section 6.
4. **Fix, run `stills` again, look again.** A fix for one still often moves something in
   another. Stills take seconds; run them after every change of layout.

**A long video: one picture per shot first.** A video of an hour has hundreds of stills and
dozens of sheets. Start with

```
node tools/stills.mjs <id> --shots
```

which writes one still for each shot, taken at the end of the shot's last line, when the shot
is at its fullest, into `out/stills/<id>.shots/`. Every layout of the video is then on a few
sheets: a row of text that runs to three lines, a board with one row too many and a heading
that wraps show at once. Fix the layouts, then run the full set for the audit and for the
changes inside each shot, and open at least the sheets of every chapter that is new or changed.
`--from` and `--to` limit either run to a stretch of the video, and `--omit all` shows the core
alone: look at it too, because a board with half its rows gone is laid out afresh.

For a row whose words change while it is on screen, look at the last still of the shot and ask
whether the row still says its main fact.

The sheets are also the phone test. Each still on a sheet is about as large as the video on a
phone held upright. Text you cannot read on the sheet is too small.

The command exits with code 1 when the audit finds errors, so it can be used in a script.

## 3. Looking closer

```
node tools/stills.mjs <id> --at 12.5,@n7,@n7.end      exact moments, full size
node tools/stills.mjs <id> --every 0.5 --from 10 --to 16      a stretch, twice a second
node tools/stills.mjs <id> --audit                    the audit alone, no pictures
node tools/stills.mjs <id> --no-captions              the picture without captions
node tools/stills.mjs <id> --scale 1 --png            full size, lossless
node tools/stills.mjs <id> --voice elevenlabs         timed to one particular recording
```

- **`--at`** takes seconds, timecodes and time references (`@line`, `@line.end`, `@clip+0.5`).
  Use it for the moment something lands. `--at` and `--every` write to `out/stills/<id>.closer/`
  (replaced each time), so the line-by-line sheets in `out/stills/<id>/` stay as they were.
- **`--every` with `--from` and `--to`** shows movement: a transition, a camera move, a bar
  growing. Look for things that cross each other, pass under the captions, or leave the stage on
  the way.
- **The live player** shows it moving: `node tools/serve.mjs`, then open the address it prints.
  Space plays, the arrow keys step a frame (with shift, a second), `[` and `]` jump between
  lines, `A` audits the frame on screen, `R` reloads after you change the script. Add `?t=42` to
  the address to open at a time. A person can use it directly; an agent with a browser tool can
  too, but stills are quicker to read.

## 4. Pass 2: the exported file

Stills show the page. The exported file is what viewers get, with the real voice and its real
timing, the sound mix and the encoding. Review it once the voice is recorded (`tts`), because
recorded lines are never exactly as long as the estimate and everything is timed from them.

```
node tools/export.mjs <id> --preview          a quick half-size file, to check timing
node tools/export.mjs <id>                    the real one
node tools/frames.mjs out/<id>.mp4            contact sheets from the file itself, and a sound report
```

1. **Read the export's own report.** It ends with one line per file: `✓` (fine), `!`
   (warnings), `✗` (errors), with the length, size, frame rate and what sound went in. It also
   runs the page audit on every half second of changed picture and lists what it found. Notes to
   act on: lines left silent because the recording is stale; a sound file that was missing; the
   mix turned down because it would have clipped; a chapter under 10 seconds.
2. **`frames`** takes pictures out of the finished file: by default one every few seconds (about
   96 in all), twelve to a sheet, in `out/frames/<name>/`, with `index.txt` saying which sheet,
   row and column is which time. Open every sheet.
3. **Look closer where things move:**

   ```
   node tools/frames.mjs out/<id>.mp4 --every 1                  one a second
   node tools/frames.mjs out/<id>.mp4 --from 12 --to 16 --all    every single frame of four seconds
   node tools/frames.mjs out/<id>.mp4 --at 14.2                  one frame, full size
   ```

   Every frame of a whole video is thousands of pictures; use `--all` on the few seconds around
   each transition, camera move and word card instead. Look for a flash of the wrong thing on
   the first frame of a shot, a frame where two shots are both half visible in an ugly way, text
   that reflows as it fades in, and marks that arrive before or after their target.
4. **Check the timing against the voice.** In `index.txt` each frame has its time; `node
   tools/dump.mjs <id> --voice <provider>` gives the time of each line. At the time a thing is
   named, is it on screen and marked? A mark that lands a second late looks like a mistake.
5. **Read the sound report** (section 7).
6. **Watch it once at normal speed, if anyone can.** A person watching catches pace, rhythm and
   boredom that no still shows. If you are an agent, ask the user to watch the preview file and
   say where their attention dropped or where they had to rewind.

## 5. Pass 3: languages and layouts

Every language and every layout is a different picture: translated text is often a third longer,
and a vertical stage is half as wide.

```
node tools/stills.mjs <id> --lang es
node tools/stills.mjs <id> --layout vertical
node tools/stills.mjs <id> --lang es --layout vertical
```

Look at every sheet of every combination you will publish. The usual findings: a heading that
now wraps to three lines, a label that shrank, a caption that takes three lines, a ring that no
longer sits on its target because the target moved in the layout. See `localization.md`.

## 6. What to look for

Go through this list on every pass. It is the same list as in the notes template.

| Check | How to tell |
| --- | --- |
| No text is cut off, outside its box, or over other text | Read every text on every still to its last letter. |
| Nothing sits under the caption band | The lowest element ends above the caption. |
| Every picture, icon and font loaded | No empty boxes; letters look like the intended font. |
| The smallest text can be read on a phone | Read it on the contact sheet. |
| The eye goes to what is being talked about | Glance at the still, then read the line. Same thing? |
| Rings, arrows and labels sit exactly on their targets | In every layout and language. |
| Nothing jumps | Compare neighbouring stills: nothing changes size or place when something else appears. |
| No frame is empty; no picture is unchanged for over 20 seconds | Scan the sheet for blank or repeated stills. |
| Each word card is readable and stays long enough to read twice | The card's still, and its length in `dump`. |
| The answer is not visible while the question is asked | The still at each pause. |
| Each question is read aloud | The still taken while the question is spoken shows its caption under the card; the ring is still full. `--at "@think1-ask+50%"`. |
| The first and last frames look intended | They become the thumbnail and sit under the end screen. |
| Captions match the voice and appear with it | Caption text against the line in `index.txt`. |
| Pictures say nothing false | Sizes, order, direction, proportions, chart bars against their numbers. |
| The look is consistent | Same colours, sizes and positions for the same things from shot to shot. |

Write each finding with its time, what you saw, and the fix. "Looks fine" is not a finding;
"looked at 31 stills on 4 sheets and 12 close-ups; two labels overlapped at 0:42, fixed" is.

## 7. Sound

`frames` prints a sound report for the file:

| It says | Meaning | Do |
| --- | --- | --- |
| mean and peak level in dB | Typical speech sits around −24 to −16 dB mean, with peaks below −1 dB. | Nothing, if it is in that range. |
| "may be clipping" | The peak is at the top; loud parts are distorted. | Lower the music or effect `volume`. |
| "very quiet" | Mean below −35 dB. | Raise volumes; check the voice was recorded. |
| silences over 4 seconds, with their times | Nothing is heard for that long. | Fine for the thinking time of a pause-and-think, which starts after the question has been read. If the silence starts when the question card appears, the question was not voiced: record it. Anywhere else, a line is missing or stale. |

**Music.** The export (not `frames`) prints one line for each music clip:

```
· music assets/<id>/story.m4a, 7:32.6 to 9:07.1 (16% of the video): the voice is 19.0 dB above the
  music while someone speaks; the music alone, between lines, is -36.8 dB
```

| Read | Good | Otherwise |
| --- | --- | --- |
| Where it plays | The story part you planned, and nothing else. No word card, quiz or teaching line inside it (compare the times with `dump --chapters` and the stills' times). | Fix `start` and `end`. |
| Its share of the video | Under about a quarter for a video that teaches. | Shorten it; music under everything is a mistake here. |
| Voice above the music | 15 to 22 dB. | Under 12: lower `volume`. Over 24: it can hardly be heard; raise `volume` or drop the music. |
| The music alone | About −40 to −30 dB. | Much louder: it will jump out between lines. |

Copy that line and the `frames` levels into `review/visual.md` under "Sound", with the list of
event sounds and how often each plays. If nobody has listened, write "measured, not heard".

What a report cannot tell you, and a listener can: a mispronounced word (fix with
`v.pronounce`), an odd stress, music that fights the voice or has the wrong mood, an effect
that startles or sounds cheap, a last word cut short. If you cannot listen, say so in the
review and ask the user to listen to the file once, with these five things to listen for and
the times of the music and of one of each event sound.

## 8. What the page audit can and cannot see

The audit measures the page; it does not understand it.

| It finds | It cannot find |
| --- | --- |
| Text cut off by its box | Text that is complete but says the wrong thing |
| Text shrunk a long way to fit | Two elements overlapping each other outside a scene, or a ring or label over text |
| Text or labels off the stage | A ring that is beside its target |
| In a scene: a solid node drawn over a node's text (`check`) | |
| Text smaller than 2.2% of the short side | Whether the eye goes to the right place |
| A picture, film or font that did not load | A picture that loaded but is the wrong one, or is ugly |
| A caption covering text | A picture covered by a caption |
| A caption over two lines | A layout that is cramped, lopsided or dull |
| A clip with nothing to draw it | An answer visible too early |

So a clean audit means: now look at the pictures.

## 9. If you cannot look

If the machine has no browser, or you cannot view pictures:

- Run what you can: `check`, `dump`, and `stills --audit` if a browser exists.
- **Say plainly in your final message that the pictures were not looked at,** and by whom they
  should be. Do not write "visually reviewed" for an audit that found no problems.
- Give the user the shortest route: `node tools/serve.mjs` and the address, or the sheets in
  `out/stills/<id>/`, with the checklist from section 6.

## 10. Done

- [ ] `audit.txt` is clean for every language and layout to be published.
- [ ] Every contact sheet from `stills` has been opened and checked against the list.
- [ ] The exported file has been through `frames`, with `--all` on each stretch that moves.
- [ ] The export report shows `✓`, or each `!` is explained.
- [ ] The sound report has no clipping and no unexplained silence, and someone has listened or
      has been asked to.
- [ ] `notes/<id>/review/visual.md` records what was looked at, what was found and what was
      fixed.

If a fix changed any words, go back to `script-review.md`: new words are new material.
