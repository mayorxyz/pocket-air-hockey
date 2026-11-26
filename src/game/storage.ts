import {
  CHALLENGES,
  getDailyChallengeForDate,
  getDailyTasksForDate,
  getLocalDateKey,
  getNextDailyTasksBatch,
  STAGES,
} from './registries';
import { SKINS } from './skins';
import {
  DailyProgress,
  DailyTasksState,
  DEFAULT_SETTINGS,
  Difficulty,
  GameMode,
  GameSettings,
  MatchHistoryItem,
  ModeId,
  PersonalityId,
  PlayerStats,
  SaveDataV3,
  StageProgress,
  StageStarCount,
  UnlocksState,
} from './types';

const SAVE_KEY = 'ah_save';
const BACKUP_KEY = 'ah_save_backup';
const LEGACY_KEYS = ['ah_diff', 'ah_mode', 'ah_muted', 'ah_stats', 'ah_settings'];

export const EMPTY_STATS: PlayerStats = {
  totalMatches: 0,
  wins: 0,
  losses: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  fastestPuck: 0,
  longestRally: 0,
  totalHits: 0,
  currentStreak: 0,
  bestStreak: 0,
  powerupsCollected: 0,
  playtime: 0,
};

function createStarterUnlocks(): UnlocksState {
  return {
    table: Object.values(SKINS.table)
      .filter((s) => !s.locked)
      .map((s) => s.id),
    puck: Object.values(SKINS.puck)
      .filter((s) => !s.locked)
      .map((s) => s.id),
    mallet: Object.values(SKINS.mallet)
      .filter((s) => !s.locked)
      .map((s) => s.id),
  };
}

export function createDefaultStages(): Record<number, StageProgress> {
  const out: Record<number, StageProgress> = {};
  for (const s of STAGES) {
    out[s.id] = {
      unlocked: s.id === 1,
      stars: 0,
      bestMargin: 0,
    };
  }
  return out;
}

export function createFreshDaily(dateKey = getLocalDateKey()): DailyProgress {
  const ch = getDailyChallengeForDate(dateKey);
  return {
    date: dateKey,
    challengeId: ch.id,
    progress: 0,
    completed: false,
    rewardClaimed: false,
  };
}

export function createFreshDailyTasks(dateKey = getLocalDateKey()): DailyTasksState {
  return {
    date: dateKey,
    round: 0,
    completedIds: [],
    tasks: getDailyTasksForDate(dateKey).map((t) => ({
      id: t.id,
      progress: 0,
      claimed: false,
    })),
  };
}

export function createDefaultSave(): SaveDataV3 {
  return {
    v: 3,
    settings: { ...DEFAULT_SETTINGS },
    stats: { ...EMPTY_STATS },
    history: [],
    coins: 0,
    unlocks: createStarterUnlocks(),
    achievements: {},
    daily: createFreshDaily(),
    dailyTasks: createFreshDailyTasks(),
    stages: createDefaultStages(),
    tutorialCompleted: false,
    lastCrateClaimAt: 0,
    dailyLoginStreak: 0,
    lastCrateDate: '',
    grandChampionBadge: false,
    legend100Badge: false,
  };
}

const clampNum = (v: unknown, min: number, max: number, fallback: number): number => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, v));
};

