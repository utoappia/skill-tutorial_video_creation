# Planning: the mind map and the storyboard

Deep research produces far more than a viewer can take in at one sitting. Planning does not
throw the surplus away. It turns the research into an order of ideas (the mind map), splits it
into a short **core** and many **details** the requester can delete by name, and then into an
order of pictures (the storyboard). Do all of it before writing any script: changing a row in a
table costs nothing; changing a finished script costs a review.

## Contents

1. The mind map file
2. Building the mind map
3. The core, and details on request
4. Choosing a structure
5. The storyboard
6. Choosing what to show
7. How long things take

## 1. The mind map file

`notes/<id>/mindmap.json`. It is deliberately brief: it holds ideas and addresses, not content.
The content stays in the research notes.

```json
{
  "title": "Why do we have leap years?",
  "audience": "Curious people of any age; no astronomy needed",
  "promise": "After watching, the viewer can explain where the extra day in February comes from.",
  "nodes": [
    {
      "id": "trip",
      "label": "One year is one trip around the Sun",
      "note": "The calendar counts 365 days; the real trip is about 6 hours longer.",
      "kind": "claim",
      "use": "core",
      "research": ["01-how-long-is-a-year.md#How much longer than 365 days"],
      "children": [
        { "id": "orbit", "label": "Orbit: the path around the Sun", "kind": "term", "use": "core" },
        {
          "id": "seasons-not-stars",
          "label": "The calendar follows the seasons, not the stars",
          "note": "About 20 minutes of difference. True, but a second idea.",
          "kind": "counterpoint",
          "use": "cut",
          "research": ["01-how-long-is-a-year.md#Other views and counter-examples"]
        }
      ]
    },
    {
      "id": "adds-up",
      "label": "Six hours a year add up to a day in four years",
      "kind": "claim",
      "use": "core",
      "needs": ["trip"],
      "research": ["01-how-long-is-a-year.md#What happens with no leap days"],
      "links": [{ "to": "skipped", "why": "the same adding-up, with minutes instead of hours" }]
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `title`, `audience`, `promise` | Copied from the brief. The promise is the test for every node. |
| `id` | Lower-case words joined by dashes. Used by `needs`, `links` and the storyboard. |
| `label` | The idea in at most 10 words. Write a full statement ("Six hours a year add up"), not a topic ("Accumulation"). |
| `note` | At most 40 words: what to remember about it. Details belong in the research. |
| `kind` | `claim`, `example`, `analogy`, `story`, `counterpoint`, `term`, `question` or `step`. |
| `use` | `core` (the spine: in the video even if every detail is deleted), `support` (researched and true, kept out of the core: material for the description, a next video, or a detail if the requester asks for a longer version; section 3), `cut` (researched and left out, for a reason that is not length). |
| `research` | Where the details and sources are: `"file.md#Heading"` inside `notes/<id>/research/`. |
| `needs` | Ids of ideas the viewer must already have. They must come earlier in the file. |
| `links` | Ideas elsewhere in the tree that this one relates to, each with a `why`. |
| `children` | Ideas that belong under this one. |

**Teaching order is file order:** top to bottom, children straight after their parent.

`node tools/mindmap.mjs <id>` checks the file and prints the outline; `--order` prints the ideas in
teaching order with what each one needs. It reports as errors: a research pointer to a file or
heading that does not exist, an idea that needs something that comes later (or was cut, or does
not exist), a link without a reason, duplicate ids, more than four levels. It warns about: a
claim, example, story or counterpoint with no research behind it; a research note no idea uses;
more than five main branches; more than seven new terms; no counterpoint anywhere in the map.

## 2. Building the mind map

1. **Write the promise at the top** and keep it in view.
2. **List every idea** from the research notes that could appear, one line each. Do not order yet.
3. **Mark what the promise needs.** Ask of each idea: "could the viewer do what was promised
   without this?" If no, it is `core`. A real story's essentials and the fairness of the video
   (the strongest objection, how a win could have failed) are `core` too. Everything else that
   is true and sourced is `support`: researched, kept out of the core, and the material for the
   description, a longer version if the requester asks, and the next videos. Mark an idea
   `cut` when it is unconfirmed, cannot be told fairly, repeats another idea, needs something
   this viewer cannot be given, or does not bear on the main topic (`research.md`, section 10).
4. **Find the main branches,** three to five of them. Each is one step the viewer takes. If you
   have seven, two of them are one step, or the video is two videos.
5. **Order them** so each needs only what came before. Fill in `needs` honestly; the tool checks it.
6. **Hang examples, comparisons, stories and terms** under the idea they serve. An idea with no
   example under it is a warning sign. An example under no idea is decoration.
   **Each real event has a `core` node and its details under it.** The core node is the event
   in a few sentences: the setting, what was done, how it could have failed, how it ended, the
   lesson, and how it relates to the main topic. Under it hang the details (`support`), one
   node for each thing the research found: the people, the timeline, the means, the numbers, the warnings, the findings, the disputes, the myths,
   what came after. A real event with one node and nothing under it has been researched thin.
   A real event in which the main topic is not at work (`research.md`, "The example test") is
   `cut`, with the reason, however famous.
7. **Place the counterpoints.** Each is `core` (the video says it), `support` (in the notes and
   the description), or `cut` with a
   note saying why it cannot be told and how the wording stays fair without it.
8. **Add `links`** between ideas in different branches that are the same pattern, cause each
   other, or are easily confused. A link is a promise to the script writer: "when you reach this,
   remind the viewer of that" or "keep these two apart".
9. **Count the terms.** Each `term` node will be a word card. More than about one new word per
   minute of core is too many; replace the others with plain words. Inside a detail, explain a
   needed word in the same line ("auditors, its outside checkers") and keep cards for words the
   video uses again.
10. Run the tool until it is clean.

Keep the cut ideas in the file. They show a reviewer what was considered, they hold the material
for the description text and follow-up videos, and they stop the same question being researched
twice.

## 3. The core, and details on request

**The core is the video.** It is the shortest telling that keeps the promise and is still true
and fair: for a subject with two real stories, about ten to twenty minutes. It is what you
script, review, record and hand over. The research behind it goes one level deeper, to the
depth of a detail (`research.md`, the start), so that the core is chosen with knowledge.

Two further layers exist for when the requester asks for more:

**A detail** is one further thing the research found, wrapped so that it can be removed by name
without touching anything else (`v.detail(name, fn, { about })`; see `authoring-kit.md`). A
longer version is the core plus the details the requester asked for. Because the research is
already at this depth, writing them needs no new research. The requester reads the list
(`node tools/dump.mjs <id> --details`), watches, and deletes by name.

**A deep detail** is the third layer: the full account of one story (each warning in full, each
figure with who counted it, each dispute with both sides). It needs research below the depth of
a detail, and it is mostly about the story rather than the main topic, so offer that story as a
video of its own first (`research/next-videos.md`). On one job the deep layer made a six-hour
video out of an eighteen-minute core, and most of it was not about the main topic. If the
requester still wants it: `deep-layer.md`.

What belongs in the core:

- the question, the invented example and the mechanism, step by step;
- every word that a later part of the core uses, taught before it is used;
- for each real story: the setting in two or three lines, who did what, the turning point, how it
  ended, **how it could have gone the other way**, what it teaches, and its link to the subject;
- only real stories in which the main topic is at work (`research.md`, "The example test"). A
  famous story that is only nearby is not in the core, nor in a detail; at most it is a row of
  `next-videos.md`. A shorter story found while researching, in which the main topic is at
  work, can be told in a few lines (what, when, who, what it shows about the main topic);
- the strongest objection and the commonest myth, each in a line or two with its source;
- **one** main figure for each quantity (the rival figures are a detail);
- the recap. It names each story and its lesson, not only its outcome.

What a longer version adds as details, on request (each one answers a question a viewer might
ask; the research already holds the answers):

| The question | The detail holds |
| --- | --- |
| "What was that arrangement, exactly?" | Its history, its rules, its numbers. |
| "Who were these people?" | Each person: where they came from, their job, what they did. |
| "What happened, hour by hour?" | The timeline of the decisive days. |
| "How exactly was it done?" | The steps, the instrument, the amounts, with a worked sum. |
| "How could it get so big?" / "Why did nobody stop it?" | The rules, the limits, the warnings and what was done about each. |
| "How much, really?" | The rival figures and what each one measures. |
| "What did they say?" | The quotations, each attributed. |
| "What came after?" | What happened to each person and organisation; what changed. |
| "Who was to blame?" | What inquiries and courts found, in their words, and what they could not establish. |
| "Is that what really happened?" | The disputes, and the things often said that are not true. |

Rules for a detail:

1. **It is whole shots, or whole rows inside a shot** that keeps at least one core line. Never
   half a sentence.
2. **Nothing outside it depends on it.** No later line uses a word, a name, a number or a picture
   that only the detail introduced. If the core needs it, it is core.
3. **It depends only on the core and on itself,** never on another detail. Then any set of
   details can be deleted. If two details need each other, they are one detail. The one
   exception is declared in the code: a deep detail may build on the detail it follows
   (`within`), and is deleted with it.
4. **It answers one question** and takes thirty seconds to about three minutes. Name it for its
   story and its content (`1995-the-warnings`), and write an `about` of one sentence: it is all
   the requester reads when deciding whether to keep it.
5. **It keeps every writing rule.** A detail is not a place for long sentences, unexplained words
   or a screen that stands still. It is explained as carefully as the core.
6. **It sits where it belongs in time.** If a detail goes back over days the core has already
   told, its first line says so ("Now the same week again, day by day"). A listener who hears an
   event twice without warning thinks it happened twice.
7. **A detail of more than about a minute starts its own chapter,** so that a viewer can skip
   it. Chapter markers may be placed inside a detail; they go when the detail goes.
8. **Music and anything else that spans several lines starts and ends on core lines.**
9. **Hedges and attributions travel with the fact.** A detail is where single-source figures,
   reported quotations and disputed claims live; each keeps its "one newspaper wrote", on screen
   as well as in the voice.

`node tools/check.mjs <id>` builds the video without each detail in turn, without the deep
layer and without all of them, and fails if any version breaks. That proves the structure, not the sense: read the core
alone as well (`script-review.md`, section 5).

## 4. Choosing a structure

Pick the one whose shape matches the promise. Most videos are one of these.

| Structure | Use it when | Shape |
| --- | --- | --- |
| **Question → answer** | Explaining why something is so | Ask a question the viewer already wonders about → build the pieces → answer → show a catch or limit → recap. |
| **Problem → fix** | Explaining a method, a tool, a rule | Show the problem hurting → the obvious fix and why it falls short → the real fix → try it on a second case. |
| **Worked example → faded example** | Teaching a skill | Do one fully, naming each step → do one with the viewer predicting the next step → give one to try. |
| **Before → after** | Showing a change or a comparison | The same thing shown twice, with one difference. Change only that one thing between the two pictures. |
| **Steps** | A procedure or a walkthrough | Show the finished result first → the steps, each with its own picture → the whole run once more without stopping. |
| **Story** | History, a case, a discovery | "This happened, **and** this, **but** then this, **therefore** this." The *but* is where interest comes from. |
| **Claim → evidence → objection → reply** | A subject people disagree about | State the view fairly → the evidence → the strongest objection → what holds up. |

Rules that hold for all of them:

- **Open with the question or the result, not with background.** The first ten seconds decide
  whether anyone stays. Say what the viewer will be able to do.
- **Start from one concrete case** the viewer can picture, then generalise.
- **Give the answer early when the viewer is busy** (a how-to, a product walkthrough): result
  first, then how. Hold it back only when working toward it is the lesson.
- **One video, one promise.** A second promise is a second video.
- **End by repeating the main points in the words already used,** then the one next step. Do not
  introduce anything new in the last 15 seconds.

## 5. The storyboard

`notes/<id>/storyboard.md`: a table with one row per **beat**. A beat is one thing shown and one
thing said (one to three lines of narration).

| Column | What goes in it |
| --- | --- |
| `#`, Chapter | Order, and the chapter the beat belongs to. A chapter is one main branch of the mind map, one part of a long story (the day before, the day itself, what came after), or one longer detail. |
| Layer | `core`, or the name of the detail the beat belongs to. Read the `core` rows alone, top to bottom: they must tell the whole video. |
| Idea | The mind-map id. A beat with no id is not in the plan: add it to the map or drop it. |
| What the viewer sees | The picture, concretely: what is on screen, what appears, what moves, what is pointed at. "A diagram of X" is not enough; say which boxes and labels. |
| The voice says (gist) | The point in one plain sentence. Not the final wording. |
| Component | Which component draws it (see `components.md`), or the name of one to build. |
| New word | The term introduced here, if any. A row with a new word introduces nothing else. |
| Sound | Empty for most rows. "card", "quiz" or "answer" where an event sound plays; "music" on the rows of a story part that teaches no new idea. If "music" sits on a row with a new word, a new idea or a quiz, move one of them. |
| Seconds | A rough length (see section 7). |

