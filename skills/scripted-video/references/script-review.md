# Script review

Two reviews of the words and the plan, before any time is spent on voice and export: **is it
true and is it all there**, and **can a first-time viewer follow it**. They are separate passes
with separate outputs. Do the accuracy review first, because a fix for accuracy often changes
the wording that the comprehension review then has to read.

The accuracy review looks in both directions. From the script to the sources: is each claim
supported? And from the sources to the script: what do the notes hold that the video does not
tell? A video that is correct and thin fails as surely as one that is wrong.

Review the **dump**, not the source file. The source is in the order it was convenient to write;
the dump is in the order a viewer meets it.

```
node tools/check.mjs <id>              fix everything it reports first
node tools/dump.mjs <id>               the video in watching order: lines, cards, on-screen text, pointers
node tools/dump.mjs <id> --claims      a table of everything said and shown, to check against sources
node tools/dump.mjs <id> --quotes      spoken quotations that the research notes do not hold word for word
node tools/dump.mjs <id> --figures     figures said or shown that are not in the research notes as written
node tools/dump.mjs <id> --text        the narration alone
node tools/dump.mjs <id> --details     the parts the requester can delete, with their lengths
node tools/dump.mjs <id> --text --omit all    the core alone: the narration with every detail removed
```

## Contents

1. Review 1: accuracy
2. The independent checker
3. Review 2: comprehension
4. The learner's diary
5. Reading the core alone
6. The lost-points list
7. Fixes for a viewer who could get lost
8. Reading it aloud
9. When to use a separate reviewer
10. Done

## 1. Review 1: accuracy

Output: `notes/<id>/review/accuracy.md`.

1. Run `node tools/dump.mjs <id> --claims` and paste the table into the file. It has a row for
   every spoken line, every text on screen and every chart, with the risky ones marked "check
   first": numbers, names, and strong words (*always, never, only, because, causes, proved*, and
   superlatives used as claims: *the first, the biggest*). List labels ("1.") and codes ("4F2C")
   are not counted as numbers.
2. **For each row, find the research note and heading that supports it** and write it in the
   Source column. Open the note and read the claim there; do not work from memory. Verdicts:
   - **ok**: the research says this, with a confidence of *confirmed* (or *single source* and
     the wording is careful).
   - **fix**: wrong, out of date, stronger than the source, or misleading.
   - **simplified**: not the whole truth, on purpose. Record it in the simplifications table.
   - **cut**: cannot be supported. Remove it or research it.
3. **A row with no source is not "ok".** Either the research has a gap (go back and fill it,
   adding to the notes) or the script says something nobody checked.

   **Two lists come ready-made.** `dump --quotes` compares every spoken quotation of four words
   or more with the research notes, and `dump --figures` every figure said or on screen, number
   words included ("two point eight million" is 2800000). What they list is not in the notes as
   written. Figures of one or two digits are compared with the word beside them ("6 times") and
   listed apart: most come from invented examples or labels; check those that are claims about
   the world. Take each item to
   the note it came from and give it one of these verdicts in the file:

   | The list shows | Verdict |
   | --- | --- |
   | A quotation with a word changed, dropped or added | **fix**: copy it again from the note, or take the marks away and report it. |
   | A recollection or a summary inside quotation marks | **fix**: reported speech, with whose account it is. |
   | A name written out where the note abbreviates ("and Company" for "& Co") | **ok**, said so. |
   | A figure rounded from the note's | **ok** if the line says *about*, *nearly* or *more than* and rounds the right way. |
   | A sum, a difference or a conversion made while writing | Put the working in the note, marked as yours; then **ok** or **fix**. |
   | Digits swapped, a wrong unit, a year one out | **fix** from the note. |
   | Nowhere in the notes | **cut**, or find the source and add it to the note. |

   An empty list does not mean the script is right: a figure can be in the notes and sit on
   the wrong thing in the script. Run both again after every revision; they take seconds.
4. For each claim, test it against these:

