import * as THREE from 'three';

// ---- baked tileable patterns for the sea (texture fetches are far cheaper than per-pixel hashing) ----

function hash(x: number, y: number, s: number): number {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 256x256 RGBA: four independent value-noise fields, lattice period 32 (one lattice unit = 8 texels). Sample at p / 32. */
export function noiseTexture(): THREE.DataTexture {
  const N = 256, P = 32, cell = N / P, data = new Uint8Array(N * N * 4);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / cell, y = j / cell, xi = Math.floor(x), yi = Math.floor(y);
    let u = x - xi, v = y - yi;
    u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
    for (let c = 0; c < 4; c++) {
      const h = (a: number, b: number): number => hash(((a % P) + P) % P, ((b % P) + P) % P, c + 1);
      const n = (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v;
      data[(j * N + i) * 4 + c] = Math.round(n * 255);
    }
  }
  return finish(new THREE.DataTexture(data, N, N, THREE.RGBAFormat));
}

/** 512x512 R8: gap between the two nearest cell points (F2 - F1, in cells, 0..0.5), 16 cells per tile. Sample at p / 16. */
export function cellTexture(): THREE.DataTexture {
  const N = 512, C = 16, cell = N / C, data = new Uint8Array(N * N);
  const pts: number[] = [];
  for (let j = 0; j < C; j++) for (let i = 0; i < C; i++) pts.push(0.15 + 0.7 * hash(i, j, 9), 0.15 + 0.7 * hash(i, j, 11));
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = i / cell, y = j / cell, xi = Math.floor(x), yi = Math.floor(y);
    let d1 = 9, d2 = 9;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const cx = xi + dx, cy = yi + dy, k = ((((cy % C) + C) % C) * C + (((cx % C) + C) % C)) * 2;
      const px = cx + pts[k] - x, py = cy + pts[k + 1] - y, d = Math.sqrt(px * px + py * py);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
    }
    data[j * N + i] = Math.round(Math.min(1, (d2 - d1) / 0.5) * 255);
  }
  return finish(new THREE.DataTexture(data, N, N, THREE.RedFormat));
}

function finish(t: THREE.DataTexture): THREE.DataTexture {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}
