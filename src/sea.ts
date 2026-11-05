import * as THREE from 'three';
import { scene } from './game';
import { islands, reefs } from './world';
import type { SeaPalette } from './seas';
import { WAVE_GLSL, uTime } from './anim';
import { SUN_DIR, SUN_COLOR } from './render';
import { noiseTexture, cellTexture } from './seatex';

// ---- stylized sea: swell displacement (shared wave table), depth gradient from nearby islands,
// shoreline foam, toon ripple lines, whitecaps, sun glints, cloud shadows and real shadow-map shadows ----

const MAX_ISL = 16, MAX_REEF = 24;
const SIZE = 400, SEGS = 160, SNAP = 5; // vertex spacing 2.5: the 5 u snap lands on the grid, so it never swims

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  #include <shadowmap_pars_vertex>
  uniform float uTime;
  varying vec3 vW;
  varying float vH;
  ${WAVE_GLSL}
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    float h = waveH(worldPosition.xz, uTime);
    worldPosition.y += h;
    vW = worldPosition.xyz; vH = h;
    vec3 transformedNormal = normalMatrix * vec3(0.0, 1.0, 0.0); // used by shadowmap_vertex for the normal bias
    vec4 mvPosition = viewMatrix * worldPosition;
    gl_Position = projectionMatrix * mvPosition;
    #include <shadowmap_vertex>
    #include <fog_vertex>
  }`;

const fragmentShader = /* glsl */ `
  #define MAX_ISL ${MAX_ISL}
  #define MAX_REEF ${MAX_REEF}
  #include <common>
  #include <packing>
  #include <fog_pars_fragment>
  #include <bsdfs>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>
  uniform float uTime;
  uniform vec3 uDeep, uMid, uShallow, uFoam, uLine, uSunDir, uSunCol;
  uniform vec4 uIsl[MAX_ISL];
  uniform int uIslN;
  uniform vec4 uReef[MAX_REEF];
  uniform int uReefN;
  uniform vec3 uCoral;
  uniform sampler2D uNoise, uCells;
  varying vec3 vW;
  varying float vH;
  ${WAVE_GLSL}
  // four independent value-noise fields (lattice spacing 1 at p) from one baked texture fetch
  vec4 nz(vec2 p) { return texture2D(uNoise, p * (1.0 / 32.0)); }
  void main() {
    vec2 p = vW.xz;
    float t = uTime;
    float shore = 60.0;
    for (int i = 0; i < MAX_ISL; i++) {
      if (i >= uIslN) break;
      shore = min(shore, length(p - uIsl[i].xy) - uIsl[i].z);
    }
    float reef = 60.0;
    for (int i = 0; i < MAX_REEF; i++) {
      if (i >= uReefN) break;
      reef = min(reef, length(p - uReef[i].xy) - uReef[i].z);
    }
    float sh = max(shore, 0.0), shD = max(min(shore, reef + 1.0), 0.0); // reefs get turquoise shallows around them too (colour only)

    // depth gradient: turquoise shallows hugging islands, mid blue, deep blue patches; drifting cloud shadows
    vec4 lo = nz(p * 0.03 + vec2(t * 0.008, -t * 0.005));
    float big = lo.r, cl = lo.g * 0.7 + nz(p * 0.05 - vec2(t * 0.015, 0.0)).b * 0.3;
    vec3 col = mix(uShallow, uMid, smoothstep(0.0, 5.5, shD));
    col = mix(col, uDeep, smoothstep(3.0, 18.0, shD) * (0.55 + 0.45 * smoothstep(0.3, 0.7, big)));

    // swell shading from the analytic wave normal; crests lighter
    vec2 g = waveGrad(p, t);
    vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
    col *= 0.86 + 0.25 * max(dot(n, uSunDir), 0.0) + vH * 0.75;

    // toon ripple lines: edges of a warped cell pattern, brighter in the shallows
    vec2 warp = nz(p * 0.21 + t * 0.06).gb - 0.5;
    float gap = texture2D(uCells, (p * 0.38 + warp * 1.4 + vec2(t * 0.05, t * 0.03)) * (1.0 / 16.0)).r * 0.5;
    float lines = 1.0 - smoothstep(0.0, 0.055, gap);
    col += uLine * lines * mix(0.018, 0.12, 1.0 - smoothstep(0.0, 9.0, shD));

    // foam: shoreline lip, breaking bands moving toward the shore, noisy whitecaps on crests
    vec4 mid = nz(p * 1.3 + vec2(t * 0.4, t * 0.25));
    float n1 = mid.r;
    float lip = 1.0 - smoothstep(0.05, 0.35 + 0.45 * n1, sh);
    float band = smoothstep(0.72, 0.95, sin(sh * 2.4 + t * 1.7 + n1 * 2.5)) * (1.0 - smoothstep(0.6, 4.5, sh));
    float cap = smoothstep(0.26, 0.34, vH + (n1 - 0.5) * 0.1) * smoothstep(0.74, 0.9, nz(p * vec2(2.6, 1.1) - t * 0.3).a);
    float foam = clamp(max(lip * 0.92, max(band * 0.7, cap * 0.3)), 0.0, 1.0);

    // coral shallows (Coral Reefs hazard): mottled pink coral with a foam rim; the circle matches the damage area
    if (reef < 1.5) {
      float wob = (nz(p * 0.45).r - 0.5) * 0.9;
      float inside = 1.0 - smoothstep(-0.25, 0.25, reef + wob);
      vec4 m4 = nz(p * 0.8);
      float mott = m4.b * 0.6 + nz(p * 2.1).a * 0.4;
      vec3 cc = mix(uCoral * 0.45, uCoral * 1.1, smoothstep(0.3, 0.75, mott)) * (0.85 + 0.3 * m4.g);
      col = mix(col, cc, inside * 0.78);
      foam = max(foam, (1.0 - smoothstep(0.0, 0.45, abs(reef + wob))) * (0.55 + 0.4 * n1));
    }

    // direct light visibility: shadow map and cloud shadows
    float vis = getShadowMask() * (1.0 - 0.55 * smoothstep(0.52, 0.74, cl));
    col *= mix(vec3(0.6, 0.7, 0.8), vec3(1.0), vis);
    col = mix(col, uFoam * mix(0.72, 1.0, vis), foam);

    // sun glints: sparse twinkling sparkles from high-frequency ripple normals
    vec2 d1 = nz(p * 2.6 + t * 0.9).rg - 0.5, d2 = nz(p * 5.3 - t * 1.3).ba - 0.5;
    vec3 nd = normalize(vec3(-g.x * 3.0 + d1.x * 0.5 + d2.x * 0.35, 1.0, -g.y * 3.0 + d1.y * 0.5 + d2.y * 0.35));
    vec3 hs = normalize(vec3(uSunDir.x * 0.62, 1.0, uSunDir.z * 0.62));
    float spec = pow(max(dot(nd, hs), 0.0), 1400.0) * smoothstep(0.7, 0.92, lo.a);
    col += uSunCol * spec * 2.6 * vis * (1.0 - foam);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }`;

const isl = Array.from({ length: MAX_ISL }, () => new THREE.Vector4());
const reefU = Array.from({ length: MAX_REEF }, () => new THREE.Vector4());
let mat: THREE.ShaderMaterial;

export function createSea(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
  geo.rotateX(-Math.PI / 2);
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.lights, THREE.UniformsLib.fog, {
    uDeep: { value: new THREE.Color(0x0f5c84) }, uMid: { value: new THREE.Color(0x1d93b6) },
    uShallow: { value: new THREE.Color(0x4cdccb) }, uFoam: { value: new THREE.Color(0xf2fbff) },
    uLine: { value: new THREE.Color(0xc8f4ff) }, uSunDir: { value: SUN_DIR.clone() }, uSunCol: { value: SUN_COLOR.clone() },
    uIslN: { value: 0 }, uReefN: { value: 0 }, uCoral: { value: new THREE.Color(0xff6f8e) },
  }]);
  uniforms.uTime = uTime; // shared object: merge() would clone it
  uniforms.uIsl = { value: isl };
  uniforms.uReef = { value: reefU };
  uniforms.uNoise = { value: noiseTexture() };
  uniforms.uCells = { value: cellTexture() };
  mat = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, lights: true, fog: true });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  m.receiveShadow = true;
  m.renderOrder = -1;
  scene.add(m);
  return m;
}

const near: { x: number; z: number; r: number; d: number }[] = [];
export function updateSea(sea: THREE.Mesh, x: number, z: number): void {
  sea.position.set(Math.round(x / SNAP) * SNAP, 0, Math.round(z / SNAP) * SNAP);
  near.length = 0;
  for (const i of islands) {
    const d = Math.hypot(i.x - x, i.z - z) - i.r;
    if (d < 95) near.push({ x: i.x, z: i.z, r: i.r, d });
  }
  near.sort((a, b) => a.d - b.d);
  const n = Math.min(MAX_ISL, near.length);
  for (let k = 0; k < n; k++) isl[k].set(near[k].x, near[k].z, near[k].r, 0);
  mat.uniforms.uIslN.value = n;
  near.length = 0;
  for (const r of reefs) {
    const d = Math.hypot(r.x - x, r.z - z) - r.r;
    if (d < 70) near.push({ x: r.x, z: r.z, r: r.r, d });
  }
  near.sort((a, b) => a.d - b.d);
  const m = Math.min(MAX_REEF, near.length);
  for (let k = 0; k < m; k++) reefU[k].set(near[k].x, near[k].z, near[k].r, 0);
  mat.uniforms.uReefN.value = m;
}
/** Per-sea water colours (seatheme.ts). */
export function setSeaPalette(p: SeaPalette): void {
  const u = mat.uniforms;
  u.uDeep.value.set(p.deep); u.uMid.value.set(p.mid); u.uShallow.value.set(p.shallow); u.uFoam.value.set(p.foam); u.uLine.value.set(p.line);
  u.uCoral.value.set(p.coral); u.uSunCol.value.copy(SUN_COLOR);
}
