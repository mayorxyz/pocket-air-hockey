import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Award, Check, ChevronLeft, Gift, Lock, Trophy } from 'lucide-react';
import { ACHIEVEMENTS, CHALLENGES } from '../game/registries';
import { getArenaCrateStatus, getDailyLoginReward } from '../game/progression';
import { PlayerStats, SaveDataV3 } from '../game/types';

interface AchievementsScreenProps {
  stats: PlayerStats;
  save: SaveDataV3;
  unlocked: Record<string, string>;
  onClaimCrate: () => void;
  onClaimDailyTask: (taskId: string) => void;
  onBack: () => void;
}

const STREAK_DAYS = 7;
const CARD = 'rounded-2xl bg-[#14202c] border border-white/10';
const PRESS =
  'transition-transform duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
const GOLD_BUTTON = `h-11 px-3.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#101922] font-display font-extrabold text-sm shrink-0 tabular-nums ${PRESS}`;

const RARITY_MEDAL_STYLES: Record<string, { 
  medalGradient: string; 
  ribbonColor: string; 
  ribbonText: string;
  glowColor: string;
  label: string;
  lockedGradient: string;
}> = {
  common: { 
    medalGradient: 'from-emerald-400 via-emerald-500 to-emerald-700', 
    ribbonColor: 'bg-emerald-600', 
    ribbonText: 'text-emerald-100',
    glowColor: 'shadow-emerald-500/50',
    label: 'COMMON',
    lockedGradient: 'from-slate-500 via-slate-600 to-slate-700'
  },
  rare: { 
    medalGradient: 'from-cyan-400 via-cyan-500 to-cyan-700', 
    ribbonColor: 'bg-cyan-600', 
    ribbonText: 'text-cyan-100',
    glowColor: 'shadow-cyan-500/50',
    label: 'RARE',
    lockedGradient: 'from-slate-500 via-slate-600 to-slate-700'
  },
  mystic: { 
    medalGradient: 'from-purple-400 via-purple-500 to-purple-700', 
    ribbonColor: 'bg-purple-600', 
    ribbonText: 'text-purple-100',
    glowColor: 'shadow-purple-500/50',
    label: 'MYSTIC',
    lockedGradient: 'from-slate-500 via-slate-600 to-slate-700'
  },
  legendary: { 
    medalGradient: 'from-amber-300 via-amber-500 to-amber-700', 
    ribbonColor: 'bg-amber-600', 
    ribbonText: 'text-amber-100',
    glowColor: 'shadow-amber-500/60',
    label: 'LEGENDARY',
    lockedGradient: 'from-slate-500 via-slate-600 to-slate-700'
  },
};

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const shown = Math.min(value, max);
  return (
    <div className="mt-2 flex items-center gap-2">
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={shown}
        className="flex-1 h-1.5 rounded-full bg-white/12 overflow-hidden"
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${Math.min(100, Math.round((shown / max) * 100))}%` }}
        />
      </div>
      <span className="text-xs font-bold text-[#dbe6ee] tabular-nums shrink-0">
        {shown}/{max}
      </span>
    </div>
  );
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function MedalEmblem({ 
  ach, 
  isUnlocked, 
  current 
}: { 
  ach: typeof ACHIEVEMENTS[0]; 
  isUnlocked: boolean; 
  current: number;
}) {
  const rarity = (ach as any).rarity || 'common';
  const style = RARITY_MEDAL_STYLES[rarity];
  const Icon = isUnlocked ? Award : Lock;

  return (
    <div className="flex flex-col items-center gap-2 p-3">
      {/* Medal Container */}
      <div className="relative flex flex-col items-center">
        {/* Ribbon Banner */}
        <div className={`relative z-10 ${style.ribbonColor} px-3 py-0.5 rounded-t-lg mb-[-8px]`}>
          <span className={`text-[9px] font-black tracking-wider ${style.ribbonText}`}>
            {style.label}
          </span>
        </div>

        {/* Medal Disc */}
        <div 
          className={`relative w-20 h-20 rounded-full border-4 ${
            isUnlocked 
              ? `bg-gradient-to-br ${style.medalGradient} border-white/30 shadow-xl ${style.glowColor}` 
              : `bg-gradient-to-br ${style.lockedGradient} border-white/10`
          } flex items-center justify-center transition-all duration-300`}
        >
          {/* Inner shine effect */}
          {isUnlocked && (
            <div className="absolute inset-1 rounded-full bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
          )}
          
          {/* Icon */}
          <Icon 
            className={`w-9 h-9 relative z-10 ${
              isUnlocked ? 'text-white drop-shadow-lg' : 'text-white/40'
            }`} 
            aria-hidden="true" 
          />

          {/* Points badge */}
          <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${
            isUnlocked 
              ? 'bg-white text-[#101922] shadow-lg' 
              : 'bg-white/20 text-white/60'
          }`}>
            {ach.points ?? 0}
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className="text-center w-full mt-2">
        <div className={`font-display font-extrabold text-sm leading-tight mb-1 ${
          isUnlocked ? 'text-white' : 'text-white/60'
        }`}>
          {ach.name}
        </div>
        <p className="text-[11px] text-[#b8c7d3] leading-snug line-clamp-2 mb-2">
          {ach.desc}
        </p>
        
        {/* Progress bar for locked achievements with target */}
        {ach.target && !isUnlocked && (
          <ProgressBar value={current} max={ach.target} color="bg-[#f0452d]" />
        )}

        {/* Status */}
        {isUnlocked && (
          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1">
            <Check className="w-3 h-3" />
            Unlocked
          </div>
        )}
      </div>
    </div>
  );
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  stats,
  save,
  unlocked,
  onClaimCrate,
  onClaimDailyTask,
  onBack,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [burst, setBurst] = useState<number | null>(null);
  const [tab, setTab] = useState<'awards' | 'achievements'>('awards');

  const burstTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(burstTimer.current);
    };
  }, []);

  const unlockedCount = ACHIEVEMENTS.filter((a) => Boolean(unlocked[a.id])).length;
  const streakStatus = useMemo(() => getArenaCrateStatus(save, nowMs), [save, nowMs]);
  const currentDay = Math.max(1, streakStatus.nextStreak);
  const windowStart = currentDay <= STREAK_DAYS ? 1 : currentDay - 3;

  const dailyTasks = save.dailyTasks.tasks.flatMap((task) => {
    const def = CHALLENGES.find((c) => c.id === task.id);
    return def ? [{ def, task }] : [];
  });
  const tasksClaimed = dailyTasks.filter(({ task }) => task.claimed).length;

  const handleClaim = () => {
    if (!streakStatus.ready) return;
    const amount = streakStatus.rewardCoins;
    onClaimCrate();
    setNowMs(Date.now());
    setBurst(amount);
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurst(null), 1800);
  };
  
  const RARITY_MEDAL_STYLES: Record<
  string,
  {
    rimGradient: string;
    faceGradient: string;
    ribbonGradient: string;
    ribbonText: string;
    glowColor: string;
    ringBorder: string;
    label: string;
  }
