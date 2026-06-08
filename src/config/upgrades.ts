// src/config/upgrades.ts - Tree-based Upgrade Configuration system designed for the user to edit manually.
/*
=========================================================================================
UPGRADE TREE MODIFIER KEYWORDS EXPLANATION
=========================================================================================
Each upgrade can specify one or more of the following keywords inside its `effect` block:

1. `cursorDamage`:
   - Description: Flat increase to damage per automatic hammer hit.
   - Example: { cursorDamage: 5 } adds +5 damage to the base hammer hit.

2. `cursorSpeed`:
   - Description: Reduces the automatic hammer attack cooldown.
   - Example: { cursorSpeed: 0.15 } reduces attack cooldown by 15% (e.g. swings 15% faster).
   - The total reduction is the sum of all bought cursorSpeed effects.

3. `cursorSize`:
   - Description: Flat increase to the `dmgRadius` of the hammer (measured in grid cells).
   - Example: { cursorSize: 1 } adds +1 cell radius to the hammer explosion zone.

4. `plinkoSpeed`:
   - Description: Reduces the decay timer of sand on the ground (meaning sand evaporates faster and spawns balls faster).
   - Example: { plinkoSpeed: 0.1 } subtracts 0.1 seconds from the base sand decay timer.

5. `unlockBouncers`:
   - Description: Enables Bouncer pegs to be unlocked on the board.
   - Value: boolean. When bought, random normal pegs on the Plinko board are transmuted into orange BOUNCER pegs.

6. `unlockSplitters`:
   - Description: Enables Splitter pegs to be unlocked on the board.
   - Value: boolean. When bought, random normal pegs on the Plinko board are transmuted into light-blue SPLITTER pegs.

7. `unlockAlchemists`:
   - Description: Enables Alchemist pegs to be unlocked on the board.
   - Value: boolean. When bought, random normal pegs on the Plinko board are transmuted into magenta ALCHEMIST pegs.
=========================================================================================
*/

export interface UpgradeEffect {
  cursorDamage?: number;
  cursorSpeed?: number;
  cursorSize?: number;
  plinkoSpeed?: number;
  unlockBouncers?: boolean;
  unlockSplitters?: boolean;
  unlockAlchemists?: boolean;
}

export interface UpgradeNode {
  id: string;
  title: string;
  description: string;
  icon: string;
  cost: number;
  pos: { x: number; y: number };
  requires: string[];
  effect: UpgradeEffect;
}

