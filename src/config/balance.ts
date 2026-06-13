// src/config/balance.ts - Centralized Game Balance Configuration
// All magic numbers extracted from engine files for easy tuning and iteration.
// Edit this file to adjust game feel, progression, and difficulty without touching logic.
/*
=========================================================================================
BALANCE CONFIGURATION STRUCTURE
=========================================================================================
This file mirrors the pattern of upgrades.ts — pure data, no logic.
Import from here instead of hardcoding values in engine/gameplay files.

Sections:
1. Viewport & Grid — Screen dimensions, grid resolution
2. Contract Timer — Day timer, failure conditions
3. Budget & Progression — Starting budget, scaling formulas, tier multipliers
4. Hammer / Auto-Sledge — Base damage, radius, cooldown, upgrade modifiers
5. Sand & Particle Physics — Gravity, spawn velocity, decay, cellular automata
6. Plinko Board — Peg layout, collision, material physics, peg behaviors
7. Pit System — Count, multipliers, specialization zones, render positions
8. Structural Integrity — Flood fill ranges, collapse detection
9. Abilities — Cooldowns, damage, radius, upgrade scaling per ability
10. Draft Cards — Effect magnitudes for blueprint rewards
11. Visual Feedback — Screen shake, pop scale, timer warnings
12. UI/UX — Pan bounds, canvas sizes, connection styling
=========================================================================================
*/

// ============================================================================
// 1. VIEWPORT & GRID
// ============================================================================

export const VIEWPORT = {
  /** Game canvas width in pixels */
  WIDTH: 1200,
  /** Game canvas height in pixels */
  HEIGHT: 900,
  /** Size of one grid cell in pixels (4px = 300 cols across 1200px) */
  CELL_SIZE: 4,
  /** Grid columns (derived: WIDTH / CELL_SIZE) */
  GRID_COLS: 300,
  /** Grid rows for demolition area (400px / 4px = 100 rows) */
  GRID_ROWS: 100,
  /** Minimum Y row where structures can exist (leaves room for HUD) */
  MIN_GRID_Y: 4,
} as const;

// Derived constants (computed once, exported for convenience)
export const GRID_COLS = VIEWPORT.GRID_COLS;
export const GRID_ROWS = VIEWPORT.GRID_ROWS;
export const GRID_CELL_SIZE = VIEWPORT.CELL_SIZE;
export const VIEW_WIDTH = VIEWPORT.WIDTH;
export const VIEW_HEIGHT = VIEWPORT.HEIGHT;
export const MIN_GRID_Y = VIEWPORT.MIN_GRID_Y;

// ============================================================================
// 2. CONTRACT TIMER
// ============================================================================

export const CONTRACT_TIMER = {
  /** Seconds per contract day before auto-failure */
  INITIAL_SECONDS: 60.0,
  /** Timer warning threshold (seconds) — adds 'warning' CSS class */
  WARNING_THRESHOLD: 25,
  /** Timer critical threshold (seconds) — adds 'critical' CSS class */
  CRITICAL_THRESHOLD: 10,
  /** Display precision for HUD timer */
  DISPLAY_PRECISION: 1,
} as const;

// ============================================================================
// 3. BUDGET & PROGRESSION
// ============================================================================

export const PROGRESSION = {
  /** Starting contract layout budget (Day 1) */
  STARTING_BUDGET: 30,
  /** Budget growth formula: newBudget = round(oldBudget * MULTIPLIER + ADDEND) */
  BUDGET_MULTIPLIER: 1.4,
  BUDGET_ADDEND: 10,

  /** Difficulty equals current day number */
  DIFFICULTY_PER_DAY: 1,

  /** Maximum single building rank (building_library.json indices 0-15 = ranks 1-16) */
  MAX_BUILDING_RANK: 16,

  /** Tier progression */
  TIER_DIFFICULTY_MULTIPLIER: 1.8, // Applied when all frames in tier cleared

  /** Building layout horizontal gap between structures (grid cells) */
  BUILDING_GAP: 3,

  /** Tier color tints (layoutTier % 5) */
  TIER_TINTS: [
    0xffffff, // Tier 1: White
    0xa855f7, // Tier 2: Purple
    0xf59e0b, // Tier 3: Gold
    0x10b981, // Tier 4: Emerald
    0xef4444, // Tier 5: Red
  ],
} as const;

// ============================================================================
// 4. HAMMER / AUTO-SLEDGE
// ============================================================================

