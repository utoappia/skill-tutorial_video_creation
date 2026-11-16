// The automation API of frame.html. The tools (stills, export) drive it:
//
//   await __video.load(script, { language, layout, durations, captions })
//       → { duration, fps, width, height, warnings }
//   await __video.seek(t)   → true when the picture changed since the last seek
//   __video.audit()         → problems with what is on screen now
import { compile } from '../compile.js';
import { createRenderer } from './renderer.js';

const params = new URLSearchParams(location.search);
// The project's module list: the standard modules plus the project's own.
const { default: modules } = await import(params.get('modules') ?? '/modules/index.js');
const renderer = createRenderer(document.getElementById('stage'), { modules });
let last = null;

window.__video = {
  load(script, options = {}) {
    const timeline = compile(script, { modules, language: options.language, layout: options.layout, durations: options.durations });
    renderer.load(timeline, { captions: options.captions });
    last = null;
    return { duration: timeline.duration, fps: timeline.fps, width: timeline.stage.width, height: timeline.stage.height, warnings: timeline.issues };
  },
  async seek(time) {
    await renderer.show(time);
    const sig = renderer.signature();
    if (sig === last) return false; // the same picture as the last seek: nothing to wait for
    last = sig;
    // Two animation frames: the browser has laid out and painted what was just set.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return true;
  },
  audit: () => renderer.audit(),
};
window.__ready = true;
