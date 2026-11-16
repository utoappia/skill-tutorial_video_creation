// `term`, `list` and `countdown`: the three teaching cards.
import { clamp01, pop } from '../easing.js';
import { el, fill, fitBox, px, richText, set } from './dom.js';

// term — a word card: the new word, big, in the middle of the screen, with what
// it means in plain words. Everything behind it dims, so for a moment the word
// is the only thing to look at.
//   props { word, meaning, example?, sounds? }   sounds: how to say it ("say: KOM-pound")
//   No commands. It pops in when its clip starts and fades as the clip ends.
export const term = {
  type: 'term',
  commands: [],
  validateProps: (p) => ['word', 'meaning'].filter((k) => typeof p[k] !== 'string' || !p[k].trim()).map((k) => `a term card needs "${k}"`),
  init: (props) => ({ ...props }),
  apply: (state) => state,
  mount(host, env) {
    const theme = env.theme;
    const shade = el('div', { ...fill, background: '#000' }, host);
    const card = el('div', { position: 'absolute', boxSizing: 'border-box', borderStyle: 'solid', background: theme.card, borderColor: theme.accent, display: 'flex', flexDirection: 'column' }, host);
    const wordBox = el('div', { position: 'relative', flex: '0 0 40%' }, card);
    const word = fitBox(wordBox);
    const meaningBox = el('div', { position: 'relative', flex: '1 1 0' }, card);
    const meaning = fitBox(meaningBox);
    return {
      update(layer) {
        const s = layer.state;
        const W = layer.box.w;
        const H = layer.box.h;
        const short = Math.min(W, H);
        const life = layer.end - layer.start;
        const inP = clamp01(layer.localTime / 0.35);
        const outP = clamp01((life - layer.localTime) / 0.25);
        const w = Math.min(W * 0.84, short * 1.25);
        const h = Math.min(H * 0.6, short * 0.56);
        set(shade, { opacity: (0.6 * Math.min(inP, outP)).toFixed(3) });
        set(card, {
          left: px((W - w) / 2),
          top: px((H - h) / 2),
          width: px(w),
          height: px(h),
          borderWidth: px(short * 0.006),
          borderRadius: px(short * 0.035),
          padding: px(short * 0.04),
          opacity: Math.min(clamp01(inP * 2), outP).toFixed(3),
          transform: `scale(${(0.8 + 0.2 * pop(inP)).toFixed(4)})`,
          boxShadow: `0 ${px(short * 0.02)} ${px(short * 0.06)} rgba(0,0,0,0.5)`,
        });
        set(word.inner, { color: theme.accent, fontFamily: theme.font, fontWeight: '800', textAlign: 'center', lineHeight: '1.1' });
        set(meaning.inner, { color: theme.ink, fontFamily: theme.font, fontWeight: '500', textAlign: 'center', lineHeight: '1.3' });
        const sounds = s.sounds ? `<div style="font-size:0.32em;font-weight:500;color:${theme.dim};margin-top:0.25em">${richText(s.sounds, theme.accent)}</div>` : '';
        word.write(richText(s.word, theme.accent) + sounds, short * 0.11, [s.word, s.sounds, w, h].join('|'));
        const example = s.example ? `<div style="font-size:0.8em;color:${theme.dim};margin-top:0.5em">${richText(s.example, theme.accent)}</div>` : '';
        meaning.write(richText(s.meaning, theme.accent) + example, short * 0.05, [s.meaning, s.example, w, h].join('|'));
      },
    };
  },
};

