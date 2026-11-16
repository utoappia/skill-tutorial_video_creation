# Finishing and revising

A video can pass every check and every review and still come back with "this part confused me",
"is none of this real?" or "why is there no sound?". The reviews ask whether each line is true and
can be followed. The person who asked for the video asks something else: **is this what I wanted,
and can I show it to someone?** This file is about closing that gap before they have to, and
about what to do when they send changes anyway.

The aim is plain: each time the requester has to tell you something you could have found
yourself, the process failed a little. Find it first.

## Contents

1. The requester's-eye pass
2. The hand-over message
3. A new edition
4. What the requester's comments teach
5. Common ways to finish badly
6. Done

## 1. The requester's-eye pass

Do this after the export and the final watch, with fresh output in front of you:

```
node tools/dump.mjs <id> --text        the narration alone, as it will be heard
node tools/dump.mjs <id> --chapters    the chapter list with times
```

Read the brief first, then the narration, as the person who asked. They have not read your
research or your reviews. They will watch once, at normal speed, and react to the first thing
that feels wrong. Answer each question below in `review/lost-points.md` under a heading
"Before hand-over". A "no" is work to do now.

| # | Question | How to check | If the answer is no |
| --- | --- | --- | --- |
| 1 | **Is every guess answered?** | For each step of the story, write what a viewer expects to happen next. Compare with what the video does. Look hardest where a thing and its payment go to different places, where a number moves the "wrong" way, and where two words sound alike but mean different things. | Add a line that says the guess aloud and answers it, with a picture that shows both (`teaching-techniques.md` section 5). |
| 2 | **Is something real in it, on the topic, and told with its essentials?** | Search the narration for a year, a place, a name, a number from the world. An invented person with invented numbers does not count. For each real story, is the main topic at work in it, as the sources tell it (`research.md`, "The example test")? If it is only nearby, take it out and say why in the message. Then, for each real story, put the research note beside the narration: the people by name and role, the date, the exact means, the amounts, the turning point, how it ended, and a line on how it relates to the main topic. | Bring into the core what it lacks of these. If the note itself is thin, research its on-topic leads to the depth of a detail (`research.md` section 3). A story of winning needs its risk and a story of losing (`research.md` section 8). |
| 3 | **Does every "so" follow?** | Read each "so", "that is why" and "this means" and ask: from what was *said*, not from what I know? | Say the missing step, or remove the "so". |
| 4 | **Does it sound finished?** | Read the sound report of `frames` and the mix report of `export`. Are there event sounds at word cards and quizzes? Is every long silence one you meant? | Set `eventSounds`; make them with `tools/sound.mjs` if a service is available (`voice-and-assets.md` section 8). |
| 5 | **Is most of it without music?** | The mix report gives the share of the video under music. Is each piece under a story part, with a `start` and an `end`? | Shorten it to the story part, or remove it. Never music under a word card, a quiz, the recap or a line that teaches. |
| 6 | **Did I use everything they offered?** | Go down the "Asked for by name" rows of the brief: each service, key, example, remembered fact, complaint and limit. | Use it; or correct it with a source; or report that it was not possible and how to make it possible. Never leave a row silent. |
| 7 | **Did I check what they told me?** | Each fact the requester stated or remembered has a row in the research: remembered, what the sources say, what the video says. | Research it now. If the memory is half right, the video uses the right half and the message explains the rest. |
| 8 | **Is it the core, and can they find the rest?** | The video is at core length (10 to 20 minutes with real stories) and keeps the promise. Each neighbouring subject the research met is a row in `research/next-videos.md`. | Move what the promise does not need back to the notes (`planning.md` section 7). Write the missing rows. If the requester asked for a longer version, check its details instead: `dump --details`, `check --strict --omit all`. |
| 9 | **Would I be content to receive this?** | If you already know what they will ask for next, that is the answer. | Do it, if it is within what they asked for. Offer it in the message if it is a new decision or costs money they did not offer. |

Two habits make this pass honest:

- **Use a new reader for question 1.** You know where the story goes, so you cannot guess wrong
  any more. An agent that sees only the viewer's description and the narration can
  (`script-review.md` section 9). Ask it: "At each step, what did you expect to happen next?"
- **Fix, then check that the fix did not break a rule that already held.** A new chapter written
  late is where old mistakes return: a long line, a word used before its card, a number said
  two ways. Run the patterns list in `review/lost-points.md` over every new line.

## 2. The hand-over message

The message is the only part of the work many requesters read. It must let them decide in a
minute whether to publish, and tell them everything you decided on their behalf. Write it in
plain sentences, most important first.

1. **What the video is now:** length, chapters, and the one or two things that changed most.
   Lead with what they asked for. If they asked for a longer version with details, give both
   lengths (with everything, and the core alone), give the table from `dump --details` (or the
   file it was saved to) and the one line that deletes:
   `video(id, title, { omit: ['name', 'another'] })`, then `tts`, `check`, `export`.
