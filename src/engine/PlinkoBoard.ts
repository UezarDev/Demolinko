// src/engine/PlinkoBoard.ts - Plinko Board engine that handles upgradeable pegs, vector collision reflections, and particle absorption/merging mechanics.
/*
Exports:
- class PlinkoBoard: Represents the bottom half peg-matrix board and manages physics and peg collision resolution.
  * constructor(width: number, height: number, boardYOffset: number)
  * initPegGrid(): void
  * update(particles: PixelParticle[], deltaTime: number): PixelParticle[]
  * resolveCollisions(particle: PixelParticle, spawned: PixelParticle[]): boolean
  * absorbPegs(targetPegIds: string[]): void
  * render(pegGraphics: Graphics): void
  * getPegs(): Peg[]
  * setPegs(pegs: Peg[]): void
*/

import { Graphics } from 'pixi.js';
import { Peg, PegType, PixelParticle, MaterialType, MAX_SPLIT_DEPTH } from '../types/game';

export class PlinkoBoard {
  private width: number;
  private height: number;
  private boardYOffset: number;
  private pegs: Peg[] = [];
  private pegRadius: number = 6;
  private particleRadius: number = 8;
  private collisionDist: number;

  constructor(width: number, height: number, boardYOffset: number) {
    this.width = width;
    this.height = height;
    this.boardYOffset = boardYOffset;
    this.collisionDist = this.pegRadius + this.particleRadius;
    this.initPegGrid();
  }

  /**
   * Generates a rigid triangular/rectangular peg matrix on the bottom half of the board.
   */
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

        const type = PegType.NORMAL;

