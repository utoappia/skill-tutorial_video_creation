// A small player for putting a scripted video in a web page or a web view,
// drawn live instead of as a video file: sharp at any size, a few hundred
// kilobytes, and its language, captions and layout can be switched on the spot.
//
//   import { createPlayer } from './engine/web/embed.js';
//   import modules from './modules/index.js';
//
//   const player = createPlayer(document.getElementById('stage'), {
//     script,                                  // the script object (video.json from tools/bundle.mjs)
//     modules,
//     base: './',                              // where asset and voice paths start from
//     language: 'es',                          // default: the script's default language
//     layout: 'vertical',                      // default: none
//     voice: { durations: { n1: 2.4 }, files: { n1: 'voice/en/n1.m4a' } },   // from the bundle; optional
//     onTime: (t, frame) => {},                // every frame drawn after this call returns
//     onEnd: () => {},
//   });
//   button.onclick = () => player.toggle();    // browsers only start sound after a tap or a click
//
// The container needs a size (for example `width: 100%; aspect-ratio: 16 / 9`).
import { compile } from '../compile.js';
import { createRenderer } from './renderer.js';

const ABSOLUTE = /^(?:[a-z]+:|\/)/i;

export function createPlayer(container, { script, modules, base = './', language, layout, captions = true, voice = {}, onTime, onEnd } = {}) {
  const durations = voice.durations ?? {};
  const files = voice.files ?? {};
  const timeline = compile(script, { modules, language, layout, durations });
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  container.style.overflow = 'hidden';
  const renderer = createRenderer(container, { modules, base });
  renderer.load(timeline, { captions });
  const url = (path) => (ABSOLUTE.test(path) ? path : base + path);

  const sounds = new Map(); // key → HTMLAudioElement
  let time = 0;
  let playing = false;
  let rate = 1;
  let last = 0;
  let raf = 0;
  let gone = false;

  /** Starts, corrects and stops sounds so that what is heard matches `time`. */
  function syncSound() {
    const wanted = new Map();
    if (playing) {
      for (const s of timeline.segments) {
        if (files[s.id] && time >= s.start && time < s.start + (durations[s.id] ?? s.end - s.start)) wanted.set(`line:${s.id}`, { src: url(files[s.id]), at: time - s.start, volume: 1 });
      }
      timeline.sounds.forEach((s, i) => {
        const end = s.end ?? (s.loop ? timeline.duration : Infinity);
        if (time >= s.start && time < end) wanted.set(`sound:${i}`, { src: url(timeline.assets?.[s.src] ?? s.src), at: s.from + (time - s.start), volume: s.volume, loop: s.loop });
      });
    }
    for (const [key, w] of wanted) {
      let a = sounds.get(key);
      if (!a) {
        a = new Audio(w.src);
        a.preload = 'auto';
        sounds.set(key, a);
      }
      a.volume = Math.max(0, Math.min(1, w.volume));
      a.loop = !!w.loop;
      a.playbackRate = rate;
      const at = w.loop && a.duration ? w.at % a.duration : w.at;
      if (a.paused || Math.abs(a.currentTime - at) > 0.25) {
        if (a.duration && at >= a.duration) continue;
        a.currentTime = at;
        a.play().catch(() => {});
      }
    }
    for (const [key, a] of sounds) if (!wanted.has(key) && !a.paused) a.pause();
  }

  function draw() {
    const frame = renderer.render(time);
    onTime?.(time, frame);
  }

  function tick(now) {
    if (gone) return;
    if (playing) {
      time += ((now - last) / 1000) * rate;
      if (time >= timeline.duration) {
        time = timeline.duration;
        playing = false;
        draw();
        syncSound();
        onEnd?.();
        return;
      }
      draw();
      syncSound();
      raf = requestAnimationFrame(tick);
    }
    last = now;
  }

  const resize = typeof ResizeObserver === 'function' ? new ResizeObserver(() => renderer.fit()) : null;
  resize?.observe(container);
  renderer.render(time); // the first frame; onTime is only called once the player has been returned

  const api = {
    timeline,
    get duration() {
      return timeline.duration;
    },
    get time() {
      return time;
    },
    get playing() {
      return playing;
    },
    play() {
      if (playing || gone) return;
      if (time >= timeline.duration) time = 0;
      playing = true;
      last = performance.now();
      syncSound();
      raf = requestAnimationFrame(tick);
    },
    pause() {
      playing = false;
      cancelAnimationFrame(raf);
      syncSound();
    },
    toggle() {
      playing ? api.pause() : api.play();
    },
    seek(to) {
      time = Math.max(0, Math.min(timeline.duration, Number(to) || 0));
      draw();
      syncSound();
    },
    setRate(value) {
      rate = Number(value) || 1;
    },
    setCaptions(on) {
      renderer.load(timeline, { captions: !!on });
      draw();
    },
    /** What is wrong with the picture on screen (see the renderer's audit). */
    audit: () => renderer.audit(),
    destroy() {
      gone = true;
      playing = false;
      cancelAnimationFrame(raf);
      resize?.disconnect();
      for (const a of sounds.values()) a.pause();
      sounds.clear();
      renderer.stageEl.remove();
    },
  };
  return api;
}