// list — a heading and points that arrive one at a time: agendas, steps, recaps.
//   props { heading?, items: [text, …], style?: bullets | numbers | checks, shown?: 0, size? }
//   commands: show { count }       how many points are visible (they fade in over the duration)
//             next {}              one more
//             highlight { index }  dim the others (index from 0; null to undo)
export const list = {
  type: 'list',
  commands: ['show', 'next', 'highlight'],
  validateProps: (p) => (Array.isArray(p.items) && p.items.every((i) => typeof i === 'string') ? [] : ['a list needs "items": a list of texts']),
  init: (props) => ({ heading: props.heading ?? null, items: props.items, style: props.style ?? 'bullets', size: props.size ?? null, shown: props.shown ?? 0, highlight: null }),
  validateCommand: (state, cmd) => {
    if (cmd.name === 'show' && (typeof cmd.args.count !== 'number' || cmd.args.count < 0 || cmd.args.count > state.items.length)) return [`show needs { count } from 0 to ${state.items.length}`];
    if (cmd.name === 'next' && state.shown >= state.items.length) return [`all ${state.items.length} points are already showing`];
    if (cmd.name === 'highlight' && cmd.args.index !== null && !(cmd.args.index >= 0 && cmd.args.index < state.items.length)) return [`highlight needs { index } from 0 to ${state.items.length - 1}, or null`];
    return [];
  },
  apply: (state, cmd) => (cmd.name === 'show' ? { ...state, shown: cmd.args.count } : cmd.name === 'next' ? { ...state, shown: state.shown + 1 } : { ...state, highlight: cmd.args.index }),
  mount(host, env) {
    const theme = env.theme;
    const text = fitBox(host);
    return {
      update(layer) {
        const s = layer.state;
        const short = Math.min(env.stage.width, env.stage.height);
        // How visible each point is: full when shown, part-way while its command runs.
        const vis = s.items.map((_, i) => (i < s.shown ? 1 : 0));
        for (const a of layer.active) {
          if (a.command.name === 'highlight') continue;
          for (let i = a.from.shown; i < a.to.shown; i++) vis[i] = Math.min(vis[i], a.progress);
          for (let i = a.to.shown; i < a.from.shown; i++) vis[i] = Math.max(vis[i], 1 - a.progress);
        }
        const mark = (i) => (s.style === 'numbers' ? `${i + 1}.` : s.style === 'checks' ? '✓' : '•');
        const rows = s.items
          .map((item, i) => {
            const dim = s.highlight !== null && s.highlight !== i ? 0.35 : 1;
            return `<div style="display:flex;gap:0.6em;margin-top:0.55em;opacity:${(vis[i] * dim).toFixed(3)};transform:translateY(${((1 - vis[i]) * 0.4).toFixed(3)}em)"><span style="flex:0 0 1.3em;text-align:right;color:${s.style === 'checks' ? theme.good : theme.accent};font-weight:800">${mark(i)}</span><span style="flex:1 1 0;min-width:0">${richText(item, theme.accent)}</span></div>`;
          })
          .join('');
        const heading = s.heading ? `<div style="font-size:1.35em;font-weight:800;line-height:1.15">${richText(s.heading, theme.accent)}</div>` : '';
        // The block is as wide as its longest point and sits in the middle of the box.
        set(text.inner, { color: theme.ink, fontFamily: theme.font, fontWeight: '500', lineHeight: '1.3', textAlign: 'left', width: 'fit-content', maxWidth: '100%', alignSelf: 'center' });
        // The size is fitted for the whole list once, so points don't jump as later ones arrive.
        const size = s.size ?? short * 0.055;
        text.write(heading + rows, size, [heading, rows, layer.box.w, layer.box.h].join('|'));
      },
    };
  },
};

// countdown — "pause and think": a question and a ring that drains while the
// viewer works it out.
//   props { question, label?, hint?, seconds?, shade? }
//     label:   a small heading above the question ("Quick quiz")
//     seconds: the thinking time, and the number shown counting down (default: the clip's length).
//              A clip longer than this waits first, ring full, while the question is read aloud,
//              and counts down over its last `seconds`.
//     shade:   0…1, how dark to make what is behind it (default 0: nothing)
//   No commands.
//
// This is also the smallest complete module, and the model for writing your own:
// `init` and `apply` are pure and know nothing about the screen; `mount` builds
// DOM once; `update` sets everything it owns from the frame, every time.
export const countdown = {
  type: 'countdown',
  commands: [],
  validateProps: (p) => (typeof p.question === 'string' ? [] : ['a countdown needs "question"']),
  init: (props) => ({ ...props }),
  apply: (state) => state,
  mount(host, env) {
    const theme = env.theme;
    const shade = el('div', { ...fill, background: env.stage.background ?? '#000' }, host);
    const textBox = el('div', { position: 'absolute', left: '8%', top: '10%', width: '84%', height: '48%' }, host);
    const text = fitBox(textBox);
    const ring = el('div', { position: 'absolute' }, host);
    return {
      update(layer) {
        const s = layer.state;
        const short = Math.min(env.stage.width, env.stage.height);
        const life = layer.end - layer.start;
        const secs = Math.min(life, s.seconds ?? life);
        const left = clamp01(1 - (layer.localTime - (life - secs)) / secs); // full while the question is read
        const count = Math.max(1, Math.ceil(secs * left));
        set(shade, { opacity: String(s.shade ?? 0) });
        const d = Math.min(layer.box.h * 0.3, short * 0.18);
        const r = d / 2 - d * 0.07;
        const c = 2 * Math.PI * r;
        set(text.inner, { color: theme.ink, fontFamily: theme.font, fontWeight: '700', textAlign: 'center', lineHeight: '1.25' });
        const hint = s.hint ? `<div style="font-size:0.62em;font-weight:500;color:${theme.dim};margin-top:0.5em">${richText(s.hint, theme.accent)}</div>` : '';
        const label = s.label ? `<div style="font-size:0.5em;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${theme.accent};margin-bottom:0.9em">${richText(s.label, theme.accent)}</div>` : '';
        text.write(label + richText(s.question, theme.accent) + hint, short * 0.06, [s.label, s.question, s.hint, layer.box.w, layer.box.h].join('|'));
        set(ring, { left: px((layer.box.w - d) / 2), top: px(layer.box.h * 0.62), width: px(d), height: px(d) });
        ring.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${d}" height="${d}" viewBox="0 0 ${d} ${d}" style="display:block"><circle cx="${d / 2}" cy="${d / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="${d * 0.07}"/><circle cx="${d / 2}" cy="${d / 2}" r="${r}" fill="none" stroke="${theme.accent}" stroke-width="${d * 0.07}" stroke-linecap="round" stroke-dasharray="${(c * left).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${d / 2} ${d / 2})"/><text x="${d / 2}" y="${d / 2}" text-anchor="middle" dominant-baseline="central" fill="${theme.ink}" font-family="${theme.font.replace(/"/g, "'")}" font-weight="800" font-size="${d * 0.42}">${count}</text></svg>`;
      },
    };
  },
};
