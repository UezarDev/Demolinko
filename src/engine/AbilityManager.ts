// src/engine/AbilityManager.ts - Cooldown-based active abilities system.
// Supports keyboard hotkeys (1-4), clickable UI, upgrade tree integration.

import { EventBus } from '../core/EventBus';
import { emitAudioEvent } from './AudioManager';
import { DemolitionGrid } from './DemolitionGrid';
import { MaterialType } from '../types/game';

export interface Ability {
  id: string;
  title: string;
  description: string;
  icon: string;
  keyHint: string; // '1', '2', '3', '4'
  cooldown: number; // seconds
  maxCharges?: number; // future: charge-based abilities
  unlocked: boolean;
  currentCooldown: number; // remaining seconds
  upgradeLevel: number; // 0 = locked, 1+ = unlocked/upgraded
}

export interface AbilityEffectContext {
  gridEngine: DemolitionGrid;
  targetX?: number;
  targetY?: number;
  gridCols: number;
  gridRows: number;
  gridCellSize: number;
}

export class AbilityManager {
  private abilities: Map<string, Ability> = new Map();
  private activeTargets: Map<string, { x: number; y: number }> = new Map(); // For click-targeting mode

  constructor() {
    this.initializeAbilities();
  }

  private initializeAbilities(): void {
    // Wrecking Ball - Ability 1
    this.abilities.set('wrecking_ball', {
      id: 'wrecking_ball',
      title: 'Wrecking Ball',
      description: 'Launch a massive demolition sphere at target location. Upgrades: Targeted → Multi-Ball.',
      icon: '🏐',
      keyHint: '1',
      cooldown: 30.0,
      maxCharges: 1,
      unlocked: false, // Unlocked via upgrade tree
      currentCooldown: 0,
      upgradeLevel: 0, // 0=locked, 1=random, 2=targeted, 3=multi-ball
    });

    // Future abilities (placeholders for expansion)
    this.abilities.set('seismic_slam', {
      id: 'seismic_slam',
      title: 'Seismic Slam',
      description: 'Create a shockwave that collapses structures in a wide radius.',
      icon: '🌊',
      keyHint: '2',
      cooldown: 45.0,
      maxCharges: 1,
      unlocked: false,
      currentCooldown: 0,
      upgradeLevel: 0,
    });

    this.abilities.set('gravity_well', {
      id: 'gravity_well',
      title: 'Gravity Well',
      description: 'Pull all particles and debris toward a singularity point.',
      icon: '🕳️',
      keyHint: '3',
      cooldown: 60.0,
      maxCharges: 1,
      unlocked: false,
      currentCooldown: 0,
      upgradeLevel: 0,
    });

    this.abilities.set('time_dilation', {
      id: 'time_dilation',
      title: 'Time Dilation',
      description: 'Slow down all physics and timers for a brief period.',
      icon: '⏱️',
      keyHint: '4',
      cooldown: 90.0,
      maxCharges: 1,
      unlocked: false,
      currentCooldown: 0,
      upgradeLevel: 0,
    });
  }

  /** Initialize all ability cooldowns to zero (ready) */
  public resetCooldowns(): void {
    for (const ability of this.abilities.values()) {
      ability.currentCooldown = 0;
    }
  }

  /** Update all ability cooldowns - call once per frame with deltaTime in seconds */
  public update(deltaTime: number): void {
    for (const ability of this.abilities.values()) {
      if (ability.currentCooldown > 0) {
        ability.currentCooldown = Math.max(0, ability.currentCooldown - deltaTime);
        // Emit cooldown tick event for UI updates
        if (ability.currentCooldown <= 0) {
          EventBus.emit('ABILITY_READY', { abilityId: ability.id });
        }
      }
    }
  }

  /** Check if an ability is ready to use */
  public isReady(abilityId: string): boolean {
    const ability = this.abilities.get(abilityId);
    return ability !== undefined && ability.unlocked && ability.currentCooldown <= 0;
  }

