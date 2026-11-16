// `rect`, `image` and `video`: a filled box, a picture, and a film clip
// (a screen recording, b-roll, a generated shot).
import { lerp } from '../easing.js';
import { el, fill, px, set } from './dom.js';

// rect — props { fill?: black, gradient?, radius?, borderWidth?, borderColor?, shadow?: true | a CSS box shadow }
//        commands: set { any prop }   (colours change at once; use a clip's keyframes to fade or move)
export const rect = {
  type: 'rect',
  commands: ['set'],
  init: (props) => ({ fill: '#000000', ...props }),
  apply: (state, cmd) => ({ ...state, ...cmd.args }),
  mount(host) {
    const box = el('div', { ...fill, boxSizing: 'border-box', borderStyle: 'solid' }, host);
    return {
      update(layer) {
        const s = layer.state;
        set(box, {
          background: s.gradient ?? s.fill,
          borderRadius: px(s.radius ?? 0),
          borderWidth: px(s.borderWidth ?? 0),
          borderColor: s.borderColor ?? 'transparent',
          boxShadow: typeof s.shadow === 'string' ? s.shadow : s.shadow ? '0 12px 40px rgba(0,0,0,0.35)' : 'none',
        });
      },
    };
  },
};

// image — props { src, fit?: cover | contain | fill, radius?, zoom?: { scale, x, y } }
//   src is an asset key (script.assets) or a path from the project folder.
//   commands: set  { src?, fit?, radius? }
//             zoom { scale, x?, y? }   x, y: the point to zoom about, 0…1 of the picture (default the centre);
//                                      with a duration it glides (a slow push-in on a still picture)
const zoomOf = (z) => ({ scale: 1, x: 0.5, y: 0.5, ...z });
export const image = {
  type: 'image',
  commands: ['set', 'zoom'],
  validateProps: (p) => (typeof p.src === 'string' ? [] : ['image needs "src"']),
  init: (props) => ({ fit: 'cover', radius: 0, ...props, zoom: zoomOf(props.zoom) }),
  validateCommand: (state, cmd) => (cmd.name === 'zoom' && typeof cmd.args.scale !== 'number' ? ['zoom needs { scale }'] : []),
  apply: (state, cmd) => (cmd.name === 'zoom' ? { ...state, zoom: zoomOf({ ...state.zoom, ...cmd.args }) } : { ...state, ...cmd.args }),
  mount(host, env) {
    const frame = el('div', { ...fill, overflow: 'hidden' }, host);
    const img = el('img', { ...fill, display: 'block' }, frame);
    let shown = null;
    return {
      update(layer) {
        const s = layer.state;
        if (s.src !== shown) {
          shown = s.src;
          img.removeAttribute('data-broken');
          img.src = env.asset(s.src);
          env.wait(img.decode().catch(() => img.setAttribute('data-broken', s.src)));
        }
        let z = s.zoom;
        for (const a of layer.active) {
          if (a.command.name !== 'zoom') continue;
          z = { scale: lerp(a.from.zoom.scale, a.to.zoom.scale, a.progress), x: lerp(a.from.zoom.x, a.to.zoom.x, a.progress), y: lerp(a.from.zoom.y, a.to.zoom.y, a.progress) };
        }
        set(frame, { borderRadius: px(s.radius) });
        set(img, { objectFit: s.fit, transformOrigin: `${(z.x * 100).toFixed(2)}% ${(z.y * 100).toFixed(2)}%`, transform: `scale(${z.scale.toFixed(4)})` });
      },
    };
  },
};

// video — props { src, fit?, radius?, from?: seconds into the file, rate?, loop?, autoplay?: true }
//   commands: play, pause, seek { to }
//   The clip is silent on the stage; to hear the file's own sound, add it to an
//   audio track with the same `src` and `start`.
//   Each frame seeks the file to the right moment and waits for it, so exports are
//   frame-accurate. (In the live player this looks less smooth than the export.)
const filmTime = (s, time) => s.base + (s.playing ? (time - s.since) * s.rate : 0);
export const video = {
  type: 'video',
  commands: ['play', 'pause', 'seek'],
  validateProps: (p) => (typeof p.src === 'string' ? [] : ['video needs "src"']),
  init: (props, ctx) => ({ src: props.src, fit: props.fit ?? 'cover', radius: props.radius ?? 0, loop: !!props.loop, rate: props.rate ?? 1, playing: props.autoplay !== false, base: props.from ?? 0, since: ctx.start }),
  validateCommand: (state, cmd) => (cmd.name === 'seek' && typeof cmd.args.to !== 'number' ? ['seek needs { to } in seconds'] : []),
  apply: (state, cmd) => {
    const now = filmTime(state, cmd.time);
    if (cmd.name === 'play') return { ...state, playing: true, base: now, since: cmd.time };
    if (cmd.name === 'pause') return { ...state, playing: false, base: now, since: cmd.time };
    return { ...state, base: cmd.args.to, since: cmd.time };
  },
  mount(host, env) {
    const frame = el('div', { ...fill, overflow: 'hidden', background: '#000' }, host);
    const film = el('video', { ...fill, display: 'block' }, frame);
    film.muted = true;
    film.playsInline = true;
    film.preload = 'auto';
    let shown = null;
    let queue = Promise.resolve();
    const once = (name) => new Promise((resolve) => film.addEventListener(name, resolve, { once: true }));
    return {
      update(layer, f) {
        const s = layer.state;
        if (s.src !== shown) {
          shown = s.src;
          film.removeAttribute('data-broken');
          film.src = env.asset(s.src);
          film.addEventListener('error', () => film.setAttribute('data-broken', s.src), { once: true });
        }
        set(frame, { borderRadius: px(s.radius) });
        set(film, { objectFit: s.fit });
        let target = Math.max(0, filmTime(s, f.time));
        if (Number.isFinite(film.duration) && film.duration > 0) target = s.loop ? target % film.duration : Math.min(target, film.duration - 0.001);
        film.setAttribute('data-t', target.toFixed(3));
        queue = queue.then(async () => {
          if (film.hasAttribute('data-broken')) return;
          if (film.readyState < 1) await Promise.race([once('loadedmetadata'), once('error')]);
          // A film paused at its very start needs no seek, but its first frame must still have arrived.
          if (film.readyState < 2 && !film.hasAttribute('data-broken')) await Promise.race([once('loadeddata'), once('error')]);
          if (Math.abs(film.currentTime - target) < 1 / 240) return;
          film.currentTime = target;
          await Promise.race([once('seeked'), once('error')]);
        });
        env.wait(queue);
      },
    };
  },
};
