import {
  ACHIEVEMENTS,
  getDailyChallengeForDate,
  getDailyTasksForDate,
  getLocalDateKey,
  getStageById,
  STAGES,
  WORLDS,
} from './registries';
import { SkinCategory, SKINS } from './skins';
import { ensureDailyFresh, ensureDailyTasksFresh, saveStore } from './storage';
import {
  CoinBreakdown,
  MatchHistoryItem,
  MatchResult,
  MatchSummary,
  PlayerStats,
  SaveDataV3,
  StageConfig,
  StageOutcomeSummary,
  StageStarCount,
  WorldId,
} from './types';
const LOSS_REWARD = {
  closeMargin: 2,
  closeShare: 1 / 3,
  heavyShare: 1 / 6,
  minGoals: 1,
  minSeconds: 60,
};

function getLossCoins(winCoins: number, result: MatchResult) {
  const eligible =
    result.playerScore >= LOSS_REWARD.minGoals || result.duration >= LOSS_REWARD.minSeconds;
  if (!eligible) return { base: 0, goals: 0 };

  const margin = result.opponentScore - result.playerScore;
  const share =
    margin <= LOSS_REWARD.closeMargin ? LOSS_REWARD.closeShare : LOSS_REWARD.heavyShare;
  const goalCoins = result.playerScore * 2;
  const total = Math.round((winCoins + goalCoins) * share);
  const goals = Math.round(goalCoins * share);
  return { base: total - goals, goals };
}

export function getTotalStageStars(save: SaveDataV3): number {
  let total = 0;
  for (const s of STAGES) {
    total += save.stages[s.id]?.stars ?? 0;
  }
  return total;
}

export function getHighestUnlockedStageId(save: SaveDataV3): number {
  let highest = 1;
  for (const s of STAGES) {
    if (isStagePlayable(save, s)) {
      highest = s.id;
    }
  }
  return highest;
}

export function isWorldUnlocked(save: SaveDataV3, worldId: WorldId): {
  unlocked: boolean;
  starsRequired: number;
  totalStars: number;
  gateStageId?: number;
} {
  const totalStars = getTotalStageStars(save);
  const worldDef = WORLDS.find((w) => w.id === worldId);
  const starsRequired = worldDef?.starsRequired ?? 0;
  const gateStageId = worldDef?.gateStageId;
  const gateCleared = Boolean(gateStageId && (save.stages[gateStageId]?.stars ?? 0) >= 1);
  return {
    unlocked: totalStars >= starsRequired || gateCleared,
    starsRequired,
    totalStars,
    gateStageId,
  };
}

export function isStagePlayable(save: SaveDataV3, stage: StageConfig): boolean {
  const worldGate = isWorldUnlocked(save, stage.world);
  if (!worldGate.unlocked) return false;
  return Boolean(save.stages[stage.id]?.unlocked);
}

export const MAX_CONTINUES_PER_MATCH = 2;

export function getStageContinueCost(stage: StageConfig, continuesUsed: number): number {
  let base: number;
  if (stage.world === 1) {
    base = stage.isBoss ? 60 : 40;
  } else if (stage.world === 2) {
    base = stage.isBoss ? 110 : 75;
  } else if (stage.world === 3) {
    base = stage.isBoss ? 180 : 120;
  } else if (stage.world === 4) {
    base = stage.isBoss ? 240 : 160;
  } else if (stage.world === 5) {
    base = stage.isBoss ? 300 : 200;
  } else if (stage.world === 6) {
    base = stage.isBoss ? 375 : 250;
  } else if (stage.world === 7) {
    base = stage.isBoss ? 450 : 300;
  } else if (stage.world === 8) {
    base = stage.isBoss ? 540 : 360;
  } else if (stage.world === 9) {
    base = stage.isBoss ? 630 : 420;
  } else {
    base = stage.isBoss ? 750 : 500;
  }
  return base * Math.pow(2, Math.max(0, continuesUsed));
}

export function deductContinueCoins(save: SaveDataV3, cost: number): SaveDataV3 {
  const nextSave: SaveDataV3 = {
    ...save,
    coins: Math.max(0, save.coins - cost),
  };
  saveStore.set(nextSave, true);
  return nextSave;
}

