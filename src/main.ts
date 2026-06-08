// src/main.ts - Main entry point and bootstrapping layer for the Pachinko rogue-lite game, instantiating subsystems and event bridges.
/*
Exports:
- function initGame(): Promise<void>
*/

import { Application, Graphics, Container, FederatedPointerEvent, TextureStyle } from 'pixi.js';
import { DemolitionGrid } from './engine/DemolitionGrid';
import { PlinkoBoard } from './engine/PlinkoBoard';
import { PitManager } from './engine/PitManager';
import { RunManager } from './engine/RunManager';
import { UIManager } from './ui/UIManager';
import { ParticleRenderer } from './rendering/ParticleRenderer';
import { GridRenderer } from './rendering/GridRenderer';
import { GameLoop, GameLoopCallbacks } from './engine/GameLoop';
import { MainMenu } from './ui/MainMenu';

// Game Viewport and Dimensions Configurations
const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 900;
const GRID_CELL_SIZE = 4;
const GRID_COLS = VIEW_WIDTH / GRID_CELL_SIZE; // 200
const GRID_ROWS = 100; // 400px height for demolition grid

// Global Manager References
let app: Application;
let gridEngine: DemolitionGrid;
let plinkoBoard: PlinkoBoard;
let pitManager: PitManager;
let runManager: RunManager;
let uiManager: UIManager;
let particleRenderer: ParticleRenderer;
let gridRenderer: GridRenderer;
let gameLoop: GameLoop;
let cursorCircle: Graphics; // Hammer target area circle
let cursorCircleFill: Graphics; // Cooldown visual fill graphic

/**
 * Initializes PixiJS, scaffolds visual layout hierarchies, maps Event Bridges, and boots the GameLoop.
 */
export async function initGame(): Promise<void> {
  // Set PixiJS default scale mode to NEAREST to prevent pixel art blur
  TextureStyle.defaultOptions.scaleMode = 'nearest';

  // 1. Create and initialize the PixiJS v8 WebGL Application
  app = new Application();
  await app.init({
    width: VIEW_WIDTH,
    height: VIEW_HEIGHT,
    antialias: false,
    background: '#0a0d16',
    preference: 'webgl',
  });

  const parent = document.getElementById('game-container');
  if (parent) {
    parent.appendChild(app.canvas);
  }

  // 2. Initialize the core systems and simulation engines
  gridEngine = new DemolitionGrid(GRID_COLS, GRID_ROWS, GRID_CELL_SIZE);
  plinkoBoard = new PlinkoBoard(VIEW_WIDTH, VIEW_HEIGHT, GRID_ROWS * GRID_CELL_SIZE);
  pitManager = new PitManager(VIEW_WIDTH, VIEW_HEIGHT, 40);
  runManager = new RunManager(); // Start with no quota tracking

  // 3. Setup container hierarchies for peg and pit vector structures
  const boardContainer = new Container();
  app.stage.addChild(boardContainer);

  const pegGraphics = new Graphics();
  const pitGraphics = new Graphics();
  boardContainer.addChild(pitGraphics);
  boardContainer.addChild(pegGraphics);

  // 4. Instantiate high-performance rendering subsystems
  particleRenderer = new ParticleRenderer(app);
  gridRenderer = new GridRenderer(app, GRID_COLS, GRID_ROWS, GRID_CELL_SIZE, VIEW_WIDTH, gridEngine);

  // Initialize cursor circle graphics for hammer target area of effect
  const dmgRadius = 3;

  cursorCircleFill = new Graphics();
  cursorCircleFill.circle(0, 0, dmgRadius * GRID_CELL_SIZE);
  cursorCircleFill.fill({ color: 0xffffff, alpha: 0.2 });
  cursorCircleFill.visible = false;
  app.stage.addChild(cursorCircleFill);

  cursorCircle = new Graphics();
  cursorCircle.circle(0, 0, dmgRadius * GRID_CELL_SIZE);
  cursorCircle.stroke({ width: 1.5, color: 0xffffff, alpha: 0.7 });
  cursorCircle.visible = false;
  app.stage.addChild(cursorCircle);

  // 5. Instantiate UI Manager & Setup callback wires via the Event Bridge pattern
  uiManager = new UIManager('game-container');
  
  uiManager.setupHUDAndOverlays(
    (selectedCard) => {
      // Direct selected card options to game loop draft handler
      gameLoop.selectDraftCard(selectedCard.id);
    },
    () => {
      // Trigger run manager restart routing
      gameLoop.restartRun();
    }
  );

  // Define GameLoop callback interfaces mapped directly to UIManager actions
  const loopCallbacks: GameLoopCallbacks = {
    updateHUD: (cash, day, remainingTime) => {
      uiManager.updateHUD(cash, day, remainingTime);
    },
    showDraftOverlay: (isGameOver, currentDay, cards) => {
      if (cursorCircle) {
        cursorCircle.visible = false;
      }
      if (cursorCircleFill) {
        cursorCircleFill.visible = false;
      }
      // Map domain draft cards to UI-compatible draft card representations
      const uiCards = cards.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        icon: c.icon,
        rarity: c.rarity,
        cost: c.cost,
      }));
      uiManager.showDraftOverlay(isGameOver, currentDay, uiCards);
    },
    hideDraftOverlay: () => {
      uiManager.hideDraftOverlay();
    },
  };

  // 6. Instantiate the coordinate GameLoop orchestrator
  gameLoop = new GameLoop(
    app,
    gridEngine,
    plinkoBoard,
    pitManager,
    runManager,
    particleRenderer,
    gridRenderer,
    pegGraphics,
    pitGraphics,
    {
      viewWidth: VIEW_WIDTH,
      viewHeight: VIEW_HEIGHT,
      gridCols: GRID_COLS,
      gridRows: GRID_ROWS,
      gridCellSize: GRID_CELL_SIZE,
    },
    loopCallbacks,
    cursorCircle,
    cursorCircleFill
  );

  // 7. Bind interactive mouse pointer event gestures
  setupMouseListeners();

  // 8. Load procedural frames and structures
  try {
    await gridEngine.loadSpriteSheetAndAnalyze('buildings.png');
    console.log('Successfully loaded custom sprite sheet buildings.png!');
  } catch (err) {
    console.warn('Could not load custom buildings.png, falling back to mock structures:', err);
  }

  // Draw Day 1 layouts on grid canvas
  const layout = runManager.generateContractLayout(30, GRID_COLS, GRID_ROWS, gridEngine);
  gridRenderer.updateTint(layout.hueTint);

  // 9. Show Main Menu overlay
  const mainMenu = new MainMenu('game-container', () => {
    gameLoop.start();
  });
  mainMenu.show();
}

