// src/ui/DecisionModal.ts - Shared decision point for contract outcomes (Success/Failure).
import { EventBus } from '../core/EventBus';
import { UIScreen } from './UIScreen';

export interface DecisionOption {
  text: string;
  event: string;
}

export interface DecisionConfig {
  title: string;
  subtitle: string;
  options: DecisionOption[];
}

export class DecisionModal implements UIScreen {
  private containerId: string;
  private modalEl: HTMLElement | null = null;

  constructor(containerId: string = 'ui-root') {
    this.containerId = containerId;
  }

  public show(config: DecisionConfig): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    this.modalEl = document.getElementById('decision-modal-overlay');
    if (!this.modalEl) {
      this.modalEl = document.createElement('div');
      this.modalEl.id = 'decision-modal-overlay';
      this.modalEl.className = 'overlay-screen';
      parent.appendChild(this.modalEl);
    }

    this.modalEl.style.display = 'flex';
    this.render(config);
  }

  public hide(): void {
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  private render(config: DecisionConfig): void {
    if (!this.modalEl) return;

    this.modalEl.innerHTML = `
      <h1 class="draft-title" id="decision-title">${config.title}</h1>
      <p class="draft-subtitle" id="decision-subtitle">${config.subtitle}</p>
      <div class="card-container" id="decision-options"></div>
    `;

    const optionsContainer = document.getElementById('decision-options');
    if (!optionsContainer) return;

    config.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'btn-primary';
      btn.innerText = opt.text;
      btn.style.margin = '0 10px';
      btn.onclick = () => {
        this.hide();
        EventBus.emit(opt.event);
      };
      optionsContainer.appendChild(btn);
    });
  }
}
