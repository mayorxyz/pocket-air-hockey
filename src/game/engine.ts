import { soundEngine } from './audio';
import {
  MODES,
  OBSTACLE_LAYOUTS,
  PERSONALITIES,
  POWERUPS,
  PowerupEffectsState,
  PowerupId,
} from './registries';
import { getMalletSkin, getPuckSkin, getTableSkin, isLightSurface, TableSkin } from './skins';
import { drawPuckEmblem } from './puckEmblems';
import { drawMalletPattern } from './malletPatterns';
import {
  buildTableGeometry,
  isAngleInArc,
  TableGeometry,
  tracePolygonPath,
} from './tableGeometry';
import { drawTablePattern } from './tablePatterns';
import {
  DEFAULT_SETTINGS,
  DIFFICULTY_CONFIG,
  Difficulty,
  GameMode,
  GamePhase,
  GameSettings,
  MatchResult,
  ModeId,
  ObstacleBumper,
  PersonalityId,
  PuckState,
  Scorer,
  Score,
  Screen,
  StageConfig,
  StagePersonalityId,
} from './types';

const W = 400;
const WALL = 6;
const PR = 20;
const MR = 34;
const MIN_WALL_EJECT = 180;
const GOAL_W = 150;
const GX1 = (W - GOAL_W) / 2;
const GX2 = GX1 + GOAL_W;
const BASE_MAXV = 1400;
const POWERUP_RADIUS = 18;
const MAX_PUCKS = 3;
const MAX_PARTICLES = 24;
const RING_BUFFER_SIZE = 240;
const OUTER_BG = '#101922';
const FONT_FAMILY = '"Outfit", "Avenir Next", "Helvetica Neue", Arial, sans-serif';

const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

type QualityTier = 'high' | 'medium' | 'low';

interface Mallet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  tx: number;
  ty: number;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
  color: string;
}

interface Ripple {
  active: boolean;
  x: number;
  y: number;
  r: number;
  maxR: number;
  alpha: number;
  color: string;
}

interface AiBrain {
  aim: number;
  aimT: number;
  trackX: number;
  feintSign: number;
}

interface DragAnchor {
  px: number;
  py: number;
  mx: number;
  my: number;
}

interface TablePowerup {
  id: PowerupId;
  x: number;
  y: number;
  ttl: number;
  age: number;
}

interface ActivePowerup {
  id: PowerupId;
  collector: Scorer;
  remaining: number;
  duration: number;
}

export interface HudSnapshot {
  score: Score;
  timeRemaining: number | null;
  suddenDeathOvertime: boolean;
  continuesUsed: number;
  practiceHits: number;
  practiceBestRally: number;
  practiceCurrentRally: number;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HudSnapshot) => void;
  onMatchEnd: (result: MatchResult) => void;
  onAutoPause: () => void;
  onFpsChange?: (fps: number) => void;
  onQualityChange?: (tier: QualityTier) => void;
  onTutorialStepChange?: (step: 1 | 2 | 3) => void;
  onTutorialComplete?: (skipped: boolean) => void;
}

