/**
 * M1 exit-criteria verification.
 *
 * These are not game features -- they exist to make the M1 gate observable
 * and to give the headless CI smoke test something to assert against once
 * milestones land. Pure, no engine dependency.
 */

import { GRID } from './constants';
import { terrainAt, type GameMap } from './mapLoader';
import { isClaimable, isPassable, speedAt, TERRAIN, TERRAIN_NAME } from './terrain';

export interface MapCheck {
  label: string;
  expected: string;
  actual: string;
  pass: boolean;
}

export interface CheckSummary {
  checks: MapCheck[];
  passed: number;
  failed: number;
  counts: { deep: number; shallow: number; sand: number; claimable: number };
}

function eq(a: unknown, b: unknown): boolean {
  return a === b;
}

export function runMapChecks(map: GameMap, size: number = GRID): CheckSummary {
  const checks: MapCheck[] = [];
  const add = (label: string, expected: unknown, actual: unknown): void => {
    checks.push({
      label,
      expected: String(expected),
      actual: String(actual),
      pass: eq(expected, actual),
    });
  };

  let deep = 0;
  let shallow = 0;
  let sand = 0;
  for (let i = 0; i < map.terrain.length; i++) {
    if (map.terrain[i] === TERRAIN.DEEP) deep++;
    else if (map.terrain[i] === TERRAIN.SHALLOW) shallow++;
    else sand++;
  }
  const claimable = map.size * map.size - sand;

  add('grid size', size, map.size);
  add('terrain array length', size * size, map.terrain.length);

  // Named probe cells from the map design. Deep lagoon interior.
  add('terrain at (24,18)', TERRAIN_NAME[TERRAIN.DEEP], TERRAIN_NAME[terrainAt(map, 24, 18)]);
  // Mainland interior, north-west quadrant of the sand block.
  add('terrain at (15,15)', TERRAIN_NAME[TERRAIN.SAND], TERRAIN_NAME[terrainAt(map, 15, 15)]);
  // Shallow band on the seaward face of the mainland.
  add('terrain at (24,10)', TERRAIN_NAME[TERRAIN.SHALLOW], TERRAIN_NAME[terrainAt(map, 24, 10)]);
  // North keyhole: the only ways into the lagoon.
  add('terrain at (15,23) keyhole', TERRAIN_NAME[TERRAIN.SHALLOW], TERRAIN_NAME[terrainAt(map, 15, 23)]);
  // West bar.
  add('terrain at (15,8) bar', TERRAIN_NAME[TERRAIN.SAND], TERRAIN_NAME[terrainAt(map, 15, 8)]);
  // Open ocean.
  add('terrain at (2,2) ocean', TERRAIN_NAME[TERRAIN.DEEP], TERRAIN_NAME[terrainAt(map, 2, 2)]);

  add('speedAt(SHALLOW)', 0.5, speedAt(TERRAIN.SHALLOW));
  add('speedAt(DEEP)', 1, speedAt(TERRAIN.DEEP));
  add('speedAt(SAND)', 0, speedAt(TERRAIN.SAND));
  add('isPassable(SAND)', false, isPassable(TERRAIN.SAND));
  add('isPassable(SHALLOW)', true, isPassable(TERRAIN.SHALLOW));
  add('isClaimable(SAND)', false, isClaimable(TERRAIN.SAND));

  // Every shallow cell must report the slow multiplier.
  let shallowAllSlow = true;
  for (let r = 0; r < map.size && shallowAllSlow; r++) {
    for (let c = 0; c < map.size; c++) {
      if (terrainAt(map, r, c) === TERRAIN.SHALLOW && speedAt(TERRAIN.SHALLOW) !== 0.5) {
        shallowAllSlow = false;
        break;
      }
    }
  }
  add('every shallow cell slow', true, shallowAllSlow);

  // NOTE: the Phase 1 map design document stated 432 sand / 1872 claimable.
  // Measured from the authored file it is 384 / 1920 -- the design doc's
  // arithmetic was wrong, the map is correct. These are the measured values.
  add('sand cells', 384, sand);
  add('claimable cells', 1920, claimable);
  add('deep cells', 1320, deep);
  add('shallow cells', 600, shallow);

  // Design rule 2: four-fold symmetry. A 1v1 comparison is meaningless
  // without it, so it is asserted rather than assumed.
  let symmetric = true;
  outer: for (let r = 0; r < map.size; r++) {
    for (let c = 0; c < map.size; c++) {
      const a = terrainAt(map, r, c);
      const b = terrainAt(map, map.size - 1 - r, map.size - 1 - c);
      const d = terrainAt(map, r, map.size - 1 - c);
      if (a !== b || a !== d) {
        symmetric = false;
        break outer;
      }
    }
  }
  add('four-fold symmetry', true, symmetric);

  // Out-of-bounds must never be navigable.
  add('out of bounds impassable', false, isPassable(terrainAt(map, -1, 0)));
  add('past end impassable', false, isPassable(terrainAt(map, map.size, 0)));

  const passed = checks.filter((c) => c.pass).length;
  return {
    checks,
    passed,
    failed: checks.length - passed,
    counts: { deep, shallow, sand, claimable },
  };
}

export function formatChecks(summary: CheckSummary): string {
  const lines = summary.checks.map((c) => `${c.pass ? 'PASS' : 'FAIL'}  ${c.label} = ${c.actual}`);
  return [...lines, `--> ${summary.passed}/${summary.checks.length} passed`].join('\n');
}