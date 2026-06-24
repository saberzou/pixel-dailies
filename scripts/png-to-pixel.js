#!/usr/bin/env node
// Usage: node png-to-pixel.js <input> <name> <universe> [size=24] [palette=8] [category=heroes]
//
// Strategy: AI "pixel art" images aren't on a true integer grid — chunky pixels
// are ~30-50 source-px wide and slightly anti-aliased. Instead of lanczos
// downsampling (which averages neighbors and smears edges), we:
//   1) Resize to 4× target so each output cell maps to a ~4×4 source block.
//   2) For each output cell, take a small center sample (median color of the
//      inner 2×2), which dodges the anti-aliased edges between AI pixels.
//   3) Quantize to a small palette via k-means.
const fs = require('fs');
const sharp = require('sharp');

async function main() {
  const [,, input, name, universe, sizeArg, paletteArg, categoryArg] = process.argv;
  if (!input || !name) {
    console.error('usage: png-to-pixel.js <input> <name> <universe> [size=24] [palette=8]');
    process.exit(2);
  }
  const SIZE = parseInt(sizeArg || '24', 10);
  const PALETTE_N = parseInt(paletteArg || '8', 10);
  const OVERSAMPLE = 4; // each output cell = 4×4 source-px block

  const W = SIZE * OVERSAMPLE;
  // Use nearest-neighbor at the oversampled size — preserves hard edges and
  // avoids lanczos smear. Crop-to-cover so the subject fills the frame.
  const { data, info } = await sharp(input)
    .flatten({ background: '#ffffff' })
    .resize(W, W, { kernel: 'nearest', fit: 'cover' })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const ch = info.channels;
  const pixels = [];
  for (let cy = 0; cy < SIZE; cy++) {
    for (let cx = 0; cx < SIZE; cx++) {
      // Sample the inner 2×2 of each 4×4 cell (skip the edge row/col).
      const samples = [];
      for (let dy = 1; dy <= 2; dy++) {
        for (let dx = 1; dx <= 2; dx++) {
          const x = cx * OVERSAMPLE + dx;
          const y = cy * OVERSAMPLE + dy;
          const o = (y * W + x) * ch;
          samples.push([data[o], data[o + 1], data[o + 2]]);
        }
      }
      // Median per channel (robust to one anti-aliased outlier)
      const r = median(samples.map(s => s[0]));
      const g = median(samples.map(s => s[1]));
      const b = median(samples.map(s => s[2]));
      pixels.push([r, g, b]);
    }
  }

  const palette = kmeans(pixels, PALETTE_N, 14);
  const frame = pixels.map(p => palette.assign(p).toString(16)).join('');
  const hexPalette = palette.centers.map(c =>
    '#' + c.map(v => clamp(v).toString(16).padStart(2, '0')).join('')
  );

  const today = new Date().toISOString().slice(0, 10);
  process.stdout.write(JSON.stringify({
    date: today,
    title: name,
    size: SIZE,
    fps: 1,
    category: (categoryArg || 'heroes').toLowerCase(),
    universe: universe || 'marvel',
    palette: hexPalette,
    frames: [frame]
  }));
}

function median(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

function kmeans(pixels, K, iters) {
  // Farthest-first init for spread-out seeds
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
