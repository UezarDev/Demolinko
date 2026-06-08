// src/rendering/ParticleRenderer.ts - Particle Renderer module that pre-allocates PixiJS sprites and manages coordinate rendering for physics particles.
/*
Exports:
- class ParticleRenderer: Pre-allocates and positions 12,000 particle sprites using texture pooling.
  * constructor(app: Application)
  * render(particles: PixelParticle[]): void
  * clear(): void
  * destroy(): void
*/

import { Application, Sprite, Texture } from 'pixi.js';
import { PixelParticle } from '../types/game';

export class ParticleRenderer {
  private app: Application;
  private spritePool: Sprite[] = [];
  private activeSprites: Map<string, Sprite> = new Map();
  private particleTexture: Texture;

  constructor(app: Application) {
    this.app = app;
    this.particleTexture = this.createParticleTexture();
    this.initPool();
  }

  /**
   * Generates a glossy/glow white radial dot canvas texture for the particles.
   */
  private createParticleTexture(): Texture {
    const singleWhiteDotCanvas = document.createElement('canvas');
    singleWhiteDotCanvas.width = 16;
    singleWhiteDotCanvas.height = 16;
    const dotCtx = singleWhiteDotCanvas.getContext('2d')!;

    dotCtx.clearRect(0, 0, 16, 16);
    const grad = dotCtx.createRadialGradient(8, 8, 2, 8, 8, 8);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.75, '#f3f4f6');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    dotCtx.fillStyle = grad;
    dotCtx.beginPath();
    dotCtx.arc(8, 8, 8, 0, Math.PI * 2);
    dotCtx.fill();

    return Texture.from(singleWhiteDotCanvas);
  }

  /**
   * Pre-allocates the pool of 12,000 Sprite objects to avoid runtime allocations.
   */
  private initPool(): void {
    for (let i = 0; i < 12000; i++) {
      const s = new Sprite(this.particleTexture);
      s.anchor.set(0.5);
      s.visible = false;
      this.app.stage.addChild(s);
      this.spritePool.push(s);
    }
  }

  /**
   * Updates sprite positions and visibility to reflect active simulation particles.
   */
  public render(particles: PixelParticle[]): void {
    // 1. Update PixiJS Sprite Pool positions for active particles
    for (const p of particles) {
      let s = this.activeSprites.get(p.id);
      if (!s) {
        // Fetch an inactive sprite from the pool
        s = this.spritePool.find(item => !item.visible);
        if (s) {
          s.visible = true;
          s.tint = p.color;
          this.activeSprites.set(p.id, s);
        }
      }
      if (s) {
        s.x = p.x;
        s.y = p.y;
      }
    }

    // 2. Hide and recycle sprites that are no longer linked to active particles
    for (const [id, s] of this.activeSprites.entries()) {
      if (!particles.some(p => p.id === id)) {
        s.visible = false;
        this.activeSprites.delete(id);
      }
    }
  }

  /**
   * Deactivates and hides all active sprites, returning them to the inactive pool.
   */
  public clear(): void {
    for (const s of this.activeSprites.values()) {
      s.visible = false;
    }
    this.activeSprites.clear();
  }

  /**
   * Clears and destroys all sprites and texture allocations to avoid memory leaks.
   */
  public destroy(): void {
    // Hide all sprites in active track
    for (const s of this.activeSprites.values()) {
      s.visible = false;
    }
    this.activeSprites.clear();

    // Remove sprites from stage and destroy them
    for (const s of this.spritePool) {
      this.app.stage.removeChild(s);
      s.destroy();
    }
    this.spritePool = [];

    // Destroy the shared texture source
    if (this.particleTexture) {
      this.particleTexture.destroy(true);
    }
  }
}
