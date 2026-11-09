import { registerSW } from 'virtual:pwa-register';
import './style.css';
import raw from './levels.json';
import { Game, HERO, SIZE, TIERS, LEVELS_PER_TIER, starsFor, tierOf, type LevelDef } from './puzzle';
import { sfx, unlock, isMuted, setMuted } from './audio';
import { load, save, fresh, record, unlocked, totalStars, saveRun, loadRun, clearRun, requestPersist, type Save } from './progress';

declare const __APP_VERSION__: string, __COMMIT__: string;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const LEVELS = raw as LevelDef[];
const params = new URLSearchParams(location.search);
const debugShot = params.has('shot');

// ---------- app state ----------
type Mode = 'menu' | 'levels' | 'play' | 'result';
let mode: Mode = 'menu';
let progress: Save = load();
let game: Game | null = null;
let level = 1;
let pieces: HTMLElement[] = [];
let cell = 56;
let escaping = false;

function show(m: Mode) {
  mode = m;
  $('menu').classList.toggle('hidden', m !== 'menu');
  $('levels').classList.toggle('hidden', m !== 'levels');
  $('play').classList.toggle('hidden', m !== 'play' && m !== 'result');
  $('result').classList.toggle('hidden', m !== 'result');
  if (m !== 'play' && reloadPending) location.reload();
}

// ---------- service worker ----------
// A new SW must never reload the page mid-puzzle.
let reloadPending = false;
const updateSW = registerSW({
  immediate: true,
  onNeedReload() {
    if (mode === 'play') reloadPending = true;
    else location.reload();
  },
});
$('refresh').addEventListener('click', async () => {
  $('refresh').textContent = 'Checking…';
  const reg = await navigator.serviceWorker?.getRegistration();
  await reg?.update();
  if (reg?.waiting) await updateSW(true);
  setTimeout(() => location.reload(), 1500);
});
$('version-text').textContent = `v${__APP_VERSION__.split('.').slice(0, 2).join('.')} · ${__COMMIT__}`;

// ---------- board ----------
function layout() {
  const w = $('wrap');
  if (!w.clientHeight) return;
  cell = Math.min(100, Math.floor(Math.min((w.clientWidth - 40) / SIZE, (w.clientHeight - 16) / SIZE)));
  document.documentElement.style.setProperty('--c', `${cell}px`);
  if (game) game.vehicles.forEach((v, i) => {
    pieces[i].style.width = `${(v.horiz ? v.len : 1) * cell}px`;
    pieces[i].style.height = `${(v.horiz ? 1 : v.len) * cell}px`;
    place(i, game!.pos[i]);
  });
}
addEventListener('resize', layout);

function place(i: number, p: number) {
  const v = game!.vehicles[i];
  const a = p * cell, b = v.line * cell;
  pieces[i].style.transform = v.horiz ? `translate(${a}px,${b}px)` : `translate(${b}px,${a}px)`;
}

function buildPieces() {
  pieces.forEach(p => p.remove());
  pieces = game!.vehicles.map((v, i) => {
    const el = document.createElement('div');
    const flip = v.id !== HERO && v.id.charCodeAt(0) % 2 === 0;
    el.className = `piece ${v.horiz ? 'h' : 'v'}${v.len === 3 ? ' truck' : ''}${v.id === HERO ? ' hero' : ''}${flip ? ' flip' : ''}`;
    // Traffic stays out of the oranges and yellows so gold only ever means the getaway car.
    const hue = (i * 47 + 175) % 360;
    el.style.setProperty('--h', String(hue >= 20 && hue <= 85 ? hue + 170 : hue));
    el.innerHTML = `<div class="car"><i class="glass"></i><i class="tail"></i><i class="lamp a"></i><i class="lamp b"></i>${v.id === HERO ? '<b class="star">★</b>' : ''}</div>`;
    el.addEventListener('pointerdown', e => grab(e, i));
    $('board').appendChild(el);
    return el;
  });
}

function clearHint() {
  pieces.forEach(p => p.classList.remove('hint'));
  $('ghost').style.display = 'none';
}

function refresh() {
  if (!game) return;
  $('moves').textContent = String(game.moves);
  $<HTMLButtonElement>('undo').disabled = !game.moves;
  $<HTMLButtonElement>('again').disabled = !game.moves;
  if (!debugShot) saveRun(level, game.history, game.hinted);
}

