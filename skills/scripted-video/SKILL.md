---
name: scripted-video
description: Plan, research, write, review and export videos that are written as scripts (data and code, not timeline editing) and rendered to mp4. Use this whenever the user wants to make a video, tutorial, explainer, lesson, course module, product walkthrough, how-to, animated presentation, YouTube video, short vertical clip or in-app tutorial, or asks to research a topic "for a video", write or review a video script, add narration, captions, chapters, a voice-over, sound effects, music or translations to a video, improve or correct a video made this way, or turn a document, a lesson or a slide deck into a video. It covers the whole job (research method, research in a few checked rounds that goes one level deeper than the video tells and finds subjects for later videos, counter-views and real examples, a mind map, a storyboard, a core-length script with longer versions on request, accuracy and comprehension reviews, a frame-by-frame visual review, voice, generated sound effects and music, export, subtitles, localization, a publishing kit and later editions) and ships a small engine that renders the script in a browser and exports mp4.
---

# Scripted video

A video here is a **script**: a file that says what is spoken, what is on screen and when. A small
engine (in `starter/`) turns it into pictures in a browser and into an `.mp4` with sound, captions
and chapters. Because the video is text, you can write it, check it, review it line by line, look
at every frame, translate it and fix one word without re-editing anything.

The engine is the easy half. A video that teaches needs a true story, told in an order the viewer
can follow, in words they know, with pictures that point at what the voice names. Most of this
skill is about that half. Follow the stages in order; each one leaves a file that the next one
reads, so the work survives a long session and a second agent can pick it up.

