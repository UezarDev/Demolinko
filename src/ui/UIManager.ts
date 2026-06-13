// src/ui/UIManager.ts - Manager for DOM HUD overlays and event propagation.
import { EventBus } from '../core/EventBus';
import { DraftOverlay } from './DraftOverlay';
import { PostDraftOverlay } from './PostDraftOverlay';
import { ScreenManager } from './ScreenManager';

export class UIManager {
  private containerId: string;
  private hudCash: HTMLElement | null = null;
  private hudDay: HTMLElement | null = null;
  private hudTimer: HTMLElement | null = null;
  private configBtn: HTMLElement | null = null;
  private screenManager: ScreenManager;

  constructor(containerId: string = 'game-container') {
    this.containerId = containerId;
    this.screenManager = new ScreenManager(containerId);
  }

  /**
   * Registers screens to the ScreenManager.
   * Call this after UIManager initialization in Game.ts.
   */
  public registerScreens(draftOverlay: DraftOverlay, postDraftOverlay: PostDraftOverlay): void {
    this.screenManager.registerScreen(draftOverlay);
    this.screenManager.registerScreen(postDraftOverlay);
  }

  /**
   * Transitions to a screen by its registered ID.
   */
  public showScreen(id: string, data?: any): void {
    this.screenManager.transitionTo(id, data);
  }

  /**
   * Hides all managed overlay screens.
   */
  public hideAllScreens(): void {
    this.screenManager.hideAll();
  }

  /**
   * Inject HTML structure for HUD overlay into the DOM, and cache references.
   */
  public setupHUDAndOverlays(): void {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.warn(`UIManager: Container with ID "${this.containerId}" not found.`);
      return;
    }

    const hudHTML = `
      <div class="hud-overlay" id="game-hud">
        <div class="hud-panel">
          <span class="hud-label">Cash Revenue</span>
          <span class="hud-value gold" id="hud-cash">$0</span>
        </div>
        <div class="hud-panel" style="align-items: center;">
          <span class="hud-label">Current Cycle</span>
          <span class="hud-value" id="hud-day">Day 1</span>
        </div>
        <div class="hud-panel" style="align-items: flex-end;">
          <span class="hud-label">Contract Timer</span>
          <span class="hud-value timer-val" id="hud-timer">60.0s</span>
        </div>
      </div>
    `;

    const template = document.createElement('div');
    template.innerHTML = hudHTML;
    while (template.firstChild) {
      container.appendChild(template.firstChild);
    }

    // Create Standalone Config Button
    const configBtn = document.createElement('button');
    configBtn.id = 'btn-game-config';
    configBtn.className = 'btn-config';
    configBtn.innerText = '⚙️';
    configBtn.onclick = () => {
      EventBus.emit('UI_SHOW_SETTINGS');
    };
    container.appendChild(configBtn);

    // Cache elements
    this.hudCash = document.getElementById('hud-cash');
    this.hudDay = document.getElementById('hud-day');
    this.hudTimer = document.getElementById('hud-timer');
    this.configBtn = configBtn;
  }

  /**
   * Toggles the visibility of the HUD and the global config button.
   */
  public setHUDVisible(visible: boolean): void {
    const hud = document.getElementById('game-hud');
    if (hud) hud.style.display = visible ? 'flex' : 'none';
    if (this.configBtn) this.configBtn.style.display = visible ? 'block' : 'none';
  }

  /**
   * Updates HUD stats text with formatted values.

   */
  public updateHUD(cash: number, day: number, remainingTime?: number): void {
    if (this.hudCash) this.hudCash.innerText = `$${cash}`;
    if (this.hudDay) this.hudDay.innerText = `Day ${day}`;
    if (this.hudTimer && remainingTime !== undefined) {
      this.hudTimer.innerText = `${remainingTime.toFixed(1)}s`;
      
      this.hudTimer.className = 'hud-value timer-val';
      if (remainingTime <= 10) {
        this.hudTimer.classList.add('critical');
      } else if (remainingTime <= 25) {
        this.hudTimer.classList.add('warning');
      }
    }
  }
}
