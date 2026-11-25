import React from 'react';
import { ChevronLeft, Coins, Gamepad2, Hand, Play, Zap } from 'lucide-react';
import { STAGES } from '../game/registries';

interface HowToScreenProps {
  winScore: number;
  onReplayTutorial: () => void;
  onBack: () => void;
}

const PRESS =
  'transition-transform duration-150 active:scale-[0.97] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';

export const HowToScreen: React.FC<HowToScreenProps> = ({
  winScore,
  onReplayTutorial,
  onBack,
}) => {
  const topics = [
    {
      icon: Hand,
      title: 'Controls & Curve Shots',
      text: 'Drag in your half to strike. Swipe sideways across the puck at impact to add spin and bend curve shots past the keeper. On desktop, use the arrow keys or WASD.',
    },
    {
      icon: Gamepad2,
      title: 'Game Modes',
      text: `Play ${STAGES.length} Campaign Stages, Classic (first to ${winScore}), Timed (with Sudden Death tiebreaker), Sudden Death, Obstacle Table, or solo Practice.`,
    },
    {
      icon: Zap,
      title: 'Power-ups & Bots',
      text: 'Hit center-ice bubbles for Goal Shield, Wide Goal, Big Mallet, Freeze, Fireball, Curve Shot, Multi-Puck, Ghost Puck, Magnet, Slow Zone, Portals, or Double Points. Choose bot difficulty and personality (Balanced, Defender, Attacker, Trickster).',
    },
    {
      icon: Coins,
      title: 'Coins, Rewards & Unlocks',
      text: 'Claim your free Daily Login Reward every 24 hours, clear Stages, and complete Daily Challenges to unlock new table shapes, pucks, and mallets.',
    },
  ];

  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/95 backdrop-blur-md">
      <header className="w-full max-w-2xl mx-auto shrink-0 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] flex items-center gap-2.5">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className={`w-11 h-11 rounded-full bg-[#14202c] border border-white/15 text-white inline-flex items-center justify-center shrink-0 ${PRESS}`}
        >
          <ChevronLeft className="w-6 h-6" aria-hidden="true" />
        </button>
        <h1 className="font-display m-0 flex-1 min-w-0 text-2xl font-extrabold italic tracking-tight text-white leading-none">
          How to Play
        </h1>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2 pb-2.5 pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
          {topics.map(({ icon: Icon, title, text }) => (
            <section key={title} className="rounded-2xl bg-[#14202c] border border-white/10 p-3">
              <h2 className="font-display m-0 flex items-center gap-2 text-sm font-extrabold text-white leading-tight">
                <Icon className="w-5 h-5 shrink-0 text-[#fbbf24]" aria-hidden="true" />
                {title}
              </h2>
              <p className="m-0 mt-1.5 text-sm text-[#b8c7d3] leading-relaxed">{text}</p>
            </section>
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/10 bg-[#14202c] pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))]">
        <button
          type="button"
          onClick={onReplayTutorial}
          className={`w-full max-w-2xl mx-auto min-h-12 rounded-2xl bg-[#0f766e] hover:bg-[#115e59] text-white font-display font-extrabold text-base flex items-center justify-center gap-2 ${PRESS}`}
        >
          <Play className="w-4 h-4 fill-current shrink-0" aria-hidden="true" />
          Replay Tutorial
        </button>
      </div>
    </div>
  );
};