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

const HEADING =
  'font-display m-0 mb-1.5 px-1 text-xs font-extrabold uppercase tracking-wide text-[#b8c7d3]';
const PRESS =
  'transition-transform duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#fbbf24]';

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: ReadonlyArray<readonly [T, string]>;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex flex-wrap gap-1 p-1 rounded-2xl bg-[#14202c] border border-white/10"
    >
      {options.map(([val, text]) => (
        <button
          key={val}
          type="button"
          onClick={() => onChange(val)}
          aria-pressed={value === val}
          className={`flex-auto basis-0 min-w-fit min-h-11 px-2.5 py-1 rounded-xl text-sm font-bold leading-tight tabular-nums ${PRESS} ${
            value === val ? 'bg-white text-[#101922]' : 'text-[#b8c7d3] hover:text-white'
          }`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}

function OptionCard({
  title,
  desc,
  active,
  onClick,
}: {
  title: string;
  desc: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`min-w-0 min-h-16 p-2.5 rounded-2xl text-left border-2 flex flex-col justify-start ${PRESS} ${
        active
          ? 'bg-white text-[#101922] border-[#f0452d]'
          : 'bg-[#14202c] border-white/10 text-white hover:bg-[#1e2f40]'
      }`}
    >
      <span className="flex w-full items-start justify-between gap-1">
        <span className="min-w-0 font-display font-extrabold text-sm leading-tight">{title}</span>
        {active && <Check className="w-4 h-4 shrink-0 text-[#c9301a] stroke-[3]" aria-hidden="true" />}
      </span>
      <span className={`mt-1 text-xs leading-snug ${active ? 'text-[#2b4054]' : 'text-[#b8c7d3]'}`}>
        {desc}
      </span>
    </button>
  );
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
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/95 backdrop-blur-md">
      <div className="w-full max-w-xl mx-auto shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] flex flex-col gap-2.5">
        <header className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={`w-11 h-11 rounded-full bg-[#14202c] border border-white/15 text-white inline-flex items-center justify-center shrink-0 ${PRESS}`}
          >
            <ChevronLeft className="w-6 h-6" aria-hidden="true" />
          </button>
          <h1 className="font-display m-0 flex-1 min-w-0 text-2xl font-extrabold italic tracking-tight text-white leading-none">
            Match Setup
          </h1>
        </header>
        <Segmented<GameMode>
          label="Opponent"
          value={opponentType}
          options={[
            ['ai', 'vs Bot'],
            ['two', '2 Players'],
          ]}
          onChange={onChangeOpponentType}
        />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-xl mx-auto flex flex-col gap-3.5 pb-2 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
          <section>
            <h2 className={HEADING}>Game mode</h2>
            <div className="grid grid-cols-2 gap-2">
              {availableModes.map((m) => (
                <OptionCard
                  key={m.id}
                  title={m.name}
                  desc={
                    m.winCondition === 'score' && !m.obstacles
                      ? `First to ${winScore} goals wins`
                      : m.desc
                  }
                  active={m.id === modeId}
                  onClick={() => onSelectMode(m.id)}
                />
              ))}
            </div>
          </section>

          {modeId === 'timed' && (
            <section>
              <h2 className={HEADING}>Match timer</h2>
              <Segmented<2 | 3>
                label="Match timer"
                value={timedMinutes}
                options={[
                  [2, '2:00'],
                  [3, '3:00'],
                ]}
                onChange={onSelectTimedMinutes}
              />
            </section>
          )}

          {modeId === 'obstacles' && (
            <section>
              <h2 className={HEADING}>Obstacle layout</h2>
              <Segmented<string>
                label="Obstacle layout"
                value={obstacleLayoutId}
                options={Object.values(OBSTACLE_LAYOUTS).map(
                  (layout) => [layout.id, layout.name] as const
                )}
                onChange={onSelectObstacleLayout}
              />
            </section>
          )}

          {opponentType === 'ai' && modeCfg.opponent && (
            <>
              <section>
                <h2 className={HEADING}>Bot difficulty</h2>
                <Segmented<Difficulty>
                  label="Bot difficulty"
                  value={difficulty}
                  options={[
                    ['easy', 'Easy'],
                    ['medium', 'Medium'],
                    ['hard', 'Hard'],
                  ]}
                  onChange={onSelectDifficulty}
                />
              </section>

              <section>
                <h2 className={HEADING}>Bot personality</h2>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(PERSONALITIES).map((p) => (
                    <OptionCard
                      key={p.id}
                      title={p.name}
                      desc={p.desc}
                      active={p.id === personality}
                      onClick={() => onSelectPersonality(p.id)}
                    />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Always visible, docked to the bottom */}
      <div className="shrink-0 border-t border-white/10 bg-[#14202c] pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <button
          type="button"
          onClick={onStartMatch}
          className={`block w-full max-w-xl mx-auto min-h-12 rounded-2xl bg-[#c9301a] hover:bg-[#b02a16] text-white font-display font-extrabold text-lg ${PRESS}`}
        >
          Start Match
        </button>
      </div>
    </div>
  );
};