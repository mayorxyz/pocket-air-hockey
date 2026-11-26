import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, Pause, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { AchievementsScreen } from './components/AchievementsScreen';
import { ConfirmDialog } from './components/ConfirmDialog';
import { HomeScreen } from './components/HomeScreen';
import { HowToScreen } from './components/HowToScreen';
import { GameOverScreen, PauseScreen, StageContinueModal } from './components/MatchOverlays';
import { ModesScreen } from './components/ModesScreen';
import { OfflineIndicator } from './components/OfflineIndicator';
import { SettingsScreen } from './components/SettingsScreen';
import { SkinsScreen } from './components/SkinPickers';
import { StagesScreen } from './components/StagesScreen';
import { StatsScreen } from './components/StatsScreen';
import { UpdateBanner } from './components/UpdateBanner';
import { soundEngine } from './game/audio';
import { AirHockeyEngine, HudSnapshot } from './game/engine';
import {
  claimArenaCrate,
  claimDailyTaskReward,
  completeTutorialSave,
  deductContinueCoins,
  finalizeMatch,
  getHighestUnlockedStageId,
  getTotalStageStars,
  MAX_CONTINUES_PER_MATCH,
  purchaseAndEquipSkin,
} from './game/progression';
import { ACHIEVEMENTS, getStageById, MODES, PERSONALITIES, STAGES } from './game/registries';
import { shareResultCard, ShareCardPayload } from './game/shareCard';
import { SKINS, SkinCategory } from './game/skins';
import { createDefaultSave, EMPTY_STATS, saveStore } from './game/storage';
import {
  Difficulty,
  GameMode,
  GameSettings,
  MatchResult,
  MatchSummary,
  ModeId,
  PersonalityId,
  SaveDataV3,
  Screen,
  StageConfig,
} from './game/types';

