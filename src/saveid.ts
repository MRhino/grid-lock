// Shared by the browser and the /api/save function: save IDs and merging saves.
// IDs are 16 chars of Crockford base32 (80 random bits): unguessable, easy to read aloud.
export const ID_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const ID_RE = /^[0-9A-HJKMNP-TV-Z]{16}$/;

/** Accepts "GL-7K3M-Q9TX-2HWP-R4FN", lowercase, spaces, O for 0, I/L for 1. */
export function normalizeId(input: string): string | null {
  let s = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.length === 18 && s.startsWith('GL')) s = s.slice(2);
  s = s.replace(/O/g, '0').replace(/[IL]/g, '1').replace(/U/g, 'V');
  return ID_RE.test(s) ? s : null;
}

export const formatId = (id: string) => `GL-${id.match(/.{4}/g)!.join('-')}`;

export interface Best { moves: number; stars: number }
export type Bests = Record<string, Best>; // keyed by level number

// Saves are public-write, so the key space must be finite: these bound a save's total size.
// MAX_LEVEL leaves room for appended packs; raise it (and MAX_SAVE_BYTES) before shipping past it.
export const MAX_LEVEL = 1000;
const MAX_MOVES = 99_999;
export const MAX_SAVE_BYTES = 32_000;

/** Tolerant: keeps every entry it can validate, drops the rest. */
export function cleanBests(x: any): Bests {
  const out: Bests = {};
  if (x && typeof x === 'object') for (const [k, b] of Object.entries<any>(x)) {
    if (/^[1-9]\d{0,3}$/.test(k) && Number(k) <= MAX_LEVEL && Number.isInteger(b?.moves) && b.moves > 0 && b.moves <= MAX_MOVES && Number.isInteger(b?.stars))
      out[k] = { moves: b.moves, stars: Math.max(1, Math.min(3, b.stars)) };
  }
  return out;
}

/** Combine two copies level by level, so neither can lose anything. Add new save fields here too. */
export function mergeSaves(a: { schema?: unknown; best?: unknown }, b: { schema?: unknown; best?: unknown }) {
  const best = cleanBests(a.best);
  for (const [k, v] of Object.entries(cleanBests(b.best))) {
    best[k] = best[k] ? { moves: Math.min(best[k].moves, v.moves), stars: Math.max(best[k].stars, v.stars) } : v;
  }
  const schema = Math.max(Number(a.schema) || 1, Number(b.schema) || 1);
  return { schema, best };
}