> = {
  common: {
    // Brushed Bronze / Emerald Enamel
    rimGradient: 'from-[#6ee7b7] via-[#059669] to-[#064e3b]',
    faceGradient: 'from-[#047857] via-[#10b981] to-[#022c22]',
    ribbonGradient: 'from-[#065f46] via-[#059669] to-[#064e3b]',
    ribbonText: 'text-emerald-100',
    glowColor: 'shadow-[0_10px_25px_-5px_rgba(16,185,129,0.5)]',
    ringBorder: 'border-emerald-300/60',
    label: 'COMMON',
  },
  rare: {
    // Anodized Cobalt / Sapphire
    rimGradient: 'from-[#bae6fd] via-[#0284c7] to-[#0c4a6e]',
    faceGradient: 'from-[#0369a1] via-[#38bdf8] to-[#082f49]',
    ribbonGradient: 'from-[#075985] via-[#0284c7] to-[#0c4a6e]',
    ribbonText: 'text-sky-100',
    glowColor: 'shadow-[0_10px_25px_-5px_rgba(56,189,248,0.5)]',
    ringBorder: 'border-sky-300/60',
    label: 'RARE',
  },
  mystic: {
    // Amethyst / Royal Chrome
    rimGradient: 'from-[#f3e8ff] via-[#9333ea] to-[#3b0764]',
    faceGradient: 'from-[#6b21a8] via-[#c084fc] to-[#2e1065]',
    ribbonGradient: 'from-[#581c87] via-[#7e22ce] to-[#3b0764]',
    ribbonText: 'text-purple-100',
    glowColor: 'shadow-[0_10px_25px_-5px_rgba(168,85,247,0.55)]',
    ringBorder: 'border-purple-300/60',
    label: 'MYSTIC',
  },
  legendary: {
    // 24k Minted Gold (sharp highlight -> rich gold -> deep shadow -> warm bounce)
    rimGradient: 'from-[#fef08a] via-[#eab308] to-[#713f12]',
    faceGradient: 'from-[#ca8a04] via-[#facc15] to-[#422006]',
    ribbonGradient: 'from-[#991b1b] via-[#dc2626] to-[#7f1d1d]', // Classic royal crimson ribbon for gold medals
    ribbonText: 'text-amber-100',
    glowColor: 'shadow-[0_10px_28px_-4px_rgba(251,191,36,0.65)]',
    ringBorder: 'border-amber-200/80',
    label: 'LEGENDARY',
  },
};

