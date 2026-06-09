import { Application, Graphics, Container, FederatedPointerEvent, TextureStyle } from 'pixi.js';
import { DemolitionGrid } from '../engine/DemolitionGrid';
import { PlinkoBoard } from '../engine/PlinkoBoard';
import { PitManager } from '../engine/PitManager';
import { RunManager } from '../engine/RunManager';
import { UIManager } from '../ui/UIManager';
import { ParticleRenderer } from '../rendering/ParticleRenderer';
import { GridRenderer } from '../rendering/GridRenderer';
import { GameLoop, GameContext } from '../engine/GameLoop';
import { EventBus } from './EventBus';
import { MainMenu } from '../ui/MainMenu';
import { UpgradeTreeUI } from '../ui/UpgradeTree';
import { TimeOutScreen } from '../ui/TimeOutScreen';

const VIEW_WIDTH = 800;
const VIEW_HEIGHT = 900;
const GRID_CELL_SIZE = 4;
const GRID_COLS = VIEW_WIDTH / GRID_CELL_SIZE;
const GRID_ROWS = 100;

export class Game {
  private app!: Application;
  private gridEngine!: DemolitionGrid;
  private plinkoBoard!: PlinkoBoard;
  private pitManager!: PitManager;
  private runManager!: RunManager;
  private uiManager!: UIManager;
  private particleRenderer!: ParticleRenderer;
  private gridRenderer!: GridRenderer;
  private gameLoop!: GameLoop;
  private cursorCircle!: Graphics;
  private cursorCircleFill!: Graphics;
  private upgradeTreeUI!: UpgradeTreeUI;
  private timeOutScreen!: TimeOutScreen;

  public async bootstrap(): Promise<void> {
    TextureStyle.defaultOptions.scaleMode = 'nearest';

    this.app = new Application();
    await this.app.init({
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
      antialias: false,
      background: '#0a0d16',
      preference: 'webgl',
    });

    const parent = document.getElementById('game-container');
    if (parent) {
      parent.appendChild(this.app.canvas);
    }

    this.gridEngine = new DemolitionGrid(GRID_COLS, GRID_ROWS, GRID_CELL_SIZE);
    this.plinkoBoard = new PlinkoBoard(VIEW_WIDTH, VIEW_HEIGHT, GRID_ROWS * GRID_CELL_SIZE);
    this.pitManager = new PitManager(VIEW_WIDTH, VIEW_HEIGHT, 40);
    this.runManager = new RunManager();

    const boardContainer = new Container();
    this.app.stage.addChild(boardContainer);

    const pegGraphics = new Graphics();
    const pitGraphics = new Graphics();
    boardContainer.addChild(pitGraphics);
    boardContainer.addChild(pegGraphics);

    this.particleRenderer = new ParticleRenderer(this.app);
    this.gridRenderer = new GridRenderer(this.app, GRID_COLS, GRID_ROWS, GRID_CELL_SIZE, VIEW_WIDTH, this.gridEngine);

    const dmgRadius = 3;
    this.cursorCircleFill = new Graphics();
    this.cursorCircleFill.circle(0, 0, dmgRadius * GRID_CELL_SIZE);
    this.cursorCircleFill.circle(0, 0, dmgRadius * GRID_CELL_SIZE);
    this.cursorCircleFill.fill({ color: 0xffffff, alpha: 0.2 });
    this.cursorCircleFill.visible = false;
    this.app.stage.addChild(this.cursorCircleFill);

    this.cursorCircle = new Graphics();
    this.cursorCircle.circle(0, 0, dmgRadius * GRID_CELL_SIZE);
    this.cursorCircle.stroke({ width: 1.5, color: 0xffffff, alpha: 0.7 });
    this.cursorCircle.visible = false;
    this.app.stage.addChild(this.cursorCircle);

    this.uiManager = new UIManager('game-container');
    this.uiManager.setupHUDAndOverlays(
      (selectedCard) => EventBus.emit('GAME_DRAFT_SELECTED', selectedCard.id),
      () => EventBus.emit('GAME_RESTART_RUN')
    );

    this.upgradeTreeUI = new UpgradeTreeUI(
      'game-container',
      this.runManager,
      this.plinkoBoard,
      () => this.gameLoop?.restartDay(),
      () => this.plinkoBoard?.renderPegs()
    );
    this.timeOutScreen = new TimeOutScreen('game-container');

    this.setupEventBusMappings();

    const context: GameContext = {
      app: this.app,
      gridEngine: this.gridEngine,
      plinkoBoard: this.plinkoBoard,
      pitManager: this.pitManager,
      runManager: this.runManager,
      particleRenderer: this.particleRenderer,
      gridRenderer: this.gridRenderer,
      pegGraphics: pegGraphics,
      pitGraphics: pitGraphics,
      cursorCircle: this.cursorCircle,
      cursorCircleFill: this.cursorCircleFill,
      config: {
        viewWidth: VIEW_WIDTH,
        viewHeight: VIEW_HEIGHT,
        gridCols: GRID_COLS,
        gridRows: GRID_ROWS,
        gridCellSize: GRID_CELL_SIZE,
      },
    };

    this.gameLoop = new GameLoop(context);
    this.setupMouseListeners();

    try {
      await this.gridEngine.loadSpriteSheetAndAnalyze('buildings.png');
    } catch (err) {
      console.warn('Could not load custom buildings.png, falling back to mock structures:', err);
    }

    const layout = this.runManager.generateContractLayout(30, GRID_COLS, GRID_ROWS, this.gridEngine);
    this.gridRenderer.updateTint(layout.hueTint);
    this.app.stage.visible = false;

    const mainMenu = new MainMenu('game-container', () => {
      this.gameLoop.start();
    });
    mainMenu.show();
  }

