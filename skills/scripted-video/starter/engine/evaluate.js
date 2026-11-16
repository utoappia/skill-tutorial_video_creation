// evaluate(timeline, t) → frame: everything on screen at one moment.
//
// A frame is a pure function of the timeline and the time. Renderers draw
// from it and nothing else (no timers, no CSS animations), so seeking to any
// time gives exactly the picture that playing up to it would.
import { clamp01, easing, lerp } from './easing.js';

function keyframed(list, time, fallback) {
  if (!list || list.length === 0) return fallback;
  if (time <= list[0].time) return list[0].value;
  for (let i = 1; i < list.length; i++) {
    const b = list[i];
    if (time < b.time) {
      const a = list[i - 1];
      return lerp(a.value, b.value, easing(b.ease)((time - a.time) / (b.time - a.time)));
    }
  }
  return list[list.length - 1].value;
}

export function evaluate(timeline, t) {
  const time = Math.min(Math.max(0, t), timeline.duration);
  const atEnd = time >= timeline.duration;
  const layers = [];
  for (const L of timeline.layers) {
    // A clip that lasts to the end of the video is still there on the very last frame.
    if (time < L.start || (time >= L.end && !(atEnd && L.end >= timeline.duration))) continue;
    let state = L.initial;
    const active = [];
    for (const c of L.commands) {
      if (c.start > time) break;
      state = c.to;
      if (time < c.end) {
        const linear = clamp01((time - c.start) / (c.end - c.start));
        active.push({ command: c, from: c.from, to: c.to, linear, progress: easing(c.ease)(linear) });
      }
    }
    const k = L.keyframes;
    const box = { x: keyframed(k.x, time, L.box.x), y: keyframed(k.y, time, L.box.y), w: keyframed(k.w, time, L.box.w), h: keyframed(k.h, time, L.box.h) };
    const enter = L.in && time < L.start + L.in.duration ? { type: L.in.type, progress: easing(L.in.ease)((time - L.start) / L.in.duration) } : null;
    const exit = L.out && time > L.end - L.out.duration ? { type: L.out.type, progress: easing(L.out.ease)((time - (L.end - L.out.duration)) / L.out.duration) } : null;
    layers.push({
      id: L.id,
      module: L.module,
      track: L.track,
      z: L.z,
      props: L.props,
      state,
      active,
      box,
      opacity: keyframed(k.opacity, time, L.opacity),
      scale: keyframed(k.scale, time, L.scale),
      rotate: keyframed(k.rotate, time, L.rotate),
      enter,
      exit,
      start: L.start,
      end: L.end,
      localTime: time - L.start,
    });
  }
  let caption = null;
  for (const c of timeline.captions) {
    if (c.start > time) break;
    if (time < c.end) caption = c;
  }
  let chapter = null;
  for (const c of timeline.chapters) if (time >= c.start) chapter = c;
  let line = null;
  for (const s of timeline.segments) if (time >= s.start && time < s.end) line = s;
  return { time, duration: timeline.duration, stage: timeline.stage, layers, caption, chapter, line };
}

/** Subtitle cues of a timeline: [{ start, end, text }]. */
export function subtitleCues(timeline) {
  return timeline.captions.map((c) => ({ start: c.start, end: c.end, text: c.text }));
}

const stamp = (seconds, sep) => {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};

/** SubRip (.srt) text for cues. `offset` shifts them (a range export starts at 0). */
export function toSrt(cues, offset = 0) {
  return cues.map((c, i) => `${i + 1}\n${stamp(c.start - offset, ',')} --> ${stamp(c.end - offset, ',')}\n${c.text}\n`).join('\n');
}

/** WebVTT (.vtt) text for cues. */
export function toVtt(cues, offset = 0) {
  return `WEBVTT\n\n${cues.map((c) => `${stamp(c.start - offset, '.')} --> ${stamp(c.end - offset, '.')}\n${c.text}\n`).join('\n')}`;
}
