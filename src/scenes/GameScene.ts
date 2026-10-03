import Phaser from 'phaser';
import {
  CELL_PX,
  Dir,
  DIR_NAME,
  GRID,
  TICK_MS,
  WORLD_PX,
} from '../core/constants';
import type { GameMap } from '../core/mapLoader';
import { Boat } from '../core/boat';
import { Sim } from '../core/sim';
import {
  formatChecks,
  runMapChecks,
  type CheckSummary,
} from '../core/mapChecks';
import { BOAT_COLORS, drawBoat } from '../render/boatPainter';
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

// Indexed by owner id exactly: 0 neutral (unused), 1 = player cyan, 2 = red.
const OWNER_COLORS = [0x1c3044, 0x4fc3f7, 0xf4515e];

export class GameScene extends Phaser.Scene {
  private map!: GameMap;
  private sim!: Sim;
  private player!: Boat;
  private territoryGfx!: Phaser.GameObjects.Graphics;
  private trailGfx!: Phaser.GameObjects.Graphics;
  private boatGfx!: Phaser.GameObjects.Graphics;
  private summary!: CheckSummary;
  private scoreLabel!: Phaser.GameObjects.Text;
  private speedLabel!: Phaser.GameObjects.Text;

  private accumulatorMs = 0;
  private readonly MAX_STEPS = 4;

  private touchStartX = 0;
  private touchStartY = 0;

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

    this.sim = new Sim(this.map);
    this.player = Boat.atSpawn(0, Dir.RIGHT, 1);
    this.sim.addBoat(this.player);

    this.territoryGfx = this.add.graphics().setDepth(2);
    this.trailGfx = this.add.graphics().setDepth(3);
    this.boatGfx = this.add.graphics().setDepth(10);

    this.summary = runMapChecks(this.map, GRID);
    // eslint-disable-next-line no-console
    console.info(`[TIDE] M1 map checks\n${formatChecks(this.summary)}`);

    this.drawChecksPanel();
    this.drawLegend();
    this.registerInput();
    this.addScoreLabel();

    // Dev-only handle so a deterministic test can drive the sim without
    // relying on fragile keyboard timing.
    (window as unknown as { __sim: Sim }).__sim = this.sim;

    this.redrawTerritory();

    document.getElementById('boot')?.classList.add('hidden');
  }

  override update(_time: number, deltaMs: number): void {
    this.accumulatorMs += Math.min(deltaMs, 250);
    let steps = 0;
    while (this.accumulatorMs >= TICK_MS && steps < this.MAX_STEPS) {
      this.sim.step();
      this.accumulatorMs -= TICK_MS;
      steps += 1;
    }
    if (steps === this.MAX_STEPS) this.accumulatorMs = 0;

    if (this.sim.territory.dirty.size > 0) this.redrawTerritory();
    this.redrawTrails();
    this.redrawBoat();
    this.updateLabels();
  }

  private redrawTerritory(): void {
    this.territoryGfx.clear();
    const size = this.sim.territory.size;
    const n = size * size;
    for (let i = 0; i < n; i++) {
      const owner = this.sim.territory.getAtIndex(i);
      if (owner === 0) continue;
      const r = Math.floor(i / size);
      const c = i % size;
      this.territoryGfx.fillStyle(OWNER_COLORS[owner] ?? 0xffffff, 0.45);
      this.territoryGfx.fillRect(c * CELL_PX, r * CELL_PX, CELL_PX, CELL_PX);
    }
    this.sim.territory.resetDirty();
  }

  private redrawTrails(): void {
    this.trailGfx.clear();
    for (const boat of this.sim.boats) {
      this.trailGfx.fillStyle(OWNER_COLORS[boat.ownerId] ?? 0xffffff, 1);
      for (const idx of boat.trail.cells) {
        const r = Math.floor(idx / GRID);
        const c = idx % GRID;
        this.trailGfx.fillRect(c * CELL_PX, r * CELL_PX, CELL_PX, CELL_PX);
      }
    }
  }

  private redrawBoat(): void {
    this.boatGfx.clear();
    for (let i = 0; i < this.sim.boats.length; i++) {
      const b = this.sim.boats[i];
      drawBoat(this.boatGfx, b.worldX(), b.worldY(), BOAT_COLORS[i] ?? 0xffffff, b.blocked);
    }
  }

  private addScoreLabel(): void {
    this.scoreLabel = this.add
      .text(10, 80, '', {
        fontFamily: 'Consolas, monospace',
        fontSize: '14px',
        color: '#e8f1f8',
      })
      .setDepth(20);
  }

  private updateLabels(): void {
    const share = Math.floor(this.sim.territory.share(1) * 100);
    this.scoreLabel.setText(`score ${share}%`);

    const cell = this.player.currentCell();
    const idx = cell.row * GRID + cell.col;
    const t = this.map.terrain[idx];
    const name = t === 1 ? 'SHALLOW  0.5x' : t === 0 ? 'DEEP  1.0x' : 'SAND';
    if (!this.speedLabel) {
      this.speedLabel = this.add
        .text(10, WORLD_PX - 40, '', {
          fontFamily: 'Consolas, monospace',
          fontSize: '13px',
          color: UI_TEXT,
        })
        .setDepth(20);
    }
    this.speedLabel.setText(
      `cell: ${name}   heading: ${DIR_NAME[this.player.heading]}   trail: ${this.player.trail.length}`,
    );
  }

  private registerInput(): void {
    this.input.keyboard?.on('keydown', (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.player.input(Dir.UP);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.player.input(Dir.DOWN);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.player.input(Dir.LEFT);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.player.input(Dir.RIGHT);
          break;
      }
    });

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.touchStartX = p.x;
      this.touchStartY = p.y;
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const dx = p.x - this.touchStartX;
      const dy = p.y - this.touchStartY;
      const abs = Math.max(Math.abs(dx), Math.abs(dy));
      if (abs < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        this.player.input(dx > 0 ? Dir.RIGHT : Dir.LEFT);
      } else {
        this.player.input(dy > 0 ? Dir.DOWN : Dir.UP);
      }
    });
  }

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
        `${GRID}x${GRID} grid  ·  WASD / arrows / swipe`,
        { fontFamily: 'Consolas, monospace', fontSize: '11px', color: UI_TEXT },
      )
      .setOrigin(0.5, 1);
  }
}