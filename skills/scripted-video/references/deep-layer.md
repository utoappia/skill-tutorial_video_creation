# The deep layer: the full account of a story, on request

**This layer is made only when the requester asks for it.** The default video is the core, and
the research stops at the depth of a detail (`research.md`, the start). Read this file when the
requester has seen the core and asks for the full account of a story ("the detail is lacking",
"tell me everything about that bank"). Before you start, offer that story as a video of its own
(`research/next-videos.md`): the full account is mostly about the story, not the main topic. On
the job this file was written from, the deep layer turned an 18-minute core into a video of
nearly six hours, most of it not about the main topic, and the requester then chose the core.
If they still want it in this video, the rest of this file says how.

The answer is a third layer of the video, the **deep details**, and a way of working that
proves, by counting, that nothing the research found was dropped on the way. The work is too
large for one writer and too easy to get wrong for the writer to check alone, so this file is
mostly about dividing it: who writes, who counts, who checks, and what each is told.

## Contents

1. Three layers, and how each is deleted
2. The counted pass: what the research holds and the video does not tell
3. Deep details as data
4. Writing the deep layer: one writer per file
5. Checking it before anything is recorded
6. The closing check
7. Revising after the checks
8. Limits, and saying where the work stopped
9. What went wrong when this was first done
10. Done

## 1. Three layers, and how each is deleted

| Layer | What it is | Leans on | Deleted with |
| --- | --- | --- | --- |
| **Core** | The shortest telling that keeps the promise and is true and fair. | Nothing. | Never. `--omit all` shows it alone. |
| **Detail** | One further question answered: who these people were, the day hour by hour, what it cost. Thirty seconds to three minutes. | The core. | Its name: `omit: ['1995-the-warnings']`. |
| **Deep detail** | Everything else the research holds on something a detail tells: each warning in full, each figure with who counted it, what came of it for each person, each dispute with both sides. One to four boards. | The detail it follows, and the core. | Its own name; or its parent's name (it goes when the parent goes); or all at once: `omit: ['deep']`. |

