import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BarChart2,
  Bot,
  ChevronRight,
  Coins,
  Crown,
  Gift,
  HelpCircle,
  Map as MapIcon,
  Palette,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { getArenaCrateStatus } from '../game/progression';
import { getDailyChallengeForDate, getLocalDateKey, STAGES } from '../game/registries';
import { DailyProgress, PlayerStats, SaveDataV3 } from '../game/types';
import { PWAInstallButton } from './PWAInstallButton';

interface HomeScreenProps {
  save: SaveDataV3;
  stats: PlayerStats;
  coins: number;
  daily: DailyProgress;
  highestStageId: number;
  totalStageStars: number;
  onClaimCrate: () => void;
  onOpenStages: () => void;
  onPlayBot: () => void;
  onPlayTwoPlayers: () => void;
  onOpenSkins: () => void;
  onOpenStats: () => void;
  onOpenAchievements: () => void;
  onOpenSettings: () => void;
  onOpenHowTo: () => void;
}

const CARD = 'rounded-2xl bg-[#14202c]/95 border border-white/10';
const PRESS =
  'transition-transform duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

function formatCrateCountdown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const ModeButton = memo(function ModeButton({
  icon: Icon,
  title,
  hint,
  color,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 min-h-[4.5rem] p-3 rounded-2xl text-white flex flex-col items-start justify-center gap-1.5 text-left [@media(min-height:760px)]:items-center [@media(min-height:760px)]:text-center shadow-md ${color} ${PRESS}`}
    >
      <span className="flex items-center gap-2 [@media(min-height:760px)]:flex-col font-display font-extrabold text-base [@media(min-height:760px)]:text-lg leading-tight">
        <Icon className="w-5 h-5 [@media(min-height:760px)]:w-12 [@media(min-height:760px)]:h-12 shrink-0" aria-hidden="true" />
        {title}
      </span>
      <span className="text-xs text-white/90 leading-snug">{hint}</span>
    </button>
  );
});

const NavItem = memo(function NavItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 min-h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-[#dbe6ee] text-xs font-bold hover:bg-white/8 ${PRESS}`}
    >
      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
      <span className="leading-none">{label}</span>
    </button>
  );
});

const Stat = memo(function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-0 py-2 px-1 text-center">
      <dd className="m-0 text-base font-extrabold text-white leading-none tabular-nums">{value}</dd>
      <dt className="mt-1 text-[11px] font-semibold text-[#b8c7d3] leading-none">{label}</dt>
    </div>
  );
});

