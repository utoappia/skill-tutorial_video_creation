// The authoring kit: write a video as a short program instead of typing JSON.
//
//   import { video } from '../engine/kit.js';
//   const v = video('my-video', 'My video');
//   v.chapter('The idea');
//   const heading = v.add('heading', 'text', { text: v.t('Why the sky is blue'), role: 'title' });
//   const a = v.say('Look up on a clear day. The sky is blue.');
//   const b = v.say('But sunlight is white. So where does the blue come from?');
//   heading.cmd(b, 'setText', { text: v.t('Where does the blue come from?') });
//   export default v.build();
//
// What the kit does for you:
//   - `say` puts lines one after another and returns a time reference ("@n3")
//     that everything else hangs from, so nothing has a hard-coded time.
//     Use it as is (the line's start), or extend it: `${a}.end`, `${a}+40%`,
//     `${a}.end+0.5`.
//   - A shot is a set of clips that are on screen together. `shot()` starts a new
//     one: clips added after it appear with the next line and leave when the
//     shot after that begins.
//   - Every text goes through `t`, which files it under a key made from the
//     text itself. Translations are matched by that key, so a translation
//     can never silently go stale: change the sentence and it asks to be
//     translated again.
//
// The kit only builds a script (plain data). It has no side effects and runs
// the same in Node and in the browser.

import { wordCount } from './speech.js';

/** A short stable key for a text (FNV-1a), so the same sentence always gets the same key. */
function keyOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `t${(h >>> 0).toString(36).padStart(7, '0')}`;
}

export const inset = (box, pad) => ({ x: box.x + pad, y: box.y + pad, w: box.w - pad * 2, h: box.h - pad * 2 });

/** Splits a box into `n` columns (or `rows`) with a gap between them. */
export function cols(box, n, gap = 0) {
  const w = (box.w - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: box.x + i * (w + gap), y: box.y, w, h: box.h }));
}
export function rows(box, n, gap = 0) {
  const h = (box.h - gap * (n - 1)) / n;
  return Array.from({ length: n }, (_, i) => ({ x: box.x, y: box.y + i * (h + gap), w: box.w, h }));
}
/**
 * The largest box with the proportions `width`:`height` that fits in `box`, centred.
 * Give a picture or a recording a box of its own shape, and fractions of the box are
 * fractions of the picture: that is what pointing inside it ({ clip, rect }) needs.
 */
export function fitIn(box, width, height) {
  const k = Math.min(box.w / width, box.h / height);
  const w = width * k;
  const h = height * k;
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}
/** Cuts a strip off a box: `take(box, 'top', 120)` → [the strip, what is left]. */
export function take(box, side, size, gap = 0) {
  if (side === 'top') return [{ ...box, h: size }, { ...box, y: box.y + size + gap, h: box.h - size - gap }];
  if (side === 'bottom') return [{ ...box, y: box.y + box.h - size, h: size }, { ...box, h: box.h - size - gap }];
  if (side === 'left') return [{ ...box, w: size }, { ...box, x: box.x + size + gap, w: box.w - size - gap }];
  return [{ ...box, x: box.x + box.w - size, w: size }, { ...box, w: box.w - size - gap }];
}

