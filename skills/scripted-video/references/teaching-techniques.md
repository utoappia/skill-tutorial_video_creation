# Teaching techniques

Ways to make an idea land, with when to use each and how to build it. Choose them at the
storyboard stage; each one is a picture decision as much as a wording decision.

The reasoning behind most of them is the same: a viewer has very little working attention.
Anything that spends it on finding where to look, decoding a word, or holding a half-finished
thought takes it away from the idea.

## Contents

1. The short list
2. Order: how to arrange a lesson
3. Attention: where the eye goes
4. Words and pictures together
5. Making the viewer think
6. Making it stick
7. Keeping up: help for a viewer who drifts
8. Where these ideas come from

## 1. The short list

If you remember nothing else:

1. **Say what the viewer will be able to do,** at the start.
2. **Concrete before abstract.** One case first, the rule after.
3. **Show, then name.** The thing appears; then it gets its word.
4. **Point at what you name, while you name it.**
5. **One new thing per step,** then a pause.
6. **Easy example first,** then the real one.
7. **Ask before you tell.** Pause; let the viewer predict.
8. **A new word gets a word card,** with nothing else happening.
9. **Change one thing at a time,** and show the change as something new arriving.
10. **Recap in the same words,** read aloud.

## 2. Order: how to arrange a lesson

**The goal up front.** Open with the question the video answers or the result it reaches, in the
first ten seconds. "Where does February 29 come from?" does more than a title card and an
introduction. The viewer then knows what to listen for.

**A map for longer videos (advance organizer).** For anything over about three minutes, show the
steps once, early ("three things: the trip, the leftover hours, the fix"), and return to that
list as each begins. Chapters do this in the player; a `list` clip does it on screen.

**Teach the pieces before the whole (pretraining).** If the main explanation needs three names
(the parts of a machine, the players in a market), introduce those first, one at a time, each
shown and pointed at. Then run the explanation. Do not introduce a part in the middle of the
process it takes part in.

**Start from one concrete case.** A single person, object, day, or number. "A baker borrows 100
coins" before "lending". Stay with that case as long as possible; a second case comes only to
show that the idea carries over.

**Concrete, then picture, then symbols.** First the real thing (four years in a row), then a
drawing of it (four boxes), then, if it is needed at all, the notation (4 × 6 = 24).

**Small steps (segmenting).** Break the content into steps of one idea, each with its own
picture change, with a short gap between. A viewer absorbs in the gaps. `v.beat()` after a big
idea; `v.wait(1)` after a result.

**Worked example, then fade.** For a skill: do one example completely, naming every step. Do a
second with the viewer supplying one step (a pause-and-think). Give a third to try alone. Do not
start with "try it yourself".

**Problem first.** Before a method, show the problem it solves going wrong. A fix means nothing
to someone who has not felt the problem. For a story: this happened, **and** this, **but** then
this, **so** this.

**Answer first, for busy viewers.** A how-to or a product walkthrough should show the finished
result at the start, then the steps. Hold an answer back only when working it out is the lesson.

## 3. Attention: where the eye goes

At every moment, ask: **where are the viewer's eyes drawn?** If the answer is not "to the thing
the voice is talking about", fix the picture.

**Point (signaling).** When the voice names something on screen, mark it at that moment: a ring
around it, an arrow at it, a spotlight that dims the rest, or a fingertip on a recording. Remove
the mark when the voice moves on. Use one mark at a time. The accent colour means "look here" and
nothing else.

| Mark | Use it for |
| --- | --- |
| Ring | One thing among several, without hiding the others. |
| Spotlight (everything else dims) | One thing that needs full attention; a busy picture. |
| Arrow | A small target, or a direction. |
| Fingertip, tap, drag, swipe | What a hand would do on a real screen. |
| Label | Naming a part; stays until removed. |
| Camera move (zoom in) | A detail too small to read at full view. Zoom back out afterwards. |

**Remove what is not needed (coherence).** Every element on screen that the voice does not use
is competing with the one it does. No decorative pictures, no background motion, no music that
fights the voice, no interesting-but-irrelevant facts. If something is true and nice but not
needed for the promise, it goes in the description.

**Build, do not reveal all at once.** A diagram with six parts arrives as six steps, each with
its line. Showing the finished diagram first makes the viewer read ahead and stop listening.

