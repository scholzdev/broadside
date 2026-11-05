/**
 * Sea swell: h = sum a * sin(kx*x + kz*z + w*t). This table is the single source for the CPU height
 * (waveH, used for ship poses) and the GPU height (WAVE_GLSL, used by the sea, wakes and flat particles).
 */
const WAVES: readonly (readonly [kx: number, kz: number, w: number, a: number])[] = [
  [0.35, 0, 1.1, 0.1],
  [0, 0.28, 0.9, 0.1],
  [0.18, 0.18, 0.6, 0.14],
];

/** Sea height at a world point; matches the vertex displacement in the sea shader. */
export const waveH = (x: number, z: number, t: number): number => {
  let h = 0;
  for (const [kx, kz, w, a] of WAVES) h += Math.sin(kx * x + kz * z + w * t) * a;
  return h;
};

const f = (n: number): string => n.toFixed(4);
const phase = ([kx, kz, w]: readonly number[]): string => `${f(kx)} * p.x + ${f(kz)} * p.y + ${f(w)} * t`;
/** GLSL: `float waveH(vec2 p, float t)` and its gradient `vec2 waveGrad(vec2 p, float t)` (p = world xz). */
export const WAVE_GLSL = /* glsl */ `
float waveH(vec2 p, float t) {
  return ${WAVES.map(w => `sin(${phase(w)}) * ${f(w[3])}`).join(' + ')};
}
vec2 waveGrad(vec2 p, float t) {
  vec2 g = vec2(0.0);
  ${WAVES.map(w => `g += vec2(${f(w[0])}, ${f(w[1])}) * (cos(${phase(w)}) * ${f(w[3])});`).join('\n  ')}
  return g;
}`;

/** Render clock shared by every animated shader (same `t` that main.ts passes to seaPose). */
export const uTime = { value: 0 };

export interface Pose { y: number; pitch: number; roll: number }
const GAIN = 1.6;
/**
 * Ship pose from the wave function sampled at bow, stern, port and starboard.
 * Heading 0 = +Z, port = +X in model space: pitch is rotation.x (bow up = negative), roll is rotation.z (port up = positive).
 */
export function seaPose(x: number, z: number, h: number, t: number, halfL: number, halfB: number, out: Pose): Pose {
  const fx = Math.sin(h), fz = Math.cos(h), px = fz, pz = -fx;
  const bow = waveH(x + fx * halfL, z + fz * halfL, t), stern = waveH(x - fx * halfL, z - fz * halfL, t);
  const port = waveH(x + px * halfB, z + pz * halfB, t), star = waveH(x - px * halfB, z - pz * halfB, t);
  out.y = (bow + stern + port + star) * 0.25 * GAIN;
  out.pitch = -((bow - stern) / (2 * halfL)) * GAIN;
  out.roll = ((port - star) / (2 * halfB)) * GAIN;
  return out;
}
