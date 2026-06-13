// src/ui/AbilitiesPanel.ts - Right-side persistent abilities panel with cooldowns, key hints, and upgrade progress.

import { EventBus } from '../core/EventBus';
import { AbilityManager, Ability } from '../engine/AbilityManager';
import { emitAudioEvent } from '../engine/AudioManager';

export class AbilitiesPanel {
  private containerId: string;
  private abilityManager: AbilityManager;
  private panelEl: HTMLElement | null = null;
  private abilitySlots: Map<string, HTMLElement> = new Map();
  private updateInterval: number | null = null;

  constructor(containerId: string, abilityManager: AbilityManager) {
    this.containerId = containerId;
    this.abilityManager = abilityManager;
  }

  /** Initialize and show the abilities panel */
  public show(): void {
    const parent = document.getElementById(this.containerId);
    if (!parent) return;

    // Create panel if not exists
    this.panelEl = document.getElementById('abilities-panel');
    if (!this.panelEl) {
      this.panelEl = document.createElement('div');
      this.panelEl.id = 'abilities-panel';
      this.panelEl.className = 'abilities-panel';
      parent.appendChild(this.panelEl);
    }

    this.panelEl.style.display = 'flex';
    this.render();
    this.startUpdateLoop();
  }

  /** Hide the abilities panel */
  public hide(): void {
    if (this.panelEl) {
      this.panelEl.style.display = 'none';
    }
    this.stopUpdateLoop();
  }

  /** Render the panel layout and ability slots */
  private render(): void {
    if (!this.panelEl) return;

    this.panelEl.innerHTML = `
      <div class="abilities-header">
        <h2>ABILITIES</h2>
        <span class="abilities-hint">Press 1-4 to activate</span>
      </div>
      <div class="abilities-grid" id="abilities-grid"></div>
      <div class="abilities-footer">
        <span class="abilities-note">Unlock abilities in the Upgrade Tree</span>
      </div>
    `;

    const grid = this.panelEl.querySelector('#abilities-grid') as HTMLElement;
    if (!grid) return;

    const abilities = this.abilityManager.getAllAbilities();
    
    for (const ability of abilities) {
      const slotEl = this.createAbilitySlot(ability);
      this.abilitySlots.set(ability.id, slotEl);
      grid.appendChild(slotEl);
    }
  }

