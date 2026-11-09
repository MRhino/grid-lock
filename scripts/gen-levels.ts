// Builds src/levels.json: sample random traffic, map every position reachable from
// it, and keep the hardest one, so each level is solvable with an exact par.
// The pack is append-only once shipped: saved progress is keyed by level number.
import { readFileSync, writeFileSync } from 'node:fs';
import { SIZE, EXIT_ROW, HERO, TIERS, LEVELS_PER_TIER, CAMPAIGN_START, analyse, toBoard, type Vehicle, type LevelDef } from '../src/puzzle.ts';

const TOTAL = TIERS.length * LEVELS_PER_TIER;
const seconds = Number(process.argv[2] ?? 120);
const MIN_PAR = 12, MAX_PAR = Number(process.argv[3] ?? 39);
const MIN_VEHICLES = 10;
const SPARE = 4; // extra boards kept per par, so a thin par can borrow from its neighbours
const shipped: LevelDef[] = JSON.parse(readFileSync('src/levels.json', 'utf8')).slice(0, CAMPAIGN_START - 1); // never altered

// The one difficulty scalar: target par by level.
const parFor = (level: number) => Math.round(MIN_PAR + (MAX_PAR - MIN_PAR) * ((level - 1) / (TOTAL - 1)));

function mulberry32(a: number) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261110);
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
  fill({ vs: [{ id: HERO, len: 2, horiz: true, line: EXIT_ROW }], pos: [int(4)] }, MIN_VEHICLES + int(5));

/** Pull one or two vehicles out of the hardest position and drop new ones in. */
function mutate(t: Traffic): Traffic {
  const vs = t.vs.map(v => ({ ...v })), pos = t.pos.slice();
  for (let n = 1 + int(2); n > 0 && vs.length > 1; n--) {
    const i = 1 + int(vs.length - 1);
    vs.splice(i, 1); pos.splice(i, 1);
  }
  return fill({ vs, pos }, Math.max(MIN_VEHICLES, Math.min(14, t.vs.length + int(3) - 1)));
}

// Levels wanted per par value, filled from whatever the sampler turns up.
const wanted = new Map<number, number>();
for (let l = 1; l <= TOTAL; l++) wanted.set(parFor(l), (wanted.get(parFor(l)) ?? 0) + 1);
const pool = new Map<number, string[]>();
const seen = new Set<string>(shipped.map(l => l.b));
const elites: { t: Traffic; dist: number }[] = [];
const missing = () => [...wanted].reduce((n, [p, w]) => n + Math.max(0, w - (pool.get(p)?.length ?? 0)), 0);

const t0 = Date.now();
let samples = 0;
function evaluate(t: Traffic): { t: Traffic; dist: number } | null {
  samples++;
  if (t.vs.length < MIN_VEHICLES) return null;
  const all = analyse(t.vs, t.pos, 60_000);
  if (!all) return null;
  let top = all[0];
  for (const s of all) if (s.dist > top.dist) top = s;
  const room = (wanted.has(top.dist) ? wanted.get(top.dist)! + SPARE : 0) - (pool.get(top.dist)?.length ?? 0);
  const b = toBoard(t.vs, top.pos);
  if (room > 0 && !seen.has(b)) {
    seen.add(b);
    (pool.get(top.dist) ?? pool.set(top.dist, []).get(top.dist)!).push(b);
  }
  return { t: { vs: t.vs, pos: top.pos }, dist: top.dist };
}

while (missing() > 0 && Date.now() - t0 < seconds * 1000) {
  // Mostly keep climbing from the hardest layouts so far; hard boards are too rare to stumble on.
  let cur = elites.length && rnd() < 0.8 ? elites[int(elites.length)] : evaluate(randomTraffic());
  if (!cur) continue;
  for (let stale = 0; stale < 60 && missing() > 0; stale++) {
    const next = evaluate(mutate(cur.t));
    if (next && next.dist >= cur.dist) { if (next.dist > cur.dist) stale = 0; cur = next; }
  }
  elites.push(cur);
  elites.sort((a, b) => b.dist - a.dist);
  elites.length = Math.min(elites.length, 25);
}

console.log(`${samples} samples in ${((Date.now() - t0) / 1000).toFixed(0)}s, ${missing()} exact slots short`);
const levels: LevelDef[] = [];
for (let l = 1; l <= TOTAL; l++) {
  const target = parFor(l);
  const par = [...pool.keys()].filter(p => pool.get(p)!.length).sort((x, y) => Math.abs(x - target) - Math.abs(y - target) || x - y)[0];
  if (par === undefined) { console.log('pool ran out; nothing written'); process.exit(1); }
  levels.push({ b: pool.get(par)!.shift()!, p: par });
}
levels.sort((x, y) => x.p - y.p);
levels.unshift(...shipped);
writeFileSync('src/levels.json', JSON.stringify(levels).replace(/\},/g, '},\n') + '\n');
console.log(`wrote ${levels.length} levels, new campaign par ${MIN_PAR} to ${MAX_PAR}`);
