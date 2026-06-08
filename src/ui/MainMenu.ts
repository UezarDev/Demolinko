// src/ui/MainMenu.ts - Lightweight Main Menu UI overlay component.
import { SaveManager } from '../engine/SaveManager';

export class MainMenu {
  private containerId: string;
  private onPlay: () => void;
  private menuEl: HTMLElement | null = null;

  constructor(containerId: string, onPlay: () => void) {
    this.containerId = containerId;
    this.onPlay = onPlay;
  }

  public show(): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    this.menuEl = document.getElementById('main-menu-overlay');
    if (!this.menuEl) {
      this.menuEl = document.createElement('div');
      this.menuEl.id = 'main-menu-overlay';
      this.menuEl.className = 'main-menu-overlay';
      parent.appendChild(this.menuEl);
    }

    this.menuEl.style.display = 'flex';
    this.render();
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
          <div class="brand-subtitle">ROGUELITE DEMOLITION SIMULATOR</div>
          <h1 class="brand-title">DEMOLINKO</h1>
        </div>

        <div class="menu-actions">
          <button class="menu-btn btn-play" id="menu-play-btn">
            <span class="btn-icon">🎮</span> Play Game
          </button>
          <button class="menu-btn btn-secondary" id="menu-config-btn">
            <span class="btn-icon">⚙️</span> Settings
          </button>
          <button class="menu-btn btn-secondary" id="menu-exit-btn">
            <span class="btn-icon">❌</span> Exit
          </button>
        </div>
      </div>

      <!-- Config Panel & Hard Reset Screen Overlay -->
      <div class="coming-soon-overlay" id="menu-coming-soon" style="display: none;">
        <div class="modal-box">
          <h2>SETTINGS</h2>
          <p class="settings-help">Manage game preferences and meta progression data below.</p>
          
          <div class="settings-section">
            <button class="menu-btn btn-danger" id="settings-reset-btn">
              ⚠️ Restart World (Hard Reset)
            </button>
            <p class="warning-text">Wipes all codebase upgrades and persistent cash wallet permanently.</p>
          </div>
          
          <button class="btn-primary" id="coming-soon-close" style="margin-top: 15px;">Back</button>
        </div>
      </div>

      <!-- Thank You Message overlay -->
      <div class="coming-soon-overlay" id="menu-thank-you" style="display: none;">
        <div class="modal-box">
          <h2>THANK YOU!</h2>
          <p>Thank you for playing Demolinko!</p>
          <button class="btn-primary" id="thank-you-close">Close</button>
        </div>
      </div>
    `;

    // Play Button
    const playBtn = document.getElementById('menu-play-btn');
    if (playBtn) {
      playBtn.onclick = () => {
        this.hide();
        this.onPlay();
      };
    }

    // Settings overlay toggle
    const configBtn = document.getElementById('menu-config-btn');
    const soonOverlay = document.getElementById('menu-coming-soon');
    if (configBtn && soonOverlay) {
      configBtn.onclick = () => {
        soonOverlay.style.display = 'flex';
      };
    }

    const soonClose = document.getElementById('coming-soon-close');
    if (soonClose && soonOverlay) {
      soonClose.onclick = () => {
        soonOverlay.style.display = 'none';
      };
    }

    // Hard reset handler
    const resetBtn = document.getElementById('settings-reset-btn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        const confirm1 = confirm('Are you sure you want to hard reset the world? This wipes all upgrades and gold!');
        if (confirm1) {
          const confirm2 = confirm('THIS ACTION CANNOT BE UNDONE. Proceed and clear persistent files?');
          if (confirm2) {
            SaveManager.clear();
            location.reload();
          }
        }
      };
    }

    // Exit handler
    const exitBtn = document.getElementById('menu-exit-btn');
    const thankOverlay = document.getElementById('menu-thank-you');
    if (exitBtn && thankOverlay) {
      exitBtn.onclick = () => {
        thankOverlay.style.display = 'flex';
        try {
          window.close();
        } catch (e) {
          console.log('window.close is blocked by browser security scripting.');
        }
      };
    }

    const thankClose = document.getElementById('thank-you-close');
    if (thankClose && thankOverlay) {
      thankClose.onclick = () => {
        thankOverlay.style.display = 'none';
      };
    }
  }
}
