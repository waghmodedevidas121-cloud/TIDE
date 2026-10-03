import Phaser from 'phaser';
import mapSource from '../assets/tide.map?raw';
import { CELL_PX, GRID } from '../core/constants';
import { parseMap, type GameMap } from '../core/mapLoader';
import { UI_FAIL } from '../render/terrainPainter';

/**
 * Parses and validates the map before any scene renders, so a malformed map
 * fails loudly at boot rather than showing a broken board.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    let map: GameMap;
    try {
      map = parseMap(mapSource, GRID);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // eslint-disable-next-line no-console
      console.error(`[TIDE] map parse failed: ${message}`);
      this.add
        .text((GRID * CELL_PX) / 2, (GRID * CELL_PX) / 2, `MAP PARSE FAILED\n${message}`, {
          fontFamily: 'Consolas, monospace',
          fontSize: '18px',
          color: UI_FAIL,
          align: 'center',
          wordWrap: { width: 900 },
        })
        .setOrigin(0.5, 0.5);
      return;
    }

    this.scene.start('Game', { map });
  }
}