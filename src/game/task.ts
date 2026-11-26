import {
  MatchResult,
  PlayerStats,
} from './types';

export interface AchievementDef {
  id: string;
  name: string;
  desc: string;
  points?: number;
  target?: number;
  progress?: (stats: PlayerStats) => number;
  check: (stats: PlayerStats, matchResult: MatchResult) => boolean;
}

export interface DailyChallengeDef {
  id: string;
  title: string;
  desc: string;
  target: number;
  reward: number;
  increment: (result: MatchResult) => number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // ── Existing ───────────────────────────────────
  {
    id: 'first_win',
    name: 'First Win',
    desc: 'Win your first match',
    target: 1,
    progress: (s) => Math.min(1, s.wins),
    check: (s) => s.wins >= 1,
    points: 10,
  },
  {
    id: 'shutout',
    name: 'Shutout',
    desc: 'Win 7-0 or better without conceding',
    check: (_s, m) => m.hasOpponent && m.won && m.opponentScore === 0 && m.playerScore >= 7,
    points: 40,
  },
  {
    id: 'streak_5',
    name: '5-Win Streak',
    desc: 'Win 5 matches in a row',
    target: 5,
    progress: (s) => Math.min(5, s.bestStreak),
    check: (s) => s.bestStreak >= 5,
    points: 30,
  },
  {
    id: 'hits_100',
    name: '100 Total Hits',
    desc: 'Strike the puck 100 times across matches',
    target: 100,
    progress: (s) => Math.min(100, s.totalHits),
    check: (s) => s.totalHits >= 100,
    points: 15,
  },
  {
    id: 'comeback',
    name: 'Comeback',
    desc: 'Win after trailing by 3 or more goals',
    check: (_s, m) => m.hasOpponent && m.won && m.maxDeficit >= 3,
    points: 35,
  },
  {
    id: 'speed_demon',
    name: 'Speed Demon',
    desc: 'Launch the puck at 1300+ speed',
    target: 1300,
    progress: (s) => Math.min(1300, Math.round(s.fastestPuck)),
    check: (s, m) => m.maxPuckSpeed >= 1300 || s.fastestPuck >= 1300,
    points: 25,
  },
  {
    id: 'power_player',
    name: 'Power Player',
    desc: 'Collect 10 power-ups across matches',
    target: 10,
    progress: (s) => Math.min(10, s.powerupsCollected),
    check: (s) => s.powerupsCollected >= 10,
    points: 20,
  },
  {
    id: 'giant_slayer',
    name: 'Giant Slayer',
    desc: 'Defeat the Hard Attacker bot',
    check: (_s, m) =>
      m.opponentType === 'ai' &&
      m.hasOpponent &&
      m.difficulty === 'hard' &&
      m.personality === 'attacker' &&
      m.won,
    points: 45,
  },

  // ── Wins milestones ────────────────────────────
  {
    id: 'wins_5',
    name: 'Getting Started',
    desc: 'Win 5 matches',
    target: 5,
    progress: (s) => Math.min(5, s.wins),
    check: (s) => s.wins >= 5,
    points: 15,
  },
  {
    id: 'wins_10',
    name: 'Double Digits',
    desc: 'Win 10 matches',
    target: 10,
    progress: (s) => Math.min(10, s.wins),
    check: (s) => s.wins >= 10,
    points: 25,
  },
  {
    id: 'wins_25',
    name: 'Quarter Century',
    desc: 'Win 25 matches',
    target: 25,
    progress: (s) => Math.min(25, s.wins),
    check: (s) => s.wins >= 25,
    points: 50,
  },
  {
    id: 'wins_50',
    name: 'Half Century',
    desc: 'Win 50 matches',
    target: 50,
    progress: (s) => Math.min(50, s.wins),
    check: (s) => s.wins >= 50,
    points: 80,
  },
  {
    id: 'wins_100',
    name: 'Centurion',
    desc: 'Win 100 matches',
    target: 100,
    progress: (s) => Math.min(100, s.wins),
    check: (s) => s.wins >= 100,
    points: 150,
  },
  {
    id: 'wins_250',
    name: 'Legend',
    desc: 'Win 250 matches',
    target: 250,
    progress: (s) => Math.min(250, s.wins),
    check: (s) => s.wins >= 250,
    points: 300,
  },
  {
    id: 'wins_500',
    name: 'Immortal',
    desc: 'Win 500 matches',
    target: 500,
    progress: (s) => Math.min(500, s.wins),
    check: (s) => s.wins >= 500,
    points: 500,
  },

  // ── Streaks ────────────────────────────────────
  {
    id: 'streak_3',
    name: 'Hot Start',
    desc: 'Win 3 matches in a row',
    target: 3,
    progress: (s) => Math.min(3, s.bestStreak),
    check: (s) => s.bestStreak >= 3,
    points: 15,
  },
  {
    id: 'streak_7',
    name: 'On Fire',
    desc: 'Win 7 matches in a row',
    target: 7,
    progress: (s) => Math.min(7, s.bestStreak),
    check: (s) => s.bestStreak >= 7,
    points: 45,
  },
  {
    id: 'streak_10',
    name: 'Unstoppable',
    desc: 'Win 10 matches in a row',
    target: 10,
    progress: (s) => Math.min(10, s.bestStreak),
    check: (s) => s.bestStreak >= 10,
    points: 75,
  },
  {
    id: 'streak_15',
    name: 'Rampage',
    desc: 'Win 15 matches in a row',
    target: 15,
    progress: (s) => Math.min(15, s.bestStreak),
    check: (s) => s.bestStreak >= 15,
    points: 120,
  },
  {
    id: 'streak_25',
    name: 'Dominator',
    desc: 'Win 25 matches in a row',
    target: 25,
    progress: (s) => Math.min(25, s.bestStreak),
    check: (s) => s.bestStreak >= 25,
    points: 200,
  },

