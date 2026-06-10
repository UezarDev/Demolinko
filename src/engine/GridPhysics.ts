// src/engine/GridPhysics.ts - Cellular Automata and structural integrity logic.

import { GridBuffer } from './GridBuffer';
import { CellState, PixelParticle } from '../types/game';

export class GridPhysics {
  private isDirty: boolean = false;

  constructor(private buffer: GridBuffer) {}

  public markDirty(): void {
    this.isDirty = true;
  }

  public isDirty(): boolean {
    return this.isDirty;
  }

  /**
   * Main update loop for sand CA and structural integrity.
   */
  public update(deltaTime: number, plinkoSpeedModifier: number = 0): PixelParticle[] {
    const spawnedParticles = this.runSandSimulation(deltaTime, plinkoSpeedModifier);

    if (this.isDirty) {
      this.runStructuralIntegrityPass();
      this.isDirty = false;
    }

    return spawnedParticles;
  }

  private runSandSimulation(deltaTime: number, plinkoSpeedModifier: number = 0): PixelParticle[] {
    const spawnedParticles: PixelParticle[] = [];
    const processed = Array.from({ length: this.buffer.height }, () => Array(this.buffer.width).fill(false));

    for (let y = this.buffer.height - 1; y >= 0; y--) {
      for (let x = 0; x < this.buffer.width; x++) {
        const cell = this.buffer.getCell(x, y);
        if (!cell || cell.state !== CellState.SAND || processed[y][x]) continue;

        if (y === this.buffer.height - 1) {
          if (cell.decayTimer === undefined) {
            cell.decayTimer = Math.max(0.05, 0.5 - plinkoSpeedModifier);
          }
          cell.decayTimer -= deltaTime;
          if (cell.decayTimer <= 0) {
            this.buffer.setCell(x, y, null);
            const particleX = x * 4; // Using default cell size for now, should be passed in
            const particleRadius = 8;
            const particleY = this.buffer.height * 4 + particleRadius + 2;

            spawnedParticles.push({
              id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              x: particleX,
              y: particleY,
              vx: (Math.random() - 0.5) * 120,
              vy: 200 + Math.random() * 100,
              color: cell.color,
              material: cell.material,
              value: 1,
              appliedEffects: [],
              splitCount: 0,
              lastSplitPegId: null,
            });
            this.markDirty();
          }
          continue;
        }

        const nextY = y + 1;
        if (this.buffer.getCell(this.buffer.isValidCoords(x, nextY) ? x : -1, nextY) === null) {
          this.buffer.setCell(x, nextY, cell);
          this.buffer.setCell(x, y, null);
          processed[nextY][x] = true;
          continue;
        }

        const goLeftFirst = Math.random() < 0.5;
        const directions = goLeftFirst ? [x - 1, x + 1] : [x + 1, x - 1];
        let moved = false;

        for (const targetX of directions) {
          if (this.buffer.isValidCoords(targetX, nextY) && this.buffer.getCell(targetX, nextY) === null) {
            this.buffer.setCell(targetX, nextY, cell);
            this.buffer.setCell(x, y, null);
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

  public runStructuralIntegrityPass(): void {
    const visited = Array.from({ length: this.buffer.height }, () => Array(this.buffer.width).fill(false));
    const queue: { x: number; y: number }[] = [];

    for (let x = 0; x < this.buffer.width; x++) {
      for (let y = this.buffer.height - 1; y >= Math.max(0, this.buffer.height - 12); y--) {
        const cell = this.buffer.getCell(x, y);
        if (cell && cell.state === CellState.STATIC) {
          visited[y][x] = true;
          queue.push({ x, y });
          break;
        }
      }
    }

    let head = 0;
    while (head < queue.length) {
      const curr = queue[head++];
      for (let dx = -3; dx <= 3; dx++) {
        if (dx === 0) continue;
        const nx = curr.x + dx;
        const ny = curr.y;
        if (this.buffer.isValidCoords(nx, ny) && !visited[ny][nx]) {
          const neighbor = this.buffer.getCell(nx, ny);
          if (neighbor && neighbor.state === CellState.STATIC) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
      const verticalDys = [-1, 1];
      for (const dy of verticalDys) {
        const nx = curr.x;
        const ny = curr.y + dy;
        if (this.buffer.isValidCoords(nx, ny) && !visited[ny][nx]) {
          const neighbor = this.buffer.getCell(nx, ny);
          if (neighbor && neighbor.state === CellState.STATIC) {
            visited[ny][nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }

    for (let y = 0; y < this.buffer.height; y++) {
      for (let x = 0; x < this.buffer.width; x++) {
        const cell = this.buffer.getCell(x, y);
        if (cell && cell.state === CellState.STATIC && !visited[y][x]) {
          cell.state = CellState.SAND;
          this.markDirty();
        }
      }
    }
  }

  public damageCell(gridX: number, gridY: number, damage: number): void {
    if (!this.buffer.isValidCoords(gridX, gridY)) return;
    const cell = this.buffer.getCell(gridX, gridY);
    if (!cell || cell.state !== CellState.STATIC) return;
    cell.hp -= damage;
    if (cell.hp <= 0) {
      cell.state = CellState.SAND;
      this.markDirty();
    }
  }

  public damageArea(gridX: number, gridY: number, radius: number, damage: number): void {
    this.buffer.isValidCoords(gridX, gridY); // dummy call for parity
    const startX = Math.max(0, gridX - radius);
    const endX = Math.min(this.buffer.width - 1, gridX + radius);
    const startY = Math.max(0, gridY - radius);
    const endY = Math.min(this.buffer.height - 1, gridY + radius);

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
}
