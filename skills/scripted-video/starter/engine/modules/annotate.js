// `annotate`: pointing drawn over the whole stage, on top of any other clip
// (a screen recording, a photo, a chart, a title). Put its track last so it
// is on top.
//
// props   {}   (the clip's box is the area it may draw in; default the whole stage)
// commands
//   point   { target, style?: spot | ring | arrow | finger, from?, label?, side? }
//   tap     { target, from?: { x, y } }
//   label   { key?, target, text, side? }   adds a pill that stays; `key` names it for unlabel
//   unlabel { key? }                        removes one label, or all of them
//   clear   {}                              removes the pointing and every label
// A target is one of
//   "clipId"                                 the box of another clip
//   { x, y, w, h }                           a box in stage coordinates
//   { clip: "clipId", rect: [x, y, w, h] }   a part of a clip, as fractions of its box (0…1):
//                                            the way to point at something inside a recording or a picture
//   [target, …]                              several (ring style draws one ring each)
import { clamp01 } from '../easing.js';
import { center, isBox } from './dom.js';
import { createPointing, tapFinger } from './pointing.js';

const STYLES = ['spot', 'ring', 'arrow', 'finger'];

function resolve(target, ctx) {
  if (Array.isArray(target)) {
    const boxes = target.map((t) => resolve(t, ctx));
    return boxes.some((b) => !b) ? null : boxes.flat();
  }
  if (typeof target === 'string') {
    const b = ctx.clipBox(target);
    return b ? [{ ...b }] : null;
  }
  if (isBox(target)) return [{ x: target.x, y: target.y, w: target.w, h: target.h }];
  if (target && typeof target === 'object' && typeof target.clip === 'string' && Array.isArray(target.rect) && target.rect.length === 4) {
    const b = ctx.clipBox(target.clip);
    const [x, y, w, h] = target.rect;
    return b ? [{ x: b.x + x * b.w, y: b.y + y * b.h, w: w * b.w, h: h * b.h }] : null;
  }
  return null;
}

const union = (boxes) => {
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return { x, y, w: Math.max(...boxes.map((b) => b.x + b.w)) - x, h: Math.max(...boxes.map((b) => b.y + b.h)) - y };
};

export default {
  type: 'annotate',
  commands: ['point', 'tap', 'label', 'unlabel', 'clear'],
  init: () => ({ point: null, labels: [] }),

  validateCommand(state, cmd, ctx) {
    const a = cmd.args;
    if (cmd.name === 'clear' || cmd.name === 'unlabel') return [];
    const out = [];
    if (!resolve(a.target, ctx)) out.push(`can't find target ${JSON.stringify(a.target)}: use a clip id, { x, y, w, h }, or { clip, rect: [x, y, w, h] }`);
    if (cmd.name === 'point' && a.style !== undefined && !STYLES.includes(a.style)) out.push(`unknown style "${a.style}" (${STYLES.join(', ')})`);
    if (cmd.name === 'label' && typeof a.text !== 'string') out.push('label needs { text }');
    return out;
  },

  apply(state, cmd, ctx) {
    const a = cmd.args;
    // Boxes are kept relative to this clip's own box, which is where they are drawn.
    const local = (boxes) => boxes.map((b) => ({ ...b, x: b.x - ctx.box.x, y: b.y - ctx.box.y }));
    switch (cmd.name) {
      case 'point':
        return { ...state, point: { boxes: local(resolve(a.target, ctx)), style: a.style ?? 'spot', from: a.from ?? 'above', label: a.label ?? null, side: a.side ?? 'below', since: cmd.time } };
      case 'label':
        return { ...state, labels: [...state.labels.filter((l) => l.key !== (a.key ?? a.text)), { key: a.key ?? a.text, box: union(local(resolve(a.target, ctx))), text: a.text, side: a.side ?? 'above', since: cmd.time }] };
      case 'unlabel':
        return { ...state, labels: a.key === undefined ? [] : state.labels.filter((l) => l.key !== a.key) };
      case 'clear':
        return { point: null, labels: [] };
      default:
        return state;
    }
  },

  audit(state, layer) {
    const out = [];
    const check = (b, what) => {
      const m = center(b);
      if (m.x < 0 || m.y < 0 || m.x > layer.box.w || m.y > layer.box.h) out.push(`${what} is off the stage`);
    };
    if (state.point) check(union(state.point.boxes), 'the pointer\'s target');
    for (const l of state.labels) check(l.box, `label "${l.text}"`);
    return out;
  },

  mount(host, env) {
    host.style.overflow = 'hidden';
    const pointing = createPointing(host, env.theme);
    return {
      update(layer, f) {
        const s = layer.state;
        let point = s.point;
        let fade = point ? clamp01((f.time - point.since) / 0.25) : 0;
        let finger = null;
        for (const a of layer.active) {
          if (a.command.name === 'clear' && a.from.point) {
            point = a.from.point;
            fade = 1 - a.progress;
          } else if (a.command.name === 'tap') {
            const boxes = resolve(a.command.args.target, { clipBox: env.clipBox });
            if (!boxes) continue;
            const to = center(union(boxes));
            to.x -= layer.box.x;
            to.y -= layer.box.y;
            const from = a.command.args.from ?? { x: to.x + env.stage.width * 0.08, y: to.y + env.stage.height * 0.16 };
            finger = tapFinger(from, to, a.linear);
          }
        }
        const target = point ? union(point.boxes) : null;
        pointing.update({
          time: f.time,
          unit: Math.min(env.stage.width, env.stage.height) / 600,
          fade,
          spot: target && point.style === 'spot' ? target : null,
          rings: target && point.style === 'ring' ? point.boxes : [],
          arrow: target && point.style === 'arrow' ? { box: target, from: point.from } : null,
          finger: finger ?? (target && point.style === 'finger' ? { ...center(target), press: null } : null),
          labels: [
            ...(target && point.label ? [{ box: target, text: point.label, side: point.side, fade, size: 20 }] : []),
            ...s.labels.map((l) => ({ box: l.box, text: l.text, side: l.side, fade: clamp01((f.time - l.since) / 0.25), size: 20 })),
          ],
        });
      },
    };
  },
};
