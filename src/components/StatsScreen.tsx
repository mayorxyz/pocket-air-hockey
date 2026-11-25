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
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const CARD = 'rounded-2xl bg-[#14202c] border border-white/10';
const HEADING = 'font-display m-0 mb-1.5 px-1 text-xs font-extrabold uppercase tracking-wide text-[#b8c7d3]';

export const StatsScreen: React.FC<StatsScreenProps> = ({ stats, history, onBack }) => {
  const winRate =
    stats.totalMatches > 0 ? Math.round((stats.wins / stats.totalMatches) * 100) : 0;

  const summaryCards = [
    { label: 'Matches', value: stats.totalMatches.toLocaleString() },
    { label: 'Best streak', value: stats.bestStreak.toLocaleString() },
    { label: 'Playtime', value: formatDuration(stats.playtime) },
    { label: 'Goals for', value: stats.goalsFor.toLocaleString() },
    { label: 'Goals against', value: stats.goalsAgainst.toLocaleString() },
    { label: 'Total hits', value: stats.totalHits.toLocaleString() },
    { label: 'Longest rally', value: stats.longestRally.toLocaleString() },
    { label: 'Fastest puck', value: stats.fastestPuck.toLocaleString() },
    { label: 'Power-ups', value: stats.powerupsCollected.toLocaleString() },
  ];

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/95 backdrop-blur-md pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <header className="w-full max-w-2xl mx-auto shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-[#14202c] border border-white/15 text-white inline-flex items-center justify-center shrink-0 cursor-pointer transition-transform active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <h1 className="font-display m-0 flex-1 min-w-0 text-2xl font-extrabold italic tracking-tight text-white leading-none">
          Stats
        </h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto flex flex-col gap-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {/* Win rate */}
          <section className={`${CARD} p-3.5`}>
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#b8c7d3]">Win rate</div>
                <div className="mt-1 font-display text-4xl font-extrabold text-white leading-none tabular-nums">
                  {winRate}%
                </div>
              </div>
              <div className="text-right text-sm font-extrabold tabular-nums leading-snug">
                <div className="text-[#34d399]">{stats.wins.toLocaleString()} wins</div>
                <div className="text-[#ff8a76]">{stats.losses.toLocaleString()} losses</div>
              </div>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/12 overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-full bg-[#10b981]" style={{ width: `${winRate}%` }} />
            </div>
          </section>

          <dl className={`${CARD} m-0 grid grid-cols-3 gap-px overflow-hidden !bg-white/10`}>
            {summaryCards.map((item) => (
              <div key={item.label} className="min-w-0 bg-[#14202c] px-1.5 py-2.5 flex flex-col text-center">
                <dd className="m-0 font-display text-base font-extrabold text-white leading-tight tabular-nums break-words">
                  {item.value}
                </dd>
                <dt className="mt-0.5 text-[11px] font-semibold text-[#b8c7d3] leading-tight">
                  {item.label}
                </dt>
              </div>
            ))}
          </dl>

          <section>
            <h2 className={HEADING}>Recent matches</h2>
            {history.length === 0 ? (
              <div className={`${CARD} p-5 text-center text-sm text-[#b8c7d3]`}>
                No matches completed yet.
              </div>
            ) : (
              <ul className={`${CARD} list-none m-0 p-0 divide-y divide-white/10`}>
                {history.map((m, idx) => {
                  const modeName = MODES[m.modeId]?.name ?? m.modeId;
                  const persName = PERSONALITIES[m.personality]?.name ?? m.personality;
                  const won = m.result === 'win';
                  return (
                    <li key={`${m.date}-${idx}`} className="p-3 flex items-center gap-2.5">
                      <span
                        className={`w-11 h-7 rounded-lg inline-flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          won ? 'bg-[#10b981]/20 text-[#34d399]' : 'bg-[#f0452d]/20 text-[#ff8a76]'
                        }`}
                      >
                        {won ? 'Win' : 'Loss'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold text-white leading-tight truncate">{modeName}</div>
                        <div className="mt-0.5 text-xs text-[#b8c7d3] leading-snug tabular-nums">
                          {m.opponent === 'two'
                            ? '2 Players'
                            : `${m.difficulty[0].toUpperCase() + m.difficulty.slice(1)} ${persName}`}{' '}
                          · {formatDuration(m.duration)} · {formatMatchDate(m.date)}
                        </div>
                      </div>
                      <div className="font-display text-lg font-extrabold tabular-nums shrink-0">
                        <span className="text-[#ff8a76]">{m.score.p}</span>
                        <span className="mx-1 text-white/40">:</span>
                        <span className="text-[#7ea2ff]">{m.score.a}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};