export const HAMMER = {
  /** Base damage per hit (before upgrade modifiers) */
  BASE_DAMAGE: 10,
  /** Base radius in grid cells (before upgrade modifiers) */
  BASE_RADIUS: 3,
  /** Base attack cooldown in seconds (before speed upgrades) */
  BASE_COOLDOWN: 1.0,
  /** Minimum cooldown floor (prevents zero/negative with high speed upgrades) */
  MIN_COOLDOWN: 0.1,
  /** Stroke width for cursor ring visual */
  CURSOR_STROKE_WIDTH: 1.5,

  /** Visual pop scale on impact */
  POP_SCALE_MAX: 1.3,
  /** Pop scale decay per second */
  POP_SCALE_DECAY: 3.0,
} as const;

// ============================================================================
// 5. SAND & PARTICLE PHYSICS
// ============================================================================

export const PARTICLE_PHYSICS = {
  /** Sand CA: Base decay timer for bottom-row sand (seconds) */
  SAND_DECAY_BASE: 0.5,
  /** Sand CA: Minimum decay timer (floor after plinkoSpeed modifier) */
  SAND_DECAY_MIN: 0.05,
  /** Plinko speed upgrade reduces decay by this amount per 0.1 upgrade value */
  PLINKO_SPEED_PER_UPGRADE: 0.1, // matches upgrades.ts plinkoSpeed effect

  /** Particle spawn: Initial velocity X spread */
  SPAWN_VELOCITY_X_SPREAD: 120,
  /** Particle spawn: Initial velocity Y base */
  SPAWN_VELOCITY_Y_BASE: 200,
  /** Particle spawn: Initial velocity Y random addition */
  SPAWN_VELOCITY_Y_RANDOM: 100,
  /** Particle physics radius (world pixels) */
  PARTICLE_RADIUS: 8,

  /** World coordinate conversion: grid cell -> world pixels */
  WORLD_PIXELS_PER_CELL: 4, // Must match VIEWPORT.CELL_SIZE
} as const;

// ============================================================================
// 6. PLINKO BOARD
// ============================================================================

export const PLINKO_BOARD = {
  /** Peg grid rows */
  PEG_ROWS: 9,
  /** Peg grid columns (alternating 11/10) */
  PEG_COLS: 11,
  /** Peg visual radius (base, before type scaling) */
  PEG_RADIUS: 6,
  /** Particle radius for collision (world pixels) */
  PARTICLE_RADIUS: 8,
  /** Spatial hash cell size for broad-phase collision */
  SPATIAL_CELL_SIZE: 50,

  /** Gravity acceleration (pixels/sec²) */
  GRAVITY: 550,

  /** Peg scale animation decay per second */
  PEG_SCALE_DECAY: 0.1,
  /** Peg bounce scale multiplier */
  PEG_BOUNCE_SCALE: 1.2,

  /** Wall bounce velocity retention */
  WALL_BOUNCE_DAMPING: 0.5,

  /** Material elasticity coefficients (velocity retention on peg bounce) */
  ELASTICITY: {
    CONCRETE: 0.20,
    GLASS: 0.45,
    COPPER: 0.85,
    WOOD: 0.60,  // Not used in code but defined for completeness
    CHAOS: 1.05,
  },

  /** Peg type visual radius multipliers */
  PEG_VISUAL_RADIUS: {
    NORMAL: 6,
    BOUNCER: 8,
    SPLITTER: 7,
    ALCHEMIST: 7,
    COMPOSITE: 9,
  },

  /** Peg level indicator outline bonus radius */
  PEG_LEVEL_OUTLINE_BONUS: 2,

  // --- Peg Behavior Effects ---

  /** NORMAL peg: value added per hit per level per multiplier */
  NORMAL_VALUE_PER_HIT: 1,

  /** BOUNCER peg: velocity boost magnitude base */
  BOUNCER_BOOST_BASE: 350,
  /** BOUNCER peg: velocity boost per level */
  BOUNCER_BOOST_PER_LEVEL: 30,
  /** BOUNCER peg: value added per hit per level per multiplier */
  BOUNCER_VALUE_PER_HIT: 3,

  /** SPLITTER peg: maximum recursive split depth */
  MAX_SPLIT_DEPTH: 3,
  /** SPLITTER peg: clone value = floor(parentValue / 2) */
  SPLITTER_VALUE_RATIO: 0.5,
  /** SPLITTER peg: clone velocity X multiplier */
  SPLITTER_CLONE_VX_MULT: -0.9,
  /** SPLITTER peg: clone velocity Y multiplier */
  SPLITTER_CLONE_VY_MULT: 1.0,

  /** ALCHEMIST peg: base transmutation chance */
  ALCHEMIST_TRANSMUTE_BASE_CHANCE: 0.05,
  /** ALCHEMIST peg: transmutation chance per level */
  ALCHEMIST_TRANSMUTE_PER_LEVEL: 0.01,
  /** ALCHEMIST peg: value multiplier on transmute */
  ALCHEMIST_TRANSMUTE_VALUE_MULT: 2,
  /** ALCHEMIST peg: value added per hit per level per multiplier */
  ALCHEMIST_VALUE_PER_HIT: 2,
} as const;