function sanitizeSettings(raw: unknown): GameSettings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<GameSettings>;
  return {
    sfxEnabled: typeof r.sfxEnabled === 'boolean' ? r.sfxEnabled : DEFAULT_SETTINGS.sfxEnabled,
    musicEnabled:
      typeof r.musicEnabled === 'boolean' ? r.musicEnabled : DEFAULT_SETTINGS.musicEnabled,
    masterVolume: Math.round(clampNum(r.masterVolume, 0, 100, DEFAULT_SETTINGS.masterVolume)),
    winScore: [3, 5, 7, 11].includes(Number(r.winScore))
      ? (Number(r.winScore) as GameSettings['winScore'])
      : DEFAULT_SETTINGS.winScore,
    defaultDifficulty:
      r.defaultDifficulty === 'easy' ||
      r.defaultDifficulty === 'medium' ||
      r.defaultDifficulty === 'hard'
        ? r.defaultDifficulty
        : DEFAULT_SETTINGS.defaultDifficulty,
    defaultPersonality:
      r.defaultPersonality === 'balanced' ||
      r.defaultPersonality === 'defender' ||
      r.defaultPersonality === 'attacker' ||
      r.defaultPersonality === 'trickster'
        ? r.defaultPersonality
        : DEFAULT_SETTINGS.defaultPersonality,
    malletOffset:
      r.malletOffset === 'off' || r.malletOffset === 'small' || r.malletOffset === 'large'
        ? r.malletOffset
        : DEFAULT_SETTINGS.malletOffset,
    puckSpeed:
      r.puckSpeed === 'normal' || r.puckSpeed === 'fast'
        ? r.puckSpeed
        : DEFAULT_SETTINGS.puckSpeed,
    malletControl:
      r.malletControl === 'follow' || r.malletControl === 'relative'
        ? r.malletControl
        : DEFAULT_SETTINGS.malletControl,
    powerupsEnabled:
      typeof r.powerupsEnabled === 'boolean'
        ? r.powerupsEnabled
        : DEFAULT_SETTINGS.powerupsEnabled,
    goalSlowMo:
      r.goalSlowMo === 'winning' || r.goalSlowMo === 'all' || r.goalSlowMo === 'off'
        ? r.goalSlowMo
        : DEFAULT_SETTINGS.goalSlowMo,
    vibration: typeof r.vibration === 'boolean' ? r.vibration : DEFAULT_SETTINGS.vibration,
    screenShake:
      typeof r.screenShake === 'boolean' ? r.screenShake : DEFAULT_SETTINGS.screenShake,
    puckTrail: typeof r.puckTrail === 'boolean' ? r.puckTrail : DEFAULT_SETTINGS.puckTrail,
    showFps: typeof r.showFps === 'boolean' ? r.showFps : DEFAULT_SETTINGS.showFps,
    reduceMotion:
      typeof r.reduceMotion === 'boolean' ? r.reduceMotion : DEFAULT_SETTINGS.reduceMotion,
    quality:
      r.quality === 'auto' || r.quality === 'high' || r.quality === 'low'
        ? r.quality
        : DEFAULT_SETTINGS.quality,
    fpsCap: Number(r.fpsCap) === 120 ? 120 : 60,
    tableSkin:
      typeof r.tableSkin === 'string' && SKINS.table[r.tableSkin]
        ? r.tableSkin
        : DEFAULT_SETTINGS.tableSkin,
    puckSkin:
      typeof r.puckSkin === 'string' && SKINS.puck[r.puckSkin]
        ? r.puckSkin
        : DEFAULT_SETTINGS.puckSkin,
    malletSkin:
      typeof r.malletSkin === 'string' && SKINS.mallet[r.malletSkin]
        ? r.malletSkin
        : DEFAULT_SETTINGS.malletSkin,
  };
}

function sanitizeStats(raw: unknown): PlayerStats {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<PlayerStats> & {
    w?: number;
    l?: number;
    streak?: number;
    best?: number;
  };
  const wins = Math.round(clampNum(r.wins ?? r.w, 0, 1_000_000, 0));
  const losses = Math.round(clampNum(r.losses ?? r.l, 0, 1_000_000, 0));
  const currentStreak = Math.round(clampNum(r.currentStreak ?? r.streak, 0, 1_000_000, 0));
  const bestStreak = Math.max(
    currentStreak,
    Math.round(clampNum(r.bestStreak ?? r.best, 0, 1_000_000, 0))
  );
  return {
    totalMatches: Math.max(
      wins + losses,
      Math.round(clampNum(r.totalMatches, 0, 2_000_000, wins + losses))
    ),
    wins,
    losses,
    goalsFor: Math.round(clampNum(r.goalsFor, 0, 10_000_000, 0)),
    goalsAgainst: Math.round(clampNum(r.goalsAgainst, 0, 10_000_000, 0)),
    fastestPuck: Math.round(clampNum(r.fastestPuck, 0, 5000, 0)),
    longestRally: Math.round(clampNum(r.longestRally, 0, 100_000, 0)),
    totalHits: Math.round(clampNum(r.totalHits, 0, 50_000_000, 0)),
    currentStreak,
    bestStreak,
    powerupsCollected: Math.round(clampNum(r.powerupsCollected, 0, 1_000_000, 0)),
    playtime: Math.round(clampNum(r.playtime, 0, 100_000_000, 0)),
  };
}

