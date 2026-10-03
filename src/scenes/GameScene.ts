import Phaser from 'phaser';
import { CELL_PX, GRID, WORLD_PX } from '../core/constants';
import type { GameMap } from '../core/mapLoader';
import { formatChecks, runMapChecks, type CheckSummary } from '../core/mapChecks';
import {
  MAP_BACKGROUND,
  paintCellGrid,
  paintTerrain,
  UI_FAIL,
  UI_PASS,
  UI_TEXT,
} from '../render/terrainPainter';

interface GameSceneData {
  map: GameMap;
}

/**
 * M1: static terrain render on a fixed, whole-map camera.
 *
 * The camera never scrolls and never zooms. Per the Phase 1 design this is
 * forced by the success condition -- a player cannot evaluate a route unless
 * they can see more than one route.
 */
export class GameScene extends Phaser.Scene {
  private map!: GameMap;
  private summary!: CheckSummary;

  constructor() {
    super('Game');
  }

  init(data: GameSceneData): void {
    this.map = data.map;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(MAP_BACKGROUND);

    paintTerrain(this, this.map);
    paintCellGrid(this);

    this.summary = runMapChecks(this.map, GRID);
    // eslint-disable-next-line no-console
    console.info(`[TIDE] M1 map checks\n${formatChecks(this.summary)}`);

    // Dev overlays are opt-in via ?checks=1 so they can never sit on top of
    // the map during a playtest or a screenshot.
    if (new URLSearchParams(window.location.search).get('checks') === '1') {
      this.drawChecksPanel();
      this.drawLegend();
    }

    // Terrain is on screen and the map parsed, so retire the HTML boot veil.
    document.getElementById('boot')?.classList.add('hidden');
  }

  /** Dev-only exit-criteria readout, shown only with ?checks=1. */
  private drawChecksPanel(): void {
    const panelW = 300;
    const lineH = 13;
    const rows = this.summary.checks.length + 2;
    const panelH = rows * lineH + 20;

    const panel = this.add.graphics();
    panel.fillStyle(0x060d15, 0.86);
    panel.fillRoundedRect(GRID * CELL_PX - panelW - 10, 10, panelW, panelH, 6);
    panel.lineStyle(1, 0x1c3044, 1);
    panel.strokeRoundedRect(GRID * CELL_PX - panelW - 10, 10, panelW, panelH, 6);

    const x = GRID * CELL_PX - panelW + 2;
    let y = 24;

    this.add
      .text(x, y, `M1 EXIT CRITERIA  ${this.summary.passed}/${this.summary.checks.length}`, {
        fontFamily: 'Consolas, monospace',
        fontSize: '12px',
        color: this.summary.failed === 0 ? UI_PASS : UI_FAIL,
      })
      .setOrigin(0, 0);

    y += lineH + 4;
    for (const check of this.summary.checks) {
      this.add
        .text(x, y, `${check.pass ? 'OK ' : 'XX '} ${check.label}`, {
          fontFamily: 'Consolas, monospace',
          fontSize: '11px',
          color: check.pass ? UI_PASS : UI_FAIL,
        })
        .setOrigin(0, 0);
      y += lineH;
    }

    const c = this.summary.counts;
    this.add
      .text(
        x,
        y + 4,
        `deep ${c.deep}  shallow ${c.shallow}  sand ${c.sand}  claimable ${c.claimable}`,
        { fontFamily: 'Consolas, monospace', fontSize: '11px', color: UI_TEXT },
      )
      .setOrigin(0, 0);
  }

  /** Sand is the only warm hue on screen, so "land" should be identifiable
   *  with no instruction. This legend is labelled dev-only and is not a
   *  player-facing UI. */
  private drawLegend(): void {
    const items: Array<[number, string]> = [
      [0x0d2f4a, 'DEEP  1.00x'],
      [0x2e9fd4, 'SHALLOW  0.50x'],
      [0xd9c48a, 'SAND  impassable'],
    ];
    const lineH = 16;
    const boxH = items.length * lineH + 18;
    const x = 10;
    const y = 10;

    const panel = this.add.graphics();
    panel.fillStyle(0x060d15, 0.86);
    panel.fillRoundedRect(x, y, 168, boxH, 6);
    panel.lineStyle(1, 0x1c3044, 1);
    panel.strokeRoundedRect(x, y, 168, boxH, 6);

    let cy = y + 9;
    for (const [color, label] of items) {
      panel.fillStyle(color, 1);
      panel.fillRect(x + 8, cy, 12, 12);
      panel.lineStyle(1, 0x2a4256, 1);
      panel.strokeRect(x + 8, cy, 12, 12);
      this.add
        .text(x + 26, cy - 1, label, {
          fontFamily: 'Consolas, monospace',
          fontSize: '11px',
          color: UI_TEXT,
        })
        .setOrigin(0, 0);
      cy += lineH;
    }

    this.add
      .text(
        WORLD_PX / 2,
        WORLD_PX - 8,
        `${GRID}x${GRID} grid  ·  ${CELL_PX}px cells  ·  fixed full-map camera  ·  spawns (3,24) and (44,23)`,
        { fontFamily: 'Consolas, monospace', fontSize: '11px', color: UI_TEXT },
      )
      .setOrigin(0.5, 1);
  }
}