| Check | The usual failure |
| --- | --- |
| Number, unit, date | "365.25" became "365"; millions became billions; a 2019 figure is said as if current. |
| Strength | The source says "about", "some", "in one study", "is linked with"; the script says "is", "all", "causes". |
| Scope | True in one country, one period or one case; said as if general. |
| Shelf life | Will it be true in a year? If not, say or show the date. |
| Superlatives | "The first", "the largest", "the only": each needs a source that says exactly that. |
| Cause | "Because" needs a mechanism in the research, not two things happening together. |
| Quotes and attributions | Exact words, the right person, a source that is not a quotation site. |
| Sums | Redo every sum in the script by hand. The viewer will. |
| Names and spellings | People, places, organisations, as they write themselves. |
| Definitions on word cards | Short enough to read, and still true. A wrong definition is the most-remembered error a video can make. |
| The moment | A price, a rate or a count is given for the wrong moment: a day's closing price said as its lowest, "by two o'clock" for something done later that afternoon, a year-end figure said as the figure on the day. |
| The measure | Two numbers are compared, added or drawn on one chart, and they do not measure the same thing (a loss and a size of position; a total and a share; one bank's count and another's). |
| Who says so | The voice says "one inquiry estimated" and the text on screen states the number flat. An attribution or a hedge must be in both, because many viewers only read. |
| What a document said | The date and the author are right, and the script gives it the content of a later document. Read the passage, not the note's summary of it. |
| Reported speech | Words nobody recorded are told as a quotation. Say "reported", or say who remembers them. |
| What the writer added | A cause, a motive, a comparison ("three hundred times the limit"), a "record" or a "first" that reads well and is in no source. Remove it. |

5. **Check the pictures.** A picture claims things too: relative sizes, distances, order,
   direction, proportion, what touches what. A diagram that is "not to scale" should say so, in
   the voice or on screen, when scale could mislead. A chart's bar heights must match its
   numbers and its axis must start at zero. Look at the stills for this part.
6. **Check the comparisons.** For each analogy, push it one step further than the script does.
   If the next step teaches something false, the script must say where the comparison stops, or
   use another.
7. **Check the simplifications.** A simplification is acceptable when a viewer who later learns
   more will say "that was a fair first version", not "that was wrong". Words that keep a
   simplification honest: *about, roughly, usually, mostly, one reason, in simple terms*.
8. **Check the other side.** Read the research's "Other views" sections. The default is that
   the strongest objection and the commonest myth are **said** in the core, and the rival
   figures are named where the main one is given (whose count it is). Where
   one is not said, the script must be worded so that it stays true in spite of it. Write
   which, in the review. A story in which someone wins must give the risk they ran and what
   would have happened had it gone the other way, in the core, not only in a detail.
9. **Check what is not there.** Do the pass against the script (`research.md`, section 10):
   go through each note heading by heading and list what the video does not tell. For each item
   ask whether the core needs it: to keep the promise, to tell a real story with its essentials
   and its link to the main topic, or to stay fair. If so, bring it in; if not, it stays in the
   notes (description, a longer version on request, a next video). It is out of everything only
   when it is unconfirmed, cannot be told fairly, does not bear on the main topic, or the brief
   rules it out.
10. **Sensitive subjects** (health, money, law, safety, living people, children): mark every
   claim that could lead a viewer to act, and tell the user these need a qualified person's
   sign-off. Add the usual statement ("this is general information, not advice") where the
   subject calls for one. Do not present a personal opinion, a forecast or a disputed view as a
   fact.
11. Fix the script. Record each change in "Fixes made". **Fix the research note too** when the
    note was the source of the error, with a line saying what was corrected and when: the next
    edition is written from the notes, and an uncorrected note brings the error back. Run
    `check` again, and regenerate the claims table if lines were added.

**Every new line gets its row before the next export.** When lines are added or reworded
later (after a review, or for a second edition), write their accuracy rows first, each one
read against its source, and only then record and export. Writing the row is what finds the
error: "more than all the money the bank had" looks fine in a script and fails the moment you
put the source's sentence beside it. A row written after the export costs a second export.

