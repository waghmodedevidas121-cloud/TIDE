/**
 * Boat simulation. Engine-independent.
 *
 * Position is stored in integer simulation units with the cell being
 * floor(position / UNITS_PER_CELL). A heading is only ever applied when
 * both coordinates sit exactly on a cell line, and every step is clamped so
 * it lands exactly on the next cell line -- a slow cell can never overshoot.
 * This is the one rule that makes Paper.io feel crisp, and it is the
 * reason we keep 4-directional input rather than adopting 360-degree
 * smoothness, which breaks deterministic lockstep.
 */

import {
  CELL_PX,
  DEEP_SPEED_UNITS,
  DIR_DX,
  DIR_DY,
  Dir,
  SHALLOW_SPEED_UNITS,
  SPAWNS,
  UNITS_PER_CELL,
} from './constants';
import { isPassable } from './terrain';
import { terrainAt, type GameMap } from './mapLoader';

export interface BoatSnapshot {
  readonly row: number;
  readonly col: number;
  readonly heading: Dir;
  readonly posX: number;
  readonly posY: number;
  readonly blocked: boolean;
}

export class Boat {
  row: number;
  col: number;
  heading: Dir;
  pendingHeading: Dir;
  posX: number;
  posY: number;
  blocked = false;

  constructor(row: number, col: number, heading: Dir = Dir.DOWN) {
    this.row = row;
    this.col = col;
    this.heading = heading;
    this.pendingHeading = heading;
    this.posX = col * UNITS_PER_CELL;
    this.posY = row * UNITS_PER_CELL;
  }

  static atSpawn(index: number, heading: Dir = Dir.DOWN): Boat {
    const spawn = SPAWNS[index];
    if (!spawn) throw new Error(`no spawn point ${index}`);
    return new Boat(spawn.row, spawn.col, heading);
  }

  /** Queue a heading change. A reversal is rejected -- you cannot turn into
   *  your own tail. Same axis is a no-op. */
  input(dir: Dir): void {
    const axis = (a: Dir) => a % 2;
    const isReversal = (this.heading + 2) % 4 === dir;
    if (isReversal) return;
    // Same axis: only apply immediately if we are on a cell line, otherwise
    // keep it buffered so the turn still happens at the next line.
    if (axis(dir) === axis(this.heading)) {
      if (this.onCellLine()) this.heading = dir;
      else this.pendingHeading = dir;
      return;
    }
    this.pendingHeading = dir;
  }

  /** Both coordinates on a cell line. */
  onCellLine(): boolean {
    return this.posX % UNITS_PER_CELL === 0 && this.posY % UNITS_PER_CELL === 0;
  }

  currentCell(): { row: number; col: number } {
    return {
      row: Math.floor(this.posY / UNITS_PER_CELL),
      col: Math.floor(this.posX / UNITS_PER_CELL),
    };
  }

  /** Speed in simulation units per tick, from the cell the boat is on. */
  speedUnits(map: GameMap): number {
    const { row, col } = this.currentCell();
    const terrain = terrainAt(map, row, col);
    if (!isPassable(terrain)) return 0;
    return terrain === 1 /* SHALLOW */ ? SHALLOW_SPEED_UNITS : DEEP_SPEED_UNITS;
  }

  /**
   * Advance one tick. Returns the cell the boat is in after the step, which
   * is how M3 will later detect "entered own territory" without re-checking
   * in the renderer.
   */
  step(map: GameMap): { row: number; col: number } {
    this.blocked = false;

    // 1. Consume buffered heading exactly on a cell line.
    if (this.onCellLine()) {
      const next = this.pendingHeading;
      const isReversal = (this.heading + 2) % 4 === next;
      if (!isReversal) this.heading = next;
    }

    const { row, col } = this.currentCell();
    const dx = DIR_DX[this.heading];
    const dy = DIR_DY[this.heading];

    // The cell immediately ahead in the direction of travel.
    const aheadRow = row + dy;
    const aheadCol = col + dx;

    // Sand and out-of-bounds block instead of killing in Phase 1. A boat
    // that points into a wall stays put until it turns.
    const aheadPassable =
      aheadRow >= 0 &&
      aheadCol >= 0 &&
      aheadRow < map.size &&
      aheadCol < map.size &&
      isPassable(terrainAt(map, aheadRow, aheadCol));

    if (!aheadPassable) {
      this.blocked = true;
      return { row, col };
    }

    const speed = this.speedUnits(map);

    // 2. Distance to the next cell line along the movement axis.
    let dist: number;
    if (dy !== 0) {
      const rem = this.posY % UNITS_PER_CELL;
      dist = rem === 0 ? UNITS_PER_CELL : dy > 0 ? UNITS_PER_CELL - rem : rem;
    } else {
      const rem = this.posX % UNITS_PER_CELL;
      dist = rem === 0 ? UNITS_PER_CELL : dx > 0 ? UNITS_PER_CELL - rem : rem;
    }

    // 3. Clamp: never cross a cell line this tick.
    const step = Math.min(speed, dist);
    this.posY += dy * step;
    this.posX += dx * step;

    this.row = Math.floor(this.posY / UNITS_PER_CELL);
    this.col = Math.floor(this.posX / UNITS_PER_CELL);
    return { row: this.row, col: this.col };
  }

  /** World position in pixels for the renderer. */
  worldX(): number {
    return (this.posX / UNITS_PER_CELL) * CELL_PX;
  }
  worldY(): number {
    return (this.posY / UNITS_PER_CELL) * CELL_PX;
  }

  snapshot(): BoatSnapshot {
    const { row, col } = this.currentCell();
    return {
      row,
      col,
      heading: this.heading,
      posX: this.posX,
      posY: this.posY,
      blocked: this.blocked,
    };
  }
}