export const ARENA_CRATE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function getArenaCrateStatus(
  save: SaveDataV3,
  nowMs = Date.now()
): { ready: boolean; remainingMs: number; rewardCoins: number; nextStreak: number } {
  const elapsed = Math.max(0, nowMs - save.lastCrateClaimAt);
  const remainingMs = Math.max(0, ARENA_CRATE_COOLDOWN_MS - elapsed);
  const ready = save.lastCrateClaimAt === 0 || remainingMs === 0;

  const today = getLocalDateKey(new Date(nowMs));
  const yesterdayDate = new Date(nowMs);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getLocalDateKey(yesterdayDate);

  let nextStreak = 1;
  if (save.lastCrateDate === today) {
    nextStreak = Math.max(1, save.dailyLoginStreak);
  } else if (save.lastCrateDate === yesterday) {
    nextStreak = Math.max(1, save.dailyLoginStreak) + 1;
  }

  const streakBonus = Math.min(20, Math.max(0, nextStreak - 1) * 5);
  const rewardCoins = 5 + streakBonus;

  return { ready, remainingMs, rewardCoins, nextStreak };
}

export function claimArenaCrate(
  save: SaveDataV3,
  nowMs = Date.now()
): { claimed: boolean; rewardCoins: number; save: SaveDataV3 } {
  const status = getArenaCrateStatus(save, nowMs);
  if (!status.ready) {
    return { claimed: false, rewardCoins: 0, save };
  }
  const today = getLocalDateKey(new Date(nowMs));
  const nextSave: SaveDataV3 = {
    ...save,
    coins: save.coins + status.rewardCoins,
    lastCrateClaimAt: nowMs,
    dailyLoginStreak: status.nextStreak,
    lastCrateDate: today,
  };
  saveStore.set(nextSave, true);
  return { claimed: true, rewardCoins: status.rewardCoins, save: nextSave };
}

export function claimDailyTaskReward(
  save: SaveDataV3,
  taskId: string,
  nowMs = Date.now()
): { claimed: boolean; rewardCoins: number; save: SaveDataV3 } {
  const today = getLocalDateKey(new Date(nowMs));
  const state = ensureDailyTasksFresh(save.dailyTasks);
  const def = getDailyTasksForDate(today).find((d) => d.id === taskId);
  if (!def) return { claimed: false, rewardCoins: 0, save };

  const task = state.tasks.find((t) => t.id === taskId);
  if (!task || task.claimed || task.progress < def.target) {
    return { claimed: false, rewardCoins: 0, save };
  }

  const nextSave: SaveDataV3 = {
    ...save,
    coins: save.coins + def.reward,
    dailyTasks: {
      date: today,
      tasks: state.tasks.map((t) => (t.id === taskId ? { ...t, claimed: true } : t)),
    },
  };
  saveStore.set(nextSave, true);
  return { claimed: true, rewardCoins: def.reward, save: nextSave };
}

export function completeTutorialSave(save: SaveDataV3, skipped: boolean): {
  save: SaveDataV3;
  bonusCoins: number;
} {
  const bonusCoins = !skipped && !save.tutorialCompleted ? 25 : 0;
  const nextSave: SaveDataV3 = {
    ...save,
    tutorialCompleted: true,
    coins: save.coins + bonusCoins,
  };
  saveStore.set(nextSave, true);
  return { save: nextSave, bonusCoins };
}

export function computeStageStars(stage: StageConfig, result: MatchResult): StageStarCount {
  if (!result.won) return 0;

  let stars: StageStarCount;
  if (stage.winCondition === 'sudden_death') {
    stars = result.duration <= 45 ? 3 : 2;
  } else if (stage.winCondition === 'timed') {
    if (result.opponentScore === 0) stars = 3;
    else if (result.playerScore - result.opponentScore >= 2) stars = 2;
    else stars = 1;
  } else {
    if (result.opponentScore === 0) stars = 3;
    else if (result.opponentScore <= stage.twoStarMaxConceded) stars = 2;
    else stars = 1;
  }

  if ((result.continuesUsed ?? 0) > 0) {
    return Math.min(1, stars) as StageStarCount;
  }
  return stars;
}

export function isSkinUnlocked(save: SaveDataV3, category: SkinCategory, id: string): boolean {
  const skin = SKINS[category][id];
  if (!skin) return false;
  if (!skin.locked) return true;
  if (save.unlocks[category].includes(id)) return true;

  const rule = skin.unlock;
  if (!rule) return false;
  if (rule.type === 'wins') return save.stats.wins >= rule.n;
  if (rule.type === 'streak') return save.stats.bestStreak >= rule.n;
  if (rule.type === 'achievement') return Boolean(save.achievements[rule.id]);
  if (rule.type === 'stage') return (save.stages[rule.stageId]?.stars ?? 0) >= 1;
  return false;
}

