// src/engine/AudioManager.ts - Mock audio system with typed event hooks for future SFX integration.
// Provides structured event emission points for: hammer hits, peg bounces, pit collections,
// particle splits, material transmutes, pixel collapses, upgrades, drafts, day transitions, game over.

import { EventBus } from '../core/EventBus';
import { MaterialType, PegType } from '../types/game';

/** Audio event payload types for type-safe hooks */
export interface AudioEventMap {
  // Core gameplay
  HAMMER_HIT: { x: number; y: number; radius: number; damage: number };
  PEG_BOUNCE: { pegType: PegType; pegLevel: number; material: MaterialType; velocity: number };
  PIT_COLLECT: { material: MaterialType; payout: number; multiplier: number; pitIndex: number; isCrit: boolean; isPenalty: boolean };
  
  // Particle physics
  PARTICLE_SPLIT: { parentValue: number; cloneValue: number; splitCount: number };
  MATERIAL_TRANSMUTE: { fromMaterial: MaterialType; toMaterial: MaterialType; newValue: number };
  
  // Structural
  PIXEL_COLLAPSE: { pixelCount: number; material: MaterialType; x: number; y: number };
  PARTICLE_SPAWN: { material: MaterialType; count: number };
  
  // Progression
  UPGRADE_PURCHASED: { upgradeId: string; cost: number; title: string };
  DRAFT_SHOWN: { day: number; isGameOver: boolean; cardCount: number };
  DRAFT_SELECTED: { cardId: string; cardTitle: string; rarity: string };
  DAY_COMPLETE: { newDay: number; previousCash: number };
  GAME_OVER: { day: number; finalCash: number };
  
  // UI
  UI_BUTTON_CLICK: { action: string };
  UI_HOVER: { element: string };
}

/** Type-safe event keys */
export type AudioEventKey = keyof AudioEventMap;

/** Configuration for audio behavior */
export interface AudioConfig {
  masterVolume: number;
  sfxVolume: number;
  enabled: boolean;
  /** Debug: log all audio events to console */
  debugLog: boolean;
}

/** Default configuration */
const DEFAULT_CONFIG: AudioConfig = {
  masterVolume: 1.0,
  sfxVolume: 1.0,
  enabled: true,
  debugLog: true, // Enabled by default for development
};

/** AudioManager - Singleton mock audio system.
 *  All real audio implementation goes here. Game systems emit events via EventBus
 *  with 'AUDIO_' prefix, and AudioManager subscribes to play appropriate sounds. */
export class AudioManager {
  private static instance: AudioManager | null = null;
  private config: AudioConfig = { ...DEFAULT_CONFIG };
  private initialized: boolean = false;
  private eventHandlers: Map<string, (data: any) => void> = new Map();

  private constructor() {}

  /** Get singleton instance */
  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  /** Initialize and subscribe to all game audio events */
  public init(config?: Partial<AudioConfig>): void {
    if (this.initialized) return;
    this.config = { ...this.config, ...config };
    this.subscribeToEvents();
    this.initialized = true;
    if (this.config.debugLog) {
      console.log('[AudioManager] Initialized with config:', this.config);
    }
  }

