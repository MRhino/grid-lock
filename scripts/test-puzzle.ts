// Checks every shipped level against a fresh solve, plus the move and save rules.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, parseBoard, solve, starsFor, tierOf, TIERS, LEVELS_PER_TIER, CAMPAIGN_START, isWarmup, isWon, type LevelDef } from '../src/puzzle.ts';

const store = new Map<string, string>();
(globalThis as any).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v), removeItem: (k: string) => store.delete(k) };
const { parse, load, save, record, unlocked, fresh, SCHEMA } = await import('../src/progress.ts');

const levels: LevelDef[] = JSON.parse(readFileSync('src/levels.json', 'utf8'));
assert.equal(levels.length, CAMPAIGN_START - 1 + TIERS.length * LEVELS_PER_TIER);
assert.equal(new Set(levels.map(l => l.b)).size, levels.length, 'levels are unique');

let slowest = 0;
const tiers = TIERS.map(t => ({ name: t.name, pars: [] as number[], vehicles: 0 }));
levels.forEach((l, i) => {
  const { vehicles, pos } = parseBoard(l.b);
  const t0 = performance.now();
  const route = solve(vehicles, pos);
  slowest = Math.max(slowest, performance.now() - t0);
  assert.ok(route, `level ${i + 1} solvable`);
  assert.equal(route.length, l.p, `level ${i + 1} par`);
  assert.ok(!isWon(pos), `level ${i + 1} not already won`);
  if (i && i + 1 !== CAMPAIGN_START) assert.ok(l.p >= levels[i - 1].p, `level ${i + 1} no easier than the last`);
  const g = new Game(l);
  for (const m of route) assert.ok(g.play(m.v, m.to), `level ${i + 1} route is legal`);
  assert.ok(g.won);
  assert.equal(g.moves, l.p);
  assert.equal(starsFor(g.moves, l.p, false), 3);
  if (isWarmup(i + 1)) return;
  assert.ok(vehicles.length >= 10, `level ${i + 1} is dense`);
  tiers[tierOf(i + 1)].pars.push(l.p);
  tiers[tierOf(i + 1)].vehicles += vehicles.length;
});

// Moves: re-sliding merges, sliding back cancels, blocked slides are refused.
const g = new Game({ b: 'oooooooooooo' + 'AAooBo' + 'ooooBo' + 'oooooooooooo', p: 0 });
assert.equal(g.play(1, 0), true);
assert.equal(g.moves, 1);
assert.equal(g.play(1, 3), true);
assert.equal(g.moves, 1, 'same vehicle extends the move');
assert.equal(g.play(1, 2), true);
assert.equal(g.moves, 0, 'back to the start cancels the move');
assert.equal(g.play(1, 9), false);
g.play(0, 2); assert.equal(g.undo(), true); assert.equal(g.pos[0], 0);
assert.equal(starsFor(5, 5, true), 2); assert.equal(starsFor(8, 5, false), 2); assert.equal(starsFor(9, 5, false), 1);

// Saves: bad data is filtered, a corrupt main save falls back, bests never regress.
assert.deepEqual(parse('{"best":{"3":{"moves":4,"stars":9},"x":{"moves":1,"stars":1},"4":{"moves":"a","stars":1}}}')?.best, { 3: { moves: 4, stars: 3 } });
assert.equal(parse('nope'), null);
const s = fresh(); record(s, 2, 9, 2); record(s, 2, 12, 3);
assert.deepEqual(s.best[2], { moves: 9, stars: 3 });
assert.equal(unlocked(s, 150), 3);
assert.equal(unlocked(s, 300, CAMPAIGN_START), CAMPAIGN_START);
store.set('gl-save-v1', '{broken');
assert.deepEqual(load().best[2], { moves: 9, stars: 3 });
save(fresh()); assert.equal(JSON.parse(store.get('gl-save-v1')!).schema, SCHEMA);

// Cloud: merging is lossless both ways; IDs read back however they're typed.
const { mergeSaves, normalizeId, formatId } = await import('../src/saveid.ts');
const m1 = mergeSaves({ schema: 1, best: { 1: { moves: 5, stars: 2 }, 2: { moves: 9, stars: 3 } } }, { schema: 1, best: { 1: { moves: 7, stars: 3 }, 3: { moves: 4, stars: 1 } } });
assert.deepEqual(m1.best, { 1: { moves: 5, stars: 3 }, 2: { moves: 9, stars: 3 }, 3: { moves: 4, stars: 1 } });
assert.deepEqual(mergeSaves({}, { best: { bad: 1 } }).best, {});
const sid = '0123456789ABCDEF';
assert.equal(normalizeId(formatId(sid).toLowerCase()), sid);
assert.equal(normalizeId('short'), null);

for (const t of tiers) console.log(`${t.name.padEnd(15)} par ${t.pars[0]}-${t.pars[t.pars.length - 1]}, avg ${(t.vehicles / t.pars.length).toFixed(1)} vehicles`);
console.log(`all ${levels.length} levels verified; slowest solve ${slowest.toFixed(0)}ms`);
