// The printed-tin vehicles. Drawn facing right; CSS rotates them into their lane.
export interface Tin { body: string; shade: string; light: string }

export const CAB: Tin = { body: '#f7bd12', shade: '#c98a00', light: '#ffd95a' };
// Traffic stays clear of yellow so the cab is always the one you're looking for.
export const TRAFFIC: Tin[] = [
  { body: '#d9382a', shade: '#a12218', light: '#f0695b' },
  { body: '#2470c7', shade: '#17508f', light: '#5a9be2' },
  { body: '#f2f0e4', shade: '#c3bfa8', light: '#ffffff' },
  { body: '#7a3fa0', shade: '#562a73', light: '#a06cc4' },
  { body: '#3fa34d', shade: '#2a7636', light: '#6fc47b' },
  { body: '#ef7d23', shade: '#b95810', light: '#f7a35f' },
  { body: '#e0559a', shade: '#a93270', light: '#f08abb' },
];

const INK = '#16233a', GLASS = '#a9dbe6', LAMP = '#fff6c9', TAIL = '#b3121d';
const r = (x: number, y: number, w: number, h: number, fill: string, rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}"/>`;

// Tyres are printed light: dark ones vanish against the road bed.
const TYRE = '#b4bec8';
const tyre = (x: number, y: number) => r(x, y, 34, 12, INK, 3) + r(x + 3, y + 2, 28, 8, TYRE, 2);
const wheels = (xs: number[]) => xs.map(x => tyre(x, 3) + tyre(x, 85)).join('');
const tabs = (xs: number[], c: string) => xs.map(x => r(x, 14, 6, 5, c) + r(x, 81, 6, 5, c)).join('');
const lamps = (x: number) => `<circle cx="${x}" cy="29" r="7" fill="${LAMP}" stroke="${INK}" stroke-width="2"/><circle cx="${x}" cy="71" r="7" fill="${LAMP}" stroke="${INK}" stroke-width="2"/>`;
const tails = r(9, 22, 7, 14, TAIL, 2) + r(9, 64, 7, 14, TAIL, 2);
const checker = (x0: number, n: number, y: number) =>
  Array.from({ length: n }, (_, i) => r(x0 + i * 9, y, 9, 5, i % 2 ? '#fff' : INK) + r(x0 + i * 9, y + 5, 9, 5, i % 2 ? INK : '#fff')).join('');

function car(c: Tin, hero: boolean): string {
  return wheels([40, 130]) +
    r(7, 13, 186, 74, INK, 24) + r(10, 16, 180, 68, c.body, 21) +
    r(10, 66, 180, 18, c.shade, 9) + tabs([96], c.shade) +
    `<path d="M118 27 L142 33 Q148 50 142 67 L118 73 Z" fill="${GLASS}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    `<path d="M62 30 L44 35 Q40 50 44 65 L62 70 Z" fill="${GLASS}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    r(64, 28, 52, 44, c.light, 7) +
    (hero ? checker(25, 17, 16) + checker(25, 17, 74) + r(78, 41, 24, 18, INK, 4) + r(81, 44, 18, 12, LAMP, 2) : r(86, 28, 8, 44, c.shade)) +
    lamps(180) + tails;
}

// One outline around cargo and cab: a gap between them reads as two vehicles.
function truck(c: Tin): string {
  return wheels([34, 130, 232]) +
    r(7, 11, 286, 78, INK, 16) + r(10, 14, 280, 72, c.body, 13) +
    [40, 70, 100, 130, 160].map(x => r(x, 14, 4, 72, c.shade)).join('') +
    r(10, 42, 190, 16, c.light) + r(200, 14, 5, 72, INK) +
    r(205, 66, 85, 20, c.shade, 8) +
    `<path d="M240 27 L263 32 Q268 50 263 68 L240 73 Z" fill="${GLASS}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>` +
    r(212, 28, 26, 44, c.light, 5) +
    lamps(281) + tails;
}

export function vehicleSvg(len: number, c: Tin, hero = false): string {
  return `<svg viewBox="0 0 ${len * 100} 100" preserveAspectRatio="none" aria-hidden="true">${len === 3 ? truck(c) : car(c, hero)}</svg>`;
}
