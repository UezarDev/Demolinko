// src/engine/RunManager.ts - Run Manager module that manages Day/Difficulty progression state machines, Blueprint Drafting, and procedural building budget layouts.
/*
Exports:
- interface DraftCard: Representation of a rogue-lite blueprint card selection.
  * id: string
  * title: string
  * description: string
  * icon: string
  * rarity: 'COMMON' | 'RARE' | 'LEGENDARY'
  * cost: number
- class RunManager: Handles progression logic, draft options generation, and procedural layout builders.
  * constructor()
  * progressDay(): void
  * triggerDraftPhase(): void
  * getDraftCards(): DraftCard[]
  * applyDraftSelection(card: DraftCard, pegBoard: any, pitManager: any): void
  * generateContractLayout(budget: number, gridWidth: number, gridHeight: number, cellGrid: any): { hueTint: number; tierMultiplier: number }
  * onContractCompleted(gridEngine: any): boolean
  * getCurrentTierTint(): number
  * getLayoutTier(): number
  * getDifficultyMultiplier(): number
  * getDay(): number
  * getCash(): number
  * addCash(amount: number): void
  * isDraftActive(): boolean
  * setDraftActive(val: boolean): void
  * isGameOverState(): boolean
*/



import { UPGRADE_TREE } from '../config/upgrades';
import { SaveManager } from './SaveManager';

export interface DraftCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  cost: number;
}

export class RunManager {
  private day: number = 1;
  private currentCash: number = 0;
  private isDraftPhaseActive: boolean = false;
  private isGameOver: boolean = false;
  private draftPool: DraftCard[] = [];

  // Progression variables for dynamic difficulties
  private layoutTier: number = 1;
  private difficultyMultiplier: number = 1.0;
  private completedFramesInTier: boolean[] = [];
  private lastSelectedFrames: number[] = [];
  private startingContracts: number = 0;

  // Contract Timer and Upgrade System state
  public isContractTimerActive: boolean = false;
  public contractRemainingTime: number = 60;
  public activeUpgrades: string[] = [];

  public get modifiers() {
    const mods = {
      cursorDamage: 0,
      cursorSpeed: 0.0,
      cursorSize: 0,
      plinkoSpeed: 0.0,
      unlockBouncers: false,
      unlockSplitters: false,
      unlockAlchemists: false,
    };

    for (const upgradeId of this.activeUpgrades) {
      const node = UPGRADE_TREE.find(n => n.id === upgradeId);
      if (node && node.effect) {
        if (node.effect.cursorDamage !== undefined) mods.cursorDamage += node.effect.cursorDamage;
        if (node.effect.cursorSpeed !== undefined) mods.cursorSpeed += node.effect.cursorSpeed;
        if (node.effect.cursorSize !== undefined) mods.cursorSize += node.effect.cursorSize;
        if (node.effect.plinkoSpeed !== undefined) mods.plinkoSpeed += node.effect.plinkoSpeed;
        if (node.effect.unlockBouncers) mods.unlockBouncers = true;
        if (node.effect.unlockSplitters) mods.unlockSplitters = true;
        if (node.effect.unlockAlchemists) mods.unlockAlchemists = true;
      }
    }

    return mods;
  }

  constructor() {
    this.initDraftPool();
    const save = SaveManager.load();
    if (save) {
      this.currentCash = save.totalGold;
      this.activeUpgrades = save.activeUpgrades;
      this.day = save.highestDayReached || 1;
    }
  }

  /**
   * Persists current game state metrics into browser LocalStorage.
   */
  public persist(): void {
    SaveManager.save({
      totalGold: this.currentCash,
      activeUpgrades: this.activeUpgrades,
      highestDayReached: this.day,
    });
  }

  /**
   * Initializes the extensible rewards registry of blueprint cards.
   */
  private initDraftPool(): void {
    this.draftPool = [
      {
        id: 'upgrade_normal_pegs',
        title: 'Peg Overcharge',
        description: 'Upgrade 3 random pegs. Increasing their level adds +1 flat structural payout value.',
        icon: '⚡',
        rarity: 'COMMON',
        cost: 0,
      },
      {
        id: 'add_bouncer_peg',
        title: 'Bouncer Fusion',
        description: 'Transforms 2 random Normal pegs into high-velocity Bouncers that launch particles upwards.',
        icon: '🌀',
        rarity: 'RARE',
        cost: 0,
      },
      {
        id: 'increase_all_pits',
        title: 'Basement Boost',
        description: 'Increases the base multiplier of 3 random pits by +0.3x.',
        icon: '📥',
        rarity: 'COMMON',
        cost: 0,
      },
      {
        id: 'catalyst_alchemist',
        title: 'Chaos Catalyst',
        description: 'Enhances Alchemist pegs: Transmutation probability is boosted by a flat +3%.',
        icon: '🧪',
        rarity: 'LEGENDARY',
        cost: 0,
      },
      {
        id: 'demotool_efficiency',
        title: 'Gravity Sledge',
        description: 'Crumbling sand cells have a 10% chance to damage adjacent static structures as they slide.',
        icon: '🔨',
        rarity: 'RARE',
        cost: 0,
      },
      {
        id: 'glass_amplifier',
        title: 'Brittle Resonance',
        description: 'All GLASS material particles have their base payout values increased by +4.',
        icon: '💎',
        rarity: 'COMMON',
        cost: 0,
      },
    ];
  }

