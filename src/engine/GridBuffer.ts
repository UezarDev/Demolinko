// src/engine/GridBuffer.ts - Pure data structure for the demolition grid.
// Separating the buffer from the physics allows for better memory management and potential optimization (e.g., TypedArrays).

import { GridCell } from '../types/game';

export class GridBuffer {
  public grid: (GridCell | null)[][];

  constructor(public readonly width: number, public readonly height: number) {
    this.grid = Array.from({ length: height }, () => Array(width).fill(null));
  }

  public isValidCoords(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  public getCell(x: number, y: number): GridCell | null {
    if (!this.isValidCoords(x, y)) return null;
    return this.grid[y][x];
  }

  public setCell(x: number, y: number, cell: GridCell | null): void {
    if (this.isValidCoords(x, y)) {
      this.grid[y][x] = cell;
    }
  }

  public clear(): void {
    for (let y = 0; y < this.height; y++) {
      this.grid[y].fill(null);
    }
  }
}
