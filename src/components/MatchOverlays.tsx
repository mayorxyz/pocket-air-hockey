import React from 'react';
import { Award, Coins, Crown, Lock, RotateCcw, Share2, Star } from 'lucide-react';
import { getStageContinueCost, MAX_CONTINUES_PER_MATCH } from '../game/progression';
import { ACHIEVEMENTS } from '../game/registries';
import { MatchResult, MatchSummary, PlayerStats, Score, StageConfig } from '../game/types';

const PRESS =
  'transition-transform duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const BUTTON = `w-full min-w-0 min-h-11 px-3 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1.5 ${PRESS}`;
const PRIMARY = `${BUTTON} !min-h-12 bg-[#c9301a] hover:bg-[#b02a16] text-white font-display !text-lg !font-extrabold`;
const SECONDARY = `${BUTTON} bg-white/12 hover:bg-white/18 text-white`;
const QUIET = `${BUTTON} bg-white/6 hover:bg-white/12 text-[#cbd8e2]`;
const EYEBROW = 'mb-1 text-xs font-extrabold uppercase tracking-wide text-[#fbbf24] tabular-nums';
const TITLE =
  'font-display m-0 text-3xl leading-none font-extrabold italic tracking-tight text-white [text-wrap:balance]';

/** Centered dialog: the body scrolls on short screens, the actions stay visible. */
function Overlay({
  label,
  highlight = false,
  actions,
  children,
}: {
  label: string;
  highlight?: boolean;
  actions: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#0d151e]/90 backdrop-blur-md pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]"
    >
      <div
        className={`w-full max-w-sm max-h-full flex flex-col rounded-3xl bg-[#14202c] border text-center shadow-2xl ${
          highlight ? 'border-[#fbbf24]/70 ring-2 ring-[#fbbf24]/40' : 'border-white/15'
        }`}
      >
        <div className="min-h-0 overflow-y-auto overscroll-contain p-4 pb-1">{children}</div>
        <div className="shrink-0 p-4 pt-3 flex flex-col gap-2">{actions}</div>
      </div>
    </div>
  );
}