**One idea per picture.** When the idea changes, the picture changes (a new shot). When the idea
continues, the picture stays and one thing in it changes.

**Show a change as a new thing.** When a value changes, do not silently swap a label: the eye
misses it. Bring the new value in as its own element, highlight it, or put before and after side
by side. Highlights must not move the layout (no text that grows and pushes its neighbours).

**Counts must be visible.** If the voice says "four years", four things are on screen.

**Nothing changes under a word card or during a pause-and-think.** The viewer is reading or
thinking; anything else that moves is missed. During the thinking time nothing is said either.

## 4. Words and pictures together

**Say it and show it at the same moment (contiguity).** The picture for a line arrives with the
line, not two seconds later and not before. Hanging pictures from line references does this:
`scene.show(line, 'box')`. For something named in the middle of a line, use a point inside the
line: `` `${line}+40%` ``.

**Put labels next to what they label,** not in a legend the eye must travel to.

**Voice for explanation, screen for key words.** The viewer cannot read a sentence and listen to
a different sentence. So the screen carries the picture and a few words; the voice carries the
explanation. Do not put the narration on screen as text. (Captions are the exception, and sit in
their own band.) The one place where reading and hearing the same words together helps is a
**word card**: the definition is read aloud while it is shown.

**A picture has to mean something.** Prefer a diagram that shows how parts relate over a
photograph that merely decorates the topic.

## 5. Making the viewer think

**Pause and think (the quick quiz).** Before any answer the viewer could work out from what they
have seen, stop and ask. It has four parts, always in this order:

1. **Say that a question is coming:** "Here is a quick quiz." The viewer needs to know that the
   video has stopped telling and started asking, and that they are meant to answer.
2. **Show the question and read it aloud,** word for word, as the card appears.
3. **Be silent** while a countdown runs: three to five seconds (up to eight for a sum).
4. **Give the answer** in the next line.

Rules:

- **A question is never only on screen.** Some viewers cannot read it yet, some are not looking,
  and some read slowly enough that the countdown ends first. The narrator reads every question.
- The thinking time starts after the question has been read, not when the card appears.
- The question can be answered from what has already been shown. Never test something not taught.
- The answer is not on screen during the question. Check the still.
- A hint, if any, is the first step, not the answer ("6 + 6 + 6 + 6").
- One or two per short video; one per chapter in a long one. Each stops the video, so each must
  matter.
- The line after the pause states the answer plainly, in case the viewer did not get it.
- In a video with several, vary the words that announce it ("One more question.", "Your turn.").

The kit's `v.think()` does all four parts, and the checker reports an error for a question that
is shown but not read aloud.

**Predict, then watch, then explain.** Ask "what will happen if …?", show it happening, then say
why. Strong for anything surprising, because a wrong prediction makes the explanation wanted.

**Name the common wrong idea, and show why it fails.** If most beginners believe something
false, say it neutrally ("it is easy to think the day is added for no reason"), then show the
case that breaks it. A wrong idea that is not addressed survives the video.

