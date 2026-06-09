import { Graphics } from 'pixi.js';
import { Peg, PegType, PixelParticle, MaterialType, MAX_SPLIT_DEPTH } from '../types/game';
import { ParticlePool } from './ParticlePool';

export class PlinkoBoard {
  private width: number;
  private height: number;
  private boardYOffset: number;
  private pegs: Peg[] = [];
  private pegRadius: number = 6;
  private particleRadius: number = 8;
  private collisionDist: number;
  private pool: ParticlePool = new ParticlePool(1000);

  private readonly CELL_SIZE = 50;
  private spatialGrid: Map<string, Peg[]> = new Map();

  constructor(width: number, height: number, boardYOffset: number) {
    this.width = width;
    this.height = height;
    this.boardYOffset = boardYOffset;
    this.collisionDist = this.pegRadius + this.particleRadius;
    this.initPegGrid();
  }

  public initPegGrid(): void {
    this.pegs = [];
    const rows = 9;
    const cols = 11;
    const spacingX = this.width / (cols + 1);
    const spacingY = (this.height - this.boardYOffset) / (rows + 1);

    for (let r = 0; r < rows; r++) {
      const isOffset = r % 2 === 1;
      const count = isOffset ? cols - 1 : cols;
      const startX = isOffset ? spacingX * 1.5 : spacingX;

      for (let c = 0; c < count; c++) {
        const x = startX + c * spacingX;
        const y = this.boardYOffset + spacingY + r * spacingY;
        this.pegs.push({
          id: `peg_${r}_${c}`,
          x,
          y,
          type: PegType.NORMAL,
          level: 1,
          multiplier: 1.0,
          inheritedTypes: [],
          scale: 1.0,
        });
      }
    }
    this.updateSpatialGrid();
  }

