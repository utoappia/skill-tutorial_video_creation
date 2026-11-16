// `scene`: a drawing made of named nodes that you move, change and point at.
// It is the general-purpose module: diagrams, maps of ideas, step-by-step
// builds, mock screens, anything that is "boxes, words, pictures and arrows".
//
// props   { width?, height?, background?, nodes: [node, …] }
//   The scene has its own coordinate space (default: the clip's box size) and is
//   scaled to fit the clip's box, so one scene works in every layout.
// node    { id, x, y, w, h, kind?, text?, fill?, stroke?, strokeWidth?, radius?,
//           color?, fontSize?, weight?, align?, valign?, padding?, opacity?, scale?,
//           rotate?, hidden?, src?, fit?, svg?, x2?, y2?, arrow?, dash? }
//   kind    box (default) | text | circle | image (needs src) | svg (needs svg markup)
//           | line (from x,y to x2,y2; arrow: true adds a head)
//   The kind is guessed when left out: src → image, svg → svg, x2 → line,
//   text with no fill → text, otherwise box.
// commands (numbers glide over the command's duration; everything else switches at once)
//   set    { nodes: { id: { …fields } | null }, arc? }   change, add (a new id) or remove (null)
//   point  { target, style?: spot | ring | arrow | finger, from?, label?, side? }
//   clear  {}                                            remove the pointing
//   tap    { target, from? }                             a fingertip travels to it and presses
//   drag   { node, to: { x, y } | targetId }             a fingertip carries a node
//   swipe  { from: { x, y }, to: { x, y } }
//   camera { target, pad? } | { x, y, w, h } | { reset: true }
//   A target is a node id, a list of node ids, or a box { x, y, w, h }.
import { clamp01, easing, lerp } from '../easing.js';
import { center, el, fill, fitBox, isBox, px, richText, set } from './dom.js';
import { createPointing, tapFinger } from './pointing.js';

const NUMERIC = ['x', 'y', 'w', 'h', 'x2', 'y2', 'opacity', 'scale', 'rotate', 'fontSize', 'radius', 'strokeWidth'];
const KINDS = ['box', 'text', 'circle', 'image', 'svg', 'line'];
const STYLES = ['spot', 'ring', 'arrow', 'finger'];
const smooth = easing('inOut');

const kindOf = (n) => n.kind ?? (n.src ? 'image' : n.svg ? 'svg' : n.x2 !== undefined ? 'line' : n.text !== undefined && n.fill === undefined ? 'text' : 'box');

/** The box a node covers, in scene coordinates. */
export function boxOf(n) {
  if (kindOf(n) === 'line') {
    const x = Math.min(n.x, n.x2);
    const y = Math.min(n.y, n.y2);
    return { x, y, w: Math.max(1, Math.abs(n.x2 - n.x)), h: Math.max(1, Math.abs(n.y2 - n.y)) };
  }
  return { x: n.x, y: n.y, w: n.w, h: n.h };
}

/** The box a target covers, or null if it names a node that is not there. */
export function targetBox(nodes, target) {
  if (isBox(target)) return target;
  const ids = Array.isArray(target) ? target : [target];
  let out = null;
  for (const id of ids) {
    const n = nodes[id];
    if (!n) return null;
    const b = boxOf(n);
    out = out ? { x: Math.min(out.x, b.x), y: Math.min(out.y, b.y), w: Math.max(out.x + out.w, b.x + b.w) - Math.min(out.x, b.x), h: Math.max(out.y + out.h, b.y + b.h) - Math.min(out.y, b.y) } : b;
  }
  return out;
}

