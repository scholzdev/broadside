import type { Enemy } from './enemies';

// ---- target leading: where to aim so a shot launched now meets a moving enemy. Enemy velocity is heading * speed (0 while stunned / time-stopped). ----
/** Flight time for a shot of speed `s` to meet a target at offset (dx,dz) moving with (vx,vz); 0 if it can't catch up. */
export function intercept(dx: number, dz: number, vx: number, vz: number, s: number): number {
  const a = vx * vx + vz * vz - s * s, b = 2 * (dx * vx + dz * vz), c = dx * dx + dz * dz;
  if (Math.abs(a) < 1e-6) return b < 0 ? -c / b : 0;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return 0;
  const r = Math.sqrt(disc), t1 = (-b - r) / (2 * a), t2 = (-b + r) / (2 * a);
  const t = Math.min(t1, t2) > 0 ? Math.min(t1, t2) : Math.max(t1, t2);
  return t > 0 ? t : 0;
}

const out = { x: 0, z: 0 };
const vel = (e: Enemy): [number, number] => [Math.sin(e.heading) * e.speed, Math.cos(e.heading) * e.speed];

/** Intercept point for a straight shot of speed `speed` from (fx,fz); the enemy's current position when it can't be caught. Returns a shared object. */
export function leadShot(fx: number, fz: number, e: Enemy, speed: number): { x: number; z: number } {
  const [vx, vz] = vel(e), t = intercept(e.x - fx, e.z - fz, vx, vz, speed);
  out.x = e.x + vx * t; out.z = e.z + vz * t;
  return out;
}

/** Aim point for a lob whose flight time is `flight(distance)`: fixed-point iteration on T. Returns a shared object. */
export function leadLob(fx: number, fz: number, e: Enemy, flight: (d: number) => number): { x: number; z: number } {
  const [vx, vz] = vel(e);
  let x = e.x, z = e.z;
  for (let i = 0; i < 3; i++) {
    const T = flight(Math.hypot(x - fx, z - fz));
    x = e.x + vx * T; z = e.z + vz * T;
  }
  out.x = x; out.z = z;
  return out;
}

/** The enemy's position `t` seconds from now. Returns a shared object. */
export function leadBy(e: Enemy, t: number): { x: number; z: number } {
  out.x = e.x + Math.sin(e.heading) * e.speed * t; out.z = e.z + Math.cos(e.heading) * e.speed * t;
  return out;
}
