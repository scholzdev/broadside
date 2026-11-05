import type * as THREE from 'three';
import type { Builder, V3 } from '../geo';
import type { Anchors } from './anchors';
import type { Slot } from '../modules';

/** A part that moves on its own (built into its own small mesh around its local origin, placed at `at`). */
export interface Anim {
  geo: THREE.BufferGeometry; at: V3;
  /** spin: slow turn about y; swing: pendulum about x/z; bob: float up and down. */
  kind: 'spin' | 'swing' | 'bob';
  /** Additive glow sprite at the part (HDR colour, size in ship units); it breathes with the part. */
  halo?: { color: number; size: number; dy?: number };
}

/** Per-attachment build input: which mount of the slot, how many mounts the slot has, the broadside ball count. */
export interface Ctx { idx: number; n: number; balls: number; color: number; anims: Anim[] }

export type Build = (b: Builder, a: Anchors, c: Ctx) => void;
/** One attachment: its slot (used when the module table does not know the id yet), the builder, and the inputs its look depends on. */
export interface Attach {
  slot: Slot; build: Build; usesBalls?: boolean; color: number;
  /** Slots with two mounts (n = 2): the build is shifted sideways so mount 0 sits at +half and mount 1 at -half. `x` is the builder's own centre; `pin` fixes the side (the pump's spout only works to starboard, so the other mount takes the opposite side); with one mount nothing moves. Builders that already place by idx omit this. */
  lane?: { x: number; half: number; pin?: 1 | -1 };
}