export function describeSkinUnlock(category: SkinCategory, id: string): string {
  const skin = SKINS[category][id];
  if (!skin || !skin.locked || !skin.unlock) return '';
  const rule = skin.unlock;
  if (rule.type === 'coins') return `${rule.price} coins`;
  if (rule.type === 'wins') return `${rule.n} wins`;
  if (rule.type === 'streak') return `${rule.n}-win streak`;
  if (rule.type === 'stage') return rule.label;
  const ach = ACHIEVEMENTS.find((a) => a.id === rule.id);
  return ach ? `Achievement: ${ach.name}` : 'Achievement';
}

function collectMilestoneSkins(
  save: SaveDataV3
): Array<{ category: SkinCategory; id: string; name: string }> {
  const newlyUnlocked: Array<{ category: SkinCategory; id: string; name: string }> = [];
  const categories: SkinCategory[] = ['table', 'puck', 'mallet'];
  for (const cat of categories) {
    for (const skin of Object.values(SKINS[cat])) {
      if (!skin.locked) continue;
      if (save.unlocks[cat].includes(skin.id)) continue;
      if (isSkinUnlocked(save, cat, skin.id)) {
        save.unlocks[cat] = [...save.unlocks[cat], skin.id];
        newlyUnlocked.push({ category: cat, id: skin.id, name: skin.name });
      }
    }
  }
  return newlyUnlocked;
}

/**
 * Single match-end pipeline: updates stats, match history, achievements,
 * daily challenge, stage stars/unlocks, coins, and milestone skin unlocks.
 */
