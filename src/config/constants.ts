// src/config/constants.ts - Centralized configuration constants for viewport dimensions and cellular automata grids.
// Re-exports from balance.ts for backward compatibility and convenience.

export {
  VIEW_WIDTH,
  VIEW_HEIGHT,
  GRID_CELL_SIZE,
  GRID_COLS,
  GRID_ROWS,
  MIN_GRID_Y,
} from './balance';

// Convenience constants for pit rendering (not in balance yet, keeping here)
// These could move to balance.ts in the future if needed for tuning
export const PIT_RADIUS = 40;
export const CURSOR_DMG_RADIUS = 3;
export const CURSOR_STROKE_WIDTH = 1.5;
export const CONTRACT_LAYOUT_COUNT = 30;
