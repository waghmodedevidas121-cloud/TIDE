/**
 * Simulation constants. Zero Phaser / DOM imports -- this module is part of
 * the engine-independent core and must stay runnable in plain Node.
 */

export const GRID = 48;

/** Source pixels per cell for the terrain texture. The canvas is
 *  scale-fitted, so this is texture resolution, not on-screen size. */
export const CELL_PX = 16;

export const WORLD_PX = GRID * CELL_PX;

/* ------------------------------------------------------------------ *
 * Simulation resolution
 *
 * The boat is stored as an integer position in simulation units rather than
 * floating-point pixels. Two reasons:
 *   1. determinism -- integer maths is reproducible, floats are not
 *   2. a step can be clamped exactly to a cell line, so a slow cell can
 *      never overshoot into the next one
 * ------------------------------------------------------------------ */

export const UNITS_PER_CELL = 60;

export const WORLD_UNITS = GRID * UNITS_PER_CELL;

/** Fixed simulation rate. The renderer may run faster; the sim does not. */
export const TICK_HZ = 60;

export const TICK_MS = 1000 / TICK_HZ;

/** Movement per tick, in simulation units.
 *  DEEP = 4 units/tick, and 60 units per cell, gives 4 cells per second.
 *  SHALLOW is exactly half, chosen so both values are integers. */
export const DEEP_SPEED_UNITS = 4;
export const SHALLOW_SPEED_UNITS = 2;

/* ------------------------------------------------------------------ *
 * Directions. Index + 1 is a right turn, + 2 is a reversal.
 * ------------------------------------------------------------------ */

export const Dir = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3,
} as const;

export type Dir = (typeof Dir)[keyof typeof Dir];

export const DIR_DY = [-1, 0, 1, 0] as const;
export const DIR_DX = [0, 1, 0, -1] as const;
export const DIR_NAME = ['UP', 'RIGHT', 'DOWN', 'LEFT'] as const;

/** Boat spawn points. Both verified deep-water, symmetric under 180 degree
 *  rotation, 44 cells apart. See PHASE1-MAP-DESIGN.html. */
export const SPAWNS: ReadonlyArray<{ row: number; col: number }> = [
  { row: 3, col: 24 },
  { row: 44, col: 23 },
];