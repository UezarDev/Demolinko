import { EventBus } from "../core/EventBus";
// src/ui/UpgradeTree.ts - Draggable Upgrade Tree UI component featuring glassmorphic cards, canvas link lines, and progression constraints.
import { UPGRADE_TREE } from '../config/upgrades';
import { RunManager } from '../engine/RunManager';
import { PlinkoBoard } from '../engine/PlinkoBoard';
import { emitAudioEvent } from '../engine/AudioManager';

export class UpgradeTreeUI {
  private containerId: string;
  private runManager: RunManager;
  private plinkoBoard: PlinkoBoard;
  private onRestartDay: () => void;
  private onUpgradePurchased?: () => void;

  private overlayEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;

  // Panning State
  private isDragging: boolean = false;
  private startX: number = 0;
  private startY: number = 0;
  private panX: number = 0;
  private panY: number = 100; // Centered offset initial state

  constructor(
    containerId: string,
    runManager: RunManager,
    plinkoBoard: PlinkoBoard,
    onRestartDay: () => void,
    onUpgradePurchased?: () => void
  ) {
    this.containerId = containerId;
    this.runManager = runManager;
    this.plinkoBoard = plinkoBoard;
    this.onRestartDay = onRestartDay;
    this.onUpgradePurchased = onUpgradePurchased;
  }

