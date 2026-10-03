/**
 * Simulation orchestrator. Owns the map, territory, and every boat.
 * One tick = boat.step + trail/capture bookkeeping.
 */

import { GRID, SPAWNS, TICK_HZ } from './constants';
import type { Boat } from './boat';
import type { GameMap } from './mapLoader';
import { Territory } from './territory';
import { fillTail } from './capture';

export class Sim {
  readonly map: GameMap;
  readonly territory: Territory;
  readonly boats: Boat[] = [];
  tick = 0;

  constructor(map: GameMap) {
    this.map = map;
    this.territory = new Territory(map);
    this.seedSpawns();
  }

  addBoat(boat: Boat): void {
    this.boats.push(boat);
  }

  /** Every player starts with a 3x3 block so there is "own land" to leave
   *  and return to. Same behaviour as Paper.io's initPlayer. */
  private seedSpawns(): void {
    SPAWNS.forEach((spawn, index) => {
      const owner = index + 1; // P1 = 1, P2 = 2 -- bot is M7
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = spawn.row + dr;
          const c = spawn.col + dc;
          if (r >= 0 && c >= 0 && r < GRID && c < GRID) {
            this.territory.set(r, c, owner);
          }
        }
      }
    });
  }

  step(): void {
    this.tick += 1;
    for (const boat of this.boats) {
      const cell = boat.step(this.map);

      const owner = this.territory.get(cell.row, cell.col);
      if (owner === boat.ownerId) {
        // Back on own land: bank whatever the trail encloses, if anything.
        if (boat.trail.length > 0) {
          fillTail(boat.trail, this.territory, boat.ownerId, this.map.size);
          boat.trail.reset();
        }
      } else {
        // Outside own land: extend the trail by the cell just entered.
        boat.trail.add(cell.row * GRID + cell.col);
      }
    }
  }

  get rates() {
    return { tickHZ: TICK_HZ, cells: this.territory.size * this.territory.size };
  }
}