  // ── Shutouts & clean sheets ────────────────────
  {
    id: 'clean_sheet',
    name: 'Clean Sheet',
    desc: 'Win without conceding a single goal',
    check: (_s, m) => m.hasOpponent && m.won && m.opponentScore === 0,
    points: 25,
  },
  {
    id: 'shutout_5',
    name: 'Brick Wall',
    desc: 'Win 5 matches without conceding',
    target: 5,
    progress: (s) => Math.min(5, s.shutouts ?? 0),
    check: (s) => (s.shutouts ?? 0) >= 5,
    points: 60,
  },
  {
    id: 'shutout_10',
    name: 'Fortress',
    desc: 'Win 10 matches without conceding',
    target: 10,
    progress: (s) => Math.min(10, s.shutouts ?? 0),
    check: (s) => (s.shutouts ?? 0) >= 10,
    points: 100,
  },
  {
    id: 'perfect_10',
    name: 'Perfect 10',
    desc: 'Win 10-0',
    check: (_s, m) => m.hasOpponent && m.won && m.playerScore >= 10 && m.opponentScore === 0,
    points: 55,
  },

  // ── Score & margin ─────────────────────────────
  {
    id: 'hat_trick',
    name: 'Hat Trick',
    desc: 'Score 3 goals in a single match',
    check: (_s, m) => m.hasOpponent && m.playerScore >= 3,
    points: 15,
  },
  {
    id: 'goal_machine',
    name: 'Goal Machine',
    desc: 'Score 7+ goals in a single match',
    check: (_s, m) => m.hasOpponent && m.playerScore >= 7,
    points: 30,
  },
  {
    id: 'blowout',
    name: 'Blowout',
    desc: 'Win by 5 or more goals',
    check: (_s, m) => m.hasOpponent && m.won && m.playerScore - m.opponentScore >= 5,
    points: 30,
  },
  {
    id: 'nail_biter',
    name: 'Nail Biter',
    desc: 'Win by exactly 1 goal',
    check: (_s, m) => m.hasOpponent && m.won && m.playerScore - m.opponentScore === 1,
    points: 20,
  },
  {
    id: 'comeback_5',
    name: 'Miracle Comeback',
    desc: 'Win after trailing by 5 or more goals',
    check: (_s, m) => m.hasOpponent && m.won && m.maxDeficit >= 5,
    points: 70,
  },

  // ── Hits & skill ───────────────────────────────
  {
    id: 'hits_500',
    name: 'Slap Shot Specialist',
    desc: 'Strike the puck 500 times',
    target: 500,
    progress: (s) => Math.min(500, s.totalHits),
    check: (s) => s.totalHits >= 500,
    points: 40,
  },
  {
    id: 'hits_1000',
    name: 'Hit Machine',
    desc: 'Strike the puck 1,000 times',
    target: 1000,
    progress: (s) => Math.min(1000, s.totalHits),
    check: (s) => s.totalHits >= 1000,
    points: 80,
  },
  {
    id: 'hits_5000',
    name: 'Endless Striker',
    desc: 'Strike the puck 5,000 times',
    target: 5000,
    progress: (s) => Math.min(5000, s.totalHits),
    check: (s) => s.totalHits >= 5000,
    points: 200,
  },
  {
    id: 'speed_1500',
    name: 'Sonic Boom',
    desc: 'Launch the puck at 1500+ speed',
    target: 1500,
    progress: (s) => Math.min(1500, Math.round(s.fastestPuck)),
    check: (s, m) => m.maxPuckSpeed >= 1500 || s.fastestPuck >= 1500,
    points: 40,
  },
  {
    id: 'speed_2000',
    name: 'Lightspeed',
    desc: 'Launch the puck at 2000+ speed',
    target: 2000,
    progress: (s) => Math.min(2000, Math.round(s.fastestPuck)),
    check: (s, m) => m.maxPuckSpeed >= 2000 || s.fastestPuck >= 2000,
    points: 80,
  },

  // ── Power-ups ──────────────────────────────────
  {
    id: 'powerups_25',
    name: 'Power Collector',
    desc: 'Collect 25 power-ups',
    target: 25,
    progress: (s) => Math.min(25, s.powerupsCollected),
    check: (s) => s.powerupsCollected >= 25,
    points: 35,
  },
  {
    id: 'powerups_50',
    name: 'Power Hoarder',
    desc: 'Collect 50 power-ups',
    target: 50,
    progress: (s) => Math.min(50, s.powerupsCollected),
    check: (s) => s.powerupsCollected >= 50,
    points: 60,
  },
  {
    id: 'powerups_100',
    name: 'Power Overwhelming',
    desc: 'Collect 100 power-ups',
    target: 100,
    progress: (s) => Math.min(100, s.powerupsCollected),
    check: (s) => s.powerupsCollected >= 100,
    points: 120,
  },

