// src/engine/DemolitionGrid.ts - Engine module that manages the 2D cellular automata demolition grid, PNG structure parsing, and structural integrity collapse simulations.
/*
Exports:
- class DemolitionGrid: Manages the 2D cellular automata grid (top-half of screen) and its physics/integrity calculations.
  * constructor(width: number, height: number, cellSize: number)
  * initProceduralStructure(): void
  * loadFromImage(imageSrc: string): Promise<void>
  * loadFromSpriteSheet(sheetSrc: string, cellIndex: number, targetGridX: number, targetGridY: number, sheetCols: number): Promise<void>
  * parseCanvasData(ctx: CanvasRenderingContext2D, width: number, height: number): void
  * update(deltaTime: number): PixelParticle[]
  * runSandSimulation(): PixelParticle[]
  * runStructuralIntegrityPass(): void
  * damageCell(gridX: number, gridY: number, damage: number): void
  * damageArea(gridX: number, gridY: number, radius: number, damage: number): void
  * getCell(gridX: number, gridY: number): GridCell | null
  * setCell(gridX: number, gridY: number, cell: GridCell | null): void
  * getWidth(): number
  * getHeight(): number
  * getCellSize(): number
*/

import { CellState, MaterialType, GridCell, PixelParticle } from '../types/game';

export class DemolitionGrid {
  private width: number;
  private height: number;
  private cellSize: number;
  private grid: (GridCell | null)[][];
  private isDirty: boolean = false;

  // Fields for dynamic sprite sheet analysis
  private pixelMasses: number[] = [];
  private buildingBoundingBoxes: { minX: number; maxX: number; minY: number; maxY: number; contentWidth: number; contentHeight: number }[] = [];
  private totalFrames: number = 0;
  private spriteCellSize: number = 80;
  private parsedFrames: (GridCell | null)[][][] = [];
  private spriteSheetSrc: string = '';
  
  // Public interaction flag for contract timer coordination
  public damageApplied: boolean = false;
  public sortedFramesByMass: number[] = [];
  private complexityLevels: number[] = [];

  constructor(width: number, height: number, cellSize: number) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.grid = Array.from({ length: height }, () => Array(width).fill(null));
    
    // Synchronously initialize mock frames instantly on construction
    this.initMockSpriteSheetSync();
    