**Name a line by its chapter and its words, not by its number.** The kit numbers lines in
order (`n1`, `n2`, …), so inserting one line renumbers every line after it, and a review that
cites `n46` then points at a different sentence. In review files write `chapter 5, "The wheat
buyer pays today's price"`; a few words are enough to search for. Use line ids only inside one
sitting, or give lines fixed ids from the start (`v.say(text, { id: 'wheat-buyer-pays' })`).

## 2. The independent checker

The author checks each claim against notes the author wrote. An error in a note passes straight
through that check, and so does everything the author decided, while writing, was not worth
telling. A checker who did not write the script finds both.

**Use one for every real story** (a named event with people, dates and amounts) and for any
chapter that makes more than about twenty factual claims. One checker per story, so that each
has room to go deep. A sub-agent or a second session will do; if you cannot start one, do the
check yourself after other work, from the claims table, and say in the review that the check was
not independent.

Give the checker:

- the claims for that story: the rows of `node tools/dump.mjs <id> --claims` for its chapters;
- the research notes for the story, with their source lists;
- the instruction to **open the sources**, the original documents first (the inquiry report, the
  central bank's own account, the court record, the exchange's rule book), and not to trust the
  notes;
- nothing about what you expect: no verdicts of yours, no "this part is solid".

Ask for five lists, each item with the script's words, the source's words and where they are:

1. **Wrong.** The source says something else.
2. **Stronger than the source.** A hedge dropped, one source's figure said flat, an attribution
   lost, a cause or a comparison added.
3. **Wrong in the note.** The note itself misreads its source. (These are the ones the author's
   own check can never find.)
4. **True, important and missing.** What the notes or the sources hold, that a viewer of this
   story would want, and that the script does not tell. In order of importance.
5. **Said one way and shown another.** The voice and the text on screen disagree, or only one
   of them carries the hedge.

```text
You are checking one part of a teaching video against its sources. You did not write it.
Attached: (1) every claim the video makes about <the event>, spoken and on screen;
(2) the research notes it was written from, with their sources.
Open the sources yourself, original documents first. Do not trust the notes.
Report five lists: wrong; stronger than the source; wrong in the note; true, important and
missing from the video; said one way and shown another. For every item give the video's words,
the source's words, and the place in the source (page, paragraph or address).
Say plainly what you could not open. Do not rewrite the script.
```

What comes back is a list of findings, not of verdicts. For each one, open the source yourself.
Then:

- fix the script, and write the accuracy row for each new or changed line;
- fix the note, under a line such as "Corrected by the accuracy check, <date>";
- bring into the core what the "missing" list shows it needs (a story's essentials, its link to
  the main topic, a fairness point); the rest stays in the notes;
- keep the checker's report as `review/accuracy-<story>.md`, with what you did about each item,
  and link it from `review/accuracy.md`.

In one job, two checkers on two stories that the author had already reviewed found between them
a closing price given as the day's low, a rate described for the wrong hour, a memo credited
with a warning that a different person gave two years later, a chart whose bars were not all
the same kind of number, and a long list of facts worth telling that the script had left out.

## 3. Review 2: comprehension

The default viewer is an 8-year-old meeting the subject for the first time, addressed in wording
an adult would not find childish (see `writing-for-everyone.md`). If the brief names another
viewer, use that one, but keep the method.

The author of a script cannot easily see where it is unclear, because the author already knows
what it means. The two documents below are ways of forcing the knowledge out of your head:

- the **learner's diary** follows what the viewer knows, step by step;
- the **lost-points list** looks at each line for ways to go wrong.

Write the diary first: it finds the missing steps. Then the list: it finds the smaller traps.

## 4. The learner's diary

Output: `notes/<id>/review/WhatIHaveLearned.md`.

