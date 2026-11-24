export const APP_VERSION = '2.0.0';

export type Screen =
  | 'home'
  | 'stages'
  | 'modes'
  | 'skins'
  | 'stats'
  | 'achievements'
  | 'settings'
  | 'howto'
  | 'game'
  | 'pause'
  | 'over';

export type GamePhase = 'ready' | 'play' | 'goal' | 'slowmo';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type PersonalityId = 'balanced' | 'defender' | 'attacker' | 'trickster';
export type StagePersonalityId =
  | PersonalityId
  | 'adaptive_grandmaster'
  | 'adaptive_eternal'
  | 'adaptive_stadium'
  | 'adaptive_architect'
  | 'adaptive_immortal';
export type GameMode = 'ai' | 'two';
export type ModeId = 'classic' | 'timed' | 'sudden_death' | 'practice' | 'obstacles';
export type Scorer = 'p' | 'a';
export type WorldId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export type WinScoreOption = 3 | 5 | 7 | 11;
export type MalletOffsetOption = 'off' | 'small' | 'large';
export type PuckSpeedOption = 'normal' | 'fast';
export type MalletControlOption = 'follow' | 'relative';
export type QualityOption = 'auto' | 'high' | 'low';
export type GoalSlowMoOption = 'winning' | 'all' | 'off';
export type FpsCapOption = 60 | 120;

export interface GameSettings {
  sfxEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number;
  winScore: WinScoreOption;
  defaultDifficulty: Difficulty;
  defaultPersonality: PersonalityId;
  malletOffset: MalletOffsetOption;
  puckSpeed: PuckSpeedOption;
  malletControl: MalletControlOption;
  powerupsEnabled: boolean;
  goalSlowMo: GoalSlowMoOption;
  vibration: boolean;
  screenShake: boolean;
  puckTrail: boolean;
  showFps: boolean;
  reduceMotion: boolean;
  quality: QualityOption;
  fpsCap: FpsCapOption;
  tableSkin: string;
  puckSkin: string;
  malletSkin: string;
}

export const DEFAULT_SETTINGS: GameSettings = {
  sfxEnabled: true,
  musicEnabled: false,
  masterVolume: 80,
  winScore: 7,
  defaultDifficulty: 'medium',
  defaultPersonality: 'balanced',
  malletOffset: 'small',
  puckSpeed: 'normal',
  malletControl: 'follow',
  powerupsEnabled: true,
  goalSlowMo: 'winning',
  vibration: true,
  screenShake: true,
  puckTrail: true,
  showFps: false,
  reduceMotion: true,
  quality: 'auto',
  fpsCap: 60,
  tableSkin: 'classic_ice',
  puckSkin: 'classic',
  malletSkin: 'classic',
};

export interface Score {
  p: number;
  a: number;
}

export interface PlayerStats {
  totalMatches: number;
  wins: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  fastestPuck: number;
  longestRally: number;
  totalHits: number;
  currentStreak: number;
  bestStreak: number;
  powerupsCollected: number;
  playtime: number;
}

export interface MatchHistoryItem {
  date: string;
  modeId: ModeId;
  opponent: GameMode;
  difficulty: Difficulty;
  personality: PersonalityId;
  score: Score;
  result: 'win' | 'loss';
  duration: number;
  stageId?: number;
}

export interface DailyProgress {
  date: string;
  challengeId: string;
  progress: number;
  completed: boolean;
  rewardClaimed: boolean;
}

export interface DailyTaskProgress {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface DailyTasksState {
  date: string;
  tasks: DailyTaskProgress[];
}

export interface UnlocksState {
  table: string[];
  puck: string[];
  mallet: string[];
}

export type StageStarCount = 0 | 1 | 2 | 3;

export interface StageProgress {
  unlocked: boolean;
  stars: StageStarCount;
  bestMargin: number;
}

export interface SaveDataV3 {
  v: 3;
  settings: GameSettings;
  stats: PlayerStats;
  history: MatchHistoryItem[];
  coins: number;
  unlocks: UnlocksState;
  achievements: Record<string, string>;
  daily: DailyProgress;
  dailyTasks: DailyTasksState;
  stages: Record<number, StageProgress>;
  tutorialCompleted: boolean;
  lastCrateClaimAt: number;
  dailyLoginStreak: number;
  lastCrateDate: string;
  grandChampionBadge?: boolean;
  legend100Badge?: boolean;
}

// Keep alias so existing imports remain compatible
export type SaveDataV2 = SaveDataV3;

export interface StageSkinOverride {
  table: string;
  puck: string;
  botMallet: string;
}

export interface StageConfig {
  id: number;
  world: WorldId;
  name: string;
  twist: string;
  isBoss?: boolean;
  difficulty: Difficulty;
  personality: StagePersonalityId;
  winCondition: 'score' | 'timed' | 'sudden_death';
  winScore: number;
  timeLimit: number | null;
  obstacleLayoutId: string | null;
  powerups: boolean;
  puckSpeedMult: number;
  botMalletMult: number;
  alwaysDoublePuck?: boolean;
  matchPointDoublePuck?: boolean;
  doublePuckAtScore?: number;
  skinOverride: StageSkinOverride;
  twoStarMaxConceded: number;
  coinReward: number;
  alreadyOwnedBonusPerItem?: number;
  grantsGrandChampionBadge?: boolean;
  grantsLegend100Badge?: boolean;
  unlockRewards?: Array<{ category: 'table' | 'puck' | 'mallet'; id: string; name: string }>;
}

export interface MatchResult {
  modeId: ModeId;
  opponentType: GameMode;
  hasOpponent: boolean;
  difficulty: Difficulty;
  personality: PersonalityId;
  playerScore: number;
  opponentScore: number;
  won: boolean;
  duration: number;
  hits: number;
  longestRally: number;
  maxPuckSpeed: number;
  maxDeficit: number;
  powerupsCollected: number;
  stageId?: number;
  continuesUsed?: number;
}

export interface CoinBreakdown {
  base: number;
  goals: number;
  shutout: number;
  achievements: number;
  daily: number;
  total: number;
}

export interface StageOutcomeSummary {
  stageId: number;
  stageName: string;
  starsEarned: StageStarCount;
  previousStars: StageStarCount;
  isFirstClear: boolean;
  nextStageId: number | null;
  nextStageUnlocked: boolean;
  starRequirementNote?: string;
  usedContinue: boolean;
  continuesUsed: number;
  duplicateRewardBonusCoins?: number;
  grandChampionUnlocked?: boolean;
  legend100Unlocked?: boolean;
}

export interface MatchSummary {
  result: MatchResult;
  coins: CoinBreakdown;
  newAchievements: string[];
  newSkins: Array<{ category: 'table' | 'puck' | 'mallet'; id: string; name: string }>;
  dailyCompletedNow: boolean;
  stageOutcome?: StageOutcomeSummary;
}

export interface DifficultyConfig {
  speed: number;
  track: number;
  spread: number;
}

export const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  easy: { speed: 460, track: 6, spread: 80 },
  medium: { speed: 700, track: 10, spread: 44 },
  hard: { speed: 960, track: 15, spread: 18 },
};

export interface ObstacleBumper {
  x: number;
  y: number;
  r: number;
}

export interface PuckState {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  spinAngle: number;
  pinchStepsP: number;
  pinchStepsA: number;
  lastHitter: Scorer | null;
  trail: Array<{ x: number; y: number }>;
}
