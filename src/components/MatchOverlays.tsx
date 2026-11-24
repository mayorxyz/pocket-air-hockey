import React from 'react';
import { Award, ChevronLeft, Coins, Crown, Lock, RotateCcw, Share2, Star } from 'lucide-react';
import { getStageContinueCost, MAX_CONTINUES_PER_MATCH } from '../game/progression';
import { ACHIEVEMENTS } from '../game/registries';
import { MatchResult, MatchSummary, PlayerStats, Score, StageConfig } from '../game/types';

interface PauseScreenProps {
  score: Score;
  isPractice: boolean;
  practiceHits: number;
  stageLabel?: string;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onRequestQuit: () => void;
}

export const PauseScreen: React.FC<PauseScreenProps> = ({
  score,
  isPractice,
  practiceHits,
  stageLabel,
  onResume,
  onRestart,
  onOpenSettings,
  onRequestQuit,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#0d151e]/88 backdrop-blur-md safe-shell safe-scroll"
    >
      <div className="w-full max-w-[min(100%,24rem)] my-auto rounded-3xl bg-[#14202c]/95 border border-white/14 p-5 text-center shadow-2xl">
        <div className="flex justify-start mb-3">
          <button
            type="button"
            onClick={onResume}
            className="min-h-12 min-w-12 px-3 rounded-2xl bg-white/12 border border-white/15 hover:bg-white/18 text-white font-bold text-sm sm:text-base inline-flex items-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Back</span>
          </button>
        </div>

        {stageLabel && (
          <div className="mb-1 text-xs font-extrabold uppercase tracking-wider text-[#fbbf24]">
            {stageLabel}
          </div>
        )}

        <h1 className="font-display m-0 mb-1.5 text-[clamp(2rem,6vw,2.75rem)] leading-none font-extrabold italic tracking-tight text-white [text-wrap:balance]">
          Paused
        </h1>
        <p className="m-0 mb-5 text-lg sm:text-xl font-bold text-[#b8c7d3] tabular-nums">
          {isPractice ? (
            <span>{practiceHits} hits</span>
          ) : (
            <>
              <span className="text-[#ff8a76]">{score.p}</span>
              <span className="mx-2 text-[#b8c7d3]">to</span>
              <span className="text-[#7ea2ff]">{score.a}</span>
            </>
          )}
        </p>

        <div className="grid grid-cols-1 gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full min-h-[3.35rem] rounded-2xl bg-[#f0452d] hover:bg-[#e13c24] border border-white/18 active:scale-[0.98] text-white font-display font-extrabold text-lg transition-transform cursor-pointer"
          >
            Resume
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="w-full min-h-12 rounded-2xl bg-white/12 border border-white/14 hover:bg-white/18 active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
            >
              Restart
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full min-h-12 rounded-2xl bg-white/12 border border-white/14 hover:bg-white/18 active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
            >
              Settings
            </button>
          </div>
          <button
            type="button"
            onClick={onRequestQuit}
            className="w-full min-h-12 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/14 active:scale-[0.98] text-[#cbd8e2] hover:text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
          >
            Quit to Home
          </button>
        </div>
      </div>
    </div>
  );
};

interface StageContinueModalProps {
  stage: StageConfig;
  result: MatchResult;
  coins: number;
  continuesUsed: number;
  onContinue: (cost: number) => void;
  onRestartStage: () => void;
  onStagesMap: () => void;
  onHome: () => void;
}

