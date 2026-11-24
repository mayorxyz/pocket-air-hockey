const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export type SfxKind = 'hit' | 'wall' | 'goal' | 'powerup' | 'unlock';

class SoundEngine {
  private ac: AudioContext | null = null;
  private sfxEnabled = true;
  private musicEnabled = false;
  private vibrationEnabled = true;
  private masterVolume = 0.8;
  private lastSnd = 0;
  private lastSndByKind: Record<SfxKind, number> = { hit: 0, wall: 0, goal: 0, powerup: 0, unlock: 0 };
  private comp: DynamicsCompressorNode | null = null;

  private musicTimer: number | null = null;
  private musicStep = 0;

  configure(opts: {
    sfxEnabled: boolean;
    musicEnabled: boolean;
    masterVolume: number;
    vibration: boolean;
  }): void {
    this.sfxEnabled = opts.sfxEnabled;
    this.vibrationEnabled = opts.vibration;
    this.masterVolume = clamp(opts.masterVolume / 100, 0, 1);

    const prevMusic = this.musicEnabled;
    this.musicEnabled = opts.musicEnabled;
    if (this.musicEnabled && !prevMusic) {
      this.startMusicLoop();
    } else if (!this.musicEnabled && prevMusic) {
      this.stopMusicLoop();
    }
  }