Then tick the checks at the bottom of the template. They are the commonest planning failures:

- The first 10 seconds show the question or the result.
- Every `core` idea has a row (and every `support` idea a detail row, in a longer version); no
  row is missing from the map.
- The `core` rows alone tell the whole video: no core row needs a detail row.
- Each real event has its details: the people, the timeline, the means, the numbers, the
  warnings, the findings, the disputes, the myths, what came after. A real event told in fewer
  than about ten rows is thin; go back to the research.
- Each row needs only ideas from rows above it.
- Each new word has its own row.
- There is a pause-and-think row before each answer the viewer could work out. Its "voice says"
  cell holds the question itself: the narrator announces the quiz and reads the question aloud.
- No chapter is longer than about three minutes. A long story is several chapters, split by
  time. (The checker warns at six minutes.)
- The last rows repeat the main points in the same words.
- The picture changes at least every 20 seconds.
- At least one core row shows something that really happened, with its date. If it is a
  success, a core row says how it could have failed, and a real failure is next to it.
- **For each row, the viewer's guess:** "what will the viewer expect to happen next?" Where the
  true answer is different from the sensible guess, there is a row that says the guess and
  answers it (`teaching-techniques.md` section 5). Typical places: where a thing physically
  goes, who pays whom, what happens "at the end", anything named after something it is not.