function ScoreLine({ player, opponent }: { player: number; opponent: number }) {
  return (
    <div className="font-display text-5xl font-extrabold tracking-tight leading-none tabular-nums">
      <span className="text-[#ff8a76]">{player}</span>
      <span className="mx-3 text-white/50">:</span>
      <span className="text-[#7ea2ff]">{opponent}</span>
    </div>
  );
}

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
    <Overlay
      label="Paused"
      actions={
        <>
          <button type="button" onClick={onResume} className={PRIMARY}>
            Resume
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onRestart} className={SECONDARY}>
              Restart
            </button>
            <button type="button" onClick={onOpenSettings} className={SECONDARY}>
              Settings
            </button>
          </div>
          <button type="button" onClick={onRequestQuit} className={QUIET}>
            Quit to Home
          </button>
        </>
      }
    >
      {stageLabel && <div className={EYEBROW}>{stageLabel}</div>}
      <h1 className={TITLE}>Paused</h1>
      <div className="mt-3">
        {isPractice ? (
          <p className="m-0 text-2xl font-extrabold text-[#b8c7d3] tabular-nums">
            {practiceHits} hits
          </p>
        ) : (
          <ScoreLine player={score.p} opponent={score.a} />
        )}
      </div>
    </Overlay>
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
    <Overlay
      label="Continue match?"
      actions={
        <>
          {noContinuesLeft ? (
            <button type="button" onClick={onRestartStage} className={PRIMARY}>
              Restart Stage
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => canAfford && onContinue(cost)}
                className={`w-full min-h-12 px-3 py-1.5 rounded-xl font-display font-extrabold text-base flex flex-col items-center justify-center tabular-nums ${
                  canAfford
                    ? `bg-[#f59e0b] hover:bg-[#d97706] text-[#101922] ${PRESS}`
                    : 'bg-white/10 text-white/60 cursor-not-allowed'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Continue ({cost} Coins)</span>
                </span>
                {!canAfford && (
                  <span className="text-xs font-bold text-[#fbbf24]">+{needed} needed</span>
                )}
              </button>
              <button type="button" onClick={onRestartStage} className={SECONDARY}>
                Restart Stage
              </button>
            </>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={onStagesMap} className={SECONDARY}>
              Stages Map
            </button>
            <button type="button" onClick={onHome} className={QUIET}>
              Home
            </button>
          </div>
        </>
      }
    >
      <div className={EYEBROW}>
        Stage {stage.id} · {stage.name}
      </div>
      <h1 className={`${TITLE} mb-3`}>Continue Match?</h1>
      <ScoreLine player={result.playerScore} opponent={result.opponentScore} />
      <p className="my-2.5 text-sm text-[#b8c7d3] leading-snug">
        {noContinuesLeft ? 'No continues left for this attempt.' : effectHint}
      </p>
      <dl className="m-0 rounded-xl bg-[#0e1720] border border-white/10 p-3 text-left text-xs font-bold text-[#cbd8e2] space-y-1.5 tabular-nums">
        <div className="flex justify-between gap-2">
          <dt>Your coins</dt>
          <dd className="m-0 text-[#fbbf24]">{coins}</dd>
        </div>
        {!noContinuesLeft && (
          <div className="flex justify-between gap-2">
            <dt>Second Wind cost</dt>
            <dd className="m-0 text-[#fbbf24]">{cost} coins</dd>
          </div>
        )}
        <div className="flex justify-between gap-2">
          <dt>Continues used</dt>
          <dd className="m-0 text-white">
            {continuesUsed} / {MAX_CONTINUES_PER_MATCH}
          </dd>
        </div>
      </dl>
      <p className="m-0 mt-2 text-xs font-bold text-[#fde68a]">Continuing limits you to 1★</p>
    </Overlay>
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
    onNextStage,
  );

  const showShare = Boolean(
    onShareResult &&
    (result.won || (stageOutcome && (stageOutcome.isFirstClear || stageOutcome.nextStageUnlocked))),
  );

  return (
    <Overlay
      label={title}
      highlight={isLegendFinale}
      actions={
        <>
          {canAdvanceStage ? (
            <button
              type="button"
              onClick={() => onNextStage?.(stageOutcome!.nextStageId!)}
              className={PRIMARY}
            >
              Next Stage ({stageOutcome!.nextStageId})
            </button>
          ) : (
            <button type="button" onClick={onRematch} className={PRIMARY}>
              {stageOutcome ? 'Retry Stage' : 'Rematch'}
            </button>
          )}
          {/* a lone last button stretches across both columns */}
          <div className="grid grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2">
            {canAdvanceStage && (
              <button type="button" onClick={onRematch} className={SECONDARY}>
                Retry Stage
              </button>
            )}
            {stageOutcome && onStagesMap && (
              <button type="button" onClick={onStagesMap} className={SECONDARY}>
                Stages Map
              </button>
            )}
            {!stageOutcome && (
              <button type="button" onClick={onChangeMode} className={SECONDARY}>
                Change mode
              </button>
            )}
            {showShare && (
              <button
                type="button"
                onClick={onShareResult}
                className={`${BUTTON} bg-[#2459d6] hover:bg-[#1e4ec0] text-white`}
              >
                <Share2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Share</span>
              </button>
            )}
            <button type="button" onClick={onHome} className={QUIET}>
              Home
            </button>
          </div>
        </>
      }
    >
      {stageOutcome && (
        <div className={EYEBROW}>
          {isLegendFinale
            ? 'Final Boss Cleared · 100/100 Campaign Complete'
            : `Stage ${stageOutcome.stageId} · ${stageOutcome.stageName}`}
        </div>
      )}

      <h1 className={`${TITLE} mb-2.5`}>{title}</h1>

      {stageOutcome && (
        <div className="flex flex-col items-center gap-1.5 mb-2.5">
          <div
            className="flex items-center justify-center gap-2"
            aria-label={`Earned ${stageOutcome.starsEarned} of 3 stars`}
          >
            {[1, 2, 3].map((idx) => {
              const earned = stageOutcome.starsEarned >= idx;
              return (
                <Star
                  key={idx}
                  className={`w-8 h-8 ${reduceMotion ? '' : 'transition-transform duration-300'} ${
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

      <ScoreLine player={result.playerScore} opponent={result.opponentScore} />

      <p className="mt-2 mb-2.5 text-xs text-[#b8c7d3] tabular-nums">
        Streak {stats.currentStreak} · Wins {stats.wins} · Losses {stats.losses}
      </p>

      {stageOutcome?.starRequirementNote && (
        <div className="mb-2.5 rounded-xl bg-[#f59e0b]/18 border border-[#f59e0b]/40 p-3 text-left text-xs font-bold text-[#fde68a] flex items-center gap-2">
          <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{stageOutcome.starRequirementNote}</span>
        </div>
      )}

      {coins.total > 0 && (
        <div className="mb-2.5 rounded-xl bg-[#0e1720] border border-white/10 p-3 text-left">
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
        <div className="mb-2.5 rounded-xl bg-[#10b981]/18 border border-[#10b981]/40 p-3 text-left space-y-1">
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
          {Boolean(stageOutcome?.duplicateRewardBonusCoins) && (
            <div className="text-xs font-bold text-[#fde68a] tabular-nums">
              +{stageOutcome?.duplicateRewardBonusCoins} coins (Boss skins already owned)
            </div>
          )}
        </div>
      )}
    </Overlay>
  );
};