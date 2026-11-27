import {
  MatchResult,
  ModeId,
  ObstacleBumper,
  PersonalityId,
  PlayerStats,
} from './types';

// Single source of truth for achievement & daily-challenge data lives in ./task.ts
import {
  ACHIEVEMENTS,
  CHALLENGES,
  type AchievementDef,
  type DailyChallengeDef,
} from './task';
export {
  ACHIEVEMENTS,
  CHALLENGES,
  type AchievementDef,
  type DailyChallengeDef,
};

export interface ModeConfig {
  id: ModeId;
  name: string;
  desc: string;
  winCondition: 'score' | 'timed' | 'sudden_death' | 'practice';
  timeLimit: number | null;
  obstacles: string | null;
  opponent: boolean;
  powerups: boolean;
}

export const MODES: Record<ModeId, ModeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    desc: 'First to target score wins',
    winCondition: 'score',
    timeLimit: null,
    obstacles: null,
    opponent: true,
    powerups: true,
  },
  timed: {
    id: 'timed',
    name: 'Timed',
    desc: 'Most goals before time runs out',
    winCondition: 'timed',
    timeLimit: 120,
    obstacles: null,
    opponent: true,
    powerups: true,
  },
  sudden_death: {
    id: 'sudden_death',
    name: 'Sudden Death',
    desc: 'First goal wins immediately',
    winCondition: 'sudden_death',
    timeLimit: null,
    obstacles: null,
    opponent: true,
    powerups: true,
  },
  practice: {
    id: 'practice',
    name: 'Practice',
    desc: 'Solo rally, hit counter & streak',
    winCondition: 'practice',
    timeLimit: null,
    obstacles: null,
    opponent: false,
    powerups: false,
  },
  obstacles: {
    id: 'obstacles',
    name: 'Obstacle Table',
    desc: 'Symmetric bumpers on the ice',
    winCondition: 'score',
    timeLimit: null,
    obstacles: 'pillars',
    opponent: true,
    powerups: true,
  },
};

export interface ObstacleLayoutDef {
  id: string;
  name: string;
  bumpers: ObstacleBumper[];
}

