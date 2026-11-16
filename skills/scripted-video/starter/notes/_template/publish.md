# Publishing kit: {{title}}

Everything needed to put the video in front of people. `node tools/export.mjs {{id}}` writes the
video, the captions (`.srt`, `.vtt`) and the chapter list (`.chapters.txt`) into `out/`.

| | |
| --- | --- |
| **Title** (under 60 characters, says what the viewer gets) | |
| **Two other titles to test** | |
| **Description, first two lines** (shown before "more") | |
| **Description, whole** | Count its characters with the chapter list in it (a description usually holds about 5,000). What does not fit goes into a second block, for a linked page or pinned comments. |
| **Chapters** | paste `out/{{id}}.chapters.txt` (for a long video with deep details: `out/{{id}}.chapters.main.txt`). One list for each file handed over. |
| **Captions** | upload `out/{{id}}.srt` (one per language) |
| **Thumbnail** | `node tools/export.mjs {{id}} --thumbnail <seconds>`: one picture, at most four large words |
| **Sources** | the list from `review/accuracy.md`, as links |
| **More to know** (in the description) | what the video simplified, where experts disagree, and anything about a real person or event that fairness requires |
| **Credits and licences** | every picture, sound, font and voice that needs one. For generated sound and pictures: the service, the date, and where the prompt is kept (`assets/{{id}}/CREDITS.md`). Check the terms of the account's plan. |
| **Disclosures** | computer-generated voice, music, sounds or pictures; which people are invented and which events are real; sponsorship; "not advice" notes where needed |
| **Pinned comment / next step** | the one thing to do after watching |

## Before it goes out

- [ ] The exported file was watched once from start to finish, with sound, at normal speed.
      If the maker could not hear it, list here the times to listen to: each kind of event sound
      once, the start and end of each piece of music, and every name or number the voice might
      say wrongly.
- [ ] Captions were read against the voice.
- [ ] The title and thumbnail promise only what the video delivers.
- [ ] Rights are clear for every asset, and for the voice.
- [ ] Someone who was not involved has watched it (or the diary in `review/WhatIHaveLearned.md` is clean).

## After it is out

What viewers asked, where they stopped watching, what to change in the next one.
