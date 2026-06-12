# Demolinko — Task Ledger (Cron Agent Updates This Each Tick)

## Legend
- ✅ = Done (verified, build passes)
- 🔄 = In Progress (started this tick)
- ⏳ = Pending (queued or blocked)
- ❌ = Failed/Reverted (with reason)

---

## Completed
| Task | Commit | Tick | Notes |
|------|--------|------|-------|
| Fix payout system (pit multipliers) | `2e94bfc` → `2cc68f2` | 13:03–14:59 | Hardcoded `finalPayout=1` → proper `particle.value * pit.baseMultiplier * materialMultiplier` |
| Fix 10× inflated upgrade costs | `e575497` | 14:56 | All 15 nodes divided by 10 |
| Remove forced upgrade purchase blocker | `0cb6591` | 13:42 | "Start Next Day" always enabled, shows hint |
| **1f**: Fix contract scaling bug (>16) | `88200a2` | 16:18 | Replaced random partition with deterministic greedy algorithm (max rank 16 + remainder) |
| **1a**: Mock Audio System | `tick-20260612-1754` | 17:54 | New `AudioManager.ts` singleton with typed events, debug logging, volume controls; hooked into 13 game events |
| **1b**: Pixel Collapse Detection | `tick-20260612-1754` | 17:54 | `PIXEL_COLLAPSE` EventBus event emitted from `damageCell` (hammer) and `runStructuralIntegrityPass` (natural); audio event also emitted |

---

## In Progress
| Task | Started | Status |
|------|---------|--------|
| *(none currently)* | — | — |

---

## Pending (Priority Order — Cron Picks Top Unblocked ⏳)
| Task | Priority | Blocked By | Notes |
|------|----------|------------|-------|
| **1c**: Ability Framework + Wrecking Ball | P2 | 1a, 1d | `AbilityManager`, cooldowns, keyboard (1-4), upgrade tree integration |
| **1d**: Abilities Panel UI (right side) | P2 | 1c | Persistent panel, cooldown display, key hints |
| **1e**: Wider View (5 buildings) | P3 | — | `VIEW_WIDTH` in `constants.ts`, layout packing, CSS |
| **2a**: Balance Config (`balance.ts`) | P4 | — | Extract all magic numbers from engine files |
| **2b**: Decompose God Files | P4 | 2a | `PhysicsOrchestrator`, `ProgressionOrchestrator`, `UIOrchestrator` |

---

## Archived / Deferred
| Task | Reason |
|------|--------|
| — | — |

---

## Cron Agent Protocol (Internal — Do Not Edit)
1. **Tick Start**: Read `DEMOLINKO_GOALS.md` + `DEMOLINKO_TASKS.md`
2. **Pick**: First unblocked `⏳` in Pending table (top to bottom)
3. **Work**: Investigate → minimal fix → `npm run build` ✅ → commit → push
4. **Update Ledger**: Move task to ✅ (with commit) or 🔄/❌ (with reason)
5. **If Pending Empty (all ✅)**:
   - Full codebase scan (`src/**/*.ts`, `src/**/*.json`)
   - Compare to Design Pillars in GOALS.md
   - Identify gaps (crash risks, feel, progression, polish, retention)
   - Append 3–5 new `⏳` rows to Pending table
   - (Optional) Suggest GOALS.md additions via comment in ledger
6. **Write**: Updated `DEMOLINKO_TASKS.md` before commit