// compile(script, { modules, language, layout, durations }) → timeline
//
// Turns a script (plain data: see references/script-format.md in the skill)
// into a timeline with every time resolved to seconds and every clip's state
// folded ahead of time, so showing any moment of the video is a lookup.
//
// Narration drives the clock: each line starts when the one before it ends
// (plus its gap), and lasts as long as the voice takes to say it. Pass the
// measured lengths of the real audio as `durations` ({ lineId: seconds }) and
// everything that refers to a line ("@n3", "@n3.end+0.5", "@n3+40%") moves
// with it. Without them the length is estimated from the words.
//
// Problems are collected with the path of the thing that caused them and
// thrown together as one ScriptError, so a script can be fixed in one pass.
import { easing } from './easing.js';
import { captionUnits, estimateSpeechDuration, splitCaption } from './speech.js';
import { ID_PATTERN, parseTime } from './time.js';

export class ScriptError extends Error {
  constructor(issues, id) {
    super(`${id ? `video "${id}": ` : ''}${issues.length} problem${issues.length === 1 ? '' : 's'}\n${issues.map((i) => `  ${i.path}: ${i.message}`).join('\n')}`);
    this.name = 'ScriptError';
    this.issues = issues;
  }
}

/** "fr-CA" with default "en" → ["fr-CA", "fr", "en"]. */
export function languageChain(language, fallback) {
  const out = [language];
  const base = language.split('-')[0];
  if (base !== language) out.push(base);
  if (fallback && !out.includes(fallback)) out.push(fallback);
  return out;
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const TRANSITIONS = ['fade', 'slide-up', 'slide-down', 'slide-left', 'slide-right', 'zoom', 'wipe', 'cut'];
const KEYFRAMED = ['x', 'y', 'w', 'h', 'opacity', 'scale', 'rotate'];

export function compile(script, options = {}) {
  const issues = [];
  const err = (path, message) => issues.push({ severity: 'error', path, message });
  const warn = (path, message) => issues.push({ severity: 'warning', path, message });
  const fail = () => {
    const errors = issues.filter((i) => i.severity === 'error');
    if (errors.length) throw new ScriptError(errors, script?.id);
  };

  if (!isObject(script) || script.format !== 'video-script') {
    throw new ScriptError([{ severity: 'error', path: '/format', message: 'expected an object with "format": "video-script"' }], script?.id);
  }
  if (!Array.isArray(script.tracks)) err('/tracks', 'a script needs "tracks"');
  fail();

  const defaultLanguage = script.defaultLanguage ?? 'en';
  const language = options.language ?? defaultLanguage;
  const chain = languageChain(language, defaultLanguage);
  const durations = options.durations ?? {};
  const modules = new Map((options.modules ?? []).map((m) => [m.type, m]));
  const layoutName = options.layout ?? null;
  const layout = layoutName ? script.layouts?.[layoutName] : null;
  if (layoutName && !layout) err('/layouts', `no layout "${layoutName}"`);

  const stage = { width: 1920, height: 1080, background: '#000000', fps: 30, ...script.stage };
  if (layout) for (const k of ['width', 'height', 'background']) if (layout[k] !== undefined) stage[k] = layout[k];

  // --- Strings ---------------------------------------------------------------
  const untranslated = new Set();
  const tr = (value, path) => {
    if (Array.isArray(value)) return value.map((v, i) => tr(v, `${path}/${i}`));
    if (!isObject(value)) return value;
    if ('$t' in value) {
      const key = value.$t;
      if (typeof key === 'string') {
        for (const lang of chain) {
          const hit = script.strings?.[lang]?.[key];
          if (typeof hit === 'string' && hit !== '') {
            if (lang === defaultLanguage && language !== defaultLanguage && lang !== chain[0]) untranslated.add(key);
            return hit;
          }
        }
        err(path, `no string "${key}" for "${language}"`);
        return key;
      }
      if (isObject(key)) {
        for (const lang of chain) if (typeof key[lang] === 'string') return key[lang];
        err(path, `no text for "${language}"`);
        return '';
      }
      err(path, '"$t" must be a string key or { language: text }');
      return '';
    }
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = tr(v, `${path}/${k}`);
    return out;
  };

  // --- Everything that has a time, by id ---------------------------------------
  const items = new Map();
  const add = (id, path, kind, start, end) => {
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) return err(path, `id ${JSON.stringify(id)} must be letters, digits, "_" or "-", starting with a letter`);
    if (id === 'start' || id === 'end') return err(path, `"${id}" is a reserved id`);
    if (items.has(id)) return err(path, `two things are called "${id}" (the other is ${items.get(id).path})`);
    items.set(id, { path, kind, start, end });
  };
  /** A value worked out once, on first use; asking for it while it is being worked out is a circular reference. */
  const lazy = (path, fn) => {
    let state = 0;
    let value = 0;
    return () => {
      if (state === 2) return value;
      if (state === 1) {
        err(path, 'circular time reference');
        return 0;
      }
      state = 1;
      value = fn();
      state = 2;
      return value;
    };
  };
  let videoEnd = () => 0;
  /** A time in seconds. A number counts from `base`; a reference is absolute. */
  const at = (value, base, path) => {
    let p;
    try {
      p = parseTime(value, (id) => items.has(id));
    } catch (e) {
      err(path, e.message);
      return base;
    }
    if (p.kind === 'relative') return base + p.seconds;
    let s;
    let e;
    if (p.id === 'start') s = e = 0;
    else if (p.id === 'end') s = e = videoEnd();
    else {
      const item = items.get(p.id);
      if (!item) {
        err(path, `unknown reference "@${p.id}"`);
        return base;
      }
      s = item.start();
      e = item.end();
    }
    return (p.edge === 'end' ? e : s) + p.offset + p.fraction * (e - s);
  };

  // --- Register: narration, clips, commands, sounds, markers --------------------
  const segs = [];
  const clips = [];
  const sounds = [];
  script.tracks.forEach((track, ti) => {
    const tpath = `/tracks/${ti}`;
    if (track.kind === 'narration') {
      let prev = null;
      (track.segments ?? []).forEach((seg, si) => {
        const path = `${tpath}/segments/${si}`;
        const text = tr(seg.text, `${path}/text`);
        if (typeof text !== 'string' || !text.trim()) err(`${path}/text`, 'a narration line needs text');
        const voice = { ...script.voice, ...track.voice, ...(seg.speaker ? script.speakers?.[seg.speaker]?.voice : null), ...seg.voice };
        if (seg.speaker && !script.speakers?.[seg.speaker]) err(`${path}/speaker`, `no speaker "${seg.speaker}"`);
        const before = prev;
        const gap = seg.gap ?? track.gap ?? script.gap ?? 0.5;
        const start = lazy(`${path}/start`, () => (seg.start !== undefined ? at(seg.start, 0, `${path}/start`) : (before ? before.end() : 0) + gap));
        const length = typeof durations[seg.id] === 'number' ? durations[seg.id] : estimateSpeechDuration(String(text ?? ''), { ...script.pace, rate: voice.rate ?? 1 });
        const end = lazy(`${path}/end`, () => start() + length);
        const caption = seg.caption === false ? null : tr(seg.caption ?? seg.text, `${path}/caption`);
        const entry = { id: seg.id, track: track.id ?? `track${ti}`, text: String(text ?? ''), caption, speaker: seg.speaker ?? null, voice, start, end, measured: typeof durations[seg.id] === 'number', audio: seg.audio ?? null, path };
        add(seg.id, path, 'line', start, end);
        segs.push(entry);
        prev = entry;
      });
    } else if (track.kind === 'visual') {
      (track.clips ?? []).forEach((clip, ci) => {
        const path = `${tpath}/clips/${ci}`;
        const start = lazy(`${path}/start`, () => at(clip.start ?? 0, 0, `${path}/start`));
        const end = lazy(`${path}/end`, () => {
          const e = clip.end !== undefined ? at(clip.end, 0, `${path}/end`) : clip.duration !== undefined ? start() + Number(clip.duration) : videoEnd();
          // minDuration: "until then, but never shorter than this" (a card that must stay long enough to be read).
          return clip.minDuration !== undefined ? Math.max(e, start() + Number(clip.minDuration)) : e;
        });
        add(clip.id, path, 'clip', start, end);
        const commands = (clip.commands ?? []).map((cmd, ki) => {
          const cpath = `${path}/commands/${ki}`;
          const cstart = lazy(`${cpath}/at`, () => at(cmd.at ?? 0, start(), `${cpath}/at`));
          const cend = lazy(`${cpath}/end`, () => (cmd.until !== undefined ? Math.max(cstart(), at(cmd.until, start(), `${cpath}/until`)) : cstart() + Math.max(0, Number(cmd.duration ?? 0))));
          if (cmd.id !== undefined) add(cmd.id, cpath, 'command', cstart, cend);
          return { cmd, path: cpath, start: cstart, end: cend, order: ki };
        });
        clips.push({ clip, track: track.id ?? `track${ti}`, path, start, end, commands });
      });
    } else if (track.kind === 'audio') {
      (track.clips ?? []).forEach((clip, ci) => {
        const path = `${tpath}/clips/${ci}`;
        const start = lazy(`${path}/start`, () => at(clip.start ?? 0, 0, `${path}/start`));
        const end = lazy(`${path}/end`, () => (clip.end !== undefined ? at(clip.end, 0, `${path}/end`) : clip.duration !== undefined ? start() + Number(clip.duration) : null));
        if (clip.id !== undefined) add(clip.id, path, 'sound', start, () => end() ?? start());
        if (typeof clip.src !== 'string') err(`${path}/src`, 'a sound needs "src" (an asset key or a path)');
        sounds.push({ clip, path, start, end });
      });
    } else err(`${tpath}/kind`, `unknown track kind ${JSON.stringify(track.kind)} (visual, narration or audio)`);
  });
  const markers = (script.markers ?? []).map((m, mi) => {
    const path = `/markers/${mi}`;
    const time = lazy(`${path}/at`, () => at(m.at ?? 0, 0, `${path}/at`));
    if (m.id !== undefined) add(m.id, path, 'marker', time, time);
    if (!['chapter', 'pause', 'cue', 'note'].includes(m.kind)) err(`${path}/kind`, `unknown marker kind ${JSON.stringify(m.kind)}`);
    return { marker: m, path, time };
  });

  videoEnd = lazy('/duration', () => {
    if (script.duration !== undefined) return at(script.duration, 0, '/duration');
    if (segs.length === 0) {
      err('/duration', 'a script with no narration needs a "duration"');
      return 0;
    }
    return Math.max(...segs.map((s) => s.end())) + (script.tail ?? 2);
  });

  // --- Resolve -----------------------------------------------------------------
  const segments = segs.map((s) => ({ ...s, start: s.start(), end: s.end() })).sort((a, b) => a.start - b.start);
  let duration = videoEnd();
  for (const s of segments) duration = Math.max(duration, s.end);
  for (let i = 1; i < segments.length; i++) {
    const a = segments[i - 1];
    const b = segments[i];
    if (a.track === b.track && b.start < a.end - 0.01) warn(b.path, `line "${b.id}" starts before "${a.id}" has finished`);
  }

  const fullStage = { x: 0, y: 0, w: stage.width, h: stage.height };
  const boxes = new Map();
  for (const c of clips) boxes.set(c.clip.id, { ...fullStage, ...c.clip.box, ...layout?.clips?.[c.clip.id]?.box });
  const ctx = { stage, language, clipBox: (id) => boxes.get(id) ?? null, assets: script.assets ?? {} };

  const transition = (value, path) => {
    if (value === undefined || value === null) return null;
    const t = typeof value === 'string' ? { type: value } : value;
    if (!TRANSITIONS.includes(t.type)) {
      err(path, `unknown transition ${JSON.stringify(t.type)} (${TRANSITIONS.join(', ')})`);
      return null;
    }
    if (t.type === 'cut') return null;
    return { type: t.type, duration: t.duration ?? 0.4, ease: t.ease ?? 'out' };
  };
  const checkEase = (name, path) => {
    try {
      easing(name);
      return name;
    } catch (e) {
      err(path, e.message);
      return 'inOut';
    }
  };

  const layers = [];
  clips.forEach((c, z) => {
    const { clip, path } = c;
    const override = layout?.clips?.[clip.id] ?? {};
    if (override.hidden) return;
    const start = c.start();
    const end = c.end();
    duration = Math.max(duration, end);
    if (!(end > start)) err(path, `clip "${clip.id}" ends (${end.toFixed(2)} s) before it starts (${start.toFixed(2)} s)`);
    const mod = modules.get(clip.module);
    if (!mod) {
      err(`${path}/module`, `no module "${clip.module}" (registered: ${[...modules.keys()].join(', ') || 'none'})`);
      return;
    }
    const props = tr({ ...clip.props, ...override.props }, `${path}/props`);
    // What a module is told about its clip: the stage, the language, its own box and life, and other clips' boxes.
    const cctx = { ...ctx, box: boxes.get(clip.id), start, end };
    for (const p of mod.validateProps?.(props, cctx) ?? []) err(`${path}/props`, p);
    let state;
    try {
      state = mod.init(props, cctx);
    } catch (e) {
      err(`${path}/props`, `${clip.module}: ${e.message}`);
      return;
    }
    const initial = state;
    const commands = c.commands
      .map((k) => ({ ...k, start: k.start(), end: k.end() }))
      .sort((a, b) => a.start - b.start || a.order - b.order)
      .map((k) => {
        const { cmd } = k;
        if (!mod.commands?.includes(cmd.name)) {
          err(`${k.path}/name`, `${clip.module} has no command "${cmd.name}" (it has: ${(mod.commands ?? []).join(', ') || 'none'})`);
          return null;
        }
        if (k.start < start - 0.001 || k.start > end + 0.001) warn(k.path, `command "${cmd.name}" at ${k.start.toFixed(2)} s is outside clip "${clip.id}" (${start.toFixed(2)}–${end.toFixed(2)} s)`);
        const command = { id: cmd.id ?? null, name: cmd.name, args: tr(cmd.args ?? {}, `${k.path}/args`), start: k.start, end: k.end, duration: k.end - k.start, time: k.start, ease: checkEase(cmd.ease ?? 'inOut', `${k.path}/ease`), path: k.path };
        let problems = [];
        try {
          problems = mod.validateCommand?.(state, command, cctx) ?? [];
        } catch (e) {
          problems = [e.message];
        }
        for (const p of problems) err(k.path, `${clip.id}.${cmd.name}: ${p}`);
        const from = state;
        if (problems.length === 0) {
          try {
            state = mod.apply(state, command, cctx);
          } catch (e) {
            err(k.path, `${clip.id}.${cmd.name}: ${e.message}`);
          }
        }
        return { ...command, from, to: state };
      })
      .filter(Boolean);
    const keyframes = {};
    for (const [prop, list] of Object.entries(clip.keyframes ?? {})) {
      if (!KEYFRAMED.includes(prop)) {
        err(`${path}/keyframes/${prop}`, `can't keyframe "${prop}" (${KEYFRAMED.join(', ')})`);
        continue;
      }
      keyframes[prop] = list
        .map((k, i) => ({ time: at(k.at ?? 0, start, `${path}/keyframes/${prop}/${i}/at`), value: Number(k.value), ease: checkEase(k.ease ?? 'inOut', `${path}/keyframes/${prop}/${i}/ease`) }))
        .sort((a, b) => a.time - b.time);
    }
    layers.push({
      id: clip.id,
      track: c.track,
      module: clip.module,
      start,
      end,
      z,
      box: boxes.get(clip.id),
      opacity: clip.opacity ?? 1,
      scale: clip.scale ?? 1,
      rotate: clip.rotate ?? 0,
      props,
      initial,
      commands,
      keyframes,
      in: transition(clip.in, `${path}/in`),
      out: transition(clip.out, `${path}/out`),
      path,
    });
  });

  // --- Captions ----------------------------------------------------------------
  const maxUnits = stage.caption?.maxUnits ?? 84;
  const captions = [];
  for (const s of segments) {
    if (typeof s.caption !== 'string' || !s.caption.trim()) continue;
    const parts = splitCaption(s.caption, maxUnits);
    const total = parts.reduce((n, p) => n + captionUnits(p), 0) || 1;
    let t = s.start;
    for (const p of parts) {
      const d = ((s.end - s.start) * captionUnits(p)) / total;
      const last = captions[captions.length - 1];
      // Lines that share one caption (a sentence spoken as several short lines) keep it on screen throughout.
      if (last && last.text === p && t - last.end < 2) last.end = t + d;
      else captions.push({ start: t, end: t + d, text: p, line: s.id });
      t += d;
    }
  }
  // A caption stays a moment after its line, unless the next one needs the space.
  captions.forEach((c, i) => {
    const next = captions[i + 1];
    c.end = Math.min(c.end + 0.3, next ? next.start : duration);
  });

  // --- Sounds, markers, chapters ---------------------------------------------------
  // Music rests while a deep detail is told. A deep detail is boards of facts, often many minutes of
  // them, set inside a part that was given music for its story; one piece going round under all of it
  // wears the viewer out and breaks "music under chosen parts only". The music fades out before the
  // detail and begins again after it. A clip marked { overDeep: true } plays through.
  const REST = 20; // seconds: two deep details closer together than this are one rest
  const SHORTEST = 30; // seconds: music does not come back, or stay, for less than this
  const deepSpans = [];
  for (const d of script.details ?? []) {
    if (!d.deep || d.omitted || !d.lines?.length) continue;
    const i = segments.findIndex((x) => x.id === d.lines[0]);
    const j = segments.findIndex((x) => x.id === d.lines[d.lines.length - 1]);
    if (i < 0 || j < 0) continue;
    deepSpans.push([segments[i].start, segments[j + 1]?.start ?? duration]);
  }
  deepSpans.sort((a, b) => a[0] - b[0]);
  const rests = [];
  for (const span of deepSpans) {
    const last = rests[rests.length - 1];
    if (last && span[0] - last[1] < REST) last[1] = Math.max(last[1], span[1]);
    else rests.push([...span]);
  }
  const soundList = sounds.flatMap((s) => {
    const { clip } = s;
    const whole = { id: clip.id ?? null, src: clip.src, start: s.start(), end: s.end(), from: clip.from ?? 0, volume: clip.volume ?? 1, loop: !!clip.loop, fadeIn: clip.fadeIn ?? 0, fadeOut: clip.fadeOut ?? 0, duck: !!clip.duck, path: s.path };
    const isMusic = whole.loop || whole.end !== null;
    if (!isMusic || clip.overDeep || !rests.length) return [whole];
    const stop = whole.end ?? duration;
    const pieces = [];
    let from = whole.start;
    let cut = false;
    for (const [a, b] of rests) {
      if (b <= from || a >= stop) continue;
      cut = true;
      if (a - from >= SHORTEST) pieces.push([from, a]);
      from = Math.max(from, b);
    }
    if (!cut) return [whole];
    if (stop - from >= SHORTEST) pieces.push([from, stop]);
    return pieces.map(([a, b], k) => ({ ...whole, id: whole.id && k ? `${whole.id}.${k + 1}` : whole.id, start: a, end: b }));
  });
  const markerList = markers
    .map((m) => ({ id: m.marker.id ?? null, kind: m.marker.kind, time: m.time(), label: tr(m.marker.label ?? '', `${m.path}/label`), path: m.path }))
    .sort((a, b) => a.time - b.time);
  const chapterMarks = markerList.filter((m) => m.kind === 'chapter');
  const chapters = chapterMarks.map((m, i) => ({ id: m.id, label: m.label, start: m.time, end: chapterMarks[i + 1]?.time ?? duration }));

  fail();
  return {
    id: script.id ?? 'video',
    title: tr(script.title ?? '', '/title'),
    language,
    layout: layoutName,
    stage,
    fps: stage.fps,
    duration,
    layers,
    segments: segments.map(({ path, ...s }) => s),
    captions,
    sounds: soundList,
    markers: markerList,
    chapters,
    assets: script.assets ?? {},
    fonts: script.fonts ?? [],
    pronunciations: script.pronunciations ?? [],
    untranslated: [...untranslated],
    issues,
  };
}

/** The times of every frame of a timeline (or of a range of it): 0, 1/fps, 2/fps… */
export function frameTimes(timeline, range) {
  const from = Math.max(0, range?.[0] ?? 0);
  const to = Math.min(timeline.duration, range?.[1] ?? timeline.duration);
  const first = Math.ceil(from * timeline.fps - 1e-9);
  const count = Math.max(0, Math.ceil(to * timeline.fps - 1e-9) - first);
  return Array.from({ length: count }, (_, i) => (first + i) / timeline.fps);
}