        this.pegs.push({
          id: `peg_${r}_${c}_${Math.random().toString(36).substr(2, 4)}`,
          x,
          y,
          type,
          level: 1,
          multiplier: 1.0,
          inheritedTypes: [],
        });
      }
    }
  }

  /**
   * Updates all active particles' positions, applying gravity, boundary constraints, 
   * and peg collisions. Handles splitting particles and returns new clone particles.
   */
  public update(particles: PixelParticle[], deltaTime: number): PixelParticle[] {
    const gravity = 550; // Vector gravity pull (downward pixels/sec^2)
    const clonedParticles: PixelParticle[] = [];

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Reset lastSplitPegId if completely exited its radius
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

      // Apply downward gravity acceleration
      p.vy += gravity * deltaTime;

      // Update position
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // 1. Boundary Collisions (Walls)
      // Left Wall
      if (p.x < this.particleRadius) {
        p.x = this.particleRadius;
        p.vx = -p.vx * 0.5; // Dampened bounce
      }
      // Right Wall
      else if (p.x > this.width - this.particleRadius) {
        p.x = this.width - this.particleRadius;
        p.vx = -p.vx * 0.5;
      }

      // 2. Peg Collisions
      this.resolveCollisions(p, clonedParticles);
    }

    return clonedParticles;
  }

  /**
   * Resolves circles-to-point collision physics between a particle and all pegs.
   * Leverages clean vector math for reflection, bounce boosts, splitting, and transmutation.
   */
  private resolveCollisions(p: PixelParticle, clonedParticles: PixelParticle[]): boolean {
    let collided = false;

    // Fast local sweeping check could be added, but simple O(N) over pegs is extremely fast for standard counts
    for (const peg of this.pegs) {
      const dx = p.x - peg.x;
      const dy = p.y - peg.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < this.collisionDist * this.collisionDist) {
        collided = true;
        const dist = Math.sqrt(distSq) || 0.001;

        // Normal Vector pointing from Peg to Particle
        const nx = dx / dist;
        const ny = dy / dist;

        // Vector Projection of Velocity onto Normal (V . N)
        const vDotN = p.vx * nx + p.vy * ny;

        // Resolve only if particle is actually moving towards the peg
        if (vDotN < 0) {
          // Determine elasticity based on particle material
          let elasticity = 0.5;
          switch (p.material) {
            case MaterialType.CONCRETE: elasticity = 0.20; break;
            case MaterialType.GLASS: elasticity = 0.45; break;
            case MaterialType.COPPER: elasticity = 0.85; break;
            case MaterialType.CHAOS: elasticity = 1.05; break;
          }

          // Reflective Vector formula: V_new = V - 2 * (V . N) * N * elasticity
          p.vx = p.vx - 2 * vDotN * nx * elasticity;
          p.vy = p.vy - 2 * vDotN * ny * elasticity;

          // Push the particle completely outside the peg radius to prevent intersection sticking
          p.x = peg.x + nx * this.collisionDist;
          p.y = peg.y + ny * this.collisionDist;

          // Apply peg behavioral hooks
          this.executePegHooks(peg, p, nx, ny, clonedParticles);
        }
      }
    }

    return collided;
  }

  /**
   * Triggers the appropriate special actions depending on the peg type collided with.
   */
  private executePegHooks(
    peg: Peg,
    p: PixelParticle,
    nx: number,
    ny: number,
    clonedParticles: PixelParticle[]
  ): void {
    const pegTypesToRun = [peg.type, ...peg.inheritedTypes];

    for (const type of pegTypesToRun) {
      switch (type) {
        case PegType.NORMAL:
          // Deflects normally (handled by parent physics). Adds flat modifier
          p.value += 1 * peg.level * peg.multiplier;
          break;

        case PegType.BOUNCER:
          // Adds a raw velocity boost vector upon impact
          const boostMagnitude = 350 + (peg.level * 30);
          p.vx += nx * boostMagnitude;
          p.vy += ny * boostMagnitude;
          p.value += 3 * peg.level * peg.multiplier;
          break;

        case PegType.SPLITTER:
          // Spawns an identical clone particle with mirrored horizontal velocity.
          // Can only split if split count is within MAX_SPLIT_DEPTH and didn't just split on this peg.
          if (p.splitCount < MAX_SPLIT_DEPTH && p.lastSplitPegId !== peg.id) {
            p.splitCount++;
            p.lastSplitPegId = peg.id;

            const splitVal = Math.max(1, Math.floor(p.value / 2));
            p.value = splitVal;

            // Offset the clone particle to the opposite side of the peg to clear collision overlap immediately
            const cloneX = peg.x - nx * this.collisionDist;
            const cloneY = peg.y - ny * this.collisionDist;

            clonedParticles.push({
              id: `p_clone_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              x: cloneX,
              y: cloneY,
              vx: -p.vx * 0.9, // Slightly dampened mirrored horizontal velocity
              vy: p.vy,
              color: p.color,
              material: p.material,
              value: splitVal,
              appliedEffects: [...p.appliedEffects, 'CLONED'],
              splitCount: p.splitCount,
              lastSplitPegId: p.lastSplitPegId,
            });
          }
          break;

        case PegType.ALCHEMIST:
          // 5% chance to transmute material into CHAOS format
          if (p.material !== MaterialType.CHAOS && Math.random() < 0.05 + (peg.level * 0.01)) {
            p.material = MaterialType.CHAOS;
            p.color = 0xd946ef; // Chaos magenta
            p.value *= 2;       // Double structural value instantly
            p.appliedEffects.push('CHAOS_ALCHEMIZED');
          }
          p.value += 2 * peg.level * peg.multiplier;
          break;

        case PegType.COMPOSITE:
          // Place holder sequence logic (all sub-hooks processed recursively)
          break;
      }
    }
  }

  /**
   * Layout Stub: Condenses a group of pegs into a single COMPOSITE peg,
   * summing their values and merging behavioral properties.
   */
  public absorbPegs(targetPegIds: string[]): void {
    if (targetPegIds.length <= 1) return;

    const targets = this.pegs.filter(p => targetPegIds.includes(p.id));
    if (targets.length === 0) return;

    // Pick first peg as the core absorption host
    const host = targets[0];
    host.type = PegType.COMPOSITE;

    let totalLevel = 0;
    let totalMultiplier = 0;
    const mergedInherited: PegType[] = [];

    for (const target of targets) {
      totalLevel += target.level;
      totalMultiplier += target.multiplier;
      if (target.type !== PegType.COMPOSITE) {
        mergedInherited.push(target.type);
      }
      mergedInherited.push(...target.inheritedTypes);

      // Delete other pegs from board except the host
      if (target.id !== host.id) {
        this.pegs = this.pegs.filter(p => p.id !== target.id);
      }
    }

    host.level = totalLevel;
    host.multiplier = totalMultiplier;
    // Remove duplicates from merged types
    host.inheritedTypes = Array.from(new Set(mergedInherited));
  }

  // Getters & Setters
  public getPegs(): Peg[] { return this.pegs; }
  public setPegs(pegs: Peg[]): void { this.pegs = pegs; }

  /**
   * Vector-renders the Plinko pegs onto the provided Graphics container.
   */
  public render(pegGraphics: Graphics): void {
    pegGraphics.clear();

    for (const peg of this.pegs) {
      let color = 0xffffff;
      let radius = 6;

      switch (peg.type) {
        case PegType.BOUNCER:
          color = 0xfb923c; // orange
          radius = 8;
          break;
        case PegType.SPLITTER:
          color = 0x38bdf8; // light blue
          radius = 7;
          break;
        case PegType.ALCHEMIST:
          color = 0xd946ef; // magenta
          radius = 7;
          break;
        case PegType.COMPOSITE:
          color = 0xa7f3d0; // bright mint green
          radius = 9;
          break;
      }

      // Glow highlight for upgraded pegs
      if (peg.level > 1) {
        pegGraphics.circle(peg.x, peg.y, radius + 2);
        pegGraphics.fill({ color, alpha: 0.3 });
      }

      pegGraphics.circle(peg.x, peg.y, radius);
      pegGraphics.fill({ color });
    }
  }
}

