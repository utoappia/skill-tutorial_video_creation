// `code`: a block of code or terminal text, for programming and how-to videos.
//
// props   { code, title?, size?, numbers?: true, highlight?: [lineNumbers], typed? }
//   typed   how many characters are showing at the start (default: all). Use 0 and `type`.
// commands
//   type      {}                 the text types itself out over the command's duration
//   highlight { lines: [n, …] }  light up some lines (from 1) and dim the rest; null to undo
//   setCode   { code }           swap the text (a before / after)
//
// Show a few lines, not a file: a viewer can read about ten short lines on a
// screen. Highlight the one line you are talking about while you talk about it.
import { el, fill, px, set } from './dom.js';

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export default {
  type: 'code',
  commands: ['type', 'highlight', 'setCode'],
  validateProps: (p) => (typeof p.code === 'string' ? [] : ['code needs "code" (a string)']),
  init: (props) => ({ code: props.code, title: props.title ?? null, size: props.size ?? null, numbers: props.numbers !== false, highlight: props.highlight ?? null, typed: props.typed ?? props.code.length }),
  validateCommand: (state, cmd) => {
    if (cmd.name === 'setCode' && typeof cmd.args.code !== 'string') return ['setCode needs { code }'];
    if (cmd.name === 'highlight' && cmd.args.lines !== null && !Array.isArray(cmd.args.lines)) return ['highlight needs { lines: [n, …] } or { lines: null }'];
    return [];
  },
  apply: (state, cmd) =>
    cmd.name === 'type' ? { ...state, typed: state.code.length } : cmd.name === 'highlight' ? { ...state, highlight: cmd.args.lines } : { ...state, code: cmd.args.code, typed: cmd.args.code.length },

  mount(host, env) {
    const theme = env.theme;
    const card = el('div', { ...fill, boxSizing: 'border-box', background: '#0d1420', borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }, host);
    const bar = el('div', { flex: '0 0 auto', color: theme.dim, fontFamily: theme.font, fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden' }, card);
    const body = el('div', { position: 'relative', flex: '1 1 0', minHeight: '0' }, card);
    body.setAttribute('data-fit', '');
    const pre = el('div', { fontFamily: theme.mono, whiteSpace: 'pre', color: '#e6edf7', width: 'max-content', minWidth: '100%' }, body);
    let key = '';
    let sized = '';
    let scale = 1;
    return {
      update(layer) {
        const s = layer.state;
        const short = Math.min(env.stage.width, env.stage.height);
        let typed = s.typed;
        for (const a of layer.active) if (a.command.name === 'type') typed = a.from.typed + (a.to.typed - a.from.typed) * a.linear;
        typed = Math.floor(typed);
        const k = JSON.stringify([s.code, s.title, s.highlight, typed, s.size, layer.box.w, layer.box.h]);
        if (k === key) return;
        key = k;
        const base = s.size ?? short * 0.032;
        set(card, { borderWidth: px(short * 0.002), borderRadius: px(short * 0.018) });
        set(bar, { display: s.title ? 'block' : 'none', fontSize: px(base * 0.7), padding: `${px(base * 0.45)} ${px(base * 0.8)}`, borderBottom: `${px(short * 0.002)} solid rgba(255,255,255,0.14)` });
        bar.textContent = s.title ?? '';
        const lines = s.code.split('\n');
        const width = String(lines.length).length;
        const draw = (typed) => {
          let seen = 0;
          return lines
            .map((line, i) => {
              const part = line.slice(0, Math.max(0, typed - seen));
              const caret = typed < s.code.length && typed >= seen && typed <= seen + line.length ? `<span style="background:${theme.accent};color:${theme.accent}">.</span>` : '';
              seen += line.length + 1;
              const lit = s.highlight?.includes(i + 1);
              const dim = s.highlight && !lit;
              const num = s.numbers ? `<span style="color:rgba(255,255,255,0.3);user-select:none">${String(i + 1).padStart(width, ' ')}  </span>` : '';
              return `<div style="padding:0 ${px(base * 0.8)};opacity:${dim ? 0.38 : 1};${lit ? `background:rgba(255,207,63,0.16);box-shadow:inset ${px(base * 0.18)} 0 0 ${theme.accent};` : ''}">${num}${esc(part)}${caret}${part || caret ? '' : ' '}</div>`;
            })
            .join('');
        };
        // Shrink until the longest line and the last line both fit. Measured on the
        // whole text, so the letters do not change size while it types itself out.
        const sizeKey = JSON.stringify([s.code, s.title, s.size, layer.box.w, layer.box.h]);
        const fit = () => set(pre, { fontSize: px(base * scale), lineHeight: '1.5', padding: `${px(base * scale * 0.6)} 0` });
        if (sizeKey !== sized) {
          sized = sizeKey;
          scale = 1;
          pre.innerHTML = draw(s.code.length);
          fit();
          while (scale > 0.5 && (pre.scrollWidth > body.clientWidth + 1 || pre.scrollHeight > body.clientHeight + 1)) {
            scale -= 0.05;
            fit();
          }
        }
        pre.innerHTML = draw(typed);
      },
    };
  },
};
