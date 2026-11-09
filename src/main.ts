import { registerSW } from 'virtual:pwa-register';
import '@fontsource/bowlby-one/latin-400.css';
import '@fontsource/barlow-semi-condensed/latin-600.css';
import '@fontsource/barlow-semi-condensed/latin-700.css';
import './style.css';
import { vehicleSvg, CAB, TRAFFIC } from './toys';
import raw from './levels.json';
import { Game, HERO, SIZE, WIN_POS, TIERS, LEVELS_PER_TIER, CAMPAIGN_START, isWarmup, displayOf, starsFor, tierOf, type LevelDef } from './puzzle';
import { sfx, unlock, isMuted, setMuted } from './audio';
import { cloudId, newCloudId, displayId, lastSynced, backup, restore } from './cloud';
import { load, save, fresh, record, unlocked, totalStars, saveRun, loadRun, clearRun, requestPersist, type Save } from './progress';

declare const __APP_VERSION__: string, __COMMIT__: string;
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const LEVELS = raw as LevelDef[];
const WARMUP = { name: 'Warm-Up', color: '#4a5a63' };
const STAR = '<svg class="i"><use href="#i-star"/></svg>';
const campaignOpen = () => unlocked(progress, LEVELS.length, CAMPAIGN_START);
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
  cell = Math.min(100, Math.floor(Math.min((w.clientWidth - 64) / SIZE, (w.clientHeight - 40) / SIZE)));
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
    el.style.setProperty('--len', String(v.len));
    el.innerHTML = `<div class="car">${vehicleSvg(v.len, v.id === HERO ? CAB : TRAFFIC[i % TRAFFIC.length], v.id === HERO)}</div>`;
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
const GATE_PULL = 0.2; // cells short of the gate that already count as through it
const FLICK_MS = 120; // how far a release coasts, as this many ms at release speed
const FLICK_STALE_MS = 80; // a finger held still this long before lifting isn't a flick
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
  let at = drag.from, vel = 0, lastT = e.timeStamp;
  const finish = (to: number) => {
    if (!game) return;
    drag = null;
    const el = pieces[i];
    el.classList.remove('drag');
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', end);
    el.removeEventListener('pointercancel', end);
    if (game.play(i, to)) { sfx.slide(); refresh(); }
    place(i, game.pos[i]);
    el.classList.remove('clack'); void el.offsetWidth; el.classList.add('clack');
    if (game.won) win();
  };
  const move = (ev: PointerEvent) => {
    if (!drag || ev.pointerId !== drag.id) return;
    const d = ((v.horiz ? ev.clientX : ev.clientY) - drag.p0) / cell;
    const p = Math.max(drag.lo, Math.min(drag.hi, drag.from + d));
    const dt = ev.timeStamp - lastT;
    if (dt > 0) { vel = vel * 0.4 + ((p - at) / dt) * 0.6; lastT = ev.timeStamp; }
    at = p;
    place(i, p);
    // Reaching the open gate wins mid-drag, so the car carries on out under the finger.
    if (i === 0 && drag.hi === WIN_POS && p >= WIN_POS - GATE_PULL) finish(WIN_POS);
  };
  const end = (ev: PointerEvent) => {
    if (!drag || ev.pointerId !== drag.id) return;
    if (ev.type !== 'pointerup') return finish(drag.from);
    const coast = ev.timeStamp - lastT < FLICK_STALE_MS ? vel * FLICK_MS : 0;
    finish(Math.round(Math.max(drag.lo, Math.min(drag.hi, at + coast))));
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
  const t = isWarmup(n) ? WARMUP : TIERS[tierOf(n)];
  $('tier').textContent = t.name.toUpperCase();
  document.documentElement.style.setProperty('--tier', t.color);
  $('level').textContent = String(displayOf(n));
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
  if (!debugShot) { record(progress, level, moves, stars); clearRun(); void sync(); }
  sfx.escape(); sfx.clear();
  pieces[0].classList.add('out');
  place(0, SIZE + 2);
  setTimeout(() => {
    $('r-stars').innerHTML = [1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="--n:${i}"><svg class="i"><use href="#i-badge"/></svg></span>`).join('');
    $('r-road').querySelector('i')!.innerHTML = vehicleSvg(2, CAB, true);
    const par = game!.def.p;
    const note = moves <= par ? 'Perfect route!' : hinted && stars === 2 ? 'Hints cap this at 2 stars.' : `${moves - par} over par.`;
    const pb = before && moves < before.moves ? ' New best!' : '';
    $('r-text').textContent = `${moves} moves · par ${par}. ${note}${pb}`;
    $('r-next').textContent = level < LEVELS.length ? 'NEXT' : 'ALL CLEAR';
    show('result');
  }, 620);
}

// ---------- cloud save ----------
let syncState: 'idle' | 'syncing' = 'idle';
function renderCloud() {
  $('cloud-id').textContent = displayId();
  const t = lastSynced();
  $('cloud-status').textContent = syncState === 'syncing' ? 'Backing up…'
    : t ? `Backed up ${new Date(t).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`
    : Object.keys(progress.best).length ? 'Not backed up yet (needs a connection)' : 'Backs up after your first clear';
}
/** Once on launch and after each clear, never per move. */
async function sync() {
  if (debugShot) return;
  syncState = 'syncing'; if (mode === 'menu') renderCloud();
  const merged = await backup();
  syncState = 'idle';
  if (merged) progress = merged; // the cloud had clears this device didn't
  if (mode === 'menu') openMenu();
  else if (mode === 'levels' && merged) openLevels();
}

function openMenu() {
  const solved = Object.keys(progress.best).filter(k => !isWarmup(Number(k))).length;
  $('stats').textContent = totalStars(progress) ? `${solved} / ${LEVELS.length - CAMPAIGN_START + 1} cleared · ${totalStars(progress)} stars` : '';
  const run = loadRun();
  $('go').textContent = run && run.history.length ? `CONTINUE ${displayOf(run.level)}` : solved ? `PLAY ${displayOf(campaignOpen())}` : 'PLAY';
  wipeArmed = false;
  $('wipe').textContent = 'Reset progress';
  $('sound').textContent = isMuted() ? 'Sound off' : 'Sound on';
  renderCloud();
  show('menu');
}

function openLevels() {
  const open = campaignOpen();
  const box = $('tiers');
  box.textContent = '';
  const section = (t: { name: string; color: string }, from: number, to: number) => {
    const name = document.createElement('div');
    name.className = 'tier-name'; name.textContent = t.name;
    name.style.setProperty('--tier', t.color);
    const grid = document.createElement('div');
    grid.className = 'grid'; grid.style.setProperty('--tier', t.color);
    for (let n = from; n <= to; n++) {
      const b = document.createElement('button');
      b.className = 'cell';
      b.disabled = n > open; // Warm-Up is always open
      const stars = progress.best[n]?.stars ?? 0;
      b.innerHTML = `${displayOf(n)}<small>${STAR.repeat(stars)}</small>`;
      b.addEventListener('click', () => { sfx.tap(); start(n, true); });
      grid.appendChild(b);
    }
    box.append(name, grid);
  };
  TIERS.forEach((t, ti) => section(t, CAMPAIGN_START + ti * LEVELS_PER_TIER, CAMPAIGN_START + (ti + 1) * LEVELS_PER_TIER - 1));
  section(WARMUP, 1, CAMPAIGN_START - 1);
  $('levels-stars').innerHTML = `${totalStars(progress)} ${STAR}`;
  show('levels');
}

// ---------- buttons ----------
let wipeArmed = false;
$('go').addEventListener('click', () => {
  sfx.tap();
  const run = loadRun();
  if (run && run.history.length && run.level >= 1 && run.level <= LEVELS.length) start(run.level, true);
  else start(campaignOpen());
});
$('open-levels').addEventListener('click', () => { sfx.tap(); openLevels(); });
$('levels-back').addEventListener('click', () => { sfx.tap(); openMenu(); });
$('back').addEventListener('click', () => { sfx.tap(); if (!escaping) openLevels(); });
$('r-next').addEventListener('click', () => { sfx.tap(); level < LEVELS.length ? start(level + 1) : openLevels(); });
$('r-again').addEventListener('click', () => { sfx.tap(); start(level); });
$('r-levels').addEventListener('click', () => { sfx.tap(); openLevels(); });
$('sound').addEventListener('click', () => { setMuted(!isMuted()); sfx.tap(); $('sound').textContent = isMuted() ? 'Sound off' : 'Sound on'; });
$('wipe').addEventListener('click', () => {
  if (!wipeArmed) { wipeArmed = true; $('wipe').textContent = 'Tap again to erase'; return; }
  // A new ID, or the next sync would merge the old clears straight back in.
  newCloudId();
  progress = fresh(); save(progress); clearRun();
  openMenu();
});
$('cloud-copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(displayId()); $('cloud-copy').textContent = 'Copied'; }
  catch { $('cloud-copy').textContent = 'Select & copy'; }
  setTimeout(() => ($('cloud-copy').textContent = 'Copy'), 1800);
});
$('cloud-restore').addEventListener('click', async () => {
  const input = prompt('Enter the save ID from your other device:');
  if (!input) return;
  $('cloud-status').textContent = 'Restoring…';
  const r = await restore(input);
  if (!r.ok) { alert(r.reason); renderCloud(); return; }
  progress = load();
  openMenu();
});
addEventListener('pointerdown', unlock);
requestPersist();
$('parade').innerHTML = [TRAFFIC[1], CAB, TRAFFIC[0], TRAFFIC[4]].map((c, i) =>
  `<i style="--i:${i};--len:${i === 2 ? 3 : 2}">${vehicleSvg(i === 2 ? 3 : 2, c, c === CAB)}</i>`).join('');

// ?shot=LEVEL&solve=N starts a level and plays N solution moves (never saved).
if (debugShot) {
  start(Math.max(1, Math.min(LEVELS.length, Number(params.get('shot')) || 1)));
  for (let k = Number(params.get('solve')) || 0; k > 0 && !game!.won; k--) { const m = game!.hint(); if (m) game!.play(m.v, m.to); }
  game!.vehicles.forEach((_, i) => place(i, game!.pos[i]));
  refresh();
  if (game!.won) win();
} else { cloudId(); openMenu(); void sync(); }