Become one viewer from the brief, who knows what the brief's "knows for certain" list says and
nothing else. Go through the dump from the top, **one item at a time, in order, without reading
ahead.**

1. **Before pressing play:** write what this viewer knows. Be strict. An 8-year-old knows days,
   years, the Sun, adding small numbers; not "orbit", "percent", "interest", "data".
2. **For each chapter,** after reading its lines and looking at its stills, write:
   - **What it taught me, in my own words.** Not the script's words. If all you can do is repeat
     the line, it has not been understood, only heard.
   - **New words,** what I think each means, and how I was told (a word card, or only in
     passing).
   - **What I can do now** that I could not before.
   - **Where I got lost.**
3. **At each line, ask: do I have what this line needs?** Every line stands on earlier ones. Find
   the earlier line for each thing it relies on: a word, a number, a fact, a picture. If you
   cannot point to it in the diary so far, the viewer does not have it.
4. **At each "so", "therefore", "that is why":** can the viewer make the step themselves from the
   diary so far? Write the step out. A step that feels too obvious to write is the one that is
   missing.
5. **At each pause-and-think:** answer the question using only the diary. If you cannot, the
   question is unfair or the teaching before it is incomplete. Then check in the dump that the
   viewer is told a question is coming (a line such as "Here is a quick quiz."), that the
   question is read aloud (a `SAY` line under the `QUIZ CARD`), and that nothing is said during
   the thinking time. A question that is only on screen is lost on anyone who is not reading.
6. **At each number:** where did the viewer first see it? A number that appears in a sum must
   already be in the diary.
7. **At the end:** do what the promise says, without looking back. Then write the three things
   this viewer would tell a friend. If those three are not the video's main points, the
   emphasis is wrong.

Rules:

- **Never use knowledge the video has not given.** This is the whole method. When you notice
  yourself filling a gap from your own knowledge, that is a finding: write it down.
- **A word not taught is a word not known,** however ordinary it seems to an expert.
- **Fix the script, then rewrite the affected diary entries.** The finished diary describes the
  video as it now is, with a table of the fixes made and a short list of anything still open.

A good diary entry looks like this:

```markdown
## Chapter 2: The leftover hours

**What it taught me:** The Earth needs a bit more than 365 days to get all the way round:
about 6 hours more. Our calendar ignores those hours, so each year it finishes a little early.

**New words:** none.

**What I can do now:** Say why the calendar and the Earth do not match.

**Where I got lost:** Line n9 says "a quarter of a day". I was told "6 hours" two lines ago and
nobody told me those are the same thing. → Fixed: n9 now says "six hours, a quarter of a day"
and the picture shows a day split in four.
```

## 5. Reading the core alone

Only for a longer version with details (`planning.md`, section 3): it is handed to someone who
may delete any detail, or all of them, so the core is reviewed as a video of its own. A video
that is only the core is reviewed by sections 2 to 4.

```
node tools/check.mjs <id> --strict --omit all     the core must pass every check alone
node tools/dump.mjs <id> --omit all               the core in watching order
node tools/dump.mjs <id> --text --omit all        its narration
```

(`check` has already built the video without each single detail; this reading is about sense,
which no tool can test.)

Give the core, with the brief, to a reader who has not seen the full version, and ask for a
diary under the rules of section 4, plus every place where:

- a line leans on something that is not there: "as we saw", a person with no introduction, a
  number from nowhere, a word whose card was in a detail;
- a real story has lost its beginning, its turning point, its end, or what it teaches;
- a story of winning no longer says what the winner risked;
- a chapter is left with one or two lines, or a heading with nothing under it;
- the recap names a point that only a detail taught;
- music starts or stops on a line that is gone.

Then read the full version for the opposite fault: a detail that repeats the core as if the
viewer had not just heard it. A detail that tells the same days again in more depth must say so
("Now the same week again, day by day"), or the viewer thinks the story has started over.

What this reading usually finds, and the fix:

