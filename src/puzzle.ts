// The whole puzzle: pure, no DOM. A level is a 36-char board string, rows top to
// bottom, 'o' empty, letters for vehicles, 'A' the getaway car on the exit row.
// One move = one slide of one vehicle, any distance (the unit par is measured in).
export const SIZE = 6;
export const EXIT_ROW = 2;
export const HERO = 'A';
export const WIN_POS = SIZE - 2; // the hero's column once nothing is in its way

export interface Vehicle { id: string; len: number; horiz: boolean; line: number } // line: fixed row or column
export interface Move { v: number; to: number }
export interface Step { v: number; from: number; to: number }
export interface LevelDef { b: string; p: number }

export function parseBoard(b: string): { vehicles: Vehicle[]; pos: number[] } {
  if (b.length !== SIZE * SIZE) throw new Error('bad board length');
  const ids = [...new Set(b.replace(/o/g, ''))].sort();
  const vehicles: Vehicle[] = [], pos: number[] = [];
  for (const id of ids) {
    const cells = [...b].flatMap((c, i) => (c === id ? [i] : []));
    const r0 = Math.floor(cells[0] / SIZE), c0 = cells[0] % SIZE;
    const horiz = cells.length > 1 && cells[1] === cells[0] + 1;
    const step = horiz ? 1 : SIZE;
    if (cells.length < 2 || cells.length > 3 || cells.some((c, i) => c !== cells[0] + i * step)) throw new Error(`bad vehicle ${id}`);
    if (horiz && Math.floor(cells[cells.length - 1] / SIZE) !== r0) throw new Error(`vehicle ${id} wraps`);
    vehicles.push({ id, len: cells.length, horiz, line: horiz ? r0 : c0 });
    pos.push(horiz ? c0 : r0);
  }
  if (vehicles[0]?.id !== HERO || !vehicles[0].horiz || vehicles[0].line !== EXIT_ROW) throw new Error('bad hero');
  return { vehicles, pos };
}

export function toBoard(vs: Vehicle[], pos: number[]): string {
  const g = Array<string>(SIZE * SIZE).fill('o');
  vs.forEach((v, i) => { for (const c of cellsOf(v, pos[i])) g[c] = v.id; });
  return g.join('');
}

function cellsOf(v: Vehicle, p: number): number[] {
  return Array.from({ length: v.len }, (_, k) => (v.horiz ? v.line * SIZE + p + k : (p + k) * SIZE + v.line));
}

function occupancy(vs: Vehicle[], pos: number[]): Uint8Array {
  const g = new Uint8Array(SIZE * SIZE);
  vs.forEach((v, i) => { for (const c of cellsOf(v, pos[i])) g[c] = 1; });
  return g;
}

/** Furthest back and forward vehicle i can slide right now. */
export function rangeOf(vs: Vehicle[], pos: number[], i: number, g = occupancy(vs, pos)): [number, number] {
  const v = vs[i], at = (p: number) => (v.horiz ? v.line * SIZE + p : p * SIZE + v.line);
  let lo = pos[i], hi = pos[i];
  while (lo > 0 && !g[at(lo - 1)]) lo--;
  while (hi + v.len < SIZE && !g[at(hi + v.len)]) hi++;
  return [lo, hi];
}

function eachMove(vs: Vehicle[], pos: number[], f: (v: number, to: number) => void) {
  const g = occupancy(vs, pos);
  for (let i = 0; i < vs.length; i++) {
    const [lo, hi] = rangeOf(vs, pos, i, g);
    for (let p = lo; p <= hi; p++) if (p !== pos[i]) f(i, p);
  }
}

const keyOf = (pos: number[]) => String.fromCharCode(...pos);
export const isWon = (pos: number[]) => pos[0] === WIN_POS;

/** Shortest solution from this position, or null if there is none. */
export function solve(vs: Vehicle[], start: number[]): Move[] | null {
  if (isWon(start)) return [];
  const seen = new Set([keyOf(start)]);
  const q: { pos: number[]; prev: number; v: number; to: number }[] = [{ pos: start, prev: -1, v: -1, to: -1 }];
  for (let h = 0; h < q.length; h++) {
    const cur = q[h];
    let won = -1;
    eachMove(vs, cur.pos, (v, to) => {
      if (won >= 0) return;
      const pos = cur.pos.slice(); pos[v] = to;
      const k = keyOf(pos);
      if (seen.has(k)) return;
      seen.add(k);
      q.push({ pos, prev: h, v, to });
      if (isWon(pos)) won = q.length - 1;
    });
    if (won >= 0) {
      const out: Move[] = [];
      for (let n = won; q[n].prev >= 0; n = q[n].prev) out.unshift({ v: q[n].v, to: q[n].to });
      return out;
    }
  }
  return null;
}