  // ── AI difficulty / personality ────────────────
  {
    id: 'beat_easy',
    name: 'Warm-Up',
    desc: 'Defeat an Easy AI',
    check: (_s, m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.difficulty === 'easy' && m.won,
    points: 10,
  },
  {
    id: 'beat_medium',
    name: 'Rising Star',
    desc: 'Defeat a Medium AI',
    check: (_s, m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.difficulty === 'medium' && m.won,
    points: 20,
  },
  {
    id: 'beat_hard',
    name: 'Hard Mode Hero',
    desc: 'Defeat a Hard AI',
    check: (_s, m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.difficulty === 'hard' && m.won,
    points: 35,
  },
  {
    id: 'beat_grandmaster',
    name: 'Grandmaster Slayer',
    desc: 'Defeat an Adaptive Grandmaster AI',
    check: (_s, m) =>
      m.opponentType === 'ai' &&
      m.hasOpponent &&
      (m.personality as string) === 'adaptive_grandmaster' &&
      m.won,
    points: 80,
  },
  {
    id: 'beat_eternal',
    name: 'Eternal Challenger',
    desc: 'Defeat an Adaptive Eternal AI',
    check: (_s, m) =>
      m.opponentType === 'ai' &&
      m.hasOpponent &&
      (m.personality as string) === 'adaptive_eternal' &&
      m.won,
    points: 100,
  },
  {
    id: 'beat_immortal',
    name: 'Immortal Hunter',
    desc: 'Defeat an Adaptive Immortal AI',
    check: (_s, m) =>
      m.opponentType === 'ai' &&
      m.hasOpponent &&
      (m.personality as string) === 'adaptive_immortal' &&
      m.won,
    points: 150,
  },
  {
    id: 'beat_defender',
    name: 'Wall Breaker',
    desc: 'Defeat a Defender personality AI',
    check: (_s, m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.personality === 'defender' && m.won,
    points: 25,
  },
  {
    id: 'beat_attacker',
    name: 'Counter-Attacker',
    desc: 'Defeat an Attacker personality AI',
    check: (_s, m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.personality === 'attacker' && m.won,
    points: 25,
  },

  // ── Campaign / stages ──────────────────────────
  {
    id: 'stage_1',
    name: 'First Steps',
    desc: 'Clear Stage 1',
    check: (s) => (s.stages?.[1]?.stars ?? 0) >= 1,
    points: 10,
  },
  {
    id: 'stage_10',
    name: 'World Traveler',
    desc: 'Clear Stage 10',
    check: (s) => (s.stages?.[10]?.stars ?? 0) >= 1,
    points: 30,
  },
  {
    id: 'stage_20',
    name: 'Seasoned',
    desc: 'Clear Stage 20',
    check: (s) => (s.stages?.[20]?.stars ?? 0) >= 1,
    points: 50,
  },
  {
    id: 'stage_30',
    name: 'Champion Path',
    desc: 'Clear Stage 30',
    check: (s) => (s.stages?.[30]?.stars ?? 0) >= 1,
    points: 75,
  },
  {
    id: 'stage_50',
    name: 'Halfway Hero',
    desc: 'Clear Stage 50',
    check: (s) => (s.stages?.[50]?.stars ?? 0) >= 1,
    points: 120,
  },
  {
    id: 'stage_100',
    name: 'Campaign Complete',
    desc: 'Clear Stage 100',
    check: (s) => (s.stages?.[100]?.stars ?? 0) >= 1,
    points: 250,
  },
  {
    id: 'three_star_5',
    name: 'Perfectionist',
    desc: 'Earn 3 stars on 5 stages',
    target: 5,
    progress: (s) =>
      Math.min(
        5,
        Object.values(s.stages ?? {}).filter((st: any) => (st?.stars ?? 0) >= 3).length
      ),
    check: (s) =>
      Object.values(s.stages ?? {}).filter((st: any) => (st?.stars ?? 0) >= 3).length >= 5,
    points: 50,
  },
  {
    id: 'three_star_15',
    name: 'Star Collector',
    desc: 'Earn 3 stars on 15 stages',
    target: 15,
    progress: (s) =>
      Math.min(
        15,
        Object.values(s.stages ?? {}).filter((st: any) => (st?.stars ?? 0) >= 3).length
      ),
    check: (s) =>
      Object.values(s.stages ?? {}).filter((st: any) => (st?.stars ?? 0) >= 3).length >= 15,
    points: 100,
  },
  {
    id: 'three_star_30',
    name: 'Star Master',
    desc: 'Earn 3 stars on 30 stages',
    target: 30,
    progress: (s) =>
      Math.min(
        30,
        Object.values(s.stages ?? {}).filter((st: any) => (st?.stars ?? 0) >= 3).length
      ),
    check: (s) =>
      Object.values(s.stages ?? {}).filter((st: any) => (st?.stars ?? 0) >= 3).length >= 30,
    points: 180,
  },
  {
    id: 'total_stars_50',
    name: 'Star Hunter',
    desc: 'Earn 50 total stage stars',
    target: 50,
    progress: (s) =>
      Math.min(
        50,
        Object.values(s.stages ?? {}).reduce((sum: number, st: any) => sum + (st?.stars ?? 0), 0)
      ),
    check: (s) =>
      Object.values(s.stages ?? {}).reduce((sum: number, st: any) => sum + (st?.stars ?? 0), 0) >=
      50,
    points: 60,
  },
  {
    id: 'total_stars_100',
    name: 'Star Lord',
    desc: 'Earn 100 total stage stars',
    target: 100,
    progress: (s) =>
      Math.min(
        100,
        Object.values(s.stages ?? {}).reduce((sum: number, st: any) => sum + (st?.stars ?? 0), 0)
      ),
    check: (s) =>
      Object.values(s.stages ?? {}).reduce((sum: number, st: any) => sum + (st?.stars ?? 0), 0) >=
      100,
    points: 120,
  },
  {
    id: 'total_stars_200',
    name: 'Constellation',
    desc: 'Earn 200 total stage stars',
    target: 200,
    progress: (s) =>
      Math.min(
        200,
        Object.values(s.stages ?? {}).reduce((sum: number, st: any) => sum + (st?.stars ?? 0), 0)
      ),
    check: (s) =>
      Object.values(s.stages ?? {}).reduce((sum: number, st: any) => sum + (st?.stars ?? 0), 0) >=
      200,
    points: 250,
  },

  // ── Boss stages ────────────────────────────────
  {
    id: 'boss_first',
    name: 'Boss Breaker',
    desc: 'Defeat your first boss stage',
    check: (_s, m) => (m.isBoss ?? false) && m.won,
    points: 40,
  },
  {
    id: 'boss_3star',
    name: 'Boss Perfect',
    desc: 'Earn 3 stars on a boss stage',
    check: (_s, m) => (m.isBoss ?? false) && m.won && (m.starsEarned ?? 0) >= 3,
    points: 70,
  },

  // ── Coins & economy ────────────────────────────
  {
    id: 'coins_100',
    name: 'Pocket Change',
    desc: 'Hold 100 coins at once',
    target: 100,
    progress: (s) => Math.min(100, s.coins ?? 0),
    check: (s) => (s.coins ?? 0) >= 100,
    points: 20,
  },
  {
    id: 'coins_500',
    name: 'Saver',
    desc: 'Hold 500 coins at once',
    target: 500,
    progress: (s) => Math.min(500, s.coins ?? 0),
    check: (s) => (s.coins ?? 0) >= 500,
    points: 50,
  },
  {
    id: 'coins_1000',
    name: 'Rich',
    desc: 'Hold 1,000 coins at once',
    target: 1000,
    progress: (s) => Math.min(1000, s.coins ?? 0),
    check: (s) => (s.coins ?? 0) >= 1000,
    points: 100,
  },
  {
    id: 'coins_earned_500',
    name: 'Earner',
    desc: 'Earn 500 total coins lifetime',
    target: 500,
    progress: (s) => Math.min(500, s.totalCoinsEarned ?? 0),
    check: (s) => (s.totalCoinsEarned ?? 0) >= 500,
    points: 40,
  },
  {
    id: 'coins_earned_2000',
    name: 'Tycoon',
    desc: 'Earn 2,000 total coins lifetime',
    target: 2000,
    progress: (s) => Math.min(2000, s.totalCoinsEarned ?? 0),
    check: (s) => (s.totalCoinsEarned ?? 0) >= 2000,
    points: 100,
  },

  // ── Skins / unlocks ────────────────────────────
  {
    id: 'unlock_table',
    name: 'Table Style',
    desc: 'Unlock any table skin',
    check: (s) => (s.unlockedTables?.length ?? 0) >= 2,
    points: 25,
  },
  {
    id: 'unlock_puck',
    name: 'Puck Collector',
    desc: 'Unlock any special puck',
    check: (s) => (s.unlockedPucks?.length ?? 0) >= 2,
    points: 25,
  },
  {
    id: 'unlock_mallet',
    name: 'Mallet Fan',
    desc: 'Unlock any special mallet',
    check: (s) => (s.unlockedMallets?.length ?? 0) >= 2,
    points: 25,
  },
  {
    id: 'collector_10',
    name: 'Gear Collector',
    desc: 'Own 10 total skins (table + puck + mallet)',
    target: 10,
    progress: (s) =>
      Math.min(
        10,
        (s.unlockedTables?.length ?? 1) +
          (s.unlockedPucks?.length ?? 1) +
          (s.unlockedMallets?.length ?? 1)
      ),
    check: (s) =>
      (s.unlockedTables?.length ?? 1) +
        (s.unlockedPucks?.length ?? 1) +
        (s.unlockedMallets?.length ?? 1) >=
      10,
    points: 60,
  },

  // ── Special match conditions ───────────────────
  {
    id: 'sudden_death_win',
    name: 'Sudden Hero',
    desc: 'Win a sudden-death match',
    check: (_s, m) => m.winCondition === 'sudden_death' && m.won,
    points: 30,
  },
  {
    id: 'timed_win',
    name: 'Against the Clock',
    desc: 'Win a timed match',
    check: (_s, m) => m.winCondition === 'timed' && m.won,
    points: 25,
  },
  {
    id: 'double_puck_win',
    name: 'Double Trouble',
    desc: 'Win a match while double-puck is active',
    check: (_s, m) => (m.doublePuckActive ?? false) && m.won,
    points: 35,
  },
  {
    id: 'no_powerup_win',
    name: 'Pure Skill',
    desc: 'Win a match without collecting any power-up',
    check: (_s, m) => m.hasOpponent && m.won && (m.powerupsThisMatch ?? 0) === 0,
    points: 30,
  },
  {
    id: 'fast_win_60',
    name: 'Quick Match',
    desc: 'Win a match in under 60 seconds',
    check: (_s, m) => m.hasOpponent && m.won && (m.durationSec ?? 999) <= 60,
    points: 40,
  },
  {
    id: 'fast_win_30',
    name: 'Blitz',
    desc: 'Win a match in under 30 seconds',
    check: (_s, m) => m.hasOpponent && m.won && (m.durationSec ?? 999) <= 30,
    points: 70,
  },

  // ── Play volume ────────────────────────────────
  {
    id: 'matches_10',
    name: 'Regular',
    desc: 'Play 10 matches',
    target: 10,
    progress: (s) => Math.min(10, (s.wins ?? 0) + (s.losses ?? 0)),
    check: (s) => (s.wins ?? 0) + (s.losses ?? 0) >= 10,
    points: 15,
  },
  {
    id: 'matches_50',
    name: 'Dedicated',
    desc: 'Play 50 matches',
    target: 50,
    progress: (s) => Math.min(50, (s.wins ?? 0) + (s.losses ?? 0)),
    check: (s) => (s.wins ?? 0) + (s.losses ?? 0) >= 50,
    points: 40,
  },
  {
    id: 'matches_100',
    name: 'Veteran',
    desc: 'Play 100 matches',
    target: 100,
    progress: (s) => Math.min(100, (s.wins ?? 0) + (s.losses ?? 0)),
    check: (s) => (s.wins ?? 0) + (s.losses ?? 0) >= 100,
    points: 80,
  },
  {
    id: 'matches_250',
    name: 'Addicted',
    desc: 'Play 250 matches',
    target: 250,
    progress: (s) => Math.min(250, (s.wins ?? 0) + (s.losses ?? 0)),
    check: (s) => (s.wins ?? 0) + (s.losses ?? 0) >= 250,
    points: 150,
  },

  // ── Fun / rare ─────────────────────────────────
  {
    id: 'first_loss',
    name: 'Learning Curve',
    desc: 'Lose your first match',
    check: (s) => (s.losses ?? 0) >= 1,
    points: 5,
  },
  {
    id: 'close_loss',
    name: 'So Close',
    desc: 'Lose by exactly 1 goal',
    check: (_s, m) =>
      m.hasOpponent && !m.won && m.opponentScore - m.playerScore === 1,
    points: 10,
  },
  {
    id: 'own_goal_survive',
    name: 'Shake It Off',
    desc: 'Win a match after conceding first',
    check: (_s, m) => m.hasOpponent && m.won && (m.concededFirst ?? false),
    points: 20,
  },
  {
    id: 'long_rally',
    name: 'Rally King',
    desc: 'Have a rally of 20+ hits in one exchange',
    check: (_s, m) => (m.longestRally ?? 0) >= 20,
    points: 35,
  },
  {
    id: 'long_rally_40',
    name: 'Endless Rally',
    desc: 'Have a rally of 40+ hits in one exchange',
    check: (_s, m) => (m.longestRally ?? 0) >= 40,
    points: 70,
  },
];

export const CHALLENGES: DailyChallengeDef[] = [
  // -- Wins (easy) --------------------------------
  {
    id: 'win_1',
    title: 'First Blood',
    desc: 'Win 1 match today',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won ? 1 : 0),
  },
  {
    id: 'win_2',
    title: 'Double Up',
    desc: 'Win 2 matches today',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won ? 1 : 0),
  },
  {
    id: 'win_3',
    title: 'Hat Trick Wins',
    desc: 'Win 3 matches today',
    target: 3,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won ? 1 : 0),
  },
  {
    id: 'win_easy_1',
    title: 'Easy Does It',
    desc: 'Win 1 match on Easy',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.difficulty === 'easy' && m.won ? 1 : 0,
  },
  {
    id: 'win_easy_2',
    title: 'Easy Streak',
    desc: 'Win 2 matches on Easy',
    target: 2,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.difficulty === 'easy' && m.won ? 1 : 0,
  },
  {
    id: 'win_medium_1',
    title: 'Medium Warm-Up',
    desc: 'Win 1 match on Medium',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.difficulty === 'medium' && m.won ? 1 : 0,
  },
  {
    id: 'win_medium_2',
    title: 'Medium Rider',
    desc: 'Win 2 matches on Medium',
    target: 2,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.difficulty === 'medium' && m.won ? 1 : 0,
  },
  {
    id: 'win_hard_1',
    title: 'Hard Starter',
    desc: 'Win 1 match on Hard',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.difficulty === 'hard' && m.won ? 1 : 0,
  },
  {
    id: 'win_any_1b',
    title: 'Victory Lap',
    desc: 'Win any match today',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won ? 1 : 0),
  },
  {
    id: 'win_2_easy',
    title: 'Easy Pair',
    desc: 'Win 2 Easy matches',
    target: 2,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.difficulty === 'easy' && m.won ? 1 : 0,
  },
  {
    id: 'win_1_medium_clean',
    title: 'Clean Medium',
    desc: 'Win a Medium match conceding = 1',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' &&
      m.difficulty === 'medium' &&
      m.opponentScore <= 1
        ? 1
        : 0,
  },
  {
    id: 'win_streak_2_day',
    title: 'Two in a Row',
    desc: 'Win 2 matches today',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won ? 1 : 0),
  },
  {
    id: 'win_two_modes',
    title: 'Mode Mixer',
    desc: 'Win 2 matches (any mode)',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won ? 1 : 0),
  },
  // -- Goals scored -------------------------------
  {
    id: 'score_3',
    title: 'Open the Scoring',
    desc: 'Score 3 goals today',
    target: 3,
    reward: 5,
    increment: (m) => (m.hasOpponent ? m.playerScore : 0),
  },
  {
    id: 'score_5',
    title: 'Goal Getter',
    desc: 'Score 5 goals today',
    target: 5,
    reward: 5,
    increment: (m) => (m.hasOpponent ? m.playerScore : 0),
  },
  {
    id: 'score_8',
    title: 'In Form',
    desc: 'Score 8 goals today',
    target: 8,
    reward: 5,
    increment: (m) => (m.hasOpponent ? m.playerScore : 0),
  },
  {
    id: 'score_10',
    title: 'Goal Machine',
    desc: 'Score 10 goals today',
    target: 10,
    reward: 5,
    increment: (m) => (m.hasOpponent ? m.playerScore : 0),
  },
  {
    id: 'score_1_match',
    title: 'Get on the Board',
    desc: 'Score at least 1 goal in a match',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore >= 1 ? 1 : 0),
  },
  {
    id: 'score_3_match',
    title: 'Hat Trick',
    desc: 'Score 3+ goals in a single match',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore >= 3 ? 1 : 0),
  },
  {
    id: 'score_5_match',
    title: 'High Scorer',
    desc: 'Score 5+ goals in a single match',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore >= 5 ? 1 : 0),
  },
  {
    id: 'score_4',
    title: 'Four on the Board',
    desc: 'Score 4 goals today',
    target: 4,
    reward: 5,
    increment: (m) => (m.hasOpponent ? m.playerScore : 0),
  },
  {
    id: 'score_6',
    title: 'Half Dozen',
    desc: 'Score 6 goals today',
    target: 6,
    reward: 5,
    increment: (m) => (m.hasOpponent ? m.playerScore : 0),
  },
  {
    id: 'score_7',
    title: 'Lucky Seven',
    desc: 'Score 7 goals today',
    target: 7,
    reward: 5,
    increment: (m) => (m.hasOpponent ? m.playerScore : 0),
  },
  {
    id: 'score_2_match',
    title: 'Brace',
    desc: 'Score 2+ goals in one match',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore >= 2 ? 1 : 0),
  },
  {
    id: 'score_4_match',
    title: 'Poker',
    desc: 'Score 4+ goals in one match',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore >= 4 ? 1 : 0),
  },
  {
    id: 'score_in_2_matches',
    title: 'Multi-Match Scorer',
    desc: 'Score at least 1 goal in 2 matches',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore >= 1 ? 1 : 0),
  },
  {
    id: 'score_any',
    title: 'Light the Lamp',
    desc: 'Score a goal today',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore > 0 ? 1 : 0),
  },
  {
    id: 'goals_today_9',
    title: 'Nine Goals',
    desc: 'Score 9 goals today',
    target: 9,
    reward: 5,
    increment: (m) => (m.hasOpponent ? m.playerScore : 0),
  },
  // -- Clean sheets / defense ---------------------
  {
    id: 'shutout_1',
    title: 'Brick Wall',
    desc: 'Win a match with 0 goals conceded',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && m.opponentScore === 0 ? 1 : 0),
  },
  {
    id: 'concede_under_2',
    title: 'Tight Defense',
    desc: 'Win while conceding 2 or fewer goals',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && m.opponentScore <= 2 ? 1 : 0),
  },
  {
    id: 'concede_under_1',
    title: 'Almost Perfect',
    desc: 'Win while conceding 1 or fewer goals',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && m.opponentScore <= 1 ? 1 : 0),
  },
  {
    id: 'concede_0_play',
    title: 'No Damage',
    desc: 'Finish a match without conceding',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.opponentScore === 0 ? 1 : 0),
  },
  {
    id: 'defend_well_2',
    title: 'Solid Backline',
    desc: 'Win 2 matches conceding = 2 each',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && m.opponentScore <= 2 ? 1 : 0),
  },
  // -- Play volume --------------------------------
  {
    id: 'play_1',
    title: 'Show Up',
    desc: 'Finish 1 match today',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent ? 1 : 0),
  },
  {
    id: 'play_2',
    title: 'Double Session',
    desc: 'Finish 2 matches today',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent ? 1 : 0),
  },
  {
    id: 'play_3',
    title: 'Triple Session',
    desc: 'Finish 3 matches today',
    target: 3,
    reward: 5,
    increment: (m) => (m.hasOpponent ? 1 : 0),
  },
  {
    id: 'play_4',
    title: 'Keep Playing',
    desc: 'Finish 4 matches today',
    target: 4,
    reward: 5,
    increment: (m) => (m.hasOpponent ? 1 : 0),
  },
  // -- Hits ---------------------------------------
  {
    id: 'hits_15',
    title: 'Touch the Puck',
    desc: 'Hit the puck 15 times today',
    target: 15,
    reward: 5,
    increment: (m) => m.hits ?? 0,
  },
  {
    id: 'hits_20',
    title: 'Warm Hands',
    desc: 'Hit the puck 20 times today',
    target: 20,
    reward: 5,
    increment: (m) => m.hits ?? 0,
  },
  {
    id: 'hits_30',
    title: 'Keep Swinging',
    desc: 'Hit the puck 30 times today',
    target: 30,
    reward: 5,
    increment: (m) => m.hits ?? 0,
  },
  {
    id: 'hits_40',
    title: 'Active Stick',
    desc: 'Hit the puck 40 times today',
    target: 40,
    reward: 5,
    increment: (m) => m.hits ?? 0,
  },
  {
    id: 'hits_50',
    title: 'Contact King',
    desc: 'Hit the puck 50 times today',
    target: 50,
    reward: 5,
    increment: (m) => m.hits ?? 0,
  },
  {
    id: 'hits_60',
    title: 'Busy Day',
    desc: 'Hit the puck 60 times today',
    target: 60,
    reward: 5,
    increment: (m) => m.hits ?? 0,
  },
  {
    id: 'hits_70',
    title: 'Relentless',
    desc: 'Hit the puck 70 times today',
    target: 70,
    reward: 5,
    increment: (m) => m.hits ?? 0,
  },
  {
    id: 'hits_80',
    title: 'Slap Festival',
    desc: 'Hit the puck 80 times today',
    target: 80,
    reward: 5,
    increment: (m) => m.hits ?? 0,
  },
  {
    id: 'hits_10_match',
    title: 'Stay Active',
    desc: 'Record 10+ hits in a single match',
    target: 1,
    reward: 5,
    increment: (m) => ((m.hits ?? 0) >= 10 ? 1 : 0),
  },
  {
    id: 'hits_15_match',
    title: 'Busy Match',
    desc: 'Get 15+ hits in one match',
    target: 1,
    reward: 5,
    increment: (m) => ((m.hits ?? 0) >= 15 ? 1 : 0),
  },
  {
    id: 'hits_20_match',
    title: 'Work Rate',
    desc: 'Record 20+ hits in a single match',
    target: 1,
    reward: 5,
    increment: (m) => ((m.hits ?? 0) >= 20 ? 1 : 0),
  },
  {
    id: 'hits_25_match',
    title: 'Workhorse',
    desc: 'Get 25+ hits in one match',
    target: 1,
    reward: 5,
    increment: (m) => ((m.hits ?? 0) >= 25 ? 1 : 0),
  },
  // -- Power-ups ----------------------------------
  {
    id: 'powerups_1',
    title: 'Power Nibble',
    desc: 'Collect 1 power-up today',
    target: 1,
    reward: 5,
    increment: (m) => m.powerupsCollected ?? 0,
  },
  {
    id: 'powerups_2',
    title: 'Power Snack',
    desc: 'Collect 2 power-ups today',
    target: 2,
    reward: 5,
    increment: (m) => m.powerupsCollected ?? 0,
  },
  {
    id: 'powerups_3',
    title: 'Power Bite',
    desc: 'Collect 3 power-ups today',
    target: 3,
    reward: 5,
    increment: (m) => m.powerupsCollected ?? 0,
  },
  {
    id: 'powerups_4',
    title: 'Power Grab',
    desc: 'Collect 4 power-ups today',
    target: 4,
    reward: 5,
    increment: (m) => m.powerupsCollected ?? 0,
  },
  {
    id: 'powerups_5',
    title: 'Power Collector',
    desc: 'Collect 5 power-ups today',
    target: 5,
    reward: 5,
    increment: (m) => m.powerupsCollected ?? 0,
  },
  {
    id: 'powerup_in_match',
    title: 'One Power-Up',
    desc: 'Collect a power-up in a match',
    target: 1,
    reward: 5,
    increment: (m) => ((m.powerupsCollected ?? 0) >= 1 ? 1 : 0),
  },
  {
    id: 'powerups_2_match',
    title: 'Power Pair',
    desc: 'Collect 2+ power-ups in one match',
    target: 1,
    reward: 5,
    increment: (m) => ((m.powerupsCollected ?? 0) >= 2 ? 1 : 0),
  },
  // -- Margins & style ----------------------------
  {
    id: 'win_by_1',
    title: 'Narrow Escape',
    desc: 'Win a match by exactly 1 goal',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.hasOpponent && m.won && m.playerScore - m.opponentScore === 1 ? 1 : 0,
  },
  {
    id: 'win_by_2',
    title: 'Comfortable Win',
    desc: 'Win a match by 2+ goals',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.hasOpponent && m.won && m.playerScore - m.opponentScore >= 2 ? 1 : 0,
  },
  {
    id: 'win_by_3',
    title: 'Clear Winner',
    desc: 'Win a match by 3+ goals',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.hasOpponent && m.won && m.playerScore - m.opponentScore >= 3 ? 1 : 0,
  },
  {
    id: 'win_by_4',
    title: 'Big Margin',
    desc: 'Win by 4+ goals',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.hasOpponent && m.won && m.playerScore - m.opponentScore >= 4 ? 1 : 0,
  },
  {
    id: 'close_win',
    title: 'Clutch',
    desc: 'Win by 1 or 2 goals',
    target: 1,
    reward: 5,
    increment: (m) => {
      if (!m.hasOpponent || !m.won) return 0;
      const d = m.playerScore - m.opponentScore;
      return d === 1 || d === 2 ? 1 : 0;
    },
  },
  {
    id: 'score_first',
    title: 'First Strike',
    desc: 'Score the first goal in a match',
    target: 1,
    reward: 5,
    increment: (m) => (m.scoredFirst ? 1 : 0),
  },
  // -- Speed (mild) -------------------------------
  {
    id: 'speed_700',
    title: 'Quick Touch',
    desc: 'Hit 700+ puck speed',
    target: 1,
    reward: 5,
    increment: (m) => ((m.maxPuckSpeed ?? 0) >= 700 ? 1 : 0),
  },
  {
    id: 'speed_800',
    title: 'Zip It',
    desc: 'Hit a puck at 800+ speed',
    target: 1,
    reward: 5,
    increment: (m) => ((m.maxPuckSpeed ?? 0) >= 800 ? 1 : 0),
  },
  {
    id: 'speed_900',
    title: 'Snappy Shot',
    desc: 'Hit 900+ puck speed',
    target: 1,
    reward: 5,
    increment: (m) => ((m.maxPuckSpeed ?? 0) >= 900 ? 1 : 0),
  },
  {
    id: 'speed_1000',
    title: 'Fast Shot',
    desc: 'Hit a puck at 1000+ speed',
    target: 1,
    reward: 5,
    increment: (m) => ((m.maxPuckSpeed ?? 0) >= 1000 ? 1 : 0),
  },
  {
    id: 'speed_1100',
    title: 'Laser',
    desc: 'Hit 1100+ puck speed',
    target: 1,
    reward: 5,
    increment: (m) => ((m.maxPuckSpeed ?? 0) >= 1100 ? 1 : 0),
  },
  {
    id: 'speed_1200',
    title: 'Rocket',
    desc: 'Hit a puck at 1200+ speed',
    target: 1,
    reward: 5,
    increment: (m) => ((m.maxPuckSpeed ?? 0) >= 1200 ? 1 : 0),
  },
  // -- Personality / AI flavor --------------------
  {
    id: 'beat_attacker_1',
    title: 'Stop the Attack',
    desc: 'Beat an Attacker AI once',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.personality === 'attacker' && m.won ? 1 : 0,
  },
  {
    id: 'beat_defender_1',
    title: 'Crack the Wall',
    desc: 'Beat a Defender AI once',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.personality === 'defender' && m.won ? 1 : 0,
  },
  {
    id: 'beat_balanced_1',
    title: 'All-Rounder',
    desc: 'Beat a Balanced AI once',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.hasOpponent && m.personality === 'balanced' && m.won ? 1 : 0,
  },
  {
    id: 'beat_attacker_2',
    title: 'Attack Denied',
    desc: 'Beat Attacker AI twice',
    target: 2,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.personality === 'attacker' && m.won ? 1 : 0,
  },
  {
    id: 'beat_defender_2',
    title: 'Wall Cracker',
    desc: 'Beat Defender AI twice',
    target: 2,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' && m.personality === 'defender' && m.won ? 1 : 0,
  },
  {
    id: 'beat_any_ai_2',
    title: 'AI Hunter',
    desc: 'Beat any AI twice today',
    target: 2,
    reward: 5,
    increment: (m) => (m.opponentType === 'ai' && m.won ? 1 : 0),
  },
  // -- Match modes --------------------------------
  {
    id: 'win_sudden_1',
    title: 'Sudden Win',
    desc: 'Win a sudden-death match',
    target: 1,
    reward: 5,
    increment: (m) => (m.winCondition === 'sudden_death' && m.won ? 1 : 0),
  },
  {
    id: 'win_timed_1',
    title: 'Beat the Clock',
    desc: 'Win a timed match',
    target: 1,
    reward: 5,
    increment: (m) => (m.winCondition === 'timed' && m.won ? 1 : 0),
  },
  {
    id: 'win_first_to_1',
    title: 'Race to Win',
    desc: 'Win a first-to-X match',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.winCondition !== 'sudden_death' && m.winCondition !== 'timed' && m.won ? 1 : 0,
  },
  {
    id: 'play_timed_1',
    title: 'Time Trial',
    desc: 'Play a timed match',
    target: 1,
    reward: 5,
    increment: (m) => (m.winCondition === 'timed' ? 1 : 0),
  },
  {
    id: 'play_sudden_1',
    title: 'Sudden Entry',
    desc: 'Play a sudden-death match',
    target: 1,
    reward: 5,
    increment: (m) => (m.winCondition === 'sudden_death' ? 1 : 0),
  },
  {
    id: 'win_timed_score',
    title: 'Timed Scorer',
    desc: 'Win a timed match and score 2+',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.winCondition === 'timed' && m.won && m.playerScore >= 2 ? 1 : 0,
  },
  // -- Simple combos ------------------------------
  {
    id: 'win_and_score_3',
    title: 'Solid Match',
    desc: 'Win a match and score 3+ goals',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && m.playerScore >= 3 ? 1 : 0),
  },
  {
    id: 'win_no_concede_2',
    title: 'Steady Defense',
    desc: 'Win while conceding at most 2',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && m.opponentScore <= 2 ? 1 : 0),
  },
  {
    id: 'two_wins_same_day',
    title: 'Back to Back',
    desc: 'Win 2 matches today',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won ? 1 : 0),
  },
  {
    id: 'two_goals_two_matches',
    title: 'Consistent',
    desc: 'Score 2+ goals in two different matches',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore >= 2 ? 1 : 0),
  },
  // -- Rally / activity ---------------------------
  {
    id: 'rally_6',
    title: 'Mini Rally',
    desc: 'Rally of 6+ hits',
    target: 1,
    reward: 5,
    increment: (m) => ((m.longestRally ?? 0) >= 6 ? 1 : 0),
  },
  {
    id: 'rally_8',
    title: 'Short Rally',
    desc: 'Have a rally of 8+ hits',
    target: 1,
    reward: 5,
    increment: (m) => ((m.longestRally ?? 0) >= 8 ? 1 : 0),
  },
  {
    id: 'rally_10',
    title: 'Ten Touch',
    desc: 'Rally of 10+ hits',
    target: 1,
    reward: 5,
    increment: (m) => ((m.longestRally ??  0) >= 10 ? 1 : 0),
  },
  {
    id: 'rally_12',
    title: 'Nice Rally',
    desc: 'Have a rally of 12+ hits',
    target: 1,
    reward: 5,
    increment: (m) => ((m.longestRally ?? 0) >= 12 ? 1 : 0),
  },
  {
    id: 'rally_14',
    title: 'Extended Rally',
    desc: 'Rally of 14+ hits',
    target: 1,
    reward: 5,
    increment: (m) => ((m.longestRally ?? 0) >= 14 ? 1 : 0),
  },
  {
    id: 'rally_15',
    title: 'Long Rally',
    desc: 'Have a rally of 15+ hits',
    target: 1,
    reward: 5,
    increment: (m) => ((m.longestRally ?? 0) >= 15 ? 1 : 0),
  },
  // -- Comeback (mild) ----------------------------
  {
    id: 'comeback_1',
    title: 'Turnaround',
    desc: 'Win after trailing by 1+ goal',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && (m.maxDeficit ?? 0) >= 1 ? 1 : 0),
  },
  {
    id: 'comeback_2',
    title: 'Fight Back',
    desc: 'Win after trailing by 2+ goals',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && (m.maxDeficit ?? 0) >= 2 ? 1 : 0),
  },
  {
    id: 'comeback_from_1',
    title: 'Equalizer Path',
    desc: 'Win after trailing',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && (m.maxDeficit ?? 0) >= 1 ? 1 : 0),
  },
  // -- Stages -------------------------------------
  {
    id: 'stage_play_1',
    title: 'Campaign Touch',
    desc: 'Play a campaign stage',
    target: 1,
    reward: 5,
    increment: (m) => (m.isStage ? 1 : 0),
  },
  {
    id: 'stage_win_1',
    title: 'Stage Victory',
    desc: 'Win a campaign stage',
    target: 1,
    reward: 5,
    increment: (m) => (m.isStage && m.won ? 1 : 0),
  },
  {
    id: 'stage_star_any',
    title: 'Star Today',
    desc: 'Earn any star on a stage',
    target: 1,
    reward: 5,
    increment: (m) => (m.isStage && (m.starsEarned ?? 0) >= 1 ? 1 : 0),
  },
  {
    id: 'stage_3star',
    title: 'Perfect Stage',
    desc: 'Earn 3 stars on a stage',
    target: 1,
    reward: 5,
    increment: (m) => (m.isStage && (m.starsEarned ?? 0) >= 3 ? 1 : 0),
  },
  {
    id: 'clear_stage_1',
    title: 'Stage Clear',
    desc: 'Clear any campaign stage today',
    target: 1,
    reward: 5,
    increment: (m) => (m.isStage && m.won ? 1 : 0),
  },
  {
    id: 'stage_star_1',
    title: 'Star Seeker',
    desc: 'Earn at least 1 star on a stage',
    target: 1,
    reward: 5,
    increment: (m) => (m.isStage && (m.starsEarned ?? 0) >= 1 ? 1 : 0),
  },
  {
    id: 'stage_star_2',
    title: 'Double Star',
    desc: 'Earn 2+ stars on a stage',
    target: 1,
    reward: 5,
    increment: (m) => (m.isStage && (m.starsEarned ?? 0) >= 2 ? 1 : 0),
  },
  // -- Simple daily habits ------------------------
  {
    id: 'finish_match',
    title: 'Just Play',
    desc: 'Complete any match',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent ? 1 : 0),
  },
  {
    id: 'win_or_score',
    title: 'Something Good',
    desc: 'Win a match or score 3 goals in one',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.hasOpponent && (m.won || m.playerScore >= 3) ? 1 : 0,
  },
  {
    id: 'no_blowout_loss',
    title: 'Stay Close',
    desc: 'Finish a match without losing by 4+',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.hasOpponent && !(m.opponentScore - m.playerScore >= 4 && !m.won) ? 1 : 0,
  },
  {
    id: 'finish_strong',
    title: 'Finish Strong',
    desc: 'Win your last match of the session',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won ? 1 : 0),
  },
  {
    id: 'no_zero_score',
    title: 'Always Score',
    desc: 'Finish a match with at least 1 goal',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore >= 1 ? 1 : 0),
  },
  {
    id: 'play_ai',
    title: 'Vs AI',
    desc: 'Play a match against AI',
    target: 1,
    reward: 5,
    increment: (m) => (m.opponentType === 'ai' && m.hasOpponent ? 1 : 0),
  },
  {
    id: 'win_ai',
    title: 'AI Down',
    desc: 'Win against AI',
    target: 1,
    reward: 5,
    increment: (m) => (m.opponentType === 'ai' && m.hasOpponent && m.won ? 1 : 0),
  },
  {
    id: 'easy_shutout',
    title: 'Easy Shutout',
    desc: 'Shut out an Easy AI',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' &&
      m.difficulty === 'easy' &&
      m.won &&
      m.opponentScore === 0
        ? 1
        : 0,
  },
  {
    id: 'medium_score_3',
    title: 'Medium Attack',
    desc: 'Score 3+ vs Medium AI',
    target: 1,
    reward: 5,
    increment: (m) =>
      m.opponentType === 'ai' &&
      m.difficulty === 'medium' &&
      m.playerScore >= 3
        ? 1
        : 0,
  },
  {
    id: 'play_2_score_1',
    title: 'Play & Score',
    desc: 'Play 2 matches and score in both',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.playerScore >= 1 ? 1 : 0),
  },
  {
    id: 'score_first_win',
    title: 'Lead and Finish',
    desc: 'Score first and win the match',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && m.scoredFirst ? 1 : 0),
  },
  {
    id: 'win_with_hits_20',
    title: 'Active Winner',
    desc: 'Win a match with 20+ hits',
    target: 1,
    reward: 5,
    increment: (m) => (m.hasOpponent && m.won && (m.hits ?? 0) >= 20 ? 1 : 0),
  },
  {
    id: 'double_duty',
    title: 'Double Duty',
    desc: 'Play 2 matches and win at least 1',
    target: 2,
    reward: 5,
    increment: (m) => (m.hasOpponent ? 1 : 0),
  },
];

