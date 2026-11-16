// The live player page. It draws the same frames the export draws, against a
// clock, and plays the recorded narration and sounds alongside.
// (Music is not turned down under speech here; the export does that.)
import { compile } from '../compile.js';
import { createRenderer } from './renderer.js';

const $ = (id) => document.getElementById(id);
const { default: modules } = await import('/modules/index.js');
const renderer = createRenderer($('view'), { modules });
const clock = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const params = new URLSearchParams(location.search);

let timeline = null;
let voice = { files: {}, durations: {} };
let time = Number(params.get('t') ?? 0);
let playing = false;
let lastTick = 0;
const sounds = new Map(); // key → HTMLAudioElement

function fill(select, values, chosen, label = (v) => v) {
  select.replaceChildren(...values.map((v) => Object.assign(document.createElement('option'), { value: v, textContent: label(v), selected: v === chosen })));
  select.style.display = values.length > 1 ? '' : 'none';
}

async function load(keepTime = true) {
  $('error').textContent = '';
  const id = $('video').value;
  const lang = $('language').value;
  const data = await (await fetch(`/__video/${encodeURIComponent(id)}?lang=${encodeURIComponent(lang)}`)).json();
  if (data.error) {
    $('error').textContent = data.error;
    return;
  }
  const language = data.languages.includes(lang) ? lang : data.script.defaultLanguage ?? data.languages[0];
  fill($('language'), data.languages, language);
  fill($('layout'), ['', ...data.layouts], data.layouts.includes($('layout').value) ? $('layout').value : '', (v) => v || 'default layout');
  voice = data.voice;
  try {
    timeline = compile(data.script, { modules, language, layout: $('layout').value || undefined, durations: voice.durations });
  } catch (e) {
    $('error').textContent = e.message;
    return;
  }
  renderer.load(timeline, { captions: $('captions').checked });
  for (const a of sounds.values()) a.pause();
  sounds.clear();
  $('voice').textContent = voice.provider ? `voice: ${voice.provider}${voice.stale.length ? ` (${voice.stale.length} stale)` : ''}` : 'no recorded voice (timing estimated)';
  document.title = timeline.title;
  // Chapter ticks and where the lines are.
  for (const n of [...$('bar').querySelectorAll('.tick, .line')]) n.remove();
  for (const c of timeline.chapters) {
    const tick = Object.assign(document.createElement('div'), { className: 'tick', title: c.label });
    tick.style.left = `${(c.start / timeline.duration) * 100}%`;
    $('bar').appendChild(tick);
  }
  for (const s of timeline.segments) {
    const line = Object.assign(document.createElement('div'), { className: 'line', title: `${s.id}: ${s.text}` });
    line.style.left = `${(s.start / timeline.duration) * 100}%`;
    line.style.width = `${((s.end - s.start) / timeline.duration) * 100}%`;
    $('bar').appendChild(line);
  }
  time = keepTime ? Math.min(time, timeline.duration) : 0;
  await draw();
}

function audioFor(key, src) {
  if (!sounds.has(key)) {
    const a = new Audio(src);
    a.preload = 'auto';
    sounds.set(key, a);
  }
  return sounds.get(key);
}

