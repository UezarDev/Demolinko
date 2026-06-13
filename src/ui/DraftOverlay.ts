// src/ui/DraftOverlay.ts - Fullscreen draft selection screen for blueprint modifiers.
import { EventBus } from '../core/EventBus';
import { UIScreen } from './UIScreen';

export interface UIDraftCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'COMMON' | 'RARE' | 'LEGENDARY';
  cost: number;
}

export class DraftOverlay implements UIScreen {
  public readonly id = 'draft';
  private containerId: string;
  private overlayEl: HTMLElement | null = null;

  constructor(containerId: string = 'ui-root') {
    this.containerId = containerId;
  }

  public show(data: { isGameOver: boolean; currentDay: number; cards: UIDraftCard[] }): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    this.overlayEl = document.getElementById('draft-overlay');
    if (!this.overlayEl) {
      this.overlayEl = document.createElement('div');
      this.overlayEl.id = 'draft-overlay';
      this.overlayEl.className = 'overlay-screen';
      parent.appendChild(this.overlayEl);
    }

    this.overlayEl.style.display = 'flex';
    this.render(data);
  }

  public hide(): void {
    if (this.overlayEl) {
      this.overlayEl.style.display = 'none';
    }
  }

  private render(data: { isGameOver: boolean; currentDay: number; cards: UIDraftCard[] }): void {
    if (!this.overlayEl) return;

    const { isGameOver, currentDay, cards } = data;

    // Clear current content completely
    this.overlayEl.innerHTML = '';

    // 1. Create Title
    const title = document.createElement('h1');
    title.className = 'draft-title';
    title.id = 'draft-main-title';
    title.innerText = isGameOver ? 'CONTRACT FAILURE' : 'CONTRACT SECURED!';
    if (isGameOver) title.style.color = '#ef4444';
    this.overlayEl.appendChild(title);

    // 2. Create Subtitle
    const subtitle = document.createElement('p');
    subtitle.className = 'draft-subtitle';
    subtitle.innerText = isGameOver 
      ? `Contract timer expired on Day ${currentDay}. Sledgehammer operations suspended. Game Over.`
      : 'Select 1 Blueprint card modifier to upgrade your codebase properties:';
    this.overlayEl.appendChild(subtitle);

    // 3. Create Cards Container
    const cardContainer = document.createElement('div');
    cardContainer.className = 'card-container';
    cardContainer.id = 'draft-card-container';
    this.overlayEl.appendChild(cardContainer);

    if (isGameOver) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn-primary';
      retryBtn.innerText = 'Restart Run';
      retryBtn.style.marginTop = '20px';
      retryBtn.onclick = () => {
        EventBus.emit('GAME_RESTART_RUN');
      };
      cardContainer.appendChild(retryBtn);
      return;
    }

    // 4. Populate Cards using DOM API for robust event binding
    cards.forEach((card) => {
      const cardEl = document.createElement('div');
      cardEl.className = `draft-card ${card.rarity === 'RARE' ? 'tier-2' : (card.rarity === 'LEGENDARY' ? 'tier-3' : '')}`;
      
      const icon = document.createElement('div');
      icon.className = 'card-icon';
      icon.innerText = card.icon;
      
      const name = document.createElement('div');
      name.className = 'card-name';
      name.innerText = card.title;
      
      const desc = document.createElement('div');
      desc.className = 'card-desc';
      desc.innerText = card.description;
      
      const rarity = document.createElement('div');
      rarity.className = 'card-rarity';
      rarity.innerText = card.rarity;

      cardEl.appendChild(icon);
      cardEl.appendChild(name);
      cardEl.appendChild(desc);
      cardEl.appendChild(rarity);

      // Direct binding - this will not be destroyed by innerHTML
      cardEl.onclick = () => {
        console.log(`DraftOverlay: Card selected -> ${card.id}`);
        EventBus.emit('GAME_DRAFT_SELECTED', card.id);
      };

      cardContainer.appendChild(cardEl);
    });
  }
}
