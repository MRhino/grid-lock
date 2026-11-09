// Builds src/levels.json: sample random traffic, map every position reachable from
// it, and keep the hardest one, so each level is solvable with an exact par.
// The pack is append-only once shipped: saved progress is keyed by level number.
import { writeFileSync } from 'node:fs';
import { SIZE, EXIT_ROW, HERO, TIERS, LEVELS_PER_TIER, analyse, toBoard, type Vehicle, type LevelDef } from '../src/puzzle.ts';

const TOTAL = TIERS.length * LEVELS_PER_TIER;
const seconds = Number(process.argv[2] ?? 120);
const MAX_PAR = Number(process.argv[3] ?? 32);

// The one difficulty scalar: target par by level.
const parFor = (level: number) => Math.round(3 + (MAX_PAR - 3) * Math.pow((level - 1) / (TOTAL - 1), 1.15));

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261109);
const int = (n: number) => Math.floor(rnd() * n);

type Traffic = { vs: Vehicle[]; pos: number[] };

function fill(t: Traffic, want: number): Traffic {
  const g = new Uint8Array(SIZE * SIZE);
  const cells = (horiz: boolean, line: number, p: number, len: number) =>
    Array.from({ length: len }, (_, k) => (horiz ? line * SIZE + p + k : (p + k) * SIZE + line));
  t.vs.forEach((v, i) => cells(v.horiz, v.line, t.pos[i], v.len).forEach(c => (g[c] = 1)));
  let trucks = t.vs.filter(v => v.len === 3).length;
  for (let tries = 0; tries < 300 && t.vs.length < want; tries++) {
    const len = trucks < 4 && rnd() < 0.3 ? 3 : 2, horiz = rnd() < 0.5, line = int(SIZE), p = int(SIZE - len + 1);
    if (horiz && line === EXIT_ROW) continue; // would block the exit lane forever
    const c = cells(horiz, line, p, len);
    if (c.some(x => g[x])) continue;
    c.forEach(x => (g[x] = 1));
    if (len === 3) trucks++;
    t.vs.push({ id: '', len, horiz, line });
    t.pos.push(p);
  }
  t.vs.forEach((v, i) => (v.id = i ? String.fromCharCode(65 + i) : HERO));
  return t;
}

const randomTraffic = () =>
  fill({ vs: [{ id: HERO, len: 2, horiz: true, line: EXIT_ROW }], pos: [int(4)] }, 6 + int(8));

/** Pull one or two vehicles out of the hardest position and drop new ones in. */
function mutate(t: Traffic): Traffic {
  const vs = t.vs.map(v => ({ ...v })), pos = t.pos.slice();
  for (let n = 1 + int(2); n > 0 && vs.length > 1; n--) {
    const i = 1 + int(vs.length - 1);
    vs.splice(i, 1); pos.splice(i, 1);
  }
  return fill({ vs, pos }, Math.min(14, t.vs.length + int(3) - 1));
}

// Levels wanted per par value, filled from whatever the sampler turns up.
const wanted = new Map<number, number>();
for (let l = 1; l <= TOTAL; l++) wanted.set(parFor(l), (wanted.get(parFor(l)) ?? 0) + 1);
const pool = new Map<number, string[]>();
const seen = new Set<string>();
const missing = () => [...wanted].reduce((n, [p, w]) => n + Math.max(0, w - (pool.get(p)?.length ?? 0)), 0);

const t0 = Date.now();
let samples = 0;
function evaluate(t: Traffic): { t: Traffic; dist: number } | null {
  samples++;
  const all = analyse(t.vs, t.pos, 60_000);
  if (!all) return null;
  let top = all[0];
  for (const s of all) if (s.dist > top.dist) top = s;
  const room = (wanted.get(top.dist) ?? 0) - (pool.get(top.dist)?.length ?? 0);
  const b = toBoard(t.vs, top.pos);
  if (room > 0 && !seen.has(b)) {
    seen.add(b);
    (pool.get(top.dist) ?? pool.set(top.dist, []).get(top.dist)!).push(b);
  }
  return { t: { vs: t.vs, pos: top.pos }, dist: top.dist };
}

while (missing() > 0 && Date.now() - t0 < seconds * 1000) {
  let cur = evaluate(randomTraffic());
  if (!cur) continue;
  for (let stale = 0; stale < 60 && missing() > 0; stale++) {
    const next = evaluate(mutate(cur.t));
    if (next && next.dist >= cur.dist) { if (next.dist > cur.dist) stale = 0; cur = next; }
  }
}

console.log(`${samples} samples in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${missing()} levels missing`);
if (missing() > 0) {
  console.log('short at par:', [...wanted].filter(([p, w]) => (pool.get(p)?.length ?? 0) < w).map(([p, w]) => `${p}(${pool.get(p)?.length ?? 0}/${w})`).join(' '));
  process.exit(1);
}
const levels: LevelDef[] = [];
for (let l = 1; l <= TOTAL; l++) levels.push({ b: pool.get(parFor(l))!.shift()!, p: parFor(l) });
writeFileSync('src/levels.json', JSON.stringify(levels).replace(/\},/g, '},\n') + '\n');
console.log(`wrote ${levels.length} levels, par ${levels[0].p} to ${levels[levels.length - 1].p}`);