/** Starts, corrects and stops sounds so that what is heard matches `time`. */
function syncSound() {
  const wanted = new Map();
  if (playing && timeline) {
    for (const s of timeline.segments) {
      const file = voice.files[s.id];
      if (file && time >= s.start && time < s.start + voice.durations[s.id]) wanted.set(`line:${s.id}`, { src: `/${file}`, at: time - s.start, volume: 1 });
    }
    timeline.sounds.forEach((s, i) => {
      const end = s.end ?? (s.loop ? timeline.duration : Infinity);
      if (time >= s.start && time < end) wanted.set(`sound:${i}`, { src: `/${timeline.assets?.[s.src] ?? s.src}`, at: s.from + (time - s.start), volume: s.volume, loop: s.loop });
    });
  }
  const rate = Number($('speed').value);
  for (const [key, w] of wanted) {
    const a = audioFor(key, w.src);
    a.volume = Math.min(1, w.volume);
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

async function draw() {
  if (!timeline) return;
  const frame = await renderer.show(time);
  $('done').style.width = `${(time / timeline.duration) * 100}%`;
  $('time').textContent = `${clock(time)} / ${clock(timeline.duration)}  ·  frame ${Math.round(time * timeline.fps)}`;
  $('now').textContent = `${frame.chapter ? `${frame.chapter.label}  ·  ` : ''}${frame.line ? `${frame.line.id}: ${frame.line.text}` : ''}`;
}

function tick(now) {
  if (playing && timeline) {
    time += ((now - lastTick) / 1000) * Number($('speed').value);
    if (time >= timeline.duration) {
      time = timeline.duration;
      setPlaying(false);
    }
    renderer.render(time);
    $('done').style.width = `${(time / timeline.duration) * 100}%`;
    $('time').textContent = `${clock(time)} / ${clock(timeline.duration)}  ·  frame ${Math.round(time * timeline.fps)}`;
    const frame = renderer.frame;
    $('now').textContent = `${frame.chapter ? `${frame.chapter.label}  ·  ` : ''}${frame.line ? `${frame.line.id}: ${frame.line.text}` : ''}`;
    syncSound();
  }
  lastTick = now;
  requestAnimationFrame(tick);
}

function setPlaying(on) {
  if (on && timeline && time >= timeline.duration) time = 0;
  playing = on;
  $('play').textContent = on ? 'Pause' : 'Play';
  syncSound();
}

async function seek(to) {
  if (!timeline) return;
  time = Math.max(0, Math.min(timeline.duration, to));
  $('problems').replaceChildren();
  await draw();
  syncSound();
}

function audit() {
  const found = renderer.audit();
  $('problems').replaceChildren(...(found.length ? found : [{ severity: 'ok', clip: '', message: 'Nothing wrong found in this frame (the audit cannot judge looks: use your eyes too).' }]).map((p) => Object.assign(document.createElement('li'), { textContent: `${p.severity}  ${p.clip}  ${p.message}` })));
}

$('play').onclick = () => setPlaying(!playing);
$('reload').onclick = () => load();
$('audit').onclick = audit;
$('video').onchange = () => load(false);
$('language').onchange = () => load();
$('layout').onchange = () => load();
$('captions').onchange = () => load();
$('bar').onpointerdown = (e) => {
  const move = (ev) => {
    const r = $('bar').getBoundingClientRect();
    seek(((ev.clientX - r.left) / r.width) * timeline.duration);
  };
  move(e);
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
};
window.addEventListener('resize', () => {
  renderer.fit();
});
window.addEventListener('keydown', (e) => {
  if (!timeline || e.target.tagName === 'SELECT') return;
  const step = e.shiftKey ? 1 : 1 / timeline.fps;
  if (e.key === ' ') setPlaying(!playing);
  else if (e.key === 'ArrowRight') seek(time + step);
  else if (e.key === 'ArrowLeft') seek(time - step);
  else if (e.key === ']') seek(timeline.segments.find((s) => s.start > time + 0.01)?.start ?? timeline.duration);
  else if (e.key === '[') seek([...timeline.segments].reverse().find((s) => s.start < time - 0.01)?.start ?? 0);
  else if (e.key === 'r' || e.key === 'R') load();
  else if (e.key === 'a' || e.key === 'A') audit();
  else if (e.key === 'c' || e.key === 'C') {
    $('captions').checked = !$('captions').checked;
    load();
  } else return;
  e.preventDefault();
});

const videos = await (await fetch('/__videos')).json();
fill($('video'), videos, params.get('video') ?? videos[0]);
$('video').style.display = '';
if (videos.length) await load();
else $('error').textContent = 'No videos yet: add one to videos/';
requestAnimationFrame(tick);
// For tools and tests.
window.__player = { seek, audit: () => renderer.audit(), get time() { return time; }, get timeline() { return timeline; } };
window.__ready = true;