export function finalizeMatch(currentSave: SaveDataV3, result: MatchResult): {
  save: SaveDataV3;
  summary: MatchSummary;
} {
  const nowIso = new Date().toISOString();
  const todayKey = getLocalDateKey();

  const nextStats: PlayerStats = {
    ...currentSave.stats,
    fastestPuck: Math.max(currentSave.stats.fastestPuck, Math.round(result.maxPuckSpeed)),
    longestRally: Math.max(currentSave.stats.longestRally, result.longestRally),
    totalHits: currentSave.stats.totalHits + result.hits,
    powerupsCollected: currentSave.stats.powerupsCollected + result.powerupsCollected,
    playtime: currentSave.stats.playtime + Math.round(result.duration),
  };

  let nextHistory = currentSave.history;
  const coins: CoinBreakdown = {
    base: 0,
    goals: 0,
    shutout: 0,
    achievements: 0,
    daily: 0,
    total: 0,
  };

  const stage = result.stageId ? getStageById(result.stageId) : undefined;
  const nextStages = { ...currentSave.stages };
  const nextUnlocks = {
    table: [...currentSave.unlocks.table],
    puck: [...currentSave.unlocks.puck],
    mallet: [...currentSave.unlocks.mallet],
  };
  const newSkins: Array<{ category: SkinCategory; id: string; name: string }> = [];
  let stageOutcome: StageOutcomeSummary | undefined;
  let nextGrandChampionBadge = Boolean(currentSave.grandChampionBadge);
  let nextLegend100Badge = Boolean(currentSave.legend100Badge);

  if (result.hasOpponent) {
    nextStats.totalMatches += 1;
    nextStats.goalsFor += result.playerScore;
    nextStats.goalsAgainst += result.opponentScore;
    if (result.won) {
      nextStats.wins += 1;
      nextStats.currentStreak += 1;
      nextStats.bestStreak = Math.max(nextStats.bestStreak, nextStats.currentStreak);
    } else {
      nextStats.losses += 1;
      nextStats.currentStreak = 0;
    }

    const historyEntry: MatchHistoryItem = {
      date: nowIso,
      modeId: result.modeId,
      opponent: result.opponentType,
      difficulty: result.difficulty,
      personality: result.personality,
      score: { p: result.playerScore, a: result.opponentScore },
      result: result.won ? 'win' : 'loss',
      duration: Math.round(result.duration),
      ...(result.stageId ? { stageId: result.stageId } : {}),
    };
    nextHistory = [historyEntry, ...currentSave.history].slice(0, 20);

    if (stage) {
      const prevStage = nextStages[stage.id] ?? { unlocked: true, stars: 0, bestMargin: 0 };
      const previousStars = prevStage.stars;
      const isFirstClear = result.won && previousStars === 0;
      const starsEarned = computeStageStars(stage, result);
      const margin = result.playerScore - result.opponentScore;

      nextStages[stage.id] = {
        unlocked: true,
        stars: Math.max(previousStars, starsEarned) as StageStarCount,
        bestMargin: Math.max(prevStage.bestMargin, margin),
      };

      const nextStageId = stage.id < STAGES.length ? stage.id + 1 : null;
      if (result.won && nextStageId !== null) {
        const existingNext = nextStages[nextStageId] ?? {
          unlocked: false,
          stars: 0,
          bestMargin: 0,
        };
        nextStages[nextStageId] = { ...existingNext, unlocked: true };
      }

      let duplicateRewardBonusCoins = 0;
      let grandChampionUnlocked = false;
      let legend100Unlocked = false;

      if (result.won) {
        coins.base = isFirstClear ? stage.coinReward : Math.max(5, Math.round(stage.coinReward * 0.25));
        if (stage.unlockRewards) {
          for (const rew of stage.unlockRewards) {
            const alreadyOwned =
              nextUnlocks[rew.category].includes(rew.id) ||
              isSkinUnlocked(currentSave, rew.category, rew.id);
            if (!alreadyOwned) {
              nextUnlocks[rew.category].push(rew.id);
              newSkins.push(rew);
            } else {
              if (!nextUnlocks[rew.category].includes(rew.id)) {
                nextUnlocks[rew.category].push(rew.id);
              }
              if (isFirstClear) {
                duplicateRewardBonusCoins += stage.alreadyOwnedBonusPerItem ?? 75;
              }
            }
          }
        }
        if (duplicateRewardBonusCoins > 0) {
          coins.base += duplicateRewardBonusCoins;
        }
        if (stage.grantsGrandChampionBadge) {
          if (!nextGrandChampionBadge) {
            grandChampionUnlocked = true;
          }
          nextGrandChampionBadge = true;
        }
        if (stage.grantsLegend100Badge) {
          if (!nextLegend100Badge) {
            legend100Unlocked = true;
          }
          nextLegend100Badge = true;
        }
      }
      coins.goals = result.playerScore * 2;
      coins.shutout = result.won && result.opponentScore === 0 ? 10 : 0;
      if (!result.won) {
        const winCoins =
          previousStars === 0
            ? stage.coinReward
            : Math.max(5, Math.round(stage.coinReward * 0.25));
        Object.assign(coins, getLossCoins(winCoins, result));
      }

      // Evaluate whether next stage is playable considering world star & boss gates
      const tempSave: SaveDataV3 = { ...currentSave, stages: nextStages };
      const nextStageObj = nextStageId ? getStageById(nextStageId) : undefined;
      const nextPlayable = nextStageObj ? isStagePlayable(tempSave, nextStageObj) : false;
      let starRequirementNote: string | undefined;
      if (result.won && nextStageObj && !nextPlayable) {
        const gate = isWorldUnlocked(tempSave, nextStageObj.world);
        starRequirementNote = gate.gateStageId
          ? `Need ${gate.starsRequired} stars (${gate.starsRequired - gate.totalStars} more) or beat Stage ${gate.gateStageId} to enter World ${nextStageObj.world}`
          : `Need ${gate.starsRequired} stars (${gate.starsRequired - gate.totalStars} more) to enter World ${nextStageObj.world}`;
      }

      stageOutcome = {
        stageId: stage.id,
        stageName: stage.name,
        starsEarned,
        previousStars,
        isFirstClear,
        nextStageId,
        nextStageUnlocked: nextPlayable,
        starRequirementNote,
        usedContinue: (result.continuesUsed ?? 0) > 0,
        continuesUsed: result.continuesUsed ?? 0,
        ...(duplicateRewardBonusCoins > 0 ? { duplicateRewardBonusCoins } : {}),
        ...(grandChampionUnlocked ? { grandChampionUnlocked: true } : {}),
        ...(legend100Unlocked ? { legend100Unlocked: true } : {}),
      };
    } else {
      coins.base = 20;
      coins.goals = result.playerScore * 2;
      coins.shutout = result.won && result.opponentScore === 0 ? 10 : 0;
      if (!result.won) Object.assign(coins, getLossCoins(20, result));
    }
  }

  // Achievements check
  const nextAchievements = { ...currentSave.achievements };
  const newAchievements: string[] = [];
  for (const ach of ACHIEVEMENTS) {
    if (nextAchievements[ach.id]) continue;
    if (ach.check(nextStats, result)) {
      nextAchievements[ach.id] = nowIso;
      newAchievements.push(ach.id);
    }
  }
  coins.achievements = newAchievements.length * 5;

  // Daily challenge check
  const daily = ensureDailyFresh(currentSave.daily);
  const dailyDef = getDailyChallengeForDate(todayKey);
  const delta = dailyDef.increment(result);
  const nextProgress = Math.min(dailyDef.target, daily.progress + delta);
  const nowCompleted = daily.completed || nextProgress >= dailyDef.target;
  let dailyCompletedNow = false;
  let rewardClaimed = daily.rewardClaimed;
  if (nowCompleted && !rewardClaimed) {
    coins.daily = dailyDef.reward;
    rewardClaimed = true;
    dailyCompletedNow = true;
  }

  coins.total = coins.base + coins.goals + coins.shutout + coins.achievements + coins.daily;

  // Daily tasks progress (rewards are claimed manually from the achievements screen)
  const tasksState = ensureDailyTasksFresh(currentSave.dailyTasks);
  const taskDefs = getDailyTasksForDate(todayKey);
  const nextTasks = taskDefs.map((def) => {
    const existing = tasksState.tasks.find((t) => t.id === def.id);
    const progress = Math.min(def.target, (existing?.progress ?? 0) + def.increment(result));
    return { id: def.id, progress, claimed: existing?.claimed ?? false };
  });

  const nextSave: SaveDataV3 = {
    ...currentSave,
    stats: nextStats,
    history: nextHistory,
    coins: currentSave.coins + coins.total,
    unlocks: nextUnlocks,
    achievements: nextAchievements,
    daily: {
      date: todayKey,
      challengeId: dailyDef.id,
      progress: nextProgress,
      completed: nowCompleted,
      rewardClaimed,
    },
    dailyTasks: { date: todayKey, tasks: nextTasks },
    stages: nextStages,
    grandChampionBadge: nextGrandChampionBadge,
    legend100Badge: nextLegend100Badge,
  };

  const milestoneSkins = collectMilestoneSkins(nextSave);
  for (const ms of milestoneSkins) {
    if (!newSkins.some((s) => s.category === ms.category && s.id === ms.id)) {
      newSkins.push(ms);
    }
  }

  saveStore.set(nextSave, true);

  return {
    save: nextSave,
    summary: {
      result,
      coins,
      newAchievements,
      newSkins,
      dailyCompletedNow,
      stageOutcome,
    },
  };
}

