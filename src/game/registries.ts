import {
  MatchResult,
  ModeId,
  ObstacleBumper,
  PersonalityId,
  PlayerStats,
} from './types';

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

export type PowerupId = 'big_mallet' | 'speed_boost' | 'freeze' | 'double_puck';

export interface PowerupEffectsState {
  malletScaleP: number;
  malletScaleA: number;
  puckSpeedMul: number;
  freezeP: boolean;
  freezeA: boolean;
  spawnExtraPuck: () => void;
  clearExtraPucks: () => void;
}

export interface PowerupDef {
  id: PowerupId;
  name: string;
  shortLabel: string;
  duration: number;
  color: string;
  apply: (collector: 'p' | 'a', state: PowerupEffectsState) => void;
  remove: (collector: 'p' | 'a', state: PowerupEffectsState) => void;
}

export const POWERUPS: Record<PowerupId, PowerupDef> = {
  big_mallet: {
    id: 'big_mallet',
    name: 'Big Mallet',
    shortLabel: 'BIG',
    duration: 6,
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
  speed_boost: {
    id: 'speed_boost',
    name: 'Speed Boost',
    shortLabel: 'FAST',
    duration: 4,
    color: '#f59e0b',
    apply: (_collector, state) => {
      state.puckSpeedMul = 1.3;
    },
    remove: (_collector, state) => {
      state.puckSpeedMul = 1;
    },
  },
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    shortLabel: 'ICE',
    duration: 2,
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
  double_puck: {
    id: 'double_puck',
    name: 'Double Puck',
    shortLabel: '2X',
    duration: 8,
    color: '#a855f7',
    apply: (_collector, state) => {
      state.spawnExtraPuck();
    },
    remove: (_collector, state) => {
      state.clearExtraPucks();
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

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  target?: number;
  progress?: (stats: PlayerStats) => number;
  check: (stats: PlayerStats, matchResult: MatchResult) => boolean;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_win',
    name: 'First Win',
    desc: 'Win your first match',
    target: 1,
    progress: (s) => Math.min(1, s.wins),
    check: (s) => s.wins >= 1,
  },
  {
    id: 'shutout',
    name: 'Shutout',
    desc: 'Win 7-0 or better without conceding',
    check: (_s, m) => m.hasOpponent && m.won && m.opponentScore === 0 && m.playerScore >= 7,
  },
  {
    id: 'streak_5',
    name: '5-Win Streak',
    desc: 'Win 5 matches in a row',
    target: 5,
    progress: (s) => Math.min(5, s.bestStreak),
    check: (s) => s.bestStreak >= 5,
  },
  {
    id: 'hits_100',
    name: '100 Total Hits',
    desc: 'Strike the puck 100 times across matches',
    target: 100,
    progress: (s) => Math.min(100, s.totalHits),
    check: (s) => s.totalHits >= 100,
  },
  {
    id: 'comeback',
    name: 'Comeback',
    desc: 'Win after trailing by 3 or more goals',
    check: (_s, m) => m.hasOpponent && m.won && m.maxDeficit >= 3,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    desc: 'Launch the puck at 1300+ speed',
    target: 1300,
    progress: (s) => Math.min(1300, Math.round(s.fastestPuck)),
    check: (s, m) => m.maxPuckSpeed >= 1300 || s.fastestPuck >= 1300,
  },
  {
    id: 'power_player',
    name: 'Power Player',
    desc: 'Collect 10 power-ups across matches',
    target: 10,
    progress: (s) => Math.min(10, s.powerupsCollected),
    check: (s) => s.powerupsCollected >= 10,
  },
  {
    id: 'giant_slayer',
    name: 'Giant Slayer',
    desc: 'Defeat the Hard Attacker bot',
    check: (_s, m) =>
      m.opponentType === 'ai' &&
      m.hasOpponent &&
      m.difficulty === 'hard' &&
      m.personality === 'attacker' &&
      m.won,
  },
];

export interface DailyChallengeDef {
  id: string;
  title: string;
  desc: string;
  target: number;
  reward: number;
  increment: (result: MatchResult) => number;
}

export const CHALLENGES: DailyChallengeDef[] = [
  {
    id: 'win_hard_3',
    title: 'Hard Challenger',
    desc: 'Win 3 matches on Hard difficulty',
    target: 3,
    reward: 30,
    increment: (m) => (m.opponentType === 'ai' && m.hasOpponent && m.difficulty === 'hard' && m.won ? 1 : 0),
  },
  {
    id: 'score_10',
    title: 'Goal Machine',
    desc: 'Score 10 goals in matches today',
    target: 10,
    reward: 30,
    increment: (m) => (m.hasOpponent ? m.playerScore : 0),
  },
  {
    id: 'shutout_1',
    title: 'Brick Wall',
    desc: 'Win a match with 0 goals conceded',
    target: 1,
    reward: 30,
    increment: (m) => (m.hasOpponent && m.won && m.opponentScore === 0 ? 1 : 0),
  },
  {
    id: 'powerups_5',
    title: 'Power Collector',
    desc: 'Collect 5 power-ups today',
    target: 5,
    reward: 30,
    increment: (m) => m.powerupsCollected,
  },
  {
    id: 'win_3',
    title: 'Hat Trick',
    desc: 'Win 3 matches today',
    target: 3,
    reward: 30,
    increment: (m) => (m.hasOpponent && m.won ? 1 : 0),
  },
];

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