export const StageContinueModal: React.FC<StageContinueModalProps> = ({
  stage,
  result,
  coins,
  continuesUsed,
  onContinue,
  onRestartStage,
  onStagesMap,
  onHome,
}) => {
  const noContinuesLeft = continuesUsed >= MAX_CONTINUES_PER_MATCH;
  const cost = getStageContinueCost(stage, continuesUsed);
  const canAfford = !noContinuesLeft && coins >= cost;
  const needed = Math.max(0, cost - coins);
  const effectHint =
    stage.winCondition === 'timed'
      ? 'Adds +30s to the clock and resets center face-off'
      : 'Reduces AI score by 1 and resumes at match point';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#0d151e]/90 backdrop-blur-md safe-shell safe-scroll"
    >
      <div className="w-full max-w-[min(100%,25rem)] my-auto rounded-3xl bg-[#14202c]/95 border border-white/14 p-5 text-center shadow-2xl">
        <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
          <div className="min-h-9 px-3 rounded-full bg-[#0e1720] border border-[#fbbf24]/30 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#fbbf24] tabular-nums">
            <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{coins}</span>
          </div>
          <div className="min-h-9 px-3 rounded-full bg-[#f59e0b]/18 border border-[#f59e0b]/40 inline-flex items-center text-xs font-extrabold text-[#fde68a]">
            1★ Max (Continued)
          </div>
        </div>

        <div className="mb-1 text-xs font-extrabold uppercase tracking-wider text-[#fbbf24] tabular-nums">
          Stage {stage.id} · {stage.name}
        </div>

        <h1 className="font-display m-0 mb-2 text-[clamp(1.8rem,5.5vw,2.5rem)] leading-none font-extrabold italic tracking-tight text-white [text-wrap:balance]">
          Continue Match?
        </h1>

        <div className="font-display text-[clamp(2.25rem,7vw,3rem)] font-extrabold tracking-tight leading-none mb-2 tabular-nums">
          <span className="text-[#ff8a76]">{result.playerScore}</span>
          <span className="mx-3 text-white/50">:</span>
          <span className="text-[#7ea2ff]">{result.opponentScore}</span>
        </div>

        <p className="mt-0 mb-3.5 text-sm text-[#b8c7d3]">
          {noContinuesLeft ? 'No continues left for this attempt.' : effectHint}
        </p>

        <div className="rounded-2xl bg-[#0e1720] border border-white/10 p-3 mb-4 text-left text-xs text-[#cbd8e2] space-y-1">
          <div className="flex items-center justify-between font-bold">
            <span>Continues used</span>
            <span className="tabular-nums text-white">
              {continuesUsed} / {MAX_CONTINUES_PER_MATCH}
            </span>
          </div>
          {!noContinuesLeft && (
            <div className="flex items-center justify-between font-bold">
              <span>Second Wind cost</span>
              <span className="tabular-nums text-[#fbbf24]">{cost} coins</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {noContinuesLeft ? (
            <button
              type="button"
              disabled
              className="w-full min-h-[3.25rem] rounded-2xl bg-white/8 border border-white/10 text-[#b8c7d3] font-display font-extrabold text-base cursor-not-allowed"
            >
              No continues left
            </button>
          ) : (
            <button
              type="button"
              disabled={!canAfford}
              onClick={() => canAfford && onContinue(cost)}
              className={`w-full min-h-[3.35rem] px-4 rounded-2xl font-display font-extrabold text-base sm:text-lg transition-transform flex flex-col items-center justify-center ${
                canAfford
                  ? 'bg-[#f59e0b] hover:bg-[#d97706] border border-[#fde68a]/40 active:scale-[0.98] text-[#101922] cursor-pointer'
                  : 'bg-white/10 border border-white/12 text-white/45 cursor-not-allowed'
              }`}
            >
              <span className="inline-flex items-center gap-2 tabular-nums">
                <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Continue ({cost} Coins)</span>
              </span>
              {!canAfford && (
                <span className="text-xs font-bold text-[#fbbf24] tabular-nums">
                  +{needed} needed
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onRestartStage}
            className={`w-full min-h-12 rounded-2xl font-bold text-sm sm:text-base transition-transform cursor-pointer ${
              noContinuesLeft
                ? 'bg-[#f0452d] hover:bg-[#e13c24] border border-white/18 active:scale-[0.98] text-white font-display font-extrabold text-lg'
                : 'bg-white/12 border border-white/14 hover:bg-white/18 active:scale-[0.98] text-white'
            }`}
          >
            Restart Stage
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onStagesMap}
              className="w-full min-h-12 rounded-2xl bg-white/12 border border-white/14 hover:bg-white/18 active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
            >
              Stages Map
            </button>
            <button
              type="button"
              onClick={onHome}
              className="w-full min-h-12 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/14 active:scale-[0.98] text-[#cbd8e2] hover:text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
            >
              Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface GameOverScreenProps {
  summary: MatchSummary;
  stats: PlayerStats;
  reduceMotion?: boolean;
  onRematch: () => void;
  onChangeMode: () => void;
  onNextStage?: (stageId: number) => void;
  onStagesMap?: () => void;
  onShareResult?: () => void;
  onHome: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  summary,
  stats,
  reduceMotion = false,
  onRematch,
  onChangeMode,
  onNextStage,
  onStagesMap,
  onShareResult,
  onHome,
}) => {
  const { result, coins, newAchievements, newSkins, stageOutcome } = summary;
  const isLegendFinale = Boolean(stageOutcome && stageOutcome.stageId === 100 && result.won);
  const title = stageOutcome
    ? result.won
      ? stageOutcome.stageId === 100
        ? '100-Stage Legend!'
        : stageOutcome.stageId === 60
          ? 'Eternal Champion!'
          : stageOutcome.stageId === 30
            ? 'Champion!'
            : 'Stage Clear!'
      : 'Stage Failed'
    : result.opponentType === 'two'
      ? result.won
        ? 'Red wins'
        : 'Blue wins'
      : result.won
        ? 'You win'
        : 'You lose';

  const breakdownRows = [
    {
      label: stageOutcome
        ? result.won
          ? stageOutcome.isFirstClear
            ? 'Stage clear reward'
            : 'Stage replay reward'
          : 'Stage attempt'
        : result.won
          ? 'Match win'
          : 'Match played',
      val: coins.base,
    },
    { label: `Goals (${result.playerScore})`, val: coins.goals },
    ...(coins.shutout > 0 ? [{ label: 'Shutout bonus', val: coins.shutout }] : []),
    ...(coins.achievements > 0 ? [{ label: 'Achievements', val: coins.achievements }] : []),
    ...(coins.daily > 0 ? [{ label: 'Daily challenge', val: coins.daily }] : []),
  ];

  const canAdvanceStage = Boolean(
    stageOutcome &&
      result.won &&
      stageOutcome.nextStageId !== null &&
      stageOutcome.nextStageUnlocked &&
      onNextStage
  );

  const showShare = Boolean(
    onShareResult &&
      (result.won || (stageOutcome && (stageOutcome.isFirstClear || stageOutcome.nextStageUnlocked)))
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#0d151e]/90 backdrop-blur-md safe-shell safe-scroll"
    >
      <div
        className={`w-full max-w-[min(100%,26rem)] my-auto rounded-3xl bg-[#14202c]/95 p-5 text-center shadow-2xl ${
          isLegendFinale
            ? 'border border-[#fbbf24]/65 ring-2 ring-[#fbbf24]/40 shadow-[0_0_40px_rgba(251,191,36,0.22)]'
            : 'border border-white/14'
        }`}
      >
        {stageOutcome && (
          <div className="mb-1 text-xs font-extrabold uppercase tracking-wider text-[#fbbf24] tabular-nums">
            {isLegendFinale
              ? 'Final Boss Cleared · 100/100 Campaign Complete'
              : `Stage ${stageOutcome.stageId} · ${stageOutcome.stageName}`}
          </div>
        )}

        <h1 className="font-display m-0 mb-2 text-[clamp(2rem,6vw,2.75rem)] leading-none font-extrabold italic tracking-tight text-white [text-wrap:balance]">
          {title}
        </h1>

        {stageOutcome && (
          <div className="flex flex-col items-center gap-2 mb-3">
            <div
              className="flex items-center justify-center gap-2"
              aria-label={`Earned ${stageOutcome.starsEarned} of 3 stars`}
            >
              {[1, 2, 3].map((idx) => {
                const earned = stageOutcome.starsEarned >= idx;
                return (
                  <Star
                    key={idx}
                    className={`w-8 h-8 ${
                      reduceMotion ? '' : 'transition-transform duration-300'
                    } ${
                      earned
                        ? 'text-[#fbbf24] fill-[#fbbf24] scale-105'
                        : 'text-white/20 fill-white/10'
                    }`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
            {stageOutcome.usedContinue && (
              <div className="rounded-full bg-[#f59e0b]/18 border border-[#f59e0b]/40 px-3 py-1 text-xs font-extrabold text-[#fde68a]">
                1★ Max (Continued)
              </div>
            )}
            {!result.won && stageOutcome.continuesUsed >= MAX_CONTINUES_PER_MATCH && (
              <div className="rounded-full bg-white/10 border border-white/12 px-3 py-1 text-xs font-bold text-[#b8c7d3]">
                No continues left
              </div>
            )}
          </div>
        )}

        <div className="font-display text-[clamp(2.4rem,7vw,3.25rem)] font-extrabold tracking-tight leading-none mb-2 tabular-nums">
          <span className="text-[#ff8a76]">{result.playerScore}</span>
          <span className="mx-3 text-white/50">:</span>
          <span className="text-[#7ea2ff]">{result.opponentScore}</span>
        </div>

        <p className="mt-0 mb-3.5 text-sm text-[#b8c7d3] tabular-nums">
          Streak {stats.currentStreak} · Wins {stats.wins} · Losses {stats.losses}
        </p>

        {stageOutcome?.starRequirementNote && (
          <div className="mb-3.5 rounded-2xl bg-[#f59e0b]/18 border border-[#f59e0b]/40 p-3 text-left text-xs font-bold text-[#fde68a] flex items-center gap-2">
            <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{stageOutcome.starRequirementNote}</span>
          </div>
        )}

        {coins.total > 0 && (
          <div className="mb-3.5 rounded-2xl bg-[#0e1720] border border-white/10 p-3.5 text-left">
            <div className="flex items-center justify-between text-sm font-extrabold text-[#fbbf24] mb-1.5 tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Coins earned</span>
              </span>
              <span>+{coins.total}</span>
            </div>
            <div className="space-y-1 text-xs text-[#b8c7d3] tabular-nums">
              {breakdownRows.map((r) => (
                <div key={r.label} className="flex justify-between gap-2">
                  <span>{r.label}</span>
                  <span className="text-white font-semibold">+{r.val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {(newAchievements.length > 0 ||
          newSkins.length > 0 ||
          Boolean(stageOutcome?.grandChampionUnlocked) ||
          Boolean(stageOutcome?.legend100Unlocked) ||
          Boolean(stageOutcome?.duplicateRewardBonusCoins)) && (
          <div className="mb-3.5 rounded-2xl bg-[#10b981]/18 border border-[#10b981]/40 p-3 text-left space-y-1">
            {stageOutcome?.legend100Unlocked && (
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#fbbf24]">
                <Crown className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Unlocked Badge: 100-Stage Legend!</span>
              </div>
            )}
            {stageOutcome?.grandChampionUnlocked && (
              <div className="flex items-center gap-2 text-sm font-extrabold text-[#fbbf24]">
                <Crown className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Unlocked Badge: Grand Champion!</span>
              </div>
            )}
            {newAchievements.map((id) => {
              const ach = ACHIEVEMENTS.find((a) => a.id === id);
              return (
                <div key={id} className="flex items-center gap-2 text-sm font-bold text-[#6ee7b7]">
                  <Award className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Unlocked: {ach?.name ?? id}</span>
                </div>
              );
            })}
            {newSkins.map((s) => (
              <div key={`${s.category}-${s.id}`} className="text-sm font-bold text-white">
                New skin unlocked: {s.name}
              </div>
            ))}
            {stageOutcome?.duplicateRewardBonusCoins && (
              <div className="text-xs font-bold text-[#fde68a] tabular-nums">
                +{stageOutcome.duplicateRewardBonusCoins} coins (Boss skins already owned)
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          {stageOutcome ? (
            <>
              {canAdvanceStage && stageOutcome.nextStageId !== null ? (
                <button
                  type="button"
                  onClick={() => onNextStage?.(stageOutcome.nextStageId!)}
                  className="w-full min-h-[3.35rem] rounded-2xl bg-[#f0452d] hover:bg-[#e13c24] border border-white/18 active:scale-[0.98] text-white font-display font-extrabold text-lg transition-transform cursor-pointer"
                >
                  Next Stage ({stageOutcome.nextStageId})
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onRematch}
                  className="w-full min-h-[3.35rem] rounded-2xl bg-[#f0452d] hover:bg-[#e13c24] border border-white/18 active:scale-[0.98] text-white font-display font-extrabold text-lg transition-transform cursor-pointer"
                >
                  Retry Stage
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                {canAdvanceStage && stageOutcome.nextStageId !== null ? (
                  <button
                    type="button"
                    onClick={onRematch}
                    className="w-full min-h-12 rounded-2xl bg-white/12 border border-white/14 hover:bg-white/18 active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
                  >
                    Retry Stage
                  </button>
                ) : onStagesMap ? (
                  <button
                    type="button"
                    onClick={onStagesMap}
                    className="w-full min-h-12 rounded-2xl bg-white/12 border border-white/14 hover:bg-white/18 active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
                  >
                    Stages Map
                  </button>
                ) : null}

                {showShare && (
                  <button
                    type="button"
                    onClick={onShareResult}
                    className="w-full min-h-12 rounded-2xl bg-[#2459d6] hover:bg-[#1e4ec0] border border-white/18 active:scale-[0.98] text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-1.5 transition-transform cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Share</span>
                  </button>
                )}

                {canAdvanceStage && onStagesMap && (
                  <button
                    type="button"
                    onClick={onStagesMap}
                    className="w-full min-h-12 rounded-2xl bg-white/12 border border-white/14 hover:bg-white/18 active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
                  >
                    Stages Map
                  </button>
                )}

                <button
                  type="button"
                  onClick={onHome}
                  className={`w-full min-h-12 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/14 active:scale-[0.98] text-[#cbd8e2] hover:text-white font-bold text-sm sm:text-base transition-transform cursor-pointer ${
                    !showShare && !canAdvanceStage ? '' : ''
                  }`}
                >
                  Home
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onRematch}
                className="w-full min-h-[3.35rem] rounded-2xl bg-[#f0452d] hover:bg-[#e13c24] border border-white/18 active:scale-[0.98] text-white font-display font-extrabold text-lg transition-transform cursor-pointer"
              >
                Rematch
              </button>
              {showShare && (
                <button
                  type="button"
                  onClick={onShareResult}
                  className="w-full min-h-12 rounded-2xl bg-[#2459d6] hover:bg-[#1e4ec0] border border-white/18 active:scale-[0.98] text-white font-bold text-sm sm:text-base inline-flex items-center justify-center gap-2 transition-transform cursor-pointer"
                >
                  <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Share Result Card</span>
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onChangeMode}
                  className="w-full min-h-12 rounded-2xl bg-white/12 border border-white/14 hover:bg-white/18 active:scale-[0.98] text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
                >
                  Change mode
                </button>
                <button
                  type="button"
                  onClick={onHome}
                  className="w-full min-h-12 rounded-2xl bg-white/8 border border-white/10 hover:bg-white/14 active:scale-[0.98] text-[#cbd8e2] hover:text-white font-bold text-sm sm:text-base transition-transform cursor-pointer"
                >
                  Home
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
