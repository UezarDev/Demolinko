// src/engine/mocks.ts - Mock data and generators for the Demolition Grid to ensure 
// the game remains playable even without external assets.

import { CellState, MaterialType, GridCell } from '../types/game';

export interface MockSpriteSheetData {
  parsedFrames: (GridCell | null)[][][];
  pixelMasses: number[];
  buildingBoundingBoxes: { minX: number; maxX: number; minY: number; maxY: number; contentWidth: number; contentHeight: number }[];
  sortedFramesByMass: number[];
  complexityLevels: number[];
  totalFrames: number;
  spriteCellSize: number;
}

/**
 * Generates the default mock sprite sheet frames used for initial grid state.
 * This replaces the bulky inline logic previously found in DemolitionGrid.
 */
export function generateMockSpriteSheetData(): MockSpriteSheetData {
  const spriteCellSize = 80;
  const totalFrames = 5;
  const pixelMasses: number[] = [];
  const buildingBoundingBoxes: { minX: number; maxX: number; minY: number; maxY: number; contentWidth: number; contentHeight: number }[] = [];
  const parsedFrames: (GridCell | null)[][][] = [];

  for (let f = 0; f < totalFrames; f++) {
    const frameCells: (GridCell | null)[][] = Array.from({ length: spriteCellSize }, () => Array(spriteCellSize).fill(null));
    let nonTransparentCount = 0;
    let minX = spriteCellSize;
    let maxX = -1;
    let minY = spriteCellSize;
    let maxY = -1;

    if (f === 0) {
      // Frame 0: Small House
      for (let y = 30; y < 70; y++) {
        for (let x = 15; x < 65; x++) {
          const isWindow = x >= 30 && x < 50 && y >= 45 && y < 55;
          if (isWindow) {
            frameCells[y][x] = { color: 0x22d3ee, material: MaterialType.GLASS, hp: 30, maxHp: 30, state: CellState.STATIC };
          } else {
            frameCells[y][x] = { color: 0x64748b, material: MaterialType.CONCRETE, hp: 50, maxHp: 50, state: CellState.STATIC };
          }
        }
      }
      for (let y = 10; y < 30; y++) {
        const span = Math.round((y - 10) * 1.3);
        const startX = 40 - span;
        const endX = 40 + span;
        for (let x = Math.max(10, startX); x <= Math.min(70, endX); x++) {
          frameCells[y][x] = { color: 0x854d0e, material: MaterialType.WOOD, hp: 40, maxHp: 40, state: CellState.STATIC };
        }
      }
    } else if (f === 1) {
      // Frame 1: Tall Tower
      for (let y = 10; y < 75; y++) {
        for (let x = 25; x < 55; x++) {
          const isWindow1 = x >= 30 && x < 50 && y >= 20 && y < 35;
          const isWindow2 = x >= 30 && x < 50 && y >= 45 && y < 60;
          if (isWindow1 || isWindow2) {
            frameCells[y][x] = { color: 0x22d3ee, material: MaterialType.GLASS, hp: 30, maxHp: 30, state: CellState.STATIC };
          } else {
            frameCells[y][x] = { color: 0x475569, material: MaterialType.CONCRETE, hp: 50, maxHp: 50, state: CellState.STATIC };
          }
        }
      }
      for (let y = 5; y < 10; y++) {
        frameCells[y][40] = { color: 0xea580c, material: MaterialType.COPPER, hp: 50, maxHp: 50, state: CellState.STATIC };
      }
    } else if (f === 2) {
      // Frame 2: Heavy Bunker
      for (let y = 25; y < 75; y++) {
        for (let x = 10; x < 70; x++) {
          const dx = x - 40;
          const dy = y - 75;
          const isArch = (dx * dx + dy * dy * 1.5) < 225;
          if (!isArch) {
            frameCells[y][x] = { color: 0x334155, material: MaterialType.CONCRETE, hp: 50, maxHp: 50, state: CellState.STATIC };
          } else {
            frameCells[y][x] = { color: 0xea580c, material: MaterialType.COPPER, hp: 50, maxHp: 50, state: CellState.STATIC };
          }
        }
      }
    } else if (f === 3) {
      // Frame 3: Dual Arch Bridge
      for (let y = 35; y < 75; y++) {
        for (let x = 15; x < 65; x++) {
          const dx = x - 40;
          const dy = y - 75;
          const isArchEmpty = (dx * dx + dy * dy * 1.5) < 300;
          if (!isArchEmpty && y < 45) {
            frameCells[y][x] = { color: 0xea580c, material: MaterialType.COPPER, hp: 50, maxHp: 50, state: CellState.STATIC };
          } else if (!isArchEmpty && (x < 25 || x >= 55)) {
            frameCells[y][x] = { color: 0x64748b, material: MaterialType.CONCRETE, hp: 50, maxHp: 50, state: CellState.STATIC };
          }
        }
      }
    } else if (f === 4) {
      // Frame 4: Castle Gatehouse
      for (let y = 15; y < 75; y++) {
        for (let x = 5; x < 75; x++) {
          const isLeftTower = x >= 5 && x < 20;
          const isRightTower = x >= 60 && x < 75;
          const isCenterGate = x >= 20 && x < 60 && y >= 35;
          
          if (isLeftTower || isRightTower) {
            const isWindow = (y >= 25 && y < 35 && x >= 10 && x < 15) || (y >= 25 && y < 35 && x >= 65 && x < 70);
            if (isWindow) {
              frameCells[y][x] = { color: 0x22d3ee, material: MaterialType.GLASS, hp: 30, maxHp: 30, state: CellState.STATIC };
            } else {
              frameCells[y][x] = { color: 0x475569, material: MaterialType.CONCRETE, hp: 50, maxHp: 50, state: CellState.STATIC };
            }
          } else if (isCenterGate) {
            const isGateArch = y >= 55 && x >= 32 && x < 48;
            if (!isGateArch) {
              frameCells[y][x] = { color: 0x334155, material: MaterialType.CONCRETE, hp: 50, maxHp: 50, state: CellState.STATIC };
            }
          }
        }
      }
    }

    for (let y = 0; y < spriteCellSize; y++) {
      for (let x = 0; x < spriteCellSize; x++) {
        if (frameCells[y][x] !== null) {
          nonTransparentCount++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    pixelMasses.push(nonTransparentCount);
    const contentWidth = maxX >= minX ? (maxX - minX + 1) : 0;
    const contentHeight = maxY >= minY ? (maxY - minY + 1) : 0;
    buildingBoundingBoxes.push({
      minX: maxX >= minX ? minX : 0,
      maxX: maxX >= minX ? maxX : 0,
      minY: maxY >= minY ? minY : 0,
      maxY: maxY >= minY ? maxY : 79,
      contentWidth: contentWidth,
      contentHeight: contentHeight
    });
    parsedFrames.push(frameCells);
  }

  const frameIndices = Array.from({ length: totalFrames }, (_, idx) => idx);
  frameIndices.sort((a, b) => pixelMasses[a] - pixelMasses[b]);
  const sortedFramesByMass = frameIndices;

  const complexityLevels = new Array(totalFrames);
  for (let rank = 0; rank < sortedFramesByMass.length; rank++) {
    const frameIndex = sortedFramesByMass[rank];
    complexityLevels[frameIndex] = rank + 1;
  }

  return {
    parsedFrames,
    pixelMasses,
    buildingBoundingBoxes,
    sortedFramesByMass,
    complexityLevels,
    totalFrames,
    spriteCellSize,
  };
}

/**
 * Generates a high-quality default procedurally drawn sprite sheet data URL.
 */
export function generateDefaultSpriteSheet(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 400;
  canvas.height = 80;
  const ctx = canvas.getContext('2d')!;
  
  // Frame 0: Small House
  ctx.fillStyle = '#64748b';
  ctx.fillRect(15, 30, 50, 40);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(30, 40, 20, 15);
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.moveTo(10, 30);
  ctx.lineTo(40, 10);
  ctx.lineTo(70, 30);
  ctx.closePath();
  ctx.fill();

  // Frame 1: Tall Tower
  ctx.fillStyle = '#475569';
  ctx.fillRect(100 + 25, 10, 30, 65);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(100 + 30, 20, 20, 15);
  ctx.fillRect(100 + 30, 45, 20, 15);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(100 + 20, 10, 40, 4);

  // Frame 2: Heavy Bunker
  ctx.fillStyle = '#334155';
  ctx.fillRect(160 + 10, 25, 60, 50);
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.arc(160 + 40, 75, 15, Math.PI, 0, false);
  ctx.fill();

  // Frame 3: Dual Arch
  ctx.fillStyle = '#64748b';
  ctx.fillRect(240 + 15, 40, 10, 35);
  ctx.fillRect(240 + 55, 40, 10, 35);
  ctx.fillStyle = '#f97316';
  ctx.fillRect(240 + 10, 35, 60, 8);

  // Frame 4: Castle Gatehouse
  ctx.fillStyle = '#475569';
  ctx.fillRect(320 + 20, 30, 40, 45);
  ctx.fillRect(320 + 5, 15, 15, 60);
  ctx.fillRect(320 + 60, 15, 15, 60);
  ctx.fillStyle = '#22d3ee';
  ctx.fillRect(320 + 10, 25, 5, 10);
  ctx.fillRect(320 + 65, 25, 5, 10);

  return canvas.toDataURL();
}
