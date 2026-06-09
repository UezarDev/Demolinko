// src/types/game.ts - Core types, interfaces, and enums representing the physics, grid, and progression systems of the game.
/*
Exports:
- enum CellState: Represents the simulation state of a cell in the sandbox grid.
  * STATIC: Non-moving structural cells.
  * SAND: Gravity-affected cellular automata cells.
  * PARTICLE: Erased from the grid, now a physics-based particle.
- enum MaterialType: Defines the material composition of structures and particles.
  * CONCRETE: Heavy, low elasticity, high durability.
  * GLASS: Light, brittle, easily fractured.
  * COPPER: Elastic, bouncy, conductive.
  * CHAOS: Transmuted, highly volatile and rewarding format.
- enum PegType: Specifies the behavior profile of upgradeable pegs.
  * NORMAL: Default reflection peg.
  * BOUNCER: Velocity-boosting peg.
  * SPLITTER: Duplicates hitting particles.
  * ALCHEMIST: Material-altering transmuter peg.
  * COMPOSITE: Sequences multiple peg behavioral hooks.
- interface GridCell: Structure of a single cell in the 2D demolition grid.
  * color: number
  * material: MaterialType
  * hp: number (Base_HP = pixelMass * difficultyMultiplier)
  * state: CellState
- interface PixelParticle: Defines the properties of an active physics particle.
  * id: string
  * x: number
  * y: number
  * vx: number
  * vy: number
  * color: number
  * material: MaterialType
  * value: number (structural value representing points/cash)
  * appliedEffects: string[]
- interface Peg: Defines a Plinko board peg node.
  * id: string
  * x: number
  * y: number
  * type: PegType
  * level: number
  * multiplier: number
  * inheritedTypes: PegType[] (supports fusion/composite Peg logic)
- interface Pit: Defines a collection bin at the bottom of the Plinko board.
  * index: number
  * xStart: number
  * xEnd: number
  * baseMultiplier: number
  * scalingBonuses: Record<MaterialType, number> (material specialized scaling)
*/

export enum CellState {
  STATIC = 'STATIC',
  SAND = 'SAND',
  PARTICLE = 'PARTICLE'
}

export enum MaterialType {
  CONCRETE = 'CONCRETE',
  GLASS = 'GLASS',
  COPPER = 'COPPER',
  WOOD = 'WOOD',
  CHAOS = 'CHAOS'
}

export enum PegType {
  NORMAL = 'NORMAL',
  BOUNCER = 'BOUNCER',
  SPLITTER = 'SPLITTER',
  ALCHEMIST = 'ALCHEMIST',
  COMPOSITE = 'COMPOSITE'
}

export interface GridCell {
  color: number;
  material: MaterialType;
  hp: number;
  maxHp?: number;
  state: CellState;
  decayTimer?: number;
}

export const MAX_SPLIT_DEPTH = 3;

export interface PixelParticle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
  material: MaterialType;
  value: number;
  appliedEffects: string[];
  splitCount: number;
  lastSplitPegId: string | null;
}

export interface Peg { 
  scale: number;
  id: string;
  x: number;
  y: number;
  type: PegType;
  level: number;
  multiplier: number;
  inheritedTypes: PegType[];
}

export interface Pit {
  index: number;
  xStart: number;
  xEnd: number;
  baseMultiplier: number;
  scalingBonuses: Record<MaterialType, number>;
}
