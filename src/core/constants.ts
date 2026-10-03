/**
 * Simulation constants. Zero Phaser / DOM imports -- this module is part of
 * the engine-independent core and must stay runnable in plain Node.
 */

export const GRID = 48;

/** Source pixels per cell. The canvas is scale-fitted, so this is texture
 *  resolution, not on-screen size. Chosen so phone downscale is an exact
 *  half and stays crisp. */
export const CELL_PX = 16;

export const WORLD_PX = GRID * CELL_PX;

/** Absolute boat speed over deep water, in cells per second. */
export const DEEP_SPEED_CELLS = 4.0;

/** Shallow water is the slow, safe margin. This is the primary tuning dial
 *  for the whole prototype: if players never choose it, raise the penalty. */
export const SHALLOW_SPEED_MULT = 0.5;