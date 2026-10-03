/**
 * Terrain model. Pure data + queries. No engine dependency.
 *
 * Bathymetry is implemented as exactly two deviations from a flat map:
 *   1. a speed multiplier keyed on the terrain layer
 *   2. SAND is impassable and blocks the capture flood fill (M6)
 */

export const TERRAIN = {
  DEEP: 0,
  SHALLOW: 1,
  SAND: 2,
} as const;

export type Terrain = (typeof TERRAIN)[keyof typeof TERRAIN];

export const TERRAIN_NAME: Record<Terrain, string> = {
  0: 'DEEP',
  1: 'SHALLOW',
  2: 'SAND',
};

export const CHAR_TO_TERRAIN: Record<string, Terrain> = {
  '.': TERRAIN.DEEP,
  '~': TERRAIN.SHALLOW,
  '#': TERRAIN.SAND,
};

/**
 * Speed multiplier for a terrain type.
 * Returns 0.5 on any shallow cell -- the assertion the M1 exit criteria
 * checks. Returns 0 for sand because sand cannot be moved through.
 */
export function speedAt(terrain: Terrain): number {
  switch (terrain) {
    case TERRAIN.SAND:
      return 0;
    case TERRAIN.SHALLOW:
      return 0.5;
    default:
      return 1;
  }
}

/** Sand is the only impassable terrain. */
export function isPassable(terrain: Terrain): boolean {
  return terrain !== TERRAIN.SAND;
}

/** Sand is never claimable, so it is excluded from the score denominator. */
export function isClaimable(terrain: Terrain): boolean {
  return terrain !== TERRAIN.SAND;
}