/** Every position reachable from `start`, with each one's exact distance to a win.
 *  Moves are reversible, so one BFS outward from all goals covers the component.
 *  Returns null if it has no goal or exceeds `cap` positions. */
export function analyse(vs: Vehicle[], start: number[], cap = Infinity): { pos: number[]; dist: number }[] | null {
  const index = new Map([[keyOf(start), 0]]);
  const states = [start], edges: number[][] = [];
  for (let h = 0; h < states.length; h++) {
    const out: number[] = [];
    eachMove(vs, states[h], (v, to) => {
      const pos = states[h].slice(); pos[v] = to;
      const k = keyOf(pos);
      let n = index.get(k);
      if (n === undefined) { n = states.length; index.set(k, n); states.push(pos); }
      out.push(n);
    });
    edges.push(out);
    if (states.length > cap) return null;
  }
  const dist = new Int32Array(states.length).fill(-1);
  const q: number[] = [];
  states.forEach((s, i) => { if (isWon(s)) { dist[i] = 0; q.push(i); } });
  if (!q.length) return null;
  for (let h = 0; h < q.length; h++) for (const n of edges[q[h]]) if (dist[n] < 0) { dist[n] = dist[q[h]] + 1; q.push(n); }
  return states.map((pos, i) => ({ pos, dist: dist[i] }));
}

/** Same puzzle = same set of reachable positions; a car parked somewhere irrelevant
 *  changes the board but not the puzzle. Keyed on the component, not the board. */
export function puzzleKey(vs: Vehicle[], states: { pos: number[] }[]): string {
  let k = '~';
  for (const s of states) {
    const b = toBoard(vs, s.pos).replace(/[B-Z]/g, 'x');
    if (b < k) k = b;
  }
  return `${k}:${states.length}`;
}

// ---------- a game in progress ----------
export class Game {
  vehicles: Vehicle[];
  pos: number[];
  history: Step[] = [];
  hinted = false;
  private start: number[];

  def: LevelDef;

  constructor(def: LevelDef) {
    this.def = def;
    const p = parseBoard(def.b);
    this.vehicles = p.vehicles;
    this.pos = p.pos;
    this.start = p.pos.slice();
  }

  get moves() { return this.history.length; }
  get won() { return isWon(this.pos); }
  range(i: number) { return rangeOf(this.vehicles, this.pos, i); }

  /** Slide vehicle v to `to`. Sliding the same vehicle again extends the same move,
   *  and sliding it back to where that move began takes the move back. */
  play(v: number, to: number): boolean {
    const [lo, hi] = this.range(v);
    if (to === this.pos[v] || to < lo || to > hi) return false;
    const last = this.history[this.history.length - 1];
    if (last?.v === v) {
      if (last.from === to) this.history.pop(); else last.to = to;
    } else this.history.push({ v, from: this.pos[v], to });
    this.pos[v] = to;
    return true;
  }

  undo(): boolean {
    const s = this.history.pop();
    if (!s) return false;
    this.pos[s.v] = s.from;
    return true;
  }

  reset() { this.pos = this.start.slice(); this.history = []; this.hinted = false; }
  hint(): Move | null { return solve(this.vehicles, this.pos)?.[0] ?? null; }
}

export function starsFor(moves: number, par: number, hinted: boolean): number {
  const earned = moves <= par ? 3 : moves <= par + Math.ceil(par / 2) ? 2 : 1;
  return hinted ? Math.min(earned, 2) : earned;
}

export const TIERS = [
  { name: 'Green Light', color: '#2f7d3a' },
  { name: 'Commuter', color: '#1f5fa8' },
  { name: 'Roadworks', color: '#a8560f' },
  { name: 'Standstill', color: '#8a2f6b' },
  { name: 'Total Gridlock', color: '#b3261e' },
];
export const LEVELS_PER_TIER = 30;
// Levels 1-150 are the original easy pack (now Warm-Up); the campaign is appended after them.
export const CAMPAIGN_START = 151;
export const isWarmup = (level: number) => level < CAMPAIGN_START;
export const displayOf = (level: number) => (isWarmup(level) ? level : level - CAMPAIGN_START + 1);
export const tierOf = (level: number) => Math.min(TIERS.length - 1, Math.floor((displayOf(level) - 1) / LEVELS_PER_TIER));