function sanitizeHistory(raw: unknown): MatchHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const validModes: ModeId[] = ['classic', 'timed', 'sudden_death', 'practice', 'obstacles'];
  const validDiffs: Difficulty[] = ['easy', 'medium', 'hard'];
  const validPers: PersonalityId[] = ['balanced', 'defender', 'attacker', 'trickster'];

  const out: MatchHistoryItem[] = [];
  for (const item of raw.slice(0, 20)) {
    if (!item || typeof item !== 'object') continue;
    const h = item as Partial<MatchHistoryItem>;
    const scoreObj =
      h.score && typeof h.score === 'object'
        ? {
            p: Math.round(clampNum(h.score.p, 0, 999, 0)),
            a: Math.round(clampNum(h.score.a, 0, 999, 0)),
          }
        : { p: 0, a: 0 };

    out.push({
      date: typeof h.date === 'string' ? h.date : new Date().toISOString(),
      modeId: validModes.includes(h.modeId as ModeId) ? (h.modeId as ModeId) : 'classic',
      opponent: h.opponent === 'two' ? 'two' : 'ai',
      difficulty: validDiffs.includes(h.difficulty as Difficulty)
        ? (h.difficulty as Difficulty)
        : 'medium',
      personality: validPers.includes(h.personality as PersonalityId)
        ? (h.personality as PersonalityId)
        : 'balanced',
      score: scoreObj,
      result: h.result === 'win' ? 'win' : 'loss',
      duration: Math.round(clampNum(h.duration, 0, 86400, 0)),
      ...(typeof h.stageId === 'number' && h.stageId >= 1 && h.stageId <= STAGES.length
        ? { stageId: Math.round(h.stageId) }
        : {}),
    });
  }
  return out;
}

function sanitizeUnlocks(raw: unknown, prevVersion: number): UnlocksState {
  const starter = createStarterUnlocks();
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<UnlocksState>;
  const merge = (arr: unknown, base: string[], registry: Record<string, unknown>): string[] => {
    const set = new Set<string>(base);
    if (Array.isArray(arr)) {
      for (const id of arr) {
        if (typeof id === 'string' && registry[id]) set.add(id);
      }
    }
    return Array.from(set);
  };
  const unlocks: UnlocksState = {
    table: merge(r.table, starter.table, SKINS.table),
    puck: merge(r.puck, starter.puck, SKINS.puck),
    mallet: merge(r.mallet, starter.mallet, SKINS.mallet),
  };

  // Preserve previously unlocked v2 skins if upgrading from v2
  if (prevVersion === 2 && r.table === undefined) {
    unlocks.table.push('night_neon', 'wood_arcade');
  }
  return unlocks;
}

function sanitizeAchievements(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string') out[k] = v;
  }
  return out;
}

function sanitizeStages(raw: unknown): Record<number, StageProgress> {
  const out = createDefaultStages();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const r = raw as Record<string, unknown>;
  for (const s of STAGES) {
    const entry = r[String(s.id)];
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Partial<StageProgress>;
    const starsNum = Math.round(clampNum(e.stars, 0, 3, 0)) as StageStarCount;
    out[s.id] = {
      unlocked: s.id === 1 ? true : Boolean(e.unlocked),
      stars: starsNum,
      bestMargin: Math.round(clampNum(e.bestMargin, -99, 99, 0)),
    };
  }
  out[1].unlocked = true;
  // Backfill next-stage unlock when existing 30-stage saves already cleared a world boss
  for (const s of STAGES) {
    if (s.id < STAGES.length && out[s.id]?.stars >= 1 && out[s.id + 1]) {
      out[s.id + 1].unlocked = true;
    }
  }
  return out;
}

export function ensureDailyFresh(daily: DailyProgress): DailyProgress {
  const today = getLocalDateKey();
  const expected = getDailyChallengeForDate(today);
  if (daily.date === today && daily.challengeId === expected.id) {
    return daily;
  }
  return createFreshDaily(today);
}

function sanitizeDaily(raw: unknown): DailyProgress {
  const today = getLocalDateKey();
  const expected = getDailyChallengeForDate(today);
  if (!raw || typeof raw !== 'object') return createFreshDaily(today);
  const r = raw as Partial<DailyProgress>;
  if (r.date !== today || r.challengeId !== expected.id) {
    return createFreshDaily(today);
  }
  const progress = Math.round(clampNum(r.progress, 0, expected.target, 0));
  const completed = Boolean(r.completed) || progress >= expected.target;
  return {
    date: today,
    challengeId: expected.id,
    progress,
    completed,
    rewardClaimed: Boolean(r.rewardClaimed),
  };
}