export const OBSTACLE_LAYOUTS: Record<string, ObstacleLayoutDef> = {
  pillars: {
    id: 'pillars',
    name: 'Twin Pillars',
    bumpers: [
      { x: 116, y: 0.36, r: 20 },
      { x: 284, y: 0.36, r: 20 },
      { x: 116, y: 0.64, r: 20 },
      { x: 284, y: 0.64, r: 20 },
    ],
  },
  diamond: {
    id: 'diamond',
    name: 'Diamond',
    bumpers: [
      { x: 200, y: 0.31, r: 18 },
      { x: 106, y: 0.5, r: 18 },
      { x: 294, y: 0.5, r: 18 },
      { x: 200, y: 0.69, r: 18 },
    ],
  },
  gates: {
    id: 'gates',
    name: 'Side Gates',
    bumpers: [
      { x: 96, y: 0.28, r: 17 },
      { x: 304, y: 0.28, r: 17 },
      { x: 200, y: 0.5, r: 22 },
      { x: 96, y: 0.72, r: 17 },
      { x: 304, y: 0.72, r: 17 },
    ],
  },
  center_2: {
    id: 'center_2',
    name: 'Center Twin',
    bumpers: [
      { x: 120, y: 0.5, r: 20 },
      { x: 280, y: 0.5, r: 20 },
    ],
  },
  corners_4: {
    id: 'corners_4',
    name: 'Corner Guards',
    bumpers: [
      { x: 76, y: 0.24, r: 18 },
      { x: 324, y: 0.24, r: 18 },
      { x: 76, y: 0.76, r: 18 },
      { x: 324, y: 0.76, r: 18 },
    ],
  },
  staggered_4: {
    id: 'staggered_4',
    name: 'Pinball Alley',
    bumpers: [
      { x: 112, y: 0.34, r: 19 },
      { x: 288, y: 0.42, r: 19 },
      { x: 112, y: 0.58, r: 19 },
      { x: 288, y: 0.66, r: 19 },
    ],
  },
  fortress_2: {
    id: 'fortress_2',
    name: 'Fortress',
    bumpers: [
      { x: 200, y: 0.24, r: 26 },
      { x: 200, y: 0.76, r: 26 },
    ],
  },
  diamond_6: {
    id: 'diamond_6',
    name: 'Ricochet Diamond',
    bumpers: [
      { x: 200, y: 0.28, r: 17 },
      { x: 104, y: 0.42, r: 17 },
      { x: 296, y: 0.42, r: 17 },
      { x: 104, y: 0.58, r: 17 },
      { x: 296, y: 0.58, r: 17 },
      { x: 200, y: 0.72, r: 17 },
    ],
  },
  maze_6: {
    id: 'maze_6',
    name: 'Labyrinth',
    bumpers: [
      { x: 120, y: 0.3, r: 18 },
      { x: 280, y: 0.3, r: 18 },
      { x: 200, y: 0.44, r: 18 },
      { x: 200, y: 0.56, r: 18 },
      { x: 120, y: 0.7, r: 18 },
      { x: 280, y: 0.7, r: 18 },
    ],
  },
  titan_6: {
    id: 'titan_6',
    name: "Titan's Gate",
    bumpers: [
      { x: 94, y: 0.28, r: 19 },
      { x: 306, y: 0.28, r: 19 },
      { x: 200, y: 0.38, r: 20 },
      { x: 200, y: 0.62, r: 20 },
      { x: 94, y: 0.72, r: 19 },
      { x: 306, y: 0.72, r: 19 },
    ],
  },
  waist_4: {
    id: 'waist_4',
    name: 'Waist Sentinels',
    bumpers: [
      { x: 126, y: 0.38, r: 17 },
      { x: 274, y: 0.38, r: 17 },
      { x: 126, y: 0.62, r: 17 },
      { x: 274, y: 0.62, r: 17 },
    ],
  },
};

export { STAGES, WORLDS, getStageById } from './stages';
export {
  getTableSkin,
  SKINS,
  type TablePattern,
  type TableShape,
  type TableSkin,
} from './skins';

export type PowerupId =
  | 'goal_shield'
  | 'wide_goal'
  | 'big_mallet'
  | 'freeze'
  | 'fireball'
  | 'curve_shot'
  | 'multi_puck'
  | 'ghost_puck'
  | 'magnet'
  | 'slow_zone'
  | 'portals'
  | 'double_points';

export interface PowerupEffectsState {
  malletScaleP: number;
  malletScaleA: number;
  puckSpeedMul: number;
  freezeP: boolean;
  freezeA: boolean;
  goalShieldP: boolean;
  goalShieldA: boolean;
  wideGoalP: boolean;
  wideGoalA: boolean;
  fireballP: boolean;
  fireballA: boolean;
  curveShotP: boolean;
  curveShotA: boolean;
  ghostP: boolean;
  ghostA: boolean;
  magnetP: boolean;
  magnetA: boolean;
  slowZoneP: boolean;
  slowZoneA: boolean;
  portalsP: boolean;
  portalsA: boolean;
  doublePointsP: boolean;
  doublePointsA: boolean;
  spawnExtraPucks: (count: number) => void;
  clearExtraPucks: () => void;
}

export interface PowerupDef {
  id: PowerupId;
  name: string;
  shortLabel: string;
  duration: number;
  color: string;
  /** True when the effect is spent on use rather than only on a timer. */
  charge?: boolean;
  apply: (collector: 'p' | 'a', state: PowerupEffectsState) => void;
  remove: (collector: 'p' | 'a', state: PowerupEffectsState) => void;
}

