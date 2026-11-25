import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Coins, Crown, LocateFixed, Lock, Play, Star, X } from 'lucide-react';
import {
  getHighestUnlockedStageId,
  getTotalStageStars,
  isStagePlayable,
  isWorldUnlocked,
} from '../game/progression';
import { getStageById, STAGES, WORLDS } from '../game/registries';
import { getMalletSkin, getPuckSkin, getTableSkin } from '../game/skins';
import { SaveDataV3, StageConfig, StageStarCount, WorldId } from '../game/types';

interface StagesScreenProps {
  save: SaveDataV3;
  onPlayStage: (stage: StageConfig) => void;
  onBack: () => void;
}

const CARD = 'rounded-2xl bg-[#14202c] border border-white/10';
const PRESS =
  'transition-transform duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const ROUND =
  'w-11 h-11 rounded-full bg-[#14202c] border border-white/15 inline-flex items-center justify-center shrink-0';
const TAG = 'rounded-lg px-2 py-1 text-xs font-bold tabular-nums';

function formatPersonalityLabel(p: StageConfig['personality']): string {
  if (p === 'adaptive_grandmaster') return 'Adaptive AI';
  if (p === 'adaptive_eternal') return 'Eternal AI';
  if (p === 'adaptive_stadium') return 'Stadium AI';
  if (p === 'adaptive_architect') return 'Architect AI';
  if (p === 'adaptive_immortal') return 'Immortal AI';
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function formatDifficultyLabel(d: StageConfig['difficulty']): string {
  return d.charAt(0).toUpperCase() + d.slice(1);
}

function formatWinRule(stage: StageConfig): string {
  if (stage.winCondition === 'sudden_death') return 'Sudden Death';
  if (stage.winCondition === 'timed') return `${stage.timeLimit ?? 90}s Timed`;
  return `First to ${stage.winScore}`;
}

function formatTwoStarRule(stage: StageConfig): string {
  if (stage.winCondition === 'sudden_death') return 'Win the match';
  if (stage.winCondition === 'timed') return 'Win by 2+ goals';
  return `Win conceding <= ${stage.twoStarMaxConceded}`;
}

function formatThreeStarRule(stage: StageConfig): string {
  if (stage.winCondition === 'sudden_death') return 'Win within 45s';
  return 'Shutout (concede 0)';
}

const StarRow = memo(function StarRow({
  stars,
  size = 'sm',
}: {
  stars: StageStarCount;
  size?: 'sm' | 'md';
}) {
  const cls = size === 'md' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`${stars} of 3 stars`}>
      {[1, 2, 3].map((idx) => {
        const earned = stars >= idx;
        return (
          <Star
            key={idx}
            className={`${cls} ${
              earned ? 'text-[#fbbf24] fill-[#fbbf24]' : 'text-white/20 fill-white/10'
            }`}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
});

const MiniArenaSwatch = memo(function MiniArenaSwatch({ stage }: { stage: StageConfig }) {
  const table = getTableSkin(stage.skinOverride.table);
  const puck = getPuckSkin(stage.skinOverride.puck);
  const botMallet = getMalletSkin(stage.skinOverride.botMallet);

  return (
    <div
      className="relative w-12 h-14 rounded-lg overflow-hidden shrink-0 flex items-center justify-center"
      style={{
        backgroundColor: table.surface,
        border: `2.5px solid ${table.rail}`,
      }}
    >
      <div
        className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5"
        style={{ backgroundColor: table.lines }}
      />
      <div
        className="w-3 h-3 rounded-full z-10"
        style={{
          backgroundColor: puck.body,
          border: `1.5px solid ${puck.ring}`,
        }}
      />
      <div
        className="absolute top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full"
        style={{
          backgroundColor: botMallet.p2,
          border: `1.5px solid ${botMallet.ring}`,
        }}
      />
    </div>
  );
});

export const StagesScreen: React.FC<StagesScreenProps> = ({ save, onPlayStage, onBack }) => {
  const totalStars = useMemo(() => getTotalStageStars(save), [save]);
  const highestPlayableId = useMemo(() => getHighestUnlockedStageId(save), [save]);

  const initialWorld = useMemo<WorldId>(() => {
    const st = getStageById(highestPlayableId);
    return st?.world ?? 1;
  }, [highestPlayableId]);

  const [selectedWorld, setSelectedWorld] = useState<WorldId>(initialWorld);
  const [selectedStage, setSelectedStage] = useState<StageConfig | null>(null);
  const worldTabRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const stageCardRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const pendingScrollStageId = useRef<number | null>(null);

  useEffect(() => {
    const btn = worldTabRefs.current[selectedWorld];
    btn?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });

    if (pendingScrollStageId.current !== null) {
      const targetId = pendingScrollStageId.current;
      const raf = window.requestAnimationFrame(() => {
        const card = stageCardRefs.current[targetId];
        if (card) {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          pendingScrollStageId.current = null;
        }
      });
      return () => window.cancelAnimationFrame(raf);
    }
  }, [selectedWorld]);

  const handleJumpToCurrent = () => {
    const targetWorld = getStageById(highestPlayableId)?.world ?? 1;
    pendingScrollStageId.current = highestPlayableId;
    if (selectedWorld !== targetWorld) {
      setSelectedWorld(targetWorld);
    } else {
      stageCardRefs.current[highestPlayableId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      pendingScrollStageId.current = null;
    }
  };

  const worldDef = useMemo(
    () => WORLDS.find((w) => w.id === selectedWorld) ?? WORLDS[0],
    [selectedWorld],
  );

  const worldGate = useMemo(() => isWorldUnlocked(save, selectedWorld), [save, selectedWorld]);

  const worldStages = useMemo(
    () => STAGES.filter((s) => s.world === selectedWorld),
    [selectedWorld],
  );

  const worldStars = useMemo(
    () => worldStages.reduce((sum, s) => sum + (save.stages[s.id]?.stars ?? 0), 0),
    [worldStages, save.stages],
  );

  const worldPreviewSkin = getTableSkin(worldDef.previewTableSkin);

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/95 backdrop-blur-md">
      <div className="w-full max-w-3xl mx-auto shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] flex flex-col gap-2">
        <header className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={`${ROUND} text-white ${PRESS}`}
          >
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display m-0 text-xl font-extrabold italic tracking-tight text-white leading-none">
              Stages
            </h1>
            <div className="mt-1 flex flex-wrap gap-x-2.5 text-xs font-extrabold text-[#fbbf24] leading-tight tabular-nums">
              <span
                className="inline-flex items-center gap-1"
                aria-label={`${totalStars} of ${STAGES.length * 3} stars`}
              >
                <Star className="w-3 h-3 fill-[#fbbf24] shrink-0" aria-hidden="true" />
                {totalStars}/{STAGES.length * 3}
              </span>
              <span className="inline-flex items-center gap-1" aria-label={`${save.coins} coins`}>
                <Coins className="w-3 h-3 shrink-0" aria-hidden="true" />
                {save.coins.toLocaleString()}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleJumpToCurrent}
            aria-label={`Jump to current stage ${highestPlayableId}`}
            className={`h-11 px-3 rounded-full bg-[#0f766e] text-white font-extrabold text-xs inline-flex items-center gap-1.5 shrink-0 tabular-nums ${PRESS}`}
          >
            <LocateFixed className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Stage {highestPlayableId}</span>
          </button>
        </header>

        {/* Scrollable world selector */}
        <div className="flex gap-1.5 overflow-x-auto touch-pan-x [scrollbar-width:none]">
          {WORLDS.map((w) => {
            const active = w.id === selectedWorld;
            const gate = isWorldUnlocked(save, w.id);
            return (
              <button
                key={w.id}
                ref={(el) => {
                  worldTabRefs.current[w.id] = el;
                }}
                type="button"
                onClick={() => setSelectedWorld(w.id)}
                aria-pressed={active}
                className={`h-11 px-3.5 rounded-full text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap border shrink-0 ${PRESS} !outline-offset-[-3px] ${
                  active
                    ? 'bg-white text-[#101922] border-white'
                    : gate.unlocked
                      ? 'bg-[#14202c] border-white/15 text-white'
                      : 'bg-[#14202c]/60 border-white/10 text-[#a9bac6]'
                }`}
              >
                {!gate.unlocked && <Lock className="w-3 h-3 shrink-0" aria-label="Locked" />}
                World {w.id}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto flex flex-col gap-2.5 pt-0.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
          {/* World overview */}
          <div className={`${CARD} p-3`}>
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
                style={{
                  backgroundColor: worldPreviewSkin.surface,
                  border: `2.5px solid ${worldPreviewSkin.rail}`,
                }}
                aria-hidden="true"
              >
                <div
                  className="w-4 h-4 rounded-full border-2"
                  style={{ borderColor: worldPreviewSkin.lines }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-display font-extrabold text-sm text-white leading-tight">
                  {worldDef.name}
                </div>
                <div className="mt-0.5 text-xs text-[#b8c7d3] leading-snug">
                  {worldDef.subtitle}
                </div>
              </div>
              <div className="text-sm font-extrabold text-[#fbbf24] shrink-0 tabular-nums">
                {worldStars}/{worldStages.length * 3} ★
              </div>
            </div>
            <div
              className="mt-2.5 h-1.5 rounded-full bg-white/12 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-[#fbbf24]"
                style={{
                  width: `${Math.round((worldStars / Math.max(1, worldStages.length * 3)) * 100)}%`,
                }}
              />
            </div>
          </div>

          {!worldGate.unlocked && (
            <div className="rounded-2xl bg-[#f59e0b]/18 border border-[#f59e0b]/40 p-3.5 text-sm text-[#fde68a]">
              <div className="font-extrabold flex items-center gap-1.5">
                <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {worldGate.gateStageId
                    ? `Earn ${worldGate.starsRequired} total stars or beat Stage ${worldGate.gateStageId} to unlock ${worldDef.name}`
                    : `Earn ${worldGate.starsRequired} total stars to unlock ${worldDef.name}`}
                </span>
              </div>
              <div className="mt-1 text-xs text-[#fcd34d] tabular-nums">
                Current total: {worldGate.totalStars}/{worldGate.starsRequired} ★ (
                {Math.max(0, worldGate.starsRequired - worldGate.totalStars)} more needed)
              </div>
            </div>
          )}

          {/* Responsive stage grid: 2 cols portrait, 3 cols small landscape/tablet, 5 cols wide */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {worldStages.map((stage) => {
              const playable = isStagePlayable(save, stage);
              const prog = save.stages[stage.id];
              const stars = prog?.stars ?? 0;
              const isFrontier = playable && stars === 0 && stage.id === highestPlayableId;
              const tableSkin = getTableSkin(stage.skinOverride.table);

              return (
                <button
                  key={stage.id}
                  ref={(el) => {
                    stageCardRefs.current[stage.id] = el;
                  }}
                  type="button"
                  disabled={!playable}
                  onClick={() => playable && setSelectedStage(stage)}
                  className={`relative min-w-0 min-h-[5.75rem] p-2.5 rounded-2xl text-left flex flex-col justify-between border transition ${
                    playable
                      ? `bg-[#14202c] hover:bg-[#1e2f40] active:scale-[0.98] cursor-pointer ${
                          isFrontier ? 'border-[#f0452d] ring-2 ring-[#f0452d]' : 'border-white/10'
                        }`
                      : 'bg-[#14202c]/55 border-white/8 opacity-65 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 w-full">
                    <div className="inline-flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 border border-white/30"
                        style={{ backgroundColor: tableSkin.p1Banner }}
                        aria-hidden="true"
                      />
                      <span className="text-xs font-extrabold text-[#b8c7d3] tabular-nums truncate">
                        STG {stage.id}
                      </span>
                    </div>
                    {stage.isBoss ? (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-extrabold text-[#fbbf24] shrink-0">
                        <Crown className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>BOSS</span>
                      </span>
                    ) : !playable ? (
                      <Lock className="w-3.5 h-3.5 text-[#b8c7d3] shrink-0" aria-hidden="true" />
                    ) : null}
                  </div>

                  <div className="my-1 font-display font-extrabold text-sm leading-snug text-white line-clamp-2">
                    {stage.name}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-1 w-full">
                    {playable ? (
                      <>
                        <StarRow stars={stars} />
                        <span className="text-[11px] font-bold text-[#b8c7d3] tabular-nums">
                          {formatWinRule(stage)}
                        </span>
                      </>
                    ) : (
                      <span className="text-[11px] font-semibold text-[#b8c7d3]">
                        {!worldGate.unlocked
                          ? worldGate.gateStageId
                            ? `${worldGate.starsRequired}★ or STG ${worldGate.gateStageId}`
                            : `Need ${worldGate.starsRequired}★`
                          : `Beat Stage ${stage.id - 1}`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stage detail sheet */}
      {selectedStage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stage-sheet-title"
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm pt-[max(0.75rem,env(safe-area-inset-top))] sm:pb-3"
          onClick={() => setSelectedStage(null)}
        >
          <div
            className="w-full max-w-md max-h-full flex flex-col rounded-t-3xl sm:rounded-3xl bg-[#14202c] border border-white/15 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-h-0 overflow-y-auto overscroll-contain touch-pan-y p-4 pb-1">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <MiniArenaSwatch stage={selectedStage} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-extrabold text-[#fbbf24] tabular-nums">
                      <span>STAGE {selectedStage.id}</span>
                      {selectedStage.isBoss && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-[#fbbf24]/20 px-1.5 py-0.5 text-[#fbbf24]">
                          <Crown className="w-3 h-3" aria-hidden="true" />
                          BOSS
                        </span>
                      )}
                    </div>
                    <h2
                      id="stage-sheet-title"
                      className="font-display m-0 text-xl font-extrabold text-white leading-tight [text-wrap:balance]"
                    >
                      {selectedStage.name}
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStage(null)}
                  aria-label="Close stage details"
                  className="min-h-12 min-w-12 -mt-1 -mr-1 rounded-2xl text-[#b8c7d3] hover:text-white hover:bg-white/12 inline-flex items-center justify-center transition cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>

              <p className="m-0 mb-2.5 text-sm text-[#dbe6ee] leading-snug">
                {selectedStage.twist}
              </p>

              {/* Concise rule tags */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`${TAG} bg-white/12 text-white`}>
                  {formatWinRule(selectedStage)}
                </span>
                <span className={`${TAG} bg-white/12 text-[#e9f1f4]`}>
                  {formatDifficultyLabel(selectedStage.difficulty)} ·{' '}
                  {formatPersonalityLabel(selectedStage.personality)}
                </span>
                {selectedStage.obstacleLayoutId && (
                  <span className={`${TAG} bg-white/12 text-[#e9f1f4]`}>Bumpers ON</span>
                )}
                {!selectedStage.powerups && (
                  <span className={`${TAG} bg-white/12 text-[#b8c7d3]`}>No Power-ups</span>
                )}
                {selectedStage.alwaysDoublePuck && (
                  <span className={`${TAG} bg-[#a855f7]/25 text-[#e9d5ff]`}>Double Puck</span>
                )}
                {selectedStage.matchPointDoublePuck && (
                  <span className={`${TAG} bg-[#a855f7]/25 text-[#e9d5ff]`}>
                    Match-Point 2x Puck
                  </span>
                )}
                {selectedStage.doublePuckAtScore !== undefined && (
                  <span className={`${TAG} bg-[#a855f7]/25 text-[#e9d5ff]`}>
                    {selectedStage.doublePuckAtScore}+ Goals: 2x Puck
                  </span>
                )}
                {selectedStage.puckSpeedMult !== 1 && (
                  <span className={`${TAG} bg-[#f59e0b]/20 text-[#fde68a]`}>
                    {selectedStage.puckSpeedMult}x Speed
                  </span>
                )}
              </div>

              {/* Star criteria */}
              <div className="rounded-2xl bg-[#0d151e]/85 border border-white/10 p-3 mb-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#fbbf24]">★☆☆ 1 Star</span>
                  <span className="text-[#dbe6ee]">Win the match</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#fbbf24]">★★☆ 2 Stars</span>
                  <span className="text-[#dbe6ee] tabular-nums">
                    {formatTwoStarRule(selectedStage)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#fbbf24]">★★★ 3 Stars</span>
                  <span className="text-[#dbe6ee] tabular-nums">
                    {formatThreeStarRule(selectedStage)}
                  </span>
                </div>
              </div>

              {/* Rewards summary */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold mb-2 px-1">
                <span className="text-[#fbbf24] inline-flex items-center gap-1 tabular-nums">
                  <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {(save.stages[selectedStage.id]?.stars ?? 0) > 0
                    ? `Replay: +${Math.max(5, Math.round(selectedStage.coinReward * 0.25))} coins`
                    : `First clear: +${selectedStage.coinReward} coins`}
                </span>
                {selectedStage.unlockRewards && selectedStage.unlockRewards.length > 0 && (
                  <span className="text-[#6ee7b7]">
                    Unlocks {selectedStage.unlockRewards.map((r) => r.name).join(', ')}
                  </span>
                )}
              </div>
            </div>

            <div className="shrink-0 p-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  const st = selectedStage;
                  setSelectedStage(null);
                  onPlayStage(st);
                }}
                className="w-full min-h-12 rounded-2xl bg-[#c9301a] hover:bg-[#b02a16] active:scale-[0.98] text-white font-display font-extrabold text-[clamp(1.05rem,3vw,1.2rem)] inline-flex items-center justify-center gap-2 transition-transform cursor-pointer whitespace-nowrap shadow-md"
              >
                <Play className="w-5 h-5 fill-current shrink-0" aria-hidden="true" />
                <span>Play Stage {selectedStage.id}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};