export const HomeScreen: React.FC<HomeScreenProps> = ({
  save,
  stats,
  coins,
  daily,
  highestStageId,
  totalStageStars,
  onClaimCrate,
  onOpenStages,
  onPlayBot,
  onPlayTwoPlayers,
  onOpenSkins,
  onOpenStats,
  onOpenAchievements,
  onOpenSettings,
  onOpenHowTo,
}) => {
  const [iconBroken, setIconBroken] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [crateBurst, setCrateBurst] = useState<number | null>(null);
  const burstTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(burstTimer.current);
    };
  }, []);

  const crateStatus = useMemo(() => getArenaCrateStatus(save, nowMs), [save, nowMs]);
  const dateKey = daily.date || getLocalDateKey();
  const dailyDef = useMemo(() => getDailyChallengeForDate(dateKey), [dateKey]);
  const pct = Math.min(100, Math.round((daily.progress / dailyDef.target) * 100));
  const stagePct = Math.min(100, Math.round((highestStageId / STAGES.length) * 100));
  const badge = save.legend100Badge
    ? '100-Stage Legend'
    : save.grandChampionBadge
      ? 'Grand Champion'
      : null;

  const handleCrateTap = () => {
    if (!crateStatus.ready) return;
    const amt = crateStatus.rewardCoins;
    onClaimCrate();
    setNowMs(Date.now());
    setCrateBurst(amt);
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setCrateBurst(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/90 backdrop-blur-sm">
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <div className="w-full max-w-md sm:landscape:max-w-3xl md:max-w-3xl mx-auto flex-1 shrink-0 flex flex-col gap-2.5">
        {/* Header: brand, coins, help */}
        <header className="flex items-center gap-2.5">
          <div className="max-[359px]:hidden w-11 h-11 rounded-xl overflow-hidden bg-[#182532] ring-1 ring-white/15 flex items-center justify-center shrink-0">
            {iconBroken ? (
              <span className="font-display text-sm font-extrabold text-white">AH</span>
            ) : (
              <img
                src="/pwa-192x192.png"
                alt=""
                referrerPolicy="no-referrer"
                onError={() => setIconBroken(true)}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display m-0 whitespace-nowrap text-[clamp(1.25rem,6vw,1.75rem)] leading-none font-extrabold italic tracking-tight text-white">
              Air Hockey
            </h1>
            {badge ? (
              <div className="mt-1 flex items-center gap-1 text-[11px] font-extrabold text-[#fbbf24] leading-tight">
                <Crown className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>{badge}</span>
              </div>
            ) : (
              <div className="mt-1 text-[11px] font-semibold text-[#b8c7d3] leading-tight">
                120Hz Arcade Arena
              </div>
            )}
          </div>
          <div
            aria-label={`${coins} coins`}
            className="h-11 px-3 rounded-full bg-[#14202c] border border-[#fbbf24]/40 inline-flex items-center gap-1.5 text-sm text-[#fbbf24] font-extrabold tabular-nums shrink-0"
          >
            <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{coins.toLocaleString()}</span>
          </div>
          <button
            type="button"
            onClick={onOpenHowTo}
            aria-label="How to Play"
            className={`w-11 h-11 rounded-full bg-[#14202c] border border-white/15 text-white inline-flex items-center justify-center shrink-0 ${PRESS}`}
          >
            <HelpCircle className="w-5 h-5" aria-hidden="true" />
          </button>
        </header>

        <div className="empty:hidden flex justify-center">
          <PWAInstallButton variant="pill" />
        </div>

        <div className="flex-1 flex flex-col sm:landscape:grid md:grid sm:landscape:grid-cols-2 md:grid-cols-2 gap-2.5">
          {/* Play: stretches to fill spare height */}
          <div className="min-w-0 flex-1 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onOpenStages}
              className={`w-full flex-[3] flex flex-col justify-center p-3.5 rounded-2xl bg-[#0f766e] hover:bg-[#115e59] text-white text-left shadow-lg ${PRESS}`}
            >
              <span className="flex w-full items-center gap-3">
                <MapIcon className="w-7 h-7 [@media(min-height:760px)]:w-14 [@media(min-height:760px)]:h-14 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display font-extrabold text-xl [@media(min-height:760px)]:text-3xl leading-tight">Stages</span>
                  <span className="block text-xs [@media(min-height:760px)]:text-base text-white/90 tabular-nums">
                    Stage {highestStageId}/{STAGES.length} · {totalStageStars}★
                  </span>
                </span>
                <ChevronRight className="w-6 h-6 shrink-0" aria-hidden="true" />
              </span>
              <span className="mt-2.5 [@media(min-height:760px)]:mt-6 block w-full h-1.5 [@media(min-height:760px)]:h-2.5 rounded-full bg-black/30 overflow-hidden">
                <span className="block h-full rounded-full bg-white" style={{ width: `${stagePct}%` }} />
              </span>
            </button>

            <div className="flex-[2] grid grid-cols-2 gap-2.5">
              <ModeButton icon={Bot} title="Vs Bot" hint="Easy to Hard" color="bg-[#c9301a] hover:bg-[#b02a16]" onClick={onPlayBot} />
              <ModeButton icon={Users} title="2 Players" hint="One screen" color="bg-[#2459d6] hover:bg-[#1e4ec0]" onClick={onPlayTwoPlayers} />
            </div>
          </div>

          {/* Daily + stats */}
          <div className="min-w-0 flex flex-col gap-2.5">
            <section className={`${CARD} divide-y divide-white/10`}>
              <div className="p-3 flex items-center gap-2.5">
                <Gift
                  className={`w-5 h-5 shrink-0 ${crateStatus.ready ? 'text-[#fbbf24]' : 'text-[#a9bac6]'}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1" aria-live="polite">
                  <div className="text-sm font-bold text-white leading-tight">
                    Daily reward · Day {crateStatus.nextStreak}
                  </div>
                  <div className="mt-0.5 text-xs text-[#b8c7d3] leading-snug tabular-nums">
                    {crateBurst !== null
                      ? `Claimed +${crateBurst} coins!`
                      : crateStatus.ready
                        ? 'Ready to claim'
                        : `Next in ${formatCrateCountdown(crateStatus.remainingMs)}`}
                  </div>
                </div>
                {crateStatus.ready && (
                  <button
                    type="button"
                    onClick={handleCrateTap}
                    className={`h-11 px-3.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#101922] font-display font-extrabold text-sm shrink-0 tabular-nums ${PRESS}`}
                  >
                    Claim +{crateStatus.rewardCoins}
                  </button>
                )}
              </div>

              <div className="p-3">
                <div className="flex items-start justify-between gap-2 text-sm leading-tight">
                  <span className="min-w-0 font-bold text-white">{dailyDef.title}</span>
                  <span className={`shrink-0 font-extrabold tabular-nums ${daily.completed ? 'text-[#34d399]' : 'text-[#fbbf24]'}`}>
                    {daily.completed ? 'Done' : `+${dailyDef.reward} coins`}
                  </span>
                </div>
                <p className="m-0 mt-0.5 text-xs text-[#b8c7d3] leading-snug">{dailyDef.desc}</p>
                <div className="mt-2 flex items-center gap-2">
                  <div
                    role="progressbar"
                    aria-label={dailyDef.title}
                    aria-valuemin={0}
                    aria-valuemax={dailyDef.target}
                    aria-valuenow={Math.min(daily.progress, dailyDef.target)}
                    className="flex-1 h-1.5 rounded-full bg-white/12 overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-[width] ${daily.completed ? 'bg-[#10b981]' : 'bg-[#f0452d]'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-[#e2ebf2] tabular-nums shrink-0">
                    {Math.min(daily.progress, dailyDef.target)}/{dailyDef.target}
                  </span>
                </div>
              </div>
            </section>

            <dl className={`${CARD} m-0 grid grid-cols-3 divide-x divide-white/10`}>
              <Stat value={stats.wins} label="Wins" />
              <Stat value={stats.losses} label="Losses" />
              <Stat value={stats.bestStreak} label="Best streak" />
            </dl>
          </div>
        </div>

      </div>
      </div>

      {/* Navigation docked to the bottom edge */}
      <nav className="shrink-0 bg-[#14202c] border-t border-white/10 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] px-[max(0.25rem,env(safe-area-inset-left))]">
        <div className="max-w-3xl mx-auto grid grid-cols-4 gap-1">
          <NavItem icon={Palette} label="Skins" onClick={onOpenSkins} />
          <NavItem icon={BarChart2} label="Stats" onClick={onOpenStats} />
          <NavItem icon={Award} label="Awards" onClick={onOpenAchievements} />
          <NavItem icon={Settings} label="Settings" onClick={onOpenSettings} />
        </div>
      </nav>
    </div>
  );
};