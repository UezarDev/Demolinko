import { Application, Graphics, Container, FederatedPointerEvent, TextureStyle } from 'pixi.js';
import { DemolitionGrid } from '../engine/DemolitionGrid';
import { PlinkoBoard } from '../engine/PlinkoBoard';
import { PitManager } from '../engine/PitManager';
import { RunManager } from '../engine/RunManager';
import { UIManager } from '../ui/UIManager';
import { ParticleRenderer } from '../rendering/ParticleRenderer';
import { GridRenderer } from '../rendering/GridRenderer';
import { GameLoop, GameContext } from '../engine/GameLoop';
import { EventBus } from '../core/EventBus';
import { MainMenu } from '../ui/MainMenu';
import { UpgradeTreeUI } from '../ui/UpgradeTree';
import { TimeOutScreen } from '../ui/TimeOutScreen';
import { DraftOverlay } from '../ui/DraftOverlay';
import { PostDraftOverlay } from '../ui/PostDraftOverlay';
import { SettingsModal } from '../ui/SettingsModal';
import { InGameMenu } from '../ui/InGameMenu';
import { AudioManager } from '../engine/AudioManager';
import { AbilityManager } from '../engine/AbilityManager';
import { AbilitiesPanel } from '../ui/AbilitiesPanel';
import { VIEW_WIDTH, VIEW_HEIGHT, GRID_CELL_SIZE, GRID_COLS, GRID_ROWS } from '../config/constants';

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
  private settingsModal!: SettingsModal;
  private inGameMenu!: InGameMenu;
  private lastScreenBeforeSettings: string | null = null;
  private abilityManager!: AbilityManager;
  private abilitiesPanel!: AbilitiesPanel;

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

    this.gridEngine = new DemolitionGrid(GRID_COLS, GRID_ROWS);
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
    this.cursorCircleFill.fill({ color: 0xffffff, alpha: 0.2 });
    this.cursorCircleFill.visible = false;
    this.app.stage.addChild(this.cursorCircleFill);

    this.cursorCircle = new Graphics();
    this.cursorCircle.circle(0, 0, dmgRadius * GRID_CELL_SIZE);
    this.cursorCircle.stroke({ width: 1.5, color: 0xffffff, alpha: 0.7 });
    this.cursorCircle.visible = false;
    this.app.stage.addChild(this.cursorCircle);

    this.uiManager = new UIManager('game-container');
    this.uiManager.setupHUDAndOverlays();

    // Register screens with UIManager's internal ScreenManager
    this.uiManager.registerScreens(
      new DraftOverlay('ui-root'),
      new PostDraftOverlay('ui-root')
    );
    this.settingsModal = new SettingsModal('ui-root');
    this.timeOutScreen = new TimeOutScreen('ui-root');

    // Initialize AudioManager
    AudioManager.getInstance().init({ debugLog: true });

    // Initialize AbilityManager and AbilitiesPanel
    this.abilityManager = new AbilityManager();
    this.abilitiesPanel = new AbilitiesPanel('game-container', this.abilityManager);
    this.abilitiesPanel.show();

    // Create GameLoop with context
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
    this.gameLoop = new GameLoop(context, this.abilityManager);

    this.upgradeTreeUI = new UpgradeTreeUI(
      'ui-root',
      this.runManager,
      this.plinkoBoard,
      () => EventBus.emit('GAME_NEXT_DAY'),
      () => EventBus.emit('GAME_RETRY_DAY'),
      () => this.plinkoBoard?.render(pegGraphics)
    );
    this.inGameMenu = new InGameMenu('ui-root');

    // Register all remaining screens to the manager
    this.uiManager.screenManager.registerScreen(this.settingsModal);
    this.uiManager.screenManager.registerScreen(this.timeOutScreen);
    this.uiManager.screenManager.registerScreen(this.upgradeTreeUI);
    this.uiManager.screenManager.registerScreen(new MainMenu('ui-root', () => {
      this.gameLoop.start();
    }));
    this.uiManager.screenManager.registerScreen(this.inGameMenu);

    this.setupEventBusMappings();
    this.setupKeyboardListeners();
    this.setupMouseListeners();

    try {
      await this.gridEngine.loadSpriteSheetAndAnalyze('/buildings.png');
    } catch (err) {
      console.warn('Could not load custom buildings.png, falling back to mock structures:', err);
    }

    const layout = this.runManager.generateContractLayout(30, GRID_COLS, GRID_ROWS, this.gridEngine);
    this.gridRenderer.updateTint(layout.hueTint);
    this.app.stage.visible = false;

    this.uiManager.showScreen('main-menu');
    this.uiManager.setHUDVisible(false);
  }

  private setupEventBusMappings(): void {
    EventBus.on('GAME_START', () => {
      this.uiManager.hideAllScreens();
      this.uiManager.setHUDVisible(true);
    });

    EventBus.on('UI_UPDATE_HUD', (data: any) => {
      this.uiManager.updateHUD(data.cash, data.day, data.remainingTime);
    });

    EventBus.on('UI_SHOW_SETTINGS', () => {
      // Store current active screen before opening settings
      this.lastScreenBeforeSettings = this.uiManager.screenManager.activeScreenId;
      this.settingsModal.show();
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

    EventBus.on('GAME_NEXT_DAY', () => {
      this.gameLoop.progressToNextDay();
      this.app.stage.visible = true;
      this.uiManager.hideAllScreens();
      this.uiManager.setHUDVisible(true);
    });

    EventBus.on('GAME_OPEN_UPGRADES', (data: any) => {
      this.upgradeTreeUI.setContext(data?.mode || 'SUCCESS');
      this.uiManager.showScreen('upgrade-tree');
    });

    EventBus.on('UI_SHOW_POST_DRAFT_CHOICE', (data: any) => {
      this.uiManager.showScreen('post-draft-choice', { mode: 'SUCCESS', day: data.day });
    });

    EventBus.on('UI_SHOW_DRAFT', (data: any) => {
      const { isGameOver, currentDay, cards } = data;
      const uiCards = cards.map((c: any) => ({
        id: c.id,
        title: c.title,
        description: c.description,
        icon: c.icon,
        rarity: c.rarity,
        cost: c.cost,
      }));
      this.uiManager.showScreen('draft', { isGameOver, currentDay, cards: uiCards });
    });

    EventBus.on('UI_HIDE_DRAFT', () => {
      this.uiManager.hideAllScreens();
    });

    EventBus.on('UI_SHOW_TIMEOUT', (data: any) => {
      this.uiManager.showScreen('timeout', { day: data.day, earnedCash: data.cash });
    });

    EventBus.on('GAME_PAUSE', () => {
      this.gameLoop?.togglePause();
    });

    EventBus.on('GAME_RESUME', () => {
      this.uiManager.hideAllScreens();
      this.gameLoop?.togglePause();
    });

    EventBus.on('UI_SETTINGS_CLOSED', () => {
      if (this.lastScreenBeforeSettings) {
        this.uiManager.showScreen(this.lastScreenBeforeSettings);
        this.lastScreenBeforeSettings = null;
      }
    });

    EventBus.on('UI_SHOW_UPGRADES', (data: any) => {
      this.upgradeTreeUI.setContext(data?.mode || 'SUCCESS');
      this.uiManager.showScreen('upgrade-tree');
    });

    // Ability activation request from UI
    EventBus.on('ABILITY_ACTIVATE_REQUEST', (data: { abilityId: string }) => {
      this.gameLoop.activateAbility(data.abilityId);
    });

    // Ability unlocked from upgrade purchase
    EventBus.on('ABILITY_UNLOCKED', (data: { abilityId: string; level: number }) => {
      this.abilityManager.unlockAbility(data.abilityId, data.level);
    });
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      // Ignore if typing in an input field
      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.contentEditable === 'true')) {
        return;
      }

      // ESC cancels targeting mode
      if (e.key === 'Escape') {
        this.gameLoop.setAbilityTargetingMode('wrecking_ball', false);
        return;
      }

      // Ability hotkeys 1-4
      const keyMap: Record<string, string> = {
        '1': 'wrecking_ball',
        '2': 'seismic_slam',
        '3': 'gravity_well',
        '4': 'time_dilation',
      };

      const abilityId = keyMap[e.key];
      if (abilityId && this.abilityManager.getAbility(abilityId)?.unlocked) {
        const ability = this.abilityManager.getAbility(abilityId);
        if (ability && ability.upgradeLevel >= 2 && abilityId === 'wrecking_ball') {
          // Toggle targeting mode
          this.gameLoop.setAbilityTargetingMode(abilityId, true);
        } else {
          this.gameLoop.activateAbility(abilityId);
        }
      }
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