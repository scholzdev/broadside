import * as THREE from 'three';
import { renderer } from './render';
import { G } from './game';
import { Builder, PaintedMaterial } from './geo';
import { makeShip } from './models';
import { PLAYER_SHIPS } from './fleet';
import { MODS, type ModuleId } from './modules';
import { Anchors } from './dressing/anchors';
import { ATTACH } from './dressing/registry';
import { C, cyl, box } from './dressing/kit';
import type { Anim } from './dressing/types';
import { SHIP_UP, crewGroup } from './thumbship';
import { CREW_ORDER } from './crewdefs';

// ---- 3D card thumbnails: each module attachment / ship-upgrade hero object rendered once into a small transparent image.
// Uses the game's renderer with private render targets (no second WebGL context); ACES + sRGB applied here like post.ts does.
// Keys: 'mod:<id>', 'up:<ref>' and 'crew:<type>' (+ ':5' for the Lv 5 form). Cards ask with thumb(key); misses are queued and swapped into [data-thumb=key] when done.

const SIZE = 256;
const cache = new Map<string, string>();
const queue: string[] = [], urgent = new Set<string>();
const stats = { first: 0, total: 0, n: 0 };

export const THUMB_KEYS = [...Object.keys(ATTACH).map(id => 'mod:' + id), ...Object.keys(SHIP_UP).map(id => 'up:' + id), ...CREW_ORDER.map(id => 'crew:' + id)];

/** Cached data URL, or null (then it is generated within a frame or two and swapped into the DOM). */
export function thumb(key: string): string | null {
  const u = cache.get(key);
  if (u) return u;
  request(key, true);
  return null;
}

function request(key: string, now: boolean): void {
  if (cache.has(key)) return;
  const i = queue.indexOf(key);
  if (i >= 0) { if (!now) return; queue.splice(i, 1); }
  if (now) { urgent.add(key); queue.unshift(key); } else queue.push(key);
  if (!scheduled) { scheduled = true; requestAnimationFrame(pump); }
}

let scheduled = false;
/** Between game frames: render queued thumbnails for ~6 ms (always at least one), then tear the pipeline down when idle. */
function pump(): void {
  scheduled = false;
  if (!queue.length) return; // a stale wake-up (retry timer / extra frame) can outlive the queue it was scheduled for
  if (!renderer) { scheduled = true; requestAnimationFrame(pump); return; }
  // background warming never runs while sailing (the first render compiles a shader: a visible hitch); retry later
  if (G.state === 'playing' && !urgent.has(queue[0])) { setTimeout(() => { if (!scheduled) { scheduled = true; requestAnimationFrame(pump); } }, 1500); return; }
  const t0 = performance.now();
  do {
    const k = queue.shift() as string, t = performance.now();
    cache.set(k, generate(k));
    const ms = performance.now() - t;
    if (!stats.n) stats.first = ms;
    stats.n++; stats.total += ms;
    for (const el of document.querySelectorAll<HTMLElement>(`[data-thumb="${k}"]`)) { el.innerHTML = img(k); el.removeAttribute('data-thumb'); }
  } while (queue.length && performance.now() - t0 < 6 && (G.state !== 'playing' || urgent.has(queue[0])));
  if (queue.length) { scheduled = true; requestAnimationFrame(pump); } else teardown();
}

export const img = (key: string): string => `<img class="thumb" src="${cache.get(key)}" alt="">`;

// warm every thumbnail in the background shortly after boot, so the first level-up never shows the fallback icon
setTimeout(() => { for (const k of THUMB_KEYS) request(k, false); }, 3000);

// ---- the pipeline (created on first use, disposed when the queue runs dry) ----
interface Pipe { scene: THREE.Scene; cam: THREE.PerspectiveCamera; hdr: THREE.WebGLRenderTarget; ldr: THREE.WebGLRenderTarget; mat: PaintedMaterial; tone: THREE.Mesh; toneCam: THREE.Camera; px: Uint8Array; canvas: HTMLCanvasElement }
let pipe: Pipe | null = null;

