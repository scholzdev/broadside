import * as THREE from 'three';
import { NOISE_GLSL } from './glsl';
import { WAVE_GLSL, uTime } from './anim';

// ---- instanced particle batches: one draw call per batch. Per instance: iPos (xyz, size), iCol (rgb, alpha),
// iMisc (seed, rotation, age 0..1, unused). Billboards face the camera; flat ones lie on (and ride) the swell. ----

export type BatchKind = 'soft' | 'glow' | 'flat';

const vert = (flat: boolean): string => /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  attribute vec4 iPos; attribute vec4 iCol; attribute vec4 iMisc;
  uniform float uTime;
  varying vec2 vUv; varying vec4 vCol; varying vec3 vMisc;
  ${WAVE_GLSL}
  void main() {
    float c = cos(iMisc.y), s = sin(iMisc.y);
    vec2 q = mat2(c, s, -s, c) * position.xy * iPos.w;
    ${flat
      ? `vec3 wp = vec3(iPos.x + q.x, 0.0, iPos.z + q.y); wp.y = waveH(wp.xz, uTime) + iPos.y;`
      : `vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
         vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
         vec3 wp = iPos.xyz + right * q.x + up * q.y;`}
    vUv = uv; vCol = iCol; vMisc = iMisc.xzw;
    vec4 mvPosition = viewMatrix * vec4(wp, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const FRAG: Record<BatchKind, string> = {
  // smoke, spray, dust: lumpy sphere-shaded puff, lit from the upper left
  soft: /* glsl */ `
    vec2 p = vUv * 2.0 - 1.0;
    float n = vnoise(vUv * 3.2 + vMisc.x * 13.7) - 0.5;
    float d = length(p) + n * 0.45;
    float a = smoothstep(1.0, 0.55, d);
    vec3 nrm = normalize(vec3(p, sqrt(max(0.0, 1.0 - dot(p, p)))));
    float lit = 0.72 + 0.4 * max(0.0, dot(nrm, normalize(vec3(-0.5, 0.6, 0.6))));
    gl_FragColor = vec4(vCol.rgb * lit, vCol.a * a);`,
  // fire, flashes, sparks: additive HDR with a white-hot core
  glow: /* glsl */ `
    vec2 p = vUv * 2.0 - 1.0;
    float n = vnoise(vUv * 4.0 + vMisc.x * 9.1) - 0.5;
    float d = length(p) + n * 0.35 * (0.4 + vMisc.y);
    float a = smoothstep(1.0, 0.0, d);
    vec3 col = mix(vCol.rgb, vec3(1.0, 0.97, 0.88), smoothstep(0.55, 0.0, d) * (1.0 - vMisc.y));
    gl_FragColor = vec4(col * a * a * vCol.a * 3.2, 1.0);`,
  // foam on the water: blob that opens into a broken ring as it ages
  flat: /* glsl */ `
    vec2 p = vUv * 2.0 - 1.0;
    float d = length(p);
    float n = vnoise(p * 3.5 + vMisc.x * 7.3);
    float body = smoothstep(1.0, 0.82, d) * mix(1.0, smoothstep(0.35, 0.85, d + (n - 0.5) * 0.4), vMisc.y);
    float a = body * smoothstep(0.3, 0.62, n + 0.2 * (1.0 - vMisc.y));
    gl_FragColor = vec4(vCol.rgb, vCol.a * a * 0.75);`,
};

export function batchMaterial(kind: BatchKind): THREE.ShaderMaterial {
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  uniforms.uTime = uTime;
  return new THREE.ShaderMaterial({
    uniforms, fog: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: kind === 'glow' ? THREE.AdditiveBlending : THREE.NormalBlending,
    vertexShader: vert(kind === 'flat'),
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      varying vec2 vUv; varying vec4 vCol; varying vec3 vMisc;
      ${NOISE_GLSL}
      void main() {
        ${FRAG[kind]}
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}

/** A batch: instanced unit quad plus packed per-instance arrays. */
export interface Batch { mesh: THREE.Mesh; geo: THREE.InstancedBufferGeometry; pos: Float32Array; col: Float32Array; misc: Float32Array; cap: number }
export function makeBatch(kind: BatchKind, cap: number, order: number): Batch {
  const quad = new THREE.PlaneGeometry(2, 2);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = quad.index;
  geo.setAttribute('position', quad.attributes.position);
  geo.setAttribute('uv', quad.attributes.uv);
  const pos = new Float32Array(cap * 4), col = new Float32Array(cap * 4), misc = new Float32Array(cap * 4);
  for (const [name, arr] of [['iPos', pos], ['iCol', col], ['iMisc', misc]] as const) {
    const a = new THREE.InstancedBufferAttribute(arr, 4);
    a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute(name, a);
  }
  geo.instanceCount = 0;
  const mesh = new THREE.Mesh(geo, batchMaterial(kind));
  mesh.frustumCulled = false;
  mesh.renderOrder = order;
  return { mesh, geo, pos, col, misc, cap };
}
export function flushBatch(b: Batch, n: number): void {
  b.geo.instanceCount = n;
  for (const k of ['iPos', 'iCol', 'iMisc']) {
    const a = b.geo.attributes[k] as THREE.InstancedBufferAttribute;
    a.clearUpdateRanges();
    a.addUpdateRange(0, n * 4);
    a.needsUpdate = true;
  }
}
