import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { scene } from './game';
import { FinalShader, POST } from './post';
import type { SeaPalette } from './seas';

// ---- renderer, lights, shadows and post: one render path (always through the composer) ----

/** Direction toward the sun. It sits screen-left and a little toward the camera, so camera-facing hull sides catch light. */
export const SUN_DIR = new THREE.Vector3(-0.55, 0.74, 0.4).normalize();
export const SUN_COLOR = new THREE.Color(0xffe1b4);
export const FOG_COLOR = 0x2b7d9a;

const qs = new URLSearchParams(location.search);
let pinned = qs.has('hq') || qs.has('lq');
const q = { dpr: Math.min(devicePixelRatio, qs.has('lq') ? 1 : 2), ema: 1 / 60, slowFrames: 0, cpu: 0, gpu: 0 };
/** MSAA only pays off at low pixel ratios; on retina the resolution itself does the anti-aliasing (MSAA cost ~10 ms there). */
const msaaFor = (dpr: number): number => (dpr <= 1.25 ? 4 : 0);

export let renderer: THREE.WebGLRenderer;
let composer: EffectComposer, bloom: UnrealBloomPass;
const sun = new THREE.DirectionalLight(SUN_COLOR, 3.0);
const hemi = new THREE.HemisphereLight(0xc4e4ff, 0x1f5a6c, 1.35);
const rim = new THREE.DirectionalLight(0x8cb8ff, 0.55); // cool back light from the opposite side
/** Per-sea lighting and grade (seatheme.ts). SUN_COLOR is updated in place, the sea shader reads a copy. */
export function setLightTheme(p: SeaPalette): void {
  (scene.background as THREE.Color).set(p.bg); (scene.fog as THREE.Fog).color.set(p.bg);
  hemi.color.set(p.sky); hemi.groundColor.set(p.ground); hemi.intensity = p.hemi;
  sun.color.set(p.sun); sun.intensity = p.sunI; SUN_COLOR.set(p.sun);
  rim.color.set(p.rim); rim.intensity = p.rimI;
  POST.uExposure.value = p.exposure; POST.uSat.value = p.sat; POST.uLo.value.set(...p.lo); POST.uHi.value.set(...p.hi);
}
let shadowHalf = 0;

export function initRender(canvas: HTMLCanvasElement, camera: THREE.Camera): void {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // FinalShader tone maps; every pass before it stays linear HDR
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.info.autoReset = false; // the composer renders several passes; count the whole frame

  scene.background = new THREE.Color(FOG_COLOR);
  scene.fog = new THREE.Fog(FOG_COLOR, 128, 180);
  scene.add(hemi);
  rim.position.set(0.6, 0.45, -0.65);
  scene.add(rim);

  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.shadow.radius = 3;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 200;
  scene.add(sun, sun.target);

  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: msaaFor(q.dpr) });
  composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.7, 0.4, 1.5);
  const bloomSize = bloom.setSize.bind(bloom);
  bloom.setSize = (w: number, h: number) => bloomSize(w / 2, h / 2); // blur chain starts at quarter resolution
  composer.addPass(bloom);
  const final = new ShaderPass(FinalShader); // grade + vignette + ACES + sRGB in one pass (+ the Fog Coast mask)
  Object.assign(final.uniforms, POST); // shared objects: seatheme.ts and hazards.ts drive them
  composer.addPass(final);
  (window as unknown as { __render: unknown }).__render = {
    info: renderer.info, setQuality, tune, scene,
    /** Debug: render the current frame n times and wait for the GPU; returns ms per frame. */
    bench(n = 20): number {
      const gl = renderer.getContext(), px = new Uint8Array(4);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      const t0 = performance.now();
      for (let i = 0; i < n; i++) composer.render(0.016);
      gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return (performance.now() - t0) / n;
    },
    get dpr() { return q.dpr; }, get bloom() { return bloom.enabled; }, get frameMs() { return q.ema * 1000; },
    get cpuMs() { return q.cpu; }, get gpuMs() { return q.gpu; },
  };
  if (qs.has('gpu')) initGpuProbe();
}

export type Quality = 'high' | 'medium' | 'low';
/** Graphics preset (for a future settings menu). Pins the level: automatic downgrades stop. */
export function setQuality(level: Quality): void {
  pinned = true;
  const dev = Math.min(devicePixelRatio, 2);
  tune(level === 'high' ? { dpr: dev, bloom: true } : level === 'medium' ? { dpr: Math.min(dev, 1.5), bloom: true } : { dpr: 1, bloom: false });
}
/** Fine-grained knobs (debug): pixel ratio, MSAA samples, bloom on/off, shadow map size. */
export function tune(o: { dpr?: number; msaa?: number; bloom?: boolean; shadow?: number }): void {
  if (o.dpr !== undefined) { q.dpr = o.dpr; resizeRender(); if (o.msaa === undefined) o.msaa = msaaFor(o.dpr); }
  if (o.msaa !== undefined) for (const rt of [composer.renderTarget1, composer.renderTarget2]) { rt.samples = o.msaa; rt.dispose(); }
  if (o.bloom !== undefined) bloom.enabled = o.bloom;
  if (o.shadow !== undefined) { sun.shadow.mapSize.set(o.shadow, o.shadow); sun.shadow.map?.dispose(); sun.shadow.map = null; }
}

