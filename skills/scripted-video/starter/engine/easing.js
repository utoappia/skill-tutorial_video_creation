// Easing: how a change moves between its start (0) and its end (1).
// Names: "linear", "hold" (jump at the end), "in", "out", "inOut" (cubic),
// "inQuad" / "outSine" / "inOutExpo"… (sine, quad, cubic, quart, expo, back),
// "pop" (a little overshoot), or "cubic-bezier(x1, y1, x2, y2)".

export const clamp01 = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Eases 0…1 into a little overshoot, for things popping into view. */
export const pop = (t) => {
  const u = clamp01(t);
  return 1 + 2.2 * (u - 1) ** 3 + 1.2 * (u - 1) ** 2;
};

const families = {
  sine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  quad: (t) => t * t,
  cubic: (t) => t * t * t,
  quart: (t) => t ** 4,
  expo: (t) => (t === 0 ? 0 : 2 ** (10 * t - 10)),
  back: (t) => 2.70158 * t * t * t - 1.70158 * t * t,
};

function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  return (p) => {
    const x = clamp01(p);
    if (x === 0 || x === 1) return x;
    let lo = 0;
    let hi = 1;
    let t = x;
    for (let i = 0; i < 40; i++) {
      const v = sampleX(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sampleY(t);
  };
}

const cache = new Map();

/** The easing function for a name. Unknown names throw, so a typo is caught when the script is compiled. */
export function easing(name = 'inOut') {
  const hit = cache.get(name);
  if (hit) return hit;
  let fn;
  if (name === 'linear') fn = (t) => clamp01(t);
  else if (name === 'hold') fn = (t) => (t >= 1 ? 1 : 0);
  else if (name === 'pop') fn = pop;
  else if (name.startsWith('cubic-bezier(')) {
    const nums = name.slice(13, -1).split(',').map(Number);
    if (nums.length !== 4 || nums.some((n) => !Number.isFinite(n))) throw new Error(`malformed easing "${name}"`);
    fn = cubicBezier(...nums);
  } else {
    const m = /^(inOut|in|out)([A-Z][a-z]+)?$/.exec(name);
    const family = m && families[(m[2] ?? 'Cubic').toLowerCase()];
    if (!m || !family) throw new Error(`unknown easing "${name}"`);
    if (m[1] === 'in') fn = (t) => family(clamp01(t));
    else if (m[1] === 'out') fn = (t) => 1 - family(1 - clamp01(t));
    else fn = (t) => (clamp01(t) < 0.5 ? family(clamp01(t) * 2) / 2 : 1 - family((1 - clamp01(t)) * 2) / 2);
  }
  cache.set(name, fn);
  return fn;
}