2. **What you corrected in what they told you.** Name the claim, say what the sources show, say
   what the video says instead, and give the sources. Do not soften it into agreement and do not
   make it a lecture: one short paragraph or a small table.
3. **What you could not do, and how to make it possible.** A service that could not be reached
   (and the exact step that would connect it); a source that would not open; a check that needs
   a person. Say what you did instead, so they can see the video is complete without it.
4. **What nobody has checked.** If you cannot hear, say that nobody has listened, give the
   measurements you relied on, and give the times worth a listen. If no expert in the subject
   and no real member of the audience has seen it, say so.
5. **What you decided for them,** each as one line they can overrule: assumptions in the brief,
   examples chosen, what the core leaves to the notes and what was left out entirely
   (unconfirmed, cannot be told fairly, does not bear on the main topic), and what is disputed
   and how the video words it. **Where the research stopped:** how many rounds, what the double
   check corrected, how many leads are still open, and the off-topic leads that were not
   followed. **Next videos:** each row of `research/next-videos.md` in a line (what it is, how
   it touches this topic, how much is already known, your view of whether it is worth a
   video), so they can choose the next one.
6. **What was spent** on paid services: how many items, how long, with which service. Mention
   licence terms you could not check.
7. **Where the files are:** the video, the publishing notes, the reviews. And what state the
   work is in (for example: nothing committed).

Leave out the story of how you got there, the list of every file touched, and praise of the
result. Do not ask "shall I continue?" about something you could simply have done.

**Decide and record, do not stop and ask.** While working, when a choice comes up that the
request does not settle, pick the option that keeps the promise of the brief, write it in the
brief with "(assumed)" or in the review file with the reason, and carry on. It reaches the
requester in point 5. Stop for an answer only when a wrong guess would waste most of the work,
or when the step cannot be undone or spends money nobody offered.

## 3. A new edition

A change to a video that was already exported and reviewed: the requester's comments, a
correction, a new example, new assets. The danger is to patch the three places they named and
export. Their comments are samples of what is wrong, not the full list.

**Before changing anything**

1. Write the comments into `brief.md` under "Editions", in the requester's words, with the date.
   Add each named service, example and remembered fact to "Asked for by name".
2. For each comment, name the **kind** of mistake (section 4) and search the whole video for the
   same kind. Write what you find in `review/lost-points.md` under a heading for the new edition.
3. Research what the edition needs: new examples, the facts the requester remembers
   (`research.md` section 8), anything a new line will claim. Research in rounds, as for a
   first edition (`research.md` section 3): a comment such as "this example lacks detail" means
   the research stopped at the outline, so open the leads ledger again, research the on-topic
   leads of that example (round 2), and double-check what the new lines will say (round 3).
   Then stop: an edition gets those two rounds, not an open-ended search. New notes go in the same research folder; `research/index.md` gets the
   new rows.
4. Check that the services they named can be reached (`voice-and-assets.md` section 10). Do it
   now, because the answer changes the plan.

**Change**

5. Update the mind map (new ideas, ideas that move from `cut` to `core` or to a detail), then the storyboard
   (new rows, the sound column), then the script. In that order: a chapter written straight into
   the script skips the questions the storyboard asks.
6. Keep what works. Do not rewrite lines that nobody found wrong; every rewritten line must be
   reviewed and recorded again.
7. After each chapter: `node tools/check.mjs <id> --strict`, then stills of that chapter.

**Review again**

8. **Accuracy rows for every new and changed line, before any export.** Write them under a
   heading for the new edition in `review/accuracy.md`; do not edit the old tables. On-screen
   text counts: a label is a claim. A story that grew gets an independent checker
   (`script-review.md` section 2).
9. **The diary again from the first changed line to the end** (`review/WhatIHaveLearned.md`,
   under a new heading). A new chapter changes what the viewer knows in every later one, and the
   recap must match what was actually taught, point for point.
10. **A new reader** on the whole narration, one that has not seen the earlier edition, and
    another on the core alone (`script-review.md` section 5).
11. **Line numbers have moved.** Adding one line renumbers all the later ones, so every `n12` in
    an old review now points at a different line. Leave the old sections as they are, say at the
    top of each file that it holds two editions, and in the new sections name lines by chapter
    and first words ("Six months later: 'Where does the wheat go?'").

**Produce**

12. Record the voice (only changed lines are recorded), make any new sounds, then stills.
    Look at every sheet that contains a changed line, and the sheets on both sides.
13. Export in the background, once, when you expect no more changes to lines. Then `frames`,
    the sound report and the mix report (`visual-review.md` section 7).
14. Update `review/visual.md` (new heading), `assets.md`, the credits, and `publish.md`:
    length, chapter times, the description, sources for the new examples, disclosure of new
    generated material, and every time mentioned in a checklist or a pinned comment.