A few deep details ask a **new question** that no first-layer detail raises ("Has it happened
again?", "Was the price too high from the start?"). Mark those `alone`: they lean on the core
only, and stay when the detail they follow is deleted.

The kit (`authoring-kit.md`, section 12):

```js
v.detail('1995-the-warnings-in-full', () => { … },
  { about: 'Each of the ten warnings: who gave it, the day, the words, and what was done',
    deep: true, within: '1995-the-warnings' });
```

- `deep: true` puts the detail in the second layer of the list (`dump --details`) and under the
  name `deep` in `omit`.
- `within: 'name'` says it builds on that detail (declared before it) and goes when that one
  goes. Leave it off for an `alone` deep detail.
- `check` builds the video without each detail, without the deep layer, and without all details,
  and fails if any of those versions breaks.

**The three versions are three videos.** With all layers, one event can run to an hour or more
and the whole video to several hours. Say so before you start, and make sure that is what the
requester asked for. Tell them the length of each version in the hand-over, and export the version without the
deep layer too if they may want something to watch first: `export --omit deep` writes
`out/<id>.no-deep.mp4` beside the full file, and `export --omit all` writes `out/<id>.core.mp4`.
The full recording serves all three (a line's recording is found by its words when leaving
details out has changed its number), so nothing is recorded again.

## 2. The counted pass: what the research holds and the video does not tell

`research.md`, section 10, describes the pass against the script. For a real event it must be
**independent and counted**, because the writer's own pass under-reports: the writer believes the
script tells what the writer meant it to tell. In one job the writer's index said "nothing was
left out for length alone"; an independent pass then listed 446 facts in two notes that the
script did not tell.

Start one agent per real event. It gets the note and the spoken text, and nothing else:

```text
Compare a research note with the spoken text of a video, and list every fact the note holds
that the video does not tell. You did not write either.

The note: <path>. The spoken text, with line numbers: <path> (made with dump --text).
The list of details the video has: <path to details.md>.

Go through the note heading by heading: every heading, in order, none skipped. For each, write
one table row:
  note heading | the video: tells it / in a few words / does not use it (with line numbers)
  | in the note and not in the video: each fact or small group of facts with a letter (a), (b)…,
    its source numbers, and the note's own label for how sure it is
  | a decision for each letter.
The decision is "bring in → <the detail it belongs after>", or "bring in → new question: <the
question>", or "stays out: <reason>". The only reasons to stay out: unconfirmed (search summary
only, general knowledge, not found); disputed in a way that cannot be told fairly; says the same
as something already told; no bearing on the main topic; needs an idea this viewer cannot be given.
Length is not a reason.

Then a second table, the other way: every line of the video that states a fact the note does
not support (a number, a date, a name, a cause, a quotation), with the line and what the note
has instead.

End with counts: headings covered; facts missing; bring in; stays out, by reason; lines the
note does not support. Do not rewrite the script. Do not use your own knowledge of the subject.
```

Keep the result as `review/coverage-<story>.md` and put its counts in `research/index.md`. The
letters are the handles for everything after: a writer's row names the letters it carries, a
checker can find the passage, and at the end every letter is either in a row or in a list of
facts left out with the reason.

The second table is as valuable as the first. Lines the note does not support go to the closing
check (section 6) and to the author of the main script.

## 3. Deep details as data

Deep details are many, alike, and written by several hands. Keep them out of the script file:
one **data file** per stretch of the story, in a folder beside the script
(`videos/<id>/deep-<part>.mjs`), each exporting a list.

```js
// videos/moon/deep-landing.mjs
export default [
  {
    after: 'moon-the-alarms',            // the first-layer detail this one follows and builds on
    detail: 'moon-the-alarms-in-full',   // a new name: the story, then a few words
    about: 'Each computer alarm of the landing: the minute, the code, who answered, and why it was safe',
    boards: [
      {
        head: 'Five alarms in four minutes',          // 45 characters at most
        labelW: 300,                                  // width of the label column, if not the usual
        rows: [
          // [label, text on screen, spoken line, spoken line, …, { src, then? }]
          ['20:10 UTC', 'First alarm: code 1202',
            'The first alarm came about {five minutes|5 minutes} before the landing.',
            'Its code was {twelve oh two|1202}.',
            { src: '03 §4.2 a, b' }],
        ],
      },
    ],
  },
  { after: 'moon-afterwards', detail: 'moon-was-it-luck', alone: true, about: '…', boards: [ … ] },
];
```

- **`src` on every row** names the note, the section and the letters from the counted pass. It
  is not shown. It is what lets a checker go from a spoken line to the passage it rests on in
  one step, and what lets you count.
- Rows use the board format of `authoring-kit.md`, section 13: a label, a few words on screen,
  one to three spoken lines, numbers as `{spoken words|digits}`.
- Limits to give every writer: six rows to a board; text on screen 70 characters; label 28;
  heading 45; sentences of 18 words at most; a row of three or more lines changes its words
  (`then`).

The script places them with one helper. Each deep detail comes straight after the detail it
follows, as a chapter of its own, so a viewer can jump to it or past it:

```js
import landing from './moon/deep-landing.mjs';
import afterwards from './moon/deep-afterwards.mjs';
const DEEP = [...landing, ...afterwards];
const placed = new Set();
let resume = null;                       // set when deep details have just been shown

function deep(after) {
  for (const d of DEEP.filter((d) => d.after === after)) {
    placed.add(d);
    const shown = v.detail(d.detail, () => {
      let lines = Infinity;
      d.boards.forEach((b, i) => {
        if (lines >= 30) { v.chapter(b.head); lines = 0; }      // a long one gets a second chapter
        lines += b.rows.reduce((n, row) => n + row.slice(2).filter((x) => typeof x === 'string').length, 0);
        board(`${d.detail}${i ? ` ${i + 1}` : ''}`, b.head, b.rows);
      });
      return true;
    }, { about: d.about, deep: true, ...(d.alone ? {} : { within: d.after }) });
    if (shown) resume = true;
  }
}
// Call deep(name) after every first-layer detail, for example inside the helper that makes one:
const detailBoard = (name, about, heading, rows) => {
  v.detail(name, () => board(name, heading, rows), { about });
  deep(name);
};
// At the end of the script: a deep detail whose `after` names nothing must not vanish silently.
for (const d of DEEP) if (!placed.has(d)) throw new Error(`deep detail "${d.detail}" follows "${d.after}": no such detail`);
```

Two things the helper must get right:

- **The chapter that picks up again.** After a run of deep details the video returns to the
  first layer. If nothing marks that, the chapter list says the viewer is still inside the last
  deep detail. So the next first-layer shot starts a chapter of its own **when `resume` is set**,
  and only then (clear the flag in your own `chapter()` wrapper). With the deep layer left out,
  the chapter list is then exactly what it was before the layer existed. Check that:
  `dump --chapters --omit deep` must give the same count as before.
- **Deep details that follow a group of rows inside a board** (an hour of a day told
  hour by hour) come after the whole board, not in the middle of it.

A video with a hundred and fifty chapters has a chapter list longer than a description usually
holds. The export says so and writes the short list for it, `<name>.chapters.main.txt`: the
chapters that do not begin inside a deep detail, **at the times of the full video**
(`export-and-publish.md`, section 7). Put that list in `publish.md` for the full video, and the
list of each shorter version beside it for that version's file. The list from `--omit deep` has
the right titles and the wrong times for the full video.

## 4. Writing the deep layer: one writer per file

Split each story into stretches of 60 to 120 facts to bring in (the counted pass gives the
numbers), one data file and one writer each. Give every writer a **private copy of the project**
so that their checks and draft recordings do not collide, and merge the data files yourself. The
script file has one writer: you.

The writer's brief carries the whole method, since the writer knows nothing else:

```text
You are writing the "deep" layer of a narrated video, for one stretch of one story.
The viewer: <from the brief>. The requester asked for everything the research found, and will
delete what they do not need. Length is not a reason to leave anything out.

You write ONE data file: <path>. Do not edit the script, the notes or anything else.
Read first: the writing rules <path>; the script around your stretch, to see how rows are
written and what the video already calls things <path>; the spoken text now <path>.
The research note is your only source of facts: <path>. Not your own knowledge. No searching.
The counted pass: <path>. Bring in every fact marked "bring in" whose target is one of these
details: <names>, or one of these new questions: <names, to be marked alone: true>.

The format: <the block in section 3, with the limits>.

For each fact, go back to the note and read the passage; the pass has only a short version.
- Confirmed: say it plainly.
- Single source or secondary: say who says it, in the line ("one newspaper wrote", "by his own
  account", "the official report says").
- The note-writer's own arithmetic: "that works out at about".
- Sources differ: give both and say that they differ. Do not pick.
- Search summary only, general knowledge, not found: leave out, even if the pass says bring in.
- A quotation: only words the note gives inside quotation marks. Never turn a paraphrase, a
  minute or a recollection into a quotation. Words recalled later are "he said later that…".
- No cause, motive, judgement or link between facts that the note does not state.
- No comparison or sum of your own ("about twice", "more than the whole loss").
- Do not guess whether a person is a man or a woman; repeat the name or the role.
- Private people (family, junior staff): no names, nothing about health or children.
- Where a fact reflects badly on a named person, keep the note's wording of who found or said
  it, and tell the person's answer or the outcome if the note has it.
- A name returns with its role after a minute away. Use the video's own names for things: <list>.
- Words not to use without explaining: <list from the notes' "For a beginner" sections>.
- Group facts by the question they answer, 4 to 14 rows to a deep detail. Its first line says
  where we are and what is coming; time runs forwards inside it.
- A deep detail may lean on the detail it follows and on the core, never on another detail or
  deep detail. An `alone` one leans on the core only: print the core with dump --text --omit all.

Check: <the commands>. No errors; no new warnings from your lines (record the draft voice
before the last check: caption speed is measured from the recording).
Hand back: the data file; and a report with a table (deep detail | follows | boards | rows |
letters carried), every "bring in" fact you did not bring in with the reason, anything you found
wrong or contradictory in the note, the pass or the script, and names the voice may say wrongly.
```

When the files come back, merge them, record the draft voice and run `check`. **Then read
nothing as finished.** A writer's report says what the writer believes. Section 5 finds out.

## 5. Checking it before anything is recorded

Three kinds of independent reader, all started at once, none given another's expectations.
They work on the draft voice; nothing has been paid for or exported yet.

**An accuracy checker for every data file.** It did not write the file. It gets the data file,
the note and the counted pass, and goes row by row from `src` to the passage:

```text
Check one file of deep details against the research note, row by row. You did not write it.
The note is the only authority: not your own knowledge, not the web.
For every row, go to the passage named in `src` and judge the heading, the text on screen and
every spoken line:
1. says more than the note (a cause, motive, link, judgement, date, name, number; a comparison
   the writer worked out);
2. says something different;
3. certainty: the note marks it single-source, secondary, disputed or its own arithmetic, and
   the line says it flat. Search-summary-only and general-knowledge facts should not be there;
4. quotations: every quoted string is in the note inside quotation marks, word for word; a
   recollection is not spoken as what was said on the day;
5. numbers three ways: spoken words, caption digits and screen text agree with each other and
   with the note;
6. fairness to named people; private details of private people;
7. wrong `src`;
8. the `about` sentence promises what the detail does not tell.
Then read each deep detail whole: do its rows together leave an impression the note does not
support?
Hand back a table of problems only, worst first: detail | board | row | kind | the line | the
note (quoted, with section) | the smallest fix, as exact new wording within the writing rules.
List what you could not check. Do not list rows that are fine.
```

In one job five such checkers found a problem in about one row in six: comparisons the writers
had worked out themselves, recollections spoken as direct speech, "he" for people whose sex the
note did not give, a truncated quotation on screen that reversed its meaning, wrong `src`
values, and `about` sentences that promised more than the rows told.

**First-time listeners.** Two per story, each given the spoken text only (`dump --text`) and a
range of chapters. They are told who the viewer is, that the requester wants depth ("do not
report too long"), and to report where they got lost, with the smallest fix: a word used before
it was explained, a name returning without its role, a run of numbers, the same thing with two
numbers, a jump in time, a chapter that starts cold or ends hanging, a fact told twice. Ask each
to tell six hard chapters back in their own words; what they cannot tell back is a finding.

**A stand-alone test.** One reader gets the core alone plus each `alone` deep detail, one at a
time, and says for each whether it can be followed by someone who has heard only the core. In
one job four of thirteen could not.

Treat what comes back as findings. Where a checker and the closing check (section 6) disagree,
the later reading of the source wins.

## 6. The closing check

The counted pass, the writers and the checkers leave a residue: facts labelled "search summary
only", "general knowledge", "single source", "not found"; places where the note contradicts
itself; script lines the note does not support. This is the double check of `research.md`,
section 3, done again now that the full text exists, and aimed at **what the video says**.

It is **one round, and it widens nothing.** It does not open new subjects. A person, document
or event met on the way goes on a list, "Not followed", unless a line of the video cannot be
made right without it. If the earlier rounds were done as `research.md` describes, most of the
video was already checked there, and this round is short. If the list is long (more than about
sixty items for one story), put it in order and give the round an allowance: first what the
core says, then the first-layer details, then the deep layer; within each, the weakest labels
first. What the allowance does not reach stays out of the video, or stays with its label spoken
aloud ("one newspaper wrote").

One checker per story, with web access, who did not write the note:

```text
Double-check what a video says about <story>, at the sources. One round; no new subjects.
The main topic of the video: <one sentence>.
The note (the only file you change): <path>. What the writers and checkers found weak or wrong:
<paths>. The video's spoken text: <path>.

List the items first, number them, and put them in this order:
A. lines of the video the note does not support;
B. facts the video says that the note marks search summary only, general knowledge, single
   source, secondary only, disputed or worked out, or gives no source for;
C. places where the note contradicts itself on something the video says;
D. facts marked "bring in" that were kept out only because their label was weak.
Within each group: the core first, then the first-layer details, then the deep layer.
Leave out anything that does not bear on the main topic: list it under "Not followed".

To close one: open a source and read the passage yourself. A search summary does not count.
Prefer where the thing was first written or counted (an official report, a judgment, a record of
parliament, a newspaper of the day, the person's own words). Copy the words that carry the fact,
exactly, with the address and the page or paragraph. For a number: what was counted, by whom, on
what date. For a quotation, a number in the core, or anything that reflects badly on a named
person: a second source that does not copy the first. If two sources differ, give both. If you
cannot find it, say what you tried.
Say for every source how you read it: the page itself, a scan, or a search snippet of a scan.

Append one section to the note, "Closing check (<date>)":
1. a table: no. | where in the note | the item | confirmed / corrected / two sources differ /
   still open | the source's words | source;
2. "What the video should change": each spoken line (quoted) that is wrong, too strong, badly
   attributed, or that speaks a doubt this check has settled, with what the source supports;
3. "What the video can now say": facts of group D that are now confirmed;
4. "Not followed": new questions met on the way, one line each. Do not research them;
5. the new sources, added to the note's list.
Mark each earlier passage this check corrects or confirms. Change nothing else in the note.
You may use at most <N> searches. Write results into the note as you go. When the allowance is
spent, or a page will not open, stop and say exactly where: which items remain. Do not get
round the limit another way.
```

**What this looked like when it was done without an edge.** In one job the closing round was
told to close every open end and to research everything it met on the way. For two stories it
listed 261 items, among them the later lives of minor figures and the history of institutions
the stories only pass through. It was the fifth research round. The session's search allowance
ran out part-way; 50 items were left open, and some helpers went on searching another way, so
that part of what they found had been read only as snippets. The round did find real errors: a
famous figure that already contained another figure the video had added to it; a "meeting" that
was one question after a speech; three quotations that were paraphrases; a doubt the video
spoke aloud that a court judgment had settled years before. **Every one of those was about a
line the video said.** Ordered as above and held to the main topic, the same allowance would
have checked all of them and finished.

## 7. Revising after the checks

Now there are three piles for every file: the checker's table, the closing check's two lists,
and the listeners' findings. One reviser per data file applies all three to that file, and
brings in the new facts under the headings that belong to its stretch. One reviser per story does
the same for the core and the first layer in the script file, each in a private copy and each
confined to its own region of the file, so that their work can be merged.

Rules for revisers, beyond the writer's rules:

- **The latest research wins** over the checker and over the older parts of the note.
- "Can be firmer": drop the spoken doubt, say the fact, name the new source in a few words.
- A book read only as snippets of a scan is told in the writer's own words with the author
  named. It is not quoted, and no page number is spoken.
- A new fact that corrects a row replaces the row; the video does not say both.
- The core stays short: a correction there costs about as many lines as it replaces. New facts
  go to the deep layer.
- Nobody renames, removes or reorders a first-layer detail: the deep details hang on the names.
- Each reviser accounts for every item: done, or not done with the reason.

### Merging what the revisers hand back

Several people have now written about the same events without reading each other. Before
anything is recorded, the lead does six things that no single reviser could do:

1. **Tell the data-file revisers what the first layer now says.** The reviser of the script
   file changes facts the deep details lean on (a name the script stops giving, a quotation
   that became reported speech, a number that moved into the core). Ask that reviser for a list,
   "what the script now says that the deep details should agree with", and send it to the
   others. If they work at the same time, send it the moment it exists, and afterwards read
   every file whose reviser had already finished against that list yourself.
2. **Look for what is told twice.** Two writers given neighbouring stretches will both tell the
   best quotation. The checker warns when the same quotation is spoken twice. Also search the
   data files for a `src` value that appears in more than one file, and read both rows. Keep
   the full telling where the question it answers is asked first; elsewhere say it in a line of
   your own words, or cut the row. A detail marked `alone` may say a fact again, in its own
   words; it does not repeat the quotation.
3. **Follow every "as you heard".** Each one leans on a line somewhere else. Find that line in
   the text printed without the deep layer (`dump --text --omit deep`). It must still be there,
   in the core or in the detail this one sits within.
4. **Nothing marked for a check is spoken as a fact.** A number the note labels "check before
   use" or "helper's reading" is left out, or told without the figure. It goes on the list of
   what the next round of research, if there is one, should read at the source.
5. **Collect the names.** Each reviser lists the names the voice may say wrongly. One person
   adds the `v.pronounce` rules, in the script file, and says in the hand-over that nobody has
   listened to them yet.
6. **Compare the whole text with the notes by machine.** `node tools/dump.mjs <id> --quotes`
   and `node tools/dump.mjs <id> --figures` list the quotations and the figures that are not
   in the research notes as written (`script-review.md`, section 1). This is the double check
   of the merged text: it takes seconds, uses no searches, and reads every row of every file,
   which no reviewer does at this size. Look up every item; save both lists with the review
   notes. In one job, 481 quotations were spoken and 3 were not in the notes (company names
   written out in full); of 2,312 figures, 67 were not, each a rounding of a note's figure or a
   time of day written another way. That result is worth a line in the hand-over. So is its
   limit: the lists show that the script matches the notes, not that the notes are right.

Then record the draft voice, run `check --strict` (in that order: a list of recordings left
over from before the merge gives false timings), confirm the chapter count without the deep
layer, regenerate `details.md`, and give the changed chapters to a listener who has not seen
them (`script-review.md`, section 9). Only then the studio voice and the export.

## 8. Limits, and saying where the work stopped

- **The deep layer does not reopen the research.** It tells what the notes already hold. The
  only searching at this stage is the closing check, once. A fact the notes do not have is a
  line for the hand-over ("not researched: …"), not a new round.
- **Plan the searches.** A session may allow a fixed number of web searches, shared by every
  agent in it. Say in each checker's brief how many it may use, put what the core says and the
  weakest labels first, and have it write results into the note as it goes, so that a stop
  loses nothing.
- **A limit is not an obstacle to get round.** An agent that is told its search allowance is
  spent must not go on querying search services another way. Say so in the brief. If helpers did
  it anyway, say that in the note and in the hand-over, and treat what they found as leads to
  re-read at the source.
- **A snippet is not a page.** Text found by searching inside scanned books is good for locating
  a passage. It is not a reading of the page: words may be missing and page numbers are
  approximate. Mark it in the note, and do not quote from it.
- **Say where it stopped.** If the check ends because of a limit and not because its list was
  done, the index and the hand-over say so, with the count still open and what would close
  them. Open items stay out of the video. Another round is the requester's decision.

## 9. What went wrong when this was first done

| What happened | What prevents it |
| --- | --- |
| The author's own pass said nothing had been left out; 446 facts had. | The counted pass is done by someone who did not write the script, heading by heading, with letters. |
| Writers added comparisons ("about twice what the bet gained") that no source makes. | The rule is in the brief; the checker's kind 1 looks for it. |
| A recollection written down months later was spoken as "He said: …". | Reported speech stays reported; quotations only from quotation marks in the note. |
| On-screen text shortened a quotation and reversed its meaning. | Text on screen is checked like speech; a quotation is cut only at a point that keeps its sense. |
| "He" for people the note never called he or she. | Repeat the name or the role. |
| A doubt spoken in the video ("it is not certain whose view this is") was the note's own gap. | The closing check goes back to the source for every such doubt. |
| The research went to a fifth round, followed side stories, and used up the search allowance before every line was checked. | The topic test and the three rounds of `research.md`, section 3; the closing check is one round, ordered, with an allowance. |
| Deep details marked `alone` leaned on a first-layer detail. | The stand-alone test. |
| Chapters ran to six minutes; the chapter list no longer matched the short version. | A chapter per deep detail, a second after 30 lines, and the pick-up chapter. |
| Writers could not save a report file. | Ask for the report in the final message as well; save it yourself. |
| Two agents edited the same file. | Private copies; one file, or one marked region of a file, per agent; merge yourself. |
| The same quotation was spoken in two or three deep details, written by different writers. | The checker warns when a quotation is spoken twice; after the merge, the lead searches for `src` values found in more than one file. |
| One reviser finished before the script's changes were known; its file still gave a private person's name that the script had stopped giving. | The script's reviser lists what changed for the others; the lead reads every file that was finished early against that list. |
| A figure the note itself marked "check before use" was spoken as a fact. | Step 4 of the merge. |
| Warnings about caption speed that were not real. | Record the draft voice before the last `check`; a stale recording list gives false timings. |
| Deep details sat inside the two parts that had music. A piece of under two minutes went round thirteen times under twenty-three minutes of boards. | Music rests while a deep detail is told; the engine does it (`voice-and-assets.md`, section 8). Read the mix report of the full video, not only of the short one. |

## 10. Done

- [ ] For each real event, a counted pass by someone who did not write the script; its counts
      are in `research/index.md`.
- [ ] Every "bring in" letter is carried by a row (in its `src`) or is in a list of facts left
      out with the reason. Length is not among the reasons.
- [ ] Every data file has been checked row by row by someone who did not write it, and every
      finding is fixed or answered.
- [ ] First-time listeners have gone through the deep layer; each `alone` deep detail has
      passed the stand-alone test.
- [ ] The closing check has gone back to the sources, once, for every weak label and every
      unsupported line the video says. The note says how many items were closed, how many
      remain and why the check stopped. No new subject was opened.
- [ ] `check --strict` passes with all layers, with `--omit deep` and with `--omit all`; the
      chapter list without the deep layer is what it was before the layer existed.
- [ ] `details.md` lists every detail of both layers with its length; the hand-over gives the
      length of each of the three versions and says how to delete.
