# Pachinko Rogue-lite Development Plan

This document tracks our step-by-step layout and checklist for implementing the rogue-lite incremental Pachinko game using TypeScript and PixiJS (v8).

## Phase 1 Checklist: Setup and Core Execution Loop
- [ ] Install Node.js & npm (v20.14.0 LTS via winget).
- [ ] Create `package.json` with dependencies (PixiJS v8, Vite, TypeScript).
- [ ] Create `tsconfig.json` for TypeScript compilation.
- [ ] Create `vite.config.ts` for Vite bundling.
- [ ] Create `index.html` as the entry point.
- [ ] Create `src/style.css` for simple, sleek black background and full viewport styling.
- [ ] Implement `src/types/game.ts` defining all enums and interfaces:
  - `CellState`: `STATIC`, `SAND`, `PARTICLE`
  - `MaterialType`: `CONCRETE`, `GLASS`, `COPPER`, `CHAOS`
  - `GridCell`: `color`, `material`, `hp`, `state`
  - `PixelParticle`: `id`, `x`, `y`, `vx`, `vy`, `color`, `material`, `appliedEffects`
  - `PegType`: `NORMAL`, `BOUNCER`, `SPLITTER`, `ALCHEMIST`, `COMPOSITE`
  - `Peg`: `id`, `x`, `y`, `type`, `level`, `multiplier`, `inheritedPegProperties`
  - `Pit`: `index`, `xStart`, `xEnd`, `baseMultiplier`, `specializedScalingBonuses`
- [ ] Implement `src/main.ts` with:
  - PixiJS v8 App asynchronous initialization.
  - High-performance particle management system (handling up to 10,000+ active particles smoothly).
  - Main 60fps loop with delta-time accumulator, bridging Demolition Grid, Plinko Board, and Pit Manager.

## Phase 2 Checklist: Sand-Demolition Engine (`src/engine/DemolitionGrid.ts`)
- [ ] Offscreen canvas image parser loading structures from PNGs.
- [ ] HSL/HSV color mapping (Saturation < 20% -> Concrete, Blue/Cyan -> Glass, Red/Orange -> Copper).
- [ ] Noita-style falling sand cellular automata logic (down, down-left, down-right swaps).
- [ ] Structural integrity check (any static cell without vertical/diagonal support collapses to sand).

## Phase 3 Checklist: Plinko Board & Basement System
- [ ] Rigid rectangular peg grid (`src/engine/PlinkoBoard.ts`).
- [ ] Vector math reflection for all peg types (Normal, Bouncer, Splitter, Alchemist, Composite).
- [ ] Clean peg absorption function stub (`absorbPegs`).
- [ ] 12 basement pits (`src/engine/PitManager.ts`) with contract-start randomization pass.

## Phase 4 Checklist: Run Manager & Drafting Engine (`src/engine/RunManager.ts`)
- [ ] Day/Quota state machine tracking cash and quota targets.
- [ ] 3-card Blueprint Draft UI rendering and modifier selection.
- [ ] Difficulty budget grid layout generator (placing structures side-by-side with color-grading and T2+ health scales).
