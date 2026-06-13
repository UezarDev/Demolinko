// src/engine/DemolitionGrid.ts - Orchestrator for the demolition system.
// Now a lightweight facade that delegates to specialized modules for data, loading, and physics.

import { GridBuffer } from './GridBuffer';
import { GridLoader } from './GridLoader';
import { GridPhysics } from './GridPhysics';
import { PixelParticle } from '../types/game';
import { generateMockSpriteSheetData } from './mocks';
import { determineMaterialFromRGB } from '../utils/colorUtils';

export class DemolitionGrid {
  private buffer: GridBuffer;
  private loader: GridLoader;
  private physics: GridPhysics;
  
  // Cached library data (initially mocks, then overwritten by real asset analysis)
  private buildingBoundingBoxes: any[] = [];
  private totalFrames: number = 0;
  private spriteCellSize: number = 80;
  private parsedFrames: (any | null)[][][] = [];

  public damageApplied: boolean = false;

  constructor(width: number, height: number) {
    this.buffer = new GridBuffer(width, height);
    this.loader = new GridLoader(this.buffer);
    this.physics = new GridPhysics(this.buffer);
    
    // Set baseline defaults from mocks so the game doesn't crash before assets load
    this.initMockSpriteSheetSync();
  }

  private initMockSpriteSheetSync(): void {
    const data = generateMockSpriteSheetData();
    this.spriteCellSize = data.spriteCellSize;
    this.totalFrames = data.totalFrames;
    this.buildingBoundingBoxes = data.buildingBoundingBoxes;
    this.parsedFrames = data.parsedFrames;
  }

  /**
   * Analyzes the buildings.png sprite sheet to create the pixel-data library.
   * This replaces the mock data with real game assets.
   */
  public async loadSpriteSheet(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = imageUrl;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Could not get 2D context for sprite analysis'));
          return;
        }

        this.spriteCellSize = 80;
        const cols = Math.floor(img.width / this.spriteCellSize);
        const rows = Math.floor(img.height / this.spriteCellSize);
        this.totalFrames = cols * rows;
        this.parsedFrames = [];
        this.buildingBoundingBoxes = [];

        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const f = row * cols + col;
            const frameCells: (any | null)[][] = Array.from({ length: this.spriteCellSize }, () => Array(this.spriteCellSize).fill(null));
            let minX = this.spriteCellSize, maxX = -1, minY = this.spriteCellSize, maxY = -1;
            let nonTransparentCount = 0;

            canvas.width = this.spriteCellSize;
            canvas.height = this.spriteCellSize;
            ctx.drawImage(img, col * this.spriteCellSize, row * this.spriteCellSize, this.spriteCellSize, this.spriteCellSize, 0, 0, this.spriteCellSize, this.spriteCellSize);

            const imageData = ctx.getImageData(0, 0, this.spriteCellSize, this.spriteCellSize);
            const data = imageData.data;

            for (let y = 0; y < this.spriteCellSize; y++) {
              for (let x = 0; x < this.spriteCellSize; x++) {
                const idx = (y * this.spriteCellSize + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const a = data[idx + 3];

                if (a > 128) { // Threshold for "solid" pixel
                  const { material, hp } = determineMaterialFromRGB(r, g, b);
                  frameCells[y][x] = { color: (r << 16) | (g << 8) | b, material, hp, maxHp: hp, state: 0 }; // state: STATIC
                  nonTransparentCount++;
                  if (x < minX) minX = x;
                  if (x > maxX) maxX = x;
                  if (y < minY) minY = y;
                  if (y > maxY) maxY = y;
                }
              }
            }

            this.parsedFrames.push(frameCells);
            this.buildingBoundingBoxes.push({
              minX: maxX >= minX ? minX : 0,
              maxX: maxX >= minX ? maxX : 0,
              minY: maxY >= minY ? minY : 0,
              maxY: maxY >= minY ? maxY : 79,
              contentWidth: maxX >= minX ? (maxX - minX + 1) : 0,
              contentHeight: maxY >= minY ? (maxY - minY + 1) : 0,
              mass: nonTransparentCount
            });
          }
        }
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load sprite sheet at ${imageUrl}`));
    });
  }

  public async loadSpriteSheetAndAnalyze(imageUrl: string): Promise<void> {
    return this.loadSpriteSheet(imageUrl);
  }

  public initProceduralStructure(): void {
    this.buffer.clear();
    const startX = Math.floor(this.buffer.width / 2) - 40;
    const paddingBottom = this.getPaddingBottom(0);
    const targetGridY = this.buffer.height - this.spriteCellSize + paddingBottom;
    
    // Use the first frame of the current library (real or mock)
    this.loader.loadFromSpriteSheetFrame(this.parsedFrames[0], startX, targetGridY, 1.0);
  }

  public update(deltaTime: number, plinkoSpeedModifier: number = 0): PixelParticle[] {
    return this.physics.update(deltaTime, plinkoSpeedModifier);
  }

  public damageArea(gridX: number, gridY: number, radius: number, damage: number): void {
    this.damageApplied = true;
    this.physics.damageArea(gridX, gridY, radius, damage);
  }

  public loadFromSpriteSheetFrame(frameIdx: number, targetGridX: number, targetGridY: number, diffMult: number): void {
    if (frameIdx < 0 || frameIdx >= this.parsedFrames.length) return;
    this.loader.loadFromSpriteSheetFrame(this.parsedFrames[frameIdx], targetGridX, targetGridY, diffMult);
  }

  public getCell(x: number, y: number) { return this.buffer.getCell(x, y); }
  public setCell(x: number, y: number, cell: any) { this.buffer.setCell(x, y, cell); }
  public getWidth() { return this.buffer.width; }
  public getHeight() { return this.buffer.height; }
  public getSpriteCellSize() { return this.spriteCellSize; }
  public getTotalFrames() { return this.totalFrames; }
  public getBoundingBox(idx: number) { return this.buildingBoundingBoxes[idx]; }
  public getPaddingBottom(idx: number) {
    const bbox = this.getBoundingBox(idx);
    return this.spriteCellSize - 1 - (bbox?.maxY ?? 0);
  }
  public runStructuralIntegrityPass() { this.physics.runStructuralIntegrityPass(); }
}
