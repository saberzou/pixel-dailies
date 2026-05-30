#!/usr/bin/env node
// Usage: node png-to-pixel.js <input.png> <hero-name> <universe> [size] [paletteN]
// Output: JSON line to stdout — the gallery entry object.
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function main() {
  const [,, input, name, universe, sizeArg, paletteArg] = process.argv;
  if (!input || !name) {
    console.error('usage: png-to-pixel.js <input.png> <name> <universe> [size=24] [palette=8]');
    process.exit(2);
  }
  const SIZE = parseInt(sizeArg || '24', 10);
  const PALETTE_N = parseInt(paletteArg || '8', 10);

  // Resize to SIZE×SIZE, force nearest-neighbor flattening on white background
  const { data, info } = await sharp(input)
    .flatten({ background: '#ffffff' })
    .resize(SIZE, SIZE, { kernel: 'lanczos3', fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  // data is RGB (no alpha after flatten)
  const channels = info.channels; // 3 or 4
  const pixels = [];
  for (let i = 0; i < SIZE * SIZE; i++) {
    const o = i * channels;
    pixels.push([data[o], data[o + 1], data[o + 2]]);
  }

  // K-means quantize
  const palette = kmeans(pixels, PALETTE_N, 12);
  const frame = pixels.map(p => palette.assign(p).toString(16)).join('');

  const hexPalette = palette.centers.map(c =>
    '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
  );

  const today = new Date().toISOString().slice(0, 10);
  const entry = {
    date: today,
    title: name,
    size: SIZE,
    fps: 1,
    category: 'heroes',
    universe: universe || 'marvel',
    palette: hexPalette,
    frames: [frame]
  };
  process.stdout.write(JSON.stringify(entry));
}

function kmeans(pixels, K, iters) {
  // Init: pick K spread-out pixels (greedy farthest-first)
  const centers = [pixels[0].slice()];
  while (centers.length < K) {
    let bestIdx = 0, bestD = -1;
    for (let i = 0; i < pixels.length; i++) {
      let minD = Infinity;
      for (const c of centers) {
        const d = dist2(pixels[i], c);
        if (d < minD) minD = d;
      }
      if (minD > bestD) { bestD = minD; bestIdx = i; }
    }
    centers.push(pixels[bestIdx].slice());
  }

  for (let it = 0; it < iters; it++) {
    const sums = Array.from({ length: K }, () => [0, 0, 0, 0]);
    for (const p of pixels) {
      let bi = 0, bd = Infinity;
      for (let k = 0; k < K; k++) {
        const d = dist2(p, centers[k]);
        if (d < bd) { bd = d; bi = k; }
      }
      sums[bi][0] += p[0]; sums[bi][1] += p[1]; sums[bi][2] += p[2]; sums[bi][3]++;
    }
    for (let k = 0; k < K; k++) {
      if (sums[k][3] > 0) {
        centers[k] = [sums[k][0] / sums[k][3], sums[k][1] / sums[k][3], sums[k][2] / sums[k][3]];
      }
    }
  }

  return {
    centers,
    assign(p) {
      let bi = 0, bd = Infinity;
      for (let k = 0; k < K; k++) {
        const d = dist2(p, centers[k]);
        if (d < bd) { bd = d; bi = k; }
      }
      return bi;
    }
  };
}

function dist2(a, b) {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return dr * dr + dg * dg + db * db;
}

main().catch(e => { console.error(e); process.exit(1); });
