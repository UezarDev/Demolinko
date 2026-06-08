// src/ui/TimeOutScreen.ts - Dynamic intermediate "Time Out" Decision Hub screen.

export class TimeOutScreen {
  private containerId: string;
  private onRetry: () => void;
  private onUpgrade: () => void;
  private onLeave: () => void;
  private overlayEl: HTMLElement | null = null;

  constructor(
    containerId: string,
    onRetry: () => void,
    onUpgrade: () => void,
    onLeave: () => void
  ) {
    this.containerId = containerId;
    this.onRetry = onRetry;
    this.onUpgrade = onUpgrade;
    this.onLeave = onLeave;
  }

  public show(day: number, earnedCash: number): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    this.overlayEl = document.getElementById('timeout-overlay');
    if (!this.overlayEl) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.id = 'timeout-overlay';
      this.overlayEl.className = 'timeout-overlay';
      parent.appendChild(this.overlayEl);
    }

    this.overlayEl.style.display = 'flex';
    this.render(day, earnedCash);
  }

  public hide(): void {
    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
    }
  }

  private render(day: number, earnedCash: number): void {
    if (!this.overlayEl) return;

    this.overlayEl.innerHTML = `
      <div class="timeout-panel">
        <div class="timeout-header">
          <span class="timeout-alert">⏰ TIME OUT</span>
          <h2 class="timeout-title">Contract Expired</h2>
          <p class="timeout-subtitle">Your demolition crew ran out of time on Day ${day}!</p>
        </div>

        <div class="timeout-stats">
          <div class="stat-row">
            <span class="stat-label">Wallet Revenue</span>
            <span class="stat-val gold">$${earnedCash}</span>
          </div>
        </div>

        <div class="timeout-actions">
          <button class="timeout-btn btn-retry" id="timeout-retry-btn">
            <span class="btn-icon">🔄</span> Retry Day
          </button>
          <button class="timeout-btn btn-upgrade" id="timeout-upgrade-btn">
            <span class="btn-icon">⚡</span> Codebase Upgrades
          </button>
          <button class="timeout-btn btn-leave" id="timeout-leave-btn">
            <span class="btn-icon">🚪</span> Return to Menu
          </button>
        </div>
      </div>
    `;

    const retryBtn = document.getElementById('timeout-retry-btn');
    if (retryBtn) {
      retryBtn.onclick = () => {
        this.hide();
        this.onRetry();
      };
    }

    const upgradeBtn = document.getElementById('timeout-upgrade-btn');
    if (upgradeBtn) {
      upgradeBtn.onclick = () => {
        this.hide();
        this.onUpgrade();
      };
    }

    const leaveBtn = document.getElementById('timeout-leave-btn');
    if (leaveBtn) {
      leaveBtn.onclick = () => {
        this.hide();
        this.onLeave();
      };
    }
  }
}