export const POWERUPS: Record<PowerupId, PowerupDef> = {
  goal_shield: {
    id: 'goal_shield',
    name: 'Goal Shield',
    shortLabel: 'SHLD',
    duration: 8,
    color: '#22d3ee',
    charge: true,
    apply: (collector, state) => {
      if (collector === 'p') state.goalShieldP = true;
      else state.goalShieldA = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.goalShieldP = false;
      else state.goalShieldA = false;
    },
  },
  wide_goal: {
    id: 'wide_goal',
    name: 'Wide Goal',
    shortLabel: 'WIDE',
    duration: 6,
    color: '#f472b6',
    apply: (collector, state) => {
      if (collector === 'p') state.wideGoalP = true;
      else state.wideGoalA = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.wideGoalP = false;
      else state.wideGoalA = false;
    },
  },
  big_mallet: {
    id: 'big_mallet',
    name: 'Big Mallet',
    shortLabel: 'BIG',
    duration: 8,
    color: '#10b981',
    apply: (collector, state) => {
      if (collector === 'p') state.malletScaleP = 1.4;
      else state.malletScaleA = 1.4;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.malletScaleP = 1;
      else state.malletScaleA = 1;
    },
  },
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    shortLabel: 'ICE',
    duration: 1.5,
    color: '#38bdf8',
    apply: (collector, state) => {
      if (collector === 'p') state.freezeA = true;
      else state.freezeP = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.freezeA = false;
      else state.freezeP = false;
    },
  },
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    shortLabel: 'FIRE',
    duration: 12,
    color: '#ef4444',
    charge: true,
    apply: (collector, state) => {
      if (collector === 'p') state.fireballP = true;
      else state.fireballA = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.fireballP = false;
      else state.fireballA = false;
    },
  },
  curve_shot: {
    id: 'curve_shot',
    name: 'Curve Shot',
    shortLabel: 'CURVE',
    duration: 12,
    color: '#f59e0b',
    charge: true,
    apply: (collector, state) => {
      if (collector === 'p') state.curveShotP = true;
      else state.curveShotA = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.curveShotP = false;
      else state.curveShotA = false;
    },
  },
  multi_puck: {
    id: 'multi_puck',
    name: 'Multi-Puck',
    shortLabel: 'MULTI',
    duration: 30,
    color: '#a855f7',
    apply: (_collector, state) => {
      state.spawnExtraPucks(2);
    },
    remove: (_collector, state) => {
      state.clearExtraPucks();
    },
  },
  ghost_puck: {
    id: 'ghost_puck',
    name: 'Ghost Puck',
    shortLabel: 'GHOST',
    duration: 5,
    color: '#a78bfa',
    apply: (collector, state) => {
      if (collector === 'p') state.ghostP = true;
      else state.ghostA = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.ghostP = false;
      else state.ghostA = false;
    },
  },
  magnet: {
    id: 'magnet',
    name: 'Magnet',
    shortLabel: 'MAG',
    duration: 4,
    color: '#fbbf24',
    charge: true,
    apply: (collector, state) => {
      if (collector === 'p') state.magnetP = true;
      else state.magnetA = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.magnetP = false;
      else state.magnetA = false;
    },
  },
  slow_zone: {
    id: 'slow_zone',
    name: 'Slow Zone',
    shortLabel: 'SLOW',
    duration: 6,
    color: '#60a5fa',
    apply: (collector, state) => {
      if (collector === 'p') state.slowZoneP = true;
      else state.slowZoneA = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.slowZoneP = false;
      else state.slowZoneA = false;
    },
  },
  portals: {
    id: 'portals',
    name: 'Portals',
    shortLabel: 'PORT',
    duration: 8,
    color: '#34d399',
    apply: (collector, state) => {
      if (collector === 'p') state.portalsP = true;
      else state.portalsA = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.portalsP = false;
      else state.portalsA = false;
    },
  },
  double_points: {
    id: 'double_points',
    name: 'Double Points',
    shortLabel: '2X',
    duration: 30,
    color: '#facc15',
    apply: (collector, state) => {
      if (collector === 'p') state.doublePointsP = true;
      else state.doublePointsA = true;
    },
    remove: (collector, state) => {
      if (collector === 'p') state.doublePointsP = false;
      else state.doublePointsA = false;
    },
  },
};

