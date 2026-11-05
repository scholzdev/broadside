import * as THREE from 'three';

/**
 * Shared uniform objects of the final pass (render.ts puts them on the ShaderPass, whose own copies are clones).
 * Grade: exposure, saturation, shadow / highlight tints (per sea). Fog (Fog Coast): a world-distance mask around the player:
 * uFogC = player uv, uFogK = world units per uv on the sea plane (x, y), uFogP = player position in screen axes (anchors the wisps).
 */
export const POST = {
  uExposure: { value: 1.12 }, uSat: { value: 1.1 }, uLo: { value: new THREE.Vector3(0.93, 1.0, 1.06) }, uHi: { value: new THREE.Vector3(1.05, 1.0, 0.93) },
  uFogOn: { value: 0 }, uFogR: { value: 16 }, uFogC: { value: new THREE.Vector2(0.5, 0.5) }, uFogK: { value: new THREE.Vector2(1, 1) },
  uFogP: { value: new THREE.Vector2() }, uFogCol: { value: new THREE.Color(0x7d8f88) }, uFogT: { value: 0 },
  /** Fog Coast lighthouse beams: xy = source relative to the player in screen-plane units, z = beam angle (0 z with xy far away = unused). */
  uBeam: { value: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)] }, uBeamN: { value: 0 },
};

/**
 * Final full-screen pass: colour grade, vignette, ACES filmic tone mapping (same fit as three's
 * ACESFilmicToneMapping), sRGB encode and a little dither, in one pass over the linear HDR buffer.
 */
export const FinalShader = {
  name: 'FinalShader',
  uniforms: { tDiffuse: { value: null }, uVig: { value: 0.5 }, uExposure: { value: 1.12 }, uSat: { value: 1.1 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse; uniform float uVig, uExposure, uSat; varying vec2 vUv;
    uniform vec3 uLo, uHi, uFogCol; uniform float uFogOn, uFogR, uFogT; uniform vec2 uFogC, uFogK, uFogP; uniform vec3 uBeam[3]; uniform float uBeamN;
    float h12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
    float vn(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h12(i), h12(i + vec2(1, 0)), f.x), mix(h12(i + vec2(0, 1)), h12(i + vec2(1, 1)), f.x), f.y); }
    vec3 rrtOdt(vec3 v) { vec3 a = v * (v + 0.0245786) - 0.000090537; vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081; return a / b; }
    vec3 aces(vec3 c) {
      const mat3 inM = mat3(vec3(0.59719, 0.07600, 0.02840), vec3(0.35458, 0.90834, 0.13383), vec3(0.04823, 0.01566, 0.83777));
      const mat3 outM = mat3(vec3(1.60475, -0.10208, -0.00327), vec3(-0.53108, 1.10813, -0.07276), vec3(-0.07367, -0.00605, 1.07602));
      return clamp(outM * rrtOdt(inM * (c * uExposure / 0.6)), 0.0, 1.0);
    }
    vec3 srgb(vec3 c) { return mix(1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, c * 12.92, vec3(lessThanEqual(c, vec3(0.0031308)))); }
    void main() {
      vec3 col = max(texture2D(tDiffuse, vUv).rgb, 0.0);
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = max(mix(vec3(l), col, uSat), 0.0);
      col *= mix(uLo, uHi, smoothstep(0.02, 0.9, l)); // per-sea grade (Calm Seas: teal shadows, warm highlights)
      if (uFogOn > 0.0) {
        vec2 q = (vUv - uFogC) * uFogK, w = (q + uFogP) * 0.09;
        float n = vn(w + vec2(uFogT * 0.12, uFogT * 0.05)) * 0.65 + vn(w * 2.3 - vec2(uFogT * 0.2, 0.0)) * 0.35;
        float m = smoothstep(uFogR - 3.5, uFogR + 2.5, length(q) + (n - 0.5) * 5.0) * uFogOn;
        float bm = 0.0;
        for (int i = 0; i < 3; i++) {
          if (float(i) >= uBeamN) break;
          vec2 bd = q - uBeam[i].xy; float bl = length(bd);
          for (int k = 0; k < 2; k++) { // two opposite arms
            float da = abs(mod(atan(bd.x, bd.y) - uBeam[i].z - float(k) * 3.14159 + 3.14159, 6.28318) - 3.14159);
            bm += exp(-da * da * 90.0) * smoothstep(1.5, 8.0, bl) * exp(-bl * 0.018);
          }
        }
        bm = min(bm, 1.0);
        m *= 1.0 - 0.8 * bm;
        col = mix(col, uFogCol * (0.8 + 0.4 * n), m * 0.97);
        col += vec3(1.0, 0.86, 0.5) * bm * (0.3 + 0.5 * m) * (0.85 + 0.3 * n);
      }
      vec2 d = vUv - 0.5;
      col *= 1.0 - uVig * dot(d, d) * 1.6;
      vec3 o = srgb(aces(col));
      o += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
      gl_FragColor = vec4(o, 1.0);
    }`,
};