function nodeProblems(n, isNew) {
  const out = [];
  const name = `node "${n.id}"`;
  const kind = kindOf(n);
  if (!KINDS.includes(kind)) out.push(`${name}: unknown kind "${kind}" (${KINDS.join(', ')})`);
  for (const k of NUMERIC) if (n[k] !== undefined && typeof n[k] !== 'number') out.push(`${name}: "${k}" must be a number`);
  if (isNew) {
    const need = kind === 'line' ? ['x', 'y', 'x2', 'y2'] : ['x', 'y', 'w', 'h'];
    for (const k of need) if (typeof n[k] !== 'number') out.push(`${name}: a ${kind} needs "${k}"`);
  }
  return out;
}

const targetProblems = (nodes, target, what = 'target') => {
  if (target === undefined) return [`needs a ${what}`];
  if (isBox(target)) return [];
  const ids = Array.isArray(target) ? target : [target];
  return ids.filter((id) => !nodes[id]).map((id) => `no node "${id}" to use as a ${what} (there is: ${Object.keys(nodes).join(', ') || 'nothing'})`);
};

/** The part of the scene the camera shows for some `camera` args: always the scene's own shape. */
function viewOf(state, args) {
  if (args.reset) return { x: 0, y: 0, w: state.w, h: state.h };
  let b = args.target !== undefined ? targetBox(state.nodes, args.target) : { x: args.x, y: args.y, w: args.w, h: args.h };
  const pad = args.pad ?? (args.target !== undefined ? Math.min(state.w, state.h) * 0.08 : 0);
  b = { x: b.x - pad, y: b.y - pad, w: b.w + pad * 2, h: b.h + pad * 2 };
  const aspect = state.w / state.h;
  const w = Math.min(state.w, Math.max(b.w, b.h * aspect));
  const h = w / aspect;
  const x = Math.min(Math.max(0, b.x + b.w / 2 - w / 2), state.w - w);
  const y = Math.min(Math.max(0, b.y + b.h / 2 - h / 2), state.h - h);
  return { x, y, w, h };
}

const dragDestination = (state, args) => {
  const n = state.nodes[args.node];
  if (isBox(args.to) || (args.to && typeof args.to === 'object')) return { x: args.to.x, y: args.to.y };
  const t = center(boxOf(state.nodes[args.to]));
  return { x: t.x - n.w / 2, y: t.y - n.h / 2 };
};

