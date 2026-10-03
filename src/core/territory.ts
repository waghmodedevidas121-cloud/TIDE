/**
 * Territory ownership. Flat typed array of owner IDs.
 *   0 = neutral, 1 = player, 2..n = bots.
 * Claims are counted incrementally so the HUD never rescans the grid.
 * A dirty set drives the renderer so we never full-redraw.
 */

import type { GameMap } from './mapLoader';

export const NEUTRAL = 0;

export class Territory {
  readonly size: number;
  readonly owner: Uint8Array;
  /** Live cell count per owner id. Index 0 is neutral. */
  readonly counts: Uint32Array;
  readonly dirty: Set<number> = new Set();

  private capacity = 4;

  constructor(map: GameMap) {
    this.size = map.size;
    const n = this.size * this.size;
    this.owner = new Uint8Array(n);
    this.counts = new Uint32Array(this.capacity);
    this.counts[NEUTRAL] = n;
  }

  get(row: number, col: number): number {
    return this.owner[row * this.size + col];
  }

  getAtIndex(idx: number): number {
    return this.owner[idx];
  }

  set(row: number, col: number, id: number): number {
    return this.setAtIndex(row * this.size + col, id);
  }

  setAtIndex(idx: number, id: number): number {
    const prev = this.owner[idx];
    if (prev === id) return prev;
    if (id >= this.capacity) this.grow(id);
    this.owner[idx] = id;
    this.counts[prev]--;
    this.counts[id]++;
    this.dirty.add(idx);
    return prev;
  }

  private grow(min: number): void {
    let cap = this.capacity;
    while (cap <= min) cap *= 2;
    const next = new Uint32Array(cap);
    next.set(this.counts);
    // counts array is effectively a fixed small record; by M3 max owners = 2
    (this as { counts: Uint32Array }).counts = next;
    this.capacity = cap;
  }

  resetDirty(): void {
    this.dirty.clear();
  }

  /** Fraction of the map (0..1) owned by an id. */
  share(id: number): number {
    return this.counts[id] / (this.size * this.size);
  }
}