export const UPGRADE_TREE: UpgradeNode[] = [
  // -------------------------------------------------------------
  // Centerpiece (First node, no requirements)
  // -------------------------------------------------------------
  {
    id: 'base_speed',
    title: 'Plinko balls spawning speed +10%',
    description: 'Increases gravity sand decay on the floor by 10%, speeding up the ball generation cycle.',
    icon: '⚡',
    cost: 200, // 10x Inflated Cost (was 20)
    pos: { x: 400, y: 300 },
    requires: [],
    effect: { plinkoSpeed: 0.1 },
  },

  // -------------------------------------------------------------
  // Left Wing: Hammer Damage Upgrades
  // -------------------------------------------------------------
  {
    id: 'cursor_damage_1',
    title: 'Sledge Damage I',
    description: 'Increases automatic cursor hit damage by +5.',
    icon: '💥',
    cost: 350, // 10x Inflated Cost (was 35)
    pos: { x: 250, y: 300 },
    requires: ['base_speed'],
    effect: { cursorDamage: 5 },
  },
  {
    id: 'cursor_damage_2',
    title: 'Sledge Damage II',
    description: 'Increases automatic cursor hit damage by an additional +10.',
    icon: '🔱',
    cost: 750, // 10x Inflated Cost (was 75)
    pos: { x: 100, y: 300 },
    requires: ['cursor_damage_1'],
    effect: { cursorDamage: 10 },
  },

  // -------------------------------------------------------------
  // Left Wing: Hammer Size Upgrades
  // -------------------------------------------------------------
  {
    id: 'cursor_size_1',
    title: 'Sledge Radius I',
    description: 'Increases the hammer demolition strike radius by +1 unit.',
    icon: '🔮',
    cost: 300, // 10x Inflated Cost (was 30)
    pos: { x: 250, y: 450 },
    requires: ['base_speed'],
    effect: { cursorSize: 1 },
  },
  {
    id: 'cursor_size_2',
    title: 'Sledge Radius II',
    description: 'Increases the hammer strike radius by an additional +1 unit.',
    icon: '🌟',
    cost: 650, // 10x Inflated Cost (was 65)
    pos: { x: 100, y: 450 },
    requires: ['cursor_size_1'],
    effect: { cursorSize: 1 },
  },

  // -------------------------------------------------------------
  // Right Wing: Peg Unlocks
  // -------------------------------------------------------------
  {
    id: 'unlock_bouncer',
    title: 'Unlock Bouncers',
    description: 'Enables high-impulse Bouncer pegs! Transmutes 3 existing Normal pegs on your board into Bouncers.',
    icon: '🌀',
    cost: 400, // 10x Inflated Cost (was 40)
    pos: { x: 400, y: 150 },
    requires: ['base_speed'],
    effect: { unlockBouncers: true },
  },
  {
    id: 'unlock_splitter',
    title: 'Unlock Splitters',
    description: 'Enables particle-duplicating Splitters! Transmutes 3 existing Normal pegs into Splitters.',
    icon: '💠',
    cost: 800, // 10x Inflated Cost (was 80)
    pos: { x: 550, y: 150 },
    requires: ['unlock_bouncer'],
    effect: { unlockSplitters: true },
  },
  {
    id: 'unlock_alchemist',
    title: 'Unlock Alchemists',
    description: 'Enables transmutation-capable Alchemists! Transmutes 2 existing Normal pegs into Alchemists.',
    icon: '🧪',
    cost: 1500, // 10x Inflated Cost (was 150)
    pos: { x: 700, y: 150 },
    requires: ['unlock_splitter'],
    effect: { unlockAlchemists: true },
  },

  // -------------------------------------------------------------
  // Bottom Right Wing: Plinko Spawning Speed Progression
  // -------------------------------------------------------------
  {
    id: 'plinko_speed_2',
    title: 'Plinko Speed II',
    description: 'Further decreases sand ground decay by 0.15 seconds, spawning balls at a higher frequency.',
    icon: '🌪️',
    cost: 500, // 10x Inflated Cost (was 50)
    pos: { x: 550, y: 300 },
    requires: ['base_speed'],
    effect: { plinkoSpeed: 0.15 },
  },
  {
    id: 'plinko_speed_3',
    title: 'Plinko Speed III',
    description: 'Decreases sand ground decay by an additional 0.20 seconds.',
    icon: '☄️',
    cost: 1000, // 10x Inflated Cost (was 100)
    pos: { x: 700, y: 300 },
    requires: ['plinko_speed_2'],
    effect: { plinkoSpeed: 0.20 },
  },

  // -------------------------------------------------------------
  // Bottom Left Wing: Sledge Cooldown Speed Progression
  // -------------------------------------------------------------
  {
    id: 'cursor_speed_1',
    title: 'Sledge Cooldown I',
    description: 'Swings the automatic sledgehammer 15% faster.',
    icon: '⚙️',
    cost: 450, // 10x Inflated Cost (was 45)
    pos: { x: 400, y: 450 },
    requires: ['base_speed'],
    effect: { cursorSpeed: 0.15 },
  },
  {
    id: 'cursor_speed_2',
    title: 'Sledge Cooldown II',
    description: 'Swings the automatic sledgehammer an additional 20% faster.',
    icon: '🚀',
    cost: 950, // 10x Inflated Cost (was 95)
    pos: { x: 550, y: 450 },
    requires: ['cursor_speed_1'],
    effect: { cursorSpeed: 0.20 },
  },
];