// ============================================================================
// 7. PIT SYSTEM
// ============================================================================

export const PIT_SYSTEM = {
  /** Number of collection pits across bottom */
  COUNT: 12,

  /** Pit base multiplier range: 1.0 + random(0 to MAX_BASE_BONUS) */
  BASE_MULTIPLIER_MIN: 1.0,
  BASE_MULTIPLIER_MAX: 1.5,

  /** Pit render: distance from bottom of view */
  BOTTOM_OFFSET: 40,
  /** Pit render: height */
  HEIGHT: 40,
  /** Pit render: divider wall width */
  DIVIDER_WIDTH: 2,

  /** Chaos pit: index chosen randomly each day */
  CHAOS_PIT_CHANCE: 1, // Always exactly 1 chaos pit per day

  // Specialization zone multipliers (material -> multiplier)
  // Zones: 0-3 = Concrete, 4-7 = Copper, 8-11 = Glass, Chaos = special
  SPECIALIZATION: {
    CONCRETE_ZONE: { // Pits 0-3
      CONCRETE: 3.5,
      GLASS: 0.2,
      COPPER: 1.0,
      WOOD: 1.0,
      CHAOS: 1.5,
    },
    COPPER_ZONE: { // Pits 4-7
      CONCRETE: 0.5,
      GLASS: 1.0,
      COPPER: 3.0,
      WOOD: 1.5,
      CHAOS: 1.5,
    },
    GLASS_ZONE: { // Pits 8-11
      CONCRETE: 0.2,
      GLASS: 4.5,
      COPPER: 0.5,
      WOOD: 1.5,
      CHAOS: 1.5,
    },
    CHAOS_PIT: { // Single random pit
      CONCRETE: 0.1,
      GLASS: 0.1,
      COPPER: 0.1,
      WOOD: 0.1,
      CHAOS: 10.0,
    },
  },

  /** Crit threshold for audio/UI feedback (total multiplier > this) */
  CRIT_MULTIPLIER_THRESHOLD: 1.5,
  /** Penalty threshold for audio/UI feedback (total multiplier < this) */
  PENALTY_MULTIPLIER_THRESHOLD: 0.5,
} as const;

// ============================================================================
// 8. STRUCTURAL INTEGRITY
// ============================================================================

export const STRUCTURAL_INTEGRITY = {
  /** Flood fill: scan bottom N rows for grounded static cells */
  GROUNDED_SCAN_ROWS: 12,
  /** Flood fill: horizontal neighbor range */
  HORIZONTAL_RANGE: 3,
  /** Flood fill: vertical neighbor offsets */
  VERTICAL_OFFSETS: [-1, 1],
  /** World coordinate conversion for collapse events */
  WORLD_PIXELS_PER_CELL: 4,
} as const;

// ============================================================================
// 9. ABILITIES
// ============================================================================

export const ABILITIES = {
  /** Global: cooldown reduction per upgrade level (not used yet, placeholder) */
  COOLDOWN_REDUCTION_PER_LEVEL: 0,

  WRECKING_BALL: {
    BASE_COOLDOWN: 30.0,
    BASE_RADIUS: 5,
    MULTI_BALL_RADIUS_BONUS: 3,
    BASE_DAMAGE: 50,
    DAMAGE_PER_LEVEL: 25,
    MULTI_BALL_COUNT: 2,
    MULTI_BALL_RADIUS: 3,
    MULTI_BALL_DAMAGE: 25,
    MULTI_BALL_OFFSET: 8,
    TARGETED_UNLOCK_LEVEL: 2,
    MULTI_BALL_UNLOCK_LEVEL: 3,
  },

  SEISMIC_SLAM: {
    BASE_COOLDOWN: 45.0,
    BASE_RADIUS: 8,
    RADIUS_PER_LEVEL: 2,
    BASE_DAMAGE: 30,
    DAMAGE_PER_LEVEL: 15,
  },

  GRAVITY_WELL: {
    BASE_COOLDOWN: 60.0,
    BASE_STRENGTH: 1.0,
    STRENGTH_PER_LEVEL: 0.5,
  },

  TIME_DILATION: {
    BASE_COOLDOWN: 90.0,
    BASE_DURATION: 5.0,
    DURATION_PER_LEVEL: 2.0,
    INTENSITY: 0.3, // 30% speed
  },
} as const;

