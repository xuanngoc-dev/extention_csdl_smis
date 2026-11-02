import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';

const BRAND = [31, 79, 184, 255];
const WHITE = [255, 255, 255, 255];
const SIZES = [16, 32, 48, 96, 128];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(size, colorAt) {
  const rowSize = size * 4 + 1;
  const raw = Buffer.alloc(rowSize * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < size; x += 1) {
      const [red, green, blue, alpha] = colorAt(x, y, size);
      const offset = y * rowSize + 1 + x * 4;
      raw[offset] = red;
      raw[offset + 1] = green;
      raw[offset + 2] = blue;
      raw[offset + 3] = alpha;
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8;
  header[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function inRoundRect(nx, ny, radius) {
  const edge = radius;
  const far = 1 - radius;
  const dx = nx < edge ? edge - nx : nx > far ? nx - far : 0;
  const dy = ny < edge ? edge - ny : ny > far ? ny - far : 0;
  return dx * dx + dy * dy <= radius * radius;
}

function inTriangle(px, py, ax, ay, bx, by, cx, cy) {
  const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  const d1 = sign(px, py, ax, ay, bx, by);
  const d2 = sign(px, py, bx, by, cx, cy);
  const d3 = sign(px, py, cx, cy, ax, ay);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function inRect(nx, ny, x, y, width, height) {
  return nx >= x && nx <= x + width && ny >= y && ny <= y + height;
}

function paint(nx, ny) {
  if (!inRoundRect(nx, ny, 0.22)) return [0, 0, 0, 0];
  const roof = inTriangle(nx, ny, 0.22, 0.48, 0.5, 0.24, 0.78, 0.48);
  const body = inRect(nx, ny, 0.3, 0.46, 0.4, 0.34);
  const door = inRect(nx, ny, 0.445, 0.62, 0.11, 0.18);
  const leftWindow = inRect(nx, ny, 0.35, 0.54, 0.08, 0.08);
  const rightWindow = inRect(nx, ny, 0.57, 0.54, 0.08, 0.08);
  if ((body || roof) && !door && !leftWindow && !rightWindow) return WHITE;
  return BRAND;
}

function colorAt(x, y, size) {
  const samples = [];
  for (let sy = 0; sy < 4; sy += 1) {
    for (let sx = 0; sx < 4; sx += 1) samples.push(paint((x + (sx + 0.5) / 4) / size, (y + (sy + 0.5) / 4) / size));
  }
  let red = 0;
  let green = 0;
  let blue = 0;
  let alpha = 0;
  for (const sample of samples) {
    red += sample[0] * sample[3];
    green += sample[1] * sample[3];
    blue += sample[2] * sample[3];
    alpha += sample[3];
  }
  if (alpha === 0) return [0, 0, 0, 0];
  return [Math.round(red / alpha), Math.round(green / alpha), Math.round(blue / alpha), Math.round(alpha / samples.length)];
}

await mkdir('icon', { recursive: true });
await Promise.all(SIZES.map(async (size) => writeFile(`icon/${size}.png`, encodePng(size, colorAt))));
console.log(`[icons] đã ghi ${SIZES.length} kích thước vào icon/`);