/**
 * Binds mouse and drag gestures to support the player's primary sledgehammer tool.
 */
function setupMouseListeners(): void {
  // Make the stage interactive to receive pointer/drag gestures across the full screen
  app.stage.eventMode = 'static';
  app.stage.hitArea = app.screen;

  const onPointerMove = (e: FederatedPointerEvent) => {
    if (runManager.isDraftActive()) {
      cursorCircle.visible = false;
      cursorCircleFill.visible = false;
      gameLoop.setMouseGridPosition(0, 0, false);
      return;
    }

    const globalX = e.global.x;
    const globalY = e.global.y;
    const gridX = Math.floor(globalX / GRID_CELL_SIZE);
    const gridY = Math.floor(globalY / GRID_CELL_SIZE);

    if (gridY >= 4 && gridY < GRID_ROWS && gridX >= 0 && gridX < GRID_COLS) {
      cursorCircle.x = globalX;
      cursorCircle.y = globalY;
      cursorCircle.visible = true;

      cursorCircleFill.x = globalX;
      cursorCircleFill.y = globalY;
      cursorCircleFill.visible = true;

      gameLoop.setMouseGridPosition(gridX, gridY, true);
    } else {
      cursorCircle.visible = false;
      cursorCircleFill.visible = false;
      gameLoop.setMouseGridPosition(0, 0, false);
    }
  };

  app.stage.on('pointermove', onPointerMove);

  app.stage.on('pointerleave', () => {
    cursorCircle.visible = false;
    cursorCircleFill.visible = false;
    gameLoop.setMouseGridPosition(0, 0, false);
  });
}

// Kickstart game on DOMContentLoaded load
window.addEventListener('DOMContentLoaded', () => {
  initGame().catch(console.error);
});