function MedalEmblem({
  ach,
  isUnlocked,
  current,
}: {
  ach: (typeof ACHIEVEMENTS)[0];
  isUnlocked: boolean;
  current: number;
}) {
  const rarity = (ach as any).rarity || 'common';
  const style = RARITY_MEDAL_STYLES[rarity] ?? RARITY_MEDAL_STYLES.common;
  const Icon = isUnlocked ? Award : Lock;

  return (
    <div className="flex flex-col items-center gap-2 p-3">
      {/* Realistic Physical Medal Assembly */}
      <div className="relative flex flex-col items-center pt-1">
        {/* 1. Woven Fabric Ribbon with V-cut tail & center fold */}
        <div
          className={`relative z-10 w-14 h-7 rounded-t-md bg-gradient-to-b ${
            isUnlocked ? style.ribbonGradient : 'from-slate-700 via-slate-800 to-slate-900'
          } shadow-md flex items-center justify-center overflow-hidden border-t border-white/25`}
          style={{
            clipPath: 'polygon(0 0, 100% 0, 100% 82%, 50% 100%, 0 82%)',
          }}
        >
          {/* Subtle vertical fabric weave & center pleat shadow */}
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_2px,rgba(0,0,0,0.18)_2px,rgba(0,0,0,0.18)_4px)] pointer-events-none" />
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-3 bg-gradient-to-r from-black/30 via-white/10 to-black/30 pointer-events-none" />
          <span
            className={`relative z-10 text-[8px] font-black tracking-widest uppercase drop-shadow ${
              isUnlocked ? style.ribbonText : 'text-slate-400'
            }`}
          >
            {style.label}
          </span>
        </div>

        {/* 2. Metallic Suspension Ring (Bail) connecting ribbon to medal */}
        <div
          className={`relative z-0 -mt-1.5 mb-[-6px] w-4 h-3.5 rounded-full border-[2.5px] ${
            isUnlocked ? style.ringBorder : 'border-slate-500/50'
          } bg-[#0d151e] shadow-inner`}
        />

        {/* 3. Outer Minted Rim (Beveled Metal Edge) */}
        <div
          className={`relative w-20 h-20 rounded-full p-[5px] bg-gradient-to-b ${
            isUnlocked
              ? `${style.rimGradient} ${style.glowColor}`
              : 'from-slate-500 via-slate-700 to-slate-900 opacity-75'
          } shadow-[inset_0_2px_3px_rgba(255,255,255,0.65),inset_0_-3px_4px_rgba(0,0,0,0.75)] transition-transform duration-300`}
        >
          {/* 4. Recessed Inner Dish (Sunken face with inner shadow) */}
          <div
            className={`relative w-full h-full rounded-full bg-gradient-to-tr ${
              isUnlocked ? style.faceGradient : 'from-slate-700 via-slate-800 to-slate-900'
            } shadow-[inset_0_4px_8px_rgba(0,0,0,0.7),inset_0_-2px_4px_rgba(255,255,255,0.35)] flex items-center justify-center overflow-hidden`}
          >
            {/* Diagonal Specular Metallic Sheen */}
            {isUnlocked && (
              <div
                className="absolute -inset-2 bg-[linear-gradient(115deg,transparent_25%,rgba(255,255,255,0.45)_45%,rgba(255,255,255,0.1)_52%,transparent_65%)] pointer-events-none"
                aria-hidden="true"
              />
            )}

            {/* Fine Engraved Concentric Ring */}
            <div
              className={`absolute inset-1.5 rounded-full border ${
                isUnlocked ? 'border-white/25' : 'border-white/5'
              } pointer-events-none`}
            />

            {/* Embossed Icon (dark top-left shadow + bright bottom-right rim light) */}
            <Icon
              className={`w-8 h-8 relative z-10 ${
                isUnlocked
                  ? 'text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]'
                  : 'text-slate-400/50'
              }`}
              aria-hidden="true"
            />
          </div>

          {/* 5. Stamped Metal Points Coin (Bottom-right) */}
          <div
            className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black tabular-nums border ${
              isUnlocked
                ? 'bg-gradient-to-b from-white via-slate-100 to-slate-300 text-[#101922] border-white shadow-[0_3px_6px_rgba(0,0,0,0.6),inset_0_1px_1px_#fff]'
                : 'bg-slate-800 text-slate-400 border-slate-600'
            }`}
          >
            {ach.points ?? 0}
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div className="text-center w-full mt-1.5">
        <div
          className={`font-display font-extrabold text-sm leading-tight mb-1 ${
            isUnlocked ? 'text-white' : 'text-white/60'
          }`}
        >
          {ach.name}
        </div>
        <p className="text-[11px] text-[#b8c7d3] leading-snug line-clamp-2 mb-2">
          {ach.desc}
        </p>

        {ach.target && !isUnlocked && (
          <ProgressBar value={current} max={ach.target} color="bg-[#f0452d]" />
        )}

        {isUnlocked && (
          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 mt-1">
            <Check className="w-3 h-3" />
            Unlocked
          </div>
        )}
      </div>
    </div>
  );
}

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/95 backdrop-blur-md pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-2xl mx-auto shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 flex flex-col gap-2.5">
        <header className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={`w-11 h-11 rounded-full bg-[#14202c] border border-white/15 text-white inline-flex items-center justify-center shrink-0 ${PRESS}`}
          >
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
          </button>
          <h1 className="font-display m-0 flex-1 min-w-0 text-2xl font-extrabold italic tracking-tight text-white leading-none">
            Awards
          </h1>
          <div className="h-11 px-3 rounded-full bg-[#14202c] border border-white/15 inline-flex items-center text-sm font-extrabold text-[#e2ebf2] tabular-nums shrink-0">
            {tab === 'awards'
              ? `${tasksClaimed}/${dailyTasks.length}`
              : `${unlockedCount}/${ACHIEVEMENTS.length}`}
          </div>
        </header>

        <div className={`${CARD} grid grid-cols-2 gap-1 p-1`}>
          {(
            [
              ['awards', 'Daily', Gift],
              ['achievements', 'Achievements', Trophy],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`min-h-11 rounded-xl font-display font-extrabold text-sm inline-flex items-center justify-center gap-1.5 ${PRESS} ${
                tab === id ? 'bg-[#fbbf24] text-[#101922]' : 'text-[#b8c7d3] hover:bg-white/8'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div key={tab} className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {tab === 'awards' && (
            <>
              <section className={`${CARD} p-3`}>
                <div className="flex items-center gap-2.5">
                  <div className="min-w-0 flex-1" aria-live="polite">
                    <h2 className="font-display m-0 text-sm font-extrabold text-white leading-tight">
                      Login streak · Day {streakStatus.nextStreak}
                    </h2>
                    <div className="mt-0.5 text-xs text-[#b8c7d3] leading-snug tabular-nums">
                      {burst !== null
                        ? `Claimed +${burst} coins!`
                        : streakStatus.ready
                          ? 'Ready to claim'
                          : `Next in ${formatCountdown(streakStatus.remainingMs)}`}
                    </div>
                  </div>
                  {streakStatus.ready && (
                    <button type="button" onClick={handleClaim} className={GOLD_BUTTON}>
                      Claim +{streakStatus.rewardCoins}
                    </button>
                  )}
                </div>

                <ol className="list-none m-0 mt-3 p-0 grid grid-cols-7 gap-1">
                  {Array.from({ length: STREAK_DAYS }, (_, i) => windowStart + i).map((day) => {
                    const done = day < currentDay;
                    const active = day === currentDay;
                    const stateClass = done
                      ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#34d399]'
                      : active && streakStatus.ready
                        ? 'bg-[#fbbf24] border-[#fbbf24] text-[#101922]'
                        : active
                          ? 'bg-[#fbbf24]/20 border-[#fbbf24]/50 text-[#fde68a]'
                          : 'bg-white/5 border-white/10 text-[#a9bac6]';
                    const Icon = done ? Check : active ? Gift : Lock;
                    return (
                      <li
                        key={day}
                        aria-current={active ? 'step' : undefined}
                        className={`min-w-0 rounded-lg border py-1.5 px-0.5 flex flex-col items-center gap-1 ${stateClass}`}
                      >
                        <span className="max-w-full truncate text-[10px] sm:text-[11px] font-extrabold leading-none tabular-nums">
                          D{day}
                        </span>
                        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span className="text-[11px] font-bold leading-none tabular-nums">
                          {getDailyLoginReward(day)}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </section>

              <div className="flex items-center justify-between gap-2 px-1">
                <h2 className="font-display m-0 text-base font-extrabold text-white">
                  Daily tasks
                </h2>
                <span className="text-xs font-bold text-[#b8c7d3] tabular-nums">
                  {tasksClaimed}/{dailyTasks.length} claimed
                </span>
              </div>

              <ul className={`${CARD} list-none m-0 p-0 divide-y divide-white/10`}>
                {dailyTasks.map(({ def, task }) => {
                  const complete = task.completed || task.progress >= def.target;
                  const claimable = complete && !task.claimed;
                  return (
                    <li key={def.id} className="p-3">
                      <div className="flex items-center gap-2.5">
                        <div className="min-w-0 flex-1">
                          <div className="font-display font-extrabold text-sm text-white leading-tight">
                            {def.title}
                          </div>
                          <p className="m-0 mt-0.5 text-xs text-[#b8c7d3] leading-snug">{def.desc}</p>
                        </div>
                        {claimable ? (
                          <button type="button" onClick={() => onClaimDailyTask(def.id)} className={GOLD_BUTTON}>
                            Claim +{def.reward}
                          </button>
                        ) : task.claimed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#34d399] shrink-0">
                            <Check className="w-4 h-4" aria-hidden="true" />
                            Claimed
                          </span>
                        ) : (
                          <span className="text-sm font-extrabold text-[#fbbf24] shrink-0 tabular-nums">
                            +{def.reward}
                          </span>
                        )}
                      </div>
                      <ProgressBar
                        value={task.progress}
                        max={def.target}
                        color={task.claimed ? 'bg-[#10b981]' : complete ? 'bg-[#fbbf24]' : 'bg-[#f0452d]'}
                      />
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {tab === 'achievements' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ACHIEVEMENTS.map((ach) => {
                const isUnlocked = Boolean(unlocked[ach.id]);
                const current = ach.progress ? ach.progress(stats) : isUnlocked ? 1 : 0;
                
                return (
                  <div 
                    key={ach.id}
                    className={`${CARD} overflow-hidden transition-all duration-200 hover:scale-[1.02] ${
                      isUnlocked ? 'shadow-lg' : ''
                    }`}
                  >
                    <MedalEmblem 
                      ach={ach} 
                      isUnlocked={isUnlocked} 
                      current={current} 
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};