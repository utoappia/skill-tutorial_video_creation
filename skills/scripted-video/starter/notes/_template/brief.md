# Brief: {{title}}

Fill this in before anything else, from what the person who wants the video has said. For the
rest, write your best assumption and mark it "(assumed)", and carry on: ask only when a wrong
guess would waste most of the work. Everything marked "(assumed)" is listed in the hand-over
message, where they can change it.

| | |
| --- | --- |
| **The viewer** | Who they are, how old, what they already know for certain, what they are trying to do. |
| **The promise** | After watching, the viewer can … (one sentence: something they can do or explain). |
| **The one question** | The question the video answers. It becomes the opening. |
| **Depth** | The core (the default): the shortest telling that keeps the promise, true and fair. The research goes one level deeper, to the depth of a detail, and stops; neighbouring subjects go to `research/next-videos.md`. A longer version with details, or the full account of one story, only if the requester asks. |
| **Length** | The core: 2–6 min for a mechanism, 10–20 min with real stories. A length the requester names is a limit; say what it forced out. |
| **Shape** | 16:9 (1920×1080) · 9:16 vertical · both. |
| **Where it is shown** | Video site, social feed, inside an app, a classroom, a meeting. |
| **Languages** | Written in …; translated to … |
| **Voice** | Free computer voice for drafts. Final voice: … |
| **Look** | Colours, font, logo, an example to match (or "starter defaults"). |
| **Real examples** | At least one real, dated event with a source (two for a lesson), in which the main topic is actually at work as the sources tell it (not a story that is only nearby, however famous or requested), each researched to the depth of a detail and told in the core with its essentials and how it relates to the main topic. If one shows a win, its risk is told and another shows a loss. Or: "none, because …". |
| **Sound** | Event sounds for word cards and quizzes: yes / no. Music: none · under these story parts only: … (never under teaching, cards, quizzes or the recap). |
| **Must include** | |
| **Must leave out** | What the requester ruled out, or what cannot be confirmed. (What the core does not need is not "left out": it stays in the notes.) |
| **Sensitive areas** | Money, health, law, safety, children, living people: who signs off these facts? |
| **Paid services** | Allowed or not, which ones, and a spending limit. A service the requester named is allowed for the purpose they named. |

## Asked for by name

Everything the requester named, in their words: a service to use, a key and where it is (the
place, never the key itself), an example or event to include, a fact they stated or remember, a
part they found confusing, a limit. Each row must end as **used**, **corrected** (with the
source) or **not possible** (with the way to make it possible) before the video is handed over.

| They said | Kind (service · key · example · remembered fact · complaint · limit) | What was done | State |
| --- | --- | --- | --- |
| | | | |

## Does it need research?

- [ ] Yes: the video states facts about the world (go to `research/00-how-to-research.md`).
- [ ] No: everything it says comes from material the requester supplied or from the product
      being shown. List that material here, and still run the accuracy review against it.

## What the viewer already knows

Write three lists. They decide where the video starts and which words need a word card.

- **Knows for certain:** …
- **Probably knows (remind in a few words):** …
- **Does not know (must be taught):** …

## Editions

One row each time a finished video is changed (see `finishing-and-revising.md` section 3 of the
skill). Copy the requester's comments in their own words.

| Date | Asked for | What changed | Length |
| --- | --- | --- | --- |
| | first edition | | |

## Done means

- [ ] The promise above is true for a first-time viewer (see `review/WhatIHaveLearned.md`).
- [ ] Every fact has a source (see `review/accuracy.md`).
- [ ] `node tools/check.mjs {{id}}` reports no errors and no warnings.
- [ ] The exported file has been watched frame by frame (see `review/visual.md`).
- [ ] Every row of "Asked for by name" is used, corrected or reported.
- [ ] The video contains something real, told with its essentials and its link to the main
      topic, and its sound is planned: most of it has no music.
- [ ] Every lead in the ledger is researched (to the depth of a detail), not found, next video,
      off topic or listed as open; the double check (round 3) is done; the pass against the
      script is done.
- [ ] The video is at core length, or within the length the requester named. `research/next-videos.md` lists every neighbouring subject
      met, and the hand-over names them.
- [ ] Only if the requester asked for a longer version: `details.md` lists its details with
      their lengths, and `node tools/check.mjs {{id}} --strict --omit all` passes.
- [ ] The questions under "Before hand-over" in `review/lost-points.md` are all answered "yes".
