import type { ShipFrame } from '../models';
import { hullDeck, hullX } from '../hull';
import type { V3 } from '../geo';

// ---- slot anchor points on a built hull (ship space, scale 1): everything derives from length, beam, freeboard and castles ----

const CASTLE_END = 0.27, POOP_END = 0.27 * 0.45, FORE_START = 0.8, BULWARK = 0.2;

export interface Mast { z: number; base: number; top: number; lower: number }

/** Geometry queries for one ship. Stations t run 0 (stern) .. 1 (bow); +x is port. */
export class Anchors {
  readonly L: number; readonly B: number; readonly tip: V3; readonly sternTop: number;
  readonly masts: Mast[]; readonly main: Mast; readonly castle: number; readonly fore: number;
  constructor(readonly f: ShipFrame) {
    const h = f.h;
    this.L = h.L; this.B = h.B; this.tip = f.tip; this.sternTop = f.sternTop; this.castle = h.castle; this.fore = h.forecastle;
    this.masts = f.masts.map(m => ({ z: m.z, base: m.base, top: m.base + m.h, lower: m.base + m.h * 0.62 }));
    // the mainmast: the second mast of three or more, otherwise the tallest
    this.main = this.masts.length >= 3 ? this.masts[1] : this.masts.reduce((a, m) => (m.top > a.top ? m : a), this.masts[0]);
  }
  z(t: number): number { return (t - 0.5) * this.L; }
  t(z: number): number { return z / this.L + 0.5; }
  /** Gunwale (main rail) height and half-width at station t. */
  rail(t: number): number { return hullDeck(this.f.h, t); }
  railX(t: number): number { return hullX(this.f.h, t, 1); }
  /** Hull half-width at freeboard fraction s (0 = waterline). */
  sideX(t: number, s: number): number { return hullX(this.f.h, t, s); }
  /** Walkable deck height at t: main deck, stern castle, poop deck or forecastle. */
  top(t: number): number {
    const y = this.rail(t);
    if (this.castle > 0.6 && t < POOP_END) return y + this.castle + 0.3 - BULWARK * 0.6;
    if (this.castle > 0 && t < CASTLE_END) return y + this.castle - BULWARK * 0.6;
    if (this.fore > 0 && t > FORE_START && t < 0.95) return y + this.fore - BULWARK * 0.6;
    return y - BULWARK;
  }
  /** Top of the bulwark at t, castles included (where rail mounts sit). */
  railTop(t: number): number {
    const y = this.rail(t);
    if (this.castle > 0.6 && t < POOP_END) return y + this.castle + 0.3;
    if (this.castle > 0 && t < CASTLE_END) return y + this.castle;
    if (this.fore > 0 && t > FORE_START && t < 0.95) return y + this.fore;
    return y;
  }
  /** Inner half-width of the walkable deck at t (castle decks are a little narrower). */
  deckX(t: number): number { return this.railX(t) * (t < CASTLE_END && this.castle > 0 ? 0.86 : 0.9); }
  /** Station range of mount `idx` among `n` side mounts: one mount uses the waist, two split it fore and aft. */
  sideRange(idx: number, n: number): [number, number] {
    if (n <= 1) return [0.32, 0.74];
    return idx === 0 ? [0.52, 0.78] : [0.29, 0.49];
  }
  /** Deck spot for a deck-slot module: between fore- and mainmast (on the hatch). */
  deckSpot(): number {
    const m = this.masts;
    return m.length > 1 ? (m[0].z + m[1].z) / 2 : m[0].z - 0.9;
  }
  /** Is z clear of masts, the hatch, capstan and other deck furniture? */
  clearAt(z: number, r = 0.32): boolean {
    for (const m of this.masts) if (Math.abs(m.z - z) < r) return false;
    return true;
  }
}
