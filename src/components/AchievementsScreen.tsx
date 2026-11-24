import React, { useEffect, useMemo, useState } from 'react';
import { Award, Check, ChevronLeft, Flame, Gift, Lock, Sparkles } from 'lucide-react';
import { ACHIEVEMENTS, CHALLENGES } from '../game/registries';
import { getArenaCrateStatus } from '../game/progression';
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

function streakReward(day: number): number {
  return 30 + Math.min(20, Math.max(0, day - 1) * 5);
}

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const unlockedCount = ACHIEVEMENTS.filter((a) => Boolean(unlocked[a.id])).length;
  const streakStatus = useMemo(() => getArenaCrateStatus(save, nowMs), [save, nowMs]);
  const currentDay = Math.min(STREAK_DAYS, Math.max(1, streakStatus.nextStreak));

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
    window.setTimeout(() => setBurst(null), 1800);
  };

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
        className="w-full max-w-[min(100%,44rem)] mx-auto pb-3 flex items-center justify-between gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 min-w-12 px-3 rounded-2xl bg-white/12 border border-white/15 hover:bg-white/18 text-white font-bold text-sm sm:text-base inline-flex items-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Back</span>
        </button>
        <h1 className="font-display m-0 text-[clamp(1.35rem,4.5vw,1.75rem)] font-extrabold italic tracking-tight text-white [text-wrap:balance]">
          Achievements
        </h1>
        <div className="min-h-10 px-3 rounded-xl bg-[#14202c] border border-white/14 inline-flex items-center text-sm sm:text-base font-extrabold text-[#e2ebf2] tabular-nums shrink-0">
          {unlockedCount}/{ACHIEVEMENTS.length}
        </div>
      </header>

      <div
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        className="flex-1 w-full max-w-[min(100%,44rem)] mx-auto safe-scroll pt-1"
      >
        {/* Daily login streak + reward */}
        <div className="rounded-2xl p-4 mb-2.5 bg-[#14202c] border border-[#fbbf24]/35 shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                  streakStatus.ready
                    ? 'bg-[#fbbf24]/20 border-[#fbbf24]/50 text-[#fbbf24]'
                    : 'bg-white/8 border-white/12 text-[#a9bac6]'
                }`}
              >
                <Flame className="w-5 h-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-display font-extrabold text-base text-white leading-tight">
                    Daily Login Streak
                  </span>
                  <span className="rounded-md bg-[#fbbf24]/18 border border-[#fbbf24]/35 px-1.5 py-0.5 text-[11px] font-extrabold text-[#fde68a] tabular-nums">
                    Day {streakStatus.nextStreak}
                  </span>
                </div>
                <div className="text-xs sm:text-sm text-[#b8c7d3] leading-snug tabular-nums">
                  {burst !== null
                    ? `Claimed +${burst} coins!`
                    : streakStatus.ready
                      ? `Log in daily to grow your bonus (+${streakStatus.rewardCoins} coins)`
                      : `Come back in ${formatCountdown(streakStatus.remainingMs)} for the next reward`}
                </div>
              </div>
            </div>

            {streakStatus.ready ? (
              <button
                type="button"
                onClick={handleClaim}
                className="min-h-12 px-3.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#101922] font-display font-extrabold text-sm inline-flex items-center gap-1.5 shrink-0 shadow-md transition-transform active:scale-[0.97] cursor-pointer"
              >
                <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="tabular-nums">+{streakStatus.rewardCoins}</span>
              </button>
            ) : (
              <div className="min-h-12 px-3 rounded-xl bg-white/8 border border-white/12 text-xs font-bold text-[#b8c7d3] inline-flex items-center shrink-0 tabular-nums">
                {formatCountdown(streakStatus.remainingMs)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-7 gap-1.5 mt-3.5">
            {Array.from({ length: STREAK_DAYS }, (_, i) => i + 1).map((day) => {
              const done = day < currentDay;
              const active = day === currentDay;
              const stateClass = done
                ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#34d399]'
                : active && streakStatus.ready
                  ? 'bg-[#fbbf24] border-[#fbbf24] text-[#101922]'
                  : active
                    ? 'bg-[#fbbf24]/20 border-[#fbbf24]/40 text-[#fde68a]'
                    : 'bg-white/6 border-white/10 text-[#8fa3b0]';
              return (
                <div
                  key={day}
                  className={`rounded-lg border py-1.5 flex flex-col items-center gap-0.5 ${stateClass}`}
                >
                  <span className="text-[10px] font-extrabold uppercase tracking-wide opacity-80">
                    D{day}
                  </span>
                  {done ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : active ? (
                    <Gift className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <span className="w-4 h-4 flex items-center justify-center">
                      <Lock className="w-3 h-3" aria-hidden="true" />
                    </span>
                  )}
                  <span className="text-[10px] font-bold tabular-nums opacity-90">
                    {streakReward(day)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Daily tasks */}
        <div className="flex items-center justify-between gap-2 px-1 mb-1.5">
          <h2 className="font-display m-0 text-base font-extrabold text-white">
            Daily Tasks
          </h2>
          <span className="text-xs font-bold text-[#b8c7d3] tabular-nums">
            {tasksClaimed}/{dailyTasks.length} claimed
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
          {dailyTasks.map(({ def, task }) => {
            const pct = Math.min(100, Math.round((task.progress / def.target) * 100));
            const complete = task.progress >= def.target;
            return (
              <div
                key={def.id}
                className={`rounded-2xl p-3.5 flex flex-col gap-2 border shadow-md ${
                  task.claimed
                    ? 'bg-[#14202c] border-[#10b981]/45'
                    : complete
                      ? 'bg-[#14202c] border-[#fbbf24]/45'
                      : 'bg-[#14202c]/80 border-white/12'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-display font-extrabold text-sm text-white leading-tight">
                    {def.title}
                  </div>
                  <span
                    className={`text-xs font-bold shrink-0 ${
                      task.claimed
                        ? 'text-[#34d399]'
                        : complete
                          ? 'text-[#fbbf24]'
                          : 'text-[#8fa3b0]'
                    }`}
                  >
                    {task.claimed ? 'Claimed' : `+${def.reward}`}
                  </span>
                </div>
                <p className="text-xs text-[#b8c7d3] m-0 leading-snug flex-1">{def.desc}</p>

                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-white/12 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        task.claimed ? 'bg-[#10b981]' : complete ? 'bg-[#fbbf24]' : 'bg-[#f0452d]'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#dbe6ee] tabular-nums shrink-0">
                    {task.progress}/{def.target}
                  </span>
                </div>

                {complete && !task.claimed && (
                  <button
                    type="button"
                    onClick={() => onClaimDailyTask(def.id)}
                    className="min-h-10 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#101922] font-display font-extrabold text-xs inline-flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-[0.97] cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Claim +{def.reward}</span>
                  </button>
                )}
                {task.claimed && (
                  <div className="min-h-10 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 text-[#34d399] text-xs font-bold inline-flex items-center justify-center gap-1.5">
                    <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Reward collected</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {ACHIEVEMENTS.map((ach) => {
            const isUnlocked = Boolean(unlocked[ach.id]);
            const current = ach.progress ? ach.progress(stats) : isUnlocked ? 1 : 0;
            const target = ach.target ?? 1;
            const pct = Math.min(100, Math.round((current / target) * 100));

            return (
              <div
                key={ach.id}
                className={`rounded-2xl p-4 flex items-start gap-3.5 border shadow-md ${
                  isUnlocked
                    ? 'bg-[#14202c] border-[#10b981]/45'
                    : 'bg-[#14202c]/80 border-white/12'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${
                    isUnlocked
                      ? 'bg-[#10b981]/20 border-[#10b981]/40 text-[#34d399]'
                      : 'bg-white/8 border-white/10 text-[#b8c7d3]'
                  }`}
                >
                  {isUnlocked ? (
                    <Award className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Lock className="w-5 h-5" aria-hidden="true" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-display font-extrabold text-base text-white leading-tight">
                      {ach.name}
                    </div>
                    <span
                      className={`text-xs font-bold shrink-0 ${
                        isUnlocked ? 'text-[#34d399]' : 'text-[#fbbf24]'
                      }`}
                    >
                      {isUnlocked ? 'Unlocked' : '+5 coins'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#b8c7d3] mt-1 m-0 leading-snug">
                    {ach.desc}
                  </p>

                  {ach.target && !isUnlocked && (
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="flex-1 h-1.5 rounded-full bg-white/12 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#f0452d]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold text-[#dbe6ee] tabular-nums">
                        {current}/{target}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
