// Times in a script: seconds (12.5), timecodes ("1:05.25"), or references to
// other things in the script ("@n3", "@n3.end", "@n3.end+0.5", "@n3+40%").

/** Ids that references may use: letters, digits, "_" and "-", starting with a letter or "_". */
export const ID_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;

const TIMECODE = /^(?:(\d+):)?(?:(\d+):)?(\d+(?:\.\d+)?)$/;
const REF = /^@([A-Za-z_][A-Za-z0-9_-]*)(?:\.(start|end))?\s*(?:([+-])\s*(\d+(?::\d+){0,2}(?:\.\d+)?)(%)?)?$/;

/** "12.5" → 12.5, "1:05.25" → 65.25, "1:02:03" → 3723. Undefined when malformed. */
export function parseTimecode(text) {
  const m = TIMECODE.exec(String(text).trim());
  if (!m) return undefined;
  const [, a, b, s] = m;
  const hours = b !== undefined ? Number(a) : 0;
  const minutes = b !== undefined ? Number(b) : a !== undefined ? Number(a) : 0;
  return hours * 3600 + minutes * 60 + Number(s);
}

/**
 * Parses a time. Returns `{ kind: 'relative', seconds }` for a number or a
 * timecode, or `{ kind: 'ref', id, edge, offset, fraction }` for a reference.
 * Only one offset is allowed: "@n3+40%+1" is malformed; give the first step an
 * id and chain from it instead ("@k12+1").
 *
 * Ids may contain "-", so "@n3-2" could mean the thing called "n3-2" or two
 * seconds before "n3". Pass `known(id)` to settle it: an id that exists wins;
 * otherwise a trailing "-number" is read as an offset. ("@n3 - 2" is never ambiguous.)
 */
export function parseTime(value, known) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`time must be a finite number, got ${value}`);
    return { kind: 'relative', seconds: value };
  }
  if (typeof value !== 'string') throw new Error(`time must be a number or a string, got ${JSON.stringify(value)}`);
  const text = value.trim();
  if (text.startsWith('@')) {
    const m = REF.exec(text);
    if (!m) throw new Error(`malformed time reference "${value}" (expected "@id", "@id.end", "@id+1.5", "@id+40%")`);
    const [, id, edge, sign, amount, percent] = m;
    let offset = 0;
    let fraction = 0;
    if (sign && amount) {
      const direction = sign === '-' ? -1 : 1;
      if (percent) {
        if (amount.includes(':')) throw new Error(`malformed offset in "${value}"`);
        fraction = (direction * Number(amount)) / 100;
      } else {
        offset = direction * parseTimecode(amount);
      }
    }
    if (known && !sign && !edge && id !== 'start' && id !== 'end' && !known(id)) {
      const cut = /^(.*[^-])-(\d+)$/.exec(id);
      if (cut && (cut[1] === 'start' || cut[1] === 'end' || known(cut[1]))) return { kind: 'ref', id: cut[1], edge: 'start', offset: -Number(cut[2]), fraction: 0 };
    }
    return { kind: 'ref', id, edge: edge ?? 'start', offset, fraction };
  }
  const seconds = parseTimecode(text);
  if (seconds === undefined) throw new Error(`malformed time "${value}" (expected seconds, "m:ss.s", or "@ref")`);
  return { kind: 'relative', seconds };
}

/** 65.25 → "1:05.25"; for messages, dumps and chapter lists. */
export function formatTimecode(seconds, decimals = 2) {
  const sign = seconds < 0 ? '-' : '';
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs - h * 3600 - m * 60;
  const k = 10 ** decimals;
  const ss = (Math.round(s * k) / k).toString();
  const padded = s < 10 ? `0${ss}` : ss;
  return h > 0 ? `${sign}${h}:${String(m).padStart(2, '0')}:${padded}` : `${sign}${m}:${padded}`;
}
