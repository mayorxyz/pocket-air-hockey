import React, { memo, useEffect, useMemo, useState } from 'react';
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

const CARD = 'rounded-2xl bg-[#14202c]/92 border border-white/14 shadow-lg';
const PRESS = 'transition-transform duration-150 active:scale-[0.97] cursor-pointer';

function formatCrateCountdown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const PlayButton = memo(function PlayButton({
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
      className={`w-full min-h-[3.75rem] px-3.5 py-2.5 rounded-2xl border border-white/18 text-white flex items-center gap-3 text-left shadow-md ${color} ${PRESS}`}
    >
      <span className="w-10 h-10 rounded-xl bg-white/20 border border-white/15 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display font-extrabold text-[clamp(1rem,2.8vw,1.1875rem)] leading-tight">
          {title}
        </span>
        <span className="block text-xs sm:text-sm text-white/85 leading-snug">{hint}</span>
      </span>
    </button>
  );
});

const Tile = memo(function Tile({
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
      className={`${CARD} min-h-[4rem] px-1.5 py-2 flex flex-col items-center justify-center gap-1 text-white text-xs sm:text-sm font-bold hover:bg-[#1e2f40] hover:border-white/25 ${PRESS}`}
    >
      <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
      <span className="leading-tight text-center">{label}</span>
    </button>
  );
});

