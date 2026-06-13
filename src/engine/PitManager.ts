// src/engine/PitManager.ts - Pit Manager module managing the 12 basement sorting bins, payout calculation, and material-specific modifier randomization.
/*
Exports:
- class PitManager: Manages the 12 sorting pits, their spatial boundaries, and reward calculations.
  * constructor(width: number, boardHeight: number, pitHeight: number)
  * initPits(): void
  * randomizePitModifiers(): void
  * collectParticle(p: PixelParticle): { payout: number; pitIndex: number; label: string }
  * render(pitGraphics: Graphics, viewHeight: number): void
  * getPits(): Pit[]
  * setPits(pits: Pit[]): void
*/

import { Graphics } from 'pixi.js';
import { Pit, PixelParticle, MaterialType } from '../types/game';
import { PIT_SYSTEM } from '../config/balance';

export class PitManager {
  private width: number;
  private pits: Pit[] = [];
  private numPits: number = PIT_SYSTEM.COUNT;

  constructor(width: number, _boardHeight: number, _pitHeight: number) {
    this.width = width;
    this.initPits();
  }

  /**
   * Initializes 12 horizontally adjacent pits across the bottom boundary.
   */
  public initPits(): void {
    this.pits = [];
    const pitWidth = this.width / this.numPits;

    for (let i = 0; i < this.numPits; i++) {
      this.pits.push({
        index: i,
        xStart: i * pitWidth,
        xEnd: (i + 1) * pitWidth,
        baseMultiplier: PIT_SYSTEM.BASE_MULTIPLIER_MIN,
        scalingBonuses: {
          [MaterialType.CONCRETE]: 1.0,
          [MaterialType.GLASS]: 1.0,
          [MaterialType.COPPER]: 1.0,
          [MaterialType.WOOD]: 1.0,
          [MaterialType.CHAOS]: 1.0,
        },
      });
    }

    this.randomizePitModifiers();
  }

  /**
   * Randomizes specialized material multipliers across the pits to reward targeted falling sand funnels.
   */
  public randomizePitModifiers(): void {
    const chaosPitIndex = Math.floor(Math.random() * this.numPits);

    for (let i = 0; i < this.numPits; i++) {
      const pit = this.pits[i];
      pit.baseMultiplier = PIT_SYSTEM.BASE_MULTIPLIER_MIN + parseFloat((Math.random() * (PIT_SYSTEM.BASE_MULTIPLIER_MAX - PIT_SYSTEM.BASE_MULTIPLIER_MIN)).toFixed(1));

      // Group-based specialization layout
      if (i === chaosPitIndex) {
        // High risk / high reward chaos pit
        pit.scalingBonuses = PIT_SYSTEM.SPECIALIZATION.CHAOS_PIT;
      } else if (i < 4) {
        // Concrete Zone (Heavy Mass focus)
        pit.scalingBonuses = PIT_SYSTEM.SPECIALIZATION.CONCRETE_ZONE;
      } else if (i >= 4 && i < 8) {
        // Copper Zone (Highly elastic bouncers)
        pit.scalingBonuses = PIT_SYSTEM.SPECIALIZATION.COPPER_ZONE;
      } else {
        // Glass Zone (Brittle falling sheets)
        pit.scalingBonuses = PIT_SYSTEM.SPECIALIZATION.GLASS_ZONE;
      }
    }
  }

  /**
   * Places particle in the corresponding pit based on x-coordinate, applies multipliers,
   * and returns the final payout value, pit index, and description text.
   */
  public collectParticle(p: PixelParticle): { payout: number; pitIndex: number; label: string } {
    let targetPit = this.pits[0];

    // Find matching pit
    for (const pit of this.pits) {
      if (p.x >= pit.xStart && p.x < pit.xEnd) {
        targetPit = pit;
        break;
      }
    }

    const matMultiplier = targetPit.scalingBonuses[p.material] || 1.0;
    const baseMultiplier = targetPit.baseMultiplier || 1.0;
    const particleValue = p.value || 1;

    // Calculate actual payout: particle value * pit base multiplier * material multiplier
    const finalPayout = Math.round(particleValue * baseMultiplier * matMultiplier);

    // Construct a beautiful descriptive label for display in floaters
    let label = `${p.material}`;
    const totalMultiplier = baseMultiplier * matMultiplier;
    if (totalMultiplier > 1.5) {
      label += ` (CRIT ${totalMultiplier.toFixed(1)}x!)`;
    } else if (totalMultiplier < 0.5) {
      label += ` (PENALTY ${totalMultiplier.toFixed(1)}x)`;
    }

    return {
      payout: finalPayout,
      pitIndex: targetPit.index,
      label,
    };
  }

  // Getters & Setters
  public getPits(): Pit[] { return this.pits; }
  public setPits(pits: Pit[]): void { this.pits = pits; }

  /**
   * Vector-renders the collection pits onto the provided Graphics container.
   */
  public render(pitGraphics: Graphics, viewHeight: number): void {
    pitGraphics.clear();
    const bottomY = viewHeight - PIT_SYSTEM.BOTTOM_OFFSET;

    for (const pit of this.pits) {
      let color = 0x1e293b; // standard pit slate-800
      if (pit.index % 2 === 1) color = 0x0f172a; // alternate strip-color

      // Special highlighting for Chaos Pit
      const chaosBonus = pit.scalingBonuses[MaterialType.CHAOS];
      if (chaosBonus && chaosBonus > 5.0) {
        color = 0x311042; // Deep dark purple chaos area
      }

      // Draw pit base
      pitGraphics.rect(pit.xStart, bottomY, pit.xEnd - pit.xStart, PIT_SYSTEM.HEIGHT);
      pitGraphics.fill({ color });

      // Draw pit dividing walls
      pitGraphics.rect(pit.xStart, bottomY, PIT_SYSTEM.DIVIDER_WIDTH, PIT_SYSTEM.HEIGHT);
      pitGraphics.fill({ color: 0x334155 });
      pitGraphics.rect(pit.xEnd - PIT_SYSTEM.DIVIDER_WIDTH, bottomY, PIT_SYSTEM.DIVIDER_WIDTH, PIT_SYSTEM.HEIGHT);
      pitGraphics.fill({ color: 0x334155 });
    }
  }
}