**Aim to hand over a video the requester does not have to correct.** Their time is the cost you
are saving. So: decide what you can decide and write the decision down; use every service, key
and fact they offered; before handing over, look at the video as they will (see "Before you hand
over"). The first things a requester notices are almost never rule-breaks a checker can find.
They are a guess the video never answered, a subject with nothing real in it, and a video that
sounds unfinished.

Three principles hold for every video about the world. Each is stated here once; the stages
below apply them and `references/research.md` gives the method.

- **Tell at core depth; research one level deeper.** The video you hand over is the **core**: the
  shortest telling that keeps the promise and is true and fair: about 10 to 20 minutes for a
  subject with real stories, less for a single mechanism. **A length the requester names is a
  limit and wins**; the research depth then shrinks with it. The research goes one level further, to the depth of a **detail**
  (the people, the decisive days, the exact means, the rival figures, what the inquiries found),
  so that the core is chosen with knowledge, and so that **neighbouring subjects** turn up: an
  event, an institution or an idea that touches the main topic and has a story of its own. Each
  becomes a row of `research/next-videos.md` with what is already known, and is not researched
  further. Below a detail (each person's later life, each document in full, an institution's
  whole history) lies the research of another video: on one job, going there grew the video to
  six hours when the 18-minute core was what the requester wanted. Longer versions are made only
  on request.
- **Every real example shows the main topic at work.** A real story goes into the video only if the
  thing the video is about actually happens in it, as the sources tell it: for a video about
  futures markets, futures contracts traded on an exchange, margin called, a contract settled. A
  story that is only nearby (the same years, a famous name, a bet that looks similar but was made
  another way) stays out, however famous and even if the requester suggested it. Check this at
  the sources in round 1, before any depth is spent on it. On one job, the most famous story
  offered for a futures video turned out to be a bet made through private deals with banks; it
  was taken out after two editions had told it. Short is not thin, though: in the core, each
  real example is told with its people, its date, the exact means, the amounts, how it could
  have gone the other way, how it ended and what it shows about the main topic.
- **The research has an edge and an end.** Every lead is tested against the main topic before a
  search is spent on it; one that fails is written down in a line and left ("interesting" does
  not open it). There are three planned rounds (the outline, the detail, and a double check, at
  the sources, of everything the video will say) and a short fourth only for named items the
  core needs. More is the requester's decision.

**Default viewer:** someone meeting the subject for the first time. Write so that an 8-year-old
could follow, in calm, professional wording an adult would not find childish. Simple is not the
same as childish: short sentences, everyday words, one idea at a time, no baby talk. Change this
only if the brief names a different viewer.

## Set up

Copy the `starter/` folder of this skill into the user's project (for example as `video/`), then:

```bash
cd video
npm install            # one small dependency; it uses the Chrome already on the machine
node tools/check.mjs   # the example video should pass
```

Needs: Node 18 or newer; Chrome, Edge or Chromium (to draw pictures); `ffmpeg` (to record the
voice and to export). If one is missing, see `references/troubleshooting.md`. Do not work inside
the skill folder itself; work in the copy.

The copy contains one example, `videos/hello.json`: fifteen seconds in plain data, with a
translation and a vertical layout, used to check that the setup works. What each stage should
produce is in the files `node tools/new.mjs` creates: every one starts with its own checklist.
Delete the example when the user's own video is under way.

## The stages

Start every video with `node tools/new.mjs <id> "<Title>"`. It creates `notes/<id>/` (the files
named below, with their checklists) and a script skeleton in `videos/<id>.mjs`.

| # | Stage | You produce | Done when | Read |
| --- | --- | --- | --- | --- |
| 0 | **Brief** | `notes/<id>/brief.md` | Viewer, promise ("after watching, the viewer can …"), length, shape and language are written down, with everything the requester asked for by name. | below |
| 1 | **Research method** | `research/00-how-to-research.md` | You know how people who know this field find things out, and where beginners go wrong. | `references/research.md` |
| 2 | **Research, in three rounds** | `research/NN-name.md`, `research/leads.md`, `research/next-videos.md`, `research/index.md` | Every lead in `leads.md` is closed (researched, not found, next video, off topic or open); each real example passes the example test and is known to the depth of a detail; other views and myths are researched; round 3 has re-read at its source every claim headed for the video, and each has a source and a confidence label; what the requester remembers has a verdict. The full list: `references/research.md`, section 11. | `references/research.md` |
| 3 | **Mind map** | `mindmap.json` | Every researched idea is `core` (in the video), `support` (researched and true, kept out of the core) or `cut` (unconfirmed, unfair or off topic); the `core` ideas alone keep the promise; `node tools/mindmap.mjs <id>` reports no errors. | `references/planning.md` |
| 4 | **Storyboard** | `storyboard.md`, `assets.md` | Every beat has a picture, a gist, a component and a sound (usually none); the checks at the bottom are ticked. | `references/planning.md` |
| 5 | **Script** | `videos/<id>.mjs` | `node tools/check.mjs <id>` reports no errors and you have read every warning. The script is at core length. | `references/authoring-kit.md`, `references/components.md` |
| 6 | **Accuracy review** | `review/accuracy.md`, `research/index.md` (`review/coverage.md` only for a full account) | Every row of `dump --claims` has a verdict and a source; for each real story a checker who did not write it has compared script, notes and sources (or, with no second agent, you have, and the file says "not independent"); the research has been re-read against the script, and what the core needs and lacked is now in it; corrections are written back into the notes. | `references/script-review.md` |
| 7 | **Comprehension review** | `review/WhatIHaveLearned.md`, `review/lost-points.md` | The diary reaches the promise with no gap, and every way to get lost has a fix or a reason. | `references/script-review.md` |
| 8 | **Visual review** | `review/visual.md` | You have looked at every still and nothing is cut off, covered, empty or unreadable. | `references/visual-review.md` |
| 9 | **Voice and sound** | recorded lines in `out/tts/`, sounds in `assets/<id>/` | The script has passed stages 6 to 8 and the voice is recorded; timing now follows the real voice. Event sounds are set; music, if any, sits under story parts only. | `references/voice-and-assets.md` |
| 10 | **Export and final watch** | `out/<id>.mp4`, `.srt`, `.vtt`, `.chapters.txt` | You have looked at frames of the exported file itself and checked its sound. | `references/export-and-publish.md` |
| 11 | **Other languages and shapes** (if asked) | `videos/i18n/<id>.<lang>.json` | Each language passes `check`, and its stills have been looked at. | `references/localization.md` |
| 12 | **Publishing kit** | `publish.md` | Title, description, chapters, captions, thumbnail, sources and credits are ready. | `references/export-and-publish.md` |
| 13 | **Hand over** | the message to the requester | The requester's-eye pass is done; the message says what was decided, what was corrected and what is still open. | `references/finishing-and-revising.md` |

Writing rules that apply from stage 4 onwards are in `references/writing-for-everyone.md`
(words and sentences) and `references/teaching-techniques.md` (how to make an idea land).
`references/visual-design.md` covers layout, colour and motion. Read those three before you write
your first script.

### Stage 0: the brief

Fill in `brief.md` from what the user has said. For everything else, write your best assumption
and mark it "(assumed)"; do not stop to ask (see "Decide, record, carry on").
The one line that matters most is the **promise**: one sentence starting "After watching, the
viewer can …". Every later decision (what to research, what to cut, when the video is done) is
tested against it. Also record what the viewer already knows, because that is where the video
starts.

Copy into the brief, in the requester's own words, **everything they asked for by name**: a
service to use, a key and where it is, an example or event to include, a fact they remember, a
part they found confusing, a limit ("most of it without music"). Each of these is a row to tick
before you hand over. A named service is checked for reachability now, not at stage 9; a fact
they remember goes to the research as something to verify, not as something to repeat.

Decide here whether research is needed. Skip stages 1 and 2 only when the content is fully given
(the user's own product, a script they wrote, a process they described) and you add no facts of
your own. If you would add even one number, date, name or "because", research it.

### Stages 1 and 2: research

Before researching the subject, research **how to research it**: two or three searches on how
people learn and investigate this field, and one level up (for the bond market: "how to
understand the bond market", then "how to learn about the economy"). They tell you which sources
count, which numbers matter and where beginners go wrong. Then three rounds:

1. **The outline.** One note per topic, with a summary at the top: facts with sources, real
   events (each put through the example test first), everyday comparisons, and the **strongest
   opposing views and myths, researched as carefully as the main line**.
2. **The detail.** List every person, place, date, number, term, mechanism, cause and quotation
   the notes mention without explaining, in `research/leads.md`. Research those that bear on the
   main topic, once, to the depth of a detail. Neighbouring subjects go to `next-videos.md`; the
   rest are marked off topic.
3. **The double check.** No new subjects. Read again, at its source, everything the video will
   say; find a second, independent source for the surprising claims, the numbers that give the
   size of the story, the quotations and anything that reflects badly on a named person.

Plan the searches before you start and keep a third for round 3. If you can start other agents,
give each real event to its own agent, and the double check to one that did not write the note.

Two things the finished video must be able to draw on:

- **Real events, known to the depth of a detail.** An invented person makes an idea easy to
  follow; a real event makes the viewer believe it and remember it. For a subject with a history
  (a market, a technology, an institution) research at least two. If one shows someone winning,
  research how it could have failed, and find one where someone lost: a win alone teaches the
  wrong lesson. For a mechanism of nature or a method (why the sky is blue, how to tie a knot),
  a real observation, measurement or discovery is enough, or none: write "none, because …" in the
  brief.
- **What the requester remembers, checked.** It is a lead, and often partly wrong. Verify each
  part, use what holds, and tell them what you corrected and why; never repeat a claim because
  "the requester said so", and never drop it silently.

Details: `references/research.md`.

### Stage 3: the mind map

`mindmap.json` is a short tree of every idea the video could contain (node kinds are listed in
`references/planning.md` section 1; `node tools/mindmap.mjs` names them when one is wrong). Each node says in a few
words what the idea is, where its details live in the research (`"file.md#Heading"`), which ideas
the viewer needs first, and which ideas elsewhere it connects to. Each idea is `core` (in the
video: the promise needs it, a real story cannot be told without it, or fairness needs it),
`support` (researched and true, kept out of the core: material for the description, a longer
version if the requester asks, or a next video) or `cut` (unconfirmed, cannot be told fairly, or
does not bear on the main topic; a real story that fails the example test is `cut`). The tool checks that every pointer leads somewhere and that
nothing is taught before what it needs. Details: `references/planning.md`.

### Stage 4: the storyboard

A table, one row per beat: what the viewer sees, the gist of what the voice says, which component
draws it, whether a new word arrives, and what is heard besides the voice (for most rows:
nothing). This is where you decide **how to show each idea** and which components you need to
build, before writing any script.

For every row, write down **what the viewer will guess happens next**. If the story does
something else (the goods go to one place and the money comes from another; the number goes down
when the viewer expects up), that row needs a line that says the guess aloud and answers it.
This is the most common reason a requester sends a video back.

Anything the script cannot draw (a picture, a film clip, a sound, music, a studio voice) goes in
`assets.md`: what it is for, how to make it, the prompt if it is to be generated, and whether it
exists yet. The video must be complete without the assets that do not exist yet.

### Stage 5: the script

Write the script with the authoring kit: a short JavaScript file where each `say()` is a spoken
line and returns a time reference that pictures, pointers and effects hang from. Nothing has a
hard-coded time, so the whole video re-times itself when the voice is recorded.

```js
import { video } from '../engine/kit.js';
const v = video('tides', 'Why the sea rises and falls');

v.chapter('The question');
v.title('Why the sea rises and falls');
v.say('Twice a day, the sea climbs up the beach and slides back down.');
v.say('What is pulling it?');

v.chapter('The Moon pulls');
v.shot('moon');
const sky = v.scene('sky', [
  { id: 'earth', kind: 'circle', x: 300, y: 250, w: 300, h: 300, fill: '#4aa3ff', text: 'Earth' },
  { id: 'moon', kind: 'circle', x: 1200, y: 340, w: 120, h: 120, fill: '#d9dde3' },
], { width: 1600, height: 800 });
const moon = v.say('This is the Moon.');
sky.ring(moon, 'moon', { label: 'Moon' });             // point at it as it is named
const pull = v.say('The Moon pulls on the sea. That pull is called gravity.');
v.term('gravity', 'The pull that draws things toward each other.', pull,
  { say: 'Gravity is the pull that draws things toward each other.' });
// A quick quiz: the narrator says one is coming, reads the question aloud, then is quiet for 4 s.
v.think('Which side of the Earth has the high water?', 4);
// …
export default v.build();
```

**Longer versions are made on request.** The default script is the core and has no details.
When the requester asks for more (a longer cut, one story told at length), the research notes
already hold it at detail depth: write each addition inside a **detail**, so it can be removed
by name:

```js
v.detail('1995-the-warnings', () => {
  v.chapter('1995: ten warnings');
  // … shots and lines that only this detail needs …
}, { about: 'Ten warnings the bank had before it fell, in date order, and what was done about each' });
```

`node tools/dump.mjs <id> --details` lists every detail with its length; `omit: ['name', …]` in
`video(…)`, or `--omit name,name` on any tool, removes them. Nothing outside a detail may depend
on it. The rules for splitting core from detail are in `references/planning.md`, section 3.

**Only when the requester asks for the full account of one story**, add the third layer:
**deep details** (`{ deep: true, within: 'the-detail-it-follows' }`), deleted one by one or all
at once with `omit: ['deep']`. First suggest that story as a video of its own (`next-videos.md`):
its full account is mostly about itself, not about the main topic, and it needs research below
the detail depth. If they still want it here, do not trust your own sense of what the script
left out: someone who did not write it counts, heading by heading, what the note holds
and the video does not tell; one writer per stretch of the story brings those facts in as data;
a checker goes through every row against the note; first-time listeners go through the text;
and one closing check goes back to the sources for every weak label, without opening new
subjects. All before the studio voice and the export. `references/deep-layer.md` has the
layers, the data format, the helper and the brief for each of those agents.

`references/authoring-kit.md` is the full kit, `references/components.md` lists the components
(text, pictures, film, scenes, charts, code, lists, word cards, pause-and-think, pointing) and
shows how to write your own, and `references/script-format.md` describes the plain-data format the
kit produces, which you can also write by hand as JSON.

Loop while writing: edit → `node tools/check.mjs <id>` → `node tools/stills.mjs <id>` and look at
the sheets. Before the voice is recorded, lengths are estimated from word counts and often run
long; record the free voice (`node tools/tts.mjs <id>`, seconds to minutes) before you cut
anything for length. `check` knows the rules a reviewer would otherwise have to remember (a word card with
something else happening under it, a question shown but not read aloud, a line too long to follow,
"here" with nothing pointed at, a blank screen, low contrast, a missing translation). Fix errors;
read every warning and either fix it or know why it is acceptable.

### Stages 6 and 7: review the script as a viewer

Never review the source file. Review `node tools/dump.mjs <id>`, which prints the video in the
order a viewer meets it.

1. **Accuracy.** `node tools/dump.mjs <id> --claims` lists everything said and shown. Give each
   row a verdict and a source in `review/accuracy.md`. Record every simplification you made on
   purpose and why it is fair to this viewer. Then go the other way: re-read the research
   against the script and bring in what the video lost (a real example told thin, a
   counter-view with no place, a fact shrunk to a phrase that now says more than the source).
   For each real story, start a checker who did not write it: give it the claims for that story
   and the research note, let it open the sources, and ask for errors **and** for what is true
   and important in the note but missing from the script. If you cannot start another agent, do
   it yourself from the sources (not from memory of the note), write "not independent" in
   `review/accuracy.md`, and say so in the hand-over. Correct the notes as well as the
   script. Last, let the machine compare the two: `node tools/dump.mjs <id> --quotes` lists
   every spoken quotation that the research notes do not hold word for word, and
   `node tools/dump.mjs <id> --figures` every figure said or shown that is not in the notes as
   written. Look up each one and write the verdict down. Run both again after every revision:
   they take seconds and use no searches.
2. **Comprehension.** Become a first-time viewer who knows only what the brief says. Go through
   the video one line at a time, in order, and write that viewer's diary in
   `review/WhatIHaveLearned.md`: what they now know, which words they have been taught, what they
   can do. A line that needs something the diary does not yet contain is a gap; fix the script.
   Then, for **every** line, list the ways a viewer could get lost or take the wrong meaning
   (`review/lost-points.md`), and fix them or write down why they are acceptable. Look hardest
   for the guess the video never answers, a "so" that does not follow from what was said, and
   two lines that seem to contradict each other.
3. **A new reader.** You wrote the script, so you cannot be surprised by it. If you can start
   another agent, give it only the brief's description of the viewer and the `dump --text`
   output, and ask where it got lost, what it expected instead, and what it would ask next. (With
   no second agent, read `dump --text` aloud in one go after a break, write down every place you
   paused, and report the review as not independent.)
   Ask it, too, to explain the promise back in its own words and to mark the answers it is
   unsure of: an unsure answer marks a missing "because" in the script. Do
   this again after every substantial change, with a reader that has not seen the earlier
   version. When the video has details, give a second reader the core alone
   (`dump --text --omit <every detail>`): it must be a complete video.

Every new or changed line gets its accuracy row **before** the next export; a claim found wrong
afterwards costs a whole export. In review files, name a line by its chapter and its first words,
not by its number: numbers shift when a line is added.

A new term always gets a word card: the word, large, in the middle of the screen, with its meaning
in plain words, while nothing else changes. Details and the full list of things to look for:
`references/script-review.md`.

### Stage 8: look at it

The checker cannot see. `node tools/stills.mjs <id>` draws one picture per line, word card and
pause, lays them on contact sheets, and writes a list of what the page itself can detect (cut-off
text, labels off the stage, a caption covering content, pictures that did not load). **Open every
sheet and look.** For a long video, start with `--shots` (one picture per shot, at its fullest:
every layout on a few sheets). For anything that moves, look closer with
`--every 0.25 --from … --to …`. Write
what you saw in `review/visual.md`. Details: `references/visual-review.md`.

### Stages 9 and 10: voice, export, final watch

Use the computer's free voice (`node tools/tts.mjs <id>`) while the script is still changing. Move
to a studio voice only after the reviews; only changed lines are recorded again.

Sound besides the voice is planned, small and the same every time:

- **Event sounds:** one short sound for each kind of event (a word card arriving, a quiz starting,
  the answer). Set them once with `eventSounds` in `video(…)`; the kit plays them at every card
  and quiz. Three kinds are plenty.
- **Music is the exception.** Most of a video that teaches has none: music under an explanation
  competes with it. Use it only under parts that tell a story (a historic event, an opening, an
  ending), with `v.music(src, { start, end })`, and never under a word card, a quiz or the recap.
- **Making them:** list the sounds in `assets/<id>/sounds.json` and run
  `node tools/sound.mjs <id>` (it needs a key for a sound-generation service; without one, use
  licensed files, or the starter's `assets/example/pop.wav` for word cards, or leave the sounds
  out, and say so).

Then:

```bash
node tools/export.mjs <id>             # out/<id>.mp4 + .srt + .vtt + .chapters.txt
node tools/frames.mjs out/<id>.mp4     # frames of the real file on contact sheets, and its sound levels
```

An export takes about as long as the video plays, or longer: run it as a background job when
your shell has a time limit.

Look at the frame sheets: this is the file the viewer gets, and it is the only place to catch
problems of encoding, timing against the real voice, or sound. If you cannot play sound, say so,
and rely on the measurements: `frames` prints level, peak and unexpected silences, and `export`
prints, for each piece of music, where it plays, what share of the video it covers and how far
the voice is above it (aim for 15 to 22 dB). Copy those lines into `review/visual.md`.

## Before you hand over

Stop being the maker. Read `node tools/dump.mjs <id> --text` once more as the person who asked,
and answer these in `review/lost-points.md`. Any "no" is work to do now, not a note for later.

1. **Is every guess answered?** At each step, what would a viewer expect to happen, and does the
   video either do that or say why not?
2. **Is something real in it, on the topic, and told with its essentials?** Each real example
   passes the example test and is told with the essentials listed at the top. If the research
   has one of them and the core does not, put it in. For a story of winning: its risk, and a
   story of losing.
3. **Does it sound finished, and is most of it without music?** Event sounds at cards and quizzes;
   music, if any, under story parts only; no silence that is not meant.
4. **Did I use everything the requester offered?** Each service, key, example and remembered fact
   in the brief is either used, or corrected with a source, or reported as not possible with the
   way to make it possible.
5. **Is it the core, and can they find the rest?** The video keeps the promise at core length,
   or within the length the requester named. What the research found beyond it is in the notes, and
   each neighbouring subject is a row of `next-videos.md` that the message lists.
6. **Would I be content to receive this?** If you already know what they will ask for next, do it.

Then write the hand-over message: what the video now does, what you decided for them, what you
corrected in what they told you, what was spent on paid services, what nobody has checked (for
example: nobody has listened to it), the candidates for next videos, and where the files are.
Details and the message's outline: `references/finishing-and-revising.md`.

## Fit the process to the job

| The job | Do |
| --- | --- |
| A short explainer (the requester names a length of a few minutes) | Every stage, scaled down: a research allowance to match (about ten searches), one round of detail, the double check on everything said; no `details.md` or `coverage.md`; real events only if the subject has them. The named length is the limit. |
| A short clip from material the user wrote (an announcement, a feature tour) | Brief → storyboard → script → comprehension and visual reviews → export. No research. A mind map only if there are more than about six ideas. |
| A tutorial about the user's own product or process | As above, plus an accuracy review against the product itself (every step tried, every label spelled as on screen). |
| An explainer that states facts about the world | Every stage. |
| A series or a course | One brief and one research folder for the series; a mind map, storyboard and reviews for each video; keep one list of terms so a word means the same thing in every video. |
| A longer version, or the full account of one story (only on request) | Write the additions from the notes as named details; for the full account of one story, first offer it as its own video. `references/planning.md` section 3, `references/deep-layer.md`. |
| Fixing or extending an existing scripted video (a new edition) | Treat the requester's comments as findings: each one names a kind of mistake, so look for the same kind everywhere, not only where they pointed. Log the edition in the brief, change the script, then re-do the reviews from the first changed line. The steps: `references/finishing-and-revising.md`, section 3. |

Never skip the comprehension review or the visual review, however small the job.

## Rules that do not bend

- **True before clear, clear before short.** Do not show or say anything the research does not
  support. Do not cut a step the viewer needs to save time.
- **The three principles at the top:** core depth with research one level deeper; only
  examples that show the main topic at work; research on the topic, in three rounds, the last a
  double check. What is still open after the research stays out of the video and is reported.
- **Say it as surely as the source does.** A figure from one source is attributed, on screen as
  well as in the voice. A reported remark is "reported". A disputed claim is told with both
  sides. No cause, date, name or comparison is added that the source does not give.
- **One new idea per line; one new word per card.** A new word is explained before it is used,
  shown as a word card with nothing else happening, then used the same way every time.
- **Show, then name; point at what you name while you name it.** "Here", "this" and "that" are only
  allowed when something on screen is being pointed at.
- **Ask before you tell.** Before an answer the viewer could work out, pause and let them. The
  answer is never on screen while the question is.
- **A question is announced and read aloud.** The narrator says that a quick quiz is coming, reads
  the question as its card appears, and only then is silent while the countdown runs. A question
  is never left only on screen. `v.think()` does this; the checker fails a script that does not.
- **Nothing is timed by hand.** Hang everything from the lines. Timing follows the recorded voice.
- **Keep the caption band clear,** and give lines whose numbers are spoken as words a caption with
  digits.
- **Text on screen is short** and uses the same words as the voice for the same thing.
- **Look at the pictures.** A passing check is not a review.
- **Music is the exception, not the bed.** No music under teaching lines, word cards, quizzes or
  the recap. The voice stays clearly above it wherever it does play.
- **Something real, told fairly.** A video about the world has at least one real, dated, sourced
  example. Real people and events are told only as the sources report them.
- **Keys stay out of files.** API keys are read from environment variables only. Never write a
  key, a token or a personal voice id into a script, a note or a commit. Do not search the
  machine for keys. If the user names a file that holds one, load it into the environment of the
  one command that needs it, use it only for what they named, and touch nothing else there.
- **Say what you could not do.** If you could not hear the sound, view the frames, reach a source
  or confirm a claim, write it in the review file and tell the user.

## Decide, record, carry on

Every question you ask stops the work until someone answers. Ask only when a wrong guess would
waste most of the job (who the viewer is, what the video must promise) and nothing in the request
or the project settles it. Otherwise decide, write the decision and its reason in the brief or the
review file, and say it in the hand-over message, where one sentence from the requester can
change it.

- **What the requester asked for by name is already decided.** A service they named is the yes
  for using it, including for paid work of the size the job needs. Keep it small (make one, look
  or measure, then the rest), keep to the purpose they named, and report what was made.
- **A named service you cannot reach.** Check early. A connection made in another product (a chat
  website, a phone app) is not visible to a coding agent. Do not stop and do not pretend: finish
  the video with drawn pictures or without that asset, write the prompts and settings in
  `assets.md` so the work is one command away, and tell the requester plainly what to connect or
  which environment variable to set. Never invent a server address or a key.
- **Assets nobody mentioned.** Draw what components can draw. If the video would be clearly better
  with a studio voice, generated pictures, film, music or effects, use any generation tool
  already available in the session; otherwise finish without, and suggest the choice in the
  hand-over: the requester's own files, a licensed library, or a generation service they give
  access to (for example ElevenLabs or OpenAI for voice; ElevenLabs or a music generator for
  sound; Higgsfield, Runway, Luma or Kling for pictures and film), with the key in the environment
  (`ELEVENLABS_API_KEY`, `OPENAI_API_KEY`, …). See `references/voice-and-assets.md`.
- **Brand:** colours, fonts, a logo, how names are spelled and pronounced. Use the starter's
  defaults, marked "(assumed)".
- **Anything sensitive** (health, money, law, safety, children, real people): finish the work,
  keep to what the sources say, and state in the hand-over that no expert has reviewed it.

## Commands

All run from the project folder (the copy of `starter/`). `node tools/<tool>.mjs --help` prints
a tool's options and does nothing else. Never run a tool with no video id to see what it does:
`export`, `tts` and `stills` then work on every video in `videos/`.

| Command | What it does |
| --- | --- |
| `node tools/new.mjs <id> "<Title>" [--json] [--vertical]` | Notes folder and script skeleton for a new video. |
| `node tools/mindmap.mjs <id> [--order]` | Check the mind map; print it as an outline or in teaching order. |
| `node tools/check.mjs [id] [--strict]` | Check scripts without drawing: structure, timing, teaching rules, contrast, translations, and that every detail can be removed. |
| `node tools/dump.mjs <id> [--claims\|--quotes\|--figures\|--chapters\|--text\|--details] [--lang xx]` | The video as a viewer meets it; the claims table; the quotations and the figures that are not in the research notes as written; the chapter list; the narration alone; the list of details with their lengths. |
| `node tools/stills.mjs <id> [--shots] [--at t,t] [--every s --from a --to b] [--audit] [--lang xx] [--layout name]` | Pictures and contact sheets in `out/stills/<id>/`, plus `audit.txt`. `--shots` draws one picture per shot (into `out/stills/<id>.shots/`); `--at` and `--every` write to `out/stills/<id>.closer/`, so the line-by-line sheets stay. Times may be seconds, timecodes or references: `--at "12.5,1:05,@n7.end"`. |
| any tool, with `--omit name,name` | The same video without those details: `check`, `dump`, `stills`, `tts` and `export` all accept it. `--omit deep` leaves out the deep layer; `--omit all` gives the core alone. One recording of the full video serves every shorter version, and an export made this way gets its own file name (`<id>.no-deep.mp4`, `<id>.core.mp4`, `<id>.cut.mp4`). |
| `node tools/serve.mjs` | Live player at `http://127.0.0.1:4173` (scrub, step frames, switch language and layout, audit a frame). |
| `node tools/tts.mjs <id> [--provider say\|espeak\|command\|elevenlabs\|openai\|files] [--lang xx] [--dry]` | Record the narration and measure each line. |
| `node tools/sound.mjs <id> [--dry] [--only file] [--fresh] [--measure]` | Make the sound effects and music listed in `assets/<id>/sounds.json` with a generation service; level them and write their credits. |
| `node tools/export.mjs <id> [--preview] [--clean] [--lang xx] [--layout name] [--from a --to b] [--thumbnail t] [--subs-only] [--sound-only] [--scale 2] [--fps 60]` | The `.mp4`, subtitles and chapter list in `out/`, and a mix report for each piece of music. |
| `node tools/frames.mjs <file.mp4> [--every s] [--from a --to b] [--all] [--at t]` | Contact sheets from any video file, and its sound levels. |
| `node tools/bundle.mjs <id> [--lang en,es] [--no-voice]` | A folder in `out/web/<id>/` that plays the script live in a web page or an app's web view, with a small player. |
| `node tools/i18n.mjs <id> --lang xx \| --status \| --prune` | Translation files and a translator's brief. |

## Reference files

Read the one for the stage you are in; do not load them all at once.

| File | Read it when |
| --- | --- |
| `references/research.md` | Stages 1 and 2: the method search, how deep to research (one level deeper than the video), the three research rounds with the leads ledger, the test that keeps the research on the main topic, the example test, neighbouring subjects as next videos, the double check, the questions to ask of every real event, following numbers to where they were counted, note format, source quality, counter-views, checking what the requester remembers, sharing research between agents, the pass against the script, when to stop. |
| `references/planning.md` | Stages 3 and 4: the mind-map file, what goes in the core, details for a longer version, choosing a structure, the storyboard, choosing components, lengths. |
| `references/deep-layer.md` | Only when the requester asks for the full account of a story: the third layer of deep details, the counted pass by someone who did not write the script, deep details as data files, the briefs for writers, checkers, listeners and the closing check, revising and merging, limits. |
| `references/writing-for-everyone.md` | Before writing any line: words, sentences, numbers, captions, on-screen text. |
| `references/teaching-techniques.md` | Before the storyboard: the techniques that make an idea land, and when to use each. |
| `references/authoring-kit.md` | Writing the script: every kit function, with examples and recipes. |
| `references/components.md` | Choosing or building what is on screen: every standard component, and how to write a new one. |
| `references/script-format.md` | You need the plain-data format: writing JSON by hand, time references, layouts, tracks. |
| `references/visual-design.md` | Laying out a shot: safe area, sizes, colour, motion, pointing, vertical video. |
| `references/script-review.md` | Stages 6 and 7: accuracy, the learner's diary, the lost-points list, the new reader. |
| `references/visual-review.md` | Stage 8 and the final watch: what to look for, how to look closer. |
| `references/voice-and-assets.md` | Voice providers, pronunciation, event sounds, music under chosen parts, generating sounds, generated pictures and film, services that cannot be reached, licences. |
| `references/export-and-publish.md` | Export options, formats for each platform, embedding in a web page or app, the publishing kit. |
| `references/finishing-and-revising.md` | Before handing over, and whenever a finished video is changed: the requester's-eye pass, the hand-over message, a new edition. |
| `references/localization.md` | Adding a language or a second shape. |
| `references/troubleshooting.md` | A tool fails or a picture looks wrong. |