**Say the viewer's guess, then answer it.** A wrong idea is not always an old belief. Often
the video itself creates it: the viewer has just been shown something and makes the sensible
next guess. They saw a promise made at a market, so they expect the goods to be taken to that
market. They saw two people agree, so they expect those two to pay each other. If the truth
is different and the video walks past the guess with a short correct sentence ("she sells it
nearby"), the viewer keeps the guess and the next lines stop making sense.

1. **Find the guesses.** For each beat ask: "what does the viewer now expect to happen?" Look
   hardest where a thing goes somewhere, where money changes hands, where something ends, and
   wherever a name suggests more than it means.
2. **Say the guess aloud, kindly, as the viewer's own:** "You might think: to the market. After
   all, that is where she made her promise." Draw it too, as a guess: a dashed arrow with a
   question mark.
3. **Answer it with a reason,** not only a "no": "The market is a place for promises. No wheat
   is kept there."
4. **Show what happens instead,** in the same picture, so the two can be compared: the guess
   fades, the real path is drawn, each amount appears beside the place it comes from.
5. **Let the viewer use the new picture at once:** a quick quiz that needs it.

This costs four or five lines. It is the difference between a viewer who can retell the video
and one who can only repeat its last sentence.

**Earn every "so".** "So the market pays her the difference" is only a conclusion if the viewer
can already say who pays and why. Before each "so", "that is why" and "this means", check that
the step it rests on was said or shown in the two lines before. Name who pays, who decides,
who moves: "The people who promised to buy at the higher price must pay the difference. The
market passes that money on."

**Compare two cases that differ in one way.** Side by side, same layout, one difference. The
viewer's eye finds the difference, and the difference is the lesson.

**Use an everyday comparison, once, with its limit.** "Like a clock that runs a little slow."
Introduce it as a comparison, use it for the one point it fits, and drop it before it starts to
mislead. The research notes should say where each comparison breaks down.

## 6. Making it stick

**Recap in the same words.** End each long chapter, and the video, with the main points: a short
list, each point appearing as the voice reads it. Use the words the video already used; a recap
that rephrases is new material. Three points are remembered; six are not.

**Bring earlier ideas back.** When a later step depends on an earlier one, say the earlier one
again in half a line ("remember the six extra hours"). In a series, open each video by using the
last video's idea.

**Let the viewer use it.** End with one thing to try, check or notice: a question to answer, a
case to work out ("is 2100 a leap year?"). It can be the pinned comment.

**One strong example beats three weak ones.** Choose the example the viewer will retell.

**Stories carry facts.** A fact tied to a person, a date and a consequence is remembered longer
than the same fact in a list. Only use stories the research supports.

**Invented people explain; real events convince.** A made-up farmer and baker are the right
way to show a mechanism: round numbers, nothing in the way. But a video that has only invented
people leaves the viewer asking "does this really happen?". After the mechanism is understood,
give one or two short true stories, each with its year, its place and its numbers, each tied
to an idea already taught ("He was a speculator, like Sam"). Rules for them:

- Late in the video, after the ideas they use. A story is not the place for a new idea.
- As the sources tell it, with "about" on rounded figures, and with the doubt where experts
  doubt ("Experts are not sure").
- If the story is not quite the thing the video teaches, say so in the story.
- A gain is followed by a loss, so the two together teach the risk.
- About a real, living person: only what two sources report, nothing about motives or
  character.
- A story part is the one place where quiet music helps (`voice-and-assets.md` section 8).

## 7. Keeping up: help for a viewer who drifts

A viewer who misses one step is often lost for the rest. Build in ways back:

- **Chapters** with plain names, so they can find the step again.
- **A running heading** in a small strip at the top of a shot, saying what this part is about
  (a `text` clip with `role: 'kicker'`).
- **A progress list** that returns between parts with the current part highlighted.
- **Captions** always available.
- **Repeat the noun** rather than "it"; repeat the key number when it is used again.
- **A summary line after a hard stretch:** "So far: the year is six hours too long."
- **Slow down at the hard part.** Shorter lines, longer gaps, and a pause after the result. Speed
  up over the easy parts, not the other way round.
- **Keep the picture stable.** The same thing stays in the same place and the same colour through
  the whole video. A viewer who looks away should recognise the screen when they look back.
- **Something changes at least every 20 seconds,** so attention has a reason to return. The
  checker warns when the screen is still for longer.

## 8. Where these ideas come from

So that you can research further, and justify choices to a reviewer:

- **Multimedia learning research (Richard Mayer and others):** signaling, coherence, spatial and
  temporal contiguity, segmenting, pretraining, the modality and redundancy effects, a
  conversational style.
- **Cognitive load theory (John Sweller and others):** limited working memory; worked examples
  and fading; the split-attention effect.
- **Retrieval practice and spacing:** recalling an idea strengthens it more than hearing it again.
- **Predict–observe–explain** and work on misconceptions from science teaching.
- **Concrete–pictorial–abstract** sequencing from mathematics teaching.
- **Advance organizers** (David Ausubel).
- **Presentation practice:** answer first and grouping ideas in threes (Barbara Minto); "where
  are your eyes drawn?" and removing clutter (Cole Nussbaumer Knaflic); one idea per slide; the
  "and, but, therefore" story shape.

These are summaries from memory of well-known work. If a video makes claims about how learning
works, research them like any other claim.
