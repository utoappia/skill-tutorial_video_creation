<img src="assets/icon.svg" width="64" height="64" alt="">

# VideoMakingSkill

An agent skill for making videos that are **written as scripts** and rendered to `.mp4`:
explainers, tutorials, lessons, product walkthroughs, short vertical clips, and lessons that play
live inside a web page or an app.

The skill is in [`skills/scripted-video/`](skills/scripted-video/).

## What it gives an agent

- **A way of working, in stages**, each leaving a file the next one reads: brief, research method,
  research in three checked rounds (one level deeper than the video tells, with counter-views,
  real examples that show the topic at work, and a list of subjects for later videos), a mind map, a storyboard, the script, an accuracy review, a
  comprehension review written as a first-time learner's diary, a visual review of every frame,
  voice, export, and a publishing kit.
- **A small engine** (`starter/`, plain JavaScript, no build step) that the agent copies into your
  project. It checks a script, shows it as contact sheets of stills, records narration, and exports
  `.mp4` with subtitles and chapters. The same script can be translated, re-shaped for vertical
  video, or played live in a page.
- **Reference notes** the agent reads when it reaches each stage: the script format, the authoring
  kit, the components, teaching techniques, writing for a young first-time viewer in wording an
  adult would not find childish, visual design, voice and assets, localization, troubleshooting.

## Installing

Copy or link `skills/scripted-video` into the place your agent reads skills from. For Claude Code:

```
cp -R skills/scripted-video ~/.claude/skills/scripted-video          # for every project
cp -R skills/scripted-video <project>/.claude/skills/scripted-video  # for one project
```

Then ask for a video: "make a two-minute explainer about why the sea has tides".

## What the machine needs

- Node.js 18 or newer
- Chrome, Edge or Chromium (to draw the pictures)
- `ffmpeg` (to record the voice and to export)

A voice service is optional. Without one, the free voice of the operating system is used. Keys
for paid voice services are read from the environment (`ELEVENLABS_API_KEY`, `OPENAI_API_KEY`) and
are never written into a script.

## Trying the engine by itself

```
cp -R skills/scripted-video/starter my-videos
cd my-videos
npm install
node tools/check.mjs            # the example video should pass
node tools/stills.mjs hello     # out/stills/hello/sheet-01.jpg
node tools/tts.mjs hello        # record the narration
node tools/export.mjs hello     # out/hello.mp4, .srt, .vtt, .chapters.txt
```

See [`skills/scripted-video/starter/README.md`](skills/scripted-video/starter/README.md) for every
tool.

Created in [T3 Code](https://t3.codes).
