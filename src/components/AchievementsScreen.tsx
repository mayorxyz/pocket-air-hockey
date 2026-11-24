import React from 'react';
import { Award, ChevronLeft, Lock } from 'lucide-react';
import { ACHIEVEMENTS } from '../game/registries';
import { PlayerStats } from '../game/types';

interface AchievementsScreenProps {
  stats: PlayerStats;
  unlocked: Record<string, string>;
  onBack: () => void;
}

export const AchievementsScreen: React.FC<AchievementsScreenProps> = ({
  stats,
  unlocked,
  onBack,
}) => {
  const unlockedCount = ACHIEVEMENTS.filter((a) => Boolean(unlocked[a.id])).length;

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