| Finding | Fix |
| --- | --- |
| A person, a word or a number first appears in a detail and is used later in the core. | Introduce it in the core, in one line; the detail adds the rest. |
| The core gives two figures for one thing, and only a detail explains the difference. | One main figure in the core, with who counted it. The rival counts, and why they differ, in a detail. |
| The lesson or the risk of a story is in a detail. | Move it to the core and to the recap. |
| The core says "ten warnings" and the detail lists them. | Good: that is the pattern. The core gives the count and the strongest one; the detail gives them all. |
| With every detail gone the story is three sentences. | The core is too thin. A core tells each real story in about ten to twenty lines: who, when, what they did, how it turned, how it ended, what it shows. |

Record the result in `review/lost-points.md` under "The core alone": the length of the core,
who read it, what they found, what was changed.

## 6. The lost-points list

Output: `notes/<id>/review/lost-points.md`.

Go through every line again, in order. For **each** line, list **every** way a first-time viewer
could misunderstand it or fall behind, including unlikely ones, then decide what to do about
each. Listing first and judging second matters: a reviewer who judges while reading stops
noticing.

Ask of each line:

| | Question | Typical finding |
| --- | --- | --- |
| 1 | **Words:** is any word untaught? Does any word have a second, everyday meaning? | "Yield" (also means "give way"); "interest" (also means "curiosity"). |
| 2 | **Needs:** what must the viewer already know? Where was it taught? | The line uses "the extra six hours" but the six hours were only shown, never said. |
| 3 | **Pointing:** do "this", "it", "here", "they" pick out exactly one thing? | Two boxes on screen, and "this one" with no ring. |
| 4 | **Load:** more than one new idea? A number with no picture? A sum in the head? | A new word and a new number in the same line. |
| 5 | **Eyes:** where is the viewer looking when this is said? Is that where the point is? | A chart appears on the right while the voice talks about the text on the left. |
| 6 | **Speed:** is there time to read what is on screen, and to think, before the next line? | A twelve-word label shown for two seconds. |
| 7 | **Wrong picture:** what false idea could the picture or the comparison plant? | The orbit drawn as a long oval suggests seasons come from distance. |
| 8 | **Why care:** does the viewer know why they are being told this? | A definition with no sign yet of what it is for. |

Further things to look for across the whole script:

- **The same thing under two names,** or two things under one name.
- **A gap in time:** a term introduced in chapter 1 and next used in chapter 4, with no reminder.
- **A change that is easy to miss:** a label that swaps, a value that updates in place.
- **A question the viewer will certainly ask** that the video never answers. Answer it, or say
  that it is for another time.
- **A guess the viewer will certainly make** that the video never mentions. After each line
  ask "what do I now expect to happen?" (where the thing goes, who pays, how it ends). If the
  truth differs, the guess must be said and answered (`teaching-techniques.md` section 5).
  The author cannot see these: the author knows where the wheat goes.
- **An unearned "so".** For each "so", "that is why", "this means": can the viewer say who
  does it and why, from the two lines before?
- **A pair of lines that seem to contradict.** Read each line against every earlier line about
  the same thing. A fix made in one place often creates one of these in another.
- **Is anything in it real, and told with its essentials?** A video about the world with only invented
  people and round numbers needs a real, dated event (`teaching-techniques.md` section 6). A
  real event told in a few lines needs its people, date, means, amounts, ending and link to the
  main topic from the notes.
- **Many people in one story.** Each person is introduced at their first action, with their
  role in plain words ("the bank's head of dealing in London"), and the role is repeated when
  they return after a gap. Two people with similar jobs or similar names need a line that tells
  them apart. On a board of people, the label is the name and the row says what they did.
- **Many numbers for one thing.** The viewer keeps one. Say which is the main one and whose
  count it is; give the others together, in one place, with the reason they differ.
- **A row that changes its words.** When the text of a row is replaced as the story moves on,
  the new text must still carry the row's main fact. A viewer who looks up late sees only the
  last version.
- **A stretch with no rest:** more than about 40 seconds of new material with no pause, recap or
  example.
