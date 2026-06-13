// src/ui/SettingsModal.ts - Shared settings and hard reset utility.
import { SaveManager } from '../engine/SaveManager';
import { EventBus } from '../core/EventBus';
import { UIScreen } from './UIScreen';

export class SettingsModal implements UIScreen {
  public readonly id = 'settings-modal';
  private containerId: string;
  private modalEl: HTMLElement | null = null;

  constructor(containerId: string = 'ui-root') {
    this.containerId = containerId;
  }

  public show(data?: any): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    this.modalEl = document.getElementById('settings-modal-overlay');
    if (!this.modalEl) {
      this.modalEl = document.createElement('div');
      this.modalEl.id = 'settings-modal-overlay';
      this.modalEl.className = 'coming-soon-overlay';
      parent.appendChild(this.modalEl);
    }

    this.modalEl.style.display = 'flex';
    this.render();
  }

  public hide(): void {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  private render(): void {
    if (!this.modalEl) return;

    this.modalEl.innerHTML = `
      <div class="modal-box">
        <h2>SETTINGS</h2>
        <p class="settings-help">Manage game preferences and meta progression data below.</p>
        
        <div class="settings-section">
          <button class="menu-btn btn-danger" id="settings-reset-btn">
            ⚠️ Restart World (Hard Reset)
          </button>
          <p class="warning-text">Wipes all codebase upgrades and persistent cash wallet permanently.</p>
        </div>
        
        <button class="btn-primary" id="settings-close-btn" style="margin-top: 15px;">Back</button>
      </div>
    `;

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

    const closeBtn = document.getElementById('settings-close-btn');
    if (closeBtn) {
      closeBtn.onclick = () => {
        this.hide();
        EventBus.emit('UI_SETTINGS_CLOSED');
      };
    }
  }
}
