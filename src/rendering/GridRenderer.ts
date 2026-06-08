// src/rendering/GridRenderer.ts - Grid Renderer module that handles rasterizing the cellular automata sand grid to an offscreen canvas texture.
/*
Exports:
- class GridRenderer: Buffers cellular sandbox grid cells into an offscreen canvas and uploads them to a PixiJS texture.
  * constructor(app: Application, cols: number, rows: number, cellSize: number, viewWidth: number, gridEngine: DemolitionGrid)
  * render(): void
  * updateTint(colorHex: number): void
  * destroy(): void
*/

import { Application, Sprite, Texture } from 'pixi.js';
import { DemolitionGrid } from '../engine/DemolitionGrid';
import { CellState, MaterialType } from '../types/game';

const MAX_HP_FOR_MATERIAL: Record<MaterialType, number> = {
  [MaterialType.CONCRETE]: 50,
  [MaterialType.GLASS]: 30,
  [MaterialType.COPPER]: 50,
  [MaterialType.WOOD]: 40,
  [MaterialType.CHAOS]: 100
};

export class GridRenderer {
  private app: Application;
  private cols: number;
  private rows: number;
  private gridEngine: DemolitionGrid;

  private gridCanvas: HTMLCanvasElement;
  private gridCtx: CanvasRenderingContext2D;
  private gridTexture: Texture;
  private gridSprite: Sprite;

  private imgData: ImageData;

  constructor(
    app: Application,
    cols: number,
    rows: number,
    cellSize: number,
    viewWidth: number,
    gridEngine: DemolitionGrid
  ) {
    this.app = app;
    this.cols = cols;
    this.rows = rows;
    this.gridEngine = gridEngine;

    // 1. Create offscreen canvas for demolition grid pixel buffering
    this.gridCanvas = document.createElement('canvas');
    this.gridCanvas.width = cols;
    this.gridCanvas.height = rows;
    this.gridCtx = this.gridCanvas.getContext('2d')!;

    // 2. Allocate ImageData *once* at initialization to optimize GC / memory pressure
    this.imgData = this.gridCtx.createImageData(cols, rows);

    // 3. Create dynamic WebGL texture and sprite representation
    this.gridTexture = Texture.from(this.gridCanvas);
    this.gridSprite = new Sprite(this.gridTexture);
    this.gridSprite.width = viewWidth;
    this.gridSprite.height = rows * cellSize;

    // 4. Add grid to PixiJS stage
    this.app.stage.addChild(this.gridSprite);
  }

  /**
   * Translates 2D cellular automata grid coordinates to direct ImageData color bytes,
   * updates the offscreen canvas, and requests a PixiJS WebGL texture re-upload.
   */
  public render(): void {
    const data = this.imgData.data;

    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const cell = this.gridEngine.getCell(x, y);
        const idx = (y * this.cols + x) * 4;

        if (cell) {
          let r = (cell.color >> 16) & 255;
          let g = (cell.color >> 8) & 255;
          let b = cell.color & 255;

          if (cell.state === CellState.SAND) {
            // "Debris" Effect: Broken sand cells are slightly brighter / lighter
            r = Math.min(255, Math.round(r * 1.2));
            g = Math.min(255, Math.round(g * 1.2));
            b = Math.min(255, Math.round(b * 1.2));
          } else {
            // "Bruised" Effect: Darken static cells as they lose health
            const maxHP = cell.maxHp || MAX_HP_FOR_MATERIAL[cell.material] || 100;
            const healthRatio = Math.max(0.0, Math.min(1.0, cell.hp / maxHP));
            if (healthRatio < 1.0) {
              const darkening = 1.0 - (1.0 - healthRatio) * 0.6;
              r = Math.max(0, Math.round(r * darkening));
              g = Math.max(0, Math.round(g * darkening));
              b = Math.max(0, Math.round(b * darkening));
            }
          }

          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = 255; // Solid opacity
        } else {
          // Transparent air/vacuum
          data[idx] = 0;
          data[idx + 1] = 0;
          data[idx + 2] = 0;
          data[idx + 3] = 0;
        }
      }
    }

    this.gridCtx.putImageData(this.imgData, 0, 0);
    this.gridTexture.source.update(); // Instructs PixiJS to re-upload the canvas buffer to the GPU
  }

  /**
   * Modifies the color tint multiplier of the grid sprite for shader hue-shifting.
   */
  public updateTint(colorHex: number): void {
    this.gridSprite.tint = colorHex;
  }

  /**
   * Disposes of stage children and textures to prevent memory leaks.
   */
  public destroy(): void {
    this.app.stage.removeChild(this.gridSprite);
    this.gridSprite.destroy();
    this.gridTexture.destroy(true);
    
    // Clear DOM canvas elements
    this.gridCanvas.width = 0;
    this.gridCanvas.height = 0;
  }
}