const Stat = memo(function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className={`${CARD} py-2.5 px-2`}>
      <div className="text-[clamp(1.05rem,3.4vw,1.25rem)] font-extrabold text-white leading-none tabular-nums">
        {value}
      </div>
      <div className="mt-1 text-xs font-semibold text-[#b8c7d3] leading-tight">{label}</div>
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

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 30000);
    return () => window.clearInterval(id);
  }, []);

  const crateStatus = useMemo(() => getArenaCrateStatus(save, nowMs), [save, nowMs]);
  const dateKey = daily.date || getLocalDateKey();
  const dailyDef = useMemo(() => getDailyChallengeForDate(dateKey), [dateKey]);
  const pct = Math.min(100, Math.round((daily.progress / dailyDef.target) * 100));

  const handleCrateTap = () => {
    if (!crateStatus.ready) return;
    const amt = crateStatus.rewardCoins;
    onClaimCrate();
    setNowMs(Date.now());
    setCrateBurst(amt);
    window.setTimeout(() => setCrateBurst(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/82 backdrop-blur-sm safe-shell safe-scroll">
      <div className="w-full max-w-[min(100%,52rem)] mx-auto my-auto flex flex-col gap-3">
        {/* Top utility bar: Coins + Install App pill + How to Play */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="min-h-12 px-3.5 rounded-full bg-[#14202c]/95 border border-[#fbbf24]/35 inline-flex items-center gap-2 text-[#fbbf24] font-extrabold tabular-nums shadow-lg">
              <Coins className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span className="text-sm sm:text-base">{coins}</span>
            </div>
            <PWAInstallButton variant="pill" />
          </div>

          <button
            type="button"
            onClick={onOpenHowTo}
            aria-label="How to Play"
            className={`min-h-12 min-w-12 px-3 rounded-full bg-[#14202c]/95 border border-white/18 text-white inline-flex items-center justify-center gap-1.5 hover:bg-[#1e2f40] shadow-lg ${PRESS}`}
          >
            <HelpCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline text-sm font-bold">How to Play</span>
          </button>
        </div>

        {/* Adaptive 1-column (portrait) -> 2-column (landscape / tablet / desktop) hub */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 items-start">
          {/* Left column: Brand + Stats + Arena Crate + Daily Challenge */}
          <div className="space-y-3">
            <header className="flex items-center md:items-start justify-center md:justify-start gap-3.5 text-center md:text-left py-1">
              <div className="w-[clamp(3.25rem,9vw,4rem)] h-[clamp(3.25rem,9vw,4rem)] rounded-[1.15rem] overflow-hidden bg-[#182532] flex items-center justify-center shadow-xl ring-1 ring-white/18 shrink-0">
                {iconBroken ? (
                  <span className="font-display text-lg font-extrabold text-white">AH</span>
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
              <div className="min-w-0">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <h1 className="font-display m-0 text-[clamp(1.85rem,6vw,2.75rem)] leading-none font-extrabold italic tracking-tight text-white [text-wrap:balance]">
                    Air Hockey
                  </h1>
                  {save.legend100Badge ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#101922] border border-[#fbbf24]/75 px-2.5 py-0.5 text-xs font-extrabold text-[#fbbf24] shadow-[0_0_16px_rgba(251,191,36,0.28)]">
                      <Crown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>100-Stage Legend</span>
                    </span>
                  ) : save.grandChampionBadge ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-[#fbbf24]/20 border border-[#fbbf24]/50 px-2 py-0.5 text-xs font-extrabold text-[#fbbf24] shadow">
                      <Crown className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>Grand Champion</span>
                    </span>
                  ) : null}
                </div>
                <p className="m-0 mt-1 text-xs sm:text-sm font-semibold text-[#b8c7d3]">
                  120Hz Arcade Arena
                </p>
              </div>
            </header>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat value={stats.wins} label="Wins" />
              <Stat value={stats.losses} label="Losses" />
              <Stat value={stats.bestStreak} label="Best streak" />
            </div>

            {/* 6-Hour Free Arena Crate */}
            <div className={`${CARD} p-3 flex items-center justify-between gap-2.5`}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                    crateStatus.ready
                      ? 'bg-[#fbbf24]/20 border-[#fbbf24]/50 text-[#fbbf24]'
                      : 'bg-white/8 border-white/12 text-[#a9bac6]'
                  }`}
                >
                  <Gift className="w-5 h-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-display font-extrabold text-sm sm:text-base text-white leading-tight">
                      Arena Crate
                    </span>
                    {crateStatus.nextStreak > 1 && (
                      <span className="rounded-md bg-[#fbbf24]/18 border border-[#fbbf24]/35 px-1.5 py-0.5 text-[11px] font-extrabold text-[#fde68a] tabular-nums">
                        Day {crateStatus.nextStreak}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#b8c7d3] leading-snug tabular-nums">
                    {crateBurst !== null
                      ? `Claimed +${crateBurst} coins!`
                      : crateStatus.ready
                        ? `Ready now (+${crateStatus.rewardCoins} coins)`
                        : `Next crate in ${formatCrateCountdown(crateStatus.remainingMs)}`}
                  </div>
                </div>
              </div>

              {crateStatus.ready ? (
                <button
                  type="button"
                  onClick={handleCrateTap}
                  className={`min-h-12 px-3.5 rounded-xl bg-[#fbbf24] hover:bg-[#f59e0b] text-[#101922] font-display font-extrabold text-sm inline-flex items-center gap-1.5 shrink-0 shadow-md ${PRESS}`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="tabular-nums">+{crateStatus.rewardCoins}</span>
                </button>
              ) : (
                <div className="min-h-12 px-3 rounded-xl bg-white/8 border border-white/12 text-xs font-bold text-[#b8c7d3] inline-flex items-center shrink-0 tabular-nums">
                  {formatCrateCountdown(crateStatus.remainingMs)}
                </div>
              )}
            </div>

            {/* Daily Challenge */}
            <div className={`${CARD} p-3.5`}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="font-bold text-white min-w-0">Daily: {dailyDef.title}</span>
                <span
                  className={`font-extrabold shrink-0 tabular-nums ${
                    daily.completed ? 'text-[#34d399]' : 'text-[#fbbf24]'
                  }`}
                >
                  {daily.completed ? 'Done' : `+${dailyDef.reward} coins`}
                </span>
              </div>
              <p className="m-0 mt-1 text-xs sm:text-sm text-[#b8c7d3] leading-snug">
                {dailyDef.desc}
              </p>
              <div className="mt-2.5 flex items-center gap-2.5">
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={dailyDef.target}
                  aria-valuenow={daily.progress}
                  className="flex-1 h-2 rounded-full bg-white/12 overflow-hidden"
                >
                  <div
                    className={`h-full rounded-full transition-[width] ${
                      daily.completed ? 'bg-[#10b981]' : 'bg-[#f0452d]'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-[#e2ebf2] tabular-nums shrink-0">
                  {daily.progress}/{dailyDef.target}
                </span>
              </div>
            </div>
          </div>

          {/* Right column: Play Modes + Utility Tiles */}
          <div className="space-y-2.5">
            <PlayButton
              icon={MapIcon}
              title="Stages (Campaign)"
              hint={`Stage ${highestStageId}/${STAGES.length} · ${totalStageStars}★`}
              color="bg-[#0d9488] hover:bg-[#0f766e]"
              onClick={onOpenStages}
            />
            <PlayButton
              icon={Bot}
              title="Play vs Bot"
              hint="Easy, Medium or Hard"
              color="bg-[#f0452d] hover:bg-[#e13c24]"
              onClick={onPlayBot}
            />
            <PlayButton
              icon={Users}
              title="Play 2 Players"
              hint="Share one screen"
              color="bg-[#2459d6] hover:bg-[#1e4ec0]"
              onClick={onPlayTwoPlayers}
            />

            <div className="grid grid-cols-4 gap-2 pt-0.5">
              <Tile icon={Palette} label="Skins" onClick={onOpenSkins} />
              <Tile icon={BarChart2} label="Stats" onClick={onOpenStats} />
              <Tile icon={Award} label="Awards" onClick={onOpenAchievements} />
              <Tile icon={Settings} label="Settings" onClick={onOpenSettings} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};