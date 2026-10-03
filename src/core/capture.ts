/**
 * Area capture -- the Paper.io algorithm, ported 1:1.
 *
 * A boat closes a loop by re-entering territory it owns. fillTail then:
 *   1. claims the trail cells themselves, and
 *   2. flood-fills from each trail neighbour. Any region that never touches
 *      the map border is enclosed -> claimed. Regions that leak to the border
 *      are abandoned.
 *
 * The shared `seen` array means the outside region is explored once and then
 * computed as "open" for every subsequent neighbour, so two neighbour probes
 * around the same inside pocket cannot double-claim it. That exclusion trick
 * is the reason the algorithm needs no "which side am I on" reasoning.
 *
 * Phase 1 deviation, zero terrain: the flood treats sand as passable. At M6
 * exactly one extra condition (`!isPassable(terrain)`) is added to the flood
 * boundary test and capture becomes the bathymetry rule.
 */

import type { Territory } from './territory';
import type { Trail } from './trail';

export function fillTail(
  trail: Trail,
  territory: Territory,
  ownerId: number,
  size: number,
): number {
  const n = size * size;
  const seen = new Uint8Array(n);
  const queue: number[] = [];
  let claimed = 0;

  const isOwn = (idx: number): boolean => territory.getAtIndex(idx) === ownerId;
  const isTrail = (idx: number): boolean => trail.has(idx);

  // Seed the BFS with every trail cell so corners and diagonals of the
  // perimeter are all visited.
  for (const idx of trail.cells) {
    if (!seen[idx]) {
      seen[idx] = 1;
      queue.push(idx);
    }
  }

  while (queue.length > 0) {
    const t = queue.shift()!;
    const r = Math.floor(t / size);
    const c = t % size;

    // The trail cell itself is captured.
    territory.setAtIndex(t, ownerId);
    claimed += 1;

    const neighbours: Array<[number, number]> = [
      [r - 1, c],
      [r + 1, c],
      [r, c - 1],
      [r, c + 1],
    ];

    for (const [nr, nc] of neighbours) {
      if (nr < 0 || nc < 0 || nr >= size || nc >= size) continue;
      const nidx = nr * size + nc;
      if (seen[nidx] || isOwn(nidx)) continue;

      if (isTrail(nidx)) {
        // Another trail cell: join the perimeter, do not flood into it.
        seen[nidx] = 1;
        queue.push(nidx);
        continue;
      }

      // Candidate pocket. Flood it. If it escapes to the border it is open
      // space, not a capture.
      const pocket = floodFillPocket(trail, territory, ownerId, size, seen, nr, nc);
      if (!pocket.escaped) {
        for (const idx of pocket.cells) {
          territory.setAtIndex(idx, ownerId);
          claimed += 1;
        }
      }
    }
  }

  return claimed;
}

interface Pocket {
  escaped: boolean;
  cells: number[];
}

function floodFillPocket(
  trail: Trail,
  territory: Territory,
  ownerId: number,
  size: number,
  seen: Uint8Array,
  startRow: number,
  startCol: number,
): Pocket {
  const stack: Array<[number, number]> = [[startRow, startCol]];
  const cells: number[] = [];
  let escaped = false;

  const isTrail = (idx: number): boolean => trail.has(idx);

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;

    // Leaked to the border -> the whole pocket is open.
    if (r < 0 || c < 0 || r >= size || c >= size) {
      escaped = true;
      continue;
    }

    const idx = r * size + c;
    if (seen[idx] || isTrail(idx) || territory.getAtIndex(idx) === ownerId) continue;

    seen[idx] = 1;
    if (!escaped) cells.push(idx);

    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }

  return { escaped, cells };
}