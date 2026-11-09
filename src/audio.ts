// Tiny WebAudio synth. iOS only allows audio after a user gesture, so
// unlock() runs on the first pointerdown; resume() again after the app returns.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = localStorage.getItem('gl-muted') === '1';

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state !== 'running') void ctx.resume();
}

export function isMuted() { return muted; }
export function setMuted(m: boolean) {
  muted = m;
  localStorage.setItem('gl-muted', m ? '1' : '0');
  if (master) master.gain.value = m ? 0 : 0.5;
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && ctx && ctx.state !== 'running') void ctx.resume();
});

function tone(freq: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

export const sfx = {
  grab() { tone(320, 0.05, 'triangle', 0.08, 1.3); },
  slide() { tone(170, 0.1, 'square', 0.05, 0.75); },
  undo() { tone(520, 0.09, 'triangle', 0.09, 0.6); },
  hint() { [0, 7].forEach((s, i) => tone(880 * Math.pow(2, s / 12), 0.14, 'sine', 0.1, 1, i * 0.08)); },
  escape() { tone(160, 0.55, 'sawtooth', 0.09, 5); },
  clear() { [0, 4, 7, 12, 16, 19, 24].forEach((s, i) => tone(523 * Math.pow(2, s / 12), 0.3, 'triangle', 0.14, 1, 0.3 + i * 0.07)); },
  tap() { tone(700, 0.05, 'sine', 0.08); },
};
