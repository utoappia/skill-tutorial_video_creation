// Pointing: the spotlight, the ring, the arrow, the fingertip and the label.
//
// One colour, one meaning: the accent colour (gold by default) means "look
// here" and is used for nothing else on these overlays. Every mark has a dark
// edge so it shows on light and dark pictures alike (3:1 contrast or better),
// and every mark is a pure function of time, so a seek lands on the right
// picture.
import { clamp01 } from '../easing.js';
import { el, px, set } from './dom.js';

/** 0…1 and back about once a second: what the pointing throbs with. */
export const pulseAt = (time) => 0.5 + 0.5 * Math.sin(time * Math.PI * 2 * 1.1);

/**
 * Creates the overlay inside `host` (which must be positioned and clip its
 * overflow). `update(p)` draws:
 *   p.spot   { x, y, w, h } | null    dim everything else, ring this
 *   p.fade   0…1                       how far the spotlight has faded in
 *   p.rings  [{ x, y, w, h }]          extra rings without dimming
 *   p.arrow  { box, from } | null      from: above | below | left | right
 *   p.finger { x, y, press } | null    press: null (resting) or 0…1 (a tap)
 *   p.labels [{ box, text, side }]     a short pill next to a box
 *   p.time                             seconds, for the throb and the bob
 *   p.unit                             size of one design point in host pixels
 */
