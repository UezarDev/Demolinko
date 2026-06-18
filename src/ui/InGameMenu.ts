// src/ui/InGameMenu.ts - In-game pause/config menu overlay.
import { EventBus } from '../core/EventBus';
import { UIScreen } from './UIScreen';

export class InGameMenu implements UIScreen {
  public readonly id = 'in-game-menu';
  private containerId: string;
  private menuEl: HTMLElement | null = null;

  constructor(containerId: string = 'ui-root') {
    this.containerId = containerId;
  }

  public show(_data?: any): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    this.menuEl = document.getElementById('in-game-menu-overlay');
    if (!this.menuEl) {
      this.menuEl = document.createElement('div');
      this.menuEl.id = 'in-game-menu-overlay';
      this.menuEl.className = 'main-menu-overlay';
      parent.appendChild(this.menuEl);
    }

    this.menuEl.style.display = 'flex';
    this.render();
    EventBus.emit('GAME_PAUSE');
  }

  public hide(): void {
    if (this.menuEl) {
      this.menuEl.style.display = 'none';
    }
  }

  private render(): void {
    if (!this.menuEl) return;

    this.menuEl.innerHTML = `
      <div class="main-menu-panel">
        <div class="menu-brand">
          <div class="brand-subtitle">PAUSED</div>
          <h1 class="brand-title">SYSTEM MENU</h1>
        </div>

        <div class="menu-actions">
          <button class="menu-btn btn-play" id="ingame-resume-btn">
            <span class="btn-icon">🎮</span> Back to Game
          </button>
          <button class="menu-btn btn-secondary" id="ingame-settings-btn">
            <span class="btn-icon">⚙️</span> Settings
          </button>
          <button class="menu-btn btn-secondary" id="ingame-exit-btn">
            <span class="btn-icon">❌</span> Exit Game
          </button>
        </div>
      </div>
    `;

    const resumeBtn = document.getElementById('ingame-resume-btn');
    if (resumeBtn) {
      resumeBtn.onclick = () => {
        this.hide();
        EventBus.emit('GAME_RESUME');
      };
    }

    const settingsBtn = document.getElementById('ingame-settings-btn');
    if (settingsBtn) {
      settingsBtn.onclick = () => {
        this.hide();
        EventBus.emit('UI_SHOW_SETTINGS');
      };
    }

    const exitBtn = document.getElementById('ingame-exit-btn');
    if (exitBtn) {
      exitBtn.onclick = () => {
        try {
          window.close();
        } catch (e) {
          console.log('window.close is blocked by browser security.');
          alert('Please close the browser tab to exit.');
        }
      };
    }
  }
}