- **Too many terms:** count the word cards. More than about one a minute is too many.
- **Things only an adult knows:** percentages, negative numbers, large numbers, dates in history,
  how money and institutions work, idioms, irony.
- **Sound-off:** read only the captions and look at the stills. Does it still work?
- **Picture-off:** read only the narration (`--text`). Does it still work?

End the file with **patterns**: the problems that came up more than once. They are what to watch
for while writing the next script.

**The patterns are a checklist for every later change.** A problem you fixed comes back in
every new chapter, because new lines are written from the research in the research's words:
the untaught word you removed ("trader"), the adult way of saying a number, the heading that
uses a word before its card. Before anyone reviews a new or rewritten chapter, search it for
each pattern on the list (`node tools/dump.mjs <id> --text | grep -n -i "trad\|grain"`).

## 7. Fixes for a viewer who could get lost

Choose the lightest fix that works.

| Problem | Fixes, lightest first |
| --- | --- |
| An untaught word | Use a plain word instead · explain it in the line · give it a **word card** (always, if the viewer will need the word again or meet it elsewhere). |
| A missing step | Say the step, as its own line · show it as its own picture. |
| "It" or "this" unclear | Repeat the noun · ring the thing. |
| Too much in one line | Split the line · move one idea to the next shot. |
| The eye is in the wrong place | Point (ring, arrow, spotlight) · remove the thing that is pulling the eye · bring elements in one at a time. |
| Too fast | Add a `beat()` · lengthen the gap · shorten the on-screen text · slow the voice for this line (`voice: { rate: 0.9 }`). |
| A number means nothing | Add a comparison · show it as a picture (a count of things, a bar). |
| A sum is taken on trust | Show it step by step · let the viewer try first (pause-and-think). |
| A question is shown but not read aloud, or arrives with no warning | Use `v.think()`: the narrator says a quiz is coming, reads the question, then is silent. |
| A change went unnoticed | Bring the new value in as a new element · highlight it · show before and after side by side. |
| An earlier idea is needed again | A half-line reminder ("remember the six extra hours") · bring its picture back. |
| A long stretch of new material | A summary line ("so far: …") · a pause-and-think · a chapter break · move what the promise does not need back to the notes. |
| A real story told thin | Add its essentials from the notes: the people by name and role, the date, the exact means, the amounts, the turning point, how it ended, and how it relates to the main topic. |
| A story told twice (a short version, then a long one) | Announce the second telling ("Now the same week again, day by day") and give it its own chapter. |
| A figure that sounds certain and is one count among several | Say whose count it is, on screen as well; put the other counts in a detail. |
| A comparison could mislead | Say where it stops · choose another. |
| The viewer may not know why this matters | Move the question or the problem earlier. |
| A wrong idea the viewer probably holds | Name it neutrally and show the case that breaks it. |
| A sensible guess the video walks past | Say the guess as the viewer's own, draw it as a guess (dashed, with "?"), answer it with a reason, show what happens instead in the same picture, then ask a quiz that uses it. |
| A "so" that is not earned | Add the line that names who does it and why · show the money, the thing or the arrow moving. |
| Two lines that seem to contradict | Reword the first so it leaves room ("no wheat is kept there") · join them ("but only …") · cut one. |
| Nothing in the video really happened | Add one true, dated story after the mechanism; if it is a success, add a failure beside it. |

**The word-card rule.** Every term the viewer is expected to know afterwards gets a word card:
the word, large, in the centre of the screen, with a short meaning in plain words, shown while
the voice says the meaning and while nothing else changes. In the kit: `v.term(word, meaning,
line, { say })`. The checker reports a term spoken before its card, a card that is up too
briefly, anything changing behind a card, and two cards close together.

More ways to help a viewer keep up are in `teaching-techniques.md` section 7.

## 8. Reading it aloud

Read the whole narration aloud at speaking pace (or listen to a draft voice: `node tools/tts.mjs
<id>` with the free voice, then the live player). Mark every place where you:

