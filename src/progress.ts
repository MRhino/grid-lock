// Saved progress and the puzzle in progress.
//
// Rules that keep progress safe across deploys (localStorage survives SW updates):
// - Never rename KEY. Change the shape by bumping SCHEMA and adding a step to MIGRATIONS.
// - parse() never throws and keeps every field it can validate.
// - Every save also writes a backup copy; a corrupt main save falls back to it.
// - The mid-level run is disposable: if it doesn't replay cleanly, only the run is dropped.
import type { Step } from './puzzle.ts';

export interface Best { moves: number; stars: number }
export interface Save { schema: number; best: Record<string, Best> } // keyed by level number

const KEY = 'gl-save-v1';
const BACKUP = 'gl-save-backup';
const RUN = 'gl-run';
export const SCHEMA = 1;

// MIGRATIONS[n] upgrades a schema-n save to n+1. Add, never edit.
const MIGRATIONS: Record<number, (s: any) => any> = {};

export const fresh = (): Save => ({ schema: SCHEMA, best: {} });

export function parse(raw: string | null): Save | null {
  if (!raw) return null;
  try {
    let s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return null;
    let v = typeof s.schema === 'number' ? s.schema : 0;
    while (v < SCHEMA && MIGRATIONS[v]) s = MIGRATIONS[v++](s);
    const out = fresh();
    if (s.best && typeof s.best === 'object') for (const [k, b] of Object.entries<any>(s.best)) {
      if (/^\d+$/.test(k) && Number.isInteger(b?.moves) && b.moves > 0 && Number.isInteger(b?.stars))
        out.best[k] = { moves: b.moves, stars: Math.max(1, Math.min(3, b.stars)) };
    }
    return out;
  } catch { return null; }
}

export function save(s: Save) {
  const raw = JSON.stringify({ ...s, schema: SCHEMA });
  try { localStorage.setItem(KEY, raw); localStorage.setItem(BACKUP, raw); } catch { /* storage full/blocked */ }
}

export function load(): Save {
  const s = parse(localStorage.getItem(KEY)) ?? parse(localStorage.getItem(BACKUP));
  if (!s) return fresh();
  save(s);
  return s;
}

/** Keeps the fewest moves and the most stars independently. */
export function record(s: Save, level: number, moves: number, stars: number) {
  const b = s.best[level];
  s.best[level] = b ? { moves: Math.min(b.moves, moves), stars: Math.max(b.stars, stars) } : { moves, stars };
  save(s);
}

/** Highest playable level: one past the furthest solved. */
export function unlocked(s: Save, total: number): number {
  return Math.min(total, Math.max(0, ...Object.keys(s.best).map(Number)) + 1);
}
export const totalStars = (s: Save) => Object.values(s.best).reduce((n, b) => n + b.stars, 0);

// ---------- in-progress level ----------
export interface RunSave { v: 1; level: number; history: Step[]; hinted: boolean }

export function saveRun(level: number, history: Step[], hinted: boolean) {
  try { localStorage.setItem(RUN, JSON.stringify({ v: 1, level, history, hinted })); } catch { /* ignore */ }
}
export function clearRun() { localStorage.removeItem(RUN); }
export function loadRun(): RunSave | null {
  try {
    const r = JSON.parse(localStorage.getItem(RUN) ?? '');
    if (r?.v === 1 && Number.isInteger(r.level) && Array.isArray(r.history)) return r;
  } catch { /* fall through */ }
  clearRun();
  return null;
}

/** Ask the browser not to evict our storage (iOS can clear idle home-screen apps). */
export function requestPersist() {
  void navigator.storage?.persist?.().catch(() => {});
}
