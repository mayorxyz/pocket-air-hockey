import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import {
  Award,
  BarChart2,
  Bot,
  Coins,
  Crown,
  Gift,
  HelpCircle,
  Map as MapIcon,
  Palette,
  Settings,
  Sparkles,
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

const ModeRow = memo(function ModeRow({
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
      className={`w-full min-h-[3.5rem] flex-1 max-h-24 px-3 py-2 rounded-2xl text-white flex items-center gap-3 text-left shadow-md ${color} ${PRESS}`}
    >
      <span className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-extrabold text-base leading-tight">{title}</span>
        <span className="block text-xs text-white/90 leading-snug tabular-nums">{hint}</span>
      </span>
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
      className={`min-w-0 min-h-12 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 text-[#dbe6ee] text-xs font-bold hover:bg-white/8 ${PRESS}`}
    >
      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
      <span className="leading-none">{label}</span>
    </button>
  );
});

const Stat = memo(function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={`min-w-0 py-2 px-1 text-center ${CARD}`}>
      <dd className="m-0 text-base font-extrabold text-white leading-none tabular-nums">{value}</dd>
      <dt className="mt-1 text-xs font-semibold text-[#b8c7d3] leading-none">{label}</dt>
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
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <div className="w-full max-w-md mx-auto flex-1 flex flex-col gap-2">
          {/* Top bar: coins left, help right */}
          <div className="flex items-center justify-between">
            <div
              aria-label={`${coins} coins`}
              className="h-9 px-3 rounded-full bg-[#14202c] border border-[#fbbf24]/40 inline-flex items-center gap-1.5 text-sm text-[#fbbf24] font-extrabold tabular-nums"
            >
              <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{coins.toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={onOpenHowTo}
              aria-label="How to Play"
              className={`w-9 h-9 rounded-full bg-[#14202c] border border-white/15 text-white inline-flex items-center justify-center ${PRESS}`}
            >
              <HelpCircle className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          {/* Centered brand */}
          <header className="flex flex-col items-center gap-1">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#182532] ring-1 ring-white/15 flex items-center justify-center">
              {iconBroken ? (
                <span className="font-display text-xl font-extrabold text-white">AH</span>
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
            <h1 className="font-display m-0 text-[clamp(1.5rem,7vw,2rem)] leading-none font-extrabold italic tracking-tight text-white">
              Air Hockey
            </h1>
            {badge ? (
              <div className="flex items-center gap-1 text-xs font-extrabold text-[#fbbf24]">
                <Crown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{badge}</span>
              </div>
            ) : (
              <div className="text-xs font-semibold text-[#b8c7d3]">120Hz Arcade Arena</div>
            )}
          </header>

          <div className="empty:hidden flex justify-center">
            <PWAInstallButton variant="pill" />
          </div>

          {/* Stats row */}
          <dl className="m-0 grid grid-cols-3 gap-2">
            <Stat value={stats.wins} label="Wins" />
            <Stat value={stats.losses} label="Losses" />
            <Stat value={stats.bestStreak} label="Best streak" />
          </dl>

          {/* Arena Crate */}
          <section className={`${CARD} p-2.5 flex items-center gap-2.5`}>
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                crateStatus.ready
                  ? 'bg-[#fbbf24]/15 border-[#fbbf24]/40 text-[#fbbf24]'
                  : 'bg-white/5 border-white/10 text-[#a9bac6]'
              }`}
            >
              <Gift className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1" aria-live="polite">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white leading-tight">Daily reward</span>
                <span className="px-1.5 py-0.5 rounded bg-[#fbbf24]/15 border border-[#fbbf24]/40 text-[10px] font-extrabold text-[#fbbf24] leading-none tabular-nums">
                  Day {crateStatus.nextStreak}
                </span>
              </div>
              <div className="mt-0.5 text-xs text-[#b8c7d3] leading-snug tabular-nums">
                {crateBurst !== null
                  ? `Claimed +${crateBurst} coins!`
                  : crateStatus.ready
                    ? `Ready now (+${crateStatus.rewardCoins} coins)`
                    : `Next in ${formatCrateCountdown(crateStatus.remainingMs)}`}
              </div>
            </div>
            {crateStatus.ready && (
              <button
                type="button"
                onClick={handleCrateTap}
                className={`h-10 px-3 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#101922] font-display font-extrabold text-sm shrink-0 inline-flex items-center gap-1.5 tabular-nums ${PRESS}`}
              >
                <Sparkles className="w-4 h-4" aria-hidden="true" />+{crateStatus.rewardCoins}
              </button>
            )}
          </section>

          {/* Daily challenge */}
          <section className={`${CARD} p-3`}>
            <div className="flex items-start justify-between gap-2 leading-tight">
              <span className="min-w-0 text-sm font-bold text-white">Daily: {dailyDef.title}</span>
              <span className={`shrink-0 text-sm font-extrabold tabular-nums ${daily.completed ? 'text-[#34d399]' : 'text-[#fbbf24]'}`}>
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
                className="flex-1 h-2 rounded-full bg-white/12 overflow-hidden"
              >
                <div
                  className={`h-full rounded-full transition-[width] ${daily.completed ? 'bg-[#10b981]' : 'bg-[#f0452d]'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-sm font-bold text-[#e2ebf2] tabular-nums shrink-0">
                {Math.min(daily.progress, dailyDef.target)}/{dailyDef.target}
              </span>
            </div>
          </section>

          {/* Modes */}
          <ModeRow
            icon={MapIcon}
            title="Stages (Campaign)"
            hint={`Stage ${highestStageId}/${STAGES.length} · ${totalStageStars}★`}
            color="bg-[#0f9488] hover:bg-[#0d8076]"
            onClick={onOpenStages}
          />
          <ModeRow
            icon={Bot}
            title="Play vs Bot"
            hint="Easy, Medium or Hard"
            color="bg-[#ef4630] hover:bg-[#d93d28]"
            onClick={onPlayBot}
          />
          <ModeRow
            icon={Users}
            title="Play 2 Players"
            hint="Share one screen"
            color="bg-[#2459d6] hover:bg-[#1e4ec0]"
            onClick={onPlayTwoPlayers}
          />
        </div>
      </div>
      {/* Navigation docked to the bottom edge */}
      <nav className="shrink-0 bg-[#14202c] border-t border-white/10 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] px-[max(0.25rem,env(safe-area-inset-left))]">
        <div className="max-w-md mx-auto grid grid-cols-4 gap-1">
          <NavItem icon={Palette} label="Skins" onClick={onOpenSkins} />
            <NavItem icon={BarChart2} label="Stats" onClick={onOpenStats} />
            <NavItem icon={Award} label="Awards" onClick={onOpenAchievements} />
            <NavItem icon={Settings} label="Settings" onClick={onOpenSettings} />
        </div>
      </nav>
    </div>
  );
};