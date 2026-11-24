import React from 'react';
import { Check, ChevronLeft } from 'lucide-react';
import { MODES, OBSTACLE_LAYOUTS, PERSONALITIES } from '../game/registries';
import { Difficulty, GameMode, ModeId, PersonalityId } from '../game/types';

interface ModesScreenProps {
  opponentType: GameMode;
  modeId: ModeId;
  difficulty: Difficulty;
  personality: PersonalityId;
  obstacleLayoutId: string;
  timedMinutes: 2 | 3;
  winScore: number;
  onChangeOpponentType: (opp: GameMode) => void;
  onSelectMode: (modeId: ModeId) => void;
  onSelectDifficulty: (diff: Difficulty) => void;
  onSelectPersonality: (pers: PersonalityId) => void;
  onSelectObstacleLayout: (layoutId: string) => void;
  onSelectTimedMinutes: (mins: 2 | 3) => void;
  onStartMatch: () => void;
  onBack: () => void;
}

export const ModesScreen: React.FC<ModesScreenProps> = ({
  opponentType,
  modeId,
  difficulty,
  personality,
  obstacleLayoutId,
  timedMinutes,
  winScore,
  onChangeOpponentType,
  onSelectMode,
  onSelectDifficulty,
  onSelectPersonality,
  onSelectObstacleLayout,
  onSelectTimedMinutes,
  onStartMatch,
  onBack,
}) => {
  const modeCfg = MODES[modeId];
  const availableModes = Object.values(MODES).filter(
    (m) => opponentType === 'ai' || m.opponent
  );

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
        className="w-full max-w-[min(100%,40rem)] mx-auto pb-3 flex items-center justify-between gap-2 shrink-0"
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
          Match Setup
        </h1>
        <div className="min-w-12 sm:min-w-[4.5rem]" aria-hidden="true" />
      </header>

      <div
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
        className="flex-1 w-full max-w-[min(100%,40rem)] mx-auto safe-scroll space-y-5 pt-1"
      >
        {/* Opponent Type Segmented Switch */}
        <div className="flex gap-1.5 p-1.5 bg-[#14202c]/95 border border-white/14 rounded-2xl">
          {(
            [
              ['ai', 'vs Bot'],
              ['two', '2 Players'],
            ] as const
          ).map(([val, label]) => {
            const active = opponentType === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => onChangeOpponentType(val)}
                aria-pressed={active}
                className={`flex-1 min-h-12 px-3 rounded-xl text-sm sm:text-base font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                  active
                    ? 'bg-white text-[#101922] border-white shadow-sm'
                    : 'bg-transparent border-transparent text-[#b8c7d3] hover:text-white'
                }`}
              >
                {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Game Mode */}
        <section>
          <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#b8c7d3] mb-2">
            Game mode
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableModes.map((m) => {
              const active = m.id === modeId;
              const desc =
                m.winCondition === 'score'
                  ? m.obstacles
                    ? m.desc
                    : `First to ${winScore} goals wins`
                  : m.desc;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectMode(m.id)}
                  aria-pressed={active}
                  className={`w-full min-h-[3.75rem] px-3.5 py-2.5 rounded-2xl text-left border transition cursor-pointer flex items-center justify-between gap-3 ${
                    active
                      ? 'bg-white text-[#101922] border-[#f0452d] ring-2 ring-[#f0452d]/60'
                      : 'bg-[#14202c]/95 border-white/14 text-white hover:bg-[#1e2f40]'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-display font-extrabold text-base leading-tight">
                      {m.name}
                    </div>
                    <div
                      className={`text-xs sm:text-sm mt-0.5 leading-snug ${
                        active ? 'text-[#2b4054]' : 'text-[#b8c7d3]'
                      }`}
                    >
                      {desc}
                    </div>
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      active ? 'border-[#f0452d] bg-[#f0452d]' : 'border-white/35'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-white stroke-[3]" aria-hidden="true" />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {modeId === 'timed' && (
          <section>
            <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#b8c7d3] mb-2">
              Match timer
            </div>
            <div className="flex gap-1.5 p-1.5 bg-[#14202c]/95 border border-white/14 rounded-2xl">
              {([2, 3] as const).map((mins) => {
                const active = timedMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onSelectTimedMinutes(mins)}
                    aria-pressed={active}
                    className={`flex-1 min-h-12 rounded-xl text-sm sm:text-base font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer tabular-nums border ${
                      active
                        ? 'bg-white text-[#101922] border-white shadow-sm'
                        : 'bg-transparent border-transparent text-[#b8c7d3] hover:text-white'
                    }`}
                  >
                    {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                    <span>{mins}:00</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {modeId === 'obstacles' && (
          <section>
            <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#b8c7d3] mb-2">
              Obstacle layout
            </div>
            <div className="flex flex-wrap gap-1.5 p-1.5 bg-[#14202c]/95 border border-white/14 rounded-2xl">
              {Object.values(OBSTACLE_LAYOUTS).map((layout) => {
                const active = obstacleLayoutId === layout.id;
                return (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => onSelectObstacleLayout(layout.id)}
                    aria-pressed={active}
                    className={`flex-1 min-w-[6.5rem] min-h-12 px-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                      active
                        ? 'bg-white text-[#101922] border-white shadow-sm'
                        : 'bg-transparent border-transparent text-[#b8c7d3] hover:text-white'
                    }`}
                  >
                    {active && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                    <span>{layout.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {opponentType === 'ai' && modeCfg.opponent && (
          <>
            <section>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#b8c7d3] mb-2">
                Bot difficulty
              </div>
              <div className="flex gap-1.5 p-1.5 bg-[#14202c]/95 border border-white/14 rounded-2xl">
                {(['easy', 'medium', 'hard'] as const).map((key) => {
                  const active = difficulty === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => onSelectDifficulty(key)}
                      aria-pressed={active}
                      className={`flex-1 min-h-12 px-2 rounded-xl text-sm sm:text-base font-bold capitalize inline-flex items-center justify-center gap-1.5 transition cursor-pointer border ${
                        active
                          ? 'bg-white text-[#101922] border-white shadow-sm'
                          : 'bg-transparent border-transparent text-[#b8c7d3] hover:text-white'
                      }`}
                    >
                      {active && <Check className="w-4 h-4 shrink-0" aria-hidden="true" />}
                      <span>{key}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#b8c7d3] mb-2">
                Bot personality
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.values(PERSONALITIES).map((p) => {
                  const active = p.id === personality;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectPersonality(p.id)}
                      aria-pressed={active}
                      className={`min-h-[4rem] p-3 rounded-2xl text-left border transition cursor-pointer flex items-start justify-between gap-2 ${
                        active
                          ? 'bg-white text-[#101922] border-[#f0452d] ring-2 ring-[#f0452d]/60'
                          : 'bg-[#14202c]/95 border-white/14 text-white hover:bg-[#1e2f40]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-display font-extrabold text-base leading-tight">
                          {p.name}
                        </div>
                        <div
                          className={`text-xs mt-1 leading-snug ${
                            active ? 'text-[#2b4054]' : 'text-[#b8c7d3]'
                          }`}
                        >
                          {p.desc}
                        </div>
                      </div>
                      {active && (
                        <span className="w-5 h-5 rounded-full bg-[#f0452d] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}

        <div className="pt-1">
          <button
            type="button"
            onClick={onStartMatch}
            className="w-full min-h-[3.5rem] rounded-2xl bg-[#f0452d] hover:bg-[#e13c24] border border-white/18 active:scale-[0.98] text-white font-display font-extrabold text-[clamp(1.05rem,3vw,1.25rem)] transition-transform cursor-pointer shadow-lg"
          >
            Start Match
          </button>
        </div>
      </div>
    </div>
  );
};
