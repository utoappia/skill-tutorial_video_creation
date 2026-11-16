// `chart`: a bar or line chart that can build itself while the narrator talks.
//
// props   { type?: bar | line, title?, labels: [text, …], values: [number, …],
//           series?: [{ name, values, color? }]   (instead of values, for several lines or grouped bars)
//           min?, max?, prefix?, suffix?, decimals?, shown?, highlight?, source?, colors? }
//   shown   how many points are drawn at the start (default: all). Start at 0 and `reveal` them.
//   source  a short credit drawn under the chart ("Source: …"): show where numbers come from.
// commands
//   reveal    { count? }      draw up to `count` points (default: all); bars grow, lines draw on
//   highlight { index }       colour one point in the accent colour and dim the rest (null to undo)
//   setValues { values } | { series }    numbers glide to new values
//
// One chart, one point: if the viewer should notice one bar, highlight it and say why.
import { el, fill, set } from './dom.js';

const seriesOf = (p) => (p.series ? p.series.map((s) => ({ ...s })) : [{ name: null, values: p.values }]);
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function niceMax(v) {
  if (!(v > 0)) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  for (const m of [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) if (m * p >= v) return m * p;
  return 10 * p;
}

export default {
  type: 'chart',
  commands: ['reveal', 'highlight', 'setValues'],

  validateProps(p) {
    const out = [];
    if (!Array.isArray(p.labels)) out.push('a chart needs "labels"');
    const series = p.series ?? (p.values ? [{ values: p.values }] : null);
    if (!series) out.push('a chart needs "values" or "series"');
    else for (const s of series) if (!Array.isArray(s.values) || s.values.length !== p.labels?.length || s.values.some((v) => typeof v !== 'number')) out.push('each series needs one number per label');
    if (p.type !== undefined && !['bar', 'line'].includes(p.type)) out.push(`unknown chart type "${p.type}" (bar, line)`);
    return out;
  },

  init: (props) => ({ ...props, type: props.type ?? 'bar', series: seriesOf(props), shown: props.shown ?? props.labels.length, highlight: props.highlight ?? null }),

  validateCommand(state, cmd) {
    const a = cmd.args;
    const n = state.labels.length;
    if (cmd.name === 'reveal' && a.count !== undefined && !(a.count >= 0 && a.count <= n)) return [`reveal needs { count } from 0 to ${n}`];
    if (cmd.name === 'highlight' && a.index !== null && !(a.index >= 0 && a.index < n)) return [`highlight needs { index } from 0 to ${n - 1}, or null`];
    if (cmd.name === 'setValues') {
      const series = a.series ?? (a.values ? [{ values: a.values }] : null);
      if (!series || series.length !== state.series.length || series.some((s) => !Array.isArray(s.values) || s.values.length !== n)) return ['setValues needs the same number of series and points as the chart has'];
    }
    return [];
  },

  apply(state, cmd) {
    const a = cmd.args;
    if (cmd.name === 'reveal') return { ...state, shown: a.count ?? state.labels.length };
    if (cmd.name === 'highlight') return { ...state, highlight: a.index };
    const next = a.series ?? [{ values: a.values }];
    return { ...state, series: state.series.map((s, i) => ({ ...s, ...next[i] })) };
  },

  mount(host, env) {
    const theme = env.theme;
    const root = el('div', fill, host);
    let key = '';
    return {
      update(layer) {
        const s = layer.state;
        const W = layer.box.w;
        const H = layer.box.h;
        // What is drawn now: values and the reveal edge, with commands in progress blended in.
        let shown = s.shown;
        const values = s.series.map((se) => [...se.values]);
        for (const a of layer.active) {
          const left = 1 - a.progress;
          if (a.command.name === 'reveal') shown += (a.from.shown - a.to.shown) * left;
          if (a.command.name === 'setValues') a.to.series.forEach((se, si) => se.values.forEach((v, i) => (values[si][i] += (a.from.series[si].values[i] - v) * left)));
        }
        const k = JSON.stringify([s.type, s.title, s.labels, values, shown, s.highlight, s.source, W, H]);
        if (k === key) return;
        key = k;

        const short = Math.min(env.stage.width, env.stage.height);
        const fs = Math.min(short * 0.042, H * 0.08);
        const n = s.labels.length;
        const top = (s.title ? fs * 2.6 : fs * 1.6) + (s.series.length > 1 ? fs * 1.6 : 0);
        const bottom = fs * (s.source ? 3.6 : 2.2);
        const left = fs * 0.5;
        const pw = W - left * 2;
        const ph = H - top - bottom;
        // The scale covers every value the chart will ever show, so it never jumps while building.
        const all = [...s.series.flatMap((se) => se.values), ...values.flat()];
        const min = s.min ?? Math.min(0, ...all);
        const max = s.max ?? niceMax(Math.max(...all));
        const y = (v) => top + ph - ((v - min) / (max - min || 1)) * ph;
        const fmt = (v) => `${s.prefix ?? ''}${v.toLocaleString('en-US', { maximumFractionDigits: s.decimals ?? (Math.abs(v) < 10 && v % 1 ? 1 : 0), minimumFractionDigits: s.decimals ?? 0 })}${s.suffix ?? ''}`;
        const palette = s.colors ?? ['#5aa9ff', '#ff9f5a', '#7ee0a1', '#c79bff', '#ff7fa8'];
        const font = `font-family="${theme.font.replace(/"/g, "'")}"`;
        const parts = [];
        if (s.title) parts.push(`<text x="${W / 2}" y="${fs * 1.4}" text-anchor="middle" ${font} font-size="${fs * 1.25}" font-weight="800" fill="${theme.ink}">${esc(s.title)}</text>`);
        if (s.series.length > 1) {
          let lx = left;
          s.series.forEach((se, si) => {
            const c = se.color ?? palette[si % palette.length];
            parts.push(`<rect x="${lx}" y="${top - fs * 1.9}" width="${fs * 0.8}" height="${fs * 0.8}" rx="${fs * 0.15}" fill="${c}"/><text x="${lx + fs * 1.1}" y="${top - fs * 1.2}" ${font} font-size="${fs * 0.95}" font-weight="600" fill="${theme.ink}">${esc(se.name ?? `Series ${si + 1}`)}</text>`);
            lx += fs * (2.4 + String(se.name ?? '').length * 0.52);
          });
        }
        parts.push(`<line x1="${left}" y1="${y(Math.max(min, 0))}" x2="${left + pw}" y2="${y(Math.max(min, 0))}" stroke="${theme.dim}" stroke-width="${Math.max(1, fs * 0.06)}"/>`);
        const slot = pw / n;
        const dimmed = (i) => s.highlight !== null && s.highlight !== i;
        if (s.type === 'bar') {
          const group = slot * 0.68;
          const bw = group / s.series.length;
          for (let i = 0; i < n; i++) {
            const grow = Math.min(1, Math.max(0, shown - i));
            if (grow <= 0) continue;
            s.series.forEach((se, si) => {
              const v = values[si][i] * grow;
              const base = y(Math.max(min, 0));
              const yy = y(v);
              const c = s.highlight === i ? theme.accent : se.color ?? palette[si % palette.length];
              const x = left + slot * i + (slot - group) / 2 + bw * si;
              parts.push(`<rect x="${x.toFixed(2)}" y="${Math.min(yy, base).toFixed(2)}" width="${(bw * 0.94).toFixed(2)}" height="${Math.abs(base - yy).toFixed(2)}" rx="${(Math.min(bw * 0.12, fs * 0.3)).toFixed(2)}" fill="${c}" opacity="${dimmed(i) ? 0.35 : 1}"/>`);
              if (grow >= 1 && bw > fs * 1.6) parts.push(`<text x="${(x + bw * 0.47).toFixed(2)}" y="${(Math.min(yy, base) - fs * 0.35).toFixed(2)}" text-anchor="middle" ${font} font-size="${fs * 0.95}" font-weight="700" fill="${theme.ink}" opacity="${dimmed(i) ? 0.4 : 1}">${esc(fmt(values[si][i]))}</text>`);
            });
          }
        } else {
          const px2 = (i) => left + slot * (i + 0.5);
          s.series.forEach((se, si) => {
            const c = se.color ?? palette[si % palette.length];
            const pts = [];
            for (let i = 0; i < n && i < shown; i++) pts.push([px2(i), y(values[si][i])]);
            // The line draws on: a part-way point between the last whole one and the next.
            const whole = Math.floor(shown);
            if (whole < n && whole >= 1 && shown > whole) {
              const t = shown - whole;
              pts.push([px2(whole - 1) + (px2(whole) - px2(whole - 1)) * t, y(values[si][whole - 1]) + (y(values[si][whole]) - y(values[si][whole - 1])) * t]);
            }
            if (pts.length > 1) parts.push(`<polyline points="${pts.map((p) => p.map((v) => v.toFixed(2)).join(',')).join(' ')}" fill="none" stroke="${c}" stroke-width="${fs * 0.16}" stroke-linecap="round" stroke-linejoin="round"/>`);
            for (let i = 0; i < n && i + 1 <= shown + 1e-9; i++) {
              const hi = s.highlight === i;
              parts.push(`<circle cx="${px2(i).toFixed(2)}" cy="${y(values[si][i]).toFixed(2)}" r="${fs * (hi ? 0.34 : 0.2)}" fill="${hi ? theme.accent : c}" opacity="${dimmed(i) ? 0.45 : 1}"/>`);
              if (hi || (s.series.length === 1 && n <= 8)) parts.push(`<text x="${px2(i).toFixed(2)}" y="${(y(values[si][i]) - fs * 0.6).toFixed(2)}" text-anchor="middle" ${font} font-size="${fs * 0.95}" font-weight="700" fill="${theme.ink}" opacity="${dimmed(i) ? 0.4 : 1}">${esc(fmt(values[si][i]))}</text>`);
            }
          });
        }
        // Labels thin out when there are too many to read.
        const every = Math.max(1, Math.ceil((n * fs * 3.2) / pw));
        s.labels.forEach((label, i) => {
          if (i % every && s.highlight !== i) return;
          parts.push(`<text x="${(left + slot * (i + 0.5)).toFixed(2)}" y="${top + ph + fs * 1.3}" text-anchor="middle" ${font} font-size="${fs * 0.95}" font-weight="${s.highlight === i ? 800 : 500}" fill="${s.highlight === i ? theme.accent : theme.dim}">${esc(label)}</text>`);
        });
        if (s.source) parts.push(`<text x="${left}" y="${H - fs * 0.5}" ${font} font-size="${fs * 0.8}" fill="${theme.dim}">${esc(s.source)}</text>`);
        root.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block">${parts.join('')}</svg>`;
        set(root, { width: `${W}px`, height: `${H}px` });
      },
    };
  },
};