  /**
   * Initializes and presents the fullscreen Upgrade Tree overlay in the DOM.
   */
  public show(): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    // Check if the overlay already exists, else create it
    this.overlayEl = document.getElementById('upgrade-tree-overlay');
    if (!this.overlayEl) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.id = 'upgrade-tree-overlay';
      this.overlayEl.className = 'upgrade-tree-overlay';
      parent.appendChild(this.overlayEl);
    }

    this.overlayEl.style.display = 'flex';
    this.renderLayout();
    this.setupPanning();
    this.render();
  }

  /**
   * Closes/hides the Upgrade Tree overlay.
   */
  public hide(): void {
    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
    }
  }

  /**
   * Creates the base HTML structure (panning viewport, large canvas, header HUD, cards wrapper).
   */
  private renderLayout(): void {
    if (!this.overlayEl) return;

    this.overlayEl.innerHTML = `
      <!-- Fixed HUD panel at the top of the tree overlay -->
      <div class="upgrade-tree-hud">
        <div class="hud-cash-container">
          <span class="hud-label">Your Wallet</span>
          <span class="hud-cash-value" id="tree-wallet-cash">$${this.runManager.getCash()}</span>
        </div>
        <div class="hud-title-container">
          <h1>META PROGRESSION</h1>
          <p>Invest gold in the non-linear Demolition Build Tree before starting the next day</p>
        </div>
        <button class="btn-restart-day" id="tree-restart-btn">Start Next Day</button>
      </div>

      <!-- Viewport area that captures click-and-drag gestures -->
      <div class="upgrade-tree-viewport" id="tree-viewport">
        <!-- Draggable container representing the canvas coordinate system -->
        <div class="upgrade-tree-content" id="tree-content" style="transform: translate(${this.panX}px, ${this.panY}px);">
          <canvas class="upgrade-tree-canvas" id="tree-canvas" width="1000" height="700"></canvas>
          <div class="upgrade-cards-container" id="tree-cards-container"></div>
        </div>
      </div>
      <!-- Glassmorphic floating tooltip -->
      <div class="tree-tooltip" id="tree-tooltip" style="display: none; position: absolute; pointer-events: none;"></div>
    `;

    this.contentEl = document.getElementById('tree-content');
    this.canvasEl = document.getElementById('tree-canvas') as HTMLCanvasElement;

    const restartBtn = document.getElementById('tree-restart-btn');
    if (restartBtn) {
            restartBtn.onclick = () => {
        this.hide();
        this.onRestartDay();
      };
    }
  }

  /**
   * Evaluates if there are any revealed but unpurchased upgrades (regardless of affordability).
   * Used for informational display only - does NOT block progression.
   */
  private hasRevealedUnpurchasedUpgrades(): boolean {
    for (const node of UPGRADE_TREE) {
      const isPurchased = this.runManager.activeUpgrades.includes(node.id);
      const isRevealed = node.requires.length === 0 || node.requires.some(reqId => this.runManager.activeUpgrades.includes(reqId));
      if (isRevealed && !isPurchased) {
        return true;
      }
    }
    return false;
  }

  /**
   * Binds mouse and drag gestures to pan the camera viewport dynamically.
   */
  private setupPanning(): void {
    const viewport = document.getElementById('tree-viewport');
    if (!viewport) return;

    const onMouseDown = (e: MouseEvent) => {
      // Ignore drags originating from buttons or upgrade cards
      if ((e.target as HTMLElement).closest('.upgrade-node-card') || (e.target as HTMLElement).closest('.btn-restart-day')) {
        return;
      }
      this.isDragging = true;
      viewport.classList.add('grabbing');
      this.startX = e.clientX - this.panX;
      this.startY = e.clientY - this.panY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!this.isDragging || !this.contentEl) return;
      this.panX = e.clientX - this.startX;
      this.panY = e.clientY - this.startY;

      // Limit bounds to keep nodes within viewport
      this.panX = Math.max(-400, Math.min(600, this.panX));
      this.panY = Math.max(-200, Math.min(450, this.panY));

      this.contentEl.style.transform = `translate(${this.panX}px, ${this.panY}px)`;
    };

    const onMouseUpOrLeave = () => {
      this.isDragging = false;
      viewport.classList.remove('grabbing');
    };

    viewport.onmousedown = onMouseDown;
    window.onmousemove = onMouseMove;
    window.onmouseup = onMouseUpOrLeave;
    viewport.onmouseleave = onMouseUpOrLeave;
  }

  /**
   * Core redraw cycle: paints link lines, positions node cards, and refreshes the restart button status.
   */
  public render(): void {
    this.renderConnectionLines();
    this.renderNodes();
    this.updateRestartButtonState();

    // Sync current cash readout
    const cashEl = document.getElementById('tree-wallet-cash');
    if (cashEl) {
      cashEl.innerText = `$${this.runManager.getCash()}`;
    }
  }

  /**
   * Draws vector lines on the background canvas connecting requirements to child cards.
   */
  private renderConnectionLines(): void {
    if (!this.canvasEl) return;
    const ctx = this.canvasEl.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, this.canvasEl.width, this.canvasEl.height);

    const cardWidth = 60;
    const cardHeight = 60;

    for (const node of UPGRADE_TREE) {
      const childX = node.pos.x + cardWidth / 2;
      const childY = node.pos.y + cardHeight / 2;

      for (const parentId of node.requires) {
        const parent = UPGRADE_TREE.find(n => n.id === parentId);
        if (!parent) continue;

        const parentX = parent.pos.x + cardWidth / 2;
        const parentY = parent.pos.y + cardHeight / 2;

        const parentPurchased = this.runManager.activeUpgrades.includes(parent.id);
        const childPurchased = this.runManager.activeUpgrades.includes(node.id);
        const childRevealed = node.requires.length === 0 || node.requires.some(reqId => this.runManager.activeUpgrades.includes(reqId));

        ctx.beginPath();
        ctx.moveTo(parentX, parentY);
        ctx.lineTo(childX, childY);

        // Styling based on state transition links
        if (parentPurchased && childPurchased) {
          // Fully bought link: bright glowing cyan
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 4;
          ctx.setLineDash([]);
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 10;
        } else if (parentPurchased && childRevealed) {
          // Available to buy link: golden pulse
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 3;
          ctx.setLineDash([]);
          ctx.shadowColor = '#f59e0b';
          ctx.shadowBlur = 6;
        } else {
          // Hidden link: dark dashed line
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.shadowBlur = 0;
        }

        ctx.stroke();
        // Reset shadows to avoid canvas bleed over text or node boxes
        ctx.shadowBlur = 0;
      }
    }
  }

  /**
   * Spawns absolutely positioned, beautiful card elements inside the panning container.
   */
  private renderNodes(): void {
    const cardContainer = document.getElementById('tree-cards-container');
    if (!cardContainer) return;

    cardContainer.innerHTML = '';

    for (const node of UPGRADE_TREE) {
      const isPurchased = this.runManager.activeUpgrades.includes(node.id);
      const isRevealed = node.requires.length === 0 || node.requires.some(reqId => this.runManager.activeUpgrades.includes(reqId));

      const cardEl = document.createElement('div');
      cardEl.className = 'upgrade-node-card';
      cardEl.style.left = `${node.pos.x}px`;
      cardEl.style.top = `${node.pos.y}px`;

      if (isPurchased) {
        cardEl.classList.add('node-purchased');
        cardEl.innerHTML = `<span class="node-icon">${node.icon}</span>`;
      } else if (isRevealed) {
        cardEl.classList.add('node-revealed');
        const canAfford = this.runManager.getCash() >= node.cost;
        if (!canAfford) {
          cardEl.classList.add('node-unaffordable');
        }

        cardEl.innerHTML = `<span class="node-icon">${node.icon}</span>`;

        cardEl.onclick = () => {
          if (this.runManager.purchaseUpgrade(node.id, this.plinkoBoard)) {
            // Audio: Upgrade purchased
            emitAudioEvent('UPGRADE_PURCHASED', {
              upgradeId: node.id,
              cost: node.cost,
              title: node.title
            });
            
            EventBus.emit('UI_UPDATE_HUD', { cash: this.runManager.getCash(), day: this.runManager.getDay(), remainingTime: this.runManager.contractRemainingTime });
            this.render();
            if (this.onUpgradePurchased) {
              this.onUpgradePurchased();
            }
            // Hide tooltip immediately when bought to prevent stale state hover bugs
            this.hideTooltip();
            this.render(); // Redraw tree elements
          }
        };
      } else {
        cardEl.classList.add('node-hidden');
        cardEl.innerHTML = `<span class="node-icon">🔒</span>`;
      }

      // Bind mouse interactions for glassmorphic tooltip mapping
      cardEl.onmouseenter = (e: MouseEvent) => this.showTooltip(e, node, isPurchased, isRevealed);
      cardEl.onmousemove = (e: MouseEvent) => this.positionTooltip(e);
      cardEl.onmouseleave = () => this.hideTooltip();

      cardContainer.appendChild(cardEl);
    }
  }

  /**
   * Helper tooltips: dynamically renders details when hovering nodes
   */
  private showTooltip(e: MouseEvent, node: any, isPurchased: boolean, isRevealed: boolean): void {
    const tooltip = document.getElementById('tree-tooltip');
    if (!tooltip) return;

    if (isPurchased) {
      tooltip.innerHTML = `
        <div class="tooltip-badge purchased">Unlocked</div>
        <div class="tooltip-title">${node.title}</div>
        <div class="tooltip-desc">${node.description}</div>
        <div class="tooltip-footer">Purchased & Active</div>
      `;
    } else if (isRevealed) {
      const canAfford = this.runManager.getCash() >= node.cost;
      tooltip.innerHTML = `
        <div class="tooltip-badge revealed">Available</div>
        <div class="tooltip-title">${node.title}</div>
        <div class="tooltip-desc">${node.description}</div>
        <div class="tooltip-footer ${canAfford ? 'gold' : 'unaffordable'}">
          Cost: $${node.cost}
        </div>
      `;
    } else {
      tooltip.innerHTML = `
        <div class="tooltip-badge locked">🔒 Hidden</div>
        <div class="tooltip-title">Undiscovered Upgrade</div>
        <div class="tooltip-desc">Unlock connecting nodes to reveal this upgrade.</div>
      `;
    }

    tooltip.style.display = 'block';
    this.positionTooltip(e);
  }

  private positionTooltip(e: MouseEvent): void {
    const tooltip = document.getElementById('tree-tooltip');
    if (!tooltip || !this.overlayEl) return;

    const rect = this.overlayEl.getBoundingClientRect();
    // Offset slightly relative to cursor coordinates
    tooltip.style.left = `${e.clientX - rect.left + 15}px`;
    tooltip.style.top = `${e.clientY - rect.top + 15}px`;
  }

  private hideTooltip(): void {
    const tooltip = document.getElementById('tree-tooltip');
    if (tooltip) {
      tooltip.style.display = 'none';
    }
  }

  /**
   * Updates the Restart button state - always enabled for player agency.
   * Shows a subtle hint if there are revealed but unpurchased upgrades.
   */
  private updateRestartButtonState(): void {
    const restartBtn = document.getElementById('tree-restart-btn') as HTMLButtonElement;
    if (!restartBtn) return;

    const hasUnpurchasedRevealed = this.hasRevealedUnpurchasedUpgrades();
    
    restartBtn.disabled = false;
    if (hasUnpurchasedRevealed) {
      restartBtn.className = 'btn-restart-day ready';
      restartBtn.innerText = 'Start Next Day (Upgrades Available)';
    } else {
      restartBtn.className = 'btn-restart-day ready';
      restartBtn.innerText = 'Start Next Day';
    }
  }
}
