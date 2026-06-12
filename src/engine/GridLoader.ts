// src/engine/GridLoader.ts - Logic for loading buildings and structures into the grid.

import { GridBuffer } from './GridBuffer';
import { MaterialType, CellState, GridCell } from '../types/game';
import { generateMockSpriteSheetData } from './mocks';

export class GridLoader {
  private spriteCellSize: number = 80;

  constructor(private buffer: GridBuffer) {}

  /**
   * Loads the mock data for initial game state.
   */
  public loadMocks(): void {
    const data = generateMockSpriteSheetData();
    this.spriteCellSize = data.spriteCellSize;
    
    // We don't store the whole library in the loader, 
    // we just use it to initialize the buffer if needed.
    // For actual game loops, RunManager uses loadFromSpriteSheetFrame.
  }

  /**
   * Maps a specific frame from a sprite sheet into the buffer.
   */
  public loadFromSpriteSheetFrame(
    frameCells: (GridCell | null)[][], 
    targetGridX: number, 
    targetGridY: number, 
    difficultyMultiplier: number
  ): void {
    for (let y = 0; y < frameCells.length; y++) {
      for (let x = 0; x < frameCells[y].length; x++) {
        const cell = frameCells[y][x];
        if (cell) {
          const destX = targetGridX + x;
          const destY = targetGridY + y;

          if (this.buffer.isValidCoords(destX, destY)) {
            let baseHp = 50;
            if (cell.material === MaterialType.CONCRETE) baseHp = 50;
            else if (cell.material === MaterialType.GLASS) baseHp = 30;
            else if (cell.material === MaterialType.COPPER) baseHp = 50;
            else if (cell.material === MaterialType.WOOD) baseHp = 40;

            const scaleHP = Math.round(baseHp * difficultyMultiplier);
            this.buffer.setCell(destX, destY, {
              color: cell.color,
              material: cell.material,
              hp: scaleHP,
              maxHp: scaleHP,
              state: CellState.STATIC,
            });
          }
        }
      }
    }
  }

  public getSpriteCellSize(): number {
    return this.spriteCellSize;
  }
}