export function createPointing(host, theme) {
  const root = el('div', { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%', pointerEvents: 'none' }, host);
  const shade = el('div', { position: 'absolute', display: 'none' }, root);
  const ringPool = [];
  const labelPool = [];
  const arrow = el('div', { position: 'absolute', display: 'none' }, root);
  const ripple = el('div', { position: 'absolute', display: 'none', boxSizing: 'border-box', borderStyle: 'solid', borderRadius: '50%' }, root);
  const finger = el('div', { position: 'absolute', display: 'none', boxSizing: 'border-box', borderStyle: 'solid', borderRadius: '50%', background: 'rgba(255,255,255,0.88)', borderColor: 'rgba(60,40,20,0.55)' }, root);
  let arrowKey = '';

  const ring = (i) => {
    while (ringPool.length <= i) ringPool.push(el('div', { position: 'absolute', display: 'none', boxSizing: 'border-box', borderStyle: 'solid' }, root));
    return ringPool[i];
  };
  const label = (i) => {
    while (labelPool.length <= i) {
      const node = el('div', { position: 'absolute', display: 'none', whiteSpace: 'nowrap', fontWeight: '700', background: 'rgba(8,12,20,0.88)', boxSizing: 'border-box', borderStyle: 'solid' }, root);
      node.setAttribute('data-label', '');
      labelPool.push(node);
    }
    return labelPool[i];
  };

  function update(p) {
    const u = p.unit ?? 1;
    const pulse = pulseAt(p.time ?? 0);
    const fade = p.fade ?? 1;
    const W = host.clientWidth;
    const H = host.clientHeight;

    // Spotlight: one box at the hole with an enormous shadow, so the hole shows the picture untouched.
    const pad = 6 * u;
    const rings = [];
    if (p.spot) {
      const s = p.spot;
      set(shade, { display: 'block', left: px(s.x - pad), top: px(s.y - pad), width: px(s.w + pad * 2), height: px(s.h + pad * 2), borderRadius: px(12 * u), boxShadow: `0 0 0 ${px(Math.max(W, H) * 3)} rgba(0,0,0,${(0.62 * fade).toFixed(3)})` });
      rings.push({ box: { x: s.x - pad, y: s.y - pad, w: s.w + pad * 2, h: s.h + pad * 2 }, fade });
    } else set(shade, { display: 'none' });
    for (const r of p.rings ?? []) rings.push({ box: { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }, fade: 1 });
    rings.forEach((r, i) => {
      const grow = (2 + 3 * pulse) * u;
      set(ring(i), {
        display: 'block',
        left: px(r.box.x - grow),
        top: px(r.box.y - grow),
        width: px(r.box.w + grow * 2),
        height: px(r.box.h + grow * 2),
        borderRadius: px(12 * u + grow),
        borderWidth: px(4 * u),
        borderColor: theme.accent,
        opacity: (r.fade * (0.75 + 0.25 * pulse)).toFixed(3),
        boxShadow: `0 0 ${px(3 * u)} rgba(0,0,0,0.9), inset 0 0 ${px(3 * u)} rgba(0,0,0,0.9)`,
      });
    });
    for (let i = rings.length; i < ringPool.length; i++) set(ringPool[i], { display: 'none' });

    // Arrow: drawn pointing down, then turned to face the target, bobbing towards it.
    if (p.arrow?.box) {
      const size = 44 * u;
      const len = size * 1.25;
      const head = size * 0.62;
      const shaft = size * 0.36;
      const key = `${size}|${theme.accent}`;
      if (key !== arrowKey) {
        arrowKey = key;
        const cx = size / 2;
        const pts = [
          [cx - shaft / 2, 0], [cx + shaft / 2, 0], [cx + shaft / 2, len - head], [size, len - head], [cx, len], [0, len - head], [cx - shaft / 2, len - head],
        ].map((q) => q.map((n) => n.toFixed(2)).join(',')).join(' ');
        arrow.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${len}" viewBox="0 0 ${size} ${len}" style="overflow:visible;display:block"><polygon points="${pts}" fill="${theme.accent}" stroke="${theme.accentInk}" stroke-width="${(3 * u).toFixed(2)}" stroke-linejoin="round"/></svg>`;
      }
      const t = p.arrow.box;
      const from = p.arrow.from ?? 'above';
      const gap = (8 + 6 * Math.abs(Math.sin((p.time ?? 0) * Math.PI * 1.6))) * u;
      const cx = t.x + t.w / 2;
      const cy = t.y + t.h / 2;
      let left;
      let top;
      if (from === 'above') [left, top] = [cx - size / 2, t.y - gap - len];
      else if (from === 'below') [left, top] = [cx - size / 2, t.y + t.h + gap];
      else if (from === 'left') [left, top] = [t.x - gap - len / 2 - size / 2, cy - len / 2];
      else [left, top] = [t.x + t.w + gap + len / 2 - size / 2, cy - len / 2];
      const rotate = { above: 0, below: 180, left: -90, right: 90 }[from] ?? 0;
      set(arrow, { display: 'block', left: px(left), top: px(top), width: px(size), height: px(len), transform: `rotate(${rotate}deg)` });
    } else set(arrow, { display: 'none' });

    // Fingertip: a soft white disc that dips when it presses and sends a ring out, so a tap reads with the sound off.
    if (p.finger) {
      const size = 34 * u;
      const press = p.finger.press;
      const d = press !== null && press !== undefined && press < 0.5 ? size * 0.82 : size;
      set(finger, { display: 'block', left: px(p.finger.x - d / 2), top: px(p.finger.y - d / 2), width: px(d), height: px(d), borderWidth: px(3 * u), boxShadow: `0 ${px(2 * u)} ${px(6 * u)} rgba(0,0,0,0.45)` });
      const r = press === null || press === undefined ? null : clamp01(press);
      if (r !== null && r > 0 && r < 1) {
        const rd = size * (1.2 + r * 2.4);
        set(ripple, { display: 'block', left: px(p.finger.x - rd / 2), top: px(p.finger.y - rd / 2), width: px(rd), height: px(rd), borderWidth: px(3 * u), borderColor: `rgba(255,255,255,${(0.9 * (1 - r)).toFixed(3)})` });
      } else set(ripple, { display: 'none' });
    } else {
      set(finger, { display: 'none' });
      set(ripple, { display: 'none' });
    }

    // Labels: a short claim next to the thing it is about.
    const labels = p.labels ?? [];
    labels.forEach((l, i) => {
      const node = label(i);
      if (node.textContent !== l.text) node.textContent = l.text;
      const gap = 10 * u;
      const b = l.box;
      const side = l.side ?? 'above';
      const style = { display: 'block', fontSize: px((l.size ?? 15) * u), padding: `${px(5 * u)} ${px(11 * u)}`, borderRadius: px(9 * u), borderWidth: px(1.5 * u), borderColor: theme.accent, color: theme.ink, fontFamily: theme.font, opacity: String(l.fade ?? 1) };
      if (side === 'above') Object.assign(style, { left: px(b.x + b.w / 2), top: px(b.y - gap), transform: 'translate(-50%, -100%)' });
      else if (side === 'below') Object.assign(style, { left: px(b.x + b.w / 2), top: px(b.y + b.h + gap), transform: 'translate(-50%, 0)' });
      else if (side === 'left') Object.assign(style, { left: px(b.x - gap), top: px(b.y + b.h / 2), transform: 'translate(-100%, -50%)' });
      else Object.assign(style, { left: px(b.x + b.w + gap), top: px(b.y + b.h / 2), transform: 'translate(0, -50%)' });
      set(node, style);
    });
    for (let i = labels.length; i < labelPool.length; i++) set(labelPool[i], { display: 'none' });
  }

  return { update };
}

/** Where the fingertip is during a tap: it travels for the first 45%, then presses. */
export function tapFinger(fromPt, toPt, linear) {
  const move = clamp01(linear / 0.45);
  const ease = 1 - (1 - move) ** 3;
  return { x: fromPt.x + (toPt.x - fromPt.x) * ease, y: fromPt.y + (toPt.y - fromPt.y) * ease, press: linear < 0.45 ? null : (linear - 0.45) / 0.55 };
}
