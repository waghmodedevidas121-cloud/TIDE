import type Phaser from 'phaser';
import { CELL_PX, GRID, WORLD_PX } from '../core/constants';
import { TERRAIN } from '../core/terrain';
import type { GameMap } from '../core/mapLoader';

/**
 * Terrain palette.
 *
 * Sand is the only warm hue on screen. That single decision is what makes the
 * map readable in under a second, before any UI explains anything -- and it
 * is the reason "land" is identifiable with no instruction at all, which is
 * part of the M1 exit criteria.
 *
 * Deep and shallow are two full steps apart in value so the speed penalty is
 * visible before it is felt.
 */
export const TERRAIN_COLORS = {
  [TERRAIN.DEEP]: 0x0d2f4a,
  [TERRAIN.SHALLOW]: 0x2e9fd4,
  [TERRAIN.SAND]: 0xd9c48a,
} as const;

export const MAP_BACKGROUND = 0x060d15;
export const MAP_BORDER = 0x2a4256;

export const UI_TEXT = '#c9d8e4';
export const UI_PASS = '#5ddc9a';
export const UI_FAIL = '#f4515e';

/** Draws the whole map once into a texture. Static for the milestone. */
export function paintTerrain(
  scene: Phaser.Scene,
  map: GameMap,
): Phaser.GameObjects.RenderTexture {
  const texture = scene.add.renderTexture(0, 0, WORLD_PX, WORLD_PX).setOrigin(0, 0);

  // Rasterised through a Graphics so the fill is done once, in one pass,
  // rather than as 2304 separate draw calls. No seams either.
  const gfx = scene.make.graphics({ x: 0, y: 0 }, false);
  for (let r = 0; r < map.size; r++) {
    for (let c = 0; c < map.size; c++) {
      gfx.fillStyle(TERRAIN_COLORS[map.terrain[r * map.size + c] as 0 | 1 | 2], 1);
      gfx.fillRect(c * CELL_PX, r * CELL_PX, CELL_PX, CELL_PX);
    }
  }
  texture.draw(gfx);
  gfx.destroy();

  // Hard frame on the outer boundary. The map edge is a death line, and it
  // has to be visible as a frame rather than inferred from where water ends.
  const border = scene.make.graphics({ x: 0, y: 0 }, false);
  border.lineStyle(3, MAP_BORDER, 1);
  border.strokeRect(0, 0, WORLD_PX, WORLD_PX);
  texture.draw(border);
  border.destroy();

  return texture;
}

/** Draws a faint cell grid. Terrain only, no territory -- M5 owns overlays. */
export function paintCellGrid(
  scene: Phaser.Scene,
): Phaser.GameObjects.Graphics {
  const gfx = scene.add.graphics();
  gfx.lineStyle(1, 0xffffff, 0.06);
  for (let i = 1; i < GRID; i++) {
    const p = i * CELL_PX;
    gfx.lineBetween(p, 0, p, WORLD_PX);
    gfx.lineBetween(0, p, WORLD_PX, p);
  }
  return gfx;
}