export interface Pt { x: number; z: number }

export const wrap = (a: number): number => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const lerpAngle = (a: number, b: number, t: number): number => a + wrap(b - a) * t;

/** Previous fixed-step pose, snapshotted before each step so rendering can interpolate. */
export interface Prev { px: number; pz: number; ph: number }
export const snap = (o: Pt & { heading?: number } & Prev): void => { o.px = o.x; o.pz = o.z; o.ph = o.heading ?? 0; };

/** Uniform-grid spatial hash. Rebuild each step with clear() + insert(). */
export class Grid<T extends Pt> {
  private cells = new Map<number, T[]>();
  constructor(private size: number) {}
  private key(cx: number, cz: number): number { return (cx + 32768) * 65536 + (cz + 32768); }
  clear(): void {
    for (const [k, a] of this.cells) {
      if (a.length === 0) this.cells.delete(k);
      else a.length = 0;
    }
  }
  insert(o: T): void {
    const k = this.key(Math.floor(o.x / this.size), Math.floor(o.z / this.size));
    const a = this.cells.get(k);
    if (a) a.push(o); else this.cells.set(k, [o]);
  }
  query(x: number, z: number, r: number, cb: (o: T) => void): void {
    const s = this.size;
    const x0 = Math.floor((x - r) / s), x1 = Math.floor((x + r) / s);
    const z0 = Math.floor((z - r) / s), z1 = Math.floor((z + r) / s);
    for (let cx = x0; cx <= x1; cx++) {
      for (let cz = z0; cz <= z1; cz++) {
        const a = this.cells.get(this.key(cx, cz));
        if (a) for (let i = 0; i < a.length; i++) cb(a[i]);
      }
    }
  }
}