export interface PersonalityConfig {
  id: PersonalityId;
  name: string;
  desc: string;
  attackBias: number;
  defY: number;
  aimStyle: 'direct' | 'clear' | 'aggressive' | 'bank';
  spread: number;
  trackSpeed: number;
}

export const PERSONALITIES: Record<PersonalityId, PersonalityConfig> = {
  balanced: {
    id: 'balanced',
    name: 'Balanced',
    desc: 'Adapts cleanly between attack and defense',
    attackBias: 1.0,
    defY: 96,
    aimStyle: 'direct',
    spread: 1.0,
    trackSpeed: 1.0,
  },
  defender: {
    id: 'defender',
    name: 'Defender',
    desc: 'Guards the crease with strong prediction',
    attackBias: 0.45,
    defY: 68,
    aimStyle: 'clear',
    spread: 0.7,
    trackSpeed: 1.35,
  },
  attacker: {
    id: 'attacker',
    name: 'Attacker',
    desc: 'Pressures forward and strikes relentlessly',
    attackBias: 1.45,
    defY: 162,
    aimStyle: 'aggressive',
    spread: 0.85,
    trackSpeed: 0.82,
  },
  trickster: {
    id: 'trickster',
    name: 'Trickster',
    desc: 'Banks off side rails with feints and angles',
    attackBias: 1.12,
    defY: 112,
    aimStyle: 'bank',
    spread: 1.55,
    trackSpeed: 1.05,
  },
};





export function getLocalDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getDailyChallengeForDate(dateKey: string): DailyChallengeDef {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % CHALLENGES.length;
  return CHALLENGES[idx];
}

function pickDeterministicChallenges(
  seedKey: string,
  pool: DailyChallengeDef[],
  count: number
): DailyChallengeDef[] {
  let seed = 0;
  for (let i = 0; i < seedKey.length; i++) {
    seed = (seed * 31 + seedKey.charCodeAt(i)) | 0;
  }
  seed = Math.abs(seed) || 1;
  const used = new Set<number>();
  const picked: DailyChallengeDef[] = [];
  const wanted = Math.min(count, pool.length);
  while (picked.length < wanted && used.size < pool.length) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    const idx = seed % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    picked.push(pool[idx]);
  }
  return picked;
}

export function getDailyTasksForDate(dateKey: string, count = 3): DailyChallengeDef[] {
  return pickDeterministicChallenges(dateKey, CHALLENGES, count);
}

/**
 * Pick brand-new daily tasks for completed slots on a new day.
 * Never returns a task whose id is in `excludeIds` (tasks still in a slot or
 * the ones being replaced). When `avoidIds` (the current cycle's completed
 * history) covers the whole pool, the cycle restarts from the top.
 */
export function pickDailyTaskReplacements(
  count: number,
  excludeIds: string[],
  seedKey: string,
  avoidIds: string[] = []
): { tasks: DailyChallengeDef[]; resetCycle: boolean } {
  const exclude = new Set(excludeIds);
  const avoid = new Set(avoidIds);
  const fresh = CHALLENGES.filter((c) => !exclude.has(c.id) && !avoid.has(c.id));
  if (fresh.length >= count) {
    return {
      tasks: pickDeterministicChallenges(seedKey, fresh, count),
      resetCycle: false,
    };
  }
  // Every available task has been used this cycle — restart from the top.
  const restart = CHALLENGES.filter((c) => !exclude.has(c.id));
  return {
    tasks: pickDeterministicChallenges(seedKey, restart, Math.min(count, restart.length)),
    resetCycle: true,
  };
}