  /** Update runtime configuration */
  public setConfig(config: Partial<AudioConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Get current configuration */
  public getConfig(): AudioConfig {
    return { ...this.config };
  }

  /** Core play method - stubbed for future SFX integration.
   *  @param eventKey - Typed event identifier
   *  @param data - Event payload for context-aware playback (pitch, volume, variation)
   *  @param options - Optional playback overrides */
  public play<K extends AudioEventKey>(
    eventKey: K,
    data: AudioEventMap[K],
    options?: { volume?: number; pitch?: number; delay?: number }
  ): void {
    if (!this.config.enabled) return;

    const volume = (options?.volume ?? 1.0) * this.config.sfxVolume * this.config.masterVolume;
    const pitch = options?.pitch ?? 1.0;
    const delay = options?.delay ?? 0;

    if (this.config.debugLog) {
      console.log(`[AudioManager] PLAY: ${eventKey}`, {
        data,
        volume: volume.toFixed(2),
        pitch: pitch.toFixed(2),
        delay: `${delay}ms`
      });
    }

    // TODO: Real audio implementation here
    // Example future implementation:
    // if (delay > 0) setTimeout(() => this.playSound(eventKey, data, volume, pitch), delay);
    // else this.playSound(eventKey, data, volume, pitch);
  }

  /** Convenience method for simple SFX without typed payload */
  public playSimple(soundId: string, volume: number = 1.0, pitch: number = 1.0): void {
    if (!this.config.enabled) return;
    const finalVolume = volume * this.config.sfxVolume * this.config.masterVolume;
    if (this.config.debugLog) {
      console.log(`[AudioManager] PLAY SIMPLE: ${soundId}`, { volume: finalVolume.toFixed(2), pitch: pitch.toFixed(2) });
    }
  }

  /** Subscribe to all game events that should trigger audio */
  private subscribeToEvents(): void {
    const handlers: [string, (data: any) => void][] = [
      // Core gameplay
      ['AUDIO_HAMMER_HIT', (data) => this.play('HAMMER_HIT', data)],
      ['AUDIO_PEG_BOUNCE', (data) => this.play('PEG_BOUNCE', data)],
      ['AUDIO_PIT_COLLECT', (data) => this.play('PIT_COLLECT', data)],
      
      // Particle physics
      ['AUDIO_PARTICLE_SPLIT', (data) => this.play('PARTICLE_SPLIT', data)],
      ['AUDIO_MATERIAL_TRANSMUTE', (data) => this.play('MATERIAL_TRANSMUTE', data)],
      
      // Structural
      ['AUDIO_PIXEL_COLLAPSE', (data) => this.play('PIXEL_COLLAPSE', data)],
      ['AUDIO_PARTICLE_SPAWN', (data) => this.play('PARTICLE_SPAWN', data)],
      
      // Progression
      ['AUDIO_UPGRADE_PURCHASED', (data) => this.play('UPGRADE_PURCHASED', data)],
      ['AUDIO_DRAFT_SHOWN', (data) => this.play('DRAFT_SHOWN', data)],
      ['AUDIO_DRAFT_SELECTED', (data) => this.play('DRAFT_SELECTED', data)],
      ['AUDIO_DAY_COMPLETE', (data) => this.play('DAY_COMPLETE', data)],
      ['AUDIO_GAME_OVER', (data) => this.play('GAME_OVER', data)],
      
      // UI
      ['AUDIO_UI_BUTTON_CLICK', (data) => this.play('UI_BUTTON_CLICK', data)],
      ['AUDIO_UI_HOVER', (data) => this.play('UI_HOVER', data)],
    ];

    for (const [event, handler] of handlers) {
      EventBus.on(event, handler);
      this.eventHandlers.set(event, handler);
    }
  }

  /** Cleanup - unsubscribe from all events */
  public destroy(): void {
    for (const [event, handler] of this.eventHandlers) {
      EventBus.off(event, handler);
    }
    this.eventHandlers.clear();
    this.initialized = false;
  }

  /** Reset singleton (for testing/hot-reload) */
  public static resetInstance(): void {
    if (AudioManager.instance) {
      AudioManager.instance.destroy();
      AudioManager.instance = null;
    }
  }
}

/** Helper function to emit audio events from anywhere in the codebase */
export function emitAudioEvent<K extends AudioEventKey>(eventKey: K, data: AudioEventMap[K]): void {
  const eventName = `AUDIO_${eventKey}`;
  EventBus.emit(eventName, data);
}

/** Convenience re-export for common event names */
export const AudioEvents = {
  HAMMER_HIT: 'AUDIO_HAMMER_HIT',
  PEG_BOUNCE: 'AUDIO_PEG_BOUNCE',
  PIT_COLLECT: 'AUDIO_PIT_COLLECT',
  PARTICLE_SPLIT: 'AUDIO_PARTICLE_SPLIT',
  MATERIAL_TRANSMUTE: 'AUDIO_MATERIAL_TRANSMUTE',
  PIXEL_COLLAPSE: 'AUDIO_PIXEL_COLLAPSE',
  PARTICLE_SPAWN: 'AUDIO_PARTICLE_SPAWN',
  UPGRADE_PURCHASED: 'AUDIO_UPGRADE_PURCHASED',
  DRAFT_SHOWN: 'AUDIO_DRAFT_SHOWN',
  DRAFT_SELECTED: 'AUDIO_DRAFT_SELECTED',
  DAY_COMPLETE: 'AUDIO_DAY_COMPLETE',
  GAME_OVER: 'AUDIO_GAME_OVER',
  UI_BUTTON_CLICK: 'AUDIO_UI_BUTTON_CLICK',
  UI_HOVER: 'AUDIO_UI_HOVER',
} as const;