- stumble or run out of breath (the line is too long or badly ordered);
- hear a word that could be mistaken for another (rewrite; captions will not save a listener);
- hear the same word three times in two lines by accident, or a rhyme, or a tongue-twister;
- notice a number that is hard to say (write it the way it should be spoken, and give the
  caption digits);
- feel the pace is even throughout (it should slow down at the hard part).

## 9. When to use a separate reviewer

A reviewer who did not write the script, and who is given only the dump and the brief, finds
more than the author can. If you can start a sub-agent or a second session, use one for the
comprehension review:

- Give it the brief (the viewer and the promise), the output of `dump`, and the stills. **Do not
  give it the research notes, the mind map or the script source:** it should know only what a
  viewer would.
- Ask it to write the learner's diary under the rules in section 4, and to list every point
  where it had to guess.
- **Ask it to explain the promise back, in its own words, and to mark each answer it is unsure
  of.** A reader can recite a step and still not know why it works, and a shaky answer points
  straight at the missing "because". In one video about how a shared record resists cheating,
  the first reader could say "change an old page and the next page stops matching" but not why
  a cheater could not simply redo the later pages: the script had never tied the costly step to
  the check it protects. The second reader, after that fix, could not say why the faster copy
  wins: the rule that decides between two copies had never been said. Both gaps were one line
  each, and no checker would have found them.
- A second reader gets the core alone (section 5). If the video has deep details, a third gets
  the core and the first layer (`dump --text --omit deep`): that version must be whole too.
- For the accuracy review, do the opposite: give a checker the claims table, the research
  notes and leave to open the sources (section 2).

Treat what comes back as findings to check, not as verdicts.

**Use a new reader after every substantial change, not only once.** "Substantial" means a
rewritten chapter, a new chapter, or a changed explanation of a core idea. After your own
rewrite you will believe the chapter is fixed; you are again the author and again blind. In
one job, a first-time reader of two rewritten chapters found three serious problems, two of
them created by the rewrite itself. Give the new reader only the changed chapters with the
chapter before them, the brief and the stills, and ask for a diary and a list of every guess
they had to make. A reader who read an earlier version already knows too much: start a new
one. If you cannot start one, do the diary yourself a day's worth of other work later, from
the dump only, and say in the review that no independent reader was used.

## 10. Done

- [ ] `check` reports no errors and no warnings (or each remaining warning is explained in the
      review).
- [ ] Every row of the claims table has a source and a verdict; nothing is left as "fix" or
      "cut".
- [ ] Each real story has been checked by someone who did not write it, against the sources;
      every finding is fixed or answered, and the notes are corrected as well as the script.
- [ ] The pass against the script is done: what the research holds and the video does not tell
      is listed, and each item is in the core, stays in the notes, is a next video, or has its
      reason to stay out. A deep layer, if the requester asked for one, has passed the list at
      the end of `deep-layer.md`.
- [ ] Every attribution and hedge that the voice gives is on screen too.
- [ ] Simplifications are listed, each with the reason it is fair.
- [ ] The diary reaches the promise without outside knowledge.
- [ ] Every line has a row in the lost-points list; every finding is fixed or explained.
- [ ] Every term has a word card, and the viewer can say each meaning in their own words.
- [ ] Each sensible guess a viewer would make is said and answered; each "so" is earned.
- [ ] Something in the video really happened and is told with its essentials and its link to
      the main topic (unless the brief rules it out); a real gain has its risk said, and a real
      loss beside it.
- [ ] If there are details: the core passes `check --strict --omit all`, and a reader who saw
      only the core could follow it and reach the promise.
- [ ] Anything the requester stated as a fact has a verdict, and the video follows the sources.
- [ ] After the last substantial change, a reader who had not seen the script read it.
- [ ] The narration has been read aloud once after the last change.

After the script changes for any reason (a fix from the visual review, a late fact), re-run the
parts of both reviews that the change touches. A fix is new material.
