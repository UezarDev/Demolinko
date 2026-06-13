// src/ui/PostDraftOverlay.ts - Transition screen after card selection (Success or Failure).
import { EventBus } from '../core/EventBus';
import { UIScreen } from './UIScreen';

export type PostDraftMode = 'SUCCESS' | 'FAILURE';

export class PostDraftOverlay implements UIScreen {
  public readonly id = 'post-draft-choice';
  private containerId: string;
  private overlayEl: HTMLElement | null = null;

  constructor(containerId: string = 'ui-root') {
    this.containerId = containerId;
  }

  public show(data?: { mode?: PostDraftMode; day: number }): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    const mode = data?.mode || 'SUCCESS';
    const day = data?.day || 1;

    this.overlayEl = document.getElementById('post-draft-overlay');
    if (!this.overlayEl) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.id = 'post-draft-overlay';
      this.overlayEl.className = 'overlay-screen';
      parent.appendChild(this.overlayEl);
    }

    this.overlayEl.style.display = 'flex';
    this.render(mode, day);
  }

  public hide(): void {
    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
    }
  }

  private render(mode: PostDraftMode, day: number): void {
    if (!this.overlayEl) return;

    const isSuccess = mode === 'SUCCESS';
    const title = isSuccess ? 'CONTRACT SECURED!' : 'CONTRACT FAILURE';
    const titleColor = isSuccess ? '' : '#ef4444';
    const subtitle = isSuccess
      ? `Day ${day} complete. Your codebase has been reinforced.`
      : `Contract timer expired on Day ${day}. Sledgehammer operations suspended.`;

    // Same two-button layout for both states
    const primaryBtnText = isSuccess ? 'Start Next Day' : 'Restart Run';
    const primaryBtnIcon = isSuccess ? '🚀' : '🔄';
    const primaryBtnId = isSuccess ? 'post-draft-next-day' : 'post-draft-retry';
    const primaryAction = isSuccess ? 'GAME_NEXT_DAY' : 'GAME_RESTART_RUN';

    this.overlayEl.innerHTML = `
      <h1 class="draft-title" style="color: ${titleColor}">${title}</h1>
      <p class="draft-subtitle">${subtitle}</p>
      <div class="card-container">
        <button class="btn-primary" id="${primaryBtnId}">
          <span>${primaryBtnIcon}</span> ${primaryBtnText}
        </button>
        <button class="btn-primary" id="post-draft-upgrades" style="background: linear-gradient(135deg, #a7f3d0 0%, #06b6d4 100%); color: #0f172a;">
          <span>🛠️</span> Upgrade Tree
        </button>
      </div>
    `;

    // Primary action button
    const primaryBtn = document.getElementById(primaryBtnId);
    if (primaryBtn) {
      primaryBtn.onclick = () => {
        this.hide();
        EventBus.emit(primaryAction);
      };
    }

    // Upgrade Tree button (same for both, but pass mode so upgrade tree knows context)
    const upgradeBtn = document.getElementById('post-draft-upgrades');
    if (upgradeBtn) {
      upgradeBtn.onclick = () => {
        this.hide();
        EventBus.emit('GAME_OPEN_UPGRADES', { mode });
      };
    }
  }
}