  /** Get ability by ID */
  public getAbility(abilityId: string): Ability | undefined {
    return this.abilities.get(abilityId);
  }

  /** Get all abilities as array */
  public getAllAbilities(): Ability[] {
    return Array.from(this.abilities.values());
  }

  /** Get abilities that are unlocked */
  public getUnlockedAbilities(): Ability[] {
    return Array.from(this.abilities.values()).filter(a => a.unlocked);
  }

  /** Unlock or upgrade an ability (called from upgrade tree purchase) */
  public unlockAbility(abilityId: string, level: number = 1): boolean {
    const ability = this.abilities.get(abilityId);
    if (!ability) return false;

    ability.unlocked = true;
    ability.upgradeLevel = Math.max(ability.upgradeLevel, level);
    ability.currentCooldown = 0; // Ready immediately on unlock

    EventBus.emit('ABILITY_UNLOCKED', { abilityId: ability.id, level: ability.upgradeLevel });
    emitAudioEvent('UPGRADE_PURCHASED', {
      upgradeId: abilityId,
      cost: 0,
      title: ability.title
    });

    return true;
  }

  /** Activate an ability by ID. Returns true if activated successfully. */
  public activateAbility(abilityId: string, context: AbilityEffectContext): boolean {
    const ability = this.abilities.get(abilityId);
    if (!ability || !ability.unlocked || ability.currentCooldown > 0) {
      return false;
    }

    // Execute ability effect
    const success = this.executeAbilityEffect(ability, context);
    
    if (success) {
      ability.currentCooldown = ability.cooldown;
      EventBus.emit('ABILITY_ACTIVATED', { 
        abilityId: ability.id, 
        upgradeLevel: ability.upgradeLevel,
        context 
      });
      emitAudioEvent('UI_BUTTON_CLICK', { action: `ability_${abilityId}` });
      return true;
    }

    return false;
  }

  /** Set targeting mode for click-targeted abilities */
  public setTargetingMode(abilityId: string, targetX: number, targetY: number): void {
    const ability = this.abilities.get(abilityId);
    if (ability && ability.unlocked) {
      this.activeTargets.set(abilityId, { x: targetX, y: targetY });
    }
  }

  /** Clear targeting mode */
  public clearTargetingMode(abilityId: string): void {
    this.activeTargets.delete(abilityId);
  }

  /** Get active targeting mode */
  public getTargetingMode(abilityId: string): { x: number; y: number } | undefined {
    return this.activeTargets.get(abilityId);
  }

  /** Execute the actual ability effect based on ability type and upgrade level */
  private executeAbilityEffect(ability: Ability, context: AbilityEffectContext): boolean {
    switch (ability.id) {
      case 'wrecking_ball':
        return this.executeWreckingBall(ability, context);
      case 'seismic_slam':
        return this.executeSeismicSlam(ability, context);
      case 'gravity_well':
        return this.executeGravityWell(ability, context);
      case 'time_dilation':
        return this.executeTimeDilation(ability, context);
      default:
        return false;
    }
  }

