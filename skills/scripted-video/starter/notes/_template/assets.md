# Assets: {{title}}

Everything in the video that the script does not draw: what it is for, how it was made or how to
make it, and where it stands. The files go in `assets/{{id}}/`; their credits go in
`assets/{{id}}/CREDITS.md`. **The video must be complete without any asset that is still
waiting.**

## Where things stand

| Kind | Asked for by the requester? | Service or source | State (made · waiting · not needed) |
| --- | --- | --- | --- |
| Sound effects | | | |
| Music | | | |
| Pictures | | | |
| Film | | | |
| Studio voice | | | |

If a service the requester named could not be reached, say so here in one plain sentence, say
what the video uses instead, and say exactly what would make it reachable: connect it as a tool
of the agent that runs this project (a connection made in another product is not visible to
it), or set its key as an environment variable in the shell that runs the tools.

## Sound

Made by `node tools/sound.mjs {{id}}` from `assets/{{id}}/sounds.json`, or taken from a
licensed source.

| File | Where it plays | Length and level (measured) | Listened to by a person? |
| --- | --- | --- | --- |
| `card.wav` | When a word card arrives | | |
| `quiz.wav` | When a quiz starts | | |
| `answer.wav` | When a quiz's answer is given | | |
| | Music: under which story part, from … to … | | |

- [ ] The same sound for the same kind of event, every time; three kinds or fewer.
- [ ] Music under story parts only: none under a line that teaches, a word card, a quiz or the
      recap. Most of the video has none.
- [ ] Nothing is said only by a sound: with the sound off, the video still works.
- [ ] The voice is 15 to 22 dB above the music (the export's mix report).

## Pictures and film to generate

**One style for all of them** (put it at the start of every prompt): the look, the colours of
the video's theme, the light, "no text, no letters, no numbers", "no recognisable faces", and
where empty space must be left for captions.

> …

| File | Shot | Shape and size | Prompt (after the style statement) | State |
| --- | --- | --- | --- | --- |
| | | | | |

Checks for each result before it goes into the video (a picture in a teaching video is a claim):

- [ ] No lettering, no made-up signs, coins, flags or maps.
- [ ] No recognisable real person. Real events are shown by places and things.
- [ ] Clothes, buildings and machines fit the date and the place.
- [ ] It cannot be mistaken for a photograph of the real event.
- [ ] The caption band is calm enough to read over.

Make one, look at it, then make the rest. Record each in `CREDITS.md`: the service, the model,
the date and the prompt.
