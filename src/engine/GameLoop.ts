// src/engine/GameLoop.ts - Game Loop orchestrator that manages update physics iterations, collision detections, drafting states, and rendering steps.
/*
Exports:
- interface GameLoopCallbacks: Decoupled interface for notifying UI handlers about state adjustments.
- class GameLoop: Driving engine orchestrator for all sandbox steps and day transitions.
  * constructor(...)
  * start(): void
  * update(deltaTime: number): void
  * selectDraftCard(cardId: string): void
  * restartRun(): void
  * destroy(): void
*/

import { Application, Graphics } from 'pixi.js';
import { CellState, PixelParticle } from '../types/game';
import { DemolitionGrid } from './DemolitionGrid';
import { PlinkoBoard } from './PlinkoBoard';
import { PitManager } from './PitManager';
import { RunManager } from './RunManager';
import { ParticleRenderer } from '../rendering/ParticleRenderer';
import { GridRenderer } from '../rendering/GridRenderer';
import { UpgradeTreeUI } from '../ui/UpgradeTree';
import { EventBus } from '../core/EventBus';

export interface GameLoopCallbacks {
  // Completely decoupled; UI interactions now run via EventBus.
}

export interface GameLoopConfig {
  viewWidth: number;
  viewHeight: number;
  gridCols: number;
  gridRows: number;
  gridCellSize: number;
}

export interface GameContext {
  app: Application;
  gridEngine: DemolitionGrid;
  plinkoBoard: PlinkoBoard;
  pitManager: PitManager;
  runManager: RunManager;
  particleRenderer: ParticleRenderer;
  gridRenderer: GridRenderer;
  pegGraphics: Graphics;
  pitGraphics: Graphics;
  cursorCircle: Graphics;
  cursorCircleFill: Graphics;
  config: GameLoopConfig;
}

export class GameLoop {
  private app: Application;
  private gridEngine: DemolitionGrid;
  private plinkoBoard: PlinkoBoard;
  private pitManager: PitManager;
  private runManager: RunManager;
  private particleRenderer: ParticleRenderer;
  private gridRenderer: GridRenderer;

  private pegGraphics: Graphics;
  private pitGraphics: Graphics;
  private config: GameLoopConfig;
  private callbacks: GameLoopCallbacks;
  private cursorCircle: Graphics;
  private cursorCircleFill: Graphics;
  private upgradeTreeUI: UpgradeTreeUI;
  private timeOutScreen: TimeOutScreen;

  // Active sandbox entities
  private activeParticles: PixelParticle[] = [];
  private currentBudget: number = 30; // Starting contract layout budget

  // Auto-sledge attack timing & coordinates tracking
  private attackCooldown: number = 0;
  private currentGridX: number = 0;
  private currentGridY: number = 0;
  private isMouseOverGrid: boolean = false;
  private popScale: number = 1.0;

  constructor(
    context: GameContext,
    callbacks?: GameLoopCallbacks
  ) {
    this.app = context.app;
    this.gridEngine = context.gridEngine;
    this.plinkoBoard = context.plinkoBoard;
    this.pitManager = context.pitManager;
    this.runManager = context.runManager;
    this.particleRenderer = context.particleRenderer;
    this.gridRenderer = context.gridRenderer;
    this.pegGraphics = context.pegGraphics;
    this.pitGraphics = context.pitGraphics;
    this.config = context.config;
    this.cursorCircle = context.cursorCircle;
    this.cursorCircleFill = context.cursorCircleFill;
    this.callbacks = callbacks || {};

    this.upgradeTreeUI = new UpgradeTreeUI(
      'game-container',
      this.runManager,
      this.plinkoBoard,
      () => {
        this.restartDay();
      },
      () => {
        this.plinkoBoard.render(this.pegGraphics);
      }
    );

    this.timeOutScreen = new TimeOutScreen(
      'game-container',
      () => {
        this.restartDay();
      },
      () => {
        this.upgradeTreeUI.show();
      },
      () => {
        location.reload();
      }
    );
  }

  /**
   * Ticker callback registered to the PixiJS ticker.
   */
  private tickerCallback = (ticker: { deltaTime: number }) => {
    this.update(ticker.deltaTime / 60); // Standardizes delta scale to seconds
  };

  /**
   * Initializes state and registers update tick.
   */
  public start(): void {
    // 1. Vector draw the initial boards
    this.plinkoBoard.render(this.pegGraphics);
    this.pitManager.render(this.pitGraphics, this.config.viewHeight);

    // Reset timer flags
    this.gridEngine.damageApplied = false;
    this.runManager.isContractTimerActive = false;
    this.runManager.contractRemainingTime = 60.0;

    // 2. Initial HUD draw
    EventBus.emit('UI_UPDATE_HUD', {
      cash: this.runManager.getCash(),
      day: this.runManager.getDay(),
      remainingTime: this.runManager.contractRemainingTime
    });

    // 3. Render initial grid canvas
    this.gridRenderer.render();

    // 4. Attach update loop to Pixi ticker
    this.app.ticker.add(this.tickerCallback);
  }

