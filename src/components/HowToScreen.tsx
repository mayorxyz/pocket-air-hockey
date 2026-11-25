import React from 'react';
import { ChevronLeft, Play } from 'lucide-react';
import { STAGES } from '../game/registries';

interface HowToScreenProps {
  winScore: number;
  onReplayTutorial: () => void;
  onBack: () => void;
}

export const HowToScreen: React.FC<HowToScreenProps> = ({
  winScore,
  onReplayTutorial,
  onBack,
}) => {
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-[#0d151e]/92 backdrop-blur-md safe-shell safe-scroll">
      <div className="w-full max-w-[min(100%,44rem)] mx-auto my-auto py-2">
        <div className="mb-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="min-h-12 min-w-12 px-3 rounded-2xl bg-white/12 border border-white/15 hover:bg-white/18 text-white font-bold text-sm sm:text-base inline-flex items-center gap-1.5 transition-transform active:scale-[0.97] cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>Back</span>
          </button>

          <button
            type="button"
            onClick={onReplayTutorial}
            className="min-h-12 px-4 rounded-2xl bg-[#0d9488] hover:bg-[#0f766e] border border-white/18 text-white font-display font-extrabold text-sm sm:text-base inline-flex items-center gap-2 transition-transform active:scale-[0.97] cursor-pointer shadow-md"
          >
            <Play className="w-4 h-4 fill-current shrink-0" aria-hidden="true" />
            <span>Replay Tutorial</span>
          </button>
        </div>

        <h1 className="font-display m-0 mb-4 text-[clamp(1.75rem,5vw,2.35rem)] leading-tight font-extrabold italic tracking-tight text-white [text-wrap:balance]">
          How to Play
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base text-[#e9f1f4] leading-relaxed">
          <section className="rounded-2xl bg-[#14202c]/95 border border-white/14 p-4 shadow-lg">
            <h2 className="font-display font-extrabold text-lg text-white mb-1">
              Controls &amp; Curve Shots
            </h2>
            <p className="text-[#b8c7d3] m-0">
              Drag in your half to strike. Swipe sideways across the puck at impact to impart
              spin and bend curve shots past the keeper. On desktop, use Arrow keys or WASD.
            </p>
          </section>

          <section className="rounded-2xl bg-[#14202c]/95 border border-white/14 p-4 shadow-lg">
            <h2 className="font-display font-extrabold text-lg text-white mb-1">
              Game Modes
            </h2>
            <p className="text-[#b8c7d3] m-0">
              Play {STAGES.length} Campaign Stages, Classic (first to{' '}
              <strong className="text-white tabular-nums">{winScore}</strong>), Timed (with Sudden
              Death tiebreaker), Sudden Death, Obstacle Table, or solo Practice.
            </p>
          </section>

          <section className="rounded-2xl bg-[#14202c]/95 border border-white/14 p-4 shadow-lg">
            <h2 className="font-display font-extrabold text-lg text-white mb-1">
              Power-ups &amp; Bots
            </h2>
            <p className="text-[#b8c7d3] m-0">
              Hit center-ice bubbles with the puck for Big Mallet, Speed Boost, Freeze, or Double
              Puck. Choose Bot difficulty and personality (Balanced, Defender, Attacker, Trickster).
            </p>
          </section>

          <section className="rounded-2xl bg-[#14202c]/95 border border-white/14 p-4 shadow-lg">
            <h2 className="font-display font-extrabold text-lg text-white mb-1">
              Coins, Rewards &amp; Unlocks
            </h2>
            <p className="text-[#b8c7d3] m-0">
              Claim your free Daily Login Reward every 24 hours, clear Stages, and complete Daily Challenges
              to unlock new table shapes, pucks, and mallets.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
