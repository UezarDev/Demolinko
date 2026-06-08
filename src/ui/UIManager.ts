// src/ui/UIManager.ts - Manager for DOM HUD overlays, glassmorphic card drafting overlays, and event propagation.
/*
Exports:
- class UIManager: Manages the HTML HUD overlays, rendering cards, and transmitting event-driven clicks via callbacks.
  * constructor(containerId: string)
  * setupHUDAndOverlays(onCardSelected: (card: UIDraftCard) => void, onRestart: () => void): void
  * updateHUD(cash: number, day: number, remainingTime?: number): void
  * showDraftOverlay(isGameOver: boolean, currentDay: number, cards: UIDraftCard[]): void
  * hideDraftOverlay(): void
*/

import { EventBus } from '../core/EventBus';

export interface UIDraftCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  cost: number;
}

export class UIManager {
  private containerId: string;
  private hudCash: HTMLElement | null = null;
  private hudDay: HTMLElement | null = null;
  private hudTimer: HTMLElement | null = null;
  private draftOverlay: HTMLElement | null = null;
  private draftTitle: HTMLElement | null = null;
  private cardContainer: HTMLElement | null = null;

  constructor(containerId: string = 'game-container') {
    this.containerId = containerId;
  }

  /**
   * Inject HTML structure for HUD overlay and drafting overlay into the DOM, and cache references.
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

      <!-- Draft Phase Popup Screen -->
      <div class="overlay-screen" id="draft-overlay" style="display: none;">
        <h1 class="draft-title" id="draft-main-title">CONTRACT COMPLETED!</h1>
        <p class="draft-subtitle">Select 1 Blueprint card modifier to upgrade your codebase properties:</p>
        <div class="card-container" id="card-container"></div>
      </div>
    `;

    const template = document.createElement('div');
    template.innerHTML = hudHTML;
    while (template.firstChild) {
      container.appendChild(template.firstChild);
    }

    // Cache elements
    this.hudCash = document.getElementById('hud-cash');
    this.hudDay = document.getElementById('hud-day');
    this.hudTimer = document.getElementById('hud-timer');
    this.draftOverlay = document.getElementById('draft-overlay');
    this.draftTitle = document.getElementById('draft-main-title');
    this.cardContainer = document.getElementById('card-container');
  }

  /**
   * Updates HUD stats text with formatted values, including the dynamic contract timer.
   */
  public updateHUD(cash: number, day: number, remainingTime?: number): void {
    if (this.hudCash) this.hudCash.innerText = `$${cash}`;
    if (this.hudDay) this.hudDay.innerText = `Day ${day}`;
    if (this.hudTimer && remainingTime !== undefined) {
      this.hudTimer.innerText = `${remainingTime.toFixed(1)}s`;
      
      // Dynamic colors based on time remaining for premium aesthetic
      this.hudTimer.className = 'hud-value timer-val';
      if (remainingTime <= 10) {
        this.hudTimer.classList.add('critical');
      } else if (remainingTime <= 25) {
        this.hudTimer.classList.add('warning');
      }
    }
  }

  /**
   * Pauses loops and presents either card blueprints or the Retry game-over screen.
   */
  public showDraftOverlay(
    isGameOver: boolean,
    currentDay: number,
    cards: UIDraftCard[]
  ): void {
    if (!this.draftOverlay || !this.cardContainer) return;

    this.draftOverlay.style.display = 'flex';
    this.cardContainer.innerHTML = '';

    if (isGameOver) {
      if (this.draftTitle) {
        this.draftTitle.innerText = 'CONTRACT FAILURE';
        this.draftTitle.style.color = '#ef4444';
      }

      const subtitle = this.draftOverlay.querySelector('.draft-subtitle') as HTMLElement;
      if (subtitle) {
        subtitle.innerText = `Contract timer expired on Day ${currentDay}. Sledgehammer operations suspended. Game Over.`;
      }

      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn-primary';
      retryBtn.innerText = 'Restart Run';
      retryBtn.style.marginTop = '20px';
      retryBtn.onclick = () => {
        EventBus.emit('GAME_RESTART_RUN');
      };
      this.cardContainer.appendChild(retryBtn);
      return;
    }

    // Normal drafting stage
    if (this.draftTitle) {
      this.draftTitle.innerText = 'CONTRACT SECURED!';
      this.draftTitle.style.color = ''; // Reset styles
    }

    const subtitle = this.draftOverlay.querySelector('.draft-subtitle') as HTMLElement;
    if (subtitle) {
      subtitle.innerText = 'Select 1 Blueprint card modifier to upgrade your codebase properties:';
    }

    cards.forEach((card) => {
      const cardEl = document.createElement('div');
      cardEl.className = `draft-card ${card.rarity === 'RARE' ? 'tier-2' : (card.rarity === 'LEGENDARY' ? 'tier-3' : '')}`;
      cardEl.innerHTML = `
        <div class="card-icon">${card.icon}</div>
        <div class="card-name">${card.title}</div>
        <div class="card-desc">${card.description}</div>
        <div class="card-rarity">${card.rarity}</div>
      `;

      cardEl.onclick = () => {
        EventBus.emit('GAME_DRAFT_SELECTED', { cardId: card.id });
      };

      this.cardContainer!.appendChild(cardEl);
    });
  }

  /**
   * Closes the glassmorphic overlay screen.
   */
  public hideDraftOverlay(): void {
    if (this.draftOverlay) {
      this.draftOverlay.style.display = 'none';
    }
  }
}