  /**
   * Tracks current coordinates of player mouse position relative to sandbox grid cells.
   */
  public setMouseGridPosition(gridX: number, gridY: number, active: boolean): void {
    this.currentGridX = gridX;
    this.currentGridY = gridY;
    this.isMouseOverGrid = active;
  }

  /**
   * Evaluates update parameters for physics and CA simulation.
   */
  public update(deltaTime: number): void {
    if (this.runManager.isDraftActive()) {
      this.cursorCircle.visible = false;
      this.cursorCircleFill.visible = false;
      return;
    }

    // Fetch modifiers from RunManager
    const mods = this.runManager.modifiers;
    const cooldownThreshold = Math.max(0.1, 1.0 - mods.cursorSpeed);
    const sizeScale = (3 + mods.cursorSize) / 3;

    // Manage auto-sledgehammer attack cooldown and animations
    if (this.isMouseOverGrid) {
      this.attackCooldown += deltaTime;
      if (this.attackCooldown > cooldownThreshold) {
        this.attackCooldown = cooldownThreshold;
      }
      
      const progress = this.attackCooldown / cooldownThreshold;
      this.cursorCircleFill.scale.set(sizeScale * progress);

      if (this.attackCooldown >= cooldownThreshold) {
        // Trigger automatic damage hit covering size & damage upgrades
        this.gridEngine.damageArea(this.currentGridX, this.currentGridY, 3 + mods.cursorSize, 10 + mods.cursorDamage);
        this.attackCooldown = 0.0;
        this.cursorCircleFill.scale.set(0.0);
        // Briefly pop outer circle for impact feedback
        this.popScale = 1.3;
      }
    } else {
      this.attackCooldown = 0.0;
      this.cursorCircleFill.scale.set(0.0);
    }

    // Smoothly interpolate pop scale back to 1.0
    if (this.popScale > 1.0) {
      this.popScale = Math.max(1.0, this.popScale - deltaTime * 3.0);
    }
    this.cursorCircle.scale.set(sizeScale * this.popScale);

    // Timer System:
    // Initialize the timer on the first call to gridEngine.damageArea (tracked by damageApplied)
    if (!this.runManager.isContractTimerActive && this.gridEngine.damageApplied) {
      this.runManager.isContractTimerActive = true;
      this.runManager.contractRemainingTime = 60.0;
    }

    // Update the timer in the update() loop
    if (this.runManager.isContractTimerActive) {
      this.runManager.contractRemainingTime -= deltaTime;
      if (this.runManager.contractRemainingTime <= 0) {
        this.runManager.contractRemainingTime = 0;
        this.runManager.isContractTimerActive = false;
        
        // Trigger Upgrade Tree Overlay on Contract Failure
        this.runManager.setDraftActive(true);
        this.runManager.persist();
        this.timeOutScreen.show(this.runManager.getDay(), this.runManager.getCash());
        return;
      }
    }

    // 1. Update sand cell CA and fetch any sand falling past grid edge as new physics particles
    const newBorns = this.gridEngine.update(deltaTime, mods.plinkoSpeed);
    this.activeParticles.push(...newBorns);

    // 2. Perform Plinko board gravity, peg collisions, and boundaries calculations
    const clones = this.plinkoBoard.update(this.activeParticles, deltaTime);
    this.activeParticles.push(...clones);

    // 3. Resolve bottom pit collection and payout distribution
    for (let i = this.activeParticles.length - 1; i >= 0; i--) {
      const p = this.activeParticles[i];

      // If particle fell past bottom boundary -> collect payouts and free Sprite
      if (p.y >= this.config.viewHeight - 10) {
        const results = this.pitManager.collectParticle(p);
        this.runManager.addCash(results.payout);
        
        // Notify HUD overlay of score gains
        EventBus.emit('UI_UPDATE_HUD', {
          cash: this.runManager.getCash(),
          day: this.runManager.getDay(),
          remainingTime: this.runManager.contractRemainingTime
        });

        // Erase particle from active list
        this.activeParticles.splice(i, 1);
      }
    }

    // 4. Draw updated active particle sprites
    this.particleRenderer.render(this.activeParticles);

    // 5. Render Demolition Grid cells onto canvas buffer
    this.gridRenderer.render();

    // 6. Check contract completion conditions (all STATIC and SAND cleared)
    if (this.checkContractCompletion()) {
      // Wait for all active bouncing particles to collect before showing Draft Selection
      if (this.activeParticles.length === 0) {
        // Evaluate contract cleared for potential tier promotions
        this.runManager.onContractCompleted(this.gridEngine);
        this.triggerDraftPhase();
      }
    }

    // Always keep HUD timer updated smoothly
    EventBus.emit('UI_UPDATE_HUD', {
      cash: this.runManager.getCash(),
      day: this.runManager.getDay(),
      remainingTime: this.runManager.contractRemainingTime
    });
  }

