const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export type SfxKind = 'hit' | 'wall' | 'goal' | 'powerup' | 'unlock';

const LOUDNESS = 2.2; // Tuned to prevent clipping with the new reverb
const MUSIC_LEVEL = 0.18;
const STEP = 60 / 126 / 4; // 16th note at 126 BPM
const ROOTS = [110, 87.31, 130.81, 98]; // Am F C G
const CHORDS = [
  [440, 523.25, 659.25],
  [349.23, 440, 523.25],
  [523.25, 659.25, 783.99],
  [392, 493.88, 587.33],
];

type Mode = [freq: number, decay: number, amp: number];

class SoundEngine {
  private ac: AudioContext | null = null;
  private sfxEnabled = true;
  private musicEnabled = false;
  private inMatch = false;
  private vibrationEnabled = true;
  private masterVolume = 0.8;
  private lastSndByKind: Record<SfxKind, number> = { hit: 0, wall: 0, goal: 0, powerup: 0, unlock: 0 };

  // Master Graph
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private volume: GainNode | null = null;
  private masterCompressor: DynamicsCompressorNode | null = null;
  private clip: WaveShaperNode | null = null;
  
  // Arena Reverb Graph
  private reverbInput: GainNode | null = null;
  private reverbOutput: GainNode | null = null;

  // Buffers
  private hitBuf: AudioBuffer | null = null;
  private wallBuf: AudioBuffer | null = null;
  private noiseBuf: AudioBuffer | null = null;
  
  // Slide Graph
  private slideGain: GainNode | null = null;
  private slideFilter: BiquadFilterNode | null = null;
  private slidePanner: StereoPannerNode | null = null;

  // Music State
  private musicTimer: number | null = null;
  private musicStep = 0;
  private nextNoteTime = 0;

