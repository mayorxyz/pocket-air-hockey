import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronLeft, Coins, Crown, LocateFixed, Lock, Play, Star, X } from 'lucide-react';
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

const CARD = 'rounded-2xl bg-[#14202c]/95 border border-white/14 shadow-lg';
const PRESS = 'transition-transform duration-150 active:scale-[0.97] cursor-pointer';

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

const MiniArenaSwatch = memo(function MiniArenaSwatch({
  stage,
}: {
  stage: StageConfig;
}) {
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
    [selectedWorld]
  );

  const worldGate = useMemo(
    () => isWorldUnlocked(save, selectedWorld),
    [save, selectedWorld]
  );

  const worldStages = useMemo(
    () => STAGES.filter((s) => s.world === selectedWorld),
    [selectedWorld]
  );

  const worldStars = useMemo(
    () => worldStages.reduce((sum, s) => sum + (save.stages[s.id]?.stars ?? 0), 0),
    [worldStages, save.stages]
  );

  const worldPreviewSkin = getTableSkin(worldDef.previewTableSkin);

  return (
    <div
      style={{
        paddingLeft: 'max(1rem, env(safe-area-inset-left))',
        paddingRight: 'max(1rem, env(safe-area-inset-right))',
      }}
      className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/90 backdrop-blur-md overflow-hidden"
    >
      <header
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
        className="w-full max-w-[min(100%,46rem)] mx-auto pb-3 flex flex-wrap items-center justify-between gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 min-w-12 px-3 rounded-2xl bg-white/12 border border-white/15 hover:bg-white/18 text-white font-bold text-sm sm:text-base inline-flex items-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer whitespace-nowrap"
        >
          <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Back</span>
        </button>

        <h1 className="font-display m-0 text-[clamp(1.35rem,4.5vw,1.75rem)] font-extrabold italic tracking-tight text-white [text-wrap:balance]">
          Stages
        </h1>

        <div className="flex items-center gap-1.5 shrink-0">
          <div className="min-h-11 px-2.5 rounded-xl bg-[#14202c] border border-[#fbbf24]/30 inline-flex items-center gap-1 text-xs sm:text-sm font-extrabold text-[#fbbf24] tabular-nums">
            <Star className="w-4 h-4 fill-[#fbbf24] shrink-0" aria-hidden="true" />
            <span>
              {totalStars}/{STAGES.length * 3}
            </span>
          </div>
          <div className="min-h-11 px-2.5 rounded-xl bg-[#14202c] border border-[#fbbf24]/30 inline-flex items-center gap-1 text-xs sm:text-sm font-extrabold text-[#fbbf24] tabular-nums">
            <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{save.coins}</span>
          </div>
        </div>
      </header>

      <div
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        className="flex-1 w-full max-w-[min(100%,46rem)] mx-auto safe-scroll pt-1 space-y-3"
      >
        {/* Campaign progress bar & quick Jump to Current */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs sm:text-sm font-bold text-[#b8c7d3] tabular-nums">
            Campaign Progress:{' '}
            <span className="text-white font-extrabold">
              Stage {highestPlayableId}/{STAGES.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleJumpToCurrent}
            aria-label={`Jump to current stage ${highestPlayableId}`}
            className={`min-h-12 px-3.5 rounded-xl bg-[#0d9488]/25 hover:bg-[#0d9488]/40 border border-[#0d9488]/55 text-[#5eead4] font-bold text-xs sm:text-sm inline-flex items-center gap-1.5 ${PRESS}`}
          >
            <LocateFixed className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Jump to Current (STG {highestPlayableId})</span>
          </button>
        </div>

        {/* Scrollable world selector tabs */}
        <div className="flex md:grid md:grid-cols-5 gap-2 overflow-x-auto pb-1 touch-pan-x">
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
                className={`min-h-14 min-w-[6.25rem] md:min-w-0 px-2.5 py-2 rounded-2xl text-center flex flex-col items-center justify-center gap-0.5 border shrink-0 ${PRESS} ${
                  active
                    ? 'bg-white text-[#101922] border-[#f0452d] ring-2 ring-[#f0452d]/60'
                    : gate.unlocked
                      ? 'bg-[#14202c]/95 border-white/14 text-white hover:bg-[#1e2f40]'
                      : 'bg-[#14202c]/70 border-white/10 text-[#b8c7d3] hover:bg-[#14202c]/90'
                }`}
              >
                <span className="text-xs sm:text-sm font-extrabold leading-tight inline-flex items-center gap-1 whitespace-nowrap">
                  {active && <Check className="w-3.5 h-3.5 text-[#f0452d] shrink-0" aria-hidden="true" />}
                  {!gate.unlocked && <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />}
                  <span>World {w.id}</span>
                </span>
                <span
                  className={`text-[11px] font-bold leading-tight truncate max-w-full ${
                    active ? 'text-[#101922]/80' : 'text-[#b8c7d3]'
                  }`}
                >
                  {gate.unlocked ? w.name.split(' ')[0] : `${w.starsRequired}★`}
                </span>
              </button>
            );
          })}
        </div>

        {/* World overview card */}
        <div className={`${CARD} p-3.5 flex items-center justify-between gap-3`}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
              style={{
                backgroundColor: worldPreviewSkin.surface,
                border: `2.5px solid ${worldPreviewSkin.rail}`,
              }}
            >
              <div
                className="w-4 h-4 rounded-full border-2"
                style={{ borderColor: worldPreviewSkin.lines }}
              />
            </div>
            <div className="min-w-0">
              <div className="font-display font-extrabold text-base sm:text-lg text-white leading-tight truncate">
                {worldDef.name}
              </div>
              <div className="text-xs sm:text-sm text-[#b8c7d3] truncate">{worldDef.subtitle}</div>
            </div>
          </div>
          <div className="text-right shrink-0 tabular-nums">
            <div className="text-sm font-extrabold text-[#fbbf24]">
              {worldStars}/{worldStages.length * 3} ★
            </div>
            <div className="text-xs font-semibold text-[#b8c7d3]">
              {worldStages.length} stages
            </div>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
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
                className={`relative min-h-[6.5rem] p-3 rounded-2xl text-left flex flex-col justify-between border transition ${
                  playable
                    ? `bg-[#14202c]/95 hover:bg-[#1e2f40] active:scale-[0.98] cursor-pointer ${
                        isFrontier
                          ? 'border-[#f0452d] ring-2 ring-[#f0452d]'
                          : 'border-white/14'
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

                <div className="my-1.5 font-display font-extrabold text-sm sm:text-[15px] leading-snug text-white line-clamp-2">
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

      {/* Stage detail sheet */}
      {selectedStage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="stage-sheet-title"
          className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm safe-shell"
          onClick={() => setSelectedStage(null)}
        >
          <div
            className="w-full max-w-[min(100%,26rem)] max-h-[90dvh] overflow-y-auto overscroll-contain touch-pan-y rounded-3xl bg-[#14202c] border border-white/16 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
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

            <p className="m-0 mb-3 text-sm text-[#dbe6ee]">{selectedStage.twist}</p>

            {/* Concise rule tags */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <span className="rounded-lg bg-white/12 px-2.5 py-1 text-xs font-bold text-white">
                {formatWinRule(selectedStage)}
              </span>
              <span className="rounded-lg bg-white/12 px-2.5 py-1 text-xs font-bold text-[#e9f1f4]">
                {formatDifficultyLabel(selectedStage.difficulty)} ·{' '}
                {formatPersonalityLabel(selectedStage.personality)}
              </span>
              {selectedStage.obstacleLayoutId && (
                <span className="rounded-lg bg-white/12 px-2.5 py-1 text-xs font-bold text-[#e9f1f4]">
                  Bumpers ON
                </span>
              )}
              {!selectedStage.powerups && (
                <span className="rounded-lg bg-white/12 px-2.5 py-1 text-xs font-bold text-[#b8c7d3]">
                  No Power-ups
                </span>
              )}
              {selectedStage.alwaysDoublePuck && (
                <span className="rounded-lg bg-[#a855f7]/25 px-2.5 py-1 text-xs font-bold text-[#e9d5ff]">
                  Double Puck
                </span>
              )}
              {selectedStage.matchPointDoublePuck && (
                <span className="rounded-lg bg-[#a855f7]/25 px-2.5 py-1 text-xs font-bold text-[#e9d5ff]">
                  Match-Point 2x Puck
                </span>
              )}
              {selectedStage.doublePuckAtScore !== undefined && (
                <span className="rounded-lg bg-[#a855f7]/25 px-2.5 py-1 text-xs font-bold text-[#e9d5ff]">
                  {selectedStage.doublePuckAtScore}+ Goals: 2x Puck
                </span>
              )}
              {selectedStage.puckSpeedMult !== 1 && (
                <span className="rounded-lg bg-[#f59e0b]/20 px-2.5 py-1 text-xs font-bold text-[#fde68a] tabular-nums">
                  {selectedStage.puckSpeedMult}x Speed
                </span>
              )}
            </div>

            {/* Star criteria */}
            <div className="rounded-2xl bg-[#0d151e]/85 border border-white/10 p-3 mb-4 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#fbbf24]">★☆☆ 1 Star</span>
                <span className="text-[#dbe6ee]">Win the match</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#fbbf24]">★★☆ 2 Stars</span>
                <span className="text-[#dbe6ee] tabular-nums">{formatTwoStarRule(selectedStage)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="font-bold text-[#fbbf24]">★★★ 3 Stars</span>
                <span className="text-[#dbe6ee] tabular-nums">{formatThreeStarRule(selectedStage)}</span>
              </div>
            </div>

            {/* Rewards summary */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold mb-4 px-1">
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

            <button
              type="button"
              onClick={() => {
                const st = selectedStage;
                setSelectedStage(null);
                onPlayStage(st);
              }}
              className="w-full min-h-[3.375rem] rounded-2xl bg-[#f0452d] hover:bg-[#e13c24] border border-white/18 active:scale-[0.98] text-white font-display font-extrabold text-[clamp(1.05rem,3vw,1.2rem)] inline-flex items-center justify-center gap-2 transition-transform cursor-pointer whitespace-nowrap shadow-md"
            >
              <Play className="w-5 h-5 fill-current shrink-0" aria-hidden="true" />
              <span>Play Stage {selectedStage.id}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