const ToneShader = {
  uniforms: { tSrc: { value: null as THREE.Texture | null }, uExposure: { value: 1.25 }, uSat: { value: 1.12 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: /* glsl */ `
    uniform sampler2D tSrc; uniform float uExposure, uSat; varying vec2 vUv;
    vec3 rrtOdt(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 c) {
      const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      return clamp(outM * rrtOdt(inM * (c * uExposure / 0.6)), 0.0, 1.0);
    }
    vec3 srgb(vec3 c) { return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
    void main() {
      vec4 s = texture2D(tSrc, vUv);
      float a = clamp(s.a, 0.0, 1.0);
      vec3 c = a > 0.002 ? max(s.rgb, 0.0) / a : vec3(0.0);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = max(mix(vec3(l), c, uSat), 0.0);
      gl_FragColor = vec4(srgb(aces(c)), a);
    }`,
};

function makePipe(): Pipe {
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff0dc, 0x2a2238, 1.1));
  const key = new THREE.DirectionalLight(0xffdcae, 3.2); // warm key, upper left front
  key.position.set(-1.1, 1.7, 1.3);
  const rim = new THREE.DirectionalLight(0x9ccaff, 3.6); // cool rim from behind right
  rim.position.set(1.4, 0.9, -1.6);
  const fill = new THREE.DirectionalLight(0xffe8cc, 0.6);
  fill.position.set(1.2, 0.2, 1.0);
  scene.add(key, rim, fill);
  const hdr = new THREE.WebGLRenderTarget(SIZE, SIZE, { type: THREE.HalfFloatType, samples: 4 });
  const ldr = new THREE.WebGLRenderTarget(SIZE, SIZE);
  const tone = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({ ...ToneShader, uniforms: THREE.UniformsUtils.clone(ToneShader.uniforms), depthTest: false, depthWrite: false }));
  tone.frustumCulled = false;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  return { scene, cam: new THREE.PerspectiveCamera(24, 1, 0.1, 100), hdr, ldr, mat: new PaintedMaterial({ roughness: 0.7 }), tone, toneCam: new THREE.Camera(), px: new Uint8Array(SIZE * SIZE * 4), canvas };
}

function teardown(): void {
  if (!pipe) return;
  pipe.hdr.dispose(); pipe.ldr.dispose(); pipe.mat.dispose();
  pipe.tone.geometry.dispose(); (pipe.tone.material as THREE.Material).dispose();
  pipe = null;
}

// ---- building the objects ----
let anchors: Anchors | null = null;
/** Anchor queries of a galleon hull (built once, never rendered; only its frame data is kept). */
const anc = (): Anchors => (anchors ??= new Anchors(makeShip({ ...PLAYER_SHIPS.galleon, flag: undefined, merge: true }).frame as NonNullable<ReturnType<typeof makeShip>['frame']>));

/** Yaw that turns the mount's outboard face toward the camera at a 3/4 angle (ship +z = bow, +x = port). */
const YAW: Record<string, number> = { bow: -0.75, side: -Math.PI / 2 + 0.55, deck: -0.6, stern: Math.PI - 0.7 };
const YAW_ID: Record<string, number> = { kegs: Math.PI + 0.5, ram: -1.25, lantern: -1.15, net: Math.PI - 0.5, pump: Math.PI / 2 + 0.6 };

interface Part { geo: THREE.BufferGeometry; at?: THREE.Vector3; yaw?: number }

function moduleParts(id: string): { parts: Part[]; yaw: number } {
  const at = ATTACH[id], def = MODS[id as ModuleId], slot = def?.slot ?? at.slot, a = anc();
  const b = new Builder(), anims: Anim[] = [];
  // two-mount spacing keeps side guns close together; two balls = a pair of guns
  at.build(b, a, { idx: 0, n: slot === 'side' ? 2 : 1, balls: 2, color: def?.color ?? at.color, anims });
  context(b, id, a);
  let geo = b.build();
  if (slot === 'side' || id === 'pump') geo = keepSide(geo, id === 'pump' ? -1 : 1); // mirrored mounts: show one flank only
  const parts: Part[] = [{ geo }, ...anims.map(x => ({ geo: x.geo, at: new THREE.Vector3(...x.at) }))];
  return { parts, yaw: YAW_ID[id] ?? YAW[slot] };
}

/** A bit of the ship under parts that would otherwise float: mast heads, a deck plank. */
function context(b: Builder, id: string, a: Anchors): void {
  const m = a.main;
  if (id === 'crowsnest') cyl(b, C.wood, [0, m.top - 0.5, m.z], 0.07, 1.6, undefined, 8);
  if (id === 'witch') { cyl(b, C.wood, [0, m.top - 0.2, m.z], 0.06, 0.4, undefined, 8); cyl(b, C.dark, [0, m.top - 0.06, m.z], 0.09, 0.08, undefined, 8); }
  if (id === 'lantern') box(b, C.plank, [0, a.top(0.03) - 0.04, a.z(0.03)], [0.7, 0.08, 0.5]);
}

/** Drop the triangles of the far flank (centroid x on the other side of the keel). */
function keepSide(g: THREE.BufferGeometry, side: number): THREE.BufferGeometry {
  const names = ['position', 'normal', 'color', 'emit'], src = names.map(n => g.attributes[n].array as Float32Array), out: number[][] = names.map(() => []);
  const p = src[0];
  for (let i = 0; i < p.length; i += 9) {
    if (side * (p[i] + p[i + 3] + p[i + 6]) / 3 < -0.05) continue;
    for (let k = 0; k < names.length; k++) for (let j = 0; j < 9; j++) out[k].push(src[k][i + j]);
  }
  const r = new THREE.BufferGeometry();
  names.forEach((n, k) => r.setAttribute(n, new THREE.Float32BufferAttribute(out[k], 3)));
  g.dispose();
  return r;
}