/** Compile shader programs for objects that only show up later (projectiles, telegraphs) so first use does not hitch. */
export function prewarm(camera: THREE.Camera, objs: THREE.Object3D[]): void {
  const g = new THREE.Group();
  g.add(...objs);
  scene.add(g);
  renderer.compile(scene, camera);
  scene.remove(g);
}

let lastW = 0, lastH = 0, lastDpr = 0;
/** Resize buffers only when the canvas size or pixel ratio actually changed (wheel zoom calls this too). */
export function resizeRender(): void {
  const w = innerWidth, h = innerHeight;
  if (w === lastW && h === lastH && q.dpr === lastDpr) return;
  lastW = w; lastH = h; lastDpr = q.dpr;
  renderer.setPixelRatio(q.dpr);
  renderer.setSize(w, h, false);
  composer.setPixelRatio(q.dpr);
  composer.setSize(w, h);
}

/** Size the sun's shadow frustum to cover the visible ground (half extents of the ortho view in world units). */
export function setShadowExtent(halfW: number, halfH: number, pitch: number): void {
  const half = Math.ceil(Math.hypot(halfW, halfH / Math.sin(pitch)) + 8);
  if (half === shadowHalf) return;
  shadowHalf = half;
  const c = sun.shadow.camera;
  c.left = -half; c.right = half; c.top = half; c.bottom = -half;
  c.updateProjectionMatrix();
}

// light-space axes of the shadow camera (it looks along -SUN_DIR with up = +Y)
const lx = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), SUN_DIR).normalize();
const ly = new THREE.Vector3().crossVectors(SUN_DIR, lx);
const snapT = new THREE.Vector3();
/** Follow the camera target, snapped to whole shadow texels so shadows do not shimmer while sailing. */
function placeSun(target: THREE.Vector3): void {
  const texel = (shadowHalf * 2) / sun.shadow.mapSize.x;
  const a = target.dot(lx), b = target.dot(ly);
  snapT.copy(target).addScaledVector(lx, Math.round(a / texel) * texel - a).addScaledVector(ly, Math.round(b / texel) * texel - b);
  sun.target.position.copy(snapT);
  sun.position.copy(snapT).addScaledVector(SUN_DIR, 90);
  sun.target.updateMatrixWorld();
}

/** Drop resolution, then bloom, when frames stay slow for ~2 s. Never raises it again (avoids oscillation). */
function adapt(dt: number): void {
  if (dt >= 0.09) return;
  q.ema += (dt - q.ema) * 0.05;
  if (pinned) return;
  q.slowFrames = q.ema > 0.021 ? q.slowFrames + 1 : 0;
  if (q.slowFrames < 120) return;
  q.slowFrames = 0;
  if (q.dpr > 1.01) tune({ dpr: Math.max(1, Math.round((q.dpr - 0.35) * 100) / 100) });
  else if (bloom.enabled) bloom.enabled = false;
}

/** CPU time of the whole frame (update + render submission), smoothed; `start` is the frame's start timestamp. */
export function renderFrame(target: THREE.Vector3, dt: number, start = performance.now()): void {
  adapt(dt);
  placeSun(target);
  renderer.info.reset();
  probe?.begin();
  composer.render(dt);
  probe?.end();
  q.cpu += (performance.now() - start - q.cpu) * 0.1;
}

// ---- optional GPU timing (?gpu): EXT_disjoint_timer_query_webgl2 around the composer, smoothed ----
let probe: { begin(): void; end(): void } | null = null;
function initGpuProbe(): void {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const ext = gl.getExtension('EXT_disjoint_timer_query_webgl2') as { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number } | null;
  if (!ext) return;
  let pending: WebGLQuery | null = null, active = false;
  probe = {
    begin() {
      if (pending) {
        if (!gl.getQueryParameter(pending, gl.QUERY_RESULT_AVAILABLE)) return;
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) q.gpu += (gl.getQueryParameter(pending, gl.QUERY_RESULT) / 1e6 - q.gpu) * 0.2;
        gl.deleteQuery(pending); pending = null;
      }
      pending = gl.createQuery();
      gl.beginQuery(ext.TIME_ELAPSED_EXT, pending as WebGLQuery);
      active = true;
    },
    end() { if (active) { gl.endQuery(ext.TIME_ELAPSED_EXT); active = false; } },
  };
}
