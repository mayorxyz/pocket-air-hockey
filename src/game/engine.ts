/**
 * AirHockeyEngine.ts
 *
 * MAP (search for the "##" tags to jump):
 *  ## TUNING      all feel/physics constants (edit here first)
 *  ## TYPES       local interfaces
 *  ## LIFECYCLE   constructor, startMatch, startTutorial, destroy, helpers
 *  ## LAYOUT      resize, background cache, table geometry
 *  ## POWERUPS    spawn / collect / update / magnet / portals
 *  ## PHYSICS     bounce(), mallet-puck, walls, puck-puck, physicsStep
 *  ## AI          aiThinkTop / aiThinkBottom (target only, runs at 120Hz)
 *  ## LOOP        updateGame, updateDemo, frame (fixed 360Hz timestep)
 *  ## RENDER      mallets, pucks, overlays, draw()
 *  ## INPUT       pointer / keyboard / visibility
 *
 * FIX-NEXT hints are marked "FIXME-HINT".
 */
import { soundEngine } from './audio';
import { MODES, OBSTACLE_LAYOUTS, PERSONALITIES, POWERUPS, PowerupEffectsState, PowerupId } from './registries';
import { getMalletSkin, getPuckSkin, getTableSkin, isLightSurface, resolveTableSkin, TableSkin } from './skins';
import { drawPuckEmblem } from './puckEmblems';
import { drawPuckDesign, hasPuckDesign } from './puckDesigns';
import { drawMalletPattern } from './malletPatterns';
import { drawMalletDesign, hasMalletDesign } from './malletDesigns';
import { buildTableGeometry, isAngleInArc, TableGeometry, tracePolygonPath, WallSegment } from './tableGeometry';
import { drawTablePattern } from './tablePatterns';
import {
  DEFAULT_SETTINGS, DIFFICULTY_CONFIG, Difficulty, GameMode, GamePhase, GameSettings, MatchResult,
  ModeId, ObstacleBumper, PersonalityId, PuckState, Scorer, Score, Screen, StageConfig, StagePersonalityId,
} from './types';

// ## TUNING ─────────────────────────────────────────────────────────────
// Table geometry (logical units; table is W wide, H tall and H adapts to screen)
const W = 400;
const WALL = 6;
const PR = 20; // puck radius
const MR = 34; // mallet radius
const GOAL_W = 150;
const GX1 = (W - GOAL_W) / 2;
const GX2 = GX1 + GOAL_W;
const WIDE_GOAL_MULT = 1.6;

// Puck motion
const BASE_MAXV = 1400;
const PUCK_FRICTION_PER_S = 0.72; // velocity multiplier per second (lower = more drag)
const SPIN_CURVE_ACCEL = 260; // Magnus-style sideways accel per unit spin
const SPIN_DECAY = 1.4; // spin exp decay per second

// Bounce feel (1 = perfectly elastic)
const WALL_RESTITUTION = 0.94;
const BUMPER_RESTITUTION = 0.94;
const POST_RESTITUTION = 0.9;
const PUCK_PUCK_RESTITUTION = 0.98;
const WALL_TANGENT_FRICTION = 0.03; // fraction of along-wall speed lost per bounce
const WALL_SPIN_KICK = 90; // spin -> along-wall speed on bounce (gives "english")
const WALL_SPIN_KEEP = 0.5; // spin multiplier after wall hit (negative flip applied)

// Mallet (kinematic: infinite mass, so puck gets (1+e)*mallet speed)
const MALLET_RESTITUTION = 0.75;
const MALLET_VEL_TAU = 0.012; // s, smoothing of mallet velocity used for hits (fixes 60Hz pointer vs 360Hz sim)
const MALLET_SPIN_GAIN = 0.2 / 300; // tangential swipe speed -> puck spin
const SEP_BIAS = 0.5; // extra px pushed out after contact, prevents sticking
const MIN_WALL_EJECT = 180; // min slide-out speed when pinched against a wall
const MALLET_MAX_SPEED = 2600; // px/s mallet can chase pointer

// Sim / perf
const FIXED_DT = 1 / 360;
const AI_EVERY = 3; // AI + powerups think every Nth step (120Hz)
const MAX_PUCKS = 5;
const MAX_PARTICLES = 24;
const POWERUP_RADIUS = 18;
const OUTER_BG = '#101922';
const FONT_FAMILY = '"Outfit", "Avenir Next", "Helvetica Neue", Arial, sans-serif';
const nextSpawn = (): number => 8 + Math.random() * 4;

const clamp = (v: number, min: number, max: number): number => (v < min ? min : v > max ? max : v);

// Resting values for every power-up flag (used to reset effects in one line)
const DEFAULT_FX: Omit<PowerupEffectsState, 'spawnExtraPucks' | 'clearExtraPucks'> = {
  malletScaleP: 1, malletScaleA: 1, puckSpeedMul: 1,
  freezeP: false, freezeA: false, goalShieldP: false, goalShieldA: false,
  wideGoalP: false, wideGoalA: false, fireballP: false, fireballA: false,
  curveShotP: false, curveShotA: false, ghostP: false, ghostA: false,
  magnetP: false, magnetA: false, slowZoneP: false, slowZoneA: false,
  portalsP: false, portalsA: false, doublePointsP: false, doublePointsA: false,
};

// Stage "adaptive" personalities fall back to a base personality for tuning lookups
const ADAPTIVE_BASE: Record<string, PersonalityId> = {
  adaptive_grandmaster: 'attacker', adaptive_immortal: 'attacker',
  adaptive_eternal: 'trickster', adaptive_stadium: 'trickster', adaptive_architect: 'defender',
};

// ## TYPES ──────────────────────────────────────────────────────────────
type QualityTier = 'high' | 'medium' | 'low';

interface Mallet {
  x: number; y: number;
  vx: number; vy: number; // instantaneous velocity (per step)
  svx: number; svy: number; // smoothed velocity, used for collisions
  tx: number; ty: number; // target position (pointer / AI)
}
interface Particle { active: boolean; x: number; y: number; vx: number; vy: number; r: number; alpha: number; color: string }
interface Ripple { active: boolean; x: number; y: number; r: number; maxR: number; alpha: number; color: string }
interface AiBrain { aim: number; aimT: number; trackX: number; feintSign: number }
interface DragAnchor { px: number; py: number; mx: number; my: number }
interface TablePowerup { id: PowerupId; x: number; y: number; ttl: number; age: number }
interface ActivePowerup { id: PowerupId; collector: Scorer; remaining: number; duration: number }

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

const newMallet = (): Mallet => ({ x: 0, y: 0, vx: 0, vy: 0, svx: 0, svy: 0, tx: 0, ty: 0 });

export class AirHockeyEngine {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private callbacks: EngineCallbacks;

  // Layout
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

  // Match state
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