function formatClock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, '0')}`;
}

const TUTORIAL_COPY: Record<1 | 2 | 3, { title: string; body: string }> = {
  1: {
    title: 'Move & Strike',
    body: 'Drag anywhere in your bottom half to hit the puck forward.',
  },
  2: {
    title: 'Bank Shot',
    body: 'Angle a strike so the puck ricochets off a side wall.',
  },
  3: {
    title: 'Curve Smash',
    body: 'Swipe sideways across the puck at impact to bend its path.',
  },
};

const HUD_PILL =
  'bg-[#101922]/88 backdrop-blur-md border border-white/18 shadow-lg';

export default function App() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<AirHockeyEngine | null>(null);

  const [save, setSave] = useState<SaveDataV3>(() => {
    const initial = saveStore.get();
    soundEngine.configure({
      sfxEnabled: initial.settings.sfxEnabled,
      musicEnabled: initial.settings.musicEnabled,
      masterVolume: initial.settings.masterVolume,
      vibration: initial.settings.vibration,
    });
    return initial;
  });

  const [screen, setScreen] = useState<Screen>('home');
  const [opponentType, setOpponentType] = useState<GameMode>(() => saveStore.getLastMode());
  const [modeId, setModeId] = useState<ModeId>('classic');
  const [difficulty, setDifficulty] = useState<Difficulty>(() => save.settings.defaultDifficulty);
  const [personality, setPersonality] = useState<PersonalityId>(
    () => save.settings.defaultPersonality
  );
  const [obstacleLayoutId, setObstacleLayoutId] = useState<string>('pillars');
  const [timedMinutes, setTimedMinutes] = useState<2 | 3>(2);
  const [activeStageId, setActiveStageId] = useState<number | null>(null);
  const [tutorialStep, setTutorialStep] = useState<0 | 1 | 2 | 3>(0);

  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 400,
    height: typeof window !== 'undefined' ? window.innerHeight : 720,
  }));

  const [hud, setHud] = useState<HudSnapshot>({
    score: { p: 0, a: 0 },
    timeRemaining: null,
    suddenDeathOvertime: false,
    continuesUsed: 0,
    practiceHits: 0,
    practiceBestRally: 0,
    practiceCurrentRally: 0,
  });
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null);
  const [pendingStageLoss, setPendingStageLoss] = useState<MatchResult | null>(null);
  const pendingStageLossRef = useRef<MatchResult | null>(null);
  const [fps, setFps] = useState<number>(60);
  const [toastAchIds, setToastAchIds] = useState<string[]>([]);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const statusToastTimerRef = useRef<number | null>(null);
  const [confirmQuitOpen, setConfirmQuitOpen] = useState(false);

  const activeStage = activeStageId ? getStageById(activeStageId) ?? null : null;

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const stackRef = useRef<Screen[]>(['home']);
  const screenRef = useRef<Screen>('home');
  const tutorialStepRef = useRef<0 | 1 | 2 | 3>(0);
  const ignorePopRef = useRef(0);
  const confirmQuitRef = useRef(false);

  useEffect(() => {
    confirmQuitRef.current = confirmQuitOpen;
  }, [confirmQuitOpen]);

  useEffect(() => {
    tutorialStepRef.current = tutorialStep;
  }, [tutorialStep]);

  const showStatusToast = useCallback((message: string) => {
    if (statusToastTimerRef.current !== null) {
      window.clearTimeout(statusToastTimerRef.current);
    }
    setStatusToast(message);
    statusToastTimerRef.current = window.setTimeout(() => {
      setStatusToast(null);
      statusToastTimerRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    return () => {
      if (statusToastTimerRef.current !== null) {
        window.clearTimeout(statusToastTimerRef.current);
      }
    };
  }, []);

  // Measure live container / visualViewport so HUD adapts cleanly to portrait, rotated landscape, tablet & desktop
  useEffect(() => {
    const updateSize = () => {
      const root = rootRef.current;
      const vv = window.visualViewport;
      const w = root?.clientWidth || vv?.width || window.innerWidth;
      const h = root?.clientHeight || vv?.height || window.innerHeight;
      setViewport((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    };

    updateSize();
    const ro =
      typeof ResizeObserver !== 'undefined' && rootRef.current
        ? new ResizeObserver(updateSize)
        : null;
    if (ro && rootRef.current) ro.observe(rootRef.current);

    window.addEventListener('resize', updateSize);
    window.visualViewport?.addEventListener('resize', updateSize);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateSize);
      window.visualViewport?.removeEventListener('resize', updateSize);
    };
  }, []);

  const syncEngineScreen = useCallback((next: Screen) => {
    screenRef.current = next;
    setScreen(next);
    if (next === 'game') {
      engineRef.current?.resumeMatch();
    } else {
      engineRef.current?.setScreen(next);
    }
  }, []);

  const pushScreen = useCallback(
    (next: Screen) => {
      if (screenRef.current === next) return;
      stackRef.current = [...stackRef.current, next];
      try {
        window.history.pushState({ ahDepth: stackRef.current.length - 1, screen: next }, '');
      } catch {
        // Ignore restricted history API in sandboxed frames
      }
      syncEngineScreen(next);
    },
    [syncEngineScreen]
  );

  const commitPendingStageLoss = useCallback(() => {
    const pending = pendingStageLossRef.current;
    if (!pending) return;
    pendingStageLossRef.current = null;
    setPendingStageLoss(null);
    const { save: nextSave, summary } = finalizeMatch(saveRef.current, pending);
    saveRef.current = nextSave;
    setSave(nextSave);
    if (summary.newAchievements.length > 0) {
      soundEngine.play('unlock');
      setToastAchIds(summary.newAchievements);
      window.setTimeout(() => setToastAchIds([]), 4200);
    }
  }, []);

  const goBack = useCallback(() => {
    if (confirmQuitRef.current) {
      setConfirmQuitOpen(false);
      return;
    }

    if (tutorialStepRef.current > 0) {
      engineRef.current?.skipTutorial();
      return;
    }

    const current = screenRef.current;
    if (current === 'home') return;

    if (current === 'over') {
      commitPendingStageLoss();
      setActiveStageId(null);
    }

    if (current === 'game') {
      pushScreen('pause');
      return;
    }

    if (stackRef.current.length > 1) {
      const nextStack = stackRef.current.slice(0, -1);
      const target = nextStack[nextStack.length - 1];
      stackRef.current = nextStack;
      syncEngineScreen(target);
      try {
        if (window.history.state && typeof window.history.state.ahDepth === 'number') {
          ignorePopRef.current += 1;
          window.history.back();
        }
      } catch {
        // Ignore history errors
      }
    } else {
      stackRef.current = ['home'];
      syncEngineScreen('home');
    }
  }, [commitPendingStageLoss, pushScreen, syncEngineScreen]);

  const goHome = useCallback(() => {
    commitPendingStageLoss();
    setConfirmQuitOpen(false);
    setActiveStageId(null);
    setTutorialStep(0);
    stackRef.current = ['home'];
    try {
      window.history.replaceState({ ahDepth: 0, screen: 'home' }, '');
    } catch {
      // Ignore history errors
    }
    syncEngineScreen('home');
  }, [commitPendingStageLoss, syncEngineScreen]);

  useEffect(() => {
    try {
      window.history.replaceState({ ahDepth: 0, screen: 'home' }, '');
    } catch {
      // Ignore history errors
    }

    const onPopState = () => {
      if (ignorePopRef.current > 0) {
        ignorePopRef.current -= 1;
        return;
      }

      if (confirmQuitRef.current) {
        setConfirmQuitOpen(false);
        return;
      }

      if (tutorialStepRef.current > 0) {
        engineRef.current?.skipTutorial();
        return;
      }

      const current = screenRef.current;
      if (current === 'game') {
        stackRef.current = [...stackRef.current, 'pause'];
        try {
          window.history.pushState({ ahDepth: stackRef.current.length - 1, screen: 'pause' }, '');
        } catch {
          // Ignore
        }
        syncEngineScreen('pause');
        return;
      }

      if (current === 'over') {
        commitPendingStageLoss();
        setActiveStageId(null);
      }

      if (stackRef.current.length > 1) {
        const nextStack = stackRef.current.slice(0, -1);
        const target = nextStack[nextStack.length - 1];
        stackRef.current = nextStack;
        syncEngineScreen(target);
      } else {
        syncEngineScreen('home');
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [commitPendingStageLoss, syncEngineScreen]);

  const startTutorialFlow = useCallback(() => {
    soundEngine.init();
    setActiveStageId(null);
    pendingStageLossRef.current = null;
    setPendingStageLoss(null);
    setMatchSummary(null);
    stackRef.current = ['home', 'game'];
    try {
      window.history.pushState({ ahDepth: 1, screen: 'game' }, '');
    } catch {
      // Ignore
    }
    screenRef.current = 'game';
    setScreen('game');
    setTutorialStep(1);
    engineRef.current?.startTutorial();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new AirHockeyEngine(canvas, saveRef.current.settings, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
      },
      onMatchEnd: (result) => {
        if (
          result.stageId &&
          !result.won &&
          (result.continuesUsed ?? 0) < MAX_CONTINUES_PER_MATCH
        ) {
          pendingStageLossRef.current = result;
          setPendingStageLoss(result);
          setMatchSummary(null);
          stackRef.current = ['home', 'stages', 'over'];
          screenRef.current = 'over';
          setScreen('over');
          return;
        }

        pendingStageLossRef.current = null;
        setPendingStageLoss(null);
        const { save: nextSave, summary } = finalizeMatch(saveRef.current, result);
        saveRef.current = nextSave;
        setSave(nextSave);
        setMatchSummary(summary);
        if (summary.newAchievements.length > 0) {
          soundEngine.play('unlock');
          setToastAchIds(summary.newAchievements);
          window.setTimeout(() => setToastAchIds([]), 4200);
        }
        stackRef.current = result.stageId ? ['home', 'stages', 'over'] : ['home', 'over'];
        screenRef.current = 'over';
        setScreen('over');
      },
      onAutoPause: () => {
        if (screenRef.current === 'game' && tutorialStepRef.current === 0) {
          pushScreen('pause');
        }
      },
      onFpsChange: (nextFps) => {
        setFps(nextFps);
      },
      onTutorialStepChange: (step) => {
        setTutorialStep(step);
      },
      onTutorialComplete: (skipped) => {
        setTutorialStep(0);
        const { save: nextSave, bonusCoins } = completeTutorialSave(saveRef.current, skipped);
        saveRef.current = nextSave;
        setSave(nextSave);
        stackRef.current = ['home'];
        try {
          window.history.replaceState({ ahDepth: 0, screen: 'home' }, '');
        } catch {
          // Ignore
        }
        screenRef.current = 'home';
        setScreen('home');
        engineRef.current?.setScreen('home');
        if (bonusCoins > 0) {
          soundEngine.play('unlock');
          showStatusToast(`+${bonusCoins} Coins — Tutorial Complete!`);
        }
      },
    });

    engineRef.current = engine;

    // Auto-launch first-run interactive tutorial for brand new players
    let firstRunTimer: number | null = null;
    if (saveRef.current.stats.totalMatches === 0 && !saveRef.current.tutorialCompleted) {
      firstRunTimer = window.setTimeout(() => {
        if (engineRef.current) {
          stackRef.current = ['home', 'game'];
          screenRef.current = 'game';
          setScreen('game');
          setTutorialStep(1);
          engineRef.current.startTutorial();
        }
      }, 0);
    }

    return () => {
      if (firstRunTimer !== null) window.clearTimeout(firstRunTimer);
      engine.destroy();
      engineRef.current = null;
    };
  }, [pushScreen, showStatusToast]);

  const handleUpdateSettings = useCallback((patch: Partial<GameSettings>) => {
    soundEngine.init();
    setSave((prev) => {
      const nextSettings = { ...prev.settings, ...patch };
      const nextSave: SaveDataV3 = { ...prev, settings: nextSettings };
      saveStore.set(nextSave);
      soundEngine.configure({
        sfxEnabled: nextSettings.sfxEnabled,
        musicEnabled: nextSettings.musicEnabled,
        masterVolume: nextSettings.masterVolume,
        vibration: nextSettings.vibration,
      });
      engineRef.current?.applySettings(nextSettings);
      if (patch.defaultDifficulty) {
        setDifficulty(patch.defaultDifficulty);
      }
      if (patch.defaultPersonality) {
        setPersonality(patch.defaultPersonality);
      }
      return nextSave;
    });
  }, []);

  const handleSelectOrBuySkin = useCallback(
    (category: SkinCategory, id: string): { ok: boolean; reason?: string } => {
      soundEngine.init();
      const res = purchaseAndEquipSkin(saveRef.current, category, id);
      if (res.ok) {
        saveRef.current = res.save;
        setSave(res.save);
        engineRef.current?.applySettings(res.save.settings);
      }
      return { ok: res.ok, reason: res.reason };
    },
    []
  );

  const handleClaimCrate = useCallback(() => {
    soundEngine.init();
    const res = claimArenaCrate(saveRef.current);
    if (res.claimed) {
      saveRef.current = res.save;
      setSave(res.save);
      soundEngine.play('unlock');
      showStatusToast(`+${res.rewardCoins} Coins — Arena Crate Claimed!`);
    }
  }, [showStatusToast]);

  const handleClaimDailyTask = useCallback(
    (taskId: string) => {
      soundEngine.init();
      const res = claimDailyTaskReward(saveRef.current, taskId);
      if (res.claimed) {
        saveRef.current = res.save;
        setSave(res.save);
        soundEngine.play('unlock');
        showStatusToast(
          res.restarted
            ? `+${res.rewardCoins} Coins — All daily tasks complete! New set started.`
            : `+${res.rewardCoins} Coins — Daily Task Complete!`
        );
      }
    },
    [showStatusToast]
  );

  const triggerShare = useCallback(
    async (payload: ShareCardPayload) => {
      soundEngine.init();
      const outcome = await shareResultCard(payload);
      if (outcome === 'shared') {
        showStatusToast('Shared!');
      } else if (outcome === 'downloaded') {
        showStatusToast('Image saved!');
      }
    },
    [showStatusToast]
  );

  const handleShareLoadout = useCallback(() => {
    const s = saveRef.current;
    void triggerShare({
      title: 'My Arena Loadout',
      subtitle: `${s.stats.wins} Wins · ${getTotalStageStars(s)}★ Campaign`,
      tableSkinId: s.settings.tableSkin,
      puckSkinId: s.settings.puckSkin,
      malletSkinId: s.settings.malletSkin,
      stats: [
        { label: 'Wins', value: String(s.stats.wins) },
        { label: 'Best Streak', value: String(s.stats.bestStreak) },
        { label: 'Top Speed', value: String(s.stats.fastestPuck) },
      ],
    });
  }, [triggerShare]);

  const handleShareMatchResult = useCallback(() => {
    if (!matchSummary) return;
    const s = saveRef.current;
    const { result, stageOutcome } = matchSummary;
    const stage = stageOutcome ? getStageById(stageOutcome.stageId) : undefined;
    const title = stageOutcome
      ? stageOutcome.stageId === 100 && result.won
        ? '100-Stage Legend!'
        : stageOutcome.stageId === 60 && result.won
          ? 'Eternal Champion!'
          : stageOutcome.stageId === 30 && result.won
            ? 'Campaign Champion!'
            : `Stage ${stageOutcome.stageId} Clear!`
      : result.opponentType === 'two'
        ? result.won
          ? 'Red Wins!'
          : 'Blue Wins!'
        : result.won
          ? 'Victory!'
          : 'Match Complete';

    const subtitle = stageOutcome
      ? `${stageOutcome.stageName} · ${'★'.repeat(stageOutcome.starsEarned)}${'☆'.repeat(3 - stageOutcome.starsEarned)}`
      : `${MODES[result.modeId]?.name ?? result.modeId} · ${
          result.opponentType === 'two'
            ? '2 Players'
            : `${result.difficulty[0].toUpperCase() + result.difficulty.slice(1)} ${
                PERSONALITIES[result.personality]?.name ?? result.personality
              }`
        }`;

    void triggerShare({
      title,
      subtitle,
      tableSkinId: stage?.skinOverride.table ?? s.settings.tableSkin,
      puckSkinId: stage?.skinOverride.puck ?? s.settings.puckSkin,
      malletSkinId: s.settings.malletSkin,
      stats: [
        { label: 'Final Score', value: `${result.playerScore} - ${result.opponentScore}` },
        { label: 'Best Rally', value: `${result.longestRally} hits` },
        { label: 'Top Speed', value: String(Math.round(result.maxPuckSpeed)) },
      ],
    });
  }, [matchSummary, triggerShare]);

  const handleResetStats = useCallback(() => {
    setSave((prev) => {
      const next: SaveDataV3 = {
        ...prev,
        stats: { ...EMPTY_STATS },
        history: [],
      };
      saveStore.set(next, true);
      return next;
    });
  }, []);

  const handleDevUnlockAll = useCallback(() => {
    setSave((prev) => {
      const stages = { ...prev.stages };
      for (const stage of STAGES) {
        stages[stage.id] = { ...stages[stage.id], unlocked: true, stars: 3 };
      }

      const unlockedAt = new Date().toISOString();
      const achievements = { ...prev.achievements };
      for (const achievement of ACHIEVEMENTS) {
        achievements[achievement.id] = unlockedAt;
      }

      const nextSave: SaveDataV3 = {
        ...prev,
        coins: Math.max(prev.coins, 100_000),
        unlocks: {
          table: Object.keys(SKINS.table),
          puck: Object.keys(SKINS.puck),
          mallet: Object.keys(SKINS.mallet),
        },
        achievements,
        stages,
        grandChampionBadge: true,
        legend100Badge: true,
      };
      saveStore.set(nextSave, true);
      return nextSave;
    });
  }, []);

  // ➕ ADD THIS RIGHT HERE ➕
  const handleDevLockAll = useCallback(() => {
    setSave((prev) => {
      const defaults = createDefaultSave();
      const nextSave: SaveDataV3 = {
        ...prev,
        coins: defaults.coins,
        unlocks: defaults.unlocks,
        achievements: defaults.achievements,
        stages: defaults.stages,
        grandChampionBadge: defaults.grandChampionBadge ?? false,
        legend100Badge: defaults.legend100Badge ?? false,
        stats: defaults.stats,
        history: defaults.history,
        tutorialCompleted: defaults.tutorialCompleted,
        daily: defaults.daily,
      };
      saveStore.set(nextSave, true);
      return nextSave;
    });
  }, []);


  const handleResetSettings = useCallback(() => {
    const defaults = createDefaultSave().settings;
    setSave((prev) => {
      const next: SaveDataV3 = { ...prev, settings: defaults };
      saveStore.set(next, true);
      soundEngine.configure({
        sfxEnabled: defaults.sfxEnabled,
        musicEnabled: defaults.musicEnabled,
        masterVolume: defaults.masterVolume,
        vibration: defaults.vibration,
      });
      engineRef.current?.applySettings(defaults);
      setDifficulty(defaults.defaultDifficulty);
      setPersonality(defaults.defaultPersonality);
      return next;
    });
  }, []);

  const startConfiguredMatch = useCallback(
    (opts?: {
      opp?: GameMode;
      mId?: ModeId;
      diff?: Difficulty;
      pers?: PersonalityId;
      layout?: string;
      mins?: 2 | 3;
    }) => {
      const opp = opts?.opp ?? opponentType;
      const mId = opts?.mId ?? modeId;
      const diff = opts?.diff ?? difficulty;
      const pers = opts?.pers ?? personality;
      const layout = opts?.layout ?? obstacleLayoutId;
      const mins = opts?.mins ?? timedMinutes;

      soundEngine.init();
      saveStore.setLastMode(opp);
      setActiveStageId(null);
      setTutorialStep(0);
      pendingStageLossRef.current = null;
      setPendingStageLoss(null);
      setMatchSummary(null);
      setHud({
        score: { p: 0, a: 0 },
        timeRemaining: MODES[mId].winCondition === 'timed' ? mins * 60 : null,
        suddenDeathOvertime: false,
        continuesUsed: 0,
        practiceHits: 0,
        practiceBestRally: 0,
        practiceCurrentRally: 0,
      });

      stackRef.current = ['home', 'game'];
      try {
        window.history.pushState({ ahDepth: 1, screen: 'game' }, '');
      } catch {
        // Ignore
      }
      screenRef.current = 'game';
      setScreen('game');

      engineRef.current?.startMatch({
        modeId: mId,
        opponentType: opp,
        difficulty: diff,
        personality: pers,
        obstacleLayoutId: mId === 'obstacles' ? layout : null,
        timedSeconds: mins * 60,
        stageConfig: null,
      });
    },
    [difficulty, modeId, obstacleLayoutId, opponentType, personality, timedMinutes]
  );

  const startStageMatch = useCallback((stage: StageConfig) => {
    soundEngine.init();
    setActiveStageId(stage.id);
    setTutorialStep(0);
    pendingStageLossRef.current = null;
    setPendingStageLoss(null);
    setMatchSummary(null);
    setHud({
      score: { p: 0, a: 0 },
      timeRemaining: stage.winCondition === 'timed' ? (stage.timeLimit ?? 90) : null,
      suddenDeathOvertime: false,
      continuesUsed: 0,
      practiceHits: 0,
      practiceBestRally: 0,
      practiceCurrentRally: 0,
    });

    stackRef.current = ['home', 'stages', 'game'];
    try {
      window.history.pushState({ ahDepth: 2, screen: 'game' }, '');
    } catch {
      // Ignore
    }
    screenRef.current = 'game';
    setScreen('game');

    engineRef.current?.startMatch({
      modeId:
        stage.winCondition === 'timed'
          ? 'timed'
          : stage.winCondition === 'sudden_death'
            ? 'sudden_death'
            : stage.obstacleLayoutId
              ? 'obstacles'
              : 'classic',
      opponentType: 'ai',
      difficulty: stage.difficulty,
      personality:
        stage.personality === 'adaptive_grandmaster' ||
        stage.personality === 'adaptive_eternal' ||
        stage.personality === 'adaptive_stadium' ||
        stage.personality === 'adaptive_architect' ||
        stage.personality === 'adaptive_immortal'
          ? 'balanced'
          : stage.personality,
      obstacleLayoutId: stage.obstacleLayoutId,
      timedSeconds: stage.timeLimit ?? 90,
      stageConfig: stage,
    });
  }, []);

  const handleContinueStage = useCallback((cost: number) => {
    soundEngine.init();
    const nextSave = deductContinueCoins(saveRef.current, cost);
    saveRef.current = nextSave;
    setSave(nextSave);
    pendingStageLossRef.current = null;
    setPendingStageLoss(null);
    setMatchSummary(null);
    stackRef.current = ['home', 'stages', 'game'];
    screenRef.current = 'game';
    setScreen('game');
    engineRef.current?.continueStageMatch();
  }, []);

  const handleResume = useCallback(() => {
    soundEngine.init();
    stackRef.current = activeStageId !== null ? ['home', 'stages', 'game'] : ['home', 'game'];
    syncEngineScreen('game');
  }, [activeStageId, syncEngineScreen]);

  const handleRestart = useCallback(() => {
    commitPendingStageLoss();
    if (activeStage) {
      startStageMatch(activeStage);
    } else {
      startConfiguredMatch();
    }
  }, [activeStage, commitPendingStageLoss, startConfiguredMatch, startStageMatch]);

  const isPracticeMode = !activeStage && MODES[modeId].winCondition === 'practice';
  const isCompactLandscape = viewport.width > viewport.height && viewport.height < 560;

  const hudStatusPills = (
    <>
      {activeStage && (
        <div
          className={`max-w-full truncate rounded-xl px-3 py-1 text-xs font-extrabold text-[#fbbf24] tabular-nums ${HUD_PILL}`}
        >
          Stage {activeStage.id}: {activeStage.name}
        </div>
      )}
      {activeStage && hud.continuesUsed > 0 && (
        <div className="rounded-lg bg-[#101922]/90 border border-[#f59e0b]/55 px-2.5 py-0.5 text-[11px] font-extrabold text-[#fde68a] shadow-lg">
          1★ Max (Continued)
        </div>
      )}
      {hud.suddenDeathOvertime && (
        <div className="rounded-xl bg-[#f0452d] border border-white/25 px-3 py-1 text-xs font-extrabold text-white shadow-lg">
          Sudden Death
        </div>
      )}
      {hud.timeRemaining !== null && !hud.suddenDeathOvertime && (
        <div
          className={`rounded-xl px-3.5 py-1 text-sm sm:text-base font-extrabold text-white tabular-nums ${HUD_PILL}`}
        >
          {formatClock(hud.timeRemaining)}
        </div>
      )}
      {isPracticeMode && (
        <div
          className={`rounded-xl px-3 py-1 text-xs font-bold text-[#e9f1f4] tabular-nums ${HUD_PILL}`}
        >
          Hits {hud.practiceHits} · Rally {hud.practiceCurrentRally} · Best {hud.practiceBestRally}
        </div>
      )}
      {save.settings.showFps && (
        <div
          className={`rounded-lg px-2.5 py-0.5 text-xs font-bold text-white/90 tabular-nums ${HUD_PILL}`}
        >
          {fps} FPS
        </div>
      )}
    </>
  );

  return (
    <div
      ref={rootRef}
      className="relative w-full h-[100dvh] min-h-[100dvh] overflow-hidden bg-[#101922] text-white"
    >
      <canvas
        ref={canvasRef}
        aria-label="Air Hockey game table"
        className="fixed inset-0 w-full h-full block touch-none"
      />

      {/* Normal In-Game HUD (hidden during interactive tutorial) */}
      {screen === 'game' && tutorialStep === 0 && (
        <>
          {isCompactLandscape ? (
            <>
              {/* Compact Landscape Left Gutter: Mute + Status Pills (keeps top goal mouth 100% clear) */}
              <div
                style={{
                  top: 'max(0.625rem, env(safe-area-inset-top))',
                  left: 'max(0.625rem, env(safe-area-inset-left))',
                }}
                className="fixed z-10 flex flex-col items-start gap-2 max-w-[min(12.5rem,28vw)]"
              >
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateSettings({ sfxEnabled: !save.settings.sfxEnabled })
                  }
                  aria-label={
                    save.settings.sfxEnabled ? 'Mute sound effects' : 'Unmute sound effects'
                  }
                  aria-pressed={!save.settings.sfxEnabled}
                  className={`w-12 h-12 rounded-full text-white flex items-center justify-center transition hover:bg-[#1a2938] cursor-pointer ${HUD_PILL} ${
                    save.settings.sfxEnabled ? 'opacity-100' : 'opacity-65'
                  }`}
                >
                  {save.settings.sfxEnabled ? (
                    <Volume2 className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <VolumeX className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
                <div className="flex flex-col items-start gap-1 pointer-events-none w-full">
                  {hudStatusPills}
                </div>
              </div>

              {/* Compact Landscape Right Gutter: Pause */}
              <button
                type="button"
                onClick={() => pushScreen('pause')}
                aria-label="Pause game"
                style={{
                  top: 'max(0.625rem, env(safe-area-inset-top))',
                  right: 'max(0.625rem, env(safe-area-inset-right))',
                }}
                className={`fixed z-10 w-12 h-12 rounded-full text-white flex items-center justify-center transition hover:bg-[#1a2938] cursor-pointer ${HUD_PILL}`}
              >
                <Pause className="w-5 h-5 fill-current" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  handleUpdateSettings({ sfxEnabled: !save.settings.sfxEnabled })
                }
                aria-label={
                  save.settings.sfxEnabled ? 'Mute sound effects' : 'Unmute sound effects'
                }
                aria-pressed={!save.settings.sfxEnabled}
                style={{
                  top: 'max(0.625rem, env(safe-area-inset-top))',
                  left: 'max(0.625rem, env(safe-area-inset-left))',
                }}
                className={`fixed z-10 w-12 h-12 rounded-full text-white flex items-center justify-center transition hover:bg-[#1a2938] cursor-pointer ${HUD_PILL} ${
                  save.settings.sfxEnabled ? 'opacity-100' : 'opacity-65'
                }`}
              >
                {save.settings.sfxEnabled ? (
                  <Volume2 className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <VolumeX className="w-5 h-5" aria-hidden="true" />
                )}
              </button>

              <div
                style={{ top: 'max(0.75rem, env(safe-area-inset-top))' }}
                className="fixed left-1/2 -translate-x-1/2 z-10 max-w-[calc(100%-8.5rem)] flex flex-col items-center gap-1 pointer-events-none"
              >
                {hudStatusPills}
              </div>

              <button
                type="button"
                onClick={() => pushScreen('pause')}
                aria-label="Pause game"
                style={{
                  top: 'max(0.625rem, env(safe-area-inset-top))',
                  right: 'max(0.625rem, env(safe-area-inset-right))',
                }}
                className={`fixed z-10 w-12 h-12 rounded-full text-white flex items-center justify-center transition hover:bg-[#1a2938] cursor-pointer ${HUD_PILL}`}
              >
                <Pause className="w-5 h-5 fill-current" aria-hidden="true" />
              </button>
            </>
          )}
        </>
      )}

      {/* Interactive First-Run Tutorial Overlay */}
      {screen === 'game' && tutorialStep !== 0 && (
        <>
          <button
            type="button"
            onClick={() => engineRef.current?.skipTutorial()}
            style={{
              top: 'max(0.625rem, env(safe-area-inset-top))',
              right: 'max(0.625rem, env(safe-area-inset-right))',
            }}
            className="fixed z-20 min-h-12 px-4 rounded-full bg-[#14202c]/95 border border-white/22 hover:bg-[#1e2f40] text-white font-display font-extrabold text-sm inline-flex items-center gap-1.5 shadow-xl transition-transform active:scale-[0.97] cursor-pointer"
          >
            <span>Skip Tutorial</span>
            <SkipForward className="w-4 h-4 shrink-0" aria-hidden="true" />
          </button>

          <div
            style={
              isCompactLandscape
                ? {
                    bottom: 'max(0.75rem, env(safe-area-inset-bottom))',
                    left: 'max(0.75rem, env(safe-area-inset-left))',
                  }
                : {
                    bottom: 'max(0.875rem, env(safe-area-inset-bottom))',
                  }
            }
            className={`fixed z-10 pointer-events-none ${
              isCompactLandscape
                ? 'max-w-[min(15rem,30vw)]'
                : 'left-1/2 -translate-x-1/2 w-[min(calc(100%-2rem),24rem)]'
            }`}
          >
            <div className="rounded-2xl bg-[#14202c]/92 backdrop-blur-md border border-white/18 px-4 py-3 shadow-2xl">
              <div className="flex items-center justify-between gap-2 text-xs font-extrabold uppercase tracking-wider text-[#fbbf24]">
                <span>Step {tutorialStep} of 3</span>
                <span className="text-[#34d399]">+25 Coins Reward</span>
              </div>
              <div className="font-display font-extrabold text-base sm:text-lg text-white mt-0.5 leading-tight">
                {TUTORIAL_COPY[tutorialStep].title}
              </div>
              <p className="m-0 mt-1 text-xs sm:text-sm text-[#cbd8e2] leading-snug">
                {TUTORIAL_COPY[tutorialStep].body}
              </p>
            </div>
          </div>
        </>
      )}

      {screen === 'home' && (
        <HomeScreen
          save={save}
          stats={save.stats}
          coins={save.coins}
          daily={save.daily}
          highestStageId={getHighestUnlockedStageId(save)}
          totalStageStars={getTotalStageStars(save)}
          onClaimCrate={handleClaimCrate}
          onOpenStages={() => {
            soundEngine.init();
            pushScreen('stages');
          }}
          onPlayBot={() => {
            soundEngine.init();
            setOpponentType('ai');
            setDifficulty(save.settings.defaultDifficulty);
            setPersonality(save.settings.defaultPersonality);
            pushScreen('modes');
          }}
          onPlayTwoPlayers={() => {
            soundEngine.init();
            setOpponentType('two');
            if (modeId === 'practice') setModeId('classic');
            pushScreen('modes');
          }}
          onOpenSkins={() => {
            soundEngine.init();
            pushScreen('skins');
          }}
          onOpenStats={() => {
            soundEngine.init();
            pushScreen('stats');
          }}
          onOpenAchievements={() => {
            soundEngine.init();
            pushScreen('achievements');
          }}
          onOpenSettings={() => {
            soundEngine.init();
            pushScreen('settings');
          }}
          onOpenHowTo={() => {
            soundEngine.init();
            pushScreen('howto');
          }}
        />
      )}

      {screen === 'stages' && (
        <StagesScreen
          save={save}
          onPlayStage={startStageMatch}
          onBack={goBack}
        />
      )}

      {screen === 'modes' && (
        <ModesScreen
          opponentType={opponentType}
          modeId={modeId}
          difficulty={difficulty}
          personality={personality}
          obstacleLayoutId={obstacleLayoutId}
          timedMinutes={timedMinutes}
          winScore={save.settings.winScore}
          onChangeOpponentType={(opp) => {
            soundEngine.init();
            setOpponentType(opp);
            if (opp === 'two' && modeId === 'practice') {
              setModeId('classic');
            }
          }}
          onSelectMode={(nextMode) => {
            soundEngine.init();
            setModeId(nextMode);
          }}
          onSelectDifficulty={(nextDiff) => {
            soundEngine.init();
            setDifficulty(nextDiff);
          }}
          onSelectPersonality={(nextPers) => {
            soundEngine.init();
            setPersonality(nextPers);
          }}
          onSelectObstacleLayout={(layout) => {
            soundEngine.init();
            setObstacleLayoutId(layout);
          }}
          onSelectTimedMinutes={(mins) => {
            soundEngine.init();
            setTimedMinutes(mins);
          }}
          onStartMatch={() => startConfiguredMatch()}
          onBack={goBack}
        />
      )}

      {screen === 'skins' && (
        <SkinsScreen
          save={save}
          onSelectOrBuy={handleSelectOrBuySkin}
          onShareLoadout={handleShareLoadout}
          onBack={goBack}
        />
      )}

      {screen === 'stats' && (
        <StatsScreen
          stats={save.stats}
          history={save.history}
          onBack={goBack}
        />
      )}

      {screen === 'achievements' && (
        <AchievementsScreen
          stats={save.stats}
          save={save}
          unlocked={save.achievements}
          onClaimCrate={handleClaimCrate}
          onClaimDailyTask={handleClaimDailyTask}
          onBack={goBack}
        />
      )}

      {screen === 'settings' && (
        <SettingsScreen
          save={save}
          onUpdate={handleUpdateSettings}
          onSelectOrBuySkin={handleSelectOrBuySkin}
          onResetStats={handleResetStats}
          onResetSettings={handleResetSettings}
          onDevUnlockAll={handleDevUnlockAll}
          onDevLockAll={handleDevLockAll} // ➕ MAKE SURE THIS LINE IS HERE ➕
          onOpenHowTo={() => pushScreen('howto')}
          onBack={goBack}
        />
      )}

      {screen === 'howto' && (
        <HowToScreen
          winScore={save.settings.winScore}
          onReplayTutorial={startTutorialFlow}
          onBack={goBack}
        />
      )}

      {screen === 'pause' && (
        <PauseScreen
          score={hud.score}
          isPractice={isPracticeMode}
          practiceHits={hud.practiceHits}
          stageLabel={activeStage ? `Stage ${activeStage.id} · ${activeStage.name}` : undefined}
          onResume={handleResume}
          onRestart={handleRestart}
          onOpenSettings={() => pushScreen('settings')}
          onRequestQuit={() => setConfirmQuitOpen(true)}
        />
      )}

      {screen === 'over' && pendingStageLoss && activeStage && (
        <StageContinueModal
          stage={activeStage}
          result={pendingStageLoss}
          coins={save.coins}
          continuesUsed={pendingStageLoss.continuesUsed ?? 0}
          onContinue={handleContinueStage}
          onRestartStage={handleRestart}
          onStagesMap={() => {
            commitPendingStageLoss();
            setActiveStageId(null);
            stackRef.current = ['home', 'stages'];
            syncEngineScreen('stages');
          }}
          onHome={goHome}
        />
      )}

      {screen === 'over' && !pendingStageLoss && matchSummary && (
        <GameOverScreen
          summary={matchSummary}
          stats={save.stats}
          reduceMotion={save.settings.reduceMotion}
          onRematch={handleRestart}
          onChangeMode={() => {
            setActiveStageId(null);
            stackRef.current = ['home', 'modes'];
            syncEngineScreen('modes');
          }}
          onNextStage={(nextId) => {
            const nextStage = getStageById(nextId);
            if (nextStage) startStageMatch(nextStage);
          }}
          onStagesMap={() => {
            setActiveStageId(null);
            stackRef.current = ['home', 'stages'];
            syncEngineScreen('stages');
          }}
          onShareResult={handleShareMatchResult}
          onHome={goHome}
        />
      )}

      {confirmQuitOpen && (
        <ConfirmDialog
          title="Quit to Home?"
          message="Your current match progress will be lost."
          confirmLabel="Quit match"
          onConfirm={goHome}
          onCancel={() => setConfirmQuitOpen(false)}
        />
      )}

      {toastAchIds.length > 0 && (
        <div
          role="status"
          aria-live="polite"
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
          className="fixed left-1/2 -translate-x-1/2 z-50 w-[min(calc(100%-2rem),21.5rem)] rounded-2xl bg-[#14202c] border border-[#10b981]/55 px-4 py-3 shadow-2xl flex items-center gap-3"
        >
          <Award className="w-5 h-5 text-[#34d399] shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="text-xs font-bold text-[#6ee7b7]">Achievement unlocked</div>
            <div className="text-sm font-extrabold text-white truncate">
              {toastAchIds
                .map((id) => ACHIEVEMENTS.find((a) => a.id === id)?.name ?? id)
                .join(', ')}
            </div>
          </div>
        </div>
      )}

      {statusToast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            top: toastAchIds.length > 0
              ? 'calc(max(1rem, env(safe-area-inset-top)) + 4.5rem)'
              : 'max(1rem, env(safe-area-inset-top))',
          }}
          className="fixed left-1/2 -translate-x-1/2 z-50 w-[min(calc(100%-2rem),21.5rem)] rounded-2xl bg-[#14202c] border border-[#fbbf24]/45 px-4 py-3 shadow-2xl flex items-center gap-2.5"
        >
          <CheckCircle2 className="w-5 h-5 text-[#fbbf24] shrink-0" aria-hidden="true" />
          <span className="text-sm font-extrabold text-white">{statusToast}</span>
        </div>
      )}

      <OfflineIndicator />
      <UpdateBanner />
    </div>
  );
}
