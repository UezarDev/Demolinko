// src/ui/ScreenManager.ts - Orchestrates fullscreen UI transitions, ensuring only one screen is active and managing the global blur.
import { UIScreen } from './UIScreen';

export class ScreenManager {
  private screens: Map<string, UIScreen> = new Map();
  private activeScreenId: string | null = null;
  private blurEl: HTMLElement | null = null;
  private rootId: string;
  
  // Screens that should show the blur backdrop behind them
  private blurScreens: Set<string> = new Set([
    'upgrade-tree',
    'post-draft-choice',
    'timeout',
    'draft'
  ]);

  constructor(rootId: string = 'ui-root') {
    this.rootId = rootId;
  }

  /**
   * Registers a screen with the manager.
   */
  public registerScreen(screen: UIScreen): void {
    this.screens.set(screen.id, screen);
  }

  /**
   * Marks a screen ID as requiring the blur backdrop.
   */
  public registerBlurScreen(id: string): void {
    this.blurScreens.add(id);
  }

  /**
   * Transitions to a specific screen, automatically hiding the current one.
   */
  public transitionTo(id: string, data?: any): void {
    if (this.activeScreenId === id) return;

    // Special case: If transitioning to null or empty, treat as hideAll
    if (!id) {
      this.hideAll();
      return;
    }

    // 1. Hide the currently active screen
    if (this.activeScreenId) {
      const current = this.screens.get(this.activeScreenId);
      current?.hide();
    }

    // 2. Update active tracking
    this.activeScreenId = id;

    // 3. Show the new screen
    const next = this.screens.get(id);
    if (next) {
      next.show(data);
      
      // Only show blur for registered blur screens
      if (this.blurScreens.has(id)) {
        this.setBlur(true);
      } else {
        this.setBlur(false);
      }
    } else {
      console.error(`ScreenManager: Screen "${id}" is not registered.`);
      this.setBlur(false);
      this.activeScreenId = null;
    }
  }

  /**
   * Hides all screens and clears the backdrop.
   */
  public hideAll(): void {
    if (this.activeScreenId) {
      const current = this.screens.get(this.activeScreenId);
      current?.hide();
    }
    this.activeScreenId = null;
    this.setBlur(false);
  }

  private setBlur(show: boolean): void {
    if (show) {
      if (!this.blurEl) {
        this.blurEl = document.createElement('div');
        this.blurEl.className = 'ui-blur-backdrop';
        document.getElementById(this.rootId)?.appendChild(this.blurEl);
      }
      if (this.blurEl) this.blurEl.style.display = 'block';
    } else {
      if (this.blurEl) this.blurEl.style.display = 'none';
    }
  }
}