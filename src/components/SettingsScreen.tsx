import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Coins, Download, Unlock, Lock, Volume2 } from 'lucide-react';
import { SkinCategory } from '../game/skins';
import {
  APP_VERSION,
  FpsCapOption,
  GameSettings,
  SaveDataV3,
  WinScoreOption,
} from '../game/types';
import { ConfirmDialog } from './ConfirmDialog';
import { PWAInstallButton } from './PWAInstallButton';
import { SkinPickers } from './SkinPickers';

interface SettingsScreenProps {
  save: SaveDataV3;
  onUpdate: (patch: Partial<GameSettings>) => void;
  onSelectOrBuySkin: (category: SkinCategory, id: string) => { ok: boolean; reason?: string };
  onResetStats: () => void;
  onResetSettings: () => void;
  onDevUnlockAll: () => void;
  onDevLockAll: () => void;
  onOpenHowTo: () => void;
  onBack: () => void;
}

const CARD = 'rounded-2xl bg-gradient-to-br from-[#1a2836] to-[#0f1a24] border border-white/10 shadow-lg shadow-black/30 divide-y divide-white/10 overflow-hidden';
const HEADING = 'font-display m-0 mb-1.5 px-1 text-xs font-extrabold uppercase tracking-wider text-[#b8c7d3]/90 drop-shadow-sm';
const FOCUS = 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/50';
const ROW = `w-full min-h-12 px-3 py-2 flex items-center justify-between gap-3 text-left text-sm font-semibold leading-snug transition-colors ${FOCUS}`;

interface ToggleRowProps {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}

const ToggleRow: React.FC<ToggleRowProps> = ({ label, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`${ROW} text-white hover:bg-white/5 cursor-pointer group`}
  >
    <span className="min-w-0">{label}</span>
    <span
      aria-hidden="true"
      className={`relative w-11 h-6 rounded-full p-0.5 shrink-0 flex items-center transition-all duration-200 ${
        checked 
          ? 'bg-gradient-to-br from-[#f0452d] to-[#d13622] shadow-[0_0_8px_rgba(240,69,45,0.4)] justify-end' 
          : 'bg-[#2a3b4d] shadow-inner justify-start'
      }`}
    >
      <span className={`w-5 h-5 rounded-full bg-white shadow-md transition-all duration-200 ${checked ? 'scale-100' : 'scale-90'}`} />
    </span>
  </button>
);

interface SegmentedRowProps<T extends string | number> {
  label: string;
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (val: T) => void;
}