  /** Wrecking Ball: Large-area demolition at target location */
  private executeWreckingBall(ability: Ability, context: AbilityEffectContext): boolean {
    const { gridEngine, targetX, targetY, gridCols, gridRows } = context;
    
    // Determine target: use click target if in targeting mode, else random
    let tx: number, ty: number;
    
    if (ability.upgradeLevel >= 2 && targetX !== undefined && targetY !== undefined) {
      // Targeted mode (upgrade level 2+)
      tx = targetX;
      ty = targetY;
    } else {
      // Random mode (level 1) - pick a random grid position with structures
      const validTargets: { x: number; y: number }[] = [];
      for (let y = 4; y < gridRows; y++) {
        for (let x = 0; x < gridCols; x++) {
          const cell = gridEngine.getCell(x, y);
          if (cell && (cell.state === 'STATIC' || cell.state === 'SAND')) {
            validTargets.push({ x, y });
          }
        }
      }
      
      if (validTargets.length === 0) return false;
      const target = validTargets[Math.floor(Math.random() * validTargets.length)];
      tx = target.x;
      ty = target.y;
    }

    // Calculate radius based on upgrade level
    const baseRadius = 5; // Larger than normal hammer (3)
    const radius = baseRadius + (ability.upgradeLevel >= 3 ? 3 : 0); // Multi-ball: even larger
    const damage = 50 + ability.upgradeLevel * 25; // Scaling damage

    // Apply damage area
    gridEngine.damageArea(tx, ty, radius, damage);

    // Multi-ball: if level 3, spawn 2 additional smaller impacts nearby
    if (ability.upgradeLevel >= 3) {
      for (let i = 0; i < 2; i++) {
        const offsetX = (Math.random() - 0.5) * 8;
        const offsetY = (Math.random() - 0.5) * 8;
        const mx = Math.floor(tx + offsetX);
        const my = Math.floor(ty + offsetY);
        if (mx >= 0 && mx < gridCols && my >= 4 && my < gridRows) {
          gridEngine.damageArea(mx, my, 3, 25);
        }
      }
    }

    // Emit pixel collapse event for audio
    emitAudioEvent('PIXEL_COLLAPSE', {
      pixelCount: radius * radius,
      material: MaterialType.CONCRETE,
      x: tx,
      y: ty
    });

    return true;
  }

  /** Seismic Slam: Wide shockwave collapse */
  private executeSeismicSlam(ability: Ability, context: AbilityEffectContext): boolean {
    const { gridEngine, targetX, targetY, gridCols, gridRows } = context;
    
    let tx: number, ty: number;
    if (targetX !== undefined && targetY !== undefined) {
      tx = targetX;
      ty = targetY;
    } else {
      // Default to center-bottom
      tx = Math.floor(gridCols / 2);
      ty = gridRows - 10;
    }

    const radius = 8 + ability.upgradeLevel * 2;
    const damage = 30 + ability.upgradeLevel * 15;

    gridEngine.damageArea(tx, ty, radius, damage);

    emitAudioEvent('PIXEL_COLLAPSE', {
      pixelCount: radius * radius * 2,
      material: MaterialType.CONCRETE,
      x: tx,
      y: ty
    });

    return true;
  }

  /** Gravity Well: Pull particles toward a point */
  private executeGravityWell(ability: Ability, context: AbilityEffectContext): boolean {
    // This would interact with particle physics - placeholder for future
    EventBus.emit('ABILITY_GRAVITY_WELL', { 
      x: context.targetX ?? Math.floor(context.gridCols / 2),
      y: context.targetY ?? context.gridRows - 10,
      strength: 1.0 + ability.upgradeLevel * 0.5
    });
    return true;
  }

  /** Time Dilation: Slow down physics */
  private executeTimeDilation(ability: Ability, _context: AbilityEffectContext): boolean {
    const duration = 5.0 + ability.upgradeLevel * 2.0;
    EventBus.emit('ABILITY_TIME_DILATION', { 
      duration,
      intensity: 0.3 // 30% speed
    });
    return true;
  }

  /** Serialize for save/load */
  public serialize(): any {
    const data: any = {};
    for (const [id, ability] of this.abilities) {
      data[id] = {
        unlocked: ability.unlocked,
        upgradeLevel: ability.upgradeLevel,
        currentCooldown: ability.currentCooldown,
      };
    }
    return data;
  }

  /** Deserialize from save */
  public deserialize(data: any): void {
    if (!data) return;
    for (const [id, saved] of Object.entries(data)) {
      const ability = this.abilities.get(id);
      const savedAbility = saved as { unlocked?: boolean; upgradeLevel?: number; currentCooldown?: number } | undefined;
      if (ability && savedAbility) {
        ability.unlocked = savedAbility.unlocked ?? false;
        ability.upgradeLevel = savedAbility.upgradeLevel ?? 0;
        ability.currentCooldown = savedAbility.currentCooldown ?? 0;
      }
    }
  }
}