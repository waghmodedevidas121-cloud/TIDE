import Phaser from 'phaser';
import { WORLD_PX } from './core/constants';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { MAP_BACKGROUND } from './render/terrainPainter';

/**
 * TIDE prototype. Phase 1 / M1.
 *
 * The canvas is sized to the world and scale-fitted, so the entire map is
 * always visible on any display. That is not a shortcut -- it is a hard
 * requirement of the prototype's success condition.
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: 'game',
  width: WORLD_PX,
  height: WORLD_PX,
  backgroundColor: MAP_BACKGROUND,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    roundPixels: false,
  },
  banner: false,
  scene: [BootScene, GameScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);