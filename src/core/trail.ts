/**
 * Trail storage. A flat set of cell indices is sufficient at 48x48 (<= 2304
 * entries) and keeps both the hit test and the renderer trivial: the hit
 * query is "is index in set", the render is "draw every index in set".
 * Render-time RLE was an optimisation in Paper.io that M3 deliberately does
 * not take.
 */

export class Trail {
  readonly cells = new Set<number>();

  reset(): void {
    this.cells.clear();
  }

  add(idx: number): void {
    this.cells.add(idx);
  }

  has(idx: number): boolean {
    return this.cells.has(idx);
  }

  get length(): number {
    return this.cells.size;
  }
}