  private updateSpatialGrid(): void {
    this.spatialGrid.clear();
    for (const peg of this.pegs) {
      const cellX = Math.floor(peg.x / this.CELL_SIZE);
      const cellY = Math.floor(peg.y / this.CELL_SIZE);
      const key = `${cellX},${cellY}`;
      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, []);
      }
      this.spatialGrid.get(key)!.push(peg);
    }
  }

  public update(particles: PixelParticle[], deltaTime: number): PixelParticle[] {
    const gravity = 550;
    const clonedParticles: PixelParticle[] = [];

    // Handle peg animation decays
    for (const peg of this.pegs) {
      peg.scale -= (peg.scale - 1.0) * 0.1;
      if (peg.scale < 1) peg.scale = 1;
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.lastSplitPegId) {
        const lastPeg = this.pegs.find(g => g.id === p.lastSplitPegId);
        if (lastPeg) {
          const dx = p.x - lastPeg.x;
          const dy = p.y - lastPeg.y;
          const distSq = dx * dx + dy * dy;
          if (distSq >= this.collisionDist * this.collisionDist) {
            p.lastSplitPegId = null;
          }
        } else {
          p.lastSplitPegId = null;
        }
      }

      p.vy += gravity * deltaTime;
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      if (p.y > this.height + 100) {
        this.pool.release(p);
        particles.splice(i, 1);
        continue;
      }

      if (p.x < this.particleRadius) {
        p.x = this.particleRadius;
        p.vx = -p.vx * 0.5;
      } else if (p.x > this.width - this.particleRadius) {
        p.x = this.width - this.particleRadius;
        p.vx = -p.vx * 0.5;
      }

      this.resolveCollisions(p, clonedParticles);
    }

    return clonedParticles;
  }

  private resolveCollisions(p: PixelParticle, clonedParticles: PixelParticle[]): boolean {
    let collided = false;
    const cellX = Math.floor(p.x / this.CELL_SIZE);
    const cellY = Math.floor(p.y / this.CELL_SIZE);

    for (let x = cellX - 1; x <= cellX + 1; x++) {
      for (let y = cellY - 1; y <= cellY + 1; y++) {
        const key = `${x},${y}`;
        const cellPegs = this.spatialGrid.get(key);
        if (!cellPegs) continue;

        for (const peg of cellPegs) {
          const dx = p.x - peg.x;
          const dy = p.y - peg.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < this.collisionDist * this.collisionDist) {
            collided = true;
            const dist = Math.sqrt(distSq) || 0.001;
            const nx = dx / dist;
            const ny = dy / dist;
            const vDotN = p.vx * nx + p.vy * ny;

            if (vDotN < 0) {
              let elasticity = 0.5;
              switch (p.material) {
                case MaterialType.CONCRETE: elasticity = 0.20; break;
                case MaterialType.GLASS: elasticity = 0.45; break;
                case MaterialType.COPPER: elasticity = 0.85; break;
                case MaterialType.CHAOS: elasticity = 1.05; break;
              }

              p.vx = p.vx - 2 * vDotN * nx * elasticity;
              p.vy = p.vy - 2 * vDotN * ny * elasticity;
              p.x = peg.x + nx * this.collisionDist;
              p.y = peg.y + ny * this.collisionDist;

              // Juice: Bounce effect
              peg.scale = 1.2;

              this.executePegHooks(peg, p, nx, ny, clonedParticles);
            }
          }
        }
      }
    }
    return collided;
  }

  private executePegHooks(peg: Peg, p: PixelParticle, nx: number, ny: number, clonedParticles: PixelParticle[]): void {
    const pegTypesToRun = [peg.type, ...peg.inheritedTypes];
    for (const type of pegTypesToRun) {
      switch (type) {
        case PegType.NORMAL:
          p.value += 1 * peg.level * peg.multiplier;
          break;
        case PegType.BOUNCER:
          const boostMagnitude = 350 + (peg.level * 30);
          p.vx += nx * boostMagnitude;
          p.vy += ny * boostMagnitude;
          p.value += 3 * peg.level * peg.multiplier;
          break;
        case PegType.SPLITTER:
          if (p.splitCount < MAX_SPLIT_DEPTH && p.lastSplitPegId !== peg.id) {
            p.splitCount++;
            p.lastSplitPegId = peg.id;
            const splitVal = Math.max(1, Math.floor(p.value / 2));
            p.value = splitVal;
            const cloneX = peg.x - nx * this.collisionDist;
            const cloneY = peg.y - ny * this.collisionDist;
            const clone = this.pool.get();
            if (clone) {
              clone.id = `${p.id}_clone`;
              clone.x = cloneX;
              clone.y = cloneY;
              clone.vx = -p.vx * 0.9;
              clone.vy = p.vy;
              clone.color = p.color;
              clone.material = p.material;
              clone.value = splitVal;
              clone.appliedEffects = [...p.appliedEffects, 'CLONED'];
              clone.splitCount = p.splitCount;
              clone.lastSplitPegId = p.lastSplitPegId;
              clonedParticles.push(clone);
            }
          }
          break;
        case PegType.ALCHEMIST:
          if (p.material !== MaterialType.CHAOS && Math.random() < 0.05 + (peg.level * 0.01)) {
            p.material = MaterialType.CHAOS;
            p.color = 0xd946ef;
            p.value *= 2;
            p.appliedEffects.push('CHAOS_ALCHEMIZED');
          }
          p.value += 2 * peg.level * peg.multiplier;
          break;
      }
    }
  }

  public absorbPegs(targetPegIds: string[]): void {
    if (targetPegIds.length <= 1) return;
    const targets = this.pegs.filter(p => targetPegIds.includes(p.id));
    if (targets.length === 0) return;
    const host = targets[0];
    host.type = PegType.COMPOSITE;
    let totalLevel = 0;
    let totalMultiplier = 0;
    const mergedInherited: PegType[] = [];
    for (const target of targets) {
      totalLevel += target.level;
      totalMultiplier += target.multiplier;
      if (target.type !== PegType.COMPOSITE) mergedInherited.push(target.type);
      mergedInherited.push(...target.inheritedTypes);
      if (target.id !== host.id) this.pegs = this.pegs.filter(p => p.id !== target.id);
    }
    host.level = totalLevel;
    host.multiplier = totalMultiplier;
    host.inheritedTypes = Array.from(new Set(mergedInherited));
    this.updateSpatialGrid();
  }

  public getPegs(): Peg[] { return this.pegs; }
  public setPegs(pegs: Peg[]): void { 
    this.pegs = pegs; 
    this.updateSpatialGrid();
  }

  public render(pegGraphics: Graphics): void {
    pegGraphics.clear();
    for (const peg of this.pegs) {
      let color = 0xffffff;
      let baseRadius = 6;
      const scale = peg.scale || 1;

      switch (peg.type) {
        case PegType.BOUNCER: color = 0xfb923c; baseRadius = 8; break;
        case PegType.SPLITTER: color = 0x38bdf8; baseRadius = 7; break;
        case PegType.ALCHEMIST: color = 0xd946ef; baseRadius = 7; break;
        case PegType.COMPOSITE: color = 0xa7f3d0; baseRadius = 9; break;
      }

      const radius = baseRadius * scale;

      if (peg.level > 1) {
        pegGraphics.circle(peg.x, peg.y, radius + 2);
        pegGraphics.fill({ color, alpha: 0.3 });
      }
      pegGraphics.circle(peg.x, peg.y, radius);
      pegGraphics.fill({ color });
    }
  }
}
