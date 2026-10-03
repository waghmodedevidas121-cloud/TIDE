import type Phaser from 'phaser';
import { CELL_PX } from '../core/constants';

/**
 * Boat colours. White core so it reads as "you" at a glance, player hue for
 * the ring so two boats never confuse.
 */
export const BOAT_COLORS = [0x4fc3f7, 0xf4515e] as const;

export function drawBoat(
  gfx: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  color: number,
  blocked: boolean,
): void {
  const size = CELL_PX * 0.66;
  const pad = (CELL_PX - size) / 2;

  if (blocked) {
    // Distinct visual tell that the boat is pressed against a wall.
    gfx.fillStyle(0xf4515e, 0.9);
    gfx.fillRect(x, y, CELL_PX, CELL_PX);
  }

  gfx.fillStyle(0xffffff, 1);
  gfx.fillRect(x + pad, y + pad, size, size);

  gfx.lineStyle(2.5, color, 1);
  gfx.strokeRect(x + pad, y + pad, size, size);
}