export function video(id, title, options = {}) {
  const [width, height] = options.size ?? [1920, 1080];
  const language = options.language ?? 'en';
  const short = Math.min(width, height);
  const stage = { width, height, fps: options.fps ?? 30, background: options.background ?? '#0b1626', ...(options.theme ? { theme: options.theme } : {}), ...(options.fontFamily ? { fontFamily: options.fontFamily } : {}), ...(options.caption ? { caption: options.caption } : {}) };
  const strings = {};
  const tracks = { base: [], overlay: [], cards: [] };
  const lines = [];
  const sounds = [];
  // The same sound for the same event, every time: { card, quiz, answer, volume }, each an asset key or a path.
  const events = options.eventSounds ?? {};
  const cue = (kind, at) => {
    if (events[kind]) sounds.push({ src: events[kind], start: at, volume: events.volume ?? 0.35 });
  };
  const markers = [];
  const pronunciations = [];
  const assets = {};
  const shots = [{ id: 's1', name: 'opening', at: '@start', first: null }];
  let pendingWait = 0;
  let pendingAfter = null;
  let pendingChapters = [];
  let lastLine = null;
  const counters = {};
  const ids = new Set(['s1']);
  const extra = {};
  // Details: named parts that can be left out. `omit` lists the ones to leave out; a tool's --omit flag adds to it.
  // The name 'all' leaves out every detail: what remains is the core of the video.
  // The name 'deep' leaves out the details marked { deep: true }: the second layer of depth.
  const omit = new Set([...(options.omit ?? []), ...(globalThis.__VIDEO_OMIT__ ?? [])]);
  const omitAll = omit.delete('all');
  const omitDeep = omit.delete('deep');
  const details = [];
  const fresh = (prefix) => {
    let name;
    do name = `${prefix}${(counters[prefix] = (counters[prefix] ?? 0) + 1)}`;
    while (ids.has(name));
    ids.add(name);
    return name;
  };
  const claim = (name) => {
    if (ids.has(name)) throw new Error(`video "${id}": two things are called "${name}"`);
    ids.add(name);
    return name;
  };

  /** Files a text for translation and returns the reference to use in its place. */
  function t(text, key) {
    if (text === undefined || text === null) return undefined;
    if (typeof text !== 'string' || text === '') return text; // an empty text has nothing to translate
    let k = key ?? keyOf(text);
    while (!key && strings[k] !== undefined && strings[k] !== text) k += 'x';
    strings[k] = text;
    return { $t: k };
  }

  const shot = () => shots[shots.length - 1];
  const nextShotRef = (index) => (index + 1 < shots.length ? `@${shots[index + 1].id}` : null);

  function handle(clip) {
    const h = {
      id: clip.id,
      ref: `@${clip.id}`,
      clip,
      /** Runs a command on this clip. `at` is a time reference (usually a line) or seconds from the clip's start. */
      cmd(at, name, args = {}, duration = 0, opts = {}) {
        const kid = fresh('k');
        (clip.commands ??= []).push({ id: kid, at, name, args, ...(duration ? (typeof duration === 'string' ? { until: duration } : { duration }) : {}), ...(opts.ease ? { ease: opts.ease } : {}) });
        return `@${kid}`;
      },
      /** Moves, resizes, fades, scales or turns the whole clip: keyframe('opacity', [[a, 0], [`${a}+1`, 1]]). */
      keyframe(prop, points) {
        (clip.keyframes ??= {})[prop] = points.map(([at, value, ease]) => ({ at, value, ...(ease ? { ease } : {}) }));
        return h;
      },
    };
    return h;
  }

  const api = {
    id,
    stage,
    width,
    height,
    t,

    /** The part of the stage that is safe for content: inside the margins and above the captions. */
    area({ captions = true, margin = short * 0.06 } = {}) {
      const bottom = captions ? height * 0.17 : margin;
      return { x: margin, y: margin, w: width - margin * 2, h: height - margin - bottom };
    },

    /** Says a line. Returns its time reference ("@n3"). opts: { gap, caption, speaker, id, voice } */
    say(text, opts = {}) {
      const lineId = opts.id ? claim(opts.id) : fresh('n');
      const ref = `@${lineId}`;
      const line = { id: lineId, text: t(text) };
      const gap = (opts.gap ?? null) === null ? null : opts.gap;
      // After a word card, the next line waits until the card has gone.
      if (pendingAfter) line.start = `${pendingAfter}+${Math.round((0.3 + pendingWait) * 100) / 100}`;
      else if (pendingWait > 0 || gap !== null) line.gap = (gap ?? options.gap ?? 0.5) + pendingWait;
      pendingWait = 0;
      pendingAfter = null;
      if (opts.caption !== undefined) line.caption = opts.caption === false ? false : t(opts.caption);
      if (opts.speaker) line.speaker = opts.speaker;
      if (opts.voice) line.voice = opts.voice;
      if (opts.audio) line.audio = opts.audio;
      lines.push(line);
      const s = shot();
      if (!s.first) s.first = ref;
      for (const label of pendingChapters) markers.push({ kind: 'chapter', at: markers.some((m) => m.kind === 'chapter') || lines.length > 1 ? `${ref}-0.2` : '@start', label });
      pendingChapters = [];
      lastLine = ref;
      return ref;
    },

    /**
     * A detail: a named part of the video that can be left out without breaking the rest.
     *   v.detail('the-phone-call', () => { v.say('…'); pic.show(…); });
     * Leave it out with video(id, title, { omit: ['the-phone-call'] }), or try it with --omit on any tool.
     * { omit: ['all'] } or --omit all leaves out every detail, which shows the core alone.
     * Everything the detail needs (its lines, the commands timed to them, its own shots) goes inside the
     * function; nothing outside may use a line of it.
     * opts: { about }  one sentence for the list of details;
     *       { deep: true }  a second layer: further depth on something the video already tells.
     *                       { omit: ['deep'] } or --omit deep leaves out every deep detail at once;
     *       { within: 'name' }  this detail builds on the detail of that name (declared before it),
     *                       so it goes whenever that one goes. Without it, a detail may lean on the core only.
     */
    detail(name, fn, opts = {}) {
      if (name === 'all' || name === 'deep') throw new Error(`video "${id}": a detail cannot be called "${name}"; that name stands for a whole layer in omit`);
      if (details.some((d) => d.name === name)) throw new Error(`video "${id}": two details are called "${name}"`);
      const parent = opts.within ? details.find((d) => d.name === opts.within) : null;
      if (opts.within && !parent) throw new Error(`video "${id}": detail "${name}" is within "${opts.within}", but no detail of that name comes before it`);
      const entry = {
        name,
        omitted: omitAll || omit.has(name) || (omitDeep && !!opts.deep) || !!parent?.omitted,
        ...(opts.about ? { about: opts.about } : {}),
        ...(opts.deep ? { deep: true } : {}),
        ...(opts.within ? { within: opts.within } : {}),
        lines: [],
      };
      details.push(entry);
      if (entry.omitted) return undefined;
      const from = lines.length;
      const result = fn();
      entry.lines = lines.slice(from).map((l) => l.id);
      if (!entry.lines.length) throw new Error(`video "${id}": detail "${name}" says nothing. A detail is something the narrator tells; give it at least one line.`);
      return result;
    },

    /** Silence before the next line, on top of the usual gap. */
    wait(seconds) {
      pendingWait += seconds;
      return api;
    },
    /** A short breath: use it after a question, before an answer, and after a big idea. */
    beat() {
      return api.wait(0.7);
    },

    /** Starts a chapter at the next line. Chapters become the video's chapter list. */
    chapter(label) {
      pendingChapters.push(t(label));
      return api;
    },

    /** Starts a new shot: what is added from here on appears with the next line. opts: { at } to place it yourself. */
    shot(name, opts = {}) {
      const s = shot();
      if (shots.length === 1 && !s.first && tracks.base.length + tracks.overlay.length === 0) {
        s.name = name ?? s.name;
        return api;
      }
      shots.push({ id: fresh('s'), name: name ?? `shot ${shots.length + 1}`, at: opts.at ?? null, first: null });
      return api;
    },

    /**
     * Adds a clip to the current shot. opts: { box, in, out, track, start, end, hold, opacity, scale, rotate }
     *   box:  where it goes (default: area(), the safe area above the captions); 'stage' for the whole picture
     *   hold: true keeps it to the end of the video (a logo, a background, a running heading).
     */
    add(clipId, module, props = {}, opts = {}) {
      const index = shots.length - 1;
      const clip = { id: clipId ? claim(clipId) : fresh('c'), module, start: opts.start ?? `@${shots[index].id}`, props };
      clip.shot = index;
      if (opts.end !== undefined) clip.end = opts.end;
      else if (opts.duration !== undefined) clip.duration = opts.duration;
      else if (!opts.hold) clip.endsWithShot = true;
      // Content goes in the safe area unless told otherwise; box: 'stage' fills the whole picture (backgrounds, film).
      if (opts.box !== 'stage') clip.box = opts.box ?? api.area();
      for (const k of ['opacity', 'scale', 'rotate']) if (opts[k] !== undefined) clip[k] = opts[k];
      clip.in = opts.in ?? 'fade';
      if (opts.out) clip.out = opts.out;
      else clip.fadesOut = true;
      (tracks[opts.track ?? 'base'] ??= []).push(clip);
      return handle(clip);
    },

    /** A title shot: a big heading and an optional line under it. */
    title(text, subtitle, opts = {}) {
      api.shot(opts.name ?? 'title');
      const a = api.area({ captions: opts.captions ?? true });
      const [top, rest] = take(a, 'top', a.h * (subtitle ? 0.6 : 1));
      const heading = api.add(null, 'text', { text: t(text), role: 'title', valign: subtitle ? 'bottom' : 'center' }, { box: top, in: opts.in ?? 'slide-up' });
      const sub = subtitle ? api.add(null, 'text', { text: t(subtitle), role: 'subtitle', valign: 'top' }, { box: inset(rest, short * 0.02), in: opts.in ?? 'fade' }) : null;
      return { heading, sub };
    },

    /** A scene (boxes, words, pictures and arrows you can move and point at). Returns a director. */
    scene(clipId, nodes, opts = {}) {
      const box = opts.box ?? api.area();
      const props = { nodes: nodes.map((n) => (n.text !== undefined ? { ...n, text: t(n.text) } : n)), ...(opts.width ? { width: opts.width, height: opts.height } : {}), ...(opts.background ? { background: opts.background } : {}) };
      return sceneDirector(api.add(clipId, 'scene', props, { ...opts, box }), t);
    },

    /** Pointing over the whole stage, on top of everything in the shot. Returns an annotator. */
    annotate(clipId, opts = {}) {
      return annotator(api.add(clipId, 'annotate', {}, { track: 'overlay', in: 'cut', out: 'cut', box: 'stage', ...opts }), t);
    },

    /**
     * A word card: the new word in the middle of the screen with its plain meaning.
     * Shown while `line` is spoken (default: the last line said) and for `hold`
     * seconds after, and never for less time than it takes to read. The next
     * line waits until the card has gone, so nothing is said or changed behind it.
     * opts: { say, caption, example, sounds, hold }
     *   say  a sentence spoken while the card is up, usually the meaning in the
     *        narrator's words. Hearing and reading the same idea together is what
     *        makes a new word stick; without it the card is read in silence.
     *   caption  how that sentence is written in the captions, when it differs (digits).
     */
    term(word, meaning, line = lastLine, opts = {}) {
      if (!line) throw new Error(`video "${id}": term("${word}") needs a line to appear with`);
      const reading = 1.5 + wordCount(`${word} ${meaning} ${opts.example ?? ''}`) / 3;
      let last = line;
      if (opts.say) {
        if (line !== lastLine) throw new Error(`video "${id}": term("${word}", { say }) must come straight after the line it appears with`);
        last = api.say(opts.say, { gap: 0.5, ...(opts.caption !== undefined ? { caption: opts.caption } : {}) });
      }
      const clip = { id: fresh('term'), module: 'term', start: line, end: `${last}.end+${opts.hold ?? 0.8}`, minDuration: Math.ceil(reading * 10) / 10, props: { word: t(word), meaning: t(meaning), ...(opts.example ? { example: t(opts.example) } : {}), ...(opts.sounds ? { sounds: t(opts.sounds) } : {}) } };
      tracks.cards.push(clip);
      cue('card', line);
      if (last === lastLine) pendingAfter = `@${clip.id}.end`;
      return handle(clip);
    },

    /**
     * A quick quiz (pause and think). The narrator says that a question is coming, reads the
     * question aloud as its card appears, and then stays silent while the countdown runs.
     * The next line (the answer) starts when the countdown is over.
     * The question must be one the viewer can answer from what they have already been shown.
     * opts: { hint, shade, intro, label, say, caption }
     *   intro:   the line that announces it (default "Here is a quick quiz."); false only when
     *            the line before already tells the viewer a question is coming
     *   label:   the small heading on the card (default "Quick quiz"); false for none
     *   say:     the question as it should be spoken, when that differs from what is shown
     *   caption: the caption for the spoken question, when it differs
     */
    think(question, seconds = 4, opts = {}) {
      if (typeof question !== 'string' && !opts.say) throw new Error(`video "${id}": think() needs { say } when the question is not plain text, so that it can be read aloud`);
      const cid = fresh('think');
      const intro = opts.intro !== false ? api.say(opts.intro ?? 'Here is a quick quiz.', { id: `${cid}-intro` }) : null;
      const spoken = opts.say ?? question.replace(/\*\*/g, '').replace(/\s*\n\s*/g, ' ');
      const line = api.say(spoken, { id: `${cid}-ask`, ...(opts.caption !== undefined ? { caption: opts.caption } : {}) });
      cue('quiz', intro ?? line);
      cue('answer', `@${cid}.end`);
      const label = opts.label === false ? null : opts.label ?? 'Quick quiz';
      const props = { question: t(question), seconds, shade: opts.shade ?? 1, ...(label ? { label: t(label) } : {}), ...(opts.hint ? { hint: t(opts.hint) } : {}) };
      // The card arrives with the spoken question and stays for the thinking time after it.
      const clip = { id: cid, module: 'countdown', start: line, end: `${line}.end+${seconds}`, props, in: 'fade', out: 'fade' };
      tracks.cards.push(clip);
      markers.push({ kind: 'pause', at: `${line}.end`, label: t(question) });
      pendingAfter = `@${cid}.end`;
      return handle(clip);
    },

    /**
     * A recap shot: a heading and the points, each arriving with its own spoken line.
     * rows: [[onScreen, spoken, caption?], …]. Returns the list clip's handle.
     */
    recap(heading, items, opts = {}) {
      api.shot(opts.name ?? 'recap');
      const list = api.add(null, 'list', { heading: t(heading), items: items.map(([shown]) => t(shown)), style: opts.style ?? 'checks' }, { box: inset(api.area(), short * 0.04) });
      items.forEach(([, spoken, caption], i) => list.cmd(api.say(spoken, caption === undefined ? {} : { caption }), 'show', { count: i + 1 }, 0.4));
      return list;
    },

    /** A marker: note (for you), cue (for an editor), pause, chapter. */
    mark(kind, at, label) {
      markers.push({ kind, at, label: t(label) });
      return api;
    },

    /** A sound at a moment (a pop when something appears). `src` is an asset key or a path. */
    sfx(src, at, opts = {}) {
      sounds.push({ src, start: at, volume: opts.volume ?? 0.6 });
      return api;
    },
    /**
     * Music from `start` to `end`, turned down while someone is speaking. Give it a part of the
     * video (an opening, a story, the ending): music(src, { start: firstLine, end: `${lastLine}.end+2` }).
     * Without `start` and `end` it plays under the whole video, which suits a short piece only.
     * Music rests while a deep detail is told (it fades out before and begins again after), so a
     * part keeps the amount of music it was given when the deep layer is in. { overDeep: true }
     * makes it play through.
     */
    music(src, opts = {}) {
      sounds.push({ src, start: opts.start ?? '@start', end: opts.end ?? '@end', volume: opts.volume ?? 0.25, loop: opts.loop ?? true, fadeIn: opts.fadeIn ?? 1, fadeOut: opts.fadeOut ?? 2, duck: opts.duck ?? true, ...(opts.overDeep ? { overDeep: true } : {}) });
      return api;
    },
    /** Names a file so clips can use the name: asset('logo', 'assets/logo.png'). */
    asset(key, path) {
      assets[key] = path;
      return key;
    },
    /** Tells the voice how to say something it would get wrong; captions keep the written form. */
    pronounce(text, say, lang) {
      pronunciations.push({ text, say, ...(lang ? { language: lang } : {}) });
      return api;
    },
    /** Adds translations: translate('fr', { key: 'texte' }) (keys are in `build().strings`). */
    translate(lang, table) {
      extra[lang] = { ...extra[lang], ...table };
      return api;
    },

    build() {
      if (lines.length === 0 && options.duration === undefined) throw new Error(`video "${id}": nothing is said; give the video a duration: video(id, title, { duration: 20 })`);
      // Shots start a moment before their first line, so the picture is there when the voice begins.
      shots.forEach((s, i) => {
        if (i === 0 || s.at) return;
        if (!s.first) throw new Error(`video "${id}": shot "${s.name}" has no narration, so it has no time to start at. Say a line in it, or place it: shot(name, { at })`);
        s.at = `${s.first}-0.25`;
      });
      const finish = (clip) => {
        const { shot: index, endsWithShot, fadesOut, ...rest } = clip;
        if (endsWithShot) rest.end = nextShotRef(index) ?? '@end';
        // Clips fade out when their shot ends, but the last picture of the video stays (it is what an end screen shows).
        if (fadesOut && (rest.end === undefined || rest.end === '@end')) rest.out = 'cut';
        else if (fadesOut) rest.out = 'fade';
        return rest;
      };
      const visual = Object.entries(tracks)
        .filter(([, clips]) => clips.length)
        .map(([name, clips]) => ({ id: name, kind: 'visual', clips: clips.map(finish) }));
      const script = {
        format: 'video-script',
        version: 1,
        id,
        title: t(title),
        stage,
        defaultLanguage: language,
        ...(options.voice ? { voice: options.voice } : {}),
        ...(options.speakers ? { speakers: options.speakers } : {}),
        ...(options.pace ? { pace: options.pace } : {}),
        ...(options.gap !== undefined ? { gap: options.gap } : {}),
        ...(options.duration !== undefined ? { duration: options.duration } : {}),
        tail: Math.max(options.tail ?? 2, pendingWait + 1),
        ...(options.layouts ? { layouts: options.layouts } : {}),
        ...(Object.keys(assets).length ? { assets } : {}),
        ...(options.fonts ? { fonts: options.fonts } : {}),
        ...(pronunciations.length ? { pronunciations } : {}),
        strings: { [language]: strings, ...extra },
        tracks: [...visual, ...(lines.length ? [{ id: 'voice', kind: 'narration', segments: lines }] : []), ...(sounds.length ? [{ id: 'sound', kind: 'audio', clips: sounds }] : [])],
        markers: [...shots.slice(1).map((s) => ({ id: s.id, kind: 'note', at: s.at, label: `shot: ${s.name}` })), ...markers],
      };
      const unknown = [...omit].filter((name) => !details.some((d) => d.name === name));
      if (unknown.length) throw new Error(`video "${id}": omit names ${unknown.map((n) => `"${n}"`).join(', ')}, but there is no detail with that name. There ${details.length === 1 ? 'is' : 'are'}: ${details.map((d) => d.name).join(', ') || '(none)'}`);
      if (details.length) script.details = details;
      // The first shot is the start of the video.
      script.markers.unshift({ id: shots[0].id, kind: 'note', at: '@start', label: `shot: ${shots[0].name}` });
      return script;
    },
  };
  return api;
}