export class AirHockeyEngine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  private H = 720;
  private dpr = 1;
  private cw = 0;
  private ch = 0;
  private scale = 1;
  private offX = 0;
  private offY = 0;
  private bg: HTMLCanvasElement | null = null;
  private clipPath: Path2D | null = null;
  private tableGeometry: TableGeometry = buildTableGeometry('classic_rect', W, 720, GOAL_W, WALL);

  private screen: Screen = 'home';
  private phase: GamePhase = 'ready';
  private phaseT = 0;

  private modeId: ModeId = 'classic';
  private opponentType: GameMode = 'ai';
  private diffKey: Difficulty = 'medium';
  private personality: PersonalityId = 'balanced';
  private stagePersonality: StagePersonalityId = 'balanced';
  private activeStage: StageConfig | null = null;
  private continuesUsed = 0;
  private obstacleLayoutId: string | null = null;
  private timedLimit = 120;
  private timeRemaining: number | null = null;
  private suddenDeathOvertime = false;

  private settings: GameSettings = { ...DEFAULT_SETTINGS };
  private score: Score = { p: 0, a: 0 };
  private lastScorer: Scorer = 'p';

  // Preallocated puck pool (index 0 is primary puck)
  private pucks: PuckState[] = Array.from({ length: MAX_PUCKS }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    spin: 0,
    spinAngle: 0,
    pinchStepsP: 0,
    pinchStepsA: 0,
    lastHitter: null,
    trail: [],
  }));

  // Scratch wall contact normal (zero per-frame allocations)
  private wallContact = { hit: false, nx: 0, ny: 0 };

  private me: Mallet = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
  private ai: Mallet = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };

  private pidP: number | null = null;
  private pidA: number | null = null;
  private anchorP: DragAnchor | null = null;
  private anchorA: DragAnchor | null = null;

  private topBrain: AiBrain = { aim: 0, aimT: 0, trackX: W / 2, feintSign: 1 };
  private botBrain: AiBrain = { aim: 0, aimT: 0, trackX: W / 2, feintSign: 1 };

  // Preallocated particle & ripple pools (zero per-frame GC)
  private particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: 3,
    alpha: 0,
    color: '#ffffff',
  }));
  private ripples: Ripple[] = Array.from({ length: 10 }, () => ({
    active: false,
    x: 0,
    y: 0,
    r: 10,
    maxR: 44,
    alpha: 0,
    color: '#ffffff',
  }));

  // Preallocated 2s ring buffer of positions (120Hz * 2s = 240)
  private ringBuf = new Float32Array(RING_BUFFER_SIZE * 6);
  private ringHead = 0;

  // Power-ups state
  private tablePowerup: TablePowerup | null = null;
  private activePowerups: ActivePowerup[] = [];
  private nextPowerupSpawnT = 9;
  private powerupEffects: PowerupEffectsState;

  // Match telemetry
  private matchElapsed = 0;
  private matchHits = 0;
  private currentRally = 0;
  private longestRally = 0;
  private maxPuckSpeed = 0;
  private maxDeficit = 0;
  private powerupsCollected = 0;

  // Slow-mo / zoom state
  private slowMoGoalY = 0;
  private slowMoWillEnd = false;
  private slowMoDuration = 1.2;
  private cameraZoom = 1;
  private cameraFocusY = 0.5;

  private shakeT = 0;
  private hitStopTimer = 0;
  private impactFlash = {
    active: false,
    x: 0,
    y: 0,
    r: 10,
    maxR: 58,
    alpha: 0,
  };
  private cd = 0;
  private keys = new Set<string>();
  private systemReducedMotion = false;

  // Interactive tutorial state (0 = off, 1..3 = active step)
  private tutorialStep: 0 | 1 | 2 | 3 = 0;
  private tutorialStep3Timer = 0;
  private tutorialAnimT = 0;

  // Auto-quality state
  private qualityTier: QualityTier = 'high';
  private qualityProbeTime = 0;
  private qualityProbeFrames = 0;
  private qualityLockedForSession = false;

  private rafId = 0;
  private lastTime = 0;
  private lastFrameStepTime = 0;
  private acc = 0;
  private hudSyncTimer = 0;
  private fpsFrames = 0;
  private fpsLastReport = 0;
  private destroyed = false;
  private resizeTimer: number | null = null;
  private resizeRaf: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    initialSettings: GameSettings,
    callbacks: EngineCallbacks
  ) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not acquire 2D canvas context');
    }
    this.cv = canvas;
    this.ctx = context;
    this.settings = { ...initialSettings };
    this.diffKey = initialSettings.defaultDifficulty;
    this.personality = initialSettings.defaultPersonality;
    this.callbacks = callbacks;

    if (typeof window !== 'undefined' && window.matchMedia) {
      this.systemReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    this.powerupEffects = {
      malletScaleP: 1,
      malletScaleA: 1,
      puckSpeedMul: 1,
      freezeP: false,
      freezeA: false,
      spawnExtraPuck: () => this.spawnExtraPuck(),
      clearExtraPucks: () => this.clearExtraPucks(),
    };

    if (this.settings.quality === 'low') {
      this.qualityTier = 'low';
    } else {
      this.qualityTier = 'high';
    }

    this.resize();
    this.setupDemoRally();
    this.bindEvents();
    this.lastTime = performance.now();
    this.lastFrameStepTime = this.lastTime;
    this.fpsLastReport = this.lastTime;
    this.rafId = requestAnimationFrame(this.frame);
  }

  private isReducedMotion(): boolean {
    return this.settings.reduceMotion || this.systemReducedMotion;
  }

  private effectiveQuality(): QualityTier {
    if (this.settings.quality === 'high') return 'high';
    if (this.settings.quality === 'low') return 'low';
    return this.qualityTier;
  }

  private getActiveTableSkin() {
    if (this.tutorialStep > 0) return getTableSkin('classic_ice');
    return getTableSkin(
      this.activeStage ? this.activeStage.skinOverride.table : this.settings.tableSkin
    );
  }

  private getActivePuckSkin() {
    if (this.tutorialStep > 0) return getPuckSkin('classic');
    return getPuckSkin(this.settings.puckSkin);
  }

  private getActiveMalletSkin(isMe: boolean) {
    if (this.tutorialStep > 0) return getMalletSkin('classic');
    if (!isMe && this.activeStage) {
      return getMalletSkin(this.activeStage.skinOverride.botMallet);
    }
    return getMalletSkin(this.settings.malletSkin);
  }

  private getMaxPuckVelocity(isDemo: boolean): number {
    const speedSettingMul = !isDemo && this.settings.puckSpeed === 'fast' ? 1.28 : 1;
    const stageSpeedMul = !isDemo && this.activeStage ? this.activeStage.puckSpeedMult : 1;
    return BASE_MAXV * speedSettingMul * stageSpeedMul * this.powerupEffects.puckSpeedMul;
  }

  private effectiveWinScore(): number {
    return this.activeStage ? this.activeStage.winScore : this.settings.winScore;
  }

  private isAtMatchPoint(): boolean {
    if (!this.activeStage || this.activeStage.winCondition !== 'score') return false;
    const target = this.effectiveWinScore();
    const threshold = this.activeStage.doublePuckAtScore ?? target - 1;
    return this.score.p >= threshold || this.score.a >= threshold;
  }

  private shouldKeepSecondPuck(): boolean {
    if (!this.activeStage) return false;
    return Boolean(
      this.activeStage.alwaysDoublePuck ||
        (this.activeStage.matchPointDoublePuck && this.isAtMatchPoint())
    );
  }

  applySettings(next: GameSettings): void {
    const tableChanged = next.tableSkin !== this.settings.tableSkin;
    const qualityChanged = next.quality !== this.settings.quality;
    this.settings = { ...next };

    if (qualityChanged) {
      if (next.quality === 'low') this.qualityTier = 'low';
      else if (next.quality === 'high') this.qualityTier = 'high';
      this.resize();
    } else if (tableChanged) {
      this.buildBg();
    }

    if (!this.settings.puckTrail || this.isReducedMotion() || this.effectiveQuality() === 'low') {
      for (const p of this.pucks) p.trail.length = 0;
    }
    if (this.isReducedMotion()) {
      for (const r of this.ripples) r.active = false;
      for (const pt of this.particles) pt.active = false;
      this.shakeT = 0;
    }
    this.draw();
  }

  setScreen(nextScreen: Screen): void {
    const prevScreen = this.screen;
    this.screen = nextScreen;
    if (nextScreen === 'home' && prevScreen !== 'home') {
      this.setupDemoRally();
    } else if (nextScreen !== 'game') {
      this.pidP = null;
      this.pidA = null;
      this.anchorP = null;
      this.anchorA = null;
      this.keys.clear();
    }
    this.lastTime = performance.now();
    this.acc = 0;
    this.draw();
  }

  startMatch(opts: {
    modeId: ModeId;
    opponentType: GameMode;
    difficulty: Difficulty;
    personality: PersonalityId;
    obstacleLayoutId: string | null;
    timedSeconds: number;
    stageConfig?: StageConfig | null;
  }): void {
    this.tutorialStep = 0;
    this.tutorialStep3Timer = 0;
    this.hitStopTimer = 0;
    this.impactFlash.active = false;
    const stage = opts.stageConfig ?? null;
    this.activeStage = stage;

    if (stage) {
      this.modeId =
        stage.winCondition === 'timed'
          ? 'timed'
          : stage.winCondition === 'sudden_death'
            ? 'sudden_death'
            : stage.obstacleLayoutId
              ? 'obstacles'
              : 'classic';
      this.opponentType = 'ai';
      this.diffKey = stage.difficulty;
      this.stagePersonality = stage.personality;
      this.personality =
        stage.personality === 'adaptive_grandmaster' || stage.personality === 'adaptive_immortal'
          ? 'attacker'
          : stage.personality === 'adaptive_eternal' || stage.personality === 'adaptive_stadium'
            ? 'trickster'
            : stage.personality === 'adaptive_architect'
              ? 'defender'
              : stage.personality;
      this.obstacleLayoutId = stage.obstacleLayoutId;
      this.timedLimit = stage.timeLimit ?? 90;
      this.timeRemaining = stage.winCondition === 'timed' ? this.timedLimit : null;
    } else {
      this.modeId = opts.modeId;
      this.opponentType = opts.opponentType;
      this.diffKey = opts.difficulty;
      this.personality = opts.personality;
      this.stagePersonality = opts.personality;
      const modeCfg = MODES[this.modeId];
      this.obstacleLayoutId = opts.obstacleLayoutId ?? modeCfg.obstacles;
      this.timedLimit = opts.timedSeconds;
      this.timeRemaining = modeCfg.winCondition === 'timed' ? this.timedLimit : null;
    }
    this.suddenDeathOvertime = false;
    this.continuesUsed = 0;

    this.score = { p: 0, a: 0 };
    this.matchElapsed = 0;
    this.matchHits = 0;
    this.currentRally = 0;
    this.longestRally = 0;
    this.maxPuckSpeed = 0;
    this.maxDeficit = 0;
    this.powerupsCollected = 0;

    this.clearAllPowerups(true);
    this.nextPowerupSpawnT = 8 + Math.random() * 4;
    this.cameraZoom = 1;
    this.cameraFocusY = 0.5;
    this.slowMoWillEnd = false;

    // Reset auto-quality probe for fresh match when in auto mode
    this.qualityProbeTime = 0;
    this.qualityProbeFrames = 0;
    this.qualityLockedForSession = false;
    if (this.settings.quality === 'auto') {
      this.qualityTier = 'high';
    }

    this.buildBg();
    this.screen = 'game';
    this.home();
    this.placePrimaryPuck(this.H * 0.68);
    if (this.shouldKeepSecondPuck()) {
      this.spawnExtraPuck();
    }
    this.phase = 'ready';
    this.phaseT = MODES[this.modeId].winCondition === 'practice' ? 1.2 : 3;
    this.lastScorer = 'a';
    this.clearVisualPools();
    this.shakeT = 0;
    this.cd = 0;
    this.pidP = null;
    this.pidA = null;
    this.anchorP = null;
    this.anchorA = null;
    this.lastTime = performance.now();
    this.lastFrameStepTime = this.lastTime;
    this.acc = 0;
    this.emitHud();
  }

  startTutorial(): void {
    this.activeStage = null;
    this.modeId = 'practice';
    this.opponentType = 'ai';
    this.obstacleLayoutId = null;
    this.timeRemaining = null;
    this.suddenDeathOvertime = false;
    this.continuesUsed = 0;
    this.score = { p: 0, a: 0 };
    this.matchElapsed = 0;
    this.matchHits = 0;
    this.currentRally = 0;
    this.longestRally = 0;
    this.maxPuckSpeed = 0;
    this.maxDeficit = 0;
    this.powerupsCollected = 0;
    this.clearAllPowerups(true);
    this.cameraZoom = 1;
    this.cameraFocusY = 0.5;
    this.slowMoWillEnd = false;
    this.hitStopTimer = 0;
    this.impactFlash.active = false;
    this.tutorialStep = 1;
    this.tutorialStep3Timer = 0;
    this.tutorialAnimT = 0;

    this.buildBg();
    this.screen = 'game';
    this.home();
    this.placePrimaryPuck(this.H * 0.5);
    this.phase = 'play';
    this.clearVisualPools();
    this.shakeT = 0;
    this.cd = 0;
    this.pidP = null;
    this.pidA = null;
    this.anchorP = null;
    this.anchorA = null;
    this.keys.clear();
    this.lastTime = performance.now();
    this.lastFrameStepTime = this.lastTime;
    this.acc = 0;
    this.callbacks.onTutorialStepChange?.(1);
    this.emitHud();
  }

  skipTutorial(): void {
    if (this.tutorialStep === 0) return;
    this.finishTutorial(true);
  }

  private finishTutorial(skipped: boolean): void {
    this.tutorialStep = 0;
    this.tutorialStep3Timer = 0;
    this.hitStopTimer = 0;
    this.impactFlash.active = false;
    this.pidP = null;
    this.pidA = null;
    this.anchorP = null;
    this.anchorA = null;
    this.keys.clear();
    this.callbacks.onTutorialComplete?.(skipped);
  }

  continueStageMatch(): void {
    if (!this.activeStage) return;
    this.continuesUsed += 1;

    if (this.activeStage.winCondition === 'timed') {
      this.timeRemaining = (this.timeRemaining ?? 0) + 30;
      if (this.suddenDeathOvertime) {
        this.suddenDeathOvertime = false;
        this.score.a = Math.max(0, this.score.a - 1);
      }
    } else {
      this.score.a = Math.max(0, this.score.a - 1);
    }

    this.clearAllPowerups(true);
    this.nextPowerupSpawnT = 8 + Math.random() * 4;
    this.cameraZoom = 1;
    this.cameraFocusY = 0.5;
    this.slowMoWillEnd = false;

    this.home();
    this.placePrimaryPuck(this.H * 0.5);
    if (this.shouldKeepSecondPuck()) {
      this.spawnExtraPuck();
    }
    this.clearVisualPools();
    this.shakeT = 0;
    this.cd = 0;
    this.phase = 'ready';
    this.phaseT = 3;
    this.pidP = null;
    this.pidA = null;
    this.anchorP = null;
    this.anchorA = null;
    this.keys.clear();
    this.screen = 'game';
    this.lastTime = performance.now();
    this.acc = 0;
    this.emitHud();
  }

  resumeMatch(): void {
    this.screen = 'game';
    this.lastTime = performance.now();
    this.lastFrameStepTime = this.lastTime;
    this.acc = 0;
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.resizeTimer !== null) {
      window.clearTimeout(this.resizeTimer);
    }
    if (this.resizeRaf !== null) {
      cancelAnimationFrame(this.resizeRaf);
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.unbindEvents();
  }

  private clearVisualPools(): void {
    for (const p of this.pucks) p.trail.length = 0;
    for (const pt of this.particles) pt.active = false;
    for (const rp of this.ripples) rp.active = false;
    this.impactFlash.active = false;
  }

  private setupDemoRally(): void {
    this.tutorialStep = 0;
    this.tutorialStep3Timer = 0;
    this.hitStopTimer = 0;
    this.activeStage = null;
    this.stagePersonality = 'balanced';
    this.modeId = 'classic';
    this.obstacleLayoutId = null;
    this.timeRemaining = null;
    this.suddenDeathOvertime = false;
    this.score = { p: 0, a: 0 };
    this.cameraZoom = 1;
    this.cameraFocusY = 0.5;
    this.clearAllPowerups(true);
    this.buildBg();
    this.home();
    this.placePrimaryPuck(this.H * 0.5);
    const p0 = this.pucks[0];
    const dirX = Math.random() < 0.5 ? -1 : 1;
    const dirY = Math.random() < 0.5 ? -1 : 1;
    p0.vx = dirX * (180 + Math.random() * 140);
    p0.vy = dirY * (260 + Math.random() * 140);
    this.phase = 'play';
    this.clearVisualPools();
    this.shakeT = 0;
  }

  private getBumpers(): ObstacleBumper[] {
    if (!this.obstacleLayoutId) return [];
    return OBSTACLE_LAYOUTS[this.obstacleLayoutId]?.bumpers ?? [];
  }

  private rr(
    p: CanvasRenderingContext2D | Path2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
  }

  private drawTablePattern(g: CanvasRenderingContext2D, tableSkin: TableSkin): void {
    drawTablePattern(g, tableSkin, W, this.H);
  }

  private buildBg(): void {
    const k = Math.max(1, this.scale * this.dpr);
    const bg = document.createElement('canvas');
    bg.width = Math.ceil(W * k);
    bg.height = Math.ceil(this.H * k);
    const g = bg.getContext('2d');
    if (!g) return;

    const tableSkin = this.getActiveTableSkin();
    this.tableGeometry = buildTableGeometry(tableSkin.shape, W, this.H, GOAL_W, WALL);

    const outerPath = new Path2D();
    tracePolygonPath(outerPath, this.tableGeometry.polygonPoints);

    g.scale(k, k);
    g.save();
    g.clip(outerPath);

    g.fillStyle = tableSkin.surface;
    g.fillRect(0, 0, W, this.H);

    const grad = g.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, tableSkin.surfaceHighlight);
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, tableSkin.surfaceShadow);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, this.H);

    this.drawTablePattern(g, tableSkin);

    g.lineWidth = 3;
    g.strokeStyle = tableSkin.lines;
    g.beginPath();
    g.moveTo(0, this.H / 2);
    g.lineTo(W, this.H / 2);
    g.stroke();

    g.beginPath();
    g.arc(W / 2, this.H / 2, 64, 0, Math.PI * 2);
    g.stroke();

    g.fillStyle = tableSkin.lines;
    g.beginPath();
    g.arc(W / 2, this.H / 2, 5, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = tableSkin.redZone;
    g.beginPath();
    g.arc(W / 2, this.H, 112, Math.PI, Math.PI * 2);
    g.stroke();

    g.strokeStyle = tableSkin.blueZone;
    g.beginPath();
    g.arc(W / 2, 0, 112, 0, Math.PI);
    g.stroke();

    const lightSurface = isLightSurface(tableSkin.surface);

    // Static obstacle bumpers with surface-derived contrast ring
    const bumpers = this.getBumpers();
    for (let i = 0; i < bumpers.length; i++) {
      const b = bumpers[i];
      const by = b.y * this.H;
      g.fillStyle = tableSkin.bumper;
      g.beginPath();
      g.arc(b.x, by, b.r, 0, Math.PI * 2);
      g.fill();

      g.lineWidth = 3;
      g.strokeStyle = tableSkin.bumperRing;
      g.beginPath();
      g.arc(b.x, by, Math.max(4, b.r - 4), 0, Math.PI * 2);
      g.stroke();

      g.lineWidth = 1.25;
      g.strokeStyle = lightSurface ? 'rgba(16, 25, 34, 0.35)' : 'rgba(255, 255, 255, 0.25)';
      g.beginPath();
      g.arc(b.x, by, b.r, 0, Math.PI * 2);
      g.stroke();
    }

    // Outer rail along the active table shape perimeter
    g.lineWidth = WALL * 2;
    g.lineJoin = 'round';
    g.strokeStyle = tableSkin.rail;
    g.stroke(outerPath);

    // Inner bevel derived from surface luminance for crisp edge readability
    g.lineWidth = 1.75;
    g.lineJoin = 'round';
    g.strokeStyle = lightSurface ? 'rgba(16, 25, 34, 0.22)' : 'rgba(255, 255, 255, 0.24)';
    g.beginPath();
    tracePolygonPath(g, this.tableGeometry.innerPolygonPoints);
    g.stroke();

    g.fillStyle = tableSkin.goalSlot;
    g.beginPath();
    this.rr(g, GX1, -20, GOAL_W, 20 + WALL + 14, 14);
    g.fill();

    g.beginPath();
    this.rr(g, GX1, this.H - WALL - 14, GOAL_W, 20 + WALL + 14, 14);
    g.fill();

    g.lineWidth = 3;
    g.strokeStyle = tableSkin.blueZone;
    g.beginPath();
    this.rr(g, GX1, -20, GOAL_W, 20 + WALL + 14, 14);
    g.stroke();

    g.strokeStyle = tableSkin.redZone;
    g.beginPath();
    this.rr(g, GX1, this.H - WALL - 14, GOAL_W, 20 + WALL + 14, 14);
    g.stroke();

    g.restore();

    this.bg = bg;
    this.clipPath = outerPath;
  }

  private scheduleResize = (): void => {
    if (this.destroyed || this.resizeRaf !== null) return;
    this.resizeRaf = requestAnimationFrame(() => {
      this.resizeRaf = null;
      if (!this.destroyed) this.resize();
    });
  };

  private resize = (): void => {
    const tier = this.effectiveQuality();
    const maxDpr = tier === 'low' ? 1 : tier === 'medium' ? 1.5 : 3;
    this.dpr = Math.min(window.devicePixelRatio || 1, maxDpr);

    const parent = this.cv.parentElement;
    const measuredW = parent?.clientWidth || window.visualViewport?.width || window.innerWidth;
    const measuredH = parent?.clientHeight || window.visualViewport?.height || window.innerHeight;
    this.cw = Math.max(1, measuredW);
    this.ch = Math.max(1, measuredH);
    this.cv.width = Math.max(1, Math.round(this.cw * this.dpr));
    this.cv.height = Math.max(1, Math.round(this.ch * this.dpr));

    const asp = clamp(this.ch / Math.max(1, this.cw), 1.4, 2.25);
    const nh = Math.round(W * asp);
    if (nh !== this.H) {
      const k = nh / this.H;
      for (const p of this.pucks) {
        p.y *= k;
        for (let t = 0; t < p.trail.length; t++) {
          p.trail[t].y *= k;
        }
      }
      this.me.y *= k;
      this.me.ty *= k;
      this.ai.y *= k;
      this.ai.ty *= k;
      if (this.tablePowerup) this.tablePowerup.y *= k;
      this.H = nh;
    }

    // Proportional container inset so rotated phones & wide tablets keep full table unclipped
    const minSide = Math.min(this.cw, this.ch);
    const pad = minSide > 520 ? clamp(Math.round(minSide * 0.025), 8, 24) : 2;
    this.scale = Math.min((this.cw - pad * 2) / W, (this.ch - pad * 2) / this.H);
    this.offX = (this.cw - W * this.scale) / 2;
    this.offY = (this.ch - this.H * this.scale) / 2;
    this.buildBg();
    this.clampMalletPosition(this.me, true);
    this.clampMalletPosition(this.ai, false);
  };

  private home(): void {
    this.me.x = this.me.tx = W / 2;
    this.me.y = this.me.ty = this.H - 120;
    this.me.vx = this.me.vy = 0;

    this.ai.x = this.ai.tx = W / 2;
    this.ai.y = this.ai.ty = 120;
    this.ai.vx = this.ai.vy = 0;

    this.topBrain.trackX = W / 2;
    this.botBrain.trackX = W / 2;
  }

  private placePrimaryPuck(y: number, x = W / 2): void {
    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      p.active = i === 0;
      p.x = x;
      p.y = y;
      p.vx = 0;
      p.vy = 0;
      p.spin = 0;
      p.spinAngle = 0;
      p.pinchStepsP = 0;
      p.pinchStepsA = 0;
      p.lastHitter = null;
      p.trail.length = 0;
    }
  }

  private spawnExtraPuck(): void {
    for (let i = 1; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (!p.active) {
        p.active = true;
        p.x = W / 2 + (Math.random() < 0.5 ? -36 : 36);
        p.y = this.H / 2;
        p.vx = (Math.random() * 2 - 1) * 260;
        p.vy = (Math.random() < 0.5 ? -1 : 1) * 280;
        p.spin = 0;
        p.spinAngle = 0;
        p.pinchStepsP = 0;
        p.pinchStepsA = 0;
        p.lastHitter = this.pucks[0].lastHitter ?? 'p';
        p.trail.length = 0;
        return;
      }
    }
  }

  private clearExtraPucks(forceAll = false): void {
    const startIdx = forceAll || !this.shouldKeepSecondPuck() ? 1 : 2;
    for (let i = startIdx; i < this.pucks.length; i++) {
      this.pucks[i].active = false;
      this.pucks[i].trail.length = 0;
    }
  }

  private clearAllPowerups(forceAllPucks = false): void {
    this.tablePowerup = null;
    for (let i = 0; i < this.activePowerups.length; i++) {
      const eff = this.activePowerups[i];
      POWERUPS[eff.id].remove(eff.collector, this.powerupEffects);
    }
    this.activePowerups.length = 0;
    this.powerupEffects.malletScaleP = 1;
    this.powerupEffects.malletScaleA = 1;
    this.powerupEffects.puckSpeedMul = 1;
    this.powerupEffects.freezeP = false;
    this.powerupEffects.freezeA = false;
    this.clearExtraPucks(forceAllPucks);
  }

  private spawnPowerup(): void {
    const ids = Object.keys(POWERUPS) as PowerupId[];
    const id = ids[Math.floor(Math.random() * ids.length)];
    const bumpers = this.getBumpers();

    let x = W / 2;
    let y = this.H / 2;
    for (let attempt = 0; attempt < 12; attempt++) {
      const cy = this.H * (0.38 + Math.random() * 0.24);
      const bounds = this.tableGeometry.xBoundsAtY(cy);
      const padX = POWERUP_RADIUS + 18;
      const minSpawnX = Math.min(W / 2, bounds.minX + padX);
      const maxSpawnX = Math.max(W / 2, bounds.maxX - padX);
      const cx = minSpawnX + Math.random() * Math.max(0, maxSpawnX - minSpawnX);
      let overlaps = false;
      for (let i = 0; i < bumpers.length; i++) {
        const b = bumpers[i];
        if (Math.hypot(cx - b.x, cy - b.y * this.H) < b.r + POWERUP_RADIUS + 14) {
          overlaps = true;
          break;
        }
      }
      if (!overlaps) {
        x = cx;
        y = cy;
        break;
      }
    }

    this.tablePowerup = { id, x, y, ttl: 6, age: 0 };
  }

  private collectPowerup(puck: PuckState): void {
    if (!this.tablePowerup) return;
    const def = POWERUPS[this.tablePowerup.id];
    const collector: Scorer = puck.lastHitter ?? 'p';

    // Remove existing instance of same power-up before re-applying
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      if (this.activePowerups[i].id === def.id) {
        POWERUPS[def.id].remove(this.activePowerups[i].collector, this.powerupEffects);
        this.activePowerups.splice(i, 1);
      }
    }

    def.apply(collector, this.powerupEffects);
    if (def.id === 'speed_boost') {
      for (const p of this.pucks) {
        if (p.active) {
          p.vx *= 1.25;
          p.vy *= 1.25;
        }
      }
    }

    this.activePowerups.push({
      id: def.id,
      collector,
      remaining: def.duration,
      duration: def.duration,
    });
    this.powerupsCollected += 1;
    soundEngine.play('powerup');
    this.addRipple(this.tablePowerup.x, this.tablePowerup.y, def.color, 54);
    this.spawnParticles(this.tablePowerup.x, this.tablePowerup.y, def.color, 8);
    this.tablePowerup = null;
  }

  private updatePowerups(dt: number): void {
    if (this.tutorialStep > 0) return;
    const modeCfg = MODES[this.modeId];
    const powerupsAllowed = this.activeStage
      ? this.activeStage.powerups
      : modeCfg.powerups && this.settings.powerupsEnabled;
    if (!powerupsAllowed) return;

    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const eff = this.activePowerups[i];
      eff.remaining -= dt;
      if (eff.remaining <= 0) {
        POWERUPS[eff.id].remove(eff.collector, this.powerupEffects);
        this.activePowerups.splice(i, 1);
      }
    }

    if (this.tablePowerup) {
      this.tablePowerup.ttl -= dt;
      this.tablePowerup.age += dt;
      if (this.tablePowerup.ttl <= 0) {
        this.tablePowerup = null;
        this.nextPowerupSpawnT = 8 + Math.random() * 4;
      } else {
        for (let i = 0; i < this.pucks.length; i++) {
          const p = this.pucks[i];
          if (!p.active) continue;
          if (
            Math.hypot(p.x - this.tablePowerup.x, p.y - this.tablePowerup.y) <
            PR + POWERUP_RADIUS
          ) {
            this.collectPowerup(p);
            this.nextPowerupSpawnT = 8 + Math.random() * 4;
            break;
          }
        }
      }
    } else {
      this.nextPowerupSpawnT -= dt;
      if (this.nextPowerupSpawnT <= 0) {
        this.spawnPowerup();
      }
    }
  }

  private willMatchEndAfterGoal(): boolean {
    const modeCfg = MODES[this.modeId];
    if (modeCfg.winCondition === 'practice') return false;
    if (modeCfg.winCondition === 'sudden_death' || this.suddenDeathOvertime) return true;
    if (modeCfg.winCondition === 'timed') return false;
    const target = this.effectiveWinScore();
    return this.score.p >= target || this.score.a >= target;
  }

  private goal(who: Scorer): void {
    if (this.screen === 'home') {
      this.placePrimaryPuck(this.H * 0.5);
      const p0 = this.pucks[0];
      const dirX = Math.random() < 0.5 ? -1 : 1;
      const dirY = who === 'p' ? 1 : -1;
      p0.vx = dirX * (170 + Math.random() * 140);
      p0.vy = dirY * (260 + Math.random() * 120);
      return;
    }

    if (this.tutorialStep > 0) {
      if (this.tutorialStep === 2) {
        if (who === 'p') {
          soundEngine.play('goal', 0, { isMatchPoint: true });
          this.tutorialStep = 3;
          this.tutorialStep3Timer = 0;
          this.placePrimaryPuck(this.H * 0.62);
          this.callbacks.onTutorialStepChange?.(3);
        } else {
          this.placePrimaryPuck(this.H * 0.58, 78);
        }
      } else if (this.tutorialStep === 3) {
        this.placePrimaryPuck(this.H * 0.62);
      } else {
        this.placePrimaryPuck(this.H * 0.5);
      }
      return;
    }

    const modeCfg = MODES[this.modeId];
    this.currentRally = 0;

    if (modeCfg.winCondition === 'practice') {
      this.placePrimaryPuck(this.H * 0.72);
      soundEngine.play('goal');
      this.emitHud();
      return;
    }

    this.score[who] += 1;
    const deficit = this.score.a - this.score.p;
    if (deficit > this.maxDeficit) this.maxDeficit = deficit;

    this.lastScorer = who;
    this.clearAllPowerups(true);
    this.nextPowerupSpawnT = 8 + Math.random() * 4;

    if (this.settings.screenShake && !this.isReducedMotion() && this.effectiveQuality() !== 'low') {
      this.shakeT = 0.28;
    }
    soundEngine.play('goal', 0, {
      isMatchPoint: this.isAtMatchPoint() || this.suddenDeathOvertime,
    });

    const goalY = who === 'p' ? 0 : this.H;
    const tableSkin = this.getActiveTableSkin();
    this.spawnParticles(W / 2, goalY === 0 ? WALL + 8 : this.H - WALL - 8, who === 'p' ? tableSkin.p1Banner : tableSkin.p2Banner, 12);

    const endsMatch = this.willMatchEndAfterGoal();
    const runSlowMo =
      !this.isReducedMotion() &&
      this.effectiveQuality() !== 'low' &&
      (this.settings.goalSlowMo === 'all' || (this.settings.goalSlowMo === 'winning' && endsMatch));

    if (runSlowMo) {
      this.phase = 'slowmo';
      this.phaseT = this.slowMoDuration;
      this.slowMoGoalY = who === 'p' ? 0.14 : 0.86;
      this.slowMoWillEnd = endsMatch;
      this.cameraFocusY = this.slowMoGoalY;
    } else {
      for (const p of this.pucks) {
        p.active = false;
        p.vx = 0;
        p.vy = 0;
      }
      this.phase = 'goal';
      this.phaseT = 1.15;
      this.slowMoWillEnd = endsMatch;
    }

    this.emitHud();
  }

  private serve(): void {
    const conceder = this.lastScorer === 'p' ? 'a' : 'p';
    this.placePrimaryPuck(conceder === 'a' ? this.H * 0.3 : this.H * 0.7);
    if (this.shouldKeepSecondPuck()) {
      this.spawnExtraPuck();
    }
    if (this.pidP === null) {
      this.me.tx = W / 2;
      this.me.ty = this.H - 120;
    }
    if (this.pidA === null) {
      this.ai.tx = W / 2;
      this.ai.ty = 120;
    }
    this.cameraZoom = 1;
    this.cameraFocusY = 0.5;
    this.cd = 0;
    this.phase = 'ready';
    this.phaseT = 2;
  }

  private endGame(): void {
    this.screen = 'over';
    this.pidP = null;
    this.pidA = null;
    this.anchorP = null;
    this.anchorA = null;
    this.keys.clear();
    this.cameraZoom = 1;
    this.cameraFocusY = 0.5;
    this.clearAllPowerups(true);

    const modeCfg = MODES[this.modeId];
    this.callbacks.onMatchEnd({
      modeId: this.modeId,
      opponentType: this.opponentType,
      hasOpponent: modeCfg.opponent,
      difficulty: this.diffKey,
      personality: this.personality,
      playerScore: this.score.p,
      opponentScore: this.score.a,
      won: this.score.p > this.score.a,
      duration: this.matchElapsed,
      hits: this.matchHits,
      longestRally: this.longestRally,
      maxPuckSpeed: this.maxPuckSpeed,
      maxDeficit: this.maxDeficit,
      powerupsCollected: this.powerupsCollected,
      winCondition: ((this.activeStage
        ? this.activeStage.winCondition
        : modeCfg.winCondition) as MatchResult['winCondition']),
      isStage: !!this.activeStage,
      ...(this.activeStage
        ? { stageId: this.activeStage.id, continuesUsed: this.continuesUsed }
        : {}),
    });
  }

  private getMalletRadius(isMe: boolean): number {
    const stageScale = !isMe && this.activeStage ? this.activeStage.botMalletMult : 1;
    return MR * stageScale * (isMe ? this.powerupEffects.malletScaleP : this.powerupEffects.malletScaleA);
  }

  private clampMalletPosition(m: Mallet, isMe: boolean): void {
    const mr = this.getMalletRadius(isMe);
    const allowFullTable = this.tutorialStep === 0 && isMe && !MODES[this.modeId].opponent;
    const clamped = this.tableGeometry.clampMalletPosition(m.x, m.y, mr, !isMe, allowFullTable);
    m.x = clamped.x;
    m.y = clamped.y;

    const bumpers = this.getBumpers();
    for (let i = 0; i < bumpers.length; i++) {
      const b = bumpers[i];
      const by = b.y * this.H;
      const dx = m.x - b.x;
      const dy = m.y - by;
      const d = Math.hypot(dx, dy);
      const minD = mr + b.r;
      if (d < minD && d > 0.001) {
        m.x = b.x + (dx / d) * minD;
        m.y = by + (dy / d) * minD;
      }
    }
  }

  private moveMallet(m: Mallet, tx: number, ty: number, sp: number, dt: number, isMe: boolean): void {
    if (isMe && this.powerupEffects.freezeP) {
      m.vx = 0;
      m.vy = 0;
      return;
    }
    if (!isMe && this.powerupEffects.freezeA) {
      m.vx = 0;
      m.vy = 0;
      return;
    }

    const mr = this.getMalletRadius(isMe);
    const allowFullTable = this.tutorialStep === 0 && isMe && !MODES[this.modeId].opponent;
    const clampedTarget = this.tableGeometry.clampMalletPosition(tx, ty, mr, !isMe, allowFullTable);
    let clampedX = clampedTarget.x;
    let clampedY = clampedTarget.y;

    // Prevent mallet overlapping static obstacle bumpers
    const bumpers = this.getBumpers();
    for (let i = 0; i < bumpers.length; i++) {
      const b = bumpers[i];
      const by = b.y * this.H;
      const dx = clampedX - b.x;
      const dy = clampedY - by;
      const d = Math.hypot(dx, dy);
      const minD = mr + b.r;
      if (d < minD && d > 0.001) {
        clampedX = b.x + (dx / d) * minD;
        clampedY = by + (dy / d) * minD;
      }
    }

    const dx = clampedX - m.x;
    const dy = clampedY - m.y;
    const d = Math.hypot(dx, dy);
    const mx = sp * dt;

    let nx = m.x;
    let ny = m.y;
    if (d <= mx) {
      nx = clampedX;
      ny = clampedY;
    } else if (d > 0) {
      nx += (dx / d) * mx;
      ny += (dy / d) * mx;
      const clampedStep = this.tableGeometry.clampMalletPosition(nx, ny, mr, !isMe, allowFullTable);
      nx = clampedStep.x;
      ny = clampedStep.y;
    }

    m.vx = (nx - m.x) / dt;
    m.vy = (ny - m.y) / dt;
    m.x = nx;
    m.y = ny;
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    if (this.isReducedMotion() || this.effectiveQuality() === 'low' || this.screen === 'home') {
      return;
    }
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const pt = this.particles[i];
      if (!pt.active) {
        const ang = (Math.PI * 2 * spawned) / count + (Math.random() - 0.5) * 0.4;
        const spd = 90 + Math.random() * 190;
        pt.active = true;
        pt.x = x;
        pt.y = y;
        pt.vx = Math.cos(ang) * spd;
        pt.vy = Math.sin(ang) * spd;
        pt.r = 2.5 + Math.random() * 2;
        pt.alpha = 0.9;
        pt.color = color;
        spawned += 1;
      }
    }
  }

  private addRipple(x: number, y: number, color: string, maxR = 44): void {
    if (this.isReducedMotion() || this.effectiveQuality() === 'low' || this.screen === 'home') {
      return;
    }
    for (let i = 0; i < this.ripples.length; i++) {
      const rp = this.ripples[i];
      if (!rp.active) {
        rp.active = true;
        rp.x = x;
        rp.y = y;
        rp.r = 10;
        rp.maxR = maxR;
        rp.alpha = 0.45;
        rp.color = color;
        return;
      }
    }
  }

  private detectPuckWallContact(p: PuckState): void {
    const geom = this.tableGeometry;
    const eps = 2.0;
    let nx = 0;
    let ny = 0;

    // Check wall segments
    const segs = geom.wallSegments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.len <= 0.001) continue;
      const ux = (s.bx - s.ax) / s.len;
      const uy = (s.by - s.ay) / s.len;
      const proj = (p.x - s.ax) * ux + (p.y - s.ay) * uy;
      if (proj >= -eps && proj <= s.len + eps) {
        const signedD = (p.x - s.ax) * s.nx + (p.y - s.ay) * s.ny;
        if (signedD <= PR + eps && signedD >= -PR) {
          nx += s.nx;
          ny += s.ny;
        }
      }
    }

    // Check rounded corner fillet arcs
    const arcs = geom.cornerArcs;
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const maxCornerD = arc.r - PR;
      const dx = p.x - arc.cx;
      const dy = p.y - arc.cy;
      const d = Math.hypot(dx, dy);
      if (d >= maxCornerD - eps && d > 0.001) {
        const ang = Math.atan2(dy, dx);
        if (isAngleInArc(ang, arc.startAngle, arc.sweep)) {
          nx += -dx / d;
          ny += -dy / d;
        }
      }
    }

    // Check convex waist vertices
    const verts = geom.convexVertices;
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i];
      const dx = p.x - v.x;
      const dy = p.y - v.y;
      const d = Math.hypot(dx, dy);
      if (d <= PR + eps && d > 0.001) {
        nx += dx / d;
        ny += dy / d;
      }
    }

    const len = Math.hypot(nx, ny);
    if (len > 0.001) {
      this.wallContact.hit = true;
      this.wallContact.nx = nx / len;
      this.wallContact.ny = ny / len;
    } else {
      this.wallContact.hit = false;
      this.wallContact.nx = 0;
      this.wallContact.ny = 0;
    }
  }

  private collideMalletWithPuck(
    m: Mallet,
    isMe: boolean,
    puck: PuckState,
    color: string,
    isDemo: boolean
  ): void {
    const mr = this.getMalletRadius(isMe);
    const dx = puck.x - m.x;
    const dy = puck.y - m.y;
    const d = Math.hypot(dx, dy);
    const min = PR + mr;

    if (d >= min || d <= 0.001) {
      if (isMe) puck.pinchStepsP = 0;
      else puck.pinchStepsA = 0;
      return;
    }

    const nx = dx / d;
    const ny = dy / d;

    // 1. Positional correction with separation bias
    // The tiny 0.5 bias guarantees the puck fully clears the mallet's boundary 
    // before the next substep, preventing micro-vibration or "sticking".
    const overlap = min - d;
    const separationBias = 0.5;
    puck.x += nx * (overlap + separationBias);
    puck.y += ny * (overlap + separationBias);

    // 2. Relative velocity along the collision normal
    const rv = (puck.vx - m.vx) * nx + (puck.vy - m.vy) * ny;

    // Only resolve bounce if they are moving towards each other (or mallet is catching up)
    if (rv < 0) {
      const massRatio = 3.0; // Mallet is ~3x heavier than puck
      const restitution = 0.85; // Bouncy, but prevents infinite energy gain on pushes

      // Impulse scalar
      const j = -(1 + restitution) * rv / (1 + 1 / massRatio);

      // Apply normal impulse to puck (clean, snappy bounce)
      puck.vx += j * nx;
      puck.vy += j * ny;

      // 3. Tangential interaction: ZERO linear drag
      // Real air hockey mallets are smooth. We calculate tangential velocity 
      // ONLY to impart spin, without altering the puck's linear trajectory.
      const tx = -ny;
      const ty = nx;
      const rt = (puck.vx - m.vx) * tx + (puck.vy - m.vy) * ty;
      
      // Convert relative tangential swipe directly into spin, no velocity "glue"
      puck.spin = clamp(puck.spin + (rt * 0.2) / 300, -1, 1);

      puck.lastHitter = isMe ? 'p' : 'a';

      if (!isDemo) {
        const puckSpeed = Math.hypot(puck.vx, puck.vy);
        const maxV = this.getMaxPuckVelocity(false);
        soundEngine.play('hit', puckSpeed, { maxV });

        if (Math.abs(rv) > 150) {
          const contactX = m.x + nx * mr;
          const contactY = m.y + ny * mr;
          this.addRipple(contactX, contactY, color, 42);

          if (puckSpeed >= 1100 && !this.isReducedMotion()) {
            this.hitStopTimer = 0.01;
            this.shakeT = Math.max(this.shakeT, 0.09);
            if (this.effectiveQuality() !== 'low') {
              this.impactFlash.active = true;
              this.impactFlash.x = contactX;
              this.impactFlash.y = contactY;
              this.impactFlash.r = 10;
              this.impactFlash.maxR = 62;
              this.impactFlash.alpha = 0.95;
            }
            soundEngine.vibratePulse(25);
          }
        }
      }

      if (isMe) {
        this.matchHits += 1;
        this.currentRally += 1;
        if (this.currentRally > this.longestRally) this.longestRally = this.currentRally;
        
        if (this.tutorialStep === 1) {
          this.tutorialStep = 2;
          this.placePrimaryPuck(this.H * 0.58, 78);
          this.callbacks.onTutorialStepChange?.(2);
        } else if (this.tutorialStep === 3 && Math.abs(puck.spin) > 0.2) {
          this.finishTutorial(false);
          return;
        }
      }
    }
  }

  private collidePuckWithCircle(
    puck: PuckState,
    cx: number,
    cy: number,
    cr: number,
    restitution: number,
    isDemo: boolean
  ): void {
    const dx = puck.x - cx;
    const dy = puck.y - cy;
    const d = Math.hypot(dx, dy);
    const minD = PR + cr;
    if (d < minD && d > 0.001) {
      const nx = dx / d;
      const ny = dy / d;
      puck.x = cx + nx * minD;
      puck.y = cy + ny * minD;
      const vn = puck.vx * nx + puck.vy * ny;
      if (vn < 0) {
        puck.vx -= (1 + restitution) * vn * nx;
        puck.vy -= (1 + restitution) * vn * ny;
        puck.spin = 0;
        if (!isDemo) {
          soundEngine.play('wall', -vn, { maxV: this.getMaxPuckVelocity(false) });
        }
      }
    }
  }

  private resolvePuckBoundsAndObstacles(
    p: PuckState,
    bumpers: ObstacleBumper[],
    isDemo: boolean
  ): void {
    const geom = this.tableGeometry;
    const maxV = this.getMaxPuckVelocity(isDemo);

    // 1. Rounded corner fillet arcs (concave corner curves)
    const arcs = geom.cornerArcs;
    for (let i = 0; i < arcs.length; i++) {
      const arc = arcs[i];
      const maxCornerD = arc.r - PR;
      if (maxCornerD <= 0) continue;
      const dx = p.x - arc.cx;
      const dy = p.y - arc.cy;
      const d = Math.hypot(dx, dy);
      if (d > maxCornerD && d > 0.001) {
        const ang = Math.atan2(dy, dx);
        if (isAngleInArc(ang, arc.startAngle, arc.sweep)) {
          const nx = -dx / d;
          const ny = -dy / d;
          p.x = arc.cx - nx * maxCornerD;
          p.y = arc.cy - ny * maxCornerD;
          const vn = p.vx * nx + p.vy * ny;
          if (vn < 0) {
            if (!isDemo) soundEngine.play('wall', -vn, { maxV });
            p.vx -= 1.94 * vn * nx;
            p.vy -= 1.94 * vn * ny;
            p.spin = 0;
          }
        }
      }
    }

    // 2. Solid wall segments (straight & angled rails; top/bottom goal mouths stay open)
    const segs = geom.wallSegments;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (s.len <= 0.001) continue;
      const ux = (s.bx - s.ax) / s.len;
      const uy = (s.by - s.ay) / s.len;
      const proj = (p.x - s.ax) * ux + (p.y - s.ay) * uy;
      if (proj >= 0 && proj <= s.len) {
        const signedD = (p.x - s.ax) * s.nx + (p.y - s.ay) * s.ny;
        if (signedD < PR && signedD > -PR * 2.5) {
          const push = PR - signedD;
          p.x += s.nx * push;
          p.y += s.ny * push;
          const vn = p.vx * s.nx + p.vy * s.ny;
          if (vn < 0) {
            if (!isDemo) soundEngine.play('wall', -vn, { maxV });
            p.vx -= 1.94 * vn * s.nx;
            p.vy -= 1.94 * vn * s.ny;
            p.spin = 0;
          }
        }
      }
    }

    // 3. Smooth joints along convex waist curves
    const verts = geom.convexVertices;
    for (let i = 0; i < verts.length; i++) {
      const v = verts[i];
      this.collidePuckWithCircle(p, v.x, v.y, 0, 0.94, isDemo);
    }

    // 4. Goal posts
    this.collidePuckWithCircle(p, GX1, WALL, 0, 0.9, isDemo);
    this.collidePuckWithCircle(p, GX2, WALL, 0, 0.9, isDemo);
    this.collidePuckWithCircle(p, GX1, this.H - WALL, 0, 0.9, isDemo);
    this.collidePuckWithCircle(p, GX2, this.H - WALL, 0, 0.9, isDemo);

    // 5. Static obstacle bumpers
    for (let bIdx = 0; bIdx < bumpers.length; bIdx++) {
      const b = bumpers[bIdx];
      this.collidePuckWithCircle(p, b.x, b.y * this.H, b.r, 0.94, isDemo);
    }
  }

  private collidePuckWithPuck(a: PuckState, b: PuckState, isDemo: boolean): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const minD = PR * 2;
    if (d < minD && d > 0.001) {
      const nx = dx / d;
      const ny = dy / d;
      const overlap = (minD - d) * 0.5;
      a.x -= nx * overlap;
      a.y -= ny * overlap;
      b.x += nx * overlap;
      b.y += ny * overlap;

      const rvx = b.vx - a.vx;
      const rvy = b.vy - a.vy;
      const vn = rvx * nx + rvy * ny;
      
      if (vn < 0) {
        const restitution = 0.98; // Highly elastic for hard plastic
        const imp = -((1 + restitution) * vn) * 0.5; // Equal mass distribution
        a.vx -= imp * nx;
        a.vy -= imp * ny;
        b.vx += imp * nx;
        b.vy += imp * ny;
        a.spin = 0;
        b.spin = 0;
        if (!isDemo) {
          soundEngine.play('wall', Math.abs(vn), { maxV: this.getMaxPuckVelocity(false) });
        }
      }
    }
  }

  private physics(dt: number, isDemo: boolean): void {
    const maxV = this.getMaxPuckVelocity(isDemo);
    const subSteps = maxV * dt > PR * 0.45 ? 2 : 1;
    const stepDt = dt / subSteps;
    for (let step = 0; step < subSteps; step++) {
      this.physicsStep(stepDt, isDemo, maxV);
      if (this.screen !== 'game' && !isDemo) break;
      if (this.phase === 'goal' || this.phase === 'slowmo') break;
    }
  }

  private physicsStep(dt: number, isDemo: boolean, maxV: number): void {
    const p1Skin = this.getActiveMalletSkin(true);
    const p2Skin = this.getActiveMalletSkin(false);
    const hasOpponent = this.tutorialStep === 0 && (isDemo || MODES[this.modeId].opponent);
    const bumpers = this.getBumpers();
    const f = Math.pow(0.72, dt);
    const spinDecay = Math.exp(-1.4 * dt);

    // Step (a): Integrate active puck positions + Magnus curve acceleration
    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (!p.active) continue;
      if (Math.abs(p.spin) > 0.01) {
        const spPre = Math.hypot(p.vx, p.vy);
        if (spPre > 1) {
          const invSp = 1 / spPre;
          const latX = -p.vy * invSp;
          const latY = p.vx * invSp;
          const curveAccel = p.spin * 260;
          p.vx += latX * curveAccel * dt;
          p.vy += latY * curveAccel * dt;
        }
        p.spin *= spinDecay;
        if (Math.abs(p.spin) < 0.01) p.spin = 0;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= f;
      p.vy *= f;
    }

    // Step (b): Resolve Mallet-vs-Puck with wall-pinch tangential projection & anti-stall
    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (!p.active) continue;
      this.detectPuckWallContact(p);
      this.collideMalletWithPuck(this.me, true, p, p1Skin.p1, isDemo);
      if (this.tutorialStep === 3 && !p.active) return;
      if (hasOpponent) {
        this.detectPuckWallContact(p);
        this.collideMalletWithPuck(this.ai, false, p, p2Skin.p2, isDemo);
      }
    }

    // Step (c): Resolve Puck-vs-Walls, Rounded Corners, Goal Posts, and Bumpers AFTER mallet hits
    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (!p.active) continue;

      this.resolvePuckBoundsAndObstacles(p, bumpers, isDemo);

      const sp = Math.hypot(p.vx, p.vy);
      if (sp > maxV) {
        p.vx *= maxV / sp;
        p.vy *= maxV / sp;
      }
      p.spinAngle += dt * (sp * 0.01 + p.spin * 12);
      if (!isDemo && sp > this.maxPuckSpeed) {
        this.maxPuckSpeed = sp;
      }
    }

    // Puck-puck collisions when Double Puck is active, followed by wall/corner re-clamp
    let hadMultiPuck = false;
    for (let i = 0; i < this.pucks.length; i++) {
      if (!this.pucks[i].active) continue;
      for (let j = i + 1; j < this.pucks.length; j++) {
        if (!this.pucks[j].active) continue;
        hadMultiPuck = true;
        this.collidePuckWithPuck(this.pucks[i], this.pucks[j], isDemo);
      }
    }
    if (hadMultiPuck) {
      for (let i = 0; i < this.pucks.length; i++) {
        if (this.pucks[i].active) {
          this.resolvePuckBoundsAndObstacles(this.pucks[i], bumpers, isDemo);
        }
      }
    }

    // Goal checks (iterate pucks; break after goal triggers)
    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (!p.active) continue;
      if (p.y < 0) {
        this.goal('p');
        break;
      } else if (p.y > this.H) {
        this.goal('a');
        break;
      }
    }
  }

  private selectTargetPuck(forTop: boolean): PuckState {
    let best = this.pucks[0];
    let bestScore = -Infinity;
    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (!p.active) continue;
      const distFactor = forTop ? this.H - p.y : p.y;
      const movingToward = forTop ? (p.vy < -20 ? 360 : 0) : p.vy > 20 ? 360 : 0;
      const score = distFactor + movingToward;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  private aiThinkTop(dt: number, diff: Difficulty, personalityId: PersonalityId): void {
    const targetPuck = this.selectTargetPuck(true);
    let resolvedPersonality: PersonalityId = personalityId;
    if (this.stagePersonality === 'adaptive_grandmaster') {
      resolvedPersonality = this.score.a > this.score.p ? 'defender' : 'attacker';
    } else if (this.stagePersonality === 'adaptive_eternal') {
      resolvedPersonality =
        this.score.a > this.score.p
          ? 'defender'
          : this.score.a < this.score.p
            ? 'attacker'
            : 'trickster';
    } else if (this.stagePersonality === 'adaptive_stadium') {
      resolvedPersonality = this.score.a >= this.score.p ? 'trickster' : 'attacker';
    } else if (this.stagePersonality === 'adaptive_architect') {
      resolvedPersonality = this.score.a >= this.score.p ? 'defender' : 'trickster';
    } else if (this.stagePersonality === 'adaptive_immortal') {
      if (targetPuck.vy < -280 && targetPuck.y < this.H * 0.55) {
        resolvedPersonality = 'defender';
      } else if (targetPuck.x < 110 || targetPuck.x > W - 110 || this.score.a > this.score.p) {
        resolvedPersonality = 'trickster';
      } else {
        resolvedPersonality = 'attacker';
      }
    }
    const D = DIFFICULTY_CONFIG[diff];
    const P = PERSONALITIES[resolvedPersonality];

    const attackLine = this.H / 2 + 10 + (P.attackBias - 1) * 110;
    const minApproachVy = P.aimStyle === 'aggressive' ? -450 : -320;
    let tx: number;
    let ty: number;

    if (targetPuck.y < attackLine && targetPuck.vy > minApproachVy) {
      this.topBrain.aimT -= dt;
      if (this.topBrain.aimT <= 0) {
        this.topBrain.aim = (Math.random() * 2 - 1) * D.spread * P.spread;
        this.topBrain.feintSign = Math.random() < 0.5 ? -1 : 1;
        this.topBrain.aimT = P.aimStyle === 'bank' ? 0.35 : 0.45;
      }

      let ax = W / 2 + this.topBrain.aim;
      let ay = this.H + 40;
      if (P.aimStyle === 'bank') {
        ax = this.topBrain.feintSign > 0 ? WALL + PR : W - WALL - PR;
        ay = this.H * 0.72 + this.topBrain.aim * 0.4;
      } else if (P.aimStyle === 'aggressive') {
        ax = clamp(W / 2 + this.topBrain.aim * 0.5, GX1 + 20, GX2 - 20);
      } else if (P.aimStyle === 'clear') {
        ax = targetPuck.x < W / 2 ? W - 40 : 40;
        ay = this.H * 0.82;
      }

      let dx = ax - targetPuck.x;
      let dy = ay - targetPuck.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;

      const vx = targetPuck.x - this.ai.x;
      const vy = targetPuck.y - this.ai.y;
      const t = vx * dx + vy * dy;
      const lat = Math.abs(vx * dy - vy * dx);

      if (t > 20 && lat < 30) {
        tx = targetPuck.x + dx * 60;
        ty = targetPuck.y + dy * 60;
      } else {
        tx = targetPuck.x - dx * (MR + PR + 34);
        ty = targetPuck.y - dy * (MR + PR + 34);
      }
    } else {
      const defY = P.defY;
      let px = W / 2 + (targetPuck.x - W / 2) * 0.5;
      if (targetPuck.vy < -40) {
        const tt = (targetPuck.y - defY) / -targetPuck.vy;
        px = targetPuck.x + targetPuck.vx * tt;
        const L = WALL + PR;
        const span = W - 2 * L;
        let q = (px - L) % (2 * span);
        if (q < 0) q += 2 * span;
        px = L + (q > span ? 2 * span - q : q);
      }
      this.topBrain.trackX += (px - this.topBrain.trackX) * Math.min(1, dt * D.track * P.trackSpeed);
      tx = this.topBrain.trackX;
      ty = defY;
    }

    const aiSpeed = D.speed * (P.aimStyle === 'aggressive' ? 1.08 : 1);
    this.moveMallet(this.ai, tx, ty, aiSpeed, dt, false);
  }

  private aiThinkBottom(dt: number, diff: Difficulty): void {
    const D = DIFFICULTY_CONFIG[diff];
    const targetPuck = this.selectTargetPuck(false);
    let tx: number;
    let ty: number;

    if (targetPuck.y > this.H / 2 - 10 && targetPuck.vy < 320) {
      this.botBrain.aimT -= dt;
      if (this.botBrain.aimT <= 0) {
        this.botBrain.aim = (Math.random() * 2 - 1) * D.spread;
        this.botBrain.aimT = 0.45;
      }
      const ax = W / 2 + this.botBrain.aim;
      const ay = -40;
      let dx = ax - targetPuck.x;
      let dy = ay - targetPuck.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len;
      dy /= len;

      const vx = targetPuck.x - this.me.x;
      const vy = targetPuck.y - this.me.y;
      const t = vx * dx + vy * dy;
      const lat = Math.abs(vx * dy - vy * dx);

      if (t > 20 && lat < 30) {
        tx = targetPuck.x + dx * 60;
        ty = targetPuck.y + dy * 60;
      } else {
        tx = targetPuck.x - dx * (MR + PR + 34);
        ty = targetPuck.y - dy * (MR + PR + 34);
      }
    } else {
      const defY = this.H - 96;
      let px = W / 2 + (targetPuck.x - W / 2) * 0.5;
      if (targetPuck.vy > 40) {
        const tt = (defY - targetPuck.y) / targetPuck.vy;
        px = targetPuck.x + targetPuck.vx * tt;
        const L = WALL + PR;
        const span = W - 2 * L;
        let q = (px - L) % (2 * span);
        if (q < 0) q += 2 * span;
        px = L + (q > span ? 2 * span - q : q);
      }
      this.botBrain.trackX += (px - this.botBrain.trackX) * Math.min(1, dt * D.track);
      tx = this.botBrain.trackX;
      ty = defY;
    }

    this.moveMallet(this.me, tx, ty, D.speed, dt, true);
  }

  private applyKeyboardTargets(dt: number): void {
    const keySpeed = 760;
    const allowFullTable = !MODES[this.modeId].opponent;

    if (this.pidP === null) {
      let mx = 0;
      let my = 0;
      if (this.keys.has('ArrowLeft') || (this.opponentType === 'ai' && this.keys.has('KeyA'))) mx -= 1;
      if (this.keys.has('ArrowRight') || (this.opponentType === 'ai' && this.keys.has('KeyD'))) mx += 1;
      if (this.keys.has('ArrowUp') || (this.opponentType === 'ai' && this.keys.has('KeyW'))) my -= 1;
      if (this.keys.has('ArrowDown') || (this.opponentType === 'ai' && this.keys.has('KeyS'))) my += 1;
      if (mx !== 0 || my !== 0) {
        const len = Math.hypot(mx, my);
        const clamped = this.tableGeometry.clampMalletPosition(
          this.me.tx + (mx / len) * keySpeed * dt,
          this.me.ty + (my / len) * keySpeed * dt,
          this.getMalletRadius(true),
          false,
          allowFullTable
        );
        this.me.tx = clamped.x;
        this.me.ty = clamped.y;
      }
    }
    if (this.opponentType === 'two' && MODES[this.modeId].opponent && this.pidA === null) {
      let ax = 0;
      let ay = 0;
      if (this.keys.has('KeyA')) ax -= 1;
      if (this.keys.has('KeyD')) ax += 1;
      if (this.keys.has('KeyW')) ay -= 1;
      if (this.keys.has('KeyS')) ay += 1;
      if (ax !== 0 || ay !== 0) {
        const len = Math.hypot(ax, ay);
        const clamped = this.tableGeometry.clampMalletPosition(
          this.ai.tx + (ax / len) * keySpeed * dt,
          this.ai.ty + (ay / len) * keySpeed * dt,
          this.getMalletRadius(false),
          true,
          false
        );
        this.ai.tx = clamped.x;
        this.ai.ty = clamped.y;
      }
    }
  }

  private recordRingFrame(): void {
    const base = this.ringHead * 6;
    const p0 = this.pucks[0];
    this.ringBuf[base] = p0.x;
    this.ringBuf[base + 1] = p0.y;
    this.ringBuf[base + 2] = this.me.x;
    this.ringBuf[base + 3] = this.me.y;
    this.ringBuf[base + 4] = this.ai.x;
    this.ringBuf[base + 5] = this.ai.y;
    this.ringHead = (this.ringHead + 1) % RING_BUFFER_SIZE;
  }

  private updateDemo(dt: number): void {
    this.aiThinkBottom(dt, 'medium');
    this.aiThinkTop(dt, 'medium', 'balanced');
    this.physics(dt, true);
    const p0 = this.pucks[0];
    if (p0.active && Math.hypot(p0.vx, p0.vy) < 45) {
      p0.vx += (Math.random() - 0.5) * 260;
      p0.vy += (p0.y < this.H / 2 ? 1 : -1) * 220;
    }
  }

  private updateGame(dt: number): void {
    const modeCfg = MODES[this.modeId];
    const hasOpponent = this.tutorialStep === 0 && modeCfg.opponent;

    if (this.tutorialStep > 0) {
      this.tutorialAnimT += dt;
      if (this.tutorialStep === 3) {
        this.tutorialStep3Timer += dt;
        if (this.tutorialStep3Timer >= 5.0) {
          this.finishTutorial(false);
          return;
        }
      }
    }

    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
    } else if (this.phase === 'slowmo') {
      const scaledDt = dt * 0.3;
      this.applyKeyboardTargets(scaledDt);
      this.moveMallet(this.me, this.me.tx, this.me.ty, 2600, scaledDt, true);
      if (hasOpponent) {
        if (this.opponentType === 'two') {
          this.moveMallet(this.ai, this.ai.tx, this.ai.ty, 2600, scaledDt, false);
        } else {
          this.aiThinkTop(scaledDt, this.diffKey, this.personality);
        }
      }
      // Drift pucks slightly inside goal during slowmo
      for (const p of this.pucks) {
        if (p.active) {
          p.x += p.vx * scaledDt;
          p.y += p.vy * scaledDt;
        }
      }
      const elapsedRatio = 1 - clamp(this.phaseT / this.slowMoDuration, 0, 1);
      this.cameraZoom = 1 + Math.sin(elapsedRatio * Math.PI * 0.7) * 0.32;
      this.phaseT -= dt;
      if (this.phaseT <= 0) {
        this.cameraZoom = 1;
        this.cameraFocusY = 0.5;
        if (this.slowMoWillEnd) {
          this.endGame();
        } else {
          this.serve();
        }
      }
    } else if (this.phase === 'play') {
      if (this.tutorialStep === 0) {
        this.matchElapsed += dt;
        if (this.timeRemaining !== null && !this.suddenDeathOvertime) {
          this.timeRemaining = Math.max(0, this.timeRemaining - dt);
          if (this.timeRemaining <= 0) {
            if (this.score.p !== this.score.a) {
              this.endGame();
              return;
            }
            // Tie enters sudden death overtime
            this.suddenDeathOvertime = true;
            this.emitHud();
          }
        }
      }

      this.applyKeyboardTargets(dt);
      this.moveMallet(this.me, this.me.tx, this.me.ty, 2600, dt, true);
      if (hasOpponent) {
        if (this.opponentType === 'two') {
          this.moveMallet(this.ai, this.ai.tx, this.ai.ty, 2600, dt, false);
        } else {
          this.aiThinkTop(dt, this.diffKey, this.personality);
        }
      }

      this.physics(dt, false);
      if (this.tutorialStep === 0) {
        this.updatePowerups(dt);
        this.recordRingFrame();

        this.hudSyncTimer += dt;
        if (this.hudSyncTimer >= 0.25) {
          this.hudSyncTimer = 0;
          this.emitHud();
        }
      }
    } else {
      this.applyKeyboardTargets(dt);
      this.moveMallet(this.me, this.me.tx, this.me.ty, 2600, dt, true);
      if (hasOpponent) {
        if (this.opponentType === 'two') {
          this.moveMallet(this.ai, this.ai.tx, this.ai.ty, 2600, dt, false);
        } else {
          this.moveMallet(this.ai, W / 2, 120, 900, dt, false);
        }
      }
      this.phaseT -= dt;
      if (this.phase === 'ready') {
        const c = Math.ceil(this.phaseT);
        if (c !== this.cd) {
          this.cd = c;
          if (c > 0 && modeCfg.winCondition !== 'practice') {
            soundEngine.beep(440, 0.08, 'sine', 0.1);
          }
        }
      }
      if (this.phaseT <= 0) {
        if (this.phase === 'goal') {
          if (this.slowMoWillEnd) {
            this.endGame();
          } else {
            this.serve();
          }
        } else {
          this.phase = 'play';
          if (modeCfg.winCondition !== 'practice') {
            soundEngine.beep(880, 0.14, 'sine', 0.14);
          }
        }
      }
    }

    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
    }

    if (this.impactFlash.active) {
      this.impactFlash.r += 260 * dt;
      this.impactFlash.alpha -= 4.8 * dt;
      if (this.impactFlash.alpha <= 0 || this.impactFlash.r >= this.impactFlash.maxR) {
        this.impactFlash.active = false;
      }
    }

    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      if (!pt.active) continue;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.vy *= 0.94;
      pt.alpha -= 2.1 * dt;
      if (pt.alpha <= 0) pt.active = false;
    }

    for (let i = 0; i < this.ripples.length; i++) {
      const rp = this.ripples[i];
      if (!rp.active) continue;
      rp.r += 160 * dt;
      rp.alpha -= 1.8 * dt;
      if (rp.alpha <= 0 || rp.r >= rp.maxR) {
        rp.active = false;
      }
    }
  }

  private emitHud(): void {
    this.callbacks.onHudUpdate({
      score: { ...this.score },
      timeRemaining: this.timeRemaining,
      suddenDeathOvertime: this.suddenDeathOvertime,
      continuesUsed: this.continuesUsed,
      practiceHits: this.matchHits,
      practiceBestRally: this.longestRally,
      practiceCurrentRally: this.currentRally,
    });
  }

  private circle(x: number, y: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private drawMallet(m: Mallet, isMe: boolean, color: string, dark: string): void {
    const ctx = this.ctx;
    const malletSkin = this.getActiveMalletSkin(isMe);
    const lightSurface = isLightSurface(this.getActiveTableSkin().surface);
    const mr = this.getMalletRadius(isMe);
    const frozen = isMe ? this.powerupEffects.freezeP : this.powerupEffects.freezeA;

    if (this.effectiveQuality() !== 'low') {
      ctx.fillStyle = lightSurface ? malletSkin.shadow : 'rgba(0, 0, 0, 0.42)';
      this.circle(m.x + 3, m.y + 7, mr);
    }

    ctx.save();
    if (malletSkin.glow && this.effectiveQuality() === 'high' && !this.isReducedMotion()) {
      ctx.shadowColor = malletSkin.glow;
      ctx.shadowBlur = 14;
    }
    ctx.fillStyle = color;
    this.circle(m.x, m.y, mr);
    ctx.restore();

    if (malletSkin.pattern) {
      ctx.save();
      ctx.translate(m.x, m.y);
      drawMalletPattern(ctx, malletSkin.pattern, malletSkin.accent ?? malletSkin.ring, mr);
      ctx.restore();
    }

    // High-contrast outer rim derived from table surface luminance
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = lightSurface ? 'rgba(16, 25, 34, 0.28)' : 'rgba(255, 255, 255, 0.24)';
    ctx.beginPath();
    ctx.arc(m.x, m.y, mr - 0.75, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 3;
    ctx.strokeStyle = frozen ? '#38bdf8' : malletSkin.ring;
    ctx.beginPath();
    ctx.arc(m.x, m.y, mr * 0.74, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = dark;
    this.circle(m.x, m.y, mr * 0.44);

    ctx.fillStyle = malletSkin.gloss;
    this.circle(m.x - 5, m.y - 6, mr * 0.14);

    if (frozen) {
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
      ctx.beginPath();
      ctx.arc(m.x, m.y, mr + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  private drawPuck(p: PuckState): void {
    const ctx = this.ctx;
    const puckSkin = this.getActivePuckSkin();
    const lightSurface = isLightSurface(this.getActiveTableSkin().surface);
    const tier = this.effectiveQuality();

    ctx.save();
    if (puckSkin.glow && tier === 'high' && !this.isReducedMotion()) {
      ctx.shadowColor = puckSkin.glow;
      ctx.shadowBlur = 14;
    }

    if (tier !== 'low') {
      ctx.fillStyle = lightSurface ? 'rgba(16, 25, 34, 0.28)' : 'rgba(0, 0, 0, 0.45)';
      this.circle(p.x + 2, p.y + 5, PR);
    }

    ctx.fillStyle = puckSkin.body;
    this.circle(p.x, p.y, PR);
    ctx.restore();

    // Adaptive outer contrast rim so light/dark pucks stay distinct on every table skin
    ctx.lineWidth = 1.4;
    ctx.strokeStyle = lightSurface ? 'rgba(16, 25, 34, 0.34)' : 'rgba(255, 255, 255, 0.26)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, PR - 0.7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = puckSkin.ring;
    ctx.beginPath();
    ctx.arc(p.x, p.y, PR - 5, 0, Math.PI * 2);
    ctx.stroke();

    if (puckSkin.emblem) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(this.isReducedMotion() ? 0 : p.spinAngle);
      drawPuckEmblem(ctx, puckSkin.emblem, puckSkin.ring, puckSkin.body);
      ctx.restore();
    }

    // Dynamic curve spin rim arcs when spin is noticeable
    if (Math.abs(p.spin) > 0.25 && !this.isReducedMotion()) {
      const spinIntensity = clamp((Math.abs(p.spin) - 0.25) / 0.75, 0.2, 1);
      ctx.save();
      ctx.globalAlpha = 0.55 * spinIntensity;
      ctx.strokeStyle = puckSkin.ring;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(p.x, p.y, PR + 3.5, p.spinAngle, p.spinAngle + Math.PI * 0.55);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(
        p.x,
        p.y,
        PR + 3.5,
        p.spinAngle + Math.PI,
        p.spinAngle + Math.PI * 1.55
      );
      ctx.stroke();
      ctx.restore();
    }

    ctx.fillStyle = puckSkin.gloss;
    this.circle(p.x - 6, p.y - 7, 3.5);
  }

  private drawPowerupBubble(tp: TablePowerup): void {
    const ctx = this.ctx;
    const def = POWERUPS[tp.id];
    const pulse = this.isReducedMotion() ? 1 : 1 + Math.sin(tp.age * 5) * 0.08;
    const r = POWERUP_RADIUS * pulse;

    ctx.save();
    ctx.fillStyle = 'rgba(16, 25, 34, 0.78)';
    this.circle(tp.x, tp.y, r);

    ctx.lineWidth = 3;
    ctx.strokeStyle = def.color;
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Remaining despawn arc
    const frac = clamp(tp.ttl / 6, 0, 1);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath();
    ctx.arc(tp.x, tp.y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `800 10px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.shortLabel, tp.x, tp.y + 0.5);
    ctx.restore();
  }

  private drawActiveEffectsIndicators(): void {
    if (this.activePowerups.length === 0) return;
    const ctx = this.ctx;
    let pOffset = 0;
    let aOffset = 0;

    for (let i = 0; i < this.activePowerups.length; i++) {
      const eff = this.activePowerups[i];
      const def = POWERUPS[eff.id];
      const isP = eff.collector === 'p';
      const y = isP ? this.H - 28 - pOffset * 26 : 28 + aOffset * 26;
      if (isP) pOffset += 1;
      else aOffset += 1;

      const x = W - 20;
      ctx.save();
      ctx.fillStyle = 'rgba(16, 25, 34, 0.78)';
      ctx.beginPath();
      this.rr(ctx, x - 64, y - 10, 64, 20, 6);
      ctx.fill();

      ctx.strokeStyle = def.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = def.color;
      ctx.font = `800 10px ${FONT_FAMILY}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(def.shortLabel, x - 57, y + 0.5);

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.ceil(eff.remaining)}s`, x - 7, y + 0.5);
      ctx.restore();
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    const tableSkin = this.getActiveTableSkin();
    const puckSkin = this.getActivePuckSkin();
    const p1MalletSkin = this.getActiveMalletSkin(true);
    const p2MalletSkin = this.getActiveMalletSkin(false);
    const tier = this.effectiveQuality();
    const hasOpponent = this.tutorialStep === 0 && (this.screen === 'home' || MODES[this.modeId].opponent);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = OUTER_BG;
    ctx.fillRect(0, 0, this.cw, this.ch);

    if (!this.bg || !this.clipPath) return;

    const shakeAmp = this.shakeT > 0 ? Math.min(7, (this.shakeT / 0.28) * 7) : 0;
    const shakeX = shakeAmp > 0 ? (Math.random() * 2 - 1) * shakeAmp : 0;
    const shakeY = shakeAmp > 0 ? (Math.random() * 2 - 1) * shakeAmp : 0;

    ctx.save();
    ctx.translate(this.offX + shakeX, this.offY + shakeY);
    ctx.scale(this.scale, this.scale);

    // Optional slow-mo camera zoom toward scored goal
    if (this.cameraZoom > 1.001) {
      const fx = W / 2;
      const fy = this.H * this.cameraFocusY;
      ctx.translate(fx, fy);
      ctx.scale(this.cameraZoom, this.cameraZoom);
      ctx.translate(-fx, -fy);
    }

    ctx.clip(this.clipPath);
    ctx.drawImage(this.bg, 0, 0, W, this.H);

    // On-ice score numerals (hidden on Home demo, Practice mode & Tutorial)
    if (
      this.screen !== 'home' &&
      this.tutorialStep === 0 &&
      MODES[this.modeId].winCondition !== 'practice'
    ) {
      ctx.font = `800 76px ${FONT_FAMILY}`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = tableSkin.p2Score;
      ctx.fillText(String(this.score.a), 48, this.H / 2 - 20);
      ctx.fillStyle = tableSkin.p1Score;
      ctx.fillText(String(this.score.p), 48, this.H / 2 + 78);
    }

    if (this.tablePowerup && this.screen === 'game' && this.tutorialStep === 0) {
      this.drawPowerupBubble(this.tablePowerup);
    }

    // Tutorial canvas overlays (aim guides, target rings, ghost swipe cues)
    if (this.screen === 'game' && this.tutorialStep > 0) {
      this.drawTutorialGuides(ctx);
    }

    // Impact ripples
    for (let i = 0; i < this.ripples.length; i++) {
      const rp = this.ripples[i];
      if (!rp.active) continue;
      ctx.save();
      ctx.globalAlpha = clamp(rp.alpha, 0, 1);
      ctx.strokeStyle = rp.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // High-speed impact flash ring
    if (this.impactFlash.active) {
      ctx.save();
      ctx.globalAlpha = clamp(this.impactFlash.alpha, 0, 1);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.impactFlash.x, this.impactFlash.y, this.impactFlash.r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Particles
    for (let i = 0; i < this.particles.length; i++) {
      const pt = this.particles[i];
      if (!pt.active) continue;
      ctx.save();
      ctx.globalAlpha = clamp(pt.alpha, 0, 1);
      ctx.fillStyle = pt.color;
      this.circle(pt.x, pt.y, pt.r);
      ctx.restore();
    }

    // Puck trails + active pucks
    const showTrail =
      this.settings.puckTrail &&
      tier !== 'low' &&
      (this.screen === 'game' || this.screen === 'home');

    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (!p.active) continue;

      if (showTrail) {
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 250) {
          const hasCurve = Math.abs(p.spin) > 0.25;
          const invSp = 1 / sp;
          const latX = -p.vy * invSp;
          const latY = p.vx * invSp;
          for (let j = 0; j < p.trail.length; j++) {
            const f = j / p.trail.length;
            const bow = hasCurve ? (1 - f) * p.spin * 11 : 0;
            const alpha = (f * clamp(sp / BASE_MAXV, 0, 1) * (hasCurve ? 0.36 : 0.3)).toFixed(3);
            ctx.fillStyle = `rgba(${puckSkin.trailRgb}, ${alpha})`;
            this.circle(
              p.trail[j].x + latX * bow,
              p.trail[j].y + latY * bow,
              PR * (0.45 + 0.5 * f)
            );
          }
        }
      }

      this.drawPuck(p);
    }

    if (hasOpponent) {
      this.drawMallet(this.ai, false, p2MalletSkin.p2, p2MalletSkin.p2dark);
    }
    this.drawMallet(this.me, true, p1MalletSkin.p1, p1MalletSkin.p1dark);

    if (this.screen === 'game' && this.tutorialStep === 0) {
      this.drawActiveEffectsIndicators();
    }

    if (this.screen === 'game' && (this.phase === 'goal' || this.phase === 'slowmo')) {
      ctx.textAlign = 'center';
      ctx.font = `800 38px ${FONT_FAMILY}`;
      ctx.fillStyle = this.lastScorer === 'p' ? tableSkin.p1Banner : tableSkin.p2Banner;
      const who =
        this.opponentType === 'two'
          ? this.lastScorer === 'p'
            ? 'Red scores'
            : 'Blue scores'
          : this.lastScorer === 'p'
            ? 'You scored'
            : 'They scored';
      ctx.fillText(who, W / 2, this.H / 2 + 14);
    }

    if (this.screen === 'game' && this.phase === 'ready') {
      ctx.textAlign = 'center';
      ctx.font = `800 116px ${FONT_FAMILY}`;
      ctx.fillStyle = tableSkin.countdown;
      ctx.fillText(String(Math.max(1, Math.ceil(this.phaseT))), W / 2, this.H / 2 + 40);
    }

    ctx.restore();
  }

  private drawTutorialGuides(ctx: CanvasRenderingContext2D): void {
    const p0 = this.pucks[0];
    const pulse = this.isReducedMotion() ? 1 : 1 + Math.sin(this.tutorialAnimT * 4.5) * 0.14;

    if (this.tutorialStep === 1 && p0.active) {
      // Glowing target ring around center puck
      ctx.save();
      ctx.strokeStyle = '#f0452d';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, (PR + 12) * pulse, 0, Math.PI * 2);
      ctx.stroke();

      // Ghost hand drag cue in bottom half
      const t = (this.tutorialAnimT % 1.6) / 1.6;
      const ease = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      const gx = W * 0.5 + (t - 0.5) * 26;
      const gy = this.H * 0.78 - ease * 88;
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = '#101922';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(W * 0.5, this.H * 0.78);
      ctx.lineTo(W * 0.5, this.H * 0.56);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#f0452d';
      ctx.beginPath();
      ctx.arc(gx, gy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (this.tutorialStep === 2) {
      // Bank shot dotted aim path: puck -> left wall -> top goal
      const bankX = WALL + PR;
      const bankY = this.H * 0.3;
      ctx.save();
      ctx.strokeStyle = '#2459d6';
      ctx.lineWidth = 3;
      ctx.setLineDash([7, 7]);
      ctx.globalAlpha = 0.72;
      ctx.beginPath();
      ctx.moveTo(78, this.H * 0.58);
      ctx.lineTo(bankX, bankY);
      ctx.lineTo(W / 2, WALL + 6);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#2459d6';
      ctx.beginPath();
      ctx.arc(bankX, bankY, 7 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    if (this.tutorialStep === 3 && p0.active) {
      // Sideways curve swipe cue across puck
      const sweep = Math.sin(this.tutorialAnimT * 3.8) * 58;
      ctx.save();
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.78;
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, PR + 18, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();

      ctx.fillStyle = '#0d9488';
      ctx.beginPath();
      ctx.arc(p0.x + sweep, p0.y + 38, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private evaluateAutoQuality(rawDt: number): void {
    if (this.settings.quality !== 'auto' || this.qualityLockedForSession) return;
    if (this.screen !== 'game') return;

    this.qualityProbeTime += rawDt;
    this.qualityProbeFrames += 1;

    if (this.qualityProbeTime >= 3.0) {
      const avgMs = (this.qualityProbeTime * 1000) / Math.max(1, this.qualityProbeFrames);
      if (avgMs > 22) {
        if (this.qualityTier === 'high') {
          this.qualityTier = 'medium';
          this.resize();
          this.callbacks.onQualityChange?.('medium');
        } else if (this.qualityTier === 'medium') {
          this.qualityTier = 'low';
          this.resize();
          this.callbacks.onQualityChange?.('low');
        }
      }
      this.qualityLockedForSession = true;
    }
  }

  private frame = (t: number): void => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.frame);

    // Battery & thermal 60 FPS cap when enabled (16.3ms threshold prevents 60Hz jitter drops)
    if (this.settings.fpsCap === 60 && t - this.lastFrameStepTime < 16.3) {
      return;
    }
    this.lastFrameStepTime = t;

    const rawDt = Math.max(0, (t - this.lastTime) / 1000);
    const dtF = Math.min(0.05, rawDt);
    this.lastTime = t;

    this.evaluateAutoQuality(Math.min(0.25, rawDt));

    if (this.settings.showFps && this.callbacks.onFpsChange) {
      this.fpsFrames += 1;
      const elapsed = t - this.fpsLastReport;
      if (elapsed >= 250) {
        this.callbacks.onFpsChange(Math.round((this.fpsFrames * 1000) / elapsed));
        this.fpsFrames = 0;
        this.fpsLastReport = t;
      }
    }

    // Fixed-timestep 360Hz accumulator (>= 6 substeps/frame at 60Hz) prevents high-speed tunneling
    const FIXED_DT = 1 / 360;
    if ((this.screen === 'game' || this.screen === 'home') && dtF > 0) {
      this.acc = Math.min(0.05, this.acc + dtF);
      let steps = 0;
      if (this.screen === 'game') {
        while (this.acc >= FIXED_DT && steps < 20) {
          this.updateGame(FIXED_DT);
          this.acc -= FIXED_DT;
          steps += 1;
          if (this.screen !== 'game') break;
        }
      } else {
        while (this.acc >= FIXED_DT && steps < 20) {
          this.updateDemo(FIXED_DT);
          this.acc -= FIXED_DT;
          steps += 1;
        }
      }
    } else {
      this.acc = 0;
    }

    const recordTrail =
      ((this.screen === 'game' && (this.phase === 'play' || this.phase === 'slowmo')) ||
        this.screen === 'home') &&
      this.settings.puckTrail &&
      this.effectiveQuality() !== 'low';

    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (recordTrail && p.active) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 14) p.trail.shift();
      } else if (p.trail.length) {
        p.trail.length = 0;
      }
    }

    this.draw();
  };

  private getTouchOffset(): number {
    if (this.settings.malletOffset === 'off') return 0;
    if (this.settings.malletOffset === 'large') return 74;
    return 46;
  }

  private setPointerTarget(
    e: PointerEvent,
    m: Mallet,
    dir: number,
    anchor: DragAnchor | null
  ): void {
    const x = (e.clientX - this.offX) / this.scale;
    const y = (e.clientY - this.offY) / this.scale;

    if (this.settings.malletControl === 'relative' && anchor) {
      m.tx = anchor.mx + (x - anchor.px);
      m.ty = anchor.my + (y - anchor.py);
      return;
    }

    const offset = e.pointerType === 'touch' ? this.getTouchOffset() * dir : 0;
    m.tx = x;
    m.ty = y + offset;
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.screen !== 'game') return;
    const x = (e.clientX - this.offX) / this.scale;
    const y = (e.clientY - this.offY) / this.scale;
    const top =
      this.tutorialStep === 0 &&
      this.opponentType === 'two' &&
      MODES[this.modeId].opponent &&
      y < this.H / 2;

    if (top) {
      if (this.pidA !== null) return;
      this.pidA = e.pointerId;
      this.anchorA = { px: x, py: y, mx: this.ai.x, my: this.ai.y };
    } else {
      if (this.pidP !== null) return;
      this.pidP = e.pointerId;
      this.anchorP = { px: x, py: y, mx: this.me.x, my: this.me.y };
    }

    try {
      this.cv.setPointerCapture(e.pointerId);
    } catch {
      // Ignore synthetic pointer capture issues
    }

    soundEngine.init();
    if (top) {
      this.setPointerTarget(e, this.ai, 1, this.anchorA);
    } else {
      this.setPointerTarget(e, this.me, -1, this.anchorP);
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId === this.pidP) {
      this.setPointerTarget(e, this.me, -1, this.anchorP);
    } else if (e.pointerId === this.pidA) {
      this.setPointerTarget(e, this.ai, 1, this.anchorA);
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.pidP) {
      this.pidP = null;
      this.anchorP = null;
    }
    if (e.pointerId === this.pidA) {
      this.pidA = null;
      this.anchorA = null;
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if ((e.code === 'Escape' || e.code === 'KeyP') && this.screen === 'game') {
      this.callbacks.onAutoPause();
      return;
    }
    this.keys.add(e.code);
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onVisibilityChange = (): void => {
    if (document.hidden && this.screen === 'game') {
      this.callbacks.onAutoPause();
    }
  };

  private onBlur = (): void => {
    if (this.screen === 'game') {
      this.callbacks.onAutoPause();
    }
  };

  private onOrientationChange = (): void => {
    if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(this.scheduleResize, 120);
  };

  private preventDefault = (e: Event): void => {
    e.preventDefault();
  };

  private bindEvents(): void {
    this.cv.addEventListener('pointerdown', this.onPointerDown);
    this.cv.addEventListener('pointermove', this.onPointerMove);
    this.cv.addEventListener('pointerup', this.onPointerUp);
    this.cv.addEventListener('pointercancel', this.onPointerUp);
    this.cv.addEventListener('lostpointercapture', this.onPointerUp);
    document.addEventListener('contextmenu', this.preventDefault);
    document.addEventListener('gesturestart', this.preventDefault);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('resize', this.scheduleResize);
    window.addEventListener('orientationchange', this.onOrientationChange);
    window.visualViewport?.addEventListener('resize', this.scheduleResize);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.scheduleResize);
      this.resizeObserver.observe(this.cv.parentElement ?? this.cv);
    }
  }

  private unbindEvents(): void {
    this.cv.removeEventListener('pointerdown', this.onPointerDown);
    this.cv.removeEventListener('pointermove', this.onPointerMove);
    this.cv.removeEventListener('pointerup', this.onPointerUp);
    this.cv.removeEventListener('pointercancel', this.onPointerUp);
    this.cv.removeEventListener('lostpointercapture', this.onPointerUp);
    document.removeEventListener('contextmenu', this.preventDefault);
    document.removeEventListener('gesturestart', this.preventDefault);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.scheduleResize);
    window.removeEventListener('orientationchange', this.onOrientationChange);
    window.visualViewport?.removeEventListener('resize', this.scheduleResize);
  }
}