  init(): void {
    if (!this.ac && typeof window !== 'undefined') {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        try {
          this.ac = new Ctx();
        } catch {
          this.ac = null;
        }
      }
    }
    if (this.ac && this.ac.state === 'suspended') {
      this.ac.resume().catch(() => {});
    }
    if (this.musicEnabled && this.musicTimer === null) {
      this.startMusicLoop();
    }
  }

  beep(freq: number, duration: number, type: OscillatorType = 'sine', volume = 0.1): void {
    if (!this.sfxEnabled || !this.ac || this.ac.state !== 'running' || this.masterVolume <= 0) return;
    try {
      const t = this.ac.currentTime;
      const osc = this.ac.createOscillator();
      const gain = this.ac.createGain();
      const scaled = Math.max(0.0002, volume * this.masterVolume);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(scaled, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      osc.connect(gain);
      gain.connect(this.comp ?? this.ac.destination);
      osc.start(t);
      osc.stop(t + duration);
    } catch {
      // Ignore Web Audio scheduling errors
    }
  }

  play(
    kind: SfxKind,
    speed = 0,
    opts?: { maxV?: number; isMatchPoint?: boolean }
  ): void {
    if (this.ac && this.ac.state === 'suspended') {
      void this.ac.resume().catch(() => {});
    }
    const now = performance.now();
    const lastKind = this.lastSndByKind[kind] ?? 0;
    if (kind !== 'goal' && kind !== 'powerup' && kind !== 'unlock' && now - lastKind < 45) return;
    this.lastSndByKind[kind] = now;

    const maxV = opts?.maxV && opts.maxV > 0 ? opts.maxV : 1400;
    const impactSpeed = clamp(speed / maxV, 0, 1);

    if (kind === 'hit') {
      this.playHit(impactSpeed);
      this.vibrate(impactSpeed > 0.75 ? 20 : 8);
    } else if (kind === 'wall') {
      this.playWall(impactSpeed);
    } else if (kind === 'goal') {
      this.playGoal(Boolean(opts?.isMatchPoint));
      this.vibrate(40);
    } else if (kind === 'powerup') {
      this.beep(587.33, 0.09, 'triangle', 0.14);
      window.setTimeout(() => this.beep(880, 0.14, 'triangle', 0.14), 70);
      this.vibrate(14);
    } else if (kind === 'unlock') {
      this.beep(523.25, 0.1, 'sine', 0.15);
      window.setTimeout(() => this.beep(659.25, 0.1, 'sine', 0.15), 90);
      window.setTimeout(() => this.beep(783.99, 0.18, 'sine', 0.15), 180);
    }
  }

  vibratePulse(ms: number): void {
    this.vibrate(ms);
  }

  private playHit(impactSpeed: number): void {
    if (!this.sfxEnabled || !this.ac || this.ac.state !== 'running' || this.masterVolume <= 0) return;
    try {
      const t = this.ac.currentTime;
      const baseFreq = 160 + impactSpeed * (420 - 160);
      const cutoff = 500 + impactSpeed * (3200 - 500);
      const vol = clamp((0.06 + impactSpeed * 0.24) * this.masterVolume, 0.001, 0.55);

      const osc = this.ac.createOscillator();
      const filter = this.ac.createBiquadFilter();
      const gain = this.ac.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(85, baseFreq * 0.58), t + 0.085);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, t);
      filter.Q.setValueAtTime(1.8, t);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.095);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.comp ?? this.ac.destination);
      osc.start(t);
      osc.stop(t + 0.1);

      if (impactSpeed > 0.75) {
        const sub = this.ac.createOscillator();
        const subGain = this.ac.createGain();
        const subVol = clamp(0.24 * this.masterVolume, 0.001, 0.45);
        sub.type = 'sine';
        sub.frequency.setValueAtTime(90, t);
        sub.frequency.exponentialRampToValueAtTime(45, t + 0.06);
        subGain.gain.setValueAtTime(subVol, t);
        subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.068);
        sub.connect(subGain);
        subGain.connect(this.comp ?? this.ac.destination);
        sub.start(t);
        sub.stop(t + 0.072);
      }
    } catch {
      // Ignore Web Audio scheduling errors
    }
  }

  private playWall(impactSpeed: number): void {
    if (!this.sfxEnabled || !this.ac || this.ac.state !== 'running' || this.masterVolume <= 0) return;
    try {
      const t = this.ac.currentTime;
      const freq = 280 + impactSpeed * (680 - 280);
      const vol = clamp((0.025 + impactSpeed * 0.09) * this.masterVolume, 0.0005, 0.30);

      const osc = this.ac.createOscillator();
      const filter = this.ac.createBiquadFilter();
      const gain = this.ac.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.72, t + 0.05);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(freq * 1.15, t);
      filter.Q.setValueAtTime(2.5, t);

      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.055);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.comp ?? this.ac.destination);
      osc.start(t);
      osc.stop(t + 0.06);
    } catch {
      // Ignore Web Audio scheduling errors
    }
  }

  private playGoal(isMatchPoint: boolean): void {
    if (!this.sfxEnabled || !this.ac || this.ac.state !== 'running' || this.masterVolume <= 0) return;
    try {
      const t = this.ac.currentTime;
      const pitchMul = isMatchPoint ? 1.122 : 1.0;
      const chord = [261.63 * pitchMul, 329.63 * pitchMul, 392.0 * pitchMul, 523.25 * pitchMul];

      chord.forEach((freq, idx) => {
        if (!this.ac) return;
        const osc = this.ac.createOscillator();
        const gain = this.ac.createGain();
        const pan =
          typeof this.ac.createStereoPanner === 'function'
            ? this.ac.createStereoPanner()
            : null;
        const vol = clamp((idx === 0 ? 0.13 : 0.08) * this.masterVolume, 0.001, 0.35);

        osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
        const filter = this.ac.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, t);
        filter.frequency.exponentialRampToValueAtTime(isMatchPoint ? 2800 : 2100, t + 0.22);

        osc.frequency.setValueAtTime(freq * 0.96, t);
        osc.frequency.linearRampToValueAtTime(freq, t + 0.08);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.045);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.44);

        osc.connect(filter);
        filter.connect(gain);
        if (pan) {
          pan.pan.setValueAtTime((idx - 1.5) * 0.28, t);
          gain.connect(pan);
          pan.connect(this.comp ?? this.ac.destination);
        } else {
          gain.connect(this.comp ?? this.ac.destination);
        }
        osc.start(t);
        osc.stop(t + 0.46);
      });
    } catch {
      // Ignore Web Audio scheduling errors
    }
  }

  private startMusicLoop(): void {
    if (this.musicTimer !== null || typeof window === 'undefined') return;
    const notes = [130.81, 155.56, 196.0, 233.08, 261.63, 233.08, 196.0, 155.56];
    this.musicTimer = window.setInterval(() => {
      if (!this.musicEnabled || !this.ac || this.ac.state !== 'running' || this.masterVolume <= 0) {
        return;
      }
      try {
        const freq = notes[this.musicStep % notes.length];
        this.musicStep += 1;
        const t = this.ac.currentTime;
        const osc = this.ac.createOscillator();
        const gain = this.ac.createGain();
        const vol = 0.035 * this.masterVolume;
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.linearRampToValueAtTime(vol, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
        osc.connect(gain);
        gain.connect(this.comp ?? this.ac.destination);
        osc.start(t);
        osc.stop(t + 0.36);
      } catch {
        // Ignore scheduler errors
      }
    }, 360);
  }

  private stopMusicLoop(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private vibrate(ms: number): void {
    if (!this.vibrationEnabled) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(ms);
      } catch {
        // Ignore vibration restrictions
      }
    }
  }
}

export const soundEngine = new SoundEngine();