  /** Create a single ability slot element */
  private createAbilitySlot(ability: Ability): HTMLElement {
    const slot = document.createElement('div');
    slot.className = `ability-slot ${ability.unlocked ? 'unlocked' : 'locked'}`;
    slot.id = `ability-slot-${ability.id}`;
    slot.dataset.abilityId = ability.id;

    const cooldownPercent = ability.currentCooldown > 0 
      ? Math.min(100, (ability.currentCooldown / this.getBaseCooldown(ability.id)) * 100)
      : 0;

    slot.innerHTML = `
      <div class="ability-key-hint">${ability.keyHint}</div>
      <div class="ability-icon">${ability.icon}</div>
      <div class="ability-cooldown-overlay" style="height: ${cooldownPercent}%;"></div>
      <div class="ability-cooldown-text">${ability.currentCooldown > 0 ? ability.currentCooldown.toFixed(1) + 's' : ''}</div>
      <div class="ability-upgrade-indicator">${this.getUpgradeIndicator(ability)}</div>
      ${!ability.unlocked ? '<div class="ability-lock">🔒</div>' : ''}
      <div class="ability-tooltip">
        <div class="tooltip-title">${ability.title}</div>
        <div class="tooltip-desc">${ability.description}</div>
        <div class="tooltip-key">Key: ${ability.keyHint}</div>
        <div class="tooltip-cooldown">Cooldown: ${this.getBaseCooldown(ability.id)}s</div>
        ${ability.upgradeLevel > 0 ? `<div class="tooltip-level">Level: ${ability.upgradeLevel}</div>` : ''}
        ${!ability.unlocked ? '<div class="tooltip-locked">Locked - Purchase in Upgrade Tree</div>' : ''}
      </div>
    `;

    // Click handler for mouse activation
    slot.onclick = (e) => {
      if (ability.unlocked && ability.currentCooldown <= 0) {
        // For wrecking_ball at level 2+, enter targeting mode
        if (ability.id === 'wrecking_ball' && ability.upgradeLevel >= 2) {
          this.enterTargetingMode(ability.id);
        } else {
          this.activateAbility(ability.id);
        }
      }
      e.stopPropagation();
    };

    // Hover tooltip
    slot.onmouseenter = () => {
      const tooltip = slot.querySelector('.ability-tooltip') as HTMLElement;
      if (tooltip) tooltip.style.display = 'block';
    };
    slot.onmousemove = (e) => {
      const tooltip = slot.querySelector('.ability-tooltip') as HTMLElement;
      if (tooltip) {
        const rect = slot.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - rect.left + 10}px`;
        tooltip.style.top = `${e.clientY - rect.top + 10}px`;
      }
    };
    slot.onmouseleave = () => {
      const tooltip = slot.querySelector('.ability-tooltip') as HTMLElement;
      if (tooltip) tooltip.style.display = 'none';
    };

    return slot;
  }

  /** Get base cooldown for an ability (for percentage calculation) */
  private getBaseCooldown(abilityId: string): number {
    const defaults: Record<string, number> = {
      wrecking_ball: 30.0,
      seismic_slam: 45.0,
      gravity_well: 60.0,
      time_dilation: 90.0,
    };
    return defaults[abilityId] ?? 30.0;
  }

  /** Get upgrade indicator HTML */
  private getUpgradeIndicator(ability: Ability): string {
    if (!ability.unlocked) return '';
    const maxLevel = ability.id === 'wrecking_ball' ? 3 : 1;
    const dots = '●'.repeat(ability.upgradeLevel) + '○'.repeat(maxLevel - ability.upgradeLevel);
    return `<span class="upgrade-dots">${dots}</span>`;
  }

  /** Enter targeting mode for click-targeted abilities */
  private enterTargetingMode(abilityId: string): void {
    const ability = this.abilityManager.getAbility(abilityId);
    if (!ability) return;

    // Visual feedback - highlight the slot
    const slot = this.abilitySlots.get(abilityId);
    if (slot) {
      slot.classList.add('targeting');
    }

    // Change cursor to crosshair
    document.body.style.cursor = 'crosshair';

    // Listen for click on game canvas
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', this.handleTargetClick.bind(this, abilityId), { once: true });
    }

    // Also allow ESC to cancel
    document.addEventListener('keydown', this.handleEscapeCancel.bind(this, abilityId), { once: true });
  }

  /** Handle click during targeting mode */
  private handleTargetClick(abilityId: string, e: MouseEvent): void {
    // Clear targeting visual
    const slot = this.abilitySlots.get(abilityId);
    if (slot) {
      slot.classList.remove('targeting');
    }
    document.body.style.cursor = 'default';

    // Convert screen coordinates to grid coordinates
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const gridCellSize = 4; // From constants
    const targetX = Math.floor((e.clientX - rect.left) / gridCellSize);
    const targetY = Math.floor((e.clientY - rect.top) / gridCellSize);

    // Set targeting in ability manager
    this.abilityManager.setTargetingMode(abilityId, targetX, targetY);

    // Activate ability
    this.activateAbility(abilityId);

    // Clear targeting mode after activation
    this.abilityManager.clearTargetingMode(abilityId);
  }

  /** Handle ESC to cancel targeting mode */
  private handleEscapeCancel(abilityId: string, e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      const slot = this.abilitySlots.get(abilityId);
      if (slot) {
        slot.classList.remove('targeting');
      }
      document.body.style.cursor = 'default';
      this.abilityManager.clearTargetingMode(abilityId);
    }
  }

  /** Activate ability and play audio */
  private activateAbility(abilityId: string): void {
    // The actual activation is handled by GameLoop via event
    EventBus.emit('ABILITY_ACTIVATE_REQUEST', { abilityId });
    emitAudioEvent('UI_BUTTON_CLICK', { action: `ability_${abilityId}` });
  }

  /** Update all ability slot visuals */
  public update(): void {
    const abilities = this.abilityManager.getAllAbilities();
    
    for (const ability of abilities) {
      const slot = this.abilitySlots.get(ability.id);
      if (!slot) continue;

      // Update locked/unlocked state
      if (ability.unlocked) {
        slot.classList.remove('locked');
        slot.classList.add('unlocked');
        const lockEl = slot.querySelector('.ability-lock');
        if (lockEl) lockEl.remove();
      } else {
        slot.classList.remove('unlocked');
        slot.classList.add('locked');
      }

      // Update cooldown overlay
      const overlay = slot.querySelector('.ability-cooldown-overlay') as HTMLElement;
      const textEl = slot.querySelector('.ability-cooldown-text') as HTMLElement;
      if (overlay && textEl) {
        const cooldownPercent = ability.currentCooldown > 0
          ? Math.min(100, (ability.currentCooldown / this.getBaseCooldown(ability.id)) * 100)
          : 0;
        overlay.style.height = `${cooldownPercent}%`;
        textEl.textContent = ability.currentCooldown > 0 ? ability.currentCooldown.toFixed(1) + 's' : '';
      }

      // Update upgrade indicator
      const indicator = slot.querySelector('.ability-upgrade-indicator') as HTMLElement;
      if (indicator) {
        indicator.innerHTML = this.getUpgradeIndicator(ability);
      }

      // Update tooltip
      const tooltip = slot.querySelector('.ability-tooltip') as HTMLElement;
      if (tooltip) {
        tooltip.innerHTML = `
          <div class="tooltip-title">${ability.title}</div>
          <div class="tooltip-desc">${ability.description}</div>
          <div class="tooltip-key">Key: ${ability.keyHint}</div>
          <div class="tooltip-cooldown">Cooldown: ${this.getBaseCooldown(ability.id)}s</div>
          ${ability.upgradeLevel > 0 ? `<div class="tooltip-level">Level: ${ability.upgradeLevel}</div>` : ''}
          ${!ability.unlocked ? '<div class="tooltip-locked">Locked - Purchase in Upgrade Tree</div>' : ''}
        `;
      }
    }
  }

  /** Start the periodic update loop for cooldown display */
  private startUpdateLoop(): void {
    this.updateInterval = window.setInterval(() => this.update(), 100); // 10 FPS for smooth cooldown
  }

  /** Stop the update loop */
  private stopUpdateLoop(): void {
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /** Clean up */
  public destroy(): void {
    this.stopUpdateLoop();
    if (this.panelEl) {
      this.panelEl.remove();
      this.panelEl = null;
    }
    this.abilitySlots.clear();
  }
}