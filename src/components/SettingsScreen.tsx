import React, { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Coins } from 'lucide-react';
import { SkinCategory } from '../game/skins';
import {
  APP_VERSION,
  FpsCapOption,
  GameSettings,
  SaveDataV3,
  WinScoreOption,
} from '../game/types';
import { ConfirmDialog } from './ConfirmDialog';
import { SkinPickers } from './SkinPickers';

interface SettingsScreenProps {
  save: SaveDataV3;
  onUpdate: (patch: Partial<GameSettings>) => void;
  onSelectOrBuySkin: (category: SkinCategory, id: string) => { ok: boolean; reason?: string };
  onResetStats: () => void;
  onResetSettings: () => void;
  onOpenHowTo: () => void;
  onBack: () => void;
}

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
    className="w-full min-h-[3.25rem] px-4 py-2.5 flex items-center justify-between gap-4 text-left hover:bg-white/8 transition-colors cursor-pointer"
  >
    <span className="text-sm sm:text-base font-semibold text-white min-w-0 leading-snug">
      {label}
    </span>
    <span
      aria-hidden="true"
      className={`w-12 h-7 rounded-full p-0.5 transition-colors shrink-0 flex items-center border ${
        checked
          ? 'bg-[#f0452d] border-[#ff8a76] justify-end'
          : 'bg-white/15 border-white/20 justify-start'
      }`}
    >
      <span className="w-5.5 h-5.5 rounded-full bg-white shadow-sm" />
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
    <div className="px-4 py-3">
      <div className="text-sm sm:text-base font-semibold text-white mb-2.5 leading-snug">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#0e1720] border border-white/10 rounded-2xl">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(opt.value)}
              className={`flex-1 min-w-[4.25rem] min-h-12 px-2.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-transform active:scale-[0.98] cursor-pointer inline-flex items-center justify-center gap-1.5 leading-tight text-center ${
                active
                  ? 'bg-white text-[#101922] border-2 border-white shadow-sm'
                  : 'bg-transparent text-[#b8c7d3] border border-transparent hover:text-white hover:bg-white/8'
              }`}
            >
              {active && <Check className="w-3.5 h-3.5 shrink-0 stroke-[3]" aria-hidden="true" />}
              <span>{opt.label}</span>
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
  onOpenHowTo,
  onBack,
}) => {
  const [confirmKind, setConfirmKind] = useState<'stats' | 'settings' | null>(null);
  const { settings } = save;

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
        className="w-full max-w-[min(100%,34rem)] mx-auto pb-3 flex items-center justify-between gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={onBack}
          className="min-h-12 min-w-12 px-3 rounded-2xl bg-white/12 border border-white/15 hover:bg-white/18 text-white font-bold text-sm sm:text-base inline-flex items-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>Back</span>
        </button>
        <h1 className="font-display m-0 text-[clamp(1.25rem,4vw,1.5rem)] font-extrabold italic tracking-tight text-white">
          Settings
        </h1>
        <div className="min-h-12 px-3 rounded-2xl bg-[#14202c] border border-[#fbbf24]/30 flex items-center gap-1.5 text-sm font-extrabold text-[#fbbf24] tabular-nums">
          <Coins className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span>{save.coins}</span>
        </div>
      </header>

      <div
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        className="flex-1 w-full max-w-[min(100%,34rem)] mx-auto safe-scroll space-y-5 pr-0.5"
      >
        <section>
          <h2 className="font-display text-sm font-extrabold text-[#b8c7d3] mb-2 px-1">
            Skins
          </h2>
          <div className="rounded-2xl bg-[#14202c]/95 border border-white/14 p-4 shadow-lg">
            <SkinPickers save={save} onSelectOrBuy={onSelectOrBuySkin} />
          </div>
        </section>

        <section>
          <h2 className="font-display text-sm font-extrabold text-[#b8c7d3] mb-2 px-1">
            Audio
          </h2>
          <div className="rounded-2xl bg-[#14202c]/95 border border-white/14 divide-y divide-white/10 overflow-hidden shadow-lg">
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
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="master-vol"
                  className="text-sm sm:text-base font-semibold text-white"
                >
                  Master volume
                </label>
                <span className="text-sm sm:text-base font-bold text-[#b8c7d3] tabular-nums">
                  {settings.masterVolume}%
                </span>
              </div>
              <input
                id="master-vol"
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.masterVolume}
                onChange={(e) => onUpdate({ masterVolume: Number(e.target.value) })}
                className="w-full h-12 accent-[#f0452d] cursor-pointer"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="font-display text-sm font-extrabold text-[#b8c7d3] mb-2 px-1">
            Gameplay
          </h2>
          <div className="rounded-2xl bg-[#14202c]/95 border border-white/14 divide-y divide-white/10 overflow-hidden shadow-lg">
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
          <h2 className="font-display text-sm font-extrabold text-[#b8c7d3] mb-2 px-1">
            Feedback
          </h2>
          <div className="rounded-2xl bg-[#14202c]/95 border border-white/14 divide-y divide-white/10 overflow-hidden shadow-lg">
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
          <h2 className="font-display text-sm font-extrabold text-[#b8c7d3] mb-2 px-1">
            Display &amp; Quality
          </h2>
          <div className="rounded-2xl bg-[#14202c]/95 border border-white/14 divide-y divide-white/10 overflow-hidden shadow-lg">
            <SegmentedRow<FpsCapOption>
              label="Frame rate"
              value={settings.fpsCap}
              options={[
                { value: 60, label: '60 FPS (Battery Saver)' },
                { value: 120, label: 'Uncapped (120Hz)' },
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
          <h2 className="font-display text-sm font-extrabold text-[#b8c7d3] mb-2 px-1">
            Data
          </h2>
          <div className="rounded-2xl bg-[#14202c]/95 border border-white/14 divide-y divide-white/10 overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={() => setConfirmKind('stats')}
              className="w-full min-h-[3.25rem] px-4 py-3 text-left text-sm sm:text-base font-bold text-[#ff8a76] hover:bg-white/8 transition-colors cursor-pointer"
            >
              Reset stats &amp; history
            </button>
            <button
              type="button"
              onClick={() => setConfirmKind('settings')}
              className="w-full min-h-[3.25rem] px-4 py-3 text-left text-sm sm:text-base font-bold text-[#ff8a76] hover:bg-white/8 transition-colors cursor-pointer"
            >
              Reset all settings
            </button>
          </div>
        </section>

        <section>
          <h2 className="font-display text-sm font-extrabold text-[#b8c7d3] mb-2 px-1">
            Info
          </h2>
          <div className="rounded-2xl bg-[#14202c]/95 border border-white/14 divide-y divide-white/10 overflow-hidden shadow-lg">
            <button
              type="button"
              onClick={onOpenHowTo}
              className="w-full min-h-[3.25rem] px-4 py-3 flex items-center justify-between text-left text-sm sm:text-base font-semibold text-white hover:bg-white/8 transition-colors cursor-pointer"
            >
              <span>How to Play</span>
              <ChevronRight className="w-5 h-5 text-[#b8c7d3]" aria-hidden="true" />
            </button>
            <div className="min-h-[3.25rem] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm sm:text-base">
              <span className="font-semibold text-white">About</span>
              <span className="text-[#b8c7d3] tabular-nums">Air Hockey · v{APP_VERSION}</span>
            </div>
            <div className="min-h-[3.25rem] px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-sm sm:text-base">
              <span className="font-semibold text-white shrink-0">Credits</span>
              <span className="text-[#b8c7d3] text-right">
                120Hz Arcade Physics · Web Audio Synth
              </span>
            </div>
          </div>
        </section>
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
    </div>
  );
};