// ---------- input ----------
let drag: { i: number; id: number; from: number; p0: number; lo: number; hi: number } | null = null;

function grab(e: PointerEvent, i: number) {
  if (!game || drag || escaping || mode !== 'play') return;
  const v = game.vehicles[i];
  const [lo, hi] = game.range(i);
  drag = { i, id: e.pointerId, from: game.pos[i], p0: v.horiz ? e.clientX : e.clientY, lo, hi };
  pieces[i].setPointerCapture(e.pointerId);
  pieces[i].classList.add('drag');
  clearHint();
  sfx.grab();
  const move = (ev: PointerEvent) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const d = ((v.horiz ? ev.clientX : ev.clientY) - drag.p0) / cell;
    place(i, Math.max(drag.lo, Math.min(drag.hi, drag.from + d)));
  };
  const end = (ev: PointerEvent) => {
    if (!drag || ev.pointerId !== drag.id || !game) return;
    const d = ev.type === 'pointerup' ? ((v.horiz ? ev.clientX : ev.clientY) - drag.p0) / cell : 0;
    const to = Math.round(Math.max(drag.lo, Math.min(drag.hi, drag.from + d)));
    drag = null;
    const el = pieces[i];
    el.classList.remove('drag');
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', end);
    el.removeEventListener('pointercancel', end);
    if (game.play(i, to)) { sfx.slide(); refresh(); }
    place(i, game.pos[i]);
    if (game.won) win();
  };
  pieces[i].addEventListener('pointermove', move);
  pieces[i].addEventListener('pointerup', end);
  pieces[i].addEventListener('pointercancel', end);
}

$('undo').addEventListener('click', () => {
  if (!game || escaping || drag || !game.undo()) return;
  sfx.undo(); clearHint();
  game.vehicles.forEach((_, i) => place(i, game!.pos[i]));
  refresh();
});
$('again').addEventListener('click', () => {
  if (!game || escaping || drag || !game.moves) return;
  sfx.undo(); clearHint();
  game.reset();
  game.vehicles.forEach((_, i) => place(i, game!.pos[i]));
  refresh();
});
$('hint').addEventListener('click', () => {
  if (!game || escaping || drag) return;
  const m = game.hint();
  if (!m) return;
  game.hinted = true;
  refresh();
  sfx.hint(); clearHint();
  pieces[m.v].classList.add('hint');
  const v = game.vehicles[m.v], g = $('ghost');
  g.style.width = `${(v.horiz ? v.len : 1) * cell}px`;
  g.style.height = `${(v.horiz ? 1 : v.len) * cell}px`;
  g.style.transform = v.horiz ? `translate(${m.to * cell}px,${v.line * cell}px)` : `translate(${v.line * cell}px,${m.to * cell}px)`;
  g.style.display = 'block';
});

// ---------- levels ----------
function start(n: number, resume = false) {
  level = n;
  game = new Game(LEVELS[n - 1]);
  escaping = false;
  drag = null; // a piece removed mid-drag never gets its pointerup
  if (resume) {
    const run = loadRun();
    if (run?.level === n) {
      const ok = run.history.every(s => s && game!.pos[s.v] === s.from && game!.play(s.v, s.to));
      if (ok && !game.won) game.hinted = !!run.hinted;
      else game = new Game(LEVELS[n - 1]); // doesn't fit this build: drop only the run
    }
  }
  show('play');
  const t = TIERS[tierOf(n)];
  $('tier').textContent = t.name.toUpperCase();
  document.documentElement.style.setProperty('--tier', String(t.hue));
  $('level').textContent = String(n);
  $('par').textContent = String(game.def.p);
  clearHint();
  buildPieces();
  layout();
  refresh();
}