    // Initialize procedural grid state using frame 0
    this.initProceduralStructure();
  }

  /**
   * Synchronously initializes default mock sprite sheet frames instantly on construction.
   * This ensures the grid has data immediately and works with zero asynchronous latency on start.
   */
  public initMockSpriteSheetSync(): void {
    this.spriteCellSize = 80;
    this.totalFrames = 5;
    this.pixelMasses = [];
    this.buildingBoundingBoxes = [];
    this.parsedFrames = [];

    for (let f = 0; f < this.totalFrames; f++) {
      const frameCells: (GridCell | null)[][] = Array.from({ length: 80 }, () => Array(80).fill(null));
      let nonTransparentCount = 0;
      let minX = 80;
      let maxX = -1;
      let minY = 80;
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
            // Roof is Wood (Brown, 40 HP)
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

      for (let y = 0; y < 80; y++) {
        for (let x = 0; x < 80; x++) {
          if (frameCells[y][x] !== null) {
            nonTransparentCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      this.pixelMasses.push(nonTransparentCount);
      const contentWidth = maxX >= minX ? (maxX - minX + 1) : 0;
      const contentHeight = maxY >= minY ? (maxY - minY + 1) : 0;
      this.buildingBoundingBoxes.push({
        minX: maxX >= minX ? minX : 0,
        maxX: maxX >= minX ? maxX : 0,
        minY: maxY >= minY ? minY : 0,
        maxY: maxY >= minY ? maxY : 79,
        contentWidth: contentWidth,
        contentHeight: contentHeight
      });
      this.parsedFrames.push(frameCells);
    }
    const frameIndices = Array.from({ length: this.totalFrames }, (_, idx) => idx);
    frameIndices.sort((a, b) => this.pixelMasses[a] - this.pixelMasses[b]);
    this.sortedFramesByMass = frameIndices;

    this.complexityLevels = new Array(this.totalFrames);
    for (let rank = 0; rank < this.sortedFramesByMass.length; rank++) {
      const frameIndex = this.sortedFramesByMass[rank];
      this.complexityLevels[frameIndex] = rank + 1;
    }
  }

  /**
   * Generates a high-quality default procedurally drawn sprite sheet with 5 unique building frames.
   */
  public generateDefaultSpriteSheet(): string {
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

  /**
   * Copies a pre-parsed sprite sheet frame into the active demolition grid, applying the dynamic health curve.
   */
  public loadFromSpriteSheetFrame(
    cellIndex: number,
    targetGridX: number,
    targetGridY: number,
    difficultyMultiplier: number
  ): void {
    if (cellIndex < 0 || cellIndex >= this.totalFrames) return;

    const frameCells = this.parsedFrames[cellIndex];

    for (let y = 0; y < this.spriteCellSize; y++) {
      for (let x = 0; x < this.spriteCellSize; x++) {
        const cell = frameCells[y][x];
        if (cell) {
          const destX = targetGridX + x;
          const destY = targetGridY + y;

          if (this.isValidCoords(destX, destY)) {
            let baseHp = 50;
            if (cell.material === MaterialType.CONCRETE) baseHp = 50;
            else if (cell.material === MaterialType.GLASS) baseHp = 30;
            else if (cell.material === MaterialType.COPPER) baseHp = 50;
            else if (cell.material === MaterialType.WOOD) baseHp = 40;

            const scaleHP = Math.round(baseHp * difficultyMultiplier);
            this.grid[destY][destX] = {
              color: cell.color,
              material: cell.material,
              hp: scaleHP,
              maxHp: scaleHP,
              state: CellState.STATIC,
            };
          }
        }
      }
    }
    this.isDirty = true;
  }

  /**
   * Initializes a default structural layout using Frame 0, placed neatly on the ground.
   */
  public initProceduralStructure(): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.grid[y][x] = null;
      }
    }

    // Place Frame 0 at center, shifted down so its base sits on the solid ground row (height - 1)
    const startX = Math.floor(this.width / 2) - 40;
    const paddingBottom = this.getPaddingBottom(0);
    const targetGridY = this.height - this.spriteCellSize + paddingBottom;
    
    this.loadFromSpriteSheetFrame(0, startX, targetGridY, 1.0);
  }

  /**
   * Loads an image URL, parses its pixel data on an offscreen canvas, and maps it into the grid buffer.
   */
  public async loadFromImage(imageSrc: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = this.width;
        offscreenCanvas.height = this.height;
        const ctx = offscreenCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, this.width, this.height);
          this.parseCanvasData(ctx, this.width, this.height);
          resolve();
        } else {
          reject(new Error('Failed to get offscreen canvas 2D context'));
        }
      };
      img.onerror = () => {
        // Safe fallback in case of loading errors
        this.initProceduralStructure();
        resolve();
      };
      img.src = imageSrc;
    });
  }

  /**
   * Refactors image loading to dynamically analyze sheet width, height, frame count, 
   * pixel masses, and bounding box widths/heights at runtime.
   */
  public async loadSpriteSheetAndAnalyze(sheetSrc: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.spriteSheetSrc = sheetSrc;

        const sheetWidth = img.width;
        const sheetHeight = img.height;
        const cellSize = this.spriteCellSize; // Use the configured sprite cell size variable (e.g. 80px)

        // Calculate grid columns and rows
        const cols = Math.floor(sheetWidth / cellSize);
        const rows = Math.floor(sheetHeight / cellSize);
        this.totalFrames = cols * rows;

        this.pixelMasses = [];
        this.buildingBoundingBoxes = [];
        this.parsedFrames = [];

        const offscreenCanvas = document.createElement('canvas');
        offscreenCanvas.width = sheetWidth;
        offscreenCanvas.height = sheetHeight;
        const ctx = offscreenCanvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);

        for (let i = 0; i < this.totalFrames; i++) {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const sx = col * cellSize;
          const sy = row * cellSize;
          
          const imgData = ctx.getImageData(sx, sy, cellSize, cellSize);
          const data = imgData.data;

          const frameCells: (GridCell | null)[][] = Array.from({ length: cellSize }, () => Array(cellSize).fill(null));
          let nonTransparentCount = 0;
          let minX = cellSize;
          let maxX = -1;
          let minY = cellSize;
          let maxY = -1;

          for (let y = 0; y < cellSize; y++) {
            for (let x = 0; x < cellSize; x++) {
              const idx = (y * cellSize + x) * 4;
              const r = data[idx];
              const g = data[idx + 1];
              const b = data[idx + 2];
              const a = data[idx + 3];

              if (a >= 50) {
                nonTransparentCount++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;

                const color = (r << 16) | (g << 8) | b;
                const rf = r / 255;
                const gf = g / 255;
                const bf = b / 255;
                const max = Math.max(rf, gf, bf);
                const min = Math.min(rf, gf, bf);
                let h = 0;
                let s = 0;
                const l = (max + min) / 2;

                if (max !== min) {
                   const d = max - min;
                   s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                   switch (max) {
                     case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
                     case gf: h = (bf - rf) / d + 2; break;
                     case bf: h = (rf - gf) / d + 4; break;
                   }
                   h *= 60;
                }

                let material = MaterialType.COPPER;
                let defaultHP = 50;
                if (s < 0.20) {
                  material = MaterialType.CONCRETE;
                  defaultHP = 50;
                } else if (h >= 160 && h <= 260) {
                  material = MaterialType.GLASS;
                  defaultHP = 30;
                } else if (h >= 20 && h <= 50 && s < 0.65) {
                  material = MaterialType.WOOD;
                  defaultHP = 40;
                } else if (h < 60 || h > 330) {
                  material = MaterialType.COPPER;
                  defaultHP = 50;
                } else {
                  material = l < 0.5 ? MaterialType.CONCRETE : MaterialType.COPPER;
                  defaultHP = 50;
                }

                frameCells[y][x] = {
                  color,
                  material,
                  hp: defaultHP,
                  maxHp: defaultHP,
                  state: CellState.STATIC,
                };
              }
            }
          }

          this.pixelMasses.push(nonTransparentCount);
          const contentWidth = maxX >= minX ? (maxX - minX + 1) : 0;
          const contentHeight = maxY >= minY ? (maxY - minY + 1) : 0;
          this.buildingBoundingBoxes.push({
            minX: maxX >= minX ? minX : 0,
            maxX: maxX >= minX ? maxX : 0,
            minY: maxY >= minY ? minY : 0,
            maxY: maxY >= minY ? maxY : (cellSize - 1),
            contentWidth: contentWidth,
            contentHeight: contentHeight
          });
          this.parsedFrames.push(frameCells);
        }

        const frameIndices = Array.from({ length: this.totalFrames }, (_, idx) => idx);
        frameIndices.sort((a, b) => this.pixelMasses[a] - this.pixelMasses[b]);
        this.sortedFramesByMass = frameIndices;

        this.complexityLevels = new Array(this.totalFrames);
        for (let rank = 0; rank < this.sortedFramesByMass.length; rank++) {
          const frameIndex = this.sortedFramesByMass[rank];
          this.complexityLevels[frameIndex] = rank + 1;
        }

        resolve();
      };
      img.onerror = () => {
        reject(new Error('Failed to load sheet image ' + sheetSrc));
      };
      img.src = sheetSrc;
    });
  }

  /**
   * Loads a sprite sheet, slices a specific frame, and extracts material
   * pixel data into the demolition grid starting at target coordinates.
   */
  public async loadFromSpriteSheet(
    sheetSrc: string,
    cellIndex: number,
    targetGridX: number,
    targetGridY: number,
    _sheetCols: number
  ): Promise<void> {
    if (this.spriteSheetSrc !== sheetSrc) {
      await this.loadSpriteSheetAndAnalyze(sheetSrc);
    }
    this.loadFromSpriteSheetFrame(cellIndex, targetGridX, targetGridY, 1.0);
  }

  // Getters for dynamic sprite assets
  public getPixelMass(index: number): number {
    if (index < 0 || index >= this.pixelMasses.length) return 100;
    return this.pixelMasses[index];
  }

  public getBoundingBox(index: number): { minX: number; maxX: number; minY: number; maxY: number; contentWidth: number; contentHeight: number } {
    if (index < 0 || index >= this.buildingBoundingBoxes.length) {
      return { minX: 0, maxX: 79, minY: 0, maxY: 79, contentWidth: 80, contentHeight: 80 };
    }
    return this.buildingBoundingBoxes[index];
  }

  public getPaddingBottom(index: number): number {
    const bbox = this.getBoundingBox(index);
    return this.spriteCellSize - 1 - bbox.maxY;
  }

  public getTotalFrames(): number {
    return this.totalFrames;
  }

  /**
   * Returns the Complexity Level of a frame, based on its rank in the pixel mass sorted list.
   * Complexity Level is 1-indexed (1 is lowest complexity/lowest pixel mass).
   */
  public getComplexityLevel(frameIndex: number): number {
    return this.complexityLevels[frameIndex] || 1;
  }

  public getSpriteCellSize(): number {
    return this.spriteCellSize;
  }

  public getParsedFrames(): (GridCell | null)[][][] {
    return this.parsedFrames;
  }

  /**
   * Parses canvas ImageData and populates the grid based on Hue/Saturation/Value (HSV) rules.
   * Completely excludes legacy ceiling support anchors.
   */
  public parseCanvasData(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Clear existing grid
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        this.grid[y][x] = null;
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const a = data[idx + 3];

        if (a < 50) continue; // Transparent pixel is treated as empty air

        // Hex color
        const color = (r << 16) | (g << 8) | b;

        // Convert RGB to HSL
        const rf = r / 255;
        const gf = g / 255;
        const bf = b / 255;
        const max = Math.max(rf, gf, bf);
        const min = Math.min(rf, gf, bf);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case rf: h = (gf - bf) / d + (gf < bf ? 6 : 0); break;
            case gf: h = (bf - rf) / d + 2; break;
            case bf: h = (rf - gf) / d + 4; break;
          }
          h *= 60;
        }

        // Rule A: Saturation < 20% -> CONCRETE (Grey/Dark colors)
        if (s < 0.20) {
          this.grid[y][x] = {
            color,
            material: MaterialType.CONCRETE,
            hp: 50,
            maxHp: 50,
            state: CellState.STATIC,
          };
        } 
        // Rule B: Saturation >= 20% & Hue in blue/cyan spectrum [160, 260] -> GLASS
        else if (h >= 160 && h <= 260) {
          this.grid[y][x] = {
            color,
            material: MaterialType.GLASS,
            hp: 30,
            maxHp: 30,
            state: CellState.STATIC,
          };
        }
        // Rule C: Saturation >= 20% & Hue in brown spectrum (H [20, 50], low saturation) -> WOOD
        else if (h >= 20 && h <= 50 && s < 0.65) {
          this.grid[y][x] = {
            color,
            material: MaterialType.WOOD,
            hp: 40,
            maxHp: 40,
            state: CellState.STATIC,
          };
        }
        // Rule D: Saturation >= 20% & Hue in red/orange spectrum (approx H < 60 or H > 330) -> COPPER
        else if (h < 60 || h > 330) {
          this.grid[y][x] = {
            color,
            material: MaterialType.COPPER,
            hp: 50,
            maxHp: 50,
            state: CellState.STATIC,
          };
        }
        // Fallback to Copper or Concrete based on brightness
        else {
          const fallbackHP = 50;
          this.grid[y][x] = {
            color,
            material: l < 0.5 ? MaterialType.CONCRETE : MaterialType.COPPER,
            hp: fallbackHP,
            maxHp: fallbackHP,
            state: CellState.STATIC,
          };
        }
      }
    }
  }

  /**
   * Main frame update loop for the demolition grid.
   * Performs the Noita-style cellular automata falling-sand simulations,
   * handles structural integrity check updates, and returns any sand cells
   * that fell past the bottom boundary to be converted into physics particles.
   */
  public update(deltaTime: number, plinkoSpeedModifier: number = 0): PixelParticle[] {
    // 1. Run falling sand simulations
    const spawnedParticles = this.runSandSimulation(deltaTime, plinkoSpeedModifier);

    // 2. Periodic structural integrity passes to trigger collapses
    if (this.isDirty) {
      this.runStructuralIntegrityPass();
      this.isDirty = false;
    }

    return spawnedParticles;
  }

  /**
   * Runs Noita-style falling sand cellular automata logic on SAND cells.
   * Sand cells falling past the bottom of the grid are converted to PixelParticles and returned.
   */
  private runSandSimulation(deltaTime: number, plinkoSpeedModifier: number = 0): PixelParticle[] {
    const spawnedParticles: PixelParticle[] = [];
    const processed = Array.from({ length: this.height }, () => Array(this.width).fill(false));

    // Iterate bottom-to-top to avoid double-evaluation of falling sand in a single frame
    for (let y = this.height - 1; y >= 0; y--) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        if (!cell || cell.state !== CellState.SAND || processed[y][x]) continue;

        // If the sand cell is on the bottom-most row, it is touching the ground!
        if (y === this.height - 1) {
          if (cell.decayTimer === undefined) {
            cell.decayTimer = Math.max(0.05, 0.5 - plinkoSpeedModifier);
          }
          cell.decayTimer -= deltaTime;
          if (cell.decayTimer <= 0) {
            // Erase sand cell
            this.grid[y][x] = null;

            // Generate particle birth properties (spawning right below the bottom row)
            const particleX = x * this.cellSize + this.cellSize / 2;
            const particleRadius = 8;
            const particleY = this.height * this.cellSize + particleRadius + 2;

            spawnedParticles.push({
              id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              x: particleX,
              y: particleY,
              vx: (Math.random() - 0.5) * 120, // slightly outward drift
              vy: 200 + Math.random() * 100,  // falling velocity
              color: cell.color,
              material: cell.material,
              value: 1,
              appliedEffects: [],
              splitCount: 0,
              lastSplitPegId: null,
            });
            this.isDirty = true; // Mark dirty to let sand cells above slide/fall down
          }
          continue;
        }

        const nextY = y + 1;

        // 1. Check directly beneath
        if (this.grid[nextY][x] === null) {
          this.grid[nextY][x] = cell;
          this.grid[y][x] = null;
          processed[nextY][x] = true;
          continue;
        }

        // 2. Check diagonals beneath (randomize priority of left vs right to prevent bias)
        const goLeftFirst = Math.random() < 0.5;
        const leftX = x - 1;
        const rightX = x + 1;
        let moved = false;

        const directions = goLeftFirst ? [leftX, rightX] : [rightX, leftX];

        for (const targetX of directions) {
          if (this.isValidCoords(targetX, nextY) && this.grid[nextY][targetX] === null) {
            this.grid[nextY][targetX] = cell;
            this.grid[y][x] = null; // FIXED position-swap duplication bug
            processed[nextY][targetX] = true;
            moved = true;
            break;
          }
        }

        if (moved) continue;
      }
    }

    return spawnedParticles;
  }

  /**
   * Runs a complete ground-up structural integrity check using a BFS flood-fill.
   * Any STATIC cell that cannot trace a connected path of STATIC cells back to
   * the solid ground floor (y = height - 1) collapses into a gravity-affected SAND cell.
   * Accounts for any base transparent padding rows safely by looking up to 12 rows from bottom.
   */
  public runStructuralIntegrityPass(): void {
    const visited = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    const queue: { x: number; y: number }[] = [];

    // Initialize BFS with ground-floor anchor blocks
    // For each column, we find the lowest STATIC cell in the bottom 12 rows of the grid.
    // This perfectly accounts for transparent bottom padding, arches, and gates.
    for (let x = 0; x < this.width; x++) {
      for (let y = this.height - 1; y >= Math.max(0, this.height - 12); y--) {
        const cell = this.grid[y][x];
        if (cell && cell.state === CellState.STATIC) {
          visited[y][x] = true;
          queue.push({ x, y });
          break; // Anchor only the bottom-most cell of each column in this zone
        }
      }
    }

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];

      // 1. Horizontal connections: within 3 pixels horizontally on the same row
      for (let dx = -3; dx <= 3; dx++) {
        if (dx === 0) continue;
        const nx = curr.x + dx;
        const ny = curr.y;

        if (this.isValidCoords(nx, ny) && !visited[ny][nx]) {
          const neighbor = this.grid[ny][nx];
          if (neighbor && neighbor.state === CellState.STATIC) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }

      // 2. Vertical connections: exactly 1 pixel directly above or below
      const verticalDys = [-1, 1];
      for (const dy of verticalDys) {
        const nx = curr.x;
        const ny = curr.y + dy;

        if (this.isValidCoords(nx, ny) && !visited[ny][nx]) {
          const neighbor = this.grid[ny][nx];
          if (neighbor && neighbor.state === CellState.STATIC) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    // Transition unsupported static cells into sand (check all rows 0 to height - 1)
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[y][x];
        if (cell && cell.state === CellState.STATIC && !visited[y][x]) {
          cell.state = CellState.SAND;
          this.isDirty = true; // Mark dirty to keep updating CA sand physics
        }
      }
    }
  }

  /**
   * Applies damage to a specific cell in the grid.
   * Decrements cell HP. If the cell dies, it is cleared, and the grid
   * is marked dirty to run structural integrity checks.
   */
  public damageCell(gridX: number, gridY: number, damage: number): void {
    if (!this.isValidCoords(gridX, gridY)) return;

    const cell = this.grid[gridY][gridX];
    if (!cell || cell.state !== CellState.STATIC) return;

    cell.hp -= damage;
    
    if (cell.hp <= 0) {
      // Convert damaged MaterialType tiles directly into active falling sand units
      cell.state = CellState.SAND;
      cell.hp = 0;
      this.isDirty = true; // Needs integrity pass on next update
    }
  }

  /**
   * Inflicts damage on all active STATIC cells falling inside a circular mask coordinates area.
   */
  public damageArea(gridX: number, gridY: number, radius: number, damage: number): void {
    // 1. Mark that damage has been applied to start the contract timer
    this.damageApplied = true;

    // 2. Compute circular mask bounding limits
    const startX = Math.max(0, gridX - radius);
    const endX = Math.min(this.width - 1, gridX + radius);
    const startY = Math.max(0, gridY - radius);
    const endY = Math.min(this.height - 1, gridY + radius);

    // 3. Loop over bounding limits and damage cells within the circle radius
    for (let ty = startY; ty <= endY; ty++) {
      for (let tx = startX; tx <= endX; tx++) {
        const dx = tx - gridX;
        const dy = ty - gridY;
        if (dx * dx + dy * dy <= radius * radius) {
          this.damageCell(tx, ty, damage);
        }
      }
    }
  }

  /**
   * Helper to check coordinate boundary safety.
   */
  private isValidCoords(x: number, y: number): boolean {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // Getters & Setters
  public getCell(gridX: number, gridY: number): GridCell | null {
    if (!this.isValidCoords(gridX, gridY)) return null;
    return this.grid[gridY][gridX];
  }

  public setCell(gridX: number, gridY: number, cell: GridCell | null): void {
    if (!this.isValidCoords(gridX, gridY)) return;
    this.grid[gridY][gridX] = cell;
    this.isDirty = true;
  }

  public getWidth(): number { return this.width; }
  public getHeight(): number { return this.height; }
  public getCellSize(): number { return this.cellSize; }
}
