// Small DOM helpers shared by the module renderers.
//
// Renderers are imperative but idempotent: `update(layer, frame)` sets every
// style it owns from the frame, every time. No CSS transitions, no CSS
// animations, no timers: the picture must be a pure function of the frame.

export const px = (n) => `${Math.round(n * 1000) / 1000}px`;

export function el(tag = 'div', style, parent) {
  const node = document.createElement(tag);
  if (style) Object.assign(node.style, style);
  if (parent) parent.appendChild(node);
  return node;
}

export const fill = { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%' };

/** Sets a style or attribute only when it changed (keeps frames with nothing new byte-identical and cheap). */
export function set(node, style) {
  for (const [k, v] of Object.entries(style)) if (node.style[k] !== v) node.style[k] = v;
}

const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Text → HTML: escaped, with **strong** drawn in the accent colour (use it for
 * the one word a line is about, never for decoration) and newlines kept.
 */
export function richText(text, accent) {
  return escapeHtml(text ?? '')
    .replace(/\*\*(.+?)\*\*/g, (_, s) => `<b style="font-weight:inherit;color:${accent}">${s}</b>`)
    .replace(/\n/g, '<br>');
}

/** The default theme; a script overrides parts of it in `stage.theme`. */
export function themeOf(stage) {
  return {
    ink: '#ffffff',
    dim: 'rgba(255,255,255,0.72)',
    accent: '#ffcf3f',
    accentInk: '#3a1d00',
    card: '#1b3354',
    good: '#3ddc97',
    bad: '#ff6b6b',
    font: stage?.fontFamily ?? 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", "PingFang TC", "Hiragino Sans", "Microsoft JhengHei", sans-serif',
    mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    ...stage?.theme,
  };
}

/**
 * A box that holds text and shrinks it until it fits: returns { box, inner, write }.
 * `write(html, size, key)` sets the text at `size` px and steps the size down
 * (5% at a time, to `min` of the size) while it overflows the box. The result is
 * remembered per `key`, so a frame that changes nothing measures nothing.
 * The box is marked `data-fit`, which the page's audit reads to report any text
 * that is still cut off at the smallest size.
 */
export function fitBox(parent, { min = 0.5 } = {}) {
  const box = el('div', { ...fill, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box', overflow: 'visible' }, parent);
  box.setAttribute('data-fit', '');
  const inner = el('div', { width: '100%', flexShrink: '0', overflowWrap: 'break-word', textWrap: 'balance' }, box);
  inner.setAttribute('dir', 'auto'); // right-to-left scripts read right to left inside the box
  let lastKey = null;
  const write = (html, size, key, fit = true) => {
    if (key === lastKey) return;
    lastKey = key;
    inner.innerHTML = html;
    let scale = 1;
    inner.style.fontSize = px(size);
    // While fitting, a word too wide for the box counts as overflow, so the text shrinks rather than
    // breaking in the middle of a word. Only text still too wide at the smallest size is broken.
    inner.style.overflowWrap = fit ? 'normal' : 'break-word';
    if (fit) {
      // The room is the box without its padding.
      const cs = getComputedStyle(box);
      const roomW = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const roomH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      while (scale > min + 1e-6 && (inner.scrollHeight > roomH + 1 || inner.scrollWidth > roomW + 1)) {
        scale -= 0.05;
        inner.style.fontSize = px(size * scale);
      }
      if (inner.scrollWidth > roomW + 1) inner.style.overflowWrap = 'break-word';
    }
    box.setAttribute('data-fit', scale < 1 ? scale.toFixed(2) : '');
  };
  return { box, inner, write };
}

export const center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
export const isBox = (v) => v !== null && typeof v === 'object' && ['x', 'y', 'w', 'h'].every((k) => typeof v[k] === 'number');
