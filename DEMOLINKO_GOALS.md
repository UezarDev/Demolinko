# Demolinko — Goals & Game Direction

## Design Pillars (North Star — Check Every Decision Against These)
1. **Juicy Feel** — Every action has audible/visual feedback; mock audio system ready for real SFX
2. **Player Agency** — No forced purchases, no soft locks; upgrades are strategic choices
3. **Clear Progression** — Day N feels meaningfully different from Day N-1; contracts scale intelligently
4. **Strategic Depth** — Abilities, pit targeting, upgrade paths create meaningful decisions
5. **Shippable Polish** — No crashes, no console errors, mobile-friendly, works on first load

---

## Feature Horizons (Broad Directions — Cron Uses These to Generate Tasks When Ledger Empty)

### Core Game Feel
- Mock audio system with typed event hooks (hammer, bounce, peg collisions, pit collection, upgrades, draft, day complete, game over)
- Pixel collapse detection → emit structured events for audio/particle systems
- Screen shake, particle bursts, hit pause — juice on every interaction

### Abilities System
- Cooldown-based active abilities (keyboard 1-4 + clickable UI)
- First: Wrecking Ball (random large-area hit → upgradable to targeted → multi-ball)
- Purchased via Upgrade Tree (new branch)
- Persistent right-side Abilities Panel (cooldowns, key hints, upgrade progress)

### Layout & Scaling
- Wider viewport to fit 5 buildings horizontally in contract layout
- Contract scaling fix: difficulty > 16 picks lower ranks that sum to target (not random partition)

### Architecture & Maintainability
- **Balance Config Separation**: All magic numbers → `src/config/balance.ts` (mirrors `upgrades.ts` pattern)
- **No God Files**: Decompose `GameLoop.ts`, `RunManager.ts` into focused modules + orchestrators
  - `PhysicsOrchestrator` (sand CA, particles, plinko, pits)
  - `ProgressionOrchestrator` (contracts, draft, economy, tiers)
  - `UIOrchestrator` (HUD, draft overlay, upgrade tree, abilities panel)

---

## Explicitly Blocked / Do Not Touch (Stable Foundations)
- `EventBus.ts` — pub/sub backbone
- `SaveManager.ts` — localStorage persistence
- `DemolitionGrid.ts` — cellular automata core
- `building_library.json` — asset manifest (discuss before restructure)