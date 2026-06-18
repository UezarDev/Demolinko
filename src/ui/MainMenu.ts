// src/ui/MainMenu.ts - Lightweight Main Menu UI overlay component.
import { UIScreen } from './UIScreen';
import { EventBus } from '../core/EventBus';

export class MainMenu implements UIScreen {
  public readonly id = 'main-menu';
  private containerId: string;
  private onPlay: () => void;
  private menuEl: HTMLElement | null = null;
  
  // Element References
  private playBtn: HTMLButtonElement | null = null;
  private configBtn: HTMLButtonElement | null = null;
  private exitBtn: HTMLButtonElement | null = null;
  private thankYouOverlay: HTMLElement | null = null;

  constructor(containerId: string = 'ui-root', onPlay: () => void) {
    this.containerId = containerId;
    this.onPlay = onPlay;
  }

  public show(_data?: any): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    this.menuEl = document.getElementById('main-menu-overlay');
    if (!this.menuEl) {
      this.createMenuStructure(parent);
    }

    this.menuEl!.style.display = 'flex';
  }

  public hide(): void {
    if (this.menuEl) {
      this.menuEl.style.display = 'none';
    }
  }

  private createMenuStructure(parent: HTMLElement): void {
    this.menuEl = document.createElement('div');
    this.menuEl.id = 'main-menu-overlay';
    this.menuEl.className = 'main-menu-overlay';

    const panel = document.createElement('div');
    panel.className = 'main-menu-panel';

    const brand = document.createElement('div');
    brand.className = 'menu-brand';
    brand.innerHTML = `
      <div class="brand-subtitle">ROGUELITE DEMOLITION SIMULATOR</div>
      <h1 class="brand-title">DEMOLINKO</h1>
    `;
    panel.appendChild(brand);

    const actions = document.createElement('div');
    actions.className = 'menu-actions';

    this.playBtn = this.createMenuButton('menu-play-btn', '🎮 Play Game', 'btn-play');
    this.playBtn.onclick = () => {
      this.hide();
      EventBus.emit('GAME_START');
      this.onPlay();
    };

    this.configBtn = this.createMenuButton('menu-config-btn', '⚙️ Settings', 'btn-secondary');
    this.configBtn.onclick = () => {
      console.log('MainMenu: Settings button clicked');
      EventBus.emit('UI_SHOW_SETTINGS');
    };

    this.exitBtn = this.createMenuButton('menu-exit-btn', '❌ Exit', 'btn-secondary');
    this.exitBtn.onclick = () => {
      if (this.thankYouOverlay) this.thankYouOverlay.style.display = 'flex';
      try {
        window.close();
      } catch (e) {
        console.log('window.close blocked');
      }
    };

    actions.appendChild(this.playBtn);
    actions.appendChild(this.configBtn);
    actions.appendChild(this.exitBtn);
    panel.appendChild(actions);
    this.menuEl.appendChild(panel);

    // Thank You Overlay
    this.thankYouOverlay = document.createElement('div');
    this.thankYouOverlay.className = 'coming-soon-overlay';
    this.thankYouOverlay.id = 'menu-thank-you';
    this.thankYouOverlay.style.display = 'none';
    
    const thankBox = document.createElement('div');
    thankBox.className = 'modal-box';
    thankBox.innerHTML = `
      <h2>THANK YOU!</h2>
      <p>Thank you for playing Demolinko!</p>
    `;
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-primary';
    closeBtn.innerText = 'Close';
    closeBtn.onclick = () => {
      if (this.thankYouOverlay) this.thankYouOverlay.style.display = 'none';
    };
    
    thankBox.appendChild(closeBtn);
    this.thankYouOverlay.appendChild(thankBox);
    this.menuEl.appendChild(this.thankYouOverlay);

    parent.appendChild(this.menuEl);
  }

  private createMenuButton(id: string, text: string, className: string): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.id = id;
    btn.className = `menu-btn ${className}`;
    
    const iconSpan = document.createElement('span');
    iconSpan.className = 'btn-icon';
    // Extract icon from text (first char usually)
    iconSpan.innerText = text.split(' ')[0]; 
    
    const textSpan = document.createTextNode(text.substring(text.indexOf(' ') + 1));
    
    btn.appendChild(iconSpan);
    btn.appendChild(textSpan);
    return btn;
  }
}
