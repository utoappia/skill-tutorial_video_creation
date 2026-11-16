// The DOM renderer: draws one frame of a timeline into a stage element.
//
//   const r = createRenderer(container, { modules });
//   r.load(timeline, { captions: true });
//   await r.show(12.5);     // draw the picture for 12.5 s and wait until it is really there
//   r.audit();              // what is wrong with what is on screen right now
//
// The stage is laid out in stage units (1920×1080 by default) and scaled to the
// container with one CSS transform, so every module works in stage units.
import { evaluate } from '../evaluate.js';
import { el, px, set, themeOf } from '../modules/dom.js';

const ABSOLUTE = /^(?:[a-z]+:|\/)/i;

export function createRenderer(container, { modules, base = '/' }) {
  const registry = new Map(modules.map((m) => [m.type, m]));
  const stageEl = el('div', { position: 'absolute', left: '0', top: '0', overflow: 'hidden', transformOrigin: '0 0' }, container);
  stageEl.setAttribute('data-stage', '');
  let timeline = null;
  let theme = null;
  let layers = new Map();
  let captionEl = null;
  let captionRow = null;
  let showCaptions = true;
  let pending = [];
  let stageScale = 1;
  let lastFrame = null;

  function fit() {
    if (!timeline) return;
    const { width, height } = timeline.stage;
    stageScale = Math.min(container.clientWidth / width, container.clientHeight / height) || 1;
    set(stageEl, { transform: `translate(${px((container.clientWidth - width * stageScale) / 2)}, ${px((container.clientHeight - height * stageScale) / 2)}) scale(${stageScale})` });
  }

  function load(next, options = {}) {
    timeline = next;
    theme = themeOf(timeline.stage);
    showCaptions = options.captions !== false && timeline.stage.caption?.show !== false;
    stageEl.replaceChildren();
    layers = new Map();
    pending = [];
    lastFrame = null;
    const { width, height, background } = timeline.stage;
    set(stageEl, { width: px(width), height: px(height), background, fontFamily: theme.font });
    for (const font of timeline.fonts ?? []) {
      // fonts: [{ family, src, weight?, style? }]
      const face = new FontFace(font.family, `url(${asset(font.src)})`, { weight: String(font.weight ?? 'normal'), style: font.style ?? 'normal' });
      pending.push(face.load().then((f) => document.fonts.add(f)).catch(() => stageEl.setAttribute('data-font-error', font.family)));
    }
    const short = Math.min(width, height);
    const cap = timeline.stage.caption ?? {};
    // A full-width row with the pill centred in it, so a caption can use the whole width before it wraps.
    captionRow = el('div', { position: 'absolute', left: '0', width: '100%', bottom: px(cap.bottom ?? height * 0.045), display: 'none', justifyContent: 'center', zIndex: '100000', pointerEvents: 'none' });
    captionEl = el('div', {
      maxWidth: px(width * (cap.width ?? 0.86)),
      boxSizing: 'border-box',
      padding: `${px(short * 0.012)} ${px(short * 0.026)}`,
      borderRadius: px(short * 0.014),
      background: 'rgba(0,0,0,0.74)',
      color: '#ffffff',
      fontFamily: theme.font,
      fontWeight: '600',
      fontSize: px(cap.size ?? short * 0.038),
      lineHeight: '1.28',
      textAlign: 'center',
      textWrap: 'balance',
    }, captionRow);
    captionEl.setAttribute('data-caption', '');
    captionEl.setAttribute('dir', 'auto');
    fit();
  }

  /** The URL of an asset: a key of `script.assets`, or a path from the project folder. */
  function asset(src) {
    const path = timeline.assets?.[src] ?? src;
    return ABSOLUTE.test(path) ? path : base + path;
  }

  function layerView(layer) {
    let view = layers.get(layer.id);
    if (view) return view;
    const host = el('div', { position: 'absolute', transformOrigin: '50% 50%' });
    host.setAttribute('data-layer', layer.id);
    host.setAttribute('data-module', layer.module);
    const mod = registry.get(layer.module);
    let instance = null;
    if (mod?.mount) {
      const env = { stage: timeline.stage, theme, asset, wait: (p) => pending.push(p), clipBox: (id) => timeline.layers.find((l) => l.id === id)?.box ?? null, language: timeline.language };
      set(host, { left: px(layer.box.x), top: px(layer.box.y), width: px(layer.box.w), height: px(layer.box.h) });
      // Mounted while attached and sized, so a module can measure text in `mount`.
      stageEl.appendChild(host);
      instance = mod.mount(host, env);
    } else {
      set(host, { background: '#b00020', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontFamily: 'monospace' });
      host.textContent = `No renderer for "${layer.module}"`;
      host.setAttribute('data-missing', layer.module);
    }
    view = { host, instance, attached: host.isConnected };
    layers.set(layer.id, view);
    return view;
  }

  /** Draws the frame at `time` (seconds). Synchronous: pictures and film may still be loading; `settled()` waits for them. */
  function render(time) {
    const frame = evaluate(timeline, time);
    lastFrame = frame;
    const { width, height } = timeline.stage;
    const seen = new Set();
    for (const layer of frame.layers) {
      seen.add(layer.id);
      const view = layerView(layer);
      let opacity = layer.opacity;
      let transform = '';
      let clipPath = 'none';
      const slide = Math.min(width, height) * 0.08;
      const moving = [];
      for (const [tr, entering] of [[layer.enter, true], [layer.exit, false]]) {
        if (!tr) continue;
        const p = entering ? tr.progress : 1 - tr.progress; // 0 = gone, 1 = fully there
        const off = (1 - p) * slide * (entering ? 1 : -1);
        moving.push(tr.type);
        if (tr.type === 'wipe') clipPath = entering ? `inset(0 ${((1 - p) * 100).toFixed(3)}% 0 0)` : `inset(0 0 0 ${((1 - p) * 100).toFixed(3)}%)`;
        else opacity *= p;
        if (tr.type === 'slide-up') transform += ` translateY(${px(off)})`;
        else if (tr.type === 'slide-down') transform += ` translateY(${px(-off)})`;
        else if (tr.type === 'slide-left') transform += ` translateX(${px(off)})`;
        else if (tr.type === 'slide-right') transform += ` translateX(${px(-off)})`;
        else if (tr.type === 'zoom') transform += ` scale(${(entering ? 0.88 + 0.12 * p : 1.1 - 0.1 * p).toFixed(4)})`;
      }
      if (layer.scale !== 1) transform += ` scale(${layer.scale.toFixed(4)})`;
      if (layer.rotate) transform += ` rotate(${layer.rotate.toFixed(3)}deg)`;
      set(view.host, {
        display: 'block',
        left: px(layer.box.x),
        top: px(layer.box.y),
        width: px(layer.box.w),
        height: px(layer.box.h),
        opacity: opacity.toFixed(4),
        transform: transform.trim() || 'none',
        clipPath,
        zIndex: String(layer.z),
      });
      if (moving.length) view.host.setAttribute('data-moving', moving.join(' '));
      else view.host.removeAttribute('data-moving');
      if (!view.attached) {
        stageEl.appendChild(view.host);
        view.attached = true;
      }
      view.instance?.update(layer, frame);
    }
    for (const [id, view] of layers) if (!seen.has(id) && view.host.style.display !== 'none') view.host.style.display = 'none';

    if (showCaptions && frame.caption) {
      if (!captionRow.isConnected) stageEl.appendChild(captionRow);
      if (captionEl.textContent !== frame.caption.text) captionEl.textContent = frame.caption.text;
      set(captionRow, { display: 'flex' });
    } else if (captionRow) set(captionRow, { display: 'none' });
    return frame;
  }

  /** Resolves when everything the last frames asked for (pictures, film seeks, fonts) has arrived. */
  async function settled() {
    while (pending.length) {
      const batch = pending;
      pending = [];
      await Promise.all(batch.map((p) => Promise.resolve(p).catch(() => {})));
    }
    if (document.fonts?.status === 'loading') await document.fonts.ready;
  }

  async function show(time) {
    const frame = render(time);
    await settled();
    return frame;
  }

  /** A string that is the same for two frames exactly when they look the same. */
  function signature() {
    return stageEl.innerHTML;
  }

  /**
   * What is wrong with the picture on screen right now. Each problem is
   * { severity: 'error' | 'warning', clip, message }.
   *   - text that is cut off by its box, or shrunk a long way to fit
   *   - text or labels that run off the stage
   *   - text too small to read on a phone
   *   - pictures and film that failed to load, and clips with no renderer
   */
  function audit() {
    const out = [];
    if (!timeline) return out;
    const stageRect = stageEl.getBoundingClientRect();
    const short = Math.min(timeline.stage.width, timeline.stage.height);
    const clipOf = (node) => node.closest('[data-layer]')?.getAttribute('data-layer') ?? '(stage)';
    const visible = (node) => {
      for (let n = node; n && n !== stageEl; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (cs.display === 'none' || Number(cs.opacity) < 0.05) return false;
      }
      return true;
    };
    const quote = (node) => {
      const text = node.textContent.replace(/\s+/g, ' ').trim();
      return text.length > 48 ? `${text.slice(0, 48)}…` : text;
    };
    const add = (severity, node, message) => out.push({ severity, clip: clipOf(node), message });
    const offStage = (rect) => rect.left < stageRect.left - 1 || rect.top < stageRect.top - 1 || rect.right > stageRect.right + 1 || rect.bottom > stageRect.bottom + 1;

    for (const box of stageEl.querySelectorAll('[data-fit]')) {
      const inner = box.firstElementChild;
      if (!inner || !inner.textContent.trim() || !visible(box)) continue;
      const moving = box.closest('[data-moving]');
      const cs = getComputedStyle(box);
      const roomW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const roomH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      if (inner.scrollWidth > roomW + 2 || inner.scrollHeight > roomH + 2) add('error', box, `text is cut off: "${quote(inner)}" needs ${inner.scrollWidth}×${inner.scrollHeight} but its box has ${Math.round(roomW)}×${Math.round(roomH)}`);
      const shrunk = Number(box.getAttribute('data-fit'));
      if (shrunk && shrunk < 0.75) add('warning', box, `text was shrunk to ${Math.round(shrunk * 100)}% to fit: "${quote(inner)}" (shorten it or give it a bigger box)`);
      const rect = inner.getBoundingClientRect();
      if (!moving && rect.width > 0 && offStage(rect)) add('error', box, `text runs off the stage: "${quote(inner)}"`);
      // Size as the viewer sees it, in stage units (a scene may scale its text down).
      const seen = (parseFloat(getComputedStyle(inner).fontSize) * (inner.offsetWidth ? rect.width / inner.offsetWidth : stageScale)) / stageScale;
      if (seen > 0 && seen < short * 0.022) add('warning', box, `text is small (${seen.toFixed(0)} px on a ${short} px stage): "${quote(inner)}"`);
    }
    const texts = []; // every piece of text on screen, with where it is: for the caption check below
    for (const box of stageEl.querySelectorAll('[data-fit]')) {
      const inner = box.firstElementChild;
      if (inner && inner.textContent.trim() && visible(box) && !box.closest('[data-moving]')) texts.push([inner, inner.getBoundingClientRect()]);
    }
    for (const label of stageEl.querySelectorAll('[data-label]')) {
      if (!visible(label)) continue;
      texts.push([label, label.getBoundingClientRect()]);
      if (offStage(label.getBoundingClientRect())) add('error', label, `label runs off the stage: "${quote(label)}" (put it on another side of its target)`);
    }
    // Text drawn inside an SVG (charts, custom drawings).
    for (const t of stageEl.querySelectorAll('[data-layer] svg text')) {
      if (!t.textContent.trim() || !visible(t) || t.closest('[data-moving]')) continue;
      const rect = t.getBoundingClientRect();
      if (!rect.width) continue;
      texts.push([t, rect]);
      if (offStage(rect)) add('error', t, `text runs off the stage: "${quote(t)}"`);
      const seen = rect.height / 1.17 / stageScale;
      if (seen < short * 0.022) add('warning', t, `text is small (${seen.toFixed(0)} px on a ${short} px stage): "${quote(t)}"`);
    }
    for (const media of stageEl.querySelectorAll('img, video')) {
      if (!visible(media)) continue;
      const broken = media.hasAttribute('data-broken') || (media.tagName === 'IMG' && media.complete && media.naturalWidth === 0);
      if (broken) add('error', media, `${media.tagName === 'IMG' ? 'picture' : 'film'} did not load: ${media.getAttribute('data-broken') ?? media.getAttribute('src')}`);
    }
    for (const missing of stageEl.querySelectorAll('[data-missing]')) if (visible(missing)) add('error', missing, `module "${missing.getAttribute('data-missing')}" has no renderer (no mount function)`);
    if (stageEl.hasAttribute('data-font-error')) out.push({ severity: 'error', clip: '(stage)', message: `font did not load: ${stageEl.getAttribute('data-font-error')}` });
    if (captionRow?.isConnected && captionRow.style.display !== 'none') {
      const rect = captionEl.getBoundingClientRect();
      for (const [node, r] of texts) {
        const overlapX = Math.min(r.right, rect.right) - Math.max(r.left, rect.left);
        const overlapY = Math.min(r.bottom, rect.bottom) - Math.max(r.top, rect.top);
        if (overlapX > 2 && overlapY > 2) add('error', node, `the caption covers "${quote(node)}" (keep content above the caption band: use the kit's area(), or move it up)`);
      }
      const lines = Math.round((rect.height / stageScale - short * 0.024) / (parseFloat(captionEl.style.fontSize) * 1.28));
      if (lines > 2) out.push({ severity: 'warning', clip: '(captions)', message: `caption takes ${lines} lines: "${quote(captionEl)}" (split the line or lower stage.caption.maxUnits)` });
    }
    return out;
  }

  return { load, render, show, settled, signature, audit, fit, get timeline() { return timeline; }, get frame() { return lastFrame; }, stageEl };
}