/** Friendlier names for a scene clip's commands. Every method takes the time first and returns the command's reference. */
export function sceneDirector(h, t = (x) => x) {
  const tx = (nodes) => Object.fromEntries(Object.entries(nodes).map(([k, n]) => [k, n && n.text !== undefined ? { ...n, text: t(n.text) } : n]));
  return {
    ...h,
    /** Changes, adds or removes nodes: set(a, { coin: { x: 400 }, old: null }, 0.6) */
    set: (at, nodes, duration = 0, opts = {}) => h.cmd(at, 'set', { nodes: tx(nodes), ...(opts.arc ? { arc: opts.arc } : {}) }, duration, opts),
    /** Adds nodes (they fade in over the duration). */
    add: (at, nodes, duration = 0.4) => h.cmd(at, 'set', { nodes: tx(Object.fromEntries(nodes.map((n) => [n.id, n]))) }, duration),
    remove: (at, nodeIds, duration = 0.3) => h.cmd(at, 'set', { nodes: Object.fromEntries([nodeIds].flat().map((n) => [n, null])) }, duration),
    show: (at, nodeIds, duration = 0.4) => h.cmd(at, 'set', { nodes: Object.fromEntries([nodeIds].flat().map((n) => [n, { opacity: 1 }])) }, duration),
    hide: (at, nodeIds, duration = 0.3) => h.cmd(at, 'set', { nodes: Object.fromEntries([nodeIds].flat().map((n) => [n, { opacity: 0 }])) }, duration),
    move: (at, node, to, duration = 0.6, opts = {}) => h.cmd(at, 'set', { nodes: { [node]: to }, ...(opts.arc ? { arc: opts.arc } : {}) }, duration, opts),
    text: (at, node, text) => h.cmd(at, 'set', { nodes: { [node]: { text: t(text) } } }),
    /** Dim everything but the target. opts: { label, side } */
    spot: (at, target, opts = {}) => h.cmd(at, 'point', { target, style: 'spot', ...(opts.label ? { label: t(opts.label), side: opts.side ?? 'below' } : {}) }),
    ring: (at, target, opts = {}) => h.cmd(at, 'point', { target, style: 'ring', ...(opts.label ? { label: t(opts.label), side: opts.side ?? 'below' } : {}) }),
    arrow: (at, target, from = 'above', opts = {}) => h.cmd(at, 'point', { target, style: 'arrow', from, ...(opts.label ? { label: t(opts.label), side: opts.side ?? 'below' } : {}) }),
    finger: (at, target) => h.cmd(at, 'point', { target, style: 'finger' }),
    clear: (at, duration = 0.25) => h.cmd(at, 'clear', {}, duration),
    tap: (at, target, duration = 0.9) => h.cmd(at, 'tap', { target }, duration, { ease: 'linear' }),
    drag: (at, node, to, duration = 1.4) => h.cmd(at, 'drag', { node, to }, duration, { ease: 'linear' }),
    swipe: (at, from, to, duration = 0.8) => h.cmd(at, 'swipe', { from, to }, duration, { ease: 'linear' }),
    /** Zooms the camera to a node, a list of nodes or a box; reset() zooms back out. */
    camera: (at, target, duration = 0.8, opts = {}) => h.cmd(at, 'camera', typeof target === 'object' && !Array.isArray(target) ? target : { target, ...(opts.pad !== undefined ? { pad: opts.pad } : {}) }, duration),
    reset: (at, duration = 0.8) => h.cmd(at, 'camera', { reset: true }, duration),
  };
}

/** Friendlier names for an annotate clip's commands. */
export function annotator(h, t = (x) => x) {
  const point = (style) => (at, target, opts = {}) => h.cmd(at, 'point', { target, style, ...(opts.from ? { from: opts.from } : {}), ...(opts.label ? { label: t(opts.label), side: opts.side ?? 'below' } : {}) });
  return {
    ...h,
    spot: point('spot'),
    ring: point('ring'),
    arrow: point('arrow'),
    finger: point('finger'),
    tap: (at, target, duration = 0.9) => h.cmd(at, 'tap', { target }, duration, { ease: 'linear' }),
    label: (at, target, text, opts = {}) => h.cmd(at, 'label', { target, text: t(text), ...(opts.side ? { side: opts.side } : {}), ...(opts.key ? { key: opts.key } : {}) }),
    unlabel: (at, key) => h.cmd(at, 'unlabel', key === undefined ? {} : { key }),
    clear: (at, duration = 0.25) => h.cmd(at, 'clear', {}, duration),
  };
}