  constructor() {
    if (typeof window === 'undefined') return;
    const unlock = () => this.init();
    ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'].forEach((e) =>
      window.addEventListener(e, unlock, { capture: true, passive: true })
    );
    document.addEventListener('visibilitychange', () => {
      if (!this.ac) return;
      if (document.hidden) void this.ac.suspend().catch(() => {});
      else void this.ac.resume().catch(() => {});
    });
  }

  configure(opts: {
    sfxEnabled: boolean;
    musicEnabled: boolean;
    masterVolume: number;
    vibration: boolean;
  }): void {
    this.sfxEnabled = opts.sfxEnabled;
    this.vibrationEnabled = opts.vibration;
    this.masterVolume = clamp(opts.masterVolume / 100, 0, 1);
    this.musicEnabled = opts.musicEnabled;
    if (this.volume) this.volume.gain.value = this.masterVolume;
    if (!this.sfxEnabled) this.slide(0);
    this.updateMusicState();
  }

  setInMatch(inMatch: boolean): void {
    this.inMatch = inMatch;
    this.updateMusicState();
  }

  private updateMusicState(): void {
    if (this.musicEnabled && !this.inMatch) this.startMusicLoop();
    else this.stopMusicLoop();
  }

  init(): void {
    if (!this.ac && typeof window !== 'undefined') {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) {
        try {
          this.ac = new Ctx({ latencyHint: 'interactive' });
          this.buildGraph(this.ac);
        } catch {
          this.ac = null;
        }
      }
    }
    if (this.ac && this.ac.state !== 'running' && !document.hidden) {
      this.ac.resume().catch(() => {});
    }
    this.updateMusicState();
  }

  private buildGraph(ac: AudioContext): void {
    // 1. Master Chain: Compressor -> Soft Clip -> Volume -> Speakers
    this.masterCompressor = ac.createDynamicsCompressor();
    this.masterCompressor.threshold.value = -16;
    this.masterCompressor.knee.value = 8;
    this.masterCompressor.ratio.value = 10;
    this.masterCompressor.attack.value = 0.003;
    this.masterCompressor.release.value = 0.15;

    this.clip = ac.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(1.8 * x) / Math.tanh(1.8); // Smooth analog-style saturation
    }
    this.clip.curve = curve;

    this.volume = ac.createGain();
    this.volume.gain.value = this.masterVolume;

    this.masterCompressor.connect(this.clip);
    this.clip.connect(this.volume);
    this.volume.connect(ac.destination);

    // 2. Buses
    this.sfxBus = ac.createGain();
    this.musicBus = ac.createGain();
    this.musicBus.gain.value = MUSIC_LEVEL;

    this.sfxBus.connect(this.masterCompressor);
    this.musicBus.connect(this.masterCompressor);

    // 3. Algorithmic Arena Reverb (Prime-number delays to avoid metallic ringing)
    this.reverbInput = ac.createGain();
    this.reverbOutput = ac.createGain();
    this.reverbOutput.gain.value = 0.22; // Wet mix level

    const delays = [0.023, 0.029, 0.037, 0.043, 0.053, 0.067];
    delays.forEach((time, i) => {
      const delay = ac.createDelay();
      delay.delayTime.value = time;
      
      const filter = ac.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2500 - i * 200; // Darkens high frequencies over time
      
      const feedback = ac.createGain();
      feedback.gain.value = 0.48; 
      
      this.reverbInput.connect(delay);
      delay.connect(filter);
      filter.connect(feedback);
      feedback.connect(delay);
      filter.connect(this.reverbOutput);
    });

    this.sfxBus.connect(this.reverbInput);
    this.musicBus.connect(this.reverbInput); // Subtle room feel for music
    this.reverbOutput.connect(this.masterCompressor);

    // 4. Physical Model Buffers (Restored from your original, highly-tuned design)
    this.hitBuf = this.render(ac, 0.12, [
      [430, 0.022, 0.5], [1180, 0.018, 1], [2250, 0.012, 0.8], [3900, 0.007, 0.5],
    ], 0.003, 1);
    
    this.wallBuf = this.render(ac, 0.14, [
      [340, 0.03, 0.8], [760, 0.024, 1], [1650, 0.012, 0.45],
    ], 0.004, 0.55);

    // Stereo noise buffer for wider, more realistic drums and slides
    this.noiseBuf = ac.createBuffer(2, ac.sampleRate * 2, ac.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = this.noiseBuf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }

    // 5. Continuous Slide Sound Setup
    const src = ac.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    
    this.slideFilter = ac.createBiquadFilter();
    this.slideFilter.type = 'bandpass';
    this.slideFilter.Q.value = 0.8;
    
    this.slidePanner = ac.createStereoPanner();
    
    this.slideGain = ac.createGain();
    this.slideGain.gain.value = 0;
    
    src.connect(this.slideFilter);
    this.slideFilter.connect(this.slidePanner);
    this.slidePanner.connect(this.slideGain);
    this.slideGain.connect(this.sfxBus);
    this.slideGain.connect(this.reverbInput);
    src.start();
  }

  private render(
    ac: AudioContext, length: number, modes: Mode[], clickDecay: number, clickAmp: number
  ): AudioBuffer {
    const rate = ac.sampleRate;
    const buf = ac.createBuffer(1, Math.floor(rate * length), rate);
    const d = buf.getChannelData(0);
    let peak = 0;
    for (let i = 0; i < d.length; i++) {
      const t = i / rate;
      let v = (Math.random() * 2 - 1) * clickAmp * Math.exp(-t / clickDecay);
      for (const [f, decay, amp] of modes) {
        v += Math.sin(2 * Math.PI * f * t) * amp * Math.exp(-t / decay);
      }
      d[i] = v;
      peak = Math.max(peak, Math.abs(v));
    }
    for (let i = 0; i < d.length; i++) d[i] /= peak || 1;
    return buf;
  }

  /** Fully backward compatible. Added optional xPos for spatial audio. */
  play(kind: SfxKind, speed = 0, opts?: { maxV?: number; isMatchPoint?: boolean; xPos?: number }): void {
    this.init();
    const now = performance.now();
    if ((kind === 'hit' || kind === 'wall') && now - this.lastSndByKind[kind] < 35) return;
    this.lastSndByKind[kind] = now;

    const maxV = opts?.maxV && opts.maxV > 0 ? opts.maxV : 1400;
    const power = clamp(speed / maxV, 0, 1);
    const xPos = opts?.xPos ?? 0;

    if (kind === 'hit') this.vibrate(power > 0.75 ? 25 : 10);
    if (kind === 'goal') this.vibrate(60);
    if (kind === 'powerup') this.vibrate(14);
    if (!this.ready()) return;
    
    const t = this.ac!.currentTime;

    if (kind === 'hit') {
      this.sample(this.hitBuf!, t, 0.55 + power * 0.65, 0.88 + power * 0.25, xPos);
    } else if (kind === 'wall') {
      this.sample(this.wallBuf!, t, 0.35 + power * 0.6, 0.85 + power * 0.25, xPos);
    } else if (kind === 'goal') {
      [0, 0.07, 0.125, 0.165].forEach((d, i) =>
        this.sample(this.wallBuf!, t + d, 0.9 - i * 0.18, 0.7 - i * 0.04, xPos)
      );
      const mul = opts?.isMatchPoint ? 1.122 : 1;
      [233, 294, 349, 466].forEach((f) =>
        this.tone(this.sfxBus!, t + 0.2, f * mul, 0.75, 'sawtooth', 0.22, true, xPos)
      );
    } else if (kind === 'powerup') {
      [587.33, 880, 1174.66].forEach((f, i) =>
        this.tone(this.sfxBus!, t + i * 0.06, f, 0.14, 'square', 0.2, false, xPos)
      );
    } else {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        this.tone(this.sfxBus!, t + i * 0.09, f, 0.22, 'triangle', 0.4, false, xPos)
      );
    }
  }

  slide(speed: number, maxV = 1400, xPos = 0): void {
    if (!this.ac || !this.slideGain || !this.slideFilter || !this.slidePanner) return;
    const p = this.sfxEnabled ? clamp(speed / maxV, 0, 1) : 0;
    const t = this.ac.currentTime;
    
    this.slidePanner.pan.setTargetAtTime(clamp(xPos, -1, 1), t, 0.05);
    this.slideGain.gain.cancelScheduledValues(t);
    this.slideGain.gain.setTargetAtTime(p * 0.18, t, 0.03);
    this.slideGain.gain.setTargetAtTime(0, t + 0.12, 0.05);
    
    this.slideFilter.frequency.setTargetAtTime(1200 + p * 4500, t, 0.05);
    this.slideFilter.Q.setTargetAtTime(0.5 + p * 1.5, t, 0.05);
  }

  private sample(buf: AudioBuffer, t: number, vol: number, rate: number, xPos = 0): void {
    const src = this.ac!.createBufferSource();
    const gain = this.ac!.createGain();
    const panner = this.ac!.createStereoPanner();
    
    src.buffer = buf;
    src.playbackRate.value = rate * (0.96 + Math.random() * 0.08); // Humanization
    panner.pan.value = clamp(xPos, -1, 1);
    gain.gain.value = vol;
    
    src.connect(panner);
    panner.connect(gain);
    gain.connect(this.sfxBus!);
    gain.connect(this.reverbInput!); // Send to arena reverb
    src.start(t);
  }

  private tone(
    out: AudioNode, t: number, freq: number, duration: number, type: OscillatorType,
    vol: number, sustain = false, xPos = 0
  ): void {
    const osc = this.ac!.createOscillator();
    const gain = this.ac!.createGain();
    const panner = this.ac!.createStereoPanner();
    
    osc.type = type;
    osc.frequency.value = freq;
    panner.pan.value = clamp(xPos, -1, 1);
    
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(Math.max(0.0002, vol), t + 0.008);
    if (sustain) gain.gain.setValueAtTime(vol, t + duration * 0.75);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    
    osc.connect(panner);
    panner.connect(gain);
    gain.connect(out);
    if (out === this.sfxBus) gain.connect(this.reverbInput!);
    
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  private scheduleStep(step: number, t: number): void {
    const bar = Math.floor(step / 16) % 4;
    const s = step % 16;
    const out = this.musicBus!;

    // 1. KICK (Punchy sine sweep + highpass noise click)
    if (s % 4 === 0) {
      const osc = this.ac!.createOscillator();
      const gain = this.ac!.createGain();
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      gain.gain.setValueAtTime(0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain); gain.connect(out);
      osc.start(t); osc.stop(t + 0.3);
      
      const src = this.ac!.createBufferSource(); src.buffer = this.noiseBuf!;
      const clickFilter = this.ac!.createBiquadFilter(); clickFilter.type = 'highpass'; clickFilter.frequency.value = 2000;
      const clickGain = this.ac!.createGain(); clickGain.gain.setValueAtTime(0.25, t); clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.02);
      src.connect(clickFilter); clickFilter.connect(clickGain); clickGain.connect(out);
      src.start(t, 0, 0.03);
    }

    // 2. SNARE (Layered bandpass noise + body tone)
    if (s === 4 || s === 12) {
      const src = this.ac!.createBufferSource(); src.buffer = this.noiseBuf!;
      const filter = this.ac!.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 2500; filter.Q.value = 0.8;
      const gain = this.ac!.createGain(); gain.gain.setValueAtTime(0.35, t); gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
      src.connect(filter); filter.connect(gain); gain.connect(out);
      src.start(t, Math.random() * 0.5, 0.15);
      
      const osc = this.ac!.createOscillator(); const oscGain = this.ac!.createGain();
      osc.frequency.value = 200; oscGain.gain.setValueAtTime(0.2, t); oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
      osc.connect(oscGain); oscGain.connect(out); osc.start(t); osc.stop(t + 0.1);
    }

    // 3. HI-HATS (Crisp highpass noise, open/closed dynamics)
    if (s % 2 === 0) {
      const src = this.ac!.createBufferSource(); src.buffer = this.noiseBuf!;
      const filter = this.ac!.createBiquadFilter(); filter.type = 'highpass'; filter.frequency.value = 7000;
      const gain = this.ac!.createGain();
      const isOpen = s % 4 === 2;
      gain.gain.setValueAtTime(isOpen ? 0.12 : 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + (isOpen ? 0.12 : 0.04));
      src.connect(filter); filter.connect(gain); gain.connect(out);
      src.start(t, Math.random() * 0.5, isOpen ? 0.12 : 0.04);
    }

    // 4. BASS (Warm filtered sawtooth)
    if (s % 4 === 2) {
      const osc = this.ac!.createOscillator(); const filter = this.ac!.createBiquadFilter(); const gain = this.ac!.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = ROOTS[bar];
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, t); filter.frequency.exponentialRampToValueAtTime(200, t + STEP * 1.8); filter.Q.value = 2;
      gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(0.3, t + 0.01); gain.gain.exponentialRampToValueAtTime(0.001, t + STEP * 1.8);
      osc.connect(filter); filter.connect(gain); gain.connect(out);
      osc.start(t); osc.stop(t + STEP * 2);
    }

    // 5. LUSH PAD CHORDS (Detuned supersaw with lowpass for a wide, cinematic feel)
    if ([0, 8].includes(s)) {
      const chord = CHORDS[bar];
      chord.forEach((f) => {
        for (let v = -1; v <= 1; v++) {
          const osc = this.ac!.createOscillator(); const gain = this.ac!.createGain();
          osc.type = 'sawtooth'; osc.frequency.value = f; osc.detune.value = v * 12;
          const filter = this.ac!.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 1200; filter.Q.value = 0.5;
          gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(0.05, t + 0.2);
          gain.gain.setValueAtTime(0.05, t + STEP * 6); gain.gain.exponentialRampToValueAtTime(0.001, t + STEP * 8);
          osc.connect(filter); filter.connect(gain); gain.connect(out);
          osc.start(t); osc.stop(t + STEP * 8 + 0.1);
        }
      });
    }
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null || !this.ac) return;
    this.nextNoteTime = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ac || this.ac.state !== 'running') return;
      const now = this.ac.currentTime;
      if (this.nextNoteTime < now) this.nextNoteTime = now + 0.05;
      while (this.nextNoteTime < now + 0.2) {
        this.scheduleStep(this.musicStep, this.nextNoteTime);
        this.musicStep += 1;
        this.nextNoteTime += STEP;
      }
    }, 50);
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private ready(): boolean {
    return Boolean(this.sfxEnabled && this.ac && this.ac.state === 'running');
  }

  private vibrate(ms: number): void {
    if (!this.vibrationEnabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try { navigator.vibrate(ms); } catch {}
    }
  }
}

export const soundEngine = new SoundEngine();