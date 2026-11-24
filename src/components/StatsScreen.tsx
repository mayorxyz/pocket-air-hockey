import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { MODES, PERSONALITIES } from '../game/registries';
import { MatchHistoryItem, PlayerStats } from '../game/types';

interface StatsScreenProps {
  stats: PlayerStats;
  history: MatchHistoryItem[];
  onBack: () => void;
}

function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rem = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${rem}s`;
  return `${rem}s`;
}

function formatMatchDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export const StatsScreen: React.FC<StatsScreenProps> = ({ stats, history, onBack }) => {
  const winRate =
    stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;

  const summaryCards = [
    { label: 'Matches', value: String(stats.totalMatches) },
    { label: 'Win rate', value: `${winRate}%` },
    { label: 'Wins / Losses', value: `${stats.wins} / ${stats.losses}` },
    { label: 'Goals for / against', value: `${stats.goalsFor} / ${stats.goalsAgainst}` },
    { label: 'Best streak', value: String(stats.bestStreak) },
    { label: 'Longest rally', value: `${stats.longestRally} hits` },
    { label: 'Fastest puck', value: String(stats.fastestPuck) },
    { label: 'Total hits', value: String(stats.totalHits) },
    { label: 'Power-ups', value: String(stats.powerupsCollected) },
    { label: 'Playtime', value: formatDuration(stats.playtime) },
  ];

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
          Stats &amp; History
        </h1>
        <div className="min-w-12 sm:min-w-[4.5rem]" aria-hidden="true" />
      </header>

      <div
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        className="flex-1 w-full max-w-[min(100%,44rem)] mx-auto safe-scroll space-y-6 pt-1"
      >
        <section className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {summaryCards.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl bg-[#14202c]/95 border border-white/14 p-3.5 shadow-md"
            >
              <div className="text-xs font-bold text-[#b8c7d3] leading-snug">{item.label}</div>
              <div className="font-display text-[clamp(1.25rem,4vw,1.5rem)] font-extrabold text-white mt-1 tabular-nums">
                {item.value}
              </div>
            </div>
          ))}
        </section>

        <section>
          <h2 className="font-display text-xs sm:text-sm font-extrabold uppercase tracking-wider text-[#b8c7d3] mb-2 px-1">
            Recent matches
          </h2>
          {history.length === 0 ? (
            <div className="rounded-2xl bg-[#14202c]/95 border border-white/14 p-5 text-center text-sm sm:text-base text-[#b8c7d3]">
              No matches completed yet.
            </div>
          ) : (
            <div className="rounded-2xl bg-[#14202c]/95 border border-white/14 divide-y divide-white/10 overflow-hidden shadow-md">
              {history.map((m, idx) => {
                const modeName = MODES[m.modeId]?.name ?? m.modeId;
                const persName = PERSONALITIES[m.personality]?.name ?? m.personality;
                const won = m.result === 'win';
                return (
                  <div
                    key={`${m.date}-${idx}`}
                    className="px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm sm:text-base font-bold text-white flex flex-wrap items-center gap-1.5">
                        <span className={won ? 'text-[#34d399]' : 'text-[#ff8a76]'}>
                          {won ? 'Win' : 'Loss'}
                        </span>
                        <span className="text-[#b8c7d3] font-normal">·</span>
                        <span className="truncate">{modeName}</span>
                      </div>
                      <div className="text-xs text-[#b8c7d3] mt-0.5 tabular-nums">
                        {m.opponent === 'two'
                          ? '2 Players'
                          : `${m.difficulty[0].toUpperCase() + m.difficulty.slice(1)} ${persName}`}{' '}
                        · {formatDuration(m.duration)} · {formatMatchDate(m.date)}
                      </div>
                    </div>
                    <div className="font-display text-lg sm:text-xl font-extrabold tabular-nums shrink-0">
                      <span className="text-[#ff8a76]">{m.score.p}</span>
                      <span className="mx-1.5 text-white/40">:</span>
                      <span className="text-[#7ea2ff]">{m.score.a}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