  /**
   * Applies selected blueprint upgrade card and progresses simulation state.
   */
  public selectDraftCard(cardId: string): void {
    const cards = this.runManager.getDraftCards();
    const card = cards.find(c => c.id === cardId);
    if (card) {
      this.runManager.applyDraftSelection(card, this.plinkoBoard, this.pitManager);
      this.progressToNextDay();
    }
  }

  /**
   * Recycles and increments parameters for the next simulation layout.
   */
  private progressToNextDay(): void {
    // Complete the Day transition
    this.runManager.progressDay();
    
    // Reset timer and damage applied flags
    this.gridEngine.damageApplied = false;
    this.runManager.isContractTimerActive = false;
    this.runManager.contractRemainingTime = 60.0;

    EventBus.emit('UI_UPDATE_HUD', {
      cash: this.runManager.getCash(),
      day: this.runManager.getDay(),
      remainingTime: this.runManager.contractRemainingTime
    });

    // Hide drafting screen
    EventBus.emit('UI_HIDE_DRAFT');

    // Draw updated pegs with upgrades
    this.plinkoBoard.render(this.pegGraphics);

    // Generate randomized Pit bonuses
    this.pitManager.randomizePitModifiers();
    this.pitManager.render(this.pitGraphics, this.config.viewHeight);

    // Scale difficulties and rebuild structures
    this.currentBudget = Math.round(this.currentBudget * 1.4 + 10);
    const layout = this.runManager.generateContractLayout(
      this.currentBudget,
      this.config.gridCols,
      this.config.gridRows,
      this.gridEngine
    );
    this.gridRenderer.updateTint(layout.hueTint);

    // Reset particles and wipe renderer sprites
    this.activeParticles = [];
    this.particleRenderer.clear();

    this.runManager.setDraftActive(false);
  }

  /**
   * Triggers overlay popup state tracking.
   */
  private triggerDraftPhase(): void {
    this.runManager.setDraftActive(true);
    const cards = this.runManager.getDraftCards();
    
    EventBus.emit('UI_SHOW_DRAFT', {
      isGameOver: false,
      currentDay: this.runManager.getDay(),
      cards
    });
  }

  /**
   * Evaluates if any structural pixels remain in the play field.
   */
  private checkContractCompletion(): boolean {
    for (let y = 4; y < this.config.gridRows; y++) {
      for (let x = 0; x < this.config.gridCols; x++) {
        const cell = this.gridEngine.getCell(x, y);
        if (cell && (cell.state === CellState.STATIC || cell.state === CellState.SAND)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * Rebuilds the current day layout for a restart after spending cash in the upgrade tree.
   */
  public restartDay(): void {
    // Reset timer and damage applied flags
    this.gridEngine.damageApplied = false;
    this.runManager.isContractTimerActive = false;
    this.runManager.contractRemainingTime = 60.0;

    EventBus.emit('UI_UPDATE_HUD', {
      cash: this.runManager.getCash(),
      day: this.runManager.getDay(),
      remainingTime: this.runManager.contractRemainingTime
    });

    // Hide draft overlay
    EventBus.emit('UI_HIDE_DRAFT');

    // Draw updated pegs with upgrades
    this.plinkoBoard.render(this.pegGraphics);

    // Generate randomized Pit bonuses
    this.pitManager.randomizePitModifiers();
    this.pitManager.render(this.pitGraphics, this.config.viewHeight);

    // Rebuild structures for the CURRENT day budget (does not scale budget up)
    const layout = this.runManager.generateContractLayout(
      this.currentBudget,
      this.config.gridCols,
      this.config.gridRows,
      this.gridEngine
    );
    this.gridRenderer.updateTint(layout.hueTint);

    // Reset particles and wipe renderer sprites
    this.activeParticles = [];
    this.particleRenderer.clear();

    this.runManager.setDraftActive(false);
  }

  /**
   * Restarts the entire game run.
   */
  public restartRun(): void {
    location.reload();
  }

  /**
   * Detaches listeners and frees graphic layers cleanly.
   */
  public destroy(): void {
    this.app.ticker.remove(this.tickerCallback);
    this.particleRenderer.destroy();
    this.gridRenderer.destroy();
    this.pegGraphics.clear();
    this.pitGraphics.clear();
    this.activeParticles = [];
  }
}
