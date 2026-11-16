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

A skill is a folder with a `SKILL.md` in it. Installing it means putting `skills/scripted-video`
where your agent looks for skills, either for every project on your computer or for one
repository only.

### With one command

The [`skills`](https://github.com/vercel-labs/skills) tool (it needs Node.js 22 or newer)
finds the coding agents on your computer, asks which ones should get the skill, and copies it in:

```
npx skills add utoappia/skill-tutorial_video_creation        # this repository only
npx skills add utoappia/skill-tutorial_video_creation -g     # every project on this computer
```

Add `-a claude-code` (or another agent's name) to skip the question. Later, `npx skills update`
brings the skill up to date.

### By hand

First get the files:

```
git clone https://github.com/utoappia/skill-tutorial_video_creation.git videomakingskill
```

#### For every project on this computer

Claude Code reads personal skills from `~/.claude/skills/`:

```
mkdir -p ~/.claude/skills
cp -R videomakingskill/skills/scripted-video ~/.claude/skills/
```

#### For one repository only

Claude Code also reads skills from `.claude/skills/` inside a repository. The skill is then
available only when you work in that repository. If you commit the folder, everyone who clones
the repository gets it too.

```
cd <your-repository>
mkdir -p .claude/skills
cp -R <path-to>/videomakingskill/skills/scripted-video .claude/skills/
git add .claude/skills/scripted-video   # optional: share it with the team
```

If the same skill is installed in both places, the personal copy in `~/.claude/skills/` wins.

#### Keeping it up to date

To have `git pull` update the skill, link it instead of copying it:

```
ln -s "$(pwd)/videomakingskill/skills/scripted-video" ~/.claude/skills/scripted-video
```

A link to a folder outside the repository won't work for anyone else, so commit a copy if you
want to share the skill with a team.

### Other agents

`npx skills add` knows where each agent keeps its skills (Codex and several others use
`.agents/skills/` in a repository and `~/.agents/skills/` for every project). To install by hand
for another agent, copy `skills/scripted-video` into the folder its documentation names.

### Using it

Start a new session so the agent finds the skill. Then ask for a video, for example "make a
two-minute explainer about why the sea has tides". In Claude Code you can also call it by name
with `/scripted-video`.

Wherever the skill is installed, it copies its engine (`starter/`) into the project you are
working in, as `video/` for example. The scripts, notes and finished videos stay in that project.
Nothing is written into the skill folder.

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