function SegmentedRow<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: SegmentedRowProps<T>) {
  return (
    <div role="group" aria-label={label} className="p-3">
      <div className="mb-2 text-sm font-semibold text-white/90 leading-snug drop-shadow-sm">{label}</div>
      <div className="flex flex-wrap gap-1.5 p-1 bg-[#0b1219] rounded-xl shadow-inner border border-white/5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={`flex-auto basis-0 min-w-fit min-h-10 px-2 py-1.5 rounded-lg text-xs font-bold text-center leading-tight cursor-pointer transition-all duration-150 active:scale-[0.97] ${FOCUS} ${
                active 
                  ? 'bg-gradient-to-br from-white to-[#e2e8f0] text-[#101922] shadow-md shadow-white/10' 
                  : 'text-[#b8c7d3] hover:text-white hover:bg-white/5'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  save,
  onUpdate,
  onSelectOrBuySkin,
  onResetStats,
  onResetSettings,
  onDevUnlockAll,
  onDevLockAll,
  onOpenHowTo,
  onBack,
}) => {
  const [confirmKind, setConfirmKind] = useState<'stats' | 'settings' | 'dev-unlock' | 'dev-lock' | null>(null);
  const [apkDownloadLoading, setApkDownloadLoading] = useState(false);
  const { settings } = save;

  const handleDownloadApk = async () => {
    setApkDownloadLoading(true);
    try {
      const res = await fetch('/apk/app-debug.apk');
      if (!res.ok) throw new Error('APK not found');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'app-debug.apk';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('APK download failed', err);
      alert('Failed to download APK. Please try again later.');
    } finally {
      setApkDownloadLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-gradient-to-b from-[#0d151e]/98 to-[#0a1018]/98 backdrop-blur-md pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
      <header className="w-full max-w-xl mx-auto shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1a2836] to-[#0f1a24] border border-white/15 text-white inline-flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150 active:scale-[0.97] shadow-md shadow-black/30 hover:border-white/25"
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <h1 className="font-display m-0 flex-1 min-w-0 text-2xl font-extrabold italic tracking-tight text-white leading-none drop-shadow-lg">
          Settings
        </h1>
        <div
          aria-label={`${save.coins} coins`}
          className="h-11 px-3 rounded-full bg-gradient-to-br from-[#1a2836] to-[#0f1a24] border border-[#fbbf24]/30 inline-flex items-center gap-1.5 text-sm font-extrabold text-[#fbbf24] tabular-nums shrink-0 shadow-md shadow-black/30 drop-shadow-[0_0_8px_rgba(251,191,36,0.3)]"
        >
          <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{save.coins.toLocaleString()}</span>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-xl mx-auto flex flex-col gap-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <section>
            <h2 className={HEADING}>Skins</h2>
            <div className="rounded-2xl bg-gradient-to-br from-[#1a2836] to-[#0f1a24] border border-white/10 shadow-lg shadow-black/30 p-3">
              <SkinPickers save={save} onSelectOrBuy={onSelectOrBuySkin} />
            </div>
          </section>

          <section>
            <h2 className={HEADING}>Audio</h2>
            <div className={CARD}>
              <ToggleRow
                label="Sound effects"
                checked={settings.sfxEnabled}
                onChange={(sfxEnabled) => onUpdate({ sfxEnabled })}
              />
              <ToggleRow
                label="Music"
                checked={settings.musicEnabled}
                onChange={(musicEnabled) => onUpdate({ musicEnabled })}
              />
              <div className="px-3 pt-3 pb-3">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="master-vol" className="text-sm font-semibold text-white/90 flex items-center gap-1.5">
                    <Volume2 className="w-4 h-4 text-[#b8c7d3]" aria-hidden="true" />
                    Master volume
                  </label>
                  <span className="text-sm font-bold text-[#fbbf24] tabular-nums drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]">
                    {settings.masterVolume}%
                  </span>
                </div>
                <div className="h-11 flex items-center">
                  <input
                    id="master-vol"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={settings.masterVolume}
                    onChange={(e) => onUpdate({ masterVolume: Number(e.target.value) })}
                    className="w-full h-2 bg-[#0b1219] rounded-full appearance-none cursor-pointer accent-[#f0452d] shadow-inner hover:accent-[#ff5a3f] transition-all"
                  />
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className={HEADING}>Gameplay</h2>
            <div className={CARD}>
              <ToggleRow
                label="Power-ups"
                checked={settings.powerupsEnabled}
                onChange={(powerupsEnabled) => onUpdate({ powerupsEnabled })}
              />
              <SegmentedRow<WinScoreOption>
                label="Win score (Classic & Obstacles)"
                value={settings.winScore}
                options={[
                  { value: 3, label: '3' },
                  { value: 5, label: '5' },
                  { value: 7, label: '7' },
                  { value: 11, label: '11' },
                ]}
                onChange={(winScore) => onUpdate({ winScore })}
              />
              <SegmentedRow
                label="Default bot difficulty"
                value={settings.defaultDifficulty}
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
                onChange={(defaultDifficulty) => onUpdate({ defaultDifficulty })}
              />
              <SegmentedRow
                label="Default bot personality"
                value={settings.defaultPersonality}
                options={[
                  { value: 'balanced', label: 'Balanced' },
                  { value: 'defender', label: 'Defender' },
                  { value: 'attacker', label: 'Attacker' },
                  { value: 'trickster', label: 'Trickster' },
                ]}
                onChange={(defaultPersonality) => onUpdate({ defaultPersonality })}
              />
              <SegmentedRow
                label="Mallet offset from finger"
                value={settings.malletOffset}
                options={[
                  { value: 'off', label: 'Off' },
                  { value: 'small', label: 'Small' },
                  { value: 'large', label: 'Large' },
                ]}
                onChange={(malletOffset) => onUpdate({ malletOffset })}
              />
              <SegmentedRow
                label="Puck speed"
                value={settings.puckSpeed}
                options={[
                  { value: 'normal', label: 'Normal' },
                  { value: 'fast', label: 'Fast' },
                ]}
                onChange={(puckSpeed) => onUpdate({ puckSpeed })}
              />
              <SegmentedRow
                label="Mallet control"
                value={settings.malletControl}
                options={[
                  { value: 'follow', label: 'Follow finger' },
                  { value: 'relative', label: 'Relative drag' },
                ]}
                onChange={(malletControl) => onUpdate({ malletControl })}
              />
              <SegmentedRow
                label="Goal slow-mo"
                value={settings.goalSlowMo}
                options={[
                  { value: 'winning', label: 'Match winner' },
                  { value: 'all', label: 'All goals' },
                  { value: 'off', label: 'Off' },
                ]}
                onChange={(goalSlowMo) => onUpdate({ goalSlowMo })}
              />
            </div>
          </section>

          <section>
            <h2 className={HEADING}>Feedback</h2>
            <div className={CARD}>
              <ToggleRow
                label="Vibration"
                checked={settings.vibration}
                onChange={(vibration) => onUpdate({ vibration })}
              />
              <ToggleRow
                label="Screen shake on goal"
                checked={settings.screenShake}
                onChange={(screenShake) => onUpdate({ screenShake })}
              />
            </div>
          </section>

          <section>
            <h2 className={HEADING}>Display &amp; Quality</h2>
            <div className={CARD}>
              <SegmentedRow<FpsCapOption>
                label="Frame rate"
                value={settings.fpsCap}
                options={[
                  { value: 60, label: '60 FPS · Saver' },
                  { value: 120, label: '120 Hz · Max' },
                ]}
                onChange={(fpsCap) => onUpdate({ fpsCap })}
              />
              <SegmentedRow
                label="Graphics quality"
                value={settings.quality}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'high', label: 'High' },
                  { value: 'low', label: 'Low' },
                ]}
                onChange={(quality) => onUpdate({ quality })}
              />
              <ToggleRow
                label="Puck trail"
                checked={settings.puckTrail}
                onChange={(puckTrail) => onUpdate({ puckTrail })}
              />
              <ToggleRow
                label="Show FPS"
                checked={settings.showFps}
                onChange={(showFps) => onUpdate({ showFps })}
              />
              <ToggleRow
                label="Reduce motion"
                checked={settings.reduceMotion}
                onChange={(reduceMotion) => onUpdate({ reduceMotion })}
              />
            </div>
          </section>

          <section>
            <h2 className={HEADING}>Data</h2>
            <div className={CARD}>
              <button
                type="button"
                onClick={() => setConfirmKind('stats')}
                className={`${ROW} text-[#ff8a76] hover:bg-[#ff8a76]/10 cursor-pointer`}
              >
                Reset stats &amp; history
              </button>
              <button
                type="button"
                onClick={() => setConfirmKind('settings')}
                className={`${ROW} text-[#ff8a76] hover:bg-[#ff8a76]/10 cursor-pointer`}
              >
                Reset all settings
              </button>
            </div>
          </section>

          {import.meta.env.DEV && (
            <section>
              <h2 className={`${HEADING} !text-amber-300/90`}>Developer Testing</h2>
              <div className="rounded-2xl bg-gradient-to-br from-amber-950/40 to-amber-950/20 border border-amber-500/20 overflow-hidden divide-y divide-amber-500/20 shadow-lg shadow-black/20">
                <button
                  type="button"
                  onClick={() => setConfirmKind('dev-unlock')}
                  className={`${ROW} !justify-start text-amber-100 hover:bg-amber-500/10 cursor-pointer transition-colors`}
                >
                  <Unlock className="w-4 h-4 shrink-0 mr-1" aria-hidden="true" />
                  Unlock all for testing
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmKind('dev-lock')}
                  className={`${ROW} !justify-start text-amber-100 hover:bg-amber-500/10 cursor-pointer transition-colors`}
                >
                  <Lock className="w-4 h-4 shrink-0 mr-1" aria-hidden="true" />
                  Lock all for testing (Factory Reset)
                </button>
              </div>
            </section>
          )}

          <section>
            <h2 className={HEADING}>Info</h2>
            <div className={CARD}>
              <button
                type="button"
                onClick={onOpenHowTo}
                className={`${ROW} text-white hover:bg-white/5 cursor-pointer group`}
              >
                <span>How to Play</span>
                <ChevronRight className="w-5 h-5 text-[#b8c7d3] group-hover:text-white group-hover:translate-x-0.5 transition-all" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleDownloadApk}
                disabled={apkDownloadLoading}
                className={`${ROW} text-white hover:bg-white/5 cursor-pointer group ${apkDownloadLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <Download className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{apkDownloadLoading ? 'Downloading…' : 'Download APK'}</span>
              </button>
              <div className="min-h-12 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-white/90">About</span>
                <span className="text-[#b8c7d3] tabular-nums">Air Hockey · v{APP_VERSION}</span>
              </div>
              <div className="min-h-12 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="font-semibold text-white/90 shrink-0">Credits</span>
                <span className="text-[#b8c7d3] text-right font-medium">M-GAME</span>
              </div>
              <div className="p-3 pt-1">
                <PWAInstallButton variant="full" className="w-full" />
              </div>
            </div>
          </section>
        </div>
      </div>

      {confirmKind === 'stats' && (
        <ConfirmDialog
          title="Reset stats?"
          message="This clears your match stats and recent history."
          confirmLabel="Reset stats"
          onConfirm={() => {
            onResetStats();
            setConfirmKind(null);
          }}
          onCancel={() => setConfirmKind(null)}
        />
      )}

      {confirmKind === 'settings' && (
        <ConfirmDialog
          title="Reset all settings?"
          message="Restores audio, gameplay, quality, and equipped skins to defaults."
          confirmLabel="Reset settings"
          onConfirm={() => {
            onResetSettings();
            setConfirmKind(null);
          }}
          onCancel={() => setConfirmKind(null)}
        />
      )}

      {confirmKind === 'dev-unlock' && (
        <ConfirmDialog
          title="Unlock everything for testing?"
          message="This marks every stage as complete with 3 stars, unlocks all skins and achievements, and adds test coins to this save. This developer-only option is hidden from production builds."
          confirmLabel="Unlock everything"
          onConfirm={() => {
            onDevUnlockAll();
            setConfirmKind(null);
          }}
          onCancel={() => setConfirmKind(null)}
        />
      )}

      {confirmKind === 'dev-lock' && (
        <ConfirmDialog
          title="Lock everything for testing?"
          message="This resets all stages, skins, achievements, coins, and stats to the default factory state. This developer-only option is hidden from production builds."
          confirmLabel="Lock everything"
          onConfirm={() => {
            onDevLockAll();
            setConfirmKind(null);
          }}
          onCancel={() => setConfirmKind(null)}
        />
      )}
    </div>
  );
};