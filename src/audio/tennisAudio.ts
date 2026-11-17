class TennisAudio {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private volume: number = 0.7;

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initContext() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public playRacketHit(power: number = 1.0, isSmash: boolean = false) {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * (isSmash ? 0.9 : 0.7), now);
    masterGain.connect(this.ctx.destination);

    // 1. Initial transient pop (membrane hit)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    const startFreq = isSmash ? 380 : 310 * (0.9 + Math.random() * 0.2);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

    oscGain.gain.setValueAtTime(1.0 * power, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.1);

    // 2. High-frequency string resonance ("twang" / "ping")
    const stringOsc = this.ctx.createOscillator();
    const stringGain = this.ctx.createGain();
    stringOsc.type = 'sine';
    stringOsc.frequency.setValueAtTime(isSmash ? 1200 : 950, now);
    stringOsc.frequency.exponentialRampToValueAtTime(500, now + 0.12);

    stringGain.gain.setValueAtTime(0.4 * power, now);
    stringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    stringOsc.connect(stringGain);
    stringGain.connect(masterGain);
    stringOsc.start(now);
    stringOsc.stop(now + 0.13);

    // 3. Noise burst for felt/gut impact
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = isSmash ? 2400 : 1800;
    filter.Q.value = 2.0;

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5 * power, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start(now);
    noise.stop(now + 0.06);
  }

  public playBallBounce(velocity: number = 1.0) {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const speedFactor = Math.min(1.2, Math.max(0.4, velocity));
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.6 * speedFactor, now);
    masterGain.connect(this.ctx.destination);

    // Hollow dull "thump"
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.06);

    oscGain.gain.setValueAtTime(0.8, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playNetHit() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume * 0.5, now);
    masterGain.connect(this.ctx.destination);

    // Low cord wobble
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(90, now + 0.15);

    oscGain.gain.setValueAtTime(0.6, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playCrowdCheer(intensity: number = 1.0) {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 1.8;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.linearRampToValueAtTime(1100, now + duration * 0.4);
    filter.frequency.linearRampToValueAtTime(500, now + duration);
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.45 * intensity, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  public playCrowdGasp() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const duration = 0.5;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(400, now);
    filter.frequency.linearRampToValueAtTime(800, now + 0.25);
    filter.Q.value = 1.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.3, now + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  public playWhistle() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2600, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2640, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.25, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  }

  public playFaultBuzzer() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);

    gain.gain.setValueAtTime(this.volume * 0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public playScoreChime() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.07;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(this.volume * 0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    });
  }

  public playServeWhoosh() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(450, now + 0.15);

    gain.gain.setValueAtTime(this.volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playSmashHit() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    this.playRacketHit(1.3, true);

    // Extra deep cannon boom
    const now = this.ctx.currentTime;
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(140, now);
    subOsc.frequency.exponentialRampToValueAtTime(35, now + 0.18);

    subGain.gain.setValueAtTime(this.volume * 0.8, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);

    subOsc.connect(subGain);
    subGain.connect(this.ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.2);
  }

  public playSliceHit() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.09);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2200, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(this.volume * 0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(now);
    noise.stop(now + 0.11);

    this.playRacketHit(0.65, false);
  }

  public playLineCall(isIn: boolean) {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';

    if (isIn) {
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.08);
    } else {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.setValueAtTime(340, now + 0.09);
    }

    gain.gain.setValueAtTime(this.volume * 0.22, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.24);
  }

  public playTrophyFanfare() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    const times = [0, 0.1, 0.2, 0.32, 0.52, 0.65];

    notes.forEach((freq, i) => {
      const start = this.ctx!.currentTime + times[i];
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);

      const dur = i === notes.length - 1 ? 0.65 : 0.18;
      gain.gain.setValueAtTime(this.volume * 0.28, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  }

  public playMenuClick() {
    if (this.muted) return;
    this.initContext();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(920, now + 0.04);

    gain.gain.setValueAtTime(this.volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const tennisAudio = new TennisAudio();