  /**
   * Increments the Day tracking.
   */
  public progressDay(): void {
    this.day += 1;
    this.isDraftPhaseActive = false;
    this.persist();
  }

  /**
   * Sets the game phase to the drafting overlay screen.
   */
  public triggerDraftPhase(): void {
    this.isDraftPhaseActive = true;
  }

  /**
   * Generates 3 randomized, distinct cards from the draft registry.
   */
  public getDraftCards(): DraftCard[] {
    const shuffled = [...this.draftPool].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }

  /**
   * Applies the selected card's upgrades to global codebase and board property states.
   */
  public applyDraftSelection(card: DraftCard, pegBoard: any, pitManager: any): void {
    switch (card.id) {
      case 'upgrade_normal_pegs': {
        const pegs = pegBoard.getPegs();
        // Upgrade 3 random pegs
        const shuffled = [...pegs].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(3, shuffled.length); i++) {
          shuffled[i].level += 1;
          shuffled[i].multiplier += 0.5;
        }
        break;
      }
      case 'add_bouncer_peg': {
        const pegs = pegBoard.getPegs();
        const normalPegs = pegs.filter((p: any) => p.type === 'NORMAL');
        const shuffled = [...normalPegs].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(2, shuffled.length); i++) {
          shuffled[i].type = 'BOUNCER';
        }
        break;
      }
      case 'increase_all_pits': {
        const pits = pitManager.getPits();
        const shuffled = [...pits].sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(3, shuffled.length); i++) {
          shuffled[i].baseMultiplier += 0.3;
        }
        break;
      }
      case 'catalyst_alchemist': {
        const pegs = pegBoard.getPegs();
        // Add Alchemist type to standard peg pool
        const normals = pegs.filter((p: any) => p.type === 'NORMAL');
        if (normals.length > 0) {
          normals[Math.floor(Math.random() * normals.length)].type = 'ALCHEMIST';
        }
        break;
      }
      default:
        // Other effects handled by global flags / math modifiers in main
        break;
    }
    
    // Complete draft phase
    this.isDraftPhaseActive = false;
  }

  /**
   * Generates up to 5 contract buildings placed side-by-side using smart layout packing
   * and bounding boxes. Stores references to ensure each frame gets cleared to complete a tier.
   */
  public generateContractLayout(
    budget: number,
    gridWidth: number,
    gridHeight: number,
    gridEngine: any
  ): { hueTint: number; tierMultiplier: number } {
    // Clear grid first
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        gridEngine.setCell(x, y, null);
      }
    }

    const totalFrames = gridEngine.getTotalFrames();
    if (this.startingContracts === 0) {
      // Set the baseline starting contracts length equal to the total frames detected on sprite sheet
      this.startingContracts = totalFrames;
    }

    if (this.completedFramesInTier.length !== totalFrames) {
      this.completedFramesInTier = new Array(totalFrames).fill(false);
    }

    // Place up to 5 buildings side-by-side on a single contract canvas based on the budget difficulty
    let numBuildings = 1;
    if (this.day === 1) {
      numBuildings = 1;
    } else if (budget > 120) {
      numBuildings = 5;
    } else if (budget > 85) {
      numBuildings = 4;
    } else if (budget > 55) {
      numBuildings = 3;
    } else if (budget > 25) {
      numBuildings = 2;
    }
    numBuildings = Math.min(5, Math.max(1, numBuildings));

    // Choose frames: Prefer frames that haven't been completed in this tier yet
    const selectedFrames: number[] = [];
    const uncompletedIndices: number[] = [];
    for (let i = 0; i < totalFrames; i++) {
      if (!this.completedFramesInTier[i]) {
        uncompletedIndices.push(i);
      }
    }

    for (let i = 0; i < numBuildings; i++) {
      if (this.day === 1) {
        // Find the frame index with the absolute lowest pixel mass
        const lowestMassFrame = (gridEngine.sortedFramesByMass && gridEngine.sortedFramesByMass.length > 0)
          ? gridEngine.sortedFramesByMass[0]
          : 0;
        selectedFrames.push(lowestMassFrame);
      } else if (uncompletedIndices.length > 0) {
        const randIdx = Math.floor(Math.random() * uncompletedIndices.length);
        const frameVal = uncompletedIndices.splice(randIdx, 1)[0];
        selectedFrames.push(frameVal);
      } else {
        // Fallback to random
        selectedFrames.push(Math.floor(Math.random() * totalFrames));
      }
    }

    this.lastSelectedFrames = selectedFrames;

    // Smart horizontal bounding box packing
    const gap = 3; // Tightly pack with 3px gap
    let totalContentWidth = 0;
    const bboxes = selectedFrames.map(f => gridEngine.getBoundingBox(f));

    bboxes.forEach(bbox => {
      totalContentWidth += bbox.contentWidth;
    });
    totalContentWidth += (numBuildings - 1) * gap;

    // Centered start X coordinate
    let currentX = Math.floor((gridWidth - totalContentWidth) / 2);
    if (currentX < 2) currentX = 2;

    // Load each frame into position
    selectedFrames.forEach((frameIdx, index) => {
      const bbox = bboxes[index];
      // Target grid X is adjusted by bbox.minX to align true content left edge with currentX
      const targetGridX = currentX - bbox.minX;
      
      // Calculate padding bottom for this frame to align its bottom content row exactly on row gridHeight - 1
      const paddingBottom = gridEngine.getPaddingBottom(frameIdx);
      const targetGridY = gridHeight - gridEngine.getSpriteCellSize() + paddingBottom;

      // Copy frame cells dynamically applying our HP scaling curve
      gridEngine.loadFromSpriteSheetFrame(frameIdx, targetGridX, targetGridY, this.difficultyMultiplier);

      currentX += bbox.contentWidth + gap;
    });

    // Force structural check to establish initial integrity states
    gridEngine.runStructuralIntegrityPass();

    // Custom WebGL shader-based tint values
    const hueTint = this.getCurrentTierTint();

    return { hueTint, tierMultiplier: this.difficultyMultiplier };
  }

  /**
   * Tracks progression conditions on contract layout completions.
   * Marks frames as cleared and returns true if the entire tier has been successfully completed.
   */
  public onContractCompleted(gridEngine: any): boolean {
    const totalFrames = gridEngine.getTotalFrames();
    if (this.completedFramesInTier.length !== totalFrames) {
      this.completedFramesInTier = new Array(totalFrames).fill(false);
    }

    // Mark frame indices parsed in the completed level as successfully cleared
    this.lastSelectedFrames.forEach(f => {
      if (f >= 0 && f < totalFrames) {
        this.completedFramesInTier[f] = true;
      }
    });

    // Evaluate whether the player completed the entire tier (clearing all base frames)
    if (this.completedFramesInTier.every(v => v)) {
      this.layoutTier += 1;
      this.difficultyMultiplier *= 1.8; // Apply multiplier for the next cycle
      this.completedFramesInTier.fill(false); // Reset frame progression list
      return true; // Tier has transitioned!
    }
    return false;
  }

  /**
   * Returns a custom color tint overlay hex based on layoutTier progression.
   */
  public getCurrentTierTint(): number {
    switch (this.layoutTier % 5) {
      case 1: return 0xffffff; // Tier 1: White
      case 2: return 0xa855f7; // Tier 2: Purple
      case 3: return 0xf59e0b; // Tier 3: Gold
      case 4: return 0x10b981; // Tier 4: Emerald
      case 0: return 0xef4444; // Tier 5: Red
      default: return 0xffffff;
    }
  }

  // Getters & Setters
  public getLayoutTier(): number { return this.layoutTier; }
  public getDifficultyMultiplier(): number { return this.difficultyMultiplier; }
  public getDay(): number { return this.day; }
  public getCash(): number { return this.currentCash; }
  public addCash(amount: number): void { this.currentCash += amount; }
  public isDraftActive(): boolean { return this.isDraftPhaseActive; }
  public setDraftActive(val: boolean): void { this.isDraftPhaseActive = val; }
  public isGameOverState(): boolean { return this.isGameOver; }

  /**
   * Deducts cash and unlocks a core passive upgrade if cash meets the required threshold.
   * Transmutes existing pegs on the board if an unlock upgrade is purchased.
   */
  public purchaseUpgrade(upgradeId: string, pegBoard?: any): boolean {
    const node = UPGRADE_TREE.find(n => n.id === upgradeId);
    if (!node) return false;

    if (this.currentCash >= node.cost) {
      this.currentCash -= node.cost;
      this.activeUpgrades.push(upgradeId);

      // Perform peg transmutations if pegBoard is provided
      if (pegBoard && typeof pegBoard.getPegs === 'function') {
        const pegs = pegBoard.getPegs();
        // Only target NORMAL pegs to transmute
        const normalPegs = pegs.filter((p: any) => p.type === 'NORMAL');
        const shuffled = [...normalPegs].sort(() => Math.random() - 0.5);

        if (upgradeId === 'unlock_bouncer') {
          for (let i = 0; i < Math.min(3, shuffled.length); i++) {
            shuffled[i].type = 'BOUNCER';
          }
        } else if (upgradeId === 'unlock_splitter') {
          for (let i = 0; i < Math.min(3, shuffled.length); i++) {
            shuffled[i].type = 'SPLITTER';
          }
        } else if (upgradeId === 'unlock_alchemist') {
          for (let i = 0; i < Math.min(2, shuffled.length); i++) {
            shuffled[i].type = 'ALCHEMIST';
          }
        }
      }

      this.persist();
      return true;
    }
    return false;
  }
}
