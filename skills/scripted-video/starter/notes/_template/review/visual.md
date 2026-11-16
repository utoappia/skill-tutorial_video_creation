# Visual review: {{title}}

Look at the video itself, not the script. Three passes; write what you saw, not what you expect.

## Pass 1: stills (before recording the voice is fine)

`node tools/stills.mjs {{id}}` then open every `out/stills/{{id}}/sheet-NN.jpg`, and read
`out/stills/{{id}}/audit.txt`.

| Time | Line | What I see | Problem | Fix |
| --- | --- | --- | --- | --- |
| | | | | |

## Pass 2: the exported file

`node tools/export.mjs {{id}}` then `node tools/frames.mjs out/{{id}}.mp4 --every 1`.
For anything that moves, look closer: `--from 12 --to 16 --all`.

| Time | What I see | Problem | Fix |
| --- | --- | --- | --- |
| | | | |

## Pass 3: every language and layout

`node tools/stills.mjs {{id}} --lang xx`, `--layout vertical`: translated text is longer and
a tall picture is narrower.

## Sound

Copy the lines the tools print. If nobody has listened to the file, write **"measured, not
heard"** and list the times worth a listen; a person must then listen once before it is
published.

- Whole file (from `frames`): mean … dB, peak … dB.
- Silences over 4 seconds (from `frames`): … Each one is meant (a quiz's thinking time) / a fault.
- Event sounds: which sound, at which events, how many times.
- Music (from `export`, one line per piece): from … to …, …% of the video; the voice is … dB
  above the music while someone speaks; the music alone is … dB. Aim for 15 to 22 dB.
- No music under a word card, a quiz, a teaching line or the recap: checked at …
- Not checked, because it needs ears: …

## Checklist

- [ ] No text is cut off, runs outside its box, or overlaps other text.
- [ ] Nothing sits under the caption band.
- [ ] Every picture, icon and font loaded (no empty boxes, no fallback font).
- [ ] The smallest text can be read on a phone (shrink a still to phone width and try).
- [ ] At each moment, the thing being talked about is the thing the eye goes to.
- [ ] Rings, arrows and labels sit exactly on their targets, in every layout.
- [ ] Nothing jumps: no element changes size or place when another one appears.
- [ ] No frame is empty, and no picture stays unchanged for more than 20 seconds.
- [ ] Each word card is fully readable and stays long enough to read twice.
- [ ] The answer is not visible while the question is being asked.
- [ ] Each question is announced and read aloud, and the countdown starts after it has been read.
- [ ] First frame and last frame look intentional (they become thumbnails and end screens).
- [ ] Captions match the voice and appear with it.
- [ ] Sound: the voice is clear over the music, no clipping, no sudden silence, no cut-off last word.
- [ ] Sound: most of the video has no music; the same event has the same sound every time.
- [ ] A generated or found picture shows nothing false: no made-up lettering, no wrong period,
      no real person who was not there.

## Result

- Frames looked at: … (every … seconds, plus … close-ups)
- Problems found: … · fixed: … · left as is (and why): …
- Listened to by a person: yes / no (measured only).

## Later editions

When a finished video is changed, add a heading here with the date: the stills and frames of
the changed lines, and the sound section again for the new export.