- Most rows have no sound. Music, if any, is on story rows only, begins and ends on core rows,
  and covers less than about a quarter of the video.

Finish with two lists: **components to build** (anything the standard components cannot draw) and
**assets to get** (pictures, film, sounds, music, a voice). Write the second list in
`notes/<id>/assets.md` with a prompt or a source for each, and its state. If the user has
already named a service for some of them, use it now (`voice-and-assets.md` section 10);
otherwise tell the user about the list now, not at export time, and carry on with drawings.

## 6. Choosing what to show

For each beat, ask: **what would the viewer have to see to believe this without being told?**

| The idea is … | Show it as … | Component |
| --- | --- | --- |
| A thing with parts | The thing, with one part pointed at as it is named | `image` + `annotate`, or `scene` |
| A process or a cause | Things moving or changing, one step per line | `scene` (move, show, set) |
| A quantity or a comparison | A chart that builds as the numbers are said; the one bar that matters highlighted | `chart` |
| A sum | The sum written out, with the numbers the viewer has already seen | `scene` text, or `text` |
| A change | The same picture before and after; the new part arrives as a new element | `scene`, `image` with `set` |
| A sequence of steps | A list that grows, or boxes that fill in | `list`, `scene` |
| A timeline, a set of people, a set of findings: many short facts of one kind | A board: a heading and five to seven rows, each row a label (a date, a name) and a few words, arriving as it is spoken and changing its words when the voice moves on | `scene` (the board recipe in `authoring-kit.md`) |
| A number that grows over time | A chart of that one measure, one bar or point per date | `chart` |
| Something on a real screen | A recording of it, with a fingertip, rings and labels drawn over it | `video` + `annotate` |
| Code or a command | A few lines, typed out, one line lit while it is discussed | `code` |
| A new word | A word card | `term` (the kit's `term()`) |
| A question for the viewer | The question, read aloud by the narrator, then a silent countdown; nothing else | `countdown` (the kit's `think()`) |
| The main points again | A list, each point arriving as it is read aloud | `list` (the kit's `recap()`) |
| A place, a person, an object the viewer has not seen | A real picture or film clip (an asset to get) | `image`, `video` |

Prefer drawing with components to hunting for assets: a drawn diagram shows exactly what you mean,
matches the rest of the video, can be pointed at precisely, costs nothing and translates. Reach
for photographs or generated film when the viewer needs to see what a real thing looks like, or
when the video would otherwise be diagrams from start to finish.

If a beat has nothing to show, it usually has nothing to say either. Merge it into the next one,
or find its example.

## 7. How long things take

| Thing | Time |
| --- | --- |
| A spoken line of 6 to 14 words | 2.5 to 5 seconds |
| Narration overall | 120 to 150 words a minute, pauses included |
| A word card | At least the time to read it twice: roughly 4 to 8 seconds |
| Pause and think | About 2 seconds to say a quiz is coming, the time to read the question aloud, then 3 to 5 seconds of silence for a simple question, up to 8 for a sum |
| A title | 2 to 4 seconds before the voice starts over it |
| A chapter | 30 seconds to 3 minutes |
| A detail | 30 seconds to 3 minutes |
| A short for a vertical feed | 20 to 60 seconds; one idea only. No details. |
| The core of a lesson (the video you hand over) | 2 to 6 minutes for one idea; 10 to 20 minutes for a subject with real stories |
| A longer version, on request | The core plus the details asked for. As a guide, one job's core of 18 minutes became 74 minutes with every detail, and nearly six hours with the deep layer. |

**The core is the target length.** When the draft runs past it, ask of each part: does the
promise need it, does a real story need it to be clear, does fairness need it? What does not goes
back to the notes, where it is material for the description, a longer version or a next video;
it is not lost. Never cut a step the viewer needs, a pause, a word card for a word the video
uses, how a win could have failed, or a story's link to the main topic. When the core cannot keep
the promise in about twenty minutes, the promise is too wide: it is two videos, and the second
is a row of `next-videos.md`.

The brief can override this: a named length ("a two-minute clip") is a limit, and "the full
account" asks for the longer layers.