  private setupEventBusMappings(): void {
    EventBus.on('UI_UPDATE_HUD', (data) => {
      this.uiManager.updateHUD(data.cash, data.day, data.remainingTime);
    });

    EventBus.on('GAME_RESTART_RUN', () => {
      this.gameLoop.restartRun();
    });

    EventBus.on('GAME_RETRY_DAY', () => {
      this.gameLoop.restartDay();
    });

    EventBus.on('GAME_DRAFT_SELECTED', (cardId: string) => {
      this.gameLoop.selectDraftCard(cardId);
    });

    EventBus.on('UI_SHOW_DRAFT', (data) => {
      const { isGameOver, currentDay, cards } = data;
      const uiCards = cards.map(c => ({
        id: c.id,
        title: c.title,
        description: c.description,
        icon: c.icon,
        rarity: c.rarity,
        cost: c.cost,
      }));
      this.uiManager.showDraftOverlay(isGameOver, currentDay, uiCards);
    });

    EventBus.on('UI_HIDE_DRAFT', () => {
      this.uiManager.hideDraftOverlay();
    });

    EventBus.on('UI_SHOW_TIMEOUT', (data) => {
      this.timeOutScreen.show(data.day, data.cash);
    });

    EventBus.on('UI_SHOW_UPGRADES', () => {
      this.upgradeTreeUI.show();
    });
  }

  private setupMouseListeners(): void {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;

    const onPointerMove = (e: FederatedPointerEvent) => {
      if (this.runManager.isDraftActive()) {
        this.cursorCircle.visible = false;
        this.cursorCircleFill.visible = false;
        this.gameLoop.setMouseGridPosition(0, 0, false);
        return;
      } 

      const globalX = e.global.x;
      const globalY = e.global.y;
      const gridX = Math.floor(globalX / GRID_CELL_SIZE);
      const gridY = Math.floor(globalY / GRID_CELL_SIZE);

      if (gridY >= 4 && gridY < GRID_ROWS && gridX >= 0 && gridX < GRID_COLS) {
        this.cursorCircle.x = globalX;
        this.cursorCircle.y = globalY;
        this.cursorCircle.visible = true;
        this.cursorCircleFill.x = globalX;
        this.cursorCircleFill.y = globalY;
        this.cursorCircleFill.visible = true;
        this.gameLoop.setMouseGridPosition(gridX, gridY, true);
      } else {
        this.cursorCircle.visible = false;
        this.cursorCircleFill.visible = false;
        this.gameLoop.setMouseGridPosition(0, 0, false);
      } 
    };

    this.app.stage.on('pointermove', onPointerMove);
    this.app.stage.on('pointerleave', () => {
      this.cursorCircle.visible = false;
      this.cursorCircleFill.visible = false;
      this.gameLoop.setMouseGridPosition(0, 0, false);
    });
  }
}
