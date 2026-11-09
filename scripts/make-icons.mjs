// Generates PNG app icons without any image dependencies.
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc(td));
  return Buffer.concat([len, td, c]);
};

// A checker cab breaking out of a tin tray of traffic.
const blocks = [
  { x: 0.16, y: 0.14, w: 0.2, h: 0.2, c: [36, 112, 199] },
  { x: 0.4, y: 0.14, w: 0.2, h: 0.2, c: [217, 56, 42] },
  { x: 0.64, y: 0.14, w: 0.2, h: 0.2, c: [122, 63, 160] },
  { x: 0.1, y: 0.42, w: 0.62, h: 0.2, c: [247, 189, 18] },
  { x: 0.16, y: 0.7, w: 0.44, h: 0.17, c: [63, 163, 77] },
  { x: 0.64, y: 0.7, w: 0.2, h: 0.17, c: [239, 125, 35] },
];
function icon(size) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let [r, g, b] = [15, 107, 112];
      if (u > 0.07 && u < 0.93 && v > 0.07 && v < 0.93) [r, g, b] = [29, 53, 87];
      for (const k of blocks) {
        const dx = Math.max(k.x - u, 0, u - (k.x + k.w)), dy = Math.max(k.y - v, 0, v - (k.y + k.h));
        const d = Math.hypot(dx, dy);
        if (d === 0) [r, g, b] = k.c;
        
      }
      if (u > 0.74 && v > 0.47 && v < 0.57 && Math.abs(v - 0.52) < 0.05 - Math.abs(u - 0.82) * 0.6 + 0.0) { r = 255; g = 255; b = 255; }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = Math.min(255, r); raw[o + 1] = Math.min(255, g); raw[o + 2] = Math.min(255, b); raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
}

for (const s of [180, 192, 512]) writeFileSync(`public/icon-${s}.png`, icon(s));
console.log('icons written');
