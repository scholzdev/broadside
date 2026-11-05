import * as THREE from 'three';

// ---- gameplay overlays drawn on the water: weapon arcs and the mortar telegraph ----

/** Fire-arc wedge: faint tinted fill fading outward, dashed rim at max range, soft side edges. Ring lies in XZ. */
export function makeArc(inner: number, outer: number, start: number, len: number, color: number): THREE.Mesh {
  const g = new THREE.RingGeometry(inner, outer, 32, 1, start, len);
  g.rotateX(Math.PI / 2); // ring (x,y) -> world (x,z): angle a from bow toward port maps to (sin a, cos a)
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(color) }, uIn: { value: inner }, uOut: { value: outer }, uStart: { value: start }, uLen: { value: len } },
    vertexShader: /* glsl */ `
      varying vec2 vP;
      void main() { vP = position.xz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uIn, uOut, uStart, uLen;
      varying vec2 vP;
      void main() {
        float r = length(vP);
        float rel = mod(atan(vP.y, vP.x) - uStart, 6.2831853);
        float side = min(rel, uLen - rel) * r;
        float fill = 0.045 * (1.0 - smoothstep(uIn, uOut, r)) + 0.012;
        float rim = (1.0 - smoothstep(0.0, 0.14, abs(r - uOut + 0.12))) * step(0.45, fract(rel * r * 0.8));
        float edge = (1.0 - smoothstep(0.0, 0.12, side)) * (1.0 - smoothstep(uIn, uOut * 1.1, r)) * 0.35;
        float a = max(fill, max(rim * 0.5, edge));
        gl_FragColor = vec4(uColor, a);
      }`,
  });
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = 0;
  return mesh;
}

/** Mortar telegraph: pulsing red rim plus a disc that fills as the shell falls (scale the `fill` child by flight progress). */
const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff3a22).multiplyScalar(2.2), transparent: true, opacity: 0.85, depthWrite: false });
const fillMat = new THREE.MeshBasicMaterial({ color: 0xff2a14, transparent: true, opacity: 0.22, depthWrite: false });
const ringGeo = new THREE.RingGeometry(2.6, 3, 40).rotateX(-Math.PI / 2);
const fillGeo = new THREE.CircleGeometry(3, 40).rotateX(-Math.PI / 2);
export function makeTelegraph(): THREE.Mesh {
  const ring = new THREE.Mesh(ringGeo, ringMat);
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.name = 'fill';
  fill.position.y = -0.01;
  fill.scale.setScalar(0.01);
  ring.add(fill);
  ring.renderOrder = 0;
  return ring;
}