function win() {
  if (!game || escaping) return;
  escaping = true;
  clearHint();
  const stars = starsFor(game.moves, game.def.p, game.hinted);
  const { moves, hinted } = game;
  const before = progress.best[level];
  if (!debugShot) { record(progress, level, moves, stars); clearRun(); }
  sfx.escape(); sfx.clear();
  pieces[0].classList.add('out');
  place(0, SIZE + 2);
  setTimeout(() => {
    $('r-stars').innerHTML = [1, 2, 3].map(i => (i <= stars ? '<b>★</b>' : '★')).join('');
    const par = game!.def.p;
    const note = moves <= par ? 'Perfect route!' : hinted && stars === 2 ? 'Hints cap this at 2 stars.' : `${moves - par} over par.`;
    const pb = before && moves < before.moves ? ' New best!' : '';
    $('r-text').textContent = `${moves} moves · par ${par}. ${note}${pb}`;
    $('r-next').textContent = level < LEVELS.length ? 'NEXT' : 'ALL CLEAR';
    $('burst').innerHTML = Array.from({ length: 36 }, (_, i) => {
      const a = (i / 36) * Math.PI * 2, r = 130 + (i % 5) * 45;
      return `<i style="--x:${Math.cos(a) * r}px;--y:${Math.sin(a) * r}px;background:hsl(${i * 37} 100% 60%)"></i>`;
    }).join('');
    show('result');
  }, 620);
}

function openMenu() {
  const solved = Object.keys(progress.best).length;
  $('stats').textContent = solved ? `${solved} / ${LEVELS.length} cleared · ${totalStars(progress)} ★` : '';
  const run = loadRun();
  $('go').textContent = run && run.history.length ? `CONTINUE ${run.level}` : solved ? `PLAY ${unlocked(progress, LEVELS.length)}` : 'PLAY';
  wipeArmed = false;
  $('wipe').textContent = 'Reset progress';
  $('sound').textContent = isMuted() ? '🔇 Sound off' : '🔊 Sound on';
  show('menu');
}

function openLevels() {
  const open = unlocked(progress, LEVELS.length);
  const box = $('tiers');
  box.textContent = '';
  TIERS.forEach((t, ti) => {
    const name = document.createElement('div');
    name.className = 'tier-name'; name.textContent = t.name;
    name.style.setProperty('--tier', String(t.hue));
    const grid = document.createElement('div');
    grid.className = 'grid'; grid.style.setProperty('--tier', String(t.hue));
    for (let n = ti * LEVELS_PER_TIER + 1; n <= (ti + 1) * LEVELS_PER_TIER; n++) {
      const b = document.createElement('button');
      b.className = 'cell';
      b.disabled = n > open;
      const stars = progress.best[n]?.stars ?? 0;
      b.innerHTML = `${n}<small>${'★'.repeat(stars)}</small>`;
      b.addEventListener('click', () => { sfx.tap(); start(n, true); });
      grid.appendChild(b);
    }
    box.append(name, grid);
  });
  $('levels-stars').textContent = `${totalStars(progress)} ★`;
  show('levels');
}

// ---------- buttons ----------
let wipeArmed = false;
$('go').addEventListener('click', () => {
  sfx.tap();
  const run = loadRun();
  if (run && run.history.length && run.level >= 1 && run.level <= LEVELS.length) start(run.level, true);
  else start(unlocked(progress, LEVELS.length));
});
$('open-levels').addEventListener('click', () => { sfx.tap(); openLevels(); });
$('levels-back').addEventListener('click', () => { sfx.tap(); openMenu(); });
$('back').addEventListener('click', () => { sfx.tap(); if (!escaping) openLevels(); });
$('r-next').addEventListener('click', () => { sfx.tap(); level < LEVELS.length ? start(level + 1) : openLevels(); });
$('r-again').addEventListener('click', () => { sfx.tap(); start(level); });
$('r-levels').addEventListener('click', () => { sfx.tap(); openLevels(); });
$('sound').addEventListener('click', () => { setMuted(!isMuted()); sfx.tap(); $('sound').textContent = isMuted() ? '🔇 Sound off' : '🔊 Sound on'; });
$('wipe').addEventListener('click', () => {
  if (!wipeArmed) { wipeArmed = true; $('wipe').textContent = 'Tap again to erase'; return; }
  progress = fresh(); save(progress); clearRun();
  openMenu();
});
addEventListener('pointerdown', unlock);
requestPersist();

// ?shot=LEVEL&solve=N starts a level and plays N solution moves (never saved).
if (debugShot) {
  start(Math.max(1, Math.min(LEVELS.length, Number(params.get('shot')) || 1)));
  for (let k = Number(params.get('solve')) || 0; k > 0 && !game!.won; k--) { const m = game!.hint(); if (m) game!.play(m.v, m.to); }
  game!.vehicles.forEach((_, i) => place(i, game!.pos[i]));
  refresh();
  if (game!.won) win();
} else openMenu();