export default {
  type: 'scene',
  commands: ['set', 'point', 'clear', 'tap', 'drag', 'swipe', 'camera'],

  validateProps(props) {
    if (props.nodes !== undefined && !Array.isArray(props.nodes)) return ['"nodes" must be a list'];
    const out = [];
    const seen = new Set();
    for (const n of props.nodes ?? []) {
      if (typeof n?.id !== 'string') out.push('every node needs an "id"');
      else if (seen.has(n.id)) out.push(`two nodes are called "${n.id}"`);
      else {
        seen.add(n.id);
        out.push(...nodeProblems(n, true));
      }
    }
    return out;
  },

  init(props, ctx) {
    const w = props.width ?? ctx.box.w;
    const h = props.height ?? ctx.box.h;
    const nodes = {};
    for (const n of props.nodes ?? []) nodes[n.id] = { ...n };
    return { w, h, background: props.background ?? null, nodes, point: null, camera: { x: 0, y: 0, w, h } };
  },

  validateCommand(state, cmd) {
    const a = cmd.args;
    const { nodes } = state;
    switch (cmd.name) {
      case 'set': {
        if (!a.nodes || typeof a.nodes !== 'object') return ['set needs { nodes: { id: { … } } }'];
        const out = [];
        for (const [id, patch] of Object.entries(a.nodes)) {
          if (patch === null) {
            if (!nodes[id]) out.push(`can't remove "${id}": no such node`);
          } else if (!nodes[id] && !['x', 'y', 'w', 'h', 'x2', 'y2'].some((k) => k in patch)) {
            // A change with no place or size is not an attempt to make a new node: the id is wrong.
            out.push(`no node "${id}" to change (there is: ${Object.keys(nodes).join(', ') || 'nothing'})`);
          } else out.push(...nodeProblems({ ...nodes[id], ...patch, id }, !nodes[id]));
        }
        return out;
      }
      case 'point':
        return [...targetProblems(nodes, a.target), ...(a.style === undefined || STYLES.includes(a.style) ? [] : [`unknown style "${a.style}" (${STYLES.join(', ')})`])];
      case 'tap':
        return targetProblems(nodes, a.target);
      case 'drag':
        if (!nodes[a.node]) return [`no node "${a.node}" to drag`];
        if (a.to && typeof a.to === 'object') return typeof a.to.x === 'number' && typeof a.to.y === 'number' ? [] : ['drag needs to: { x, y } or a node id'];
        return targetProblems(nodes, a.to, 'destination');
      case 'swipe':
        return [a.from, a.to].every((p) => p && typeof p.x === 'number' && typeof p.y === 'number') ? [] : ['swipe needs from: { x, y } and to: { x, y }'];
      case 'camera':
        if (a.reset) return [];
        if (a.target !== undefined) return targetProblems(nodes, a.target);
        return isBox(a) ? [] : ['camera needs { target }, { x, y, w, h } or { reset: true }'];
      default:
        return [];
    }
  },

  apply(state, cmd) {
    const a = cmd.args;
    switch (cmd.name) {
      case 'set': {
        const nodes = { ...state.nodes };
        for (const [id, patch] of Object.entries(a.nodes)) {
          if (patch === null) delete nodes[id];
          else if (nodes[id]) nodes[id] = { ...nodes[id], ...patch };
          else nodes[id] = { ...patch, id };
        }
        return { ...state, nodes };
      }
      case 'point':
        return { ...state, point: { target: a.target, style: a.style ?? 'spot', from: a.from ?? 'above', label: a.label ?? null, side: a.side ?? 'below', since: cmd.time } };
      case 'clear':
        return { ...state, point: null };
      case 'drag': {
        const to = dragDestination(state, a);
        return { ...state, nodes: { ...state.nodes, [a.node]: { ...state.nodes[a.node], x: to.x, y: to.y } } };
      }
      case 'camera':
        return { ...state, camera: viewOf(state, a) };
      default:
        return state;
    }
  },

  /** What is wrong with a state that the picture would show: used by the checker, which samples every command. */
  audit(state) {
    const out = [];
    for (const n of Object.values(state.nodes)) {
      if (n.hidden || n.opacity === 0) continue;
      const b = boxOf(n);
      if (b.x < -1 || b.y < -1 || b.x + b.w > state.w + 1 || b.y + b.h > state.h + 1) out.push(`node "${n.id}" is partly outside the scene (${Math.round(b.x)}, ${Math.round(b.y)}, ${Math.round(b.w)}×${Math.round(b.h)} in ${state.w}×${state.h})`);
    }
    // Text hidden under a solid node drawn after it (nodes stack in the order they were added).
    const shown = Object.values(state.nodes).filter((n) => !n.hidden && (n.opacity ?? 1) > 0.05);
    const clear = (c) => c === 'transparent' || c === 'none' || /^rgba\(.*,\s*0(\.0+)?\)$/.test(String(c)) || /^#[0-9a-f]{6}00$/i.test(String(c));
    shown.forEach((t, i) => {
      if (!String(t.text ?? '').trim() || kindOf(t) === 'line') return;
      const tb = boxOf(t);
      if (!(tb.w > 0 && tb.h > 0)) return;
      for (const c of shown.slice(i + 1)) {
        const kind = kindOf(c);
        if (!['box', 'circle', 'image'].includes(kind) || (kind !== 'image' && clear(c.fill))) continue;
        const cb = boxOf(c);
        const w = Math.min(tb.x + tb.w, cb.x + cb.w) - Math.max(tb.x, cb.x);
        const h = Math.min(tb.y + tb.h, cb.y + cb.h) - Math.max(tb.y, cb.y);
        if (w <= 0 || h <= 0) continue;
        const share = (w * h * (kind === 'circle' ? Math.PI / 4 : 1)) / (tb.w * tb.h);
        const words = String(t.text).replace(/\*\*|\n/g, ' ').trim();
        if (share > 0.2) out.push(`node "${c.id}" is drawn over the text of node "${t.id}" ("${words.length > 30 ? `${words.slice(0, 30)}…` : words}", ${Math.round(share * 100)}% covered): move one, or add "${t.id}" after "${c.id}" so the text is on top`);
      }
    });
    if (state.point) {
      const b = targetBox(state.nodes, state.point.target);
      if (!b) out.push(`the pointer's target ${JSON.stringify(state.point.target)} is gone`);
      else {
        const c = state.camera;
        const m = center(b);
        if (m.x < c.x || m.x > c.x + c.w || m.y < c.y || m.y > c.y + c.h) out.push(`the pointer's target ${JSON.stringify(state.point.target)} is outside what the camera shows`);
      }
    }
    return out;
  },

  mount(host, env) {
    const theme = env.theme;
    const clip = el('div', { ...fill, overflow: 'hidden' }, host);
    const root = el('div', { position: 'absolute', left: '0', top: '0', transformOrigin: '0 0' }, clip);
    // Nodes are stacked among themselves (z-index = their order); the pointer is always above all of them.
    const nodeHost = el('div', { ...fill, zIndex: '0' }, root);
    const pointHost = el('div', { ...fill, zIndex: '1' }, root);
    const pointing = createPointing(pointHost, theme);
    const views = new Map();

    function view(id, kind) {
      let v = views.get(id);
      if (v && v.kind !== kind) {
        v.wrap.remove();
        v = null;
      }
      if (!v) {
        const wrap = el('div', { position: 'absolute', boxSizing: 'border-box', borderStyle: 'solid' }, nodeHost);
        wrap.setAttribute('data-node', id);
        v = { kind, wrap, key: '' };
        if (kind === 'image') {
          v.img = el('img', { ...fill, display: 'block' }, wrap);
        } else if (kind === 'box' || kind === 'text' || kind === 'circle') v.text = fitBox(wrap);
        views.set(id, v);
      }
      return v;
    }

    function draw(n, alpha, s, order) {
      const kind = kindOf(n);
      const v = view(n.id, kind);
      const { wrap } = v;
      const opacity = (n.hidden ? 0 : (n.opacity ?? 1) * alpha).toFixed(3);
      const transform = `scale(${(n.scale ?? 1).toFixed(4)}) rotate(${(n.rotate ?? 0).toFixed(2)}deg)`;
      const fontSize = n.fontSize ?? Math.min(s.w, s.h) * 0.055;
      if (kind === 'line') {
        const sw = n.strokeWidth ?? Math.min(s.w, s.h) * 0.006;
        const color = n.stroke ?? n.color ?? theme.ink;
        const key = [n.x, n.y, n.x2, n.y2, sw, color, n.arrow, n.dash].join('|');
        set(wrap, { left: '0', top: '0', width: px(s.w), height: px(s.h), opacity, zIndex: String(order), borderWidth: '0', pointerEvents: 'none' });
        if (key !== v.key) {
          v.key = key;
          const len = Math.hypot(n.x2 - n.x, n.y2 - n.y) || 1;
          const ux = (n.x2 - n.x) / len;
          const uy = (n.y2 - n.y) / len;
          const head = n.arrow ? sw * 4 : 0;
          const ex = n.x2 - ux * head * 0.9;
          const ey = n.y2 - uy * head * 0.9;
          const f = (v2) => v2.toFixed(2);
          const tip = n.arrow ? `<polygon points="${f(n.x2)},${f(n.y2)} ${f(n.x2 - ux * head - uy * head * 0.55)},${f(n.y2 - uy * head + ux * head * 0.55)} ${f(n.x2 - ux * head + uy * head * 0.55)},${f(n.y2 - uy * head - ux * head * 0.55)}" fill="${color}"/>` : '';
          wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}" viewBox="0 0 ${s.w} ${s.h}" style="display:block;overflow:visible"><line x1="${f(n.x)}" y1="${f(n.y)}" x2="${f(ex)}" y2="${f(ey)}" stroke="${color}" stroke-width="${f(sw)}" stroke-linecap="round"${n.dash ? ` stroke-dasharray="${f(sw * 2.5)} ${f(sw * 2.5)}"` : ''}/>${tip}</svg>`;
        }
        return;
      }
      set(wrap, { left: px(n.x), top: px(n.y), width: px(n.w), height: px(n.h), opacity, transform, zIndex: String(order) });
      if (kind === 'image') {
        if (v.key !== n.src) {
          v.key = n.src;
          v.img.removeAttribute('data-broken');
          v.img.src = env.asset(n.src);
          env.wait(v.img.decode().catch(() => v.img.setAttribute('data-broken', n.src)));
        }
        set(v.img, { objectFit: n.fit ?? 'contain' });
        set(wrap, { borderWidth: '0', borderRadius: px(n.radius ?? 0), overflow: 'hidden' });
        return;
      }
      if (kind === 'svg') {
        set(wrap, { borderWidth: '0', color: n.color ?? theme.ink });
        if (v.key !== n.svg) {
          v.key = n.svg;
          wrap.innerHTML = n.svg;
          const svg = wrap.querySelector('svg');
          if (svg) Object.assign(svg.style, { width: '100%', height: '100%', display: 'block' });
        }
        return;
      }
      const boxed = kind !== 'text';
      set(wrap, {
        background: boxed ? n.fill ?? theme.card : n.fill ?? 'transparent',
        borderRadius: kind === 'circle' ? '50%' : px(n.radius ?? (boxed ? Math.min(s.w, s.h) * 0.015 : 0)),
        borderWidth: px(n.stroke ? n.strokeWidth ?? Math.min(s.w, s.h) * 0.004 : 0),
        borderColor: n.stroke ?? 'transparent',
      });
      const hasText = typeof n.text === 'string' && n.text !== '';
      set(v.text.box, { display: hasText ? 'flex' : 'none', padding: px(n.padding ?? (boxed ? fontSize * 0.35 : 0)), justifyContent: n.valign === 'top' ? 'flex-start' : n.valign === 'bottom' ? 'flex-end' : 'center' });
      if (hasText) {
        set(v.text.inner, { color: n.color ?? theme.ink, fontFamily: n.mono ? theme.mono : theme.font, fontWeight: String(n.weight ?? (boxed ? 700 : 500)), textAlign: n.align ?? 'center', lineHeight: '1.25' });
        v.text.write(richText(n.text, theme.accent), fontSize, [n.text, fontSize, n.w, n.h, n.padding, n.weight, n.mono].join('|'));
      }
    }

    return {
      update(layer, f) {
        const s = layer.state;
        // Numbers glide: each command still in progress pulls its fields back towards where they came from.
        const shown = {};
        const alpha = {};
        for (const [id, n] of Object.entries(s.nodes)) shown[id] = { ...n };
        const ghosts = [];
        const cam = { ...s.camera };
        let finger = null;
        let pointFade = s.point ? clamp01((f.time - s.point.since) / 0.25) : 0;
        let point = s.point;
        for (const a of layer.active) {
          const { name, args } = a.command;
          const left = 1 - a.progress;
          if (name === 'set') {
            for (const id of Object.keys(args.nodes)) {
              const from = a.from.nodes[id];
              const to = a.to.nodes[id];
              const n = shown[id];
              if (from && to && n) {
                let moved = false;
                for (const k of NUMERIC) {
                  const d = (from[k] ?? (k === 'opacity' || k === 'scale' ? 1 : to[k] ?? 0)) - (to[k] ?? (k === 'opacity' || k === 'scale' ? 1 : from[k] ?? 0));
                  if (!d) continue;
                  n[k] = (n[k] ?? (k === 'opacity' || k === 'scale' ? 1 : 0)) + d * left;
                  if (k === 'x' || k === 'y') moved = true;
                }
                if (moved && args.arc) n.y -= args.arc * Math.sin(Math.PI * a.progress);
              } else if (!from && to && n) alpha[id] = (alpha[id] ?? 1) * a.progress;
              else if (from && !to && !n) ghosts.push([from, left]);
            }
          } else if (name === 'camera') {
            for (const k of ['x', 'y', 'w', 'h']) cam[k] += (a.from.camera[k] - a.to.camera[k]) * left;
          } else if (name === 'clear' && a.from.point) {
            point = a.from.point;
            pointFade = left;
          } else if (name === 'tap') {
            const to = center(targetBox(s.nodes, args.target) ?? { x: 0, y: 0, w: 0, h: 0 });
            const from = args.from ?? { x: to.x + s.w * 0.12, y: to.y + s.h * 0.2 };
            finger = tapFinger(from, to, a.linear);
          } else if (name === 'drag') {
            const from = a.from.nodes[args.node];
            const to = a.to.nodes[args.node];
            const n = shown[args.node];
            if (from && to && n) {
              const m = smooth(clamp01((a.linear - 0.25) / 0.6));
              n.x = lerp(from.x, to.x, m);
              n.y = lerp(from.y, to.y, m);
              const grab = { x: from.x + from.w / 2, y: from.y + from.h / 2 };
              if (a.linear < 0.25) finger = { ...tapFinger({ x: grab.x + s.w * 0.1, y: grab.y + s.h * 0.16 }, grab, (a.linear / 0.25) * 0.45), press: null };
              else finger = { x: n.x + n.w / 2, y: n.y + n.h / 2, press: a.linear < 0.9 ? 0.02 : null };
            }
          } else if (name === 'swipe') {
            const m = smooth(a.linear);
            finger = { x: lerp(args.from.x, args.to.x, m), y: lerp(args.from.y, args.to.y, m), press: 0.02 };
          }
        }

        const scale = Math.min(layer.box.w / cam.w, layer.box.h / cam.h);
        set(clip, { background: s.background ?? 'transparent' });
        set(root, {
          width: px(s.w),
          height: px(s.h),
          transform: `translate(${px((layer.box.w - cam.w * scale) / 2 - cam.x * scale)}, ${px((layer.box.h - cam.h * scale) / 2 - cam.y * scale)}) scale(${scale.toFixed(5)})`,
        });

        const live = new Set();
        let order = 0;
        for (const n of Object.values(shown)) {
          live.add(n.id);
          draw(n, alpha[n.id] ?? 1, s, order++);
        }
        for (const [n, a] of ghosts) {
          live.add(n.id);
          draw(n, a, s, order++);
        }
        for (const [id, v] of views) {
          if (live.has(id)) continue;
          v.wrap.remove();
          views.delete(id);
        }

        // Pointers keep the same size on the stage whatever the scene's own scale or camera zoom.
        const unit = Math.min(env.stage.width, env.stage.height) / 600 / scale;
        const target = point ? targetBox(shown, point.target) : null;
        const many = point && Array.isArray(point.target) && point.style === 'ring';
        pointing.update({
          time: f.time,
          unit,
          fade: pointFade,
          spot: target && point.style === 'spot' ? target : null,
          rings: target && point.style === 'ring' ? (many ? point.target.map((id) => targetBox(shown, id)).filter(Boolean) : [target]) : [],
          arrow: target && point.style === 'arrow' ? { box: target, from: point.from } : null,
          finger: finger ?? (target && point.style === 'finger' ? { ...center(target), press: null } : null),
          labels: target && point.label ? [{ box: target, text: point.label, side: point.side, fade: pointFade, size: 20 }] : [],
        });
      },
    };
  },
};