export function ensureDailyTasksFresh(tasks: DailyTasksState): DailyTasksState {
  const today = getLocalDateKey();
  if (tasks && tasks.date === today && Array.isArray(tasks.tasks) && tasks.tasks.length > 0) {
    const validIds = new Set(CHALLENGES.map((c) => c.id));
    const allValid = tasks.tasks.every((t) => t && validIds.has(t.id));
    if (allValid) {
      if (tasks.tasks.every((t) => t.claimed)) {
        const nextRound = (tasks.round ?? 0) + 1;
        const lastBatchIds = tasks.tasks.map((t) => t.id);
        const mergedCompleted = Array.from(
          new Set([...(tasks.completedIds ?? []), ...lastBatchIds])
        );
        const { tasks: nextDefs, resetCompleted } = getNextDailyTasksBatch(
          today,
          3,
          nextRound,
          mergedCompleted,
          lastBatchIds
        );
        return {
          date: today,
          round: nextRound,
          completedIds: resetCompleted ? [] : mergedCompleted,
          tasks: nextDefs.map((d) => ({ id: d.id, progress: 0, claimed: false })),
        };
      }
      return tasks;
    }
  }
  return createFreshDailyTasks(today);
}

function sanitizeDailyTasks(raw: unknown): DailyTasksState {
  const today = getLocalDateKey();
  if (!raw || typeof raw !== 'object') return createFreshDailyTasks(today);
  const r = raw as Partial<DailyTasksState>;
  if (r.date !== today || !Array.isArray(r.tasks) || r.tasks.length === 0) {
    return createFreshDailyTasks(today);
  }

  const byId = new Map(CHALLENGES.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const tasks = r.tasks.flatMap((t) => {
    if (!t || typeof t.id !== 'string' || seen.has(t.id)) return [];
    const def = byId.get(t.id);
    if (!def) return [];
    seen.add(t.id);
    const progress = Math.round(clampNum(t.progress, 0, def.target, 0));
    return [
      {
        id: def.id,
        progress,
        claimed: Boolean(t.claimed) && progress >= def.target,
      },
    ];
  });

  if (tasks.length === 0) return createFreshDailyTasks(today);

  const round = Math.round(clampNum(r.round, 0, 1_000_000, 0));
  const completedIds = Array.isArray(r.completedIds)
    ? Array.from(new Set(r.completedIds.filter((id): id is string => typeof id === 'string' && byId.has(id))))
    : [];

  return ensureDailyTasksFresh({ date: today, round, completedIds, tasks });
}

function migrate1to2(raw: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw,
    v: 2,
  };
}

function migrate2to3(raw: Record<string, unknown>, prevVersion: number): SaveDataV3 {
  const base = createDefaultSave();
  const settings = sanitizeSettings(raw.settings);
  const unlocks = sanitizeUnlocks(raw.unlocks, prevVersion);

  // If upgrading from v2 where night_neon / wood_arcade / gold were previously open, keep player's equipped skin valid
  if (prevVersion < 3) {
    if (SKINS.table[settings.tableSkin] && !unlocks.table.includes(settings.tableSkin)) {
      unlocks.table.push(settings.tableSkin);
    }
    if (SKINS.puck[settings.puckSkin] && !unlocks.puck.includes(settings.puckSkin)) {
      unlocks.puck.push(settings.puckSkin);
    }
    if (SKINS.mallet[settings.malletSkin] && !unlocks.mallet.includes(settings.malletSkin)) {
      unlocks.mallet.push(settings.malletSkin);
    }
  }

  const stats = sanitizeStats(raw.stats);
  const tutorialCompleted =
    typeof raw.tutorialCompleted === 'boolean'
      ? raw.tutorialCompleted
      : stats.totalMatches > 0;
  const lastCrateClaimAt = Math.round(clampNum(raw.lastCrateClaimAt, 0, 9_999_999_999_999, 0));
  const dailyLoginStreak = Math.round(clampNum(raw.dailyLoginStreak, 0, Number.MAX_SAFE_INTEGER, 0));
  const lastCrateDate = typeof raw.lastCrateDate === 'string' ? raw.lastCrateDate : '';

  return {
    v: 3,
    settings,
    stats,
    history: sanitizeHistory(raw.history),
    coins: Math.round(clampNum(raw.coins, 0, 10_000_000, base.coins)),
    unlocks,
    achievements: sanitizeAchievements(raw.achievements),
    daily: sanitizeDaily(raw.daily),
    dailyTasks: sanitizeDailyTasks(raw.dailyTasks),
    stages: sanitizeStages(raw.stages),
    tutorialCompleted,
    lastCrateClaimAt,
    dailyLoginStreak,
    lastCrateDate,
    grandChampionBadge: Boolean(raw.grandChampionBadge),
    legend100Badge: Boolean(raw.legend100Badge),
  };
}

function readLegacyRaw(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  } catch {
    return null;
  }
}

