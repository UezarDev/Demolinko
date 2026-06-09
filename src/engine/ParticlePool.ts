import { PixelParticle, MaterialType } from '../types/game';

export class ParticlePool {
  private pool: PixelParticle[];
  private available: PixelParticle[];

  constructor(size: number = 1000) {
    this.pool = new Array(size);
    this.available = [];

    for (let i = 0; i < size; i++) {
      const particle: PixelParticle = {
        id: '',
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        color: 0,
        material: MaterialType.CONCRETE,
        value: 0,
        appliedEffects: [],
        splitCount: 0,
        lastSplitPegId: null,
      };
      this.pool[i] = particle;
      this.available.push(particle);
    }
  }

  get(): PixelParticle | null {
    return this.available.pop() || null;
  }

  release(particle: PixelParticle): void {
    particle.id = '';
    particle.x = 0;
    particle.y = 0;
    particle.vx = 0;
    particle.vy = 0;
    particle.color = 0;
    particle.material = MaterialType.CONCRETE;
    particle.value = 0;
    particle.appliedEffects = [];
    particle.splitCount = 0;
    particle.lastSplitPegId = null;

    this.available.push(particle);
  }

  getAvailableCount(): number {
    return this.available.length;
  }
}