15. The requester's-eye pass (section 1), then the hand-over message (section 2), led by the
    changes they asked for.

If a claim turns out wrong after an export has started, let the export finish or stop it, fix
the line, write the accuracy row, and export again. Do not hand over a file you know to be wrong
with a note about it.

## 4. What the requester's comments teach

A comment is evidence about the process, not only about one line. Turn each into a rule you
check everywhere, and write the rule in the "Patterns" list of `review/lost-points.md`.

| They say | The kind of mistake | Look for it everywhere |
| --- | --- | --- |
| "I expected X to happen here." | An unanswered guess. | Every step where goods, money, people or data go somewhere: is it where a newcomer would expect? |
| "This part confused me." | A step the script took silently, or two ideas in one line. | Every "so" and "that means"; every line with two numbers. |
| "There are no real examples." | Everything real was cut to save time. | The mind map: how many `cut` nodes are real events? Bring them back. |
| "This example lacks detail." | The core told the story thin (no people, date, means, ending or link to the topic), or the requester wants more of this one story. | Every real story in the core: does it have its essentials and its link to the main topic? Add those. If they want more of one story, offer a longer version from the notes, or that story as its own video (`next-videos.md`); the full account in this video only if they confirm (`deep-layer.md`). |
| "Did that story really have to do with the topic?" | An example that sits near the topic but does not show it at work. | Every real story: the example test (`research.md` section 3). Take out each one that fails, with the reason in the message; it may be a next video. |
| "I remember that …" | A lead that needs checking. | Every fact they state, including the ones that sound right. |
| "Use this service / this key." | An asset plan made without asking what was available. | Every asset in `assets.md`: could the named service make it better? |
| "Music here, but not everywhere." | No sound plan. | Every chapter: event sounds, story parts, and silence that is meant. |
| "It is too long / too slow here." | A chapter without a point, an example repeated, or material the promise does not need. | Each chapter's last line: is it the point? Does the promise, a story's essentials or fairness need each part? The rest goes back to the notes. |
| "The voice says it wrong." | A pronunciation not tested. | Every name, number and abbreviation in the narration. |
| "Can it also …?" | A promise wider than the brief. | The brief: change the promise, or say what is out of scope. |

If the same kind of comment could apply to any video, not only this one, it belongs in your
working method: tell the requester you will check for it from now on, and do.

## 5. Common ways to finish badly

- **Patching only what was pointed at.** The comment about one confusing step usually has two
  or three relatives elsewhere.
- **Repeating what the requester remembers.** They asked for a true video. Agreeing with a
  half-right memory puts their name on a mistake.
- **Dropping what the requester remembers.** If the sources do not support it, say so in the
  message. Silence looks like you ignored them.
- **Stopping because a service was missing.** The video can nearly always be finished without
  it. Finish, prepare the missing step, report.
- **Pretending a service was used.** Never describe drawn pictures as generated, or measured
  sound as listened to.
- **Music everywhere because music was allowed.** "Suitable in some parts" means the story
  parts. The share under music belongs in the message.
- **Making the full account by default.** A video several times the core's length, most of it
  about neighbouring stories, costs the research of several videos and the requester's time to
  cut it. Make the core; list the rest as notes and next videos.
- **A short video from short research.** The core is chosen well only by someone who knows one
  level more than it says, and the next video is found only there.
- **A longer version with no handles.** Twenty more minutes with no named details and no list
  forces the requester to read the script to shorten it.
- **Exporting before the new lines were checked.** One wrong figure costs a whole export.
- **Old line numbers in new reviews.** A reviewer following `n31` after an edit reads the wrong
  line and finds nothing.
- **A recap that no longer matches.** A new chapter adds a point; the recap and every note that
  counts the points must follow.
- **A message that reports effort.** The requester needs the result, the corrections, the open
  points and the files.

## 6. Done

- [ ] Every row under "Asked for by name" in the brief is used, corrected with a source, or
      reported as not possible, with the way to make it possible.
- [ ] The nine questions of section 1 are answered in `review/lost-points.md`, and none is "no".
- [ ] The video is at core length; each real story in it has its essentials and its link to
      the main topic; each neighbouring subject is a row of `research/next-videos.md` and a line
      in the message. (A longer version asked for: its details are listed with lengths in
      `details.md` and in the message.)
- [ ] A reader who had not seen the script found no unanswered guess in the final narration.
- [ ] Every new or changed line has an accuracy row, written before the last export.
- [ ] The sound report and the mix report are in `review/visual.md`, with "measured, not heard"
      if nobody listened.
- [ ] `publish.md` matches the exported file: length, chapter times, credits, disclosures.
- [ ] The hand-over message has the seven parts of section 2 and asks nothing you could have
      decided.