// ============================================================================
// 10. DRAFT CARDS (Blueprint Rewards)
// ============================================================================

export const DRAFT_CARDS = {
  UPGRADE_NORMAL_PEGS: {
    COUNT: 3,
    LEVEL_BONUS: 1,
    MULTIPLIER_BONUS: 0.5,
  },
  ADD_BOUNCER_PEG: {
    COUNT: 2,
  },
  INCREASE_ALL_PITS: {
    COUNT: 3,
    BASE_MULTIPLIER_BONUS: 0.3,
  },
  CATALYST_ALCHEMIST: {
    COUNT: 1,
    TRANSMUTE_CHANCE_BONUS: 0.03, // +3%
  },
  DEMOTOOL_EFFICIENCY: {
    ADJACENT_DAMAGE_CHANCE: 0.10, // 10%
  },
  GLASS_AMPLIFIER: {
    VALUE_BONUS: 4,
  },
} as const;

// ============================================================================
// 11. VISUAL FEEDBACK (Juice)
// ============================================================================

export const VISUAL_FEEDBACK = {
  /** Screen shake: intensity applied on hammer hit */
  SHAKE_INTENSITY_ON_HIT: 4.0,
  /** Screen shake: decay per second */
  SHAKE_DECAY: 12.0,

  /** Visual pop scale on impact */
  POP_SCALE_MAX: 1.3,
  /** Pop scale decay per second */
  POP_SCALE_DECAY: 3.0,

  /** Particle removal: collected when Y >= viewHeight - this */
  PARTICLE_COLLECT_Y_THRESHOLD: 10,

  /** Contract completion check starts at this Y row */
  CONTRACT_CHECK_START_Y: 4,
} as const;

// ============================================================================
// 12. UI / UX
// ============================================================================

export const UI_UX = {
  /** Upgrade Tree: initial pan Y offset */
  UPGRADE_TREE_INITIAL_PAN_Y: 100,
  /** Upgrade Tree: pan bounds X */
  UPGRADE_TREE_PAN_X_MIN: -400,
  UPGRADE_TREE_PAN_X_MAX: 600,
  /** Upgrade Tree: pan bounds Y */
  UPGRADE_TREE_PAN_Y_MIN: -200,
  UPGRADE_TREE_PAN_Y_MAX: 450,
  /** Upgrade Tree: canvas dimensions */
  UPGRADE_TREE_CANVAS_WIDTH: 1000,
  UPGRADE_TREE_CANVAS_HEIGHT: 700,
  /** Upgrade Tree: node card dimensions for connection lines */
  UPGRADE_NODE_CARD_WIDTH: 60,
  UPGRADE_NODE_CARD_HEIGHT: 60,

  /** Connection line styling by state */
  CONNECTION_LINE: {
    PURCHASED: { width: 4, color: '#22d3ee', shadowBlur: 10 },
    AVAILABLE: { width: 3, color: '#f59e0b', shadowBlur: 6 },
    HIDDEN: { width: 2, color: '#334155', shadowBlur: 0, dash: [6, 4] },
  },
} as const;

// ============================================================================
// 13. SPRITE SHEET / ASSET LOADING
// ============================================================================

export const ASSETS = {
  /** Building sprite sheet cell size (pixels) */
  SPRITE_CELL_SIZE: 80,
  /** Alpha threshold for solid pixel detection (0-255) */
  ALPHA_SOLID_THRESHOLD: 128,
  /** Procedural structure initial X offset from center */
  PROCEDURAL_START_X_OFFSET: 40,
} as const;

// ============================================================================
// TYPE EXPORTS for TypeScript consumers
// ============================================================================

export type ViewportConfig = typeof VIEWPORT;
export type ContractTimerConfig = typeof CONTRACT_TIMER;
export type ProgressionConfig = typeof PROGRESSION;
export type HammerConfig = typeof HAMMER;
export type ParticlePhysicsConfig = typeof PARTICLE_PHYSICS;
export type PlinkoBoardConfig = typeof PLINKO_BOARD;
export type PitSystemConfig = typeof PIT_SYSTEM;
export type StructuralIntegrityConfig = typeof STRUCTURAL_INTEGRITY;
export type AbilitiesConfig = typeof ABILITIES;
export type DraftCardsConfig = typeof DRAFT_CARDS;
export type VisualFeedbackConfig = typeof VISUAL_FEEDBACK;
export type UiUxConfig = typeof UI_UX;
export type AssetsConfig = typeof ASSETS;