function tryMigrateLegacy(): SaveDataV3 | null {
  const hasAny = LEGACY_KEYS.some((k) => {
    try {
      return window.localStorage.getItem(k) !== null;
    } catch {
      return false;
    }
  });
  if (!hasAny) return null;

  const base = createDefaultSave();
  const legacySettings = readLegacyRaw('ah_settings');
  const legacyDiff = readLegacyRaw('ah_diff');
  const legacyMuted = readLegacyRaw('ah_muted');
  const legacyStats = readLegacyRaw('ah_stats');

  const mergedSettings = sanitizeSettings({
    ...(legacySettings && typeof legacySettings === 'object' ? legacySettings : {}),
    ...(typeof legacyDiff === 'string' ? { defaultDifficulty: legacyDiff as Difficulty } : {}),
    ...(typeof legacyMuted === 'boolean' ? { sfxEnabled: !legacyMuted } : {}),
  });

  const migrated: SaveDataV3 = {
    ...base,
    settings: mergedSettings,
    stats: sanitizeStats(legacyStats),
  };

  for (const k of LEGACY_KEYS) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      // Ignore removal failures
    }
  }
  return migrated;
}

function validateAndMigrateSave(parsed: unknown): SaveDataV3 {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid save shape');
  }
  let obj = parsed as Record<string, unknown>;
  const originalVersion = typeof obj.v === 'number' ? obj.v : 1;
  if (originalVersion <= 1) {
    obj = migrate1to2(obj);
  }
  const data = migrate2to3(obj, originalVersion);

  if (!data.unlocks.table.includes(data.settings.tableSkin)) {
    data.settings.tableSkin = DEFAULT_SETTINGS.tableSkin;
  }
  if (!data.unlocks.puck.includes(data.settings.puckSkin)) {
    data.settings.puckSkin = DEFAULT_SETTINGS.puckSkin;
  }
  if (!data.unlocks.mallet.includes(data.settings.malletSkin)) {
    data.settings.malletSkin = DEFAULT_SETTINGS.malletSkin;
  }
  return data;
}

class SaveStore {
  private data: SaveDataV3;
  private writeTimer: number | null = null;
  private dirty = false;

  constructor() {
    this.data = this.loadFromStorage();
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.flush);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.flush();
      });
    }
  }

  private loadFromStorage(): SaveDataV3 {
    if (typeof window === 'undefined') return createDefaultSave();

    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw) as unknown;
        const validated = validateAndMigrateSave(parsed);
        for (const k of LEGACY_KEYS) {
          try {
            window.localStorage.removeItem(k);
          } catch {
            // Ignore
          }
        }
        return validated;
      }

      const migrated = tryMigrateLegacy();
      if (migrated) {
        this.writeImmediate(migrated);
        return migrated;
      }

      return createDefaultSave();
    } catch {
      try {
        const corrupt = window.localStorage.getItem(SAVE_KEY);
        if (corrupt !== null) {
          window.localStorage.setItem(BACKUP_KEY, corrupt);
        }
      } catch {
        // Ignore storage errors
      }
      const fresh = createDefaultSave();
      this.writeImmediate(fresh);
      return fresh;
    }
  }

  get(): SaveDataV3 {
    const freshDaily = ensureDailyFresh(this.data.daily);
    const freshTasks = ensureDailyTasksFresh(this.data.dailyTasks);
    if (freshDaily !== this.data.daily || freshTasks !== this.data.dailyTasks) {
      this.data = { ...this.data, daily: freshDaily, dailyTasks: freshTasks };
      this.scheduleWrite();
    }
    return this.data;
  }

  set(next: SaveDataV3, immediate = false): SaveDataV3 {
    this.data = next;
    this.dirty = true;
    if (immediate) {
      this.flush();
    } else {
      this.scheduleWrite();
    }
    return this.data;
  }

  getLastMode(): GameMode {
    try {
      const raw = window.localStorage.getItem('ah_last_opp');
      return raw === 'two' ? 'two' : 'ai';
    } catch {
      return 'ai';
    }
  }

  setLastMode(opp: GameMode): void {
    try {
      window.localStorage.setItem('ah_last_opp', opp);
    } catch {
      // Ignore
    }
  }

  private writeImmediate(payload: SaveDataV3): void {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
      this.dirty = false;
    } catch {
      // Ignore quota errors
    }
  }

  private scheduleWrite(): void {
    if (typeof window === 'undefined') return;
    if (this.writeTimer !== null) return;
    this.writeTimer = window.setTimeout(() => {
      this.writeTimer = null;
      if (this.dirty) {
        this.writeImmediate(this.data);
      }
    }, 500);
  }

  flush = (): void => {
    if (this.writeTimer !== null) {
      window.clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    if (this.dirty) {
      this.writeImmediate(this.data);
    }
  };
}

export const saveStore = new SaveStore();