export function purchaseAndEquipSkin(
  save: SaveDataV3,
  category: SkinCategory,
  id: string
): { ok: boolean; save: SaveDataV3; reason?: string } {
  const skin = SKINS[category][id];
  if (!skin) return { ok: false, save, reason: 'Skin not found' };

  if (isSkinUnlocked(save, category, id)) {
    const unlocks = {
      ...save.unlocks,
      [category]: save.unlocks[category].includes(id)
        ? save.unlocks[category]
        : [...save.unlocks[category], id],
    };
    const settingsKey =
      category === 'table' ? 'tableSkin' : category === 'puck' ? 'puckSkin' : 'malletSkin';
    const nextSave: SaveDataV3 = {
      ...save,
      unlocks,
      settings: { ...save.settings, [settingsKey]: id },
    };
    saveStore.set(nextSave, true);
    return { ok: true, save: nextSave };
  }

  if (skin.unlock?.type === 'coins') {
    const price = skin.unlock.price;
    if (save.coins < price) {
      return { ok: false, save, reason: `Need ${price - save.coins} more coins` };
    }
    const settingsKey =
      category === 'table' ? 'tableSkin' : category === 'puck' ? 'puckSkin' : 'malletSkin';
    const nextSave: SaveDataV3 = {
      ...save,
      coins: save.coins - price,
      unlocks: {
        ...save.unlocks,
        [category]: [...save.unlocks[category], id],
      },
      settings: { ...save.settings, [settingsKey]: id },
    };
    saveStore.set(nextSave, true);
    return { ok: true, save: nextSave };
  }

  return { ok: false, save, reason: describeSkinUnlock(category, id) };
}
