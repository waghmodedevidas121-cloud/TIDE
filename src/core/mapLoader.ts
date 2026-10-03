/**
 * Map file loader. Parses the handcrafted .map format into a flat terrain
 * array. Pure -- no engine dependency.
 *
 * Format: one char per cell, row-major, `#` comments and blank lines ignored.
 *   .  deep      ~  shallow      #  sand
 */

import { GRID } from './constants';
import { CHAR_TO_TERRAIN, type Terrain } from './terrain';

export interface GameMap {
  /** Flat row-major terrain array, length size*size. */
  readonly terrain: Uint8Array;
  readonly size: number;
}

export class MapParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MapParseError';
  }
}

function stripCommentsAndBlanks(text: string): string[] {
  const lines: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const withoutComment = raw.split(';')[0] ?? '';
    const trimmed = withoutComment.trim();
    if (trimmed.length > 0) lines.push(trimmed);
  }
  return lines;
}

export function parseMap(text: string, size: number = GRID): GameMap {
  const rows = stripCommentsAndBlanks(text);

  if (rows.length !== size) {
    throw new MapParseError(
      `Map has ${rows.length} rows, expected ${size}. Every row must be exactly ${size} cells.`,
    );
  }

  const terrain = new Uint8Array(size * size);

  for (let r = 0; r < size; r++) {
    const row = rows[r]!;
    if (row.length !== size) {
      throw new MapParseError(
        `Row ${r} has ${row.length} cells, expected ${size}.`,
      );
    }
    for (let c = 0; c < size; c++) {
      const ch = row[c]!;
      const value = CHAR_TO_TERRAIN[ch];
      if (value === undefined) {
        throw new MapParseError(
          `Row ${r} column ${c}: unknown character "${ch}". Expected one of . ~ #`,
        );
      }
      terrain[r * size + c] = value;
    }
  }

  return { terrain, size };
}

/** Row-major index for a cell. Callers are responsible for bounds. */
export function indexOf(size: number, row: number, col: number): number {
  return row * size + col;
}

/** Terrain at a cell, or SAND if out of bounds. Used so a bad coordinate can
 *  never be silently navigable. */
export function terrainAt(map: GameMap, row: number, col: number): Terrain {
  if (row < 0 || col < 0 || row >= map.size || col >= map.size) return 2;
  return map.terrain[row * map.size + col] as Terrain;
}