  // Pucks (preallocated pool; index 0 is the primary puck)
  private pucks: PuckState[] = Array.from({ length: MAX_PUCKS }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, spin: 0, spinAngle: 0,
    pinchStepsP: 0, pinchStepsA: 0, lastHitter: null, trail: [],
  }));
  private wallContact = { hit: false, nx: 0, ny: 0 }; // scratch, inward wall normal near puck

  // Mallets, input, AI
  private me = newMallet();
  private ai = newMallet();
  private aiSpeed = 600; // set by aiThinkTop
  private botSpeed = 600; // set by aiThinkBottom (demo only)
  private pidP: number | null = null;
  private pidA: number | null = null;
  private anchorP: DragAnchor | null = null;
  private anchorA: DragAnchor | null = null;
  private topBrain: AiBrain = { aim: 0, aimT: 0, trackX: W / 2, feintSign: 1 };
  private botBrain: AiBrain = { aim: 0, aimT: 0, trackX: W / 2, feintSign: 1 };
  private keys = new Set<string>();
  private stepN = 0; // fixed-step counter for AI/powerup decimation

  // Visual pools
  private particles: Particle[] = Array.from({ length: MAX_PARTICLES }, () => ({
    active: false, x: 0, y: 0, vx: 0, vy: 0, r: 3, alpha: 0, color: '#ffffff',
  }));
  private ripples: Ripple[] = Array.from({ length: 10 }, () => ({
    active: false, x: 0, y: 0, r: 10, maxR: 44, alpha: 0, color: '#ffffff',
  }));
  private impactFlash = { active: false, x: 0, y: 0, r: 10, maxR: 58, alpha: 0 };
  private trailRgbKey = '';
  private trailStyleStr = '';

  // Power-ups
  private tablePowerup: TablePowerup | null = null;
  private activePowerups: ActivePowerup[] = [];
  private nextPowerupSpawnT = 9;
  private powerupEffects: PowerupEffectsState;
  private magnetHoldT = 0;
  private magnetPuckIdx = -1;
  private magnetOwner: Scorer = 'p';
  private portalCd = [0, 0, 0, 0, 0];

  // Telemetry
  private matchElapsed = 0;
  private matchHits = 0;
  private currentRally = 0;
  private longestRally = 0;
  private maxPuckSpeed = 0;
  private maxDeficit = 0;
  private powerupsCollected = 0;

  // Camera / juice
  private slowMoGoalY = 0;
  private slowMoWillEnd = false;
  private slowMoDuration = 1.2;
  private cameraZoom = 1;
  private cameraFocusY = 0.5;
  private shakeT = 0;
  private hitStopTimer = 0;
  private cd = 0;
  private systemReducedMotion = false;

  // Tutorial (0 = off)
  private tutorialStep: 0 | 1 | 2 | 3 = 0;
  private tutorialStep3Timer = 0;
  private tutorialAnimT = 0;

  // Auto quality
  private qualityTier: QualityTier = 'high';
  private qualityProbeTime = 0;
  private qualityProbeFrames = 0;
  private qualityLockedForSession = false;

  // Loop / resize bookkeeping
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

  // ## LIFECYCLE ─────────────────────────────────────────────────────────
  constructor(canvas: HTMLCanvasElement, initialSettings: GameSettings, callbacks: EngineCallbacks) {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not acquire 2D canvas context');
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
      ...DEFAULT_FX,
      spawnExtraPucks: (count: number) => { for (let i = 0; i < count; i++) this.spawnExtraPuck(); },
      clearExtraPucks: () => this.clearExtraPucks(),
    };
    this.qualityTier = this.settings.quality === 'low' ? 'low' : 'high';

    this.resize();
    this.setupDemoRally();
    this.bindEvents();
    this.lastTime = this.lastFrameStepTime = this.fpsLastReport = performance.now();
    this.rafId = requestAnimationFrame(this.frame);
  }

  private isReducedMotion(): boolean { return this.settings.reduceMotion || this.systemReducedMotion; }

  private effectiveQuality(): QualityTier {
    if (this.settings.quality === 'high') return 'high';
    if (this.settings.quality === 'low') return 'low';
    return this.qualityTier;
  }

  // Skin getters: tutorial always uses plain classic skins
  private getActiveTableSkin() {
    if (this.tutorialStep > 0) return getTableSkin('classic_ice');
    return resolveTableSkin(this.settings.tableSkin, this.activeStage?.skinOverride.table);
  }
  private getActivePuckSkin() {
    return this.tutorialStep > 0 ? getPuckSkin('classic') : getPuckSkin(this.settings.puckSkin);
  }
  private getActiveMalletSkin(isMe: boolean) {
    if (this.tutorialStep > 0) return getMalletSkin('classic');
    if (!isMe && this.activeStage) return getMalletSkin(this.activeStage.skinOverride.botMallet);
    return getMalletSkin(this.settings.malletSkin);
  }

  private getMaxPuckVelocity(isDemo: boolean): number {
    const fast = !isDemo && this.settings.puckSpeed === 'fast' ? 1.28 : 1;
    const stage = !isDemo && this.activeStage ? this.activeStage.puckSpeedMult : 1;
    return BASE_MAXV * fast * stage * this.powerupEffects.puckSpeedMul;
  }

  private effectiveWinScore(): number {
    return this.activeStage ? this.activeStage.winScore : this.settings.winScore;
  }

  private isAtMatchPoint(): boolean {
    if (!this.activeStage || this.activeStage.winCondition !== 'score') return false;
    const threshold = this.activeStage.doublePuckAtScore ?? this.effectiveWinScore() - 1;
    return this.score.p >= threshold || this.score.a >= threshold;
  }

  private shouldKeepSecondPuck(): boolean {
    const s = this.activeStage;
    return !!s && Boolean(s.alwaysDoublePuck || (s.matchPointDoublePuck && this.isAtMatchPoint()));
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
    const prev = this.screen;
    this.screen = nextScreen;
    if (nextScreen === 'home' && prev !== 'home') this.setupDemoRally();
    else if (nextScreen !== 'game') this.releaseInput();
    this.lastTime = performance.now();
    this.acc = 0;
    this.draw();
  }

  /** Shared reset for any new run (match, tutorial, demo). */
  private resetRun(): void {
    this.score = { p: 0, a: 0 };
    this.matchElapsed = this.matchHits = this.currentRally = this.longestRally = 0;
    this.maxPuckSpeed = this.maxDeficit = this.powerupsCollected = 0;
    this.suddenDeathOvertime = false;
    this.continuesUsed = 0;
    this.clearAllPowerups(true);
    this.resetCamera();
    this.hitStopTimer = 0;
    this.clearVisualPools();
    this.shakeT = 0;
    this.cd = 0;
    this.releaseInput();
    this.lastTime = this.lastFrameStepTime = performance.now();
    this.acc = 0;
  }

  private resetCamera(): void {
    this.cameraZoom = 1;
    this.cameraFocusY = 0.5;
    this.slowMoWillEnd = false;
  }

  private releaseInput(): void {
    this.pidP = this.pidA = null;
    this.anchorP = this.anchorA = null;
    this.keys.clear();
  }

  startMatch(opts: {
    modeId: ModeId; opponentType: GameMode; difficulty: Difficulty; personality: PersonalityId;
    obstacleLayoutId: string | null; timedSeconds: number; stageConfig?: StageConfig | null;
  }): void {
    this.tutorialStep = 0;
    this.tutorialStep3Timer = 0;
    const stage = opts.stageConfig ?? null;
    this.activeStage = stage;

    if (stage) {
      this.modeId = stage.winCondition === 'timed' ? 'timed'
        : stage.winCondition === 'sudden_death' ? 'sudden_death'
        : stage.obstacleLayoutId ? 'obstacles' : 'classic';
      this.opponentType = 'ai';
      this.diffKey = stage.difficulty;
      this.stagePersonality = stage.personality;
      this.personality = ADAPTIVE_BASE[stage.personality] ?? (stage.personality as PersonalityId);
      this.obstacleLayoutId = stage.obstacleLayoutId;
      this.timedLimit = stage.timeLimit ?? 90;
      this.timeRemaining = stage.winCondition === 'timed' ? this.timedLimit : null;
    } else {
      this.modeId = opts.modeId;
      this.opponentType = opts.opponentType;
      this.diffKey = opts.difficulty;
      this.personality = this.stagePersonality = opts.personality;
      const modeCfg = MODES[this.modeId];
      this.obstacleLayoutId = opts.obstacleLayoutId ?? modeCfg.obstacles;
      this.timedLimit = opts.timedSeconds;
      this.timeRemaining = modeCfg.winCondition === 'timed' ? this.timedLimit : null;
    }

    this.resetRun();
    this.nextPowerupSpawnT = nextSpawn();

    // Fresh auto-quality probe
    this.qualityProbeTime = this.qualityProbeFrames = 0;
    this.qualityLockedForSession = false;
    if (this.settings.quality === 'auto') this.qualityTier = 'high';

    this.buildBg();
    this.screen = 'game';
    this.home();
    this.placePrimaryPuck(this.H * 0.68);
    if (this.shouldKeepSecondPuck()) this.spawnExtraPuck();
    this.phase = 'ready';
    this.phaseT = MODES[this.modeId].winCondition === 'practice' ? 1.2 : 3;
    this.lastScorer = 'a';
    this.emitHud();
  }

  startTutorial(): void {
    this.activeStage = null;
    this.modeId = 'practice';
    this.opponentType = 'ai';
    this.obstacleLayoutId = null;
    this.timeRemaining = null;
    this.resetRun();
    this.tutorialStep = 1;
    this.tutorialStep3Timer = 0;
    this.tutorialAnimT = 0;
    this.buildBg();
    this.screen = 'game';
    this.home();
    this.placePrimaryPuck(this.H * 0.5);
    this.phase = 'play';
    this.callbacks.onTutorialStepChange?.(1);
    this.emitHud();
  }

  skipTutorial(): void {
    if (this.tutorialStep !== 0) this.finishTutorial(true);
  }

  private finishTutorial(skipped: boolean): void {
    this.tutorialStep = 0;
    this.tutorialStep3Timer = 0;
    this.hitStopTimer = 0;
    this.impactFlash.active = false;
    this.releaseInput();
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
    this.nextPowerupSpawnT = nextSpawn();
    this.resetCamera();
    this.home();
    this.placePrimaryPuck(this.H * 0.5);
    if (this.shouldKeepSecondPuck()) this.spawnExtraPuck();
    this.clearVisualPools();
    this.shakeT = 0;
    this.cd = 0;
    this.phase = 'ready';
    this.phaseT = 3;
    this.releaseInput();
    this.screen = 'game';
    this.lastTime = performance.now();
    this.acc = 0;
    this.emitHud();
  }

  resumeMatch(): void {
    this.screen = 'game';
    this.lastTime = this.lastFrameStepTime = performance.now();
    this.acc = 0;
  }

  destroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.rafId);
    if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
    if (this.resizeRaf !== null) cancelAnimationFrame(this.resizeRaf);
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

  /** Home-screen AI vs AI rally. */
  private setupDemoRally(): void {
    this.tutorialStep = 0;
    this.tutorialStep3Timer = 0;
    this.activeStage = null;
    this.stagePersonality = 'balanced';
    this.modeId = 'classic';
    this.obstacleLayoutId = null;
    this.timeRemaining = null;
    this.resetRun();
    this.buildBg();
    this.home();
    this.placePrimaryPuck(this.H * 0.5);
    this.kickDemoPuck(Math.random() < 0.5 ? -1 : 1, Math.random() < 0.5 ? -1 : 1, 180, 260);
    this.phase = 'play';
  }

  private kickDemoPuck(dirX: number, dirY: number, vx: number, vy: number): void {
    const p0 = this.pucks[0];
    p0.vx = dirX * (vx + Math.random() * 140);
    p0.vy = dirY * (vy + Math.random() * 140);
  }

  private getBumpers(): ObstacleBumper[] {
    return this.obstacleLayoutId ? OBSTACLE_LAYOUTS[this.obstacleLayoutId]?.bumpers ?? [] : [];
  }

  private home(): void {
    for (const [m, y] of [[this.me, this.H - 120], [this.ai, 120]] as const) {
      m.x = m.tx = W / 2;
      m.y = m.ty = y;
      m.vx = m.vy = m.svx = m.svy = 0;
    }
    this.topBrain.trackX = this.botBrain.trackX = W / 2;
  }

  private placePrimaryPuck(y: number, x = W / 2): void {
    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      p.active = i === 0;
      p.x = x; p.y = y; p.vx = p.vy = 0;
      p.spin = p.spinAngle = 0;
      p.pinchStepsP = p.pinchStepsA = 0;
      p.lastHitter = null;
      p.trail.length = 0;
    }
  }

  private spawnExtraPuck(): void {
    for (let i = 1; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (p.active) continue;
      p.active = true;
      p.x = W / 2 + (Math.random() < 0.5 ? -36 : 36);
      p.y = this.H / 2;
      p.vx = (Math.random() * 2 - 1) * 260;
      p.vy = (Math.random() < 0.5 ? -1 : 1) * 280;
      p.spin = p.spinAngle = 0;
      p.pinchStepsP = p.pinchStepsA = 0;
      p.lastHitter = this.pucks[0].lastHitter ?? 'p';
      p.trail.length = 0;
      return;
    }
  }

  private clearExtraPucks(forceAll = false): void {
    const start = forceAll || !this.shouldKeepSecondPuck() ? 1 : 2;
    for (let i = start; i < this.pucks.length; i++) {
      this.pucks[i].active = false;
      this.pucks[i].trail.length = 0;
    }
  }

  // ## LAYOUT ────────────────────────────────────────────────────────────
  private rr(p: CanvasRenderingContext2D | Path2D, x: number, y: number, w: number, h: number, r: number): void {
    p.moveTo(x + r, y);
    p.arcTo(x + w, y, x + w, y + h, r);
    p.arcTo(x + w, y + h, x, y + h, r);
    p.arcTo(x, y + h, x, y, r);
    p.arcTo(x, y, x + w, y, r);
    p.closePath();
  }

  /** Pre-renders the static table (surface, lines, bumpers, rails, goals) to an offscreen canvas. */
  private buildBg(): void {
    const k = Math.max(1, this.scale * this.dpr);
    const bg = document.createElement('canvas');
    bg.width = Math.ceil(W * k);
    bg.height = Math.ceil(this.H * k);
    const g = bg.getContext('2d');
    if (!g) return;

    const skin = this.getActiveTableSkin();
    this.tableGeometry = buildTableGeometry(skin.shape, W, this.H, GOAL_W, WALL);
    const outerPath = new Path2D();
    tracePolygonPath(outerPath, this.tableGeometry.polygonPoints);
    const light = isLightSurface(skin.surface);

    g.scale(k, k);
    g.save();
    g.clip(outerPath);

    g.fillStyle = skin.surface;
    g.fillRect(0, 0, W, this.H);
    const grad = g.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, skin.surfaceHighlight);
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0)');
    grad.addColorStop(1, skin.surfaceShadow);
    g.fillStyle = grad;
    g.fillRect(0, 0, W, this.H);
    drawTablePattern(g, skin as TableSkin, W, this.H);

    // Center line, circle, dot, and goal-crease arcs
    g.lineWidth = 3;
    g.strokeStyle = skin.lines;
    g.beginPath(); g.moveTo(0, this.H / 2); g.lineTo(W, this.H / 2); g.stroke();
    g.beginPath(); g.arc(W / 2, this.H / 2, 64, 0, Math.PI * 2); g.stroke();
    g.fillStyle = skin.lines;
    g.beginPath(); g.arc(W / 2, this.H / 2, 5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = skin.redZone;
    g.beginPath(); g.arc(W / 2, this.H, 112, Math.PI, Math.PI * 2); g.stroke();
    g.strokeStyle = skin.blueZone;
    g.beginPath(); g.arc(W / 2, 0, 112, 0, Math.PI); g.stroke();

    // Obstacle bumpers
    for (const b of this.getBumpers()) {
      const by = b.y * this.H;
      g.fillStyle = skin.bumper;
      g.beginPath(); g.arc(b.x, by, b.r, 0, Math.PI * 2); g.fill();
      g.lineWidth = 3;
      g.strokeStyle = skin.bumperRing;
      g.beginPath(); g.arc(b.x, by, Math.max(4, b.r - 4), 0, Math.PI * 2); g.stroke();
      g.lineWidth = 1.25;
      g.strokeStyle = light ? 'rgba(16, 25, 34, 0.35)' : 'rgba(255, 255, 255, 0.25)';
      g.beginPath(); g.arc(b.x, by, b.r, 0, Math.PI * 2); g.stroke();
    }

    // Rail + inner bevel
    g.lineWidth = WALL * 2;
    g.lineJoin = 'round';
    g.strokeStyle = skin.rail;
    g.stroke(outerPath);
    g.lineWidth = 1.75;
    g.strokeStyle = light ? 'rgba(16, 25, 34, 0.22)' : 'rgba(255, 255, 255, 0.24)';
    g.beginPath();
    tracePolygonPath(g, this.tableGeometry.innerPolygonPoints);
    g.stroke();

    // Goal slots (top = blue, bottom = red)
    const slots: Array<[number, string]> = [[-20, skin.blueZone], [this.H - WALL - 14, skin.redZone]];
    for (const [y, stroke] of slots) {
      g.fillStyle = skin.goalSlot;
      g.beginPath(); this.rr(g, GX1, y, GOAL_W, 20 + WALL + 14, 14); g.fill();
      g.lineWidth = 3;
      g.strokeStyle = stroke;
      g.beginPath(); this.rr(g, GX1, y, GOAL_W, 20 + WALL + 14, 14); g.stroke();
    }
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
    this.dpr = Math.min(window.devicePixelRatio || 1, tier === 'low' ? 1 : tier === 'medium' ? 1.5 : 3);

    const parent = this.cv.parentElement;
    this.cw = Math.max(1, parent?.clientWidth || window.visualViewport?.width || window.innerWidth);
    this.ch = Math.max(1, parent?.clientHeight || window.visualViewport?.height || window.innerHeight);
    this.cv.width = Math.max(1, Math.round(this.cw * this.dpr));
    this.cv.height = Math.max(1, Math.round(this.ch * this.dpr));

    // Table height follows screen aspect; rescale every y-position when it changes
    const nh = Math.round(W * clamp(this.ch / Math.max(1, this.cw), 1.4, 2.25));
    if (nh !== this.H) {
      const k = nh / this.H;
      for (const p of this.pucks) {
        p.y *= k;
        for (const t of p.trail) t.y *= k;
      }
      this.me.y *= k; this.me.ty *= k;
      this.ai.y *= k; this.ai.ty *= k;
      if (this.tablePowerup) this.tablePowerup.y *= k;
      this.H = nh;
    }

    const minSide = Math.min(this.cw, this.ch);
    const pad = minSide > 520 ? clamp(Math.round(minSide * 0.025), 8, 24) : 2;
    this.scale = Math.min((this.cw - pad * 2) / W, (this.ch - pad * 2) / this.H);
    this.offX = (this.cw - W * this.scale) / 2;
    this.offY = (this.ch - this.H * this.scale) / 2;
    this.buildBg();
    this.clampMalletPosition(this.me, true);
    this.clampMalletPosition(this.ai, false);
  };

  // ## POWERUPS ──────────────────────────────────────────────────────────
  private clearAllPowerups(forceAllPucks = false): void {
    this.tablePowerup = null;
    for (const eff of this.activePowerups) POWERUPS[eff.id].remove(eff.collector, this.powerupEffects);
    this.activePowerups.length = 0;
    Object.assign(this.powerupEffects, DEFAULT_FX);
    this.magnetHoldT = 0;
    this.magnetPuckIdx = -1;
    this.portalCd.fill(0);
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
      const lo = Math.min(W / 2, bounds.minX + padX);
      const hi = Math.max(W / 2, bounds.maxX - padX);
      const cx = lo + Math.random() * Math.max(0, hi - lo);
      if (!bumpers.some((b) => Math.hypot(cx - b.x, cy - b.y * this.H) < b.r + POWERUP_RADIUS + 14)) {
        x = cx; y = cy;
        break;
      }
    }
    this.tablePowerup = { id, x, y, ttl: 6, age: 0 };
  }

  private collectPowerup(puck: PuckState): void {
    const tp = this.tablePowerup;
    if (!tp) return;
    const def = POWERUPS[tp.id];
    const collector: Scorer = puck.lastHitter ?? 'p';

    // Re-collecting the same power-up replaces the old instance
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      if (this.activePowerups[i].id === def.id) {
        def.remove(this.activePowerups[i].collector, this.powerupEffects);
        this.activePowerups.splice(i, 1);
      }
    }
    def.apply(collector, this.powerupEffects);
    if (def.id === 'magnet') {
      this.magnetOwner = collector;
      this.magnetPuckIdx = -1;
      this.magnetHoldT = 0;
    }
    this.activePowerups.push({ id: def.id, collector, remaining: def.duration, duration: def.duration });
    this.powerupsCollected += 1;
    soundEngine.play('powerup');
    this.addRipple(tp.x, tp.y, def.color, 54);
    this.spawnParticles(tp.x, tp.y, def.color, 8);
    this.tablePowerup = null;
  }

  private consumePowerup(id: PowerupId, collector: Scorer): void {
    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const eff = this.activePowerups[i];
      if (eff.id === id && eff.collector === collector) {
        POWERUPS[id].remove(collector, this.powerupEffects);
        this.activePowerups.splice(i, 1);
        return;
      }
    }
  }

  /** Called every AI_EVERY steps with dt already scaled. */
  private updatePowerups(dt: number): void {
    if (this.tutorialStep > 0) return;
    const allowed = this.activeStage ? this.activeStage.powerups : MODES[this.modeId].powerups && this.settings.powerupsEnabled;
    if (!allowed) return;

    for (let i = this.activePowerups.length - 1; i >= 0; i--) {
      const eff = this.activePowerups[i];
      eff.remaining -= dt;
      if (eff.remaining <= 0) {
        POWERUPS[eff.id].remove(eff.collector, this.powerupEffects);
        this.activePowerups.splice(i, 1);
      }
    }

    const tp = this.tablePowerup;
    if (!tp) {
      this.nextPowerupSpawnT -= dt;
      if (this.nextPowerupSpawnT <= 0) this.spawnPowerup();
      return;
    }
    tp.ttl -= dt;
    tp.age += dt;
    if (tp.ttl <= 0) {
      this.tablePowerup = null;
      this.nextPowerupSpawnT = nextSpawn();
      return;
    }
    for (const p of this.pucks) {
      if (p.active && Math.hypot(p.x - tp.x, p.y - tp.y) < PR + POWERUP_RADIUS) {
        this.collectPowerup(p);
        this.nextPowerupSpawnT = nextSpawn();
        break;
      }
    }
  }

  /** Magnet: glue nearest puck to owner's mallet for 0.4s, then fire it forward. */
  private updateMagnet(dt: number, isDemo: boolean): void {
    const fx = this.powerupEffects;
    const owners: Scorer[] = [];
    if (fx.magnetP) owners.push('p');
    if (fx.magnetA) owners.push('a');
    if (owners.length === 0 || isDemo) {
      this.magnetPuckIdx = -1;
      this.magnetHoldT = 0;
      return;
    }
    const held = this.pucks[this.magnetPuckIdx];
    if (!held || !held.active || !owners.includes(this.magnetOwner)) {
      const owner = owners.includes(this.magnetOwner) ? this.magnetOwner : owners[0];
      const mallet = owner === 'p' ? this.me : this.ai;
      let best = -1;
      let bestD = 160;
      for (let i = 0; i < this.pucks.length; i++) {
        if (!this.pucks[i].active) continue;
        const d = Math.hypot(this.pucks[i].x - mallet.x, this.pucks[i].y - mallet.y);
        if (d < bestD) { bestD = d; best = i; }
      }
      this.magnetOwner = owner;
      this.magnetPuckIdx = best;
      this.magnetHoldT = 0;
      if (best < 0) return;
    }
    const puck = this.pucks[this.magnetPuckIdx];
    const mallet = this.magnetOwner === 'p' ? this.me : this.ai;
    const facing = this.magnetOwner === 'p' ? -1 : 1;
    puck.x = mallet.x;
    puck.y = mallet.y + facing * (this.getMalletRadius(this.magnetOwner === 'p') + PR + 2);
    puck.vx = mallet.svx;
    puck.vy = mallet.svy;
    puck.lastHitter = this.magnetOwner;
    this.magnetHoldT += dt;
    if (this.magnetHoldT > 0.4) {
      puck.vx = mallet.svx * 0.25;
      puck.vy = facing * 980;
      this.consumePowerup('magnet', this.magnetOwner);
      this.magnetPuckIdx = -1;
      this.magnetHoldT = 0;
    }
  }

  private portalPositions(): Array<{ x: number; y: number }> {
    return [{ x: W * 0.28, y: this.H * 0.36 }, { x: W * 0.72, y: this.H * 0.64 }];
  }

  private applyPortals(puck: PuckState, index: number): void {
    if (this.portalCd[index] > 0) return;
    if (!this.powerupEffects.portalsP && !this.powerupEffects.portalsA) return;
    const portals = this.portalPositions();
    for (let i = 0; i < 2; i++) {
      if (Math.hypot(puck.x - portals[i].x, puck.y - portals[i].y) > 26) continue;
      const to = portals[1 - i];
      const speed = Math.hypot(puck.vx, puck.vy) || 1;
      puck.x = to.x + (puck.vx / speed) * 40;
      puck.y = to.y + (puck.vy / speed) * 40;
      this.portalCd[index] = 0.4;
      return;
    }
  }

  // ## PHYSICS ───────────────────────────────────────────────────────────
  // Order inside physicsStep: integrate -> mallet hits -> walls/obstacles -> puck-puck -> goals.
  // FIXME-HINT: if the puck "sticks" to a wall, see collideMallet() pinch branch.
  // FIXME-HINT: if bounces feel dead/too lively, edit the *_RESTITUTION constants in ## TUNING.

  private getMalletRadius(isMe: boolean): number {
    const stage = !isMe && this.activeStage ? this.activeStage.botMalletMult : 1;
    return MR * stage * (isMe ? this.powerupEffects.malletScaleP : this.powerupEffects.malletScaleA);
  }

  private mayRoamFullTable(isMe: boolean): boolean {
    return this.tutorialStep === 0 && isMe && !MODES[this.modeId].opponent;
  }

  /** Push a mallet out of every static bumper. Mutates the given point. */
  private pushOutOfBumpers(pt: { x: number; y: number }, mr: number): void {
    for (const b of this.getBumpers()) {
      const by = b.y * this.H;
      const dx = pt.x - b.x;
      const dy = pt.y - by;
      const d = Math.hypot(dx, dy);
      const minD = mr + b.r;
      if (d < minD && d > 0.001) {
        pt.x = b.x + (dx / d) * minD;
        pt.y = by + (dy / d) * minD;
      }
    }
  }

  private clampMalletPosition(m: Mallet, isMe: boolean): void {
    const mr = this.getMalletRadius(isMe);
    const c = this.tableGeometry.clampMalletPosition(m.x, m.y, mr, !isMe, this.mayRoamFullTable(isMe));
    m.x = c.x;
    m.y = c.y;
    this.pushOutOfBumpers(m, mr);
  }

  /** Moves mallet toward target at max speed `sp`, then updates smoothed velocity used for hits. */
  private moveMallet(m: Mallet, tx: number, ty: number, sp: number, dt: number, isMe: boolean): void {
    if (isMe ? this.powerupEffects.freezeP : this.powerupEffects.freezeA) {
      m.vx = m.vy = m.svx = m.svy = 0;
      return;
    }
    const mr = this.getMalletRadius(isMe);
    const full = this.mayRoamFullTable(isMe);
    const target = this.tableGeometry.clampMalletPosition(tx, ty, mr, !isMe, full);
    this.pushOutOfBumpers(target, mr);

    const dx = target.x - m.x;
    const dy = target.y - m.y;
    const d = Math.hypot(dx, dy);
    const mx = sp * dt;
    let nx = m.x;
    let ny = m.y;
    if (d <= mx) {
      nx = target.x; ny = target.y;
    } else if (d > 0) {
      const c = this.tableGeometry.clampMalletPosition(m.x + (dx / d) * mx, m.y + (dy / d) * mx, mr, !isMe, full);
      nx = c.x; ny = c.y;
    }
    m.vx = (nx - m.x) / dt;
    m.vy = (ny - m.y) / dt;
    m.x = nx;
    m.y = ny;

    // Exponential smoothing: pointer events arrive at 60-120Hz but sim runs at 360Hz, so raw
    // velocity is bursty (0 between events). Hits use this smoothed value for consistent power.
    const a = 1 - Math.exp(-dt / MALLET_VEL_TAU);
    m.svx += (m.vx - m.svx) * a;
    m.svy += (m.vy - m.svy) * a;
  }

  /**
   * Single reflection routine for every static surface (walls, corners, posts, bumpers).
   * (nx, ny) = unit normal pointing from the surface toward the puck.
   * Handles: restitution, small tangential friction, and spin ("english") exchange.
   */
  private bounce(p: PuckState, nx: number, ny: number, e: number, isDemo: boolean, maxV: number): void {
    const vn = p.vx * nx + p.vy * ny;
    if (vn >= 0) return; // already separating
    if (!isDemo) soundEngine.play('wall', -vn, { maxV });
    p.vx -= (1 + e) * vn * nx;
    p.vy -= (1 + e) * vn * ny;
    const tx = -ny;
    const ty = nx;
    const vt = p.vx * tx + p.vy * ty;
    const dvt = -vt * WALL_TANGENT_FRICTION + p.spin * WALL_SPIN_KICK * clamp(-vn / 600, 0, 1.5);
    p.vx += tx * dvt;
    p.vy += ty * dvt;
    p.spin *= -WALL_SPIN_KEEP; // reverses and weakens spin like a real rail hit
  }

  /** Static circle collider (bumpers, goal posts, convex waist vertices). */
  private collideCircle(p: PuckState, cx: number, cy: number, cr: number, e: number, isDemo: boolean, maxV: number): void {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const d = Math.hypot(dx, dy);
    const minD = PR + cr;
    if (d >= minD || d <= 0.001) return;
    const nx = dx / d;
    const ny = dy / d;
    p.x = cx + nx * minD;
    p.y = cy + ny * minD;
    this.bounce(p, nx, ny, e, isDemo, maxV);
  }

  /** Writes inward wall normal near the puck into this.wallContact (zero allocations). */
  private detectPuckWallContact(p: PuckState): void {
    const geom = this.tableGeometry;
    const eps = 2.0;
    let nx = 0;
    let ny = 0;

    for (const s of geom.wallSegments) {
      if (s.len <= 0.001) continue;
      const ux = (s.bx - s.ax) / s.len;
      const uy = (s.by - s.ay) / s.len;
      const proj = (p.x - s.ax) * ux + (p.y - s.ay) * uy;
      if (proj < -eps || proj > s.len + eps) continue;
      const signedD = (p.x - s.ax) * s.nx + (p.y - s.ay) * s.ny;
      if (signedD <= PR + eps && signedD >= -PR) { nx += s.nx; ny += s.ny; }
    }
    for (const arc of geom.cornerArcs) {
      const maxD = arc.r - PR;
      const dx = p.x - arc.cx;
      const dy = p.y - arc.cy;
      const d = Math.hypot(dx, dy);
      if (d >= maxD - eps && d > 0.001 && isAngleInArc(Math.atan2(dy, dx), arc.startAngle, arc.sweep)) {
        nx -= dx / d; ny -= dy / d;
      }
    }
    for (const v of geom.convexVertices) {
      const dx = p.x - v.x;
      const dy = p.y - v.y;
      const d = Math.hypot(dx, dy);
      if (d <= PR + eps && d > 0.001) { nx += dx / d; ny += dy / d; }
    }

    const len = Math.hypot(nx, ny);
    const wc = this.wallContact;
    wc.hit = len > 0.001;
    wc.nx = wc.hit ? nx / len : 0;
    wc.ny = wc.hit ? ny / len : 0;
  }

  /**
   * Mallet vs puck. Mallet is kinematic (infinite mass).
   *  - Normal case: reflect relative velocity with MALLET_RESTITUTION, add spin from swipe.
   *  - Pinch case (puck squeezed between mallet and wall): eject ALONG the wall instead of
   *    pushing into it, otherwise the wall pushes it straight back and it jitters/sticks.
   * FIXME-HINT: if pinch ejects the wrong way, check wall normal sign in tableGeometry.ts
   * (normals must point INTO the table).
   */
  private collideMallet(m: Mallet, isMe: boolean, puck: PuckState, color: string, isDemo: boolean): void {
    const mr = this.getMalletRadius(isMe);
    const dx = puck.x - m.x;
    const dy = puck.y - m.y;
    const d = Math.hypot(dx, dy);
    const min = PR + mr;
    if (d >= min) return;

    // Fallback normal if centers coincide
    const nx = d > 0.001 ? dx / d : 0;
    const ny = d > 0.001 ? dy / d : isMe ? -1 : 1;
    const rv = (puck.vx - m.svx) * nx + (puck.vy - m.svy) * ny;
    const overlap = min - d + SEP_BIAS;

    this.detectPuckWallContact(puck);
    const wc = this.wallContact;
    const pinched = wc.hit && nx * wc.nx + ny * wc.ny < -0.3;

    if (pinched) {
      let tx = -wc.ny;
      let ty = wc.nx;
      const side = tx * dx + ty * dy;
      // Slide away from mallet centre; if dead-centre, slide toward table middle
      if (Math.abs(side) < 0.05 ? tx * (W / 2 - puck.x) < 0 : side < 0) { tx = -tx; ty = -ty; }
      const k = overlap / Math.max(0.3, Math.abs(tx * nx + ty * ny));
      puck.x += tx * k;
      puck.y += ty * k;
      const sp = Math.max(MIN_WALL_EJECT, Math.hypot(puck.vx, puck.vy), Math.hypot(m.svx, m.svy) * 0.6);
      puck.vx = tx * sp;
      puck.vy = ty * sp;
      puck.spin = 0;
    } else {
      puck.x += nx * overlap;
      puck.y += ny * overlap;
      if (rv >= 0) return; // mallet moving away, no hit
      const rt = (puck.vx - m.svx) * -ny + (puck.vy - m.svy) * nx; // tangential swipe speed
      const j = -(1 + MALLET_RESTITUTION) * rv;
      puck.vx += j * nx;
      puck.vy += j * ny;
      puck.spin = clamp(puck.spin + rt * MALLET_SPIN_GAIN, -1, 1);
    }

    puck.lastHitter = isMe ? 'p' : 'a';
    const hitter = puck.lastHitter;

    // One-shot offensive power-ups are spent on this hit
    if (isMe ? this.powerupEffects.fireballP : this.powerupEffects.fireballA) {
      puck.vx *= 1.55; puck.vy *= 1.55;
      this.consumePowerup('fireball', hitter);
    }
    if (isMe ? this.powerupEffects.curveShotP : this.powerupEffects.curveShotA) {
      puck.spin = (puck.spin >= 0 ? 1 : -1) * 0.95;
      this.consumePowerup('curve_shot', hitter);
    }

    if (!isDemo) {
      const speed = Math.hypot(puck.vx, puck.vy);
      soundEngine.play('hit', speed, { maxV: this.getMaxPuckVelocity(false) });
      if (Math.abs(rv) > 150) {
        const cxp = m.x + nx * mr;
        const cyp = m.y + ny * mr;
        this.addRipple(cxp, cyp, color, 42);
        // Hit-stop + flash on hard hits. FIXME-HINT: hit-stop is the 0.045 below.
        if (speed >= 1100 && !this.isReducedMotion()) {
          this.hitStopTimer = 0.045;
          this.shakeT = Math.max(this.shakeT, 0.09);
          if (this.effectiveQuality() !== 'low') {
            Object.assign(this.impactFlash, { active: true, x: cxp, y: cyp, r: 10, maxR: 62, alpha: 0.95 });
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
      }
    }
  }

  /** Wide Goal opens the mouth of the goal owned by the collector's opponent end. */
  private goalMouth(top: boolean): { x1: number; x2: number } {
    const wide = top ? this.powerupEffects.wideGoalP : this.powerupEffects.wideGoalA;
    const width = wide ? Math.min(GOAL_W * WIDE_GOAL_MULT, W - 48) : GOAL_W;
    const x1 = (W - width) * 0.5;
    return { x1, x2: x1 + width };
  }

  private segmentOpensForWideGoal(s: WallSegment, proj: number): boolean {
    const onTop = Math.abs(s.ay - WALL) < 3 && Math.abs(s.by - WALL) < 3;
    const onBot = Math.abs(s.ay - (this.H - WALL)) < 3 && Math.abs(s.by - (this.H - WALL)) < 3;
    if (!onTop && !onBot) return false;
    if (onTop && !this.powerupEffects.wideGoalP) return false;
    if (onBot && !this.powerupEffects.wideGoalA) return false;
    const cx = s.ax + ((s.bx - s.ax) / s.len) * proj;
    const mouth = this.goalMouth(onTop);
    return cx > mouth.x1 && cx < mouth.x2;
  }

  private rejectShieldedGoal(puck: PuckState, defender: Scorer): void {
    puck.y = defender === 'a' ? WALL + PR + 4 : this.H - WALL - PR - 4;
    puck.vy = defender === 'a' ? Math.abs(puck.vy) + 220 : -(Math.abs(puck.vy) + 220);
    puck.vx *= 0.6;
    this.consumePowerup('goal_shield', defender);
    soundEngine.play('wall', 400, { maxV: this.getMaxPuckVelocity(false) });
  }

  /** Corners, wall segments, convex joints, goal posts, bumpers (in that order). */
  private resolveBounds(p: PuckState, bumpers: ObstacleBumper[], isDemo: boolean): void {
    const geom = this.tableGeometry;
    const maxV = this.getMaxPuckVelocity(isDemo);

    // 1. Concave corner fillets
    for (const arc of geom.cornerArcs) {
      const maxD = arc.r - PR;
      if (maxD <= 0) continue;
      const dx = p.x - arc.cx;
      const dy = p.y - arc.cy;
      const d = Math.hypot(dx, dy);
      if (d > maxD && d > 0.001 && isAngleInArc(Math.atan2(dy, dx), arc.startAngle, arc.sweep)) {
        const nx = -dx / d;
        const ny = -dy / d;
        p.x = arc.cx + (dx / d) * maxD;
        p.y = arc.cy + (dy / d) * maxD;
        this.bounce(p, nx, ny, WALL_RESTITUTION, isDemo, maxV);
      }
    }

    // 2. Straight / angled rails (goal mouths stay open)
    for (const s of geom.wallSegments) {
      if (s.len <= 0.001) continue;
      const proj = (p.x - s.ax) * ((s.bx - s.ax) / s.len) + (p.y - s.ay) * ((s.by - s.ay) / s.len);
      if (proj < 0 || proj > s.len || this.segmentOpensForWideGoal(s, proj)) continue;
      const signedD = (p.x - s.ax) * s.nx + (p.y - s.ay) * s.ny;
      if (signedD < PR && signedD > -PR * 2.5) {
        const push = PR - signedD;
        p.x += s.nx * push;
        p.y += s.ny * push;
        this.bounce(p, s.nx, s.ny, WALL_RESTITUTION, isDemo, maxV);
      }
    }

    // 3. Convex waist vertices
    for (const v of geom.convexVertices) this.collideCircle(p, v.x, v.y, 0, WALL_RESTITUTION, isDemo, maxV);

    // 4. Goal posts (move outward while Wide Goal is active)
    const top = this.goalMouth(true);
    const bot = this.goalMouth(false);
    this.collideCircle(p, top.x1, WALL, 0, POST_RESTITUTION, isDemo, maxV);
    this.collideCircle(p, top.x2, WALL, 0, POST_RESTITUTION, isDemo, maxV);
    this.collideCircle(p, bot.x1, this.H - WALL, 0, POST_RESTITUTION, isDemo, maxV);
    this.collideCircle(p, bot.x2, this.H - WALL, 0, POST_RESTITUTION, isDemo, maxV);

    // 5. Obstacle bumpers
    for (const b of bumpers) this.collideCircle(p, b.x, b.y * this.H, b.r, BUMPER_RESTITUTION, isDemo, maxV);
  }

  /** Equal-mass elastic collision. */
  private collidePuckWithPuck(a: PuckState, b: PuckState, isDemo: boolean): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const d = Math.hypot(dx, dy);
    const minD = PR * 2;
    if (d >= minD || d <= 0.001) return;
    const nx = dx / d;
    const ny = dy / d;
    const push = (minD - d) * 0.5 + SEP_BIAS * 0.5;
    a.x -= nx * push; a.y -= ny * push;
    b.x += nx * push; b.y += ny * push;
    const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (vn >= 0) return;
    const imp = -(1 + PUCK_PUCK_RESTITUTION) * vn * 0.5;
    a.vx -= imp * nx; a.vy -= imp * ny;
    b.vx += imp * nx; b.vy += imp * ny;
    a.spin = b.spin = 0;
    if (!isDemo) soundEngine.play('wall', Math.abs(vn), { maxV: this.getMaxPuckVelocity(false) });
  }

  private physicsStep(dt: number, isDemo: boolean): void {
    const maxV = this.getMaxPuckVelocity(isDemo);
    const p1Skin = this.getActiveMalletSkin(true);
    const p2Skin = this.getActiveMalletSkin(false);
    const hasOpponent = this.tutorialStep === 0 && (isDemo || MODES[this.modeId].opponent);
    const bumpers = this.getBumpers();
    const friction = Math.pow(PUCK_FRICTION_PER_S, dt);
    const spinDecay = Math.exp(-SPIN_DECAY * dt);
    const fx = this.powerupEffects;

    // (a) Integrate pucks + spin curve + zone effects
    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (!p.active) continue;
      if (Math.abs(p.spin) > 0.01) {
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 1) {
          const a = (p.spin * SPIN_CURVE_ACCEL * dt) / sp;
          p.vx += -p.vy * a;
          p.vy += p.vx * a;
        }
        p.spin *= spinDecay;
        if (Math.abs(p.spin) < 0.01) p.spin = 0;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= friction;
      p.vy *= friction;
      if (!isDemo) {
        const inTop = p.y < this.H * 0.5;
        if ((inTop && fx.slowZoneP) || (!inTop && fx.slowZoneA)) {
          const drag = Math.pow(0.28, dt);
          p.vx *= drag; p.vy *= drag;
        }
        if (this.portalCd[i] > 0) this.portalCd[i] = Math.max(0, this.portalCd[i] - dt);
        if (i !== this.magnetPuckIdx) this.applyPortals(p, i);
      }
    }

    this.updateMagnet(dt, isDemo);

    // (b) Mallet hits (wall pinch handled inside)
    for (let i = 0; i < this.pucks.length; i++) {
      const p = this.pucks[i];
      if (!p.active || i === this.magnetPuckIdx) continue;
      if (!fx.ghostA) this.collideMallet(this.me, true, p, p1Skin.p1, isDemo);
      if (hasOpponent && !fx.ghostP) this.collideMallet(this.ai, false, p, p2Skin.p2, isDemo);
    }

    // (c) Walls / obstacles AFTER mallet hits so nothing ends inside geometry; clamp speed
    for (const p of this.pucks) {
      if (!p.active) continue;
      this.resolveBounds(p, bumpers, isDemo);
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > maxV) { p.vx *= maxV / sp; p.vy *= maxV / sp; }
      p.spinAngle += dt * (sp * 0.01 + p.spin * 12);
      if (!isDemo && sp > this.maxPuckSpeed) this.maxPuckSpeed = sp;
    }

    // (d) Puck-puck, then re-clamp to walls
    let multi = false;
    for (let i = 0; i < this.pucks.length; i++) {
      if (!this.pucks[i].active) continue;
      for (let j = i + 1; j < this.pucks.length; j++) {
        if (!this.pucks[j].active) continue;
        multi = true;
        this.collidePuckWithPuck(this.pucks[i], this.pucks[j], isDemo);
      }
    }
    if (multi) for (const p of this.pucks) if (p.active) this.resolveBounds(p, bumpers, isDemo);

    // (e) Goals. FIXME-HINT: physicsStep must NOT run during 'slowmo'/'goal' phases (would re-score).
    for (const p of this.pucks) {
      if (!p.active) continue;
      if (p.y < 0) {
        if (!isDemo && fx.goalShieldA) this.rejectShieldedGoal(p, 'a'); else this.goal('p');
        break;
      } else if (p.y > this.H) {
        if (!isDemo && fx.goalShieldP) this.rejectShieldedGoal(p, 'p'); else this.goal('a');
        break;
      }
    }
  }

  // ## GOAL / MATCH FLOW ────────────────────────────────────────────────
  private willMatchEndAfterGoal(): boolean {
    const cond = MODES[this.modeId].winCondition;
    if (cond === 'practice') return false;
    if (cond === 'sudden_death' || this.suddenDeathOvertime) return true;
    if (cond === 'timed') return false;
    const target = this.effectiveWinScore();
    return this.score.p >= target || this.score.a >= target;
  }

  private goal(who: Scorer): void {
    if (this.screen === 'home') {
      this.placePrimaryPuck(this.H * 0.5);
      this.kickDemoPuck(Math.random() < 0.5 ? -1 : 1, who === 'p' ? 1 : -1, 170, 260);
      return;
    }

    if (this.tutorialStep > 0) {
      if (this.tutorialStep === 2 && who === 'p') {
        soundEngine.play('goal', 0, { isMatchPoint: true });
        this.tutorialStep = 3;
        this.tutorialStep3Timer = 0;
        this.placePrimaryPuck(this.H * 0.62);
        this.callbacks.onTutorialStepChange?.(3);
      } else if (this.tutorialStep === 2) this.placePrimaryPuck(this.H * 0.58, 78);
      else this.placePrimaryPuck(this.H * (this.tutorialStep === 3 ? 0.62 : 0.5));
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

    const fx = this.powerupEffects;
    this.score[who] += (who === 'p' ? fx.doublePointsP : fx.doublePointsA) ? 2 : 1;
    this.maxDeficit = Math.max(this.maxDeficit, this.score.a - this.score.p);
    this.lastScorer = who;
    this.clearAllPowerups(true);
    this.nextPowerupSpawnT = nextSpawn();

    if (this.settings.screenShake && !this.isReducedMotion() && this.effectiveQuality() !== 'low') this.shakeT = 0.28;
    soundEngine.play('goal', 0, { isMatchPoint: this.isAtMatchPoint() || this.suddenDeathOvertime });

    const skin = this.getActiveTableSkin();
    this.spawnParticles(W / 2, who === 'p' ? WALL + 8 : this.H - WALL - 8, who === 'p' ? skin.p1Banner : skin.p2Banner, 12);

    const endsMatch = this.willMatchEndAfterGoal();
    const runSlowMo = !this.isReducedMotion() && this.effectiveQuality() !== 'low' &&
      (this.settings.goalSlowMo === 'all' || (this.settings.goalSlowMo === 'winning' && endsMatch));
    this.slowMoWillEnd = endsMatch;
    if (runSlowMo) {
      this.phase = 'slowmo';
      this.phaseT = this.slowMoDuration;
      this.slowMoGoalY = who === 'p' ? 0.14 : 0.86;
      this.cameraFocusY = this.slowMoGoalY;
    } else {
      for (const p of this.pucks) { p.active = false; p.vx = p.vy = 0; }
      this.phase = 'goal';
      this.phaseT = 1.15;
    }
    this.emitHud();
  }

  private serve(): void {
    const conceder = this.lastScorer === 'p' ? 'a' : 'p';
    this.placePrimaryPuck(conceder === 'a' ? this.H * 0.3 : this.H * 0.7);
    if (this.shouldKeepSecondPuck()) this.spawnExtraPuck();
    if (this.pidP === null) { this.me.tx = W / 2; this.me.ty = this.H - 120; }
    if (this.pidA === null) { this.ai.tx = W / 2; this.ai.ty = 120; }
    this.resetCamera();
    this.cd = 0;
    this.phase = 'ready';
    this.phaseT = 2;
  }

  private endGame(): void {
    this.screen = 'over';
    this.releaseInput();
    this.resetCamera();
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
      winCondition: (this.activeStage ? this.activeStage.winCondition : modeCfg.winCondition) as MatchResult['winCondition'],
      isStage: !!this.activeStage,
      ...(this.activeStage ? { stageId: this.activeStage.id, continuesUsed: this.continuesUsed } : {}),
    });
  }

  private spawnParticles(x: number, y: number, color: string, count: number): void {
    if (this.isReducedMotion() || this.effectiveQuality() === 'low' || this.screen === 'home') return;
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < count; i++) {
      const pt = this.particles[i];
      if (pt.active) continue;
      const ang = (Math.PI * 2 * spawned) / count + (Math.random() - 0.5) * 0.4;
      const spd = 90 + Math.random() * 190;
      Object.assign(pt, {
        active: true, x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd,
        r: 2.5 + Math.random() * 2, alpha: 0.9, color,
      });
      spawned += 1;
    }
  }

  private addRipple(x: number, y: number, color: string, maxR = 44): void {
    if (this.isReducedMotion() || this.effectiveQuality() === 'low' || this.screen === 'home') return;
    const rp = this.ripples.find((r) => !r.active);
    if (rp) Object.assign(rp, { active: true, x, y, r: 10, maxR, alpha: 0.45, color });
  }

  // ## AI ────────────────────────────────────────────────────────────────
  // Think functions ONLY set targets (mallet.tx/ty + speed). Movement runs every step in updateGame.
  // FIXME-HINT: difficulty numbers live in DIFFICULTY_CONFIG / PERSONALITIES (types/registries).

  private selectTargetPuck(forTop: boolean): PuckState {
    let best = this.pucks[0];
    let bestScore = -Infinity;
    for (const p of this.pucks) {
      if (!p.active) continue;
      const dist = forTop ? this.H - p.y : p.y;
      const toward = forTop ? (p.vy < -20 ? 360 : 0) : p.vy > 20 ? 360 : 0;
      if (dist + toward > bestScore) { bestScore = dist + toward; best = p; }
    }
    return best;
  }

  private resolvePersonality(base: PersonalityId, puck: PuckState): PersonalityId {
    const { a, p } = this.score;
    switch (this.stagePersonality) {
      case 'adaptive_grandmaster': return a > p ? 'defender' : 'attacker';
      case 'adaptive_eternal': return a > p ? 'defender' : a < p ? 'attacker' : 'trickster';
      case 'adaptive_stadium': return a >= p ? 'trickster' : 'attacker';
      case 'adaptive_architect': return a >= p ? 'defender' : 'trickster';
      case 'adaptive_immortal':
        if (puck.vy < -280 && puck.y < this.H * 0.55) return 'defender';
        return puck.x < 110 || puck.x > W - 110 || a > p ? 'trickster' : 'attacker';
      default: return base;
    }
  }

  /** Shared "line up behind puck and strike toward (ax, ay)" targeting; returns target point. */
  private strikeTarget(puck: PuckState, mallet: Mallet, ax: number, ay: number, out: { x: number; y: number }): void {
    let dx = ax - puck.x;
    let dy = ay - puck.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const vx = puck.x - mallet.x;
    const vy = puck.y - mallet.y;
    const along = vx * dx + vy * dy;
    const lat = Math.abs(vx * dy - vy * dx);
    if (along > 20 && lat < 30) { out.x = puck.x + dx * 60; out.y = puck.y + dy * 60; } // behind puck: strike
    else { out.x = puck.x - dx * (MR + PR + 34); out.y = puck.y - dy * (MR + PR + 34); } // get behind it
  }

  /** Predict x where a puck will cross defY, with wall reflections. */
  private predictX(puck: PuckState, defY: number, dirY: 1 | -1): number {
    let px = W / 2 + (puck.x - W / 2) * 0.5;
    if (puck.vy * dirY > 40) {
      const tt = (defY - puck.y) / puck.vy;
      px = puck.x + puck.vx * tt;
      const L = WALL + PR;
      const span = W - 2 * L;
      let q = (px - L) % (2 * span);
      if (q < 0) q += 2 * span;
      px = L + (q > span ? 2 * span - q : q);
    }
    return px;
  }

  private readonly tgt = { x: 0, y: 0 }; // scratch

  private aiThinkTop(dt: number, diff: Difficulty, personalityId: PersonalityId): void {
    const puck = this.selectTargetPuck(true);
    const D = DIFFICULTY_CONFIG[diff];
    const P = PERSONALITIES[this.resolvePersonality(personalityId, puck)];
    const attackLine = this.H / 2 + 10 + (P.attackBias - 1) * 110;
    const minApproachVy = P.aimStyle === 'aggressive' ? -450 : -320;
    const brain = this.topBrain;
    let tx: number;
    let ty: number;

    if (puck.y < attackLine && puck.vy > minApproachVy) {
      brain.aimT -= dt;
      if (brain.aimT <= 0) {
        brain.aim = (Math.random() * 2 - 1) * D.spread * P.spread;
        brain.feintSign = Math.random() < 0.5 ? -1 : 1;
        brain.aimT = P.aimStyle === 'bank' ? 0.35 : 0.45;
      }
      let ax = W / 2 + brain.aim;
      let ay = this.H + 40;
      if (P.aimStyle === 'bank') {
        ax = brain.feintSign > 0 ? WALL + PR : W - WALL - PR;
        ay = this.H * 0.72 + brain.aim * 0.4;
      } else if (P.aimStyle === 'aggressive') {
        ax = clamp(W / 2 + brain.aim * 0.5, GX1 + 20, GX2 - 20);
      } else if (P.aimStyle === 'clear') {
        ax = puck.x < W / 2 ? W - 40 : 40;
        ay = this.H * 0.82;
      }
      this.strikeTarget(puck, this.ai, ax, ay, this.tgt);
      tx = this.tgt.x; ty = this.tgt.y;
    } else {
      brain.trackX += (this.predictX(puck, P.defY, -1) - brain.trackX) * Math.min(1, dt * D.track * P.trackSpeed);
      tx = brain.trackX;
      ty = P.defY;
    }
    this.ai.tx = tx;
    this.ai.ty = ty;
    this.aiSpeed = D.speed * (P.aimStyle === 'aggressive' ? 1.08 : 1);
  }

  /** Demo-only: drives the bottom (player) mallet on the home screen. */
  private aiThinkBottom(dt: number, diff: Difficulty): void {
    const D = DIFFICULTY_CONFIG[diff];
    const puck = this.selectTargetPuck(false);
    const brain = this.botBrain;
    if (puck.y > this.H / 2 - 10 && puck.vy < 320) {
      brain.aimT -= dt;
      if (brain.aimT <= 0) {
        brain.aim = (Math.random() * 2 - 1) * D.spread;
        brain.aimT = 0.45;
      }
      this.strikeTarget(puck, this.me, W / 2 + brain.aim, -40, this.tgt);
      this.me.tx = this.tgt.x; this.me.ty = this.tgt.y;
    } else {
      const defY = this.H - 96;
      brain.trackX += (this.predictX(puck, defY, 1) - brain.trackX) * Math.min(1, dt * D.track);
      this.me.tx = brain.trackX;
      this.me.ty = defY;
    }
    this.botSpeed = D.speed;
  }

  // ## LOOP ──────────────────────────────────────────────────────────────
  private applyKeyboardTargets(dt: number): void {
    const keySpeed = 760;
    const ai = this.opponentType === 'ai';
    const axis = (neg: string[], pos: string[]) =>
      (pos.some((k) => this.keys.has(k)) ? 1 : 0) - (neg.some((k) => this.keys.has(k)) ? 1 : 0);

    if (this.pidP === null) {
      const mx = axis(ai ? ['ArrowLeft', 'KeyA'] : ['ArrowLeft'], ai ? ['ArrowRight', 'KeyD'] : ['ArrowRight']);
      const my = axis(ai ? ['ArrowUp', 'KeyW'] : ['ArrowUp'], ai ? ['ArrowDown', 'KeyS'] : ['ArrowDown']);
      if (mx || my) {
        const len = Math.hypot(mx, my);
        const c = this.tableGeometry.clampMalletPosition(
          this.me.tx + (mx / len) * keySpeed * dt, this.me.ty + (my / len) * keySpeed * dt,
          this.getMalletRadius(true), false, !MODES[this.modeId].opponent);
        this.me.tx = c.x; this.me.ty = c.y;
      }
    }
    if (this.opponentType === 'two' && MODES[this.modeId].opponent && this.pidA === null) {
      const ax = axis(['KeyA'], ['KeyD']);
      const ay = axis(['KeyW'], ['KeyS']);
      if (ax || ay) {
        const len = Math.hypot(ax, ay);
        const c = this.tableGeometry.clampMalletPosition(
          this.ai.tx + (ax / len) * keySpeed * dt, this.ai.ty + (ay / len) * keySpeed * dt,
          this.getMalletRadius(false), true, false);
        this.ai.tx = c.x; this.ai.ty = c.y;
      }
    }
  }

  private updateDemo(dt: number): void {
    this.stepN += 1;
    if (this.stepN % AI_EVERY === 0) {
      this.aiThinkBottom(dt * AI_EVERY, 'medium');
      this.aiThinkTop(dt * AI_EVERY, 'medium', 'balanced');
    }
    this.moveMallet(this.me, this.me.tx, this.me.ty, this.botSpeed, dt, true);
    this.moveMallet(this.ai, this.ai.tx, this.ai.ty, this.aiSpeed, dt, false);
    this.physicsStep(dt, true);
    const p0 = this.pucks[0];
    if (p0.active && Math.hypot(p0.vx, p0.vy) < 45) { // anti-stall nudge
      p0.vx += (Math.random() - 0.5) * 260;
      p0.vy += (p0.y < this.H / 2 ? 1 : -1) * 220;
    }
  }

  /** Move player + opponent mallets for one step. `think` = run AI decision this step. */
  private moveBoth(dt: number, hasOpponent: boolean, think: boolean): void {
    this.applyKeyboardTargets(dt);
    this.moveMallet(this.me, this.me.tx, this.me.ty, MALLET_MAX_SPEED, dt, true);
    if (!hasOpponent) return;
    if (this.opponentType === 'two') {
      this.moveMallet(this.ai, this.ai.tx, this.ai.ty, MALLET_MAX_SPEED, dt, false);
    } else {
      if (think) this.aiThinkTop(dt * AI_EVERY, this.diffKey, this.personality);
      this.moveMallet(this.ai, this.ai.tx, this.ai.ty, this.aiSpeed, dt, false);
    }
  }

  private updateGame(dt: number): void {
    const modeCfg = MODES[this.modeId];
    const hasOpponent = this.tutorialStep === 0 && modeCfg.opponent;
    this.stepN += 1;
    const think = this.stepN % AI_EVERY === 0;

    if (this.tutorialStep > 0) {
      this.tutorialAnimT += dt;
      if (this.tutorialStep === 3) {
        this.tutorialStep3Timer += dt;
        if (this.tutorialStep3Timer >= 5.0) { this.finishTutorial(false); return; }
      }
    }

    if (this.hitStopTimer > 0) {
      this.hitStopTimer = Math.max(0, this.hitStopTimer - dt);
    } else if (this.phase === 'slowmo') {
      const sdt = dt * 0.3;
      this.moveBoth(sdt, hasOpponent, think);
      // Pucks drift into the net. Physics is NOT run here (would re-trigger the goal).
      for (const p of this.pucks) if (p.active) { p.x += p.vx * sdt; p.y += p.vy * sdt; }
      const t = 1 - clamp(this.phaseT / this.slowMoDuration, 0, 1);
      this.cameraZoom = 1 + Math.sin(t * Math.PI * 0.7) * 0.32;
      this.phaseT -= dt;
      if (this.phaseT <= 0) {
        this.cameraZoom = 1;
        this.cameraFocusY = 0.5;
        if (this.slowMoWillEnd) this.endGame(); else this.serve();
      }
    } else if (this.phase === 'play') {
      if (this.tutorialStep === 0) {
        this.matchElapsed += dt;
        if (this.timeRemaining !== null && !this.suddenDeathOvertime) {
          this.timeRemaining = Math.max(0, this.timeRemaining - dt);
          if (this.timeRemaining <= 0) {
            if (this.score.p !== this.score.a) { this.endGame(); return; }
            this.suddenDeathOvertime = true; // tie -> sudden death
            this.emitHud();
          }
        }
      }
      this.moveBoth(dt, hasOpponent, think);
      this.physicsStep(dt, false);
      if (this.tutorialStep === 0) {
        if (think) this.updatePowerups(dt * AI_EVERY);
        this.hudSyncTimer += dt;
        if (this.hudSyncTimer >= 0.25) { this.hudSyncTimer = 0; this.emitHud(); }
      }
    } else {
      // 'ready' countdown or 'goal' celebration
      this.applyKeyboardTargets(dt);
      this.moveMallet(this.me, this.me.tx, this.me.ty, MALLET_MAX_SPEED, dt, true);
      if (hasOpponent) {
        if (this.opponentType === 'two') this.moveMallet(this.ai, this.ai.tx, this.ai.ty, MALLET_MAX_SPEED, dt, false);
        else this.moveMallet(this.ai, W / 2, 120, 900, dt, false);
      }
      this.phaseT -= dt;
      if (this.phase === 'ready') {
        const c = Math.ceil(this.phaseT);
        if (c !== this.cd) {
          this.cd = c;
          if (c > 0 && modeCfg.winCondition !== 'practice') soundEngine.beep(440, 0.08, 'sine', 0.1);
        }
      }
      if (this.phaseT <= 0) {
        if (this.phase === 'goal') {
          if (this.slowMoWillEnd) this.endGame(); else this.serve();
        } else {
          this.phase = 'play';
          if (modeCfg.winCondition !== 'practice') soundEngine.beep(880, 0.14, 'sine', 0.14);
        }
      }
    }

    // Juice timers
    if (this.shakeT > 0) this.shakeT = Math.max(0, this.shakeT - dt);
    const f = this.impactFlash;
    if (f.active) {
      f.r += 260 * dt;
      f.alpha -= 4.8 * dt;
      if (f.alpha <= 0 || f.r >= f.maxR) f.active = false;
    }
    for (const pt of this.particles) {
      if (!pt.active) continue;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.94; pt.vy *= 0.94;
      pt.alpha -= 2.1 * dt;
      if (pt.alpha <= 0) pt.active = false;
    }
    for (const rp of this.ripples) {
      if (!rp.active) continue;
      rp.r += 160 * dt;
      rp.alpha -= 1.8 * dt;
      if (rp.alpha <= 0 || rp.r >= rp.maxR) rp.active = false;
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

  /** Skips the first 0.7s (resize / buildBg hitches), then averages 3s. Only ever downgrades. */
  private evaluateAutoQuality(rawDt: number): void {
    if (this.settings.quality !== 'auto' || this.qualityLockedForSession || this.screen !== 'game') return;
    this.qualityProbeTime += rawDt;
    if (this.qualityProbeTime < 0.7) return;
    this.qualityProbeFrames += 1;
    if (this.qualityProbeTime >= 3.7) {
      const avgMs = ((this.qualityProbeTime - 0.7) * 1000) / Math.max(1, this.qualityProbeFrames);
      if (avgMs > 22 && this.qualityTier !== 'low') {
        this.qualityTier = this.qualityTier === 'high' ? 'medium' : 'low';
        this.resize();
        this.callbacks.onQualityChange?.(this.qualityTier);
      }
      this.qualityLockedForSession = true;
    }
  }

  private frame = (t: number): void => {
    if (this.destroyed) return;
    this.rafId = requestAnimationFrame(this.frame);

    // Optional 60 FPS cap (16.3ms threshold avoids 60Hz jitter drops)
    if (this.settings.fpsCap === 60 && t - this.lastFrameStepTime < 16.3) return;
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

    // Fixed 360Hz timestep: deterministic physics, no high-speed tunnelling
    if ((this.screen === 'game' || this.screen === 'home') && dtF > 0) {
      this.acc = Math.min(0.05, this.acc + dtF);
      const inGame = this.screen === 'game';
      for (let steps = 0; this.acc >= FIXED_DT && steps < 20; steps++) {
        if (inGame) this.updateGame(FIXED_DT); else this.updateDemo(FIXED_DT);
        this.acc -= FIXED_DT;
        if (inGame && this.screen !== 'game') break;
      }
    } else {
      this.acc = 0;
    }

    // Trails are sampled per frame (not per step)
    const recordTrail = ((this.screen === 'game' && (this.phase === 'play' || this.phase === 'slowmo')) || this.screen === 'home') &&
      this.settings.puckTrail && this.effectiveQuality() !== 'low';
    for (const p of this.pucks) {
      if (recordTrail && p.active) {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 14) p.trail.shift();
      } else if (p.trail.length) {
        p.trail.length = 0;
      }
    }
    this.draw();
  };

  // ## RENDER ────────────────────────────────────────────────────────────
  private circle(x: number, y: number, r: number): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, r, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private ring(x: number, y: number, r: number, color: string, w: number): void {
    const c = this.ctx;
    c.lineWidth = w;
    c.strokeStyle = color;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.stroke();
  }

  private drawMallet(m: Mallet, isMe: boolean, color: string, dark: string): void {
    const ctx = this.ctx;
    const skin = this.getActiveMalletSkin(isMe);
    const light = isLightSurface(this.getActiveTableSkin().surface);
    const mr = this.getMalletRadius(isMe);
    const frozen = isMe ? this.powerupEffects.freezeP : this.powerupEffects.freezeA;
    const glow = skin.glow && this.effectiveQuality() === 'high' && !this.isReducedMotion();

    if (this.effectiveQuality() !== 'low') {
      ctx.fillStyle = light ? skin.shadow : 'rgba(0, 0, 0, 0.42)';
      this.circle(m.x + 3, m.y + 7, mr);
    }

    ctx.save();
    if (glow) { ctx.shadowColor = skin.glow as string; ctx.shadowBlur = 14; }
    const malletDesign =
      skin.design && hasMalletDesign(skin.design)
        ? skin.design
        : hasMalletDesign(skin.id)
          ? skin.id
          : undefined;
    if (malletDesign) {
      drawMalletDesign(ctx, malletDesign, m.x, m.y, mr, {
        body: skin.body ?? color, ring: skin.ring, accent: skin.accent ?? skin.ring, accent2: skin.accent2,
      }, color);
      ctx.restore();
    } else {
      ctx.fillStyle = color;
      this.circle(m.x, m.y, mr);
      ctx.restore();
      if (skin.pattern) {
        ctx.save();
        ctx.translate(m.x, m.y);
        drawMalletPattern(ctx, skin.pattern, skin.accent ?? skin.ring, mr);
        ctx.restore();
      }
      this.ring(m.x, m.y, mr - 0.75, light ? 'rgba(16, 25, 34, 0.28)' : 'rgba(255, 255, 255, 0.24)', 1.5);
      this.ring(m.x, m.y, mr * 0.74, frozen ? '#38bdf8' : skin.ring, 3);
      ctx.fillStyle = dark;
      this.circle(m.x, m.y, mr * 0.44);
      ctx.fillStyle = skin.gloss;
      this.circle(m.x - 5, m.y - 6, mr * 0.14);
    }
    if (frozen) this.ring(m.x, m.y, mr + 5, 'rgba(56, 189, 248, 0.85)', 3);
  }

  private drawPuck(p: PuckState): void {
    const ctx = this.ctx;
    const skin = this.getActivePuckSkin();
    const light = isLightSurface(this.getActiveTableSkin().surface);
    const tier = this.effectiveQuality();
    const rot = this.isReducedMotion() ? 0 : p.spinAngle;

    ctx.save();
    if (skin.glow && tier === 'high' && !this.isReducedMotion()) { ctx.shadowColor = skin.glow; ctx.shadowBlur = 14; }
    if (tier !== 'low') {
      ctx.fillStyle = light ? 'rgba(16, 25, 34, 0.28)' : 'rgba(0, 0, 0, 0.45)';
      this.circle(p.x + 2, p.y + 5, PR);
    }
    ctx.fillStyle = skin.body;
    this.circle(p.x, p.y, PR);
    ctx.restore();

    const designId =
      skin.emblem && hasPuckDesign(skin.emblem)
        ? skin.emblem
        : hasPuckDesign(skin.id)
          ? skin.id
          : undefined;
    if (designId) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(rot);
      drawPuckDesign(ctx, designId, 0, 0, PR, {
        body: skin.body, ring: skin.ring, accent: skin.accent ?? skin.ring, accent2: skin.accent2,
      });
      ctx.restore();
    } else {
      this.ring(p.x, p.y, PR - 0.7, light ? 'rgba(16, 25, 34, 0.34)' : 'rgba(255, 255, 255, 0.26)', 1.4);
      this.ring(p.x, p.y, PR - 5, skin.ring, 2);
      if (skin.emblem) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(rot);
        drawPuckEmblem(ctx, skin.emblem, skin.ring, skin.body);
        ctx.restore();
      }
    }

    // Curve-spin rim arcs
    if (Math.abs(p.spin) > 0.25 && !this.isReducedMotion()) {
      ctx.save();
      ctx.globalAlpha = 0.55 * clamp((Math.abs(p.spin) - 0.25) / 0.75, 0.2, 1);
      ctx.strokeStyle = skin.ring;
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      for (const off of [0, Math.PI]) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, PR + 3.5, p.spinAngle + off, p.spinAngle + off + Math.PI * 0.55);
        ctx.stroke();
      }
      ctx.restore();
    }
    ctx.fillStyle = skin.gloss;
    this.circle(p.x - 6, p.y - 7, 3.5);
  }

  private drawPowerupField(ctx: CanvasRenderingContext2D): void {
    const fx = this.powerupEffects;
    ctx.fillStyle = 'rgba(96, 165, 250, 0.16)';
    if (fx.slowZoneP) ctx.fillRect(0, 0, W, this.H * 0.5);
    if (fx.slowZoneA) ctx.fillRect(0, this.H * 0.5, W, this.H * 0.5);
    ctx.lineWidth = 4;
    if (fx.goalShieldA || fx.wideGoalP) {
      const m = this.goalMouth(true);
      ctx.strokeStyle = fx.goalShieldA ? '#22d3ee' : '#f472b6';
      ctx.strokeRect(m.x1, 0, m.x2 - m.x1, WALL + 6);
    }
    if (fx.goalShieldP || fx.wideGoalA) {
      const m = this.goalMouth(false);
      ctx.strokeStyle = fx.goalShieldP ? '#22d3ee' : '#f472b6';
      ctx.strokeRect(m.x1, this.H - WALL - 6, m.x2 - m.x1, WALL + 6);
    }
    if (fx.portalsP || fx.portalsA) {
      for (const pt of this.portalPositions()) this.ring(pt.x, pt.y, 22, '#34d399', 3);
    }
  }

  private drawPowerupBubble(tp: TablePowerup): void {
    const ctx = this.ctx;
    const def = POWERUPS[tp.id];
    const r = POWERUP_RADIUS * (this.isReducedMotion() ? 1 : 1 + Math.sin(tp.age * 5) * 0.08);
    ctx.save();
    ctx.fillStyle = 'rgba(16, 25, 34, 0.78)';
    this.circle(tp.x, tp.y, r);
    this.ring(tp.x, tp.y, r, def.color, 3);
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
    ctx.beginPath(); // despawn countdown arc
    ctx.arc(tp.x, tp.y, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(tp.ttl / 6, 0, 1));
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `800 10px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.shortLabel, tp.x, tp.y + 0.5);
    ctx.restore();
  }

  private drawActiveEffectsIndicators(): void {
    const ctx = this.ctx;
    let pOff = 0;
    let aOff = 0;
    for (const eff of this.activePowerups) {
      const def = POWERUPS[eff.id];
      const isP = eff.collector === 'p';
      const y = isP ? this.H - 28 - pOff++ * 26 : 28 + aOff++ * 26;
      const x = W - 20;
      ctx.save();
      ctx.fillStyle = 'rgba(16, 25, 34, 0.78)';
      ctx.beginPath();
      this.rr(ctx, x - 64, y - 10, 64, 20, 6);
      ctx.fill();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = `800 10px ${FONT_FAMILY}`;
      ctx.textBaseline = 'middle';
      ctx.fillStyle = def.color;
      ctx.textAlign = 'left';
      ctx.fillText(def.shortLabel, x - 57, y + 0.5);
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.ceil(eff.remaining)}s`, x - 7, y + 0.5);
      ctx.restore();
    }
  }

  /** Trail style string is cached per skin colour to avoid per-frame string allocation. */
  private trailStyle(rgb: string): string {
    if (rgb !== this.trailRgbKey) {
      this.trailRgbKey = rgb;
      this.trailStyleStr = `rgb(${rgb})`;
    }
    return this.trailStyleStr;
  }

  private draw(): void {
    const ctx = this.ctx;
    const skin = this.getActiveTableSkin();
    const puckSkin = this.getActivePuckSkin();
    const p1 = this.getActiveMalletSkin(true);
    const p2 = this.getActiveMalletSkin(false);
    const tier = this.effectiveQuality();
    const hasOpponent = this.tutorialStep === 0 && (this.screen === 'home' || MODES[this.modeId].opponent);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = OUTER_BG;
    ctx.fillRect(0, 0, this.cw, this.ch);
    if (!this.bg || !this.clipPath) return;

    const amp = this.shakeT > 0 ? Math.min(7, (this.shakeT / 0.28) * 7) : 0;
    ctx.save();
    ctx.translate(this.offX + (amp ? (Math.random() * 2 - 1) * amp : 0), this.offY + (amp ? (Math.random() * 2 - 1) * amp : 0));
    ctx.scale(this.scale, this.scale);

    if (this.cameraZoom > 1.001) { // slow-mo zoom toward scored goal
      const fy = this.H * this.cameraFocusY;
      ctx.translate(W / 2, fy);
      ctx.scale(this.cameraZoom, this.cameraZoom);
      ctx.translate(-W / 2, -fy);
    }

    ctx.clip(this.clipPath);
    ctx.drawImage(this.bg, 0, 0, W, this.H);
    this.drawPowerupField(ctx);

    // On-ice score numerals (hidden on home, practice, tutorial)
    if (this.screen !== 'home' && this.tutorialStep === 0 && MODES[this.modeId].winCondition !== 'practice') {
      ctx.font = `800 76px ${FONT_FAMILY}`;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillStyle = skin.p2Score;
      ctx.fillText(String(this.score.a), 48, this.H / 2 - 20);
      ctx.fillStyle = skin.p1Score;
      ctx.fillText(String(this.score.p), 48, this.H / 2 + 78);
    }

    if (this.tablePowerup && this.screen === 'game' && this.tutorialStep === 0) this.drawPowerupBubble(this.tablePowerup);
    if (this.screen === 'game' && this.tutorialStep > 0) this.drawTutorialGuides(ctx);

    for (const rp of this.ripples) {
      if (!rp.active) continue;
      ctx.globalAlpha = clamp(rp.alpha, 0, 1);
      this.ring(rp.x, rp.y, rp.r, rp.color, 3);
    }
    if (this.impactFlash.active) {
      ctx.globalAlpha = clamp(this.impactFlash.alpha, 0, 1);
      this.ring(this.impactFlash.x, this.impactFlash.y, this.impactFlash.r, '#ffffff', 4);
    }
    for (const pt of this.particles) {
      if (!pt.active) continue;
      ctx.globalAlpha = clamp(pt.alpha, 0, 1);
      ctx.fillStyle = pt.color;
      this.circle(pt.x, pt.y, pt.r);
    }
    ctx.globalAlpha = 1;

    // Pucks (+ trails: one fillStyle per puck, per-dot alpha via globalAlpha)
    const showTrail = this.settings.puckTrail && tier !== 'low' && (this.screen === 'game' || this.screen === 'home');
    for (const p of this.pucks) {
      if (!p.active) continue;
      const sp = Math.hypot(p.vx, p.vy);
      if (showTrail && sp > 250 && p.trail.length) {
        const curve = Math.abs(p.spin) > 0.25;
        const latX = -p.vy / sp;
        const latY = p.vx / sp;
        const base = clamp(sp / BASE_MAXV, 0, 1) * (curve ? 0.36 : 0.3);
        const n = p.trail.length;
        ctx.fillStyle = this.trailStyle(puckSkin.trailRgb);
        for (let j = 0; j < n; j++) {
          const f = j / n;
          const bow = curve ? (1 - f) * p.spin * 11 : 0;
          ctx.globalAlpha = f * base;
          this.circle(p.trail[j].x + latX * bow, p.trail[j].y + latY * bow, PR * (0.45 + 0.5 * f));
        }
        ctx.globalAlpha = 1;
      }
      this.drawPuck(p);
    }

    if (hasOpponent) this.drawMallet(this.ai, false, p2.p2, p2.p2dark);
    this.drawMallet(this.me, true, p1.p1, p1.p1dark);
    if (this.screen === 'game' && this.tutorialStep === 0) this.drawActiveEffectsIndicators();

    if (this.screen === 'game' && (this.phase === 'goal' || this.phase === 'slowmo')) {
      ctx.textAlign = 'center';
      ctx.font = `800 38px ${FONT_FAMILY}`;
      ctx.fillStyle = this.lastScorer === 'p' ? skin.p1Banner : skin.p2Banner;
      const two = this.opponentType === 'two';
      const who = two ? (this.lastScorer === 'p' ? 'Red scores' : 'Blue scores') : this.lastScorer === 'p' ? 'You scored' : 'Bot scored';
      ctx.fillText(who, W / 2, this.H / 2 + 14);
    }
    if (this.screen === 'game' && this.phase === 'ready') {
      ctx.textAlign = 'center';
      ctx.font = `800 116px ${FONT_FAMILY}`;
      ctx.fillStyle = skin.countdown;
      ctx.fillText(String(Math.max(1, Math.ceil(this.phaseT))), W / 2, this.H / 2 + 40);
    }
    ctx.restore();
  }

  /** Tutorial overlays. FIXME-HINT: step logic lives in collideMallet()/goal()/updateGame(). */
  private drawTutorialGuides(ctx: CanvasRenderingContext2D): void {
    const p0 = this.pucks[0];
    const pulse = this.isReducedMotion() ? 1 : 1 + Math.sin(this.tutorialAnimT * 4.5) * 0.14;

    if (this.tutorialStep === 1 && p0.active) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      this.ring(p0.x, p0.y, (PR + 12) * pulse, '#f0452d', 3);
      const t = (this.tutorialAnimT % 1.6) / 1.6;
      const ease = 0.5 - 0.5 * Math.cos(t * Math.PI * 2);
      ctx.globalAlpha = 0.38;
      ctx.strokeStyle = '#101922';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(W * 0.5, this.H * 0.78);
      ctx.lineTo(W * 0.5, this.H * 0.56);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.85; // ghost finger
      ctx.fillStyle = '#f0452d';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(W * 0.5 + (t - 0.5) * 26, this.H * 0.78 - ease * 88, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    } else if (this.tutorialStep === 2) {
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
      this.circle(bankX, bankY, 7 * pulse);
      ctx.restore();
    } else if (this.tutorialStep === 3 && p0.active) {
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.strokeStyle = '#0d9488';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p0.x, p0.y, PR + 18, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      ctx.fillStyle = '#0d9488';
      this.circle(p0.x + Math.sin(this.tutorialAnimT * 3.8) * 58, p0.y + 38, 10);
      ctx.restore();
    }
  }

  // ## INPUT ─────────────────────────────────────────────────────────────
  private getTouchOffset(): number {
    return this.settings.malletOffset === 'off' ? 0 : this.settings.malletOffset === 'large' ? 74 : 46;
  }

  /** Client coords -> table coords. Uses canvas rect so HUD/layout offsets don't shift the mallet. */
  private toTable(e: PointerEvent): { x: number; y: number } {
    const r = this.cv.getBoundingClientRect();
    return { x: (e.clientX - r.left - this.offX) / this.scale, y: (e.clientY - r.top - this.offY) / this.scale };
  }

  private setPointerTarget(e: PointerEvent, m: Mallet, dir: number, anchor: DragAnchor | null): void {
    const { x, y } = this.toTable(e);
    if (this.settings.malletControl === 'relative' && anchor) {
      m.tx = anchor.mx + (x - anchor.px);
      m.ty = anchor.my + (y - anchor.py);
      return;
    }
    m.tx = x;
    m.ty = y + (e.pointerType === 'touch' ? this.getTouchOffset() * dir : 0);
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.screen !== 'game') return;
    const { x, y } = this.toTable(e);
    const top = this.tutorialStep === 0 && this.opponentType === 'two' && MODES[this.modeId].opponent && y < this.H / 2;
    if (top) {
      if (this.pidA !== null) return;
      this.pidA = e.pointerId;
      this.anchorA = { px: x, py: y, mx: this.ai.x, my: this.ai.y };
    } else {
      if (this.pidP !== null) return;
      this.pidP = e.pointerId;
      this.anchorP = { px: x, py: y, mx: this.me.x, my: this.me.y };
    }
    try { this.cv.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    soundEngine.init();
    if (top) this.setPointerTarget(e, this.ai, 1, this.anchorA);
    else this.setPointerTarget(e, this.me, -1, this.anchorP);
  };

  private onPointerMove = (e: PointerEvent): void => {
    if (e.pointerId === this.pidP) this.setPointerTarget(e, this.me, -1, this.anchorP);
    else if (e.pointerId === this.pidA) this.setPointerTarget(e, this.ai, 1, this.anchorA);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (e.pointerId === this.pidP) { this.pidP = null; this.anchorP = null; }
    if (e.pointerId === this.pidA) { this.pidA = null; this.anchorA = null; }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if ((e.code === 'Escape' || e.code === 'KeyP') && this.screen === 'game') {
      this.callbacks.onAutoPause();
      return;
    }
    this.keys.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent): void => { this.keys.delete(e.code); };
  private onVisibilityChange = (): void => { if (document.hidden && this.screen === 'game') this.callbacks.onAutoPause(); };
  private onBlur = (): void => { if (this.screen === 'game') this.callbacks.onAutoPause(); };
  private onOrientationChange = (): void => {
    if (this.resizeTimer !== null) window.clearTimeout(this.resizeTimer);
    this.resizeTimer = window.setTimeout(this.scheduleResize, 120);
  };
  private preventDefault = (e: Event): void => { e.preventDefault(); };

  private bindEvents(): void {
    const cv = this.cv;
    cv.addEventListener('pointerdown', this.onPointerDown);
    cv.addEventListener('pointermove', this.onPointerMove);
    cv.addEventListener('pointerup', this.onPointerUp);
    cv.addEventListener('pointercancel', this.onPointerUp);
    cv.addEventListener('lostpointercapture', this.onPointerUp);
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
      this.resizeObserver.observe(cv.parentElement ?? cv);
    }
  }

  private unbindEvents(): void {
    const cv = this.cv;
    cv.removeEventListener('pointerdown', this.onPointerDown);
    cv.removeEventListener('pointermove', this.onPointerMove);
    cv.removeEventListener('pointerup', this.onPointerUp);
    cv.removeEventListener('pointercancel', this.onPointerUp);
    cv.removeEventListener('lostpointercapture', this.onPointerUp);
    document.removeEventListener('contextmenu', this.preventDefault);
    document.removeEventListener('gesturestart', this.preventDefault);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('resize', this.scheduleResize);
    window.removeEventListener('orientationchange', this.onOrientationChange);
    window.visualViewport?.removeEventListener('resize', this.scheduleResize);
    if (this.resizeObserver !== null) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}