function shipParts(ref: string): { parts: Part[]; yaw: number } {
  const b = new Builder();
  (SHIP_UP[ref] ?? SHIP_UP.hull)(b);
  return { parts: [{ geo: b.build() }], yaw: -0.65 };
}

// ---- rendering one thumbnail ----
const _v = new THREE.Vector3(), _box = new THREE.Box3(), _m = new THREE.Matrix4();

function generate(key: string): string {
  const p = (pipe ??= makePipe());
  const [kind, id, lv] = key.split(':');
  const { parts, yaw } = kind === 'mod' ? moduleParts(id) : kind === 'crew' ? { parts: crewGroup(id, lv === '5'), yaw: 0 } : shipParts(id);
  const group = new THREE.Group();
  for (const pt of parts) { const m = new THREE.Mesh(pt.geo, p.mat); if (pt.at) m.position.copy(pt.at); if (pt.yaw) m.rotation.y = pt.yaw; group.add(m); }
  group.rotation.y = yaw;
  p.scene.add(group);
  group.updateMatrixWorld(true);
  _box.setFromObject(group);
  group.position.sub(_box.getCenter(_v));
  group.updateMatrixWorld(true);
  frame(p.cam, group, _box.getSize(_v).length() / 2);

  const r = renderer, prevRT = r.getRenderTarget(), prevAlpha = r.getClearAlpha(), prevColor = r.getClearColor(new THREE.Color()), prevAuto = r.autoClear;
  r.autoClear = true;
  r.setClearColor(0x000000, 0);
  r.setRenderTarget(p.hdr);
  r.render(p.scene, p.cam);
  (p.tone.material as THREE.ShaderMaterial).uniforms.tSrc.value = p.hdr.texture;
  r.setRenderTarget(p.ldr);
  r.render(p.tone, p.toneCam);
  r.readRenderTargetPixels(p.ldr, 0, 0, SIZE, SIZE, p.px);
  r.setRenderTarget(prevRT);
  r.setClearColor(prevColor, prevAlpha);
  r.autoClear = prevAuto;

  p.scene.remove(group);
  for (const pt of parts) pt.geo.dispose();
  return toUrl(p);
}

/** Camera 3/4 from above; then a projection tweak centres the silhouette and fills the round medallion. */
function frame(cam: THREE.PerspectiveCamera, group: THREE.Object3D, radius: number): void {
  const dist = radius / Math.sin(THREE.MathUtils.degToRad(cam.fov / 2));
  cam.position.set(0, 0.62, 1).normalize().multiplyScalar(dist);
  cam.lookAt(0, 0, 0);
  cam.zoom = 1;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  const pts: THREE.Vector3[] = [];
  group.traverse(o => {
    const me = o as THREE.Mesh;
    if (!me.isMesh) return;
    const pos = me.geometry.attributes.position;
    for (let i = 0; i < pos.count; i += 3) pts.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(me.matrixWorld).project(cam));
  });
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const q of pts) { x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  let rmax = 0;
  for (const q of pts) rmax = Math.max(rmax, Math.hypot(q.x - cx, (q.y - cy) * 1.08));
  const s = 0.9 / Math.max(rmax, 0.05);
  _m.set(s, 0, 0, -s * cx, 0, s, 0, -s * cy, 0, 0, 1, 0, 0, 0, 0, 1);
  cam.projectionMatrix.premultiply(_m);
  cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
}

/** Pixels (bottom-up) -> canvas (top-down) -> PNG data URL. */
function toUrl(p: Pipe): string {
  const g = p.canvas.getContext('2d') as CanvasRenderingContext2D, im = g.createImageData(SIZE, SIZE), row = SIZE * 4;
  for (let y = 0; y < SIZE; y++) im.data.set(p.px.subarray((SIZE - 1 - y) * row, (SIZE - y) * row), y * row);
  g.putImageData(im, 0, 0);
  return p.canvas.toDataURL('image/png');
}

// debug: __thumbs.stats (first = includes shader compile), __thumbs.sheet() -> contact sheet data URL
(window as unknown as { __thumbs: unknown }).__thumbs = {
  stats, keys: THUMB_KEYS, get: (k: string) => cache.get(k),
  warm(): void { for (const k of THUMB_KEYS) request(k, true); },
  /** Render everything now (no rAF; works in a background tab). */
  warmNow(): void { for (const k of THUMB_KEYS) request(k, true); scheduled = false; while (queue.length) pump(); },
  clear(): void { cache.clear(); stats.n = 0; stats.total = 0; },
};
