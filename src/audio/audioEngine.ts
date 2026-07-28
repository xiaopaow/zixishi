import type { AmbienceKey, MusicType, SoundSettings } from '../types';

type GainMap = Record<AmbienceKey, GainNode>;

class QishiAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private ambienceMaster: GainNode | null = null;
  private channels: GainMap | null = null;
  private musicTimer: number | null = null;
  private birdTimer: number | null = null;
  private musicType: MusicType = 'none';
  private built = false;

  get state() {
    return this.context?.state ?? 'closed';
  }

  async start(settings: SoundSettings) {
    if (!this.context) {
      this.context = new AudioContext();
    }
    if (!this.built) this.buildGraph();
    await this.context.resume();
    this.apply(settings);
  }

  apply(settings: SoundSettings) {
    if (!this.context || !this.channels || !this.musicGain || !this.ambienceMaster) {
      return;
    }
    const now = this.context.currentTime;
    this.musicGain.gain.setTargetAtTime(settings.musicVolume, now, 0.12);
    this.ambienceMaster.gain.setTargetAtTime(settings.ambienceMaster, now, 0.12);
    (Object.keys(settings.ambience) as AmbienceKey[]).forEach((key) => {
      this.channels?.[key].gain.setTargetAtTime(settings.ambience[key], now, 0.15);
    });
    if (this.musicType !== settings.musicType) {
      this.musicType = settings.musicType;
      this.restartMusic();
    }
  }

  async resume(settings: SoundSettings) {
    await this.start(settings);
  }

  async fadeOut() {
    if (!this.context || !this.master) return;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(0.0001, this.context.currentTime, 0.18);
    await new Promise((resolve) => window.setTimeout(resolve, 650));
    await this.context.suspend();
  }

  async fadeIn(settings: SoundSettings) {
    await this.start(settings);
    if (this.context && this.master) {
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setValueAtTime(0.0001, this.context.currentTime);
      this.master.gain.setTargetAtTime(0.86, this.context.currentTime, 0.2);
    }
  }

  chime() {
    if (!this.context || !this.master || this.context.state !== 'running') return;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const start = this.context!.currentTime + index * 0.16;
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.1);
      oscillator.connect(gain).connect(this.master!);
      oscillator.start(start);
      oscillator.stop(start + 1.2);
    });
  }

  private buildGraph() {
    if (!this.context) return;
    this.master = this.context.createGain();
    this.musicGain = this.context.createGain();
    this.ambienceMaster = this.context.createGain();
    this.master.gain.value = 0.86;
    this.musicGain.gain.value = 0;
    this.ambienceMaster.gain.value = 0;
    this.musicGain.connect(this.master);
    this.ambienceMaster.connect(this.master);
    this.master.connect(this.context.destination);

    this.channels = {
      rain: this.createNoiseChannel('highpass', 1800, 0.62),
      wind: this.createNoiseChannel('bandpass', 420, 0.5),
      fire: this.createNoiseChannel('bandpass', 1250, 0.34),
      birds: this.context.createGain(),
      waves: this.createNoiseChannel('lowpass', 650, 0.7),
      city: this.context.createGain(),
    };
    this.channels.birds.connect(this.ambienceMaster);
    this.channels.city.connect(this.ambienceMaster);
    this.buildCityHum();
    this.buildWavePulse();
    this.scheduleBirds();
    this.built = true;
  }

  private createNoiseChannel(
    filterType: BiquadFilterType,
    frequency: number,
    playbackRate: number,
  ) {
    const context = this.context!;
    const frames = context.sampleRate * 3;
    const buffer = context.createBuffer(1, frames, context.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let index = 0; index < frames; index += 1) {
      const white = Math.random() * 2 - 1;
      last = last * 0.87 + white * 0.13;
      data[index] = filterType === 'lowpass' ? last : white * 0.72 + last * 0.28;
    }
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = true;
    source.playbackRate.value = playbackRate;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = filterType === 'bandpass' ? 0.75 : 0.25;
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(this.ambienceMaster!);
    source.start();
    return gain;
  }

  private buildCityHum() {
    const oscillator = this.context!.createOscillator();
    const harmonic = this.context!.createOscillator();
    const filter = this.context!.createBiquadFilter();
    oscillator.type = 'sine';
    harmonic.type = 'triangle';
    oscillator.frequency.value = 54;
    harmonic.frequency.value = 108;
    filter.type = 'lowpass';
    filter.frequency.value = 180;
    oscillator.connect(filter);
    harmonic.connect(filter);
    filter.connect(this.channels!.city);
    oscillator.start();
    harmonic.start();
  }

  private buildWavePulse() {
    const lfo = this.context!.createOscillator();
    const depth = this.context!.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.11;
    depth.gain.value = 0.22;
    lfo.connect(depth).connect(this.channels!.waves.gain);
    lfo.start();
  }

  private scheduleBirds() {
    const chirp = () => {
      if (!this.context || !this.channels) return;
      const start = this.context.currentTime + Math.random() * 0.7;
      for (let index = 0; index < 2; index += 1) {
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        const time = start + index * 0.11;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1750 + Math.random() * 500, time);
        oscillator.frequency.exponentialRampToValueAtTime(2450, time + 0.1);
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(0.1, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
        oscillator.connect(gain).connect(this.channels.birds);
        oscillator.start(time);
        oscillator.stop(time + 0.18);
      }
    };
    chirp();
    this.birdTimer = window.setInterval(chirp, 6500 + Math.random() * 2500);
  }

  private restartMusic() {
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    if (this.musicType === 'none' || !this.context || !this.musicGain) return;
    const type = this.musicType;
    const play = () => this.playPhrase(type);
    play();
    this.musicTimer = window.setInterval(play, this.musicType === 'piano' ? 4200 : 3200);
  }

  private playPhrase(type: Exclude<MusicType, 'none'>) {
    if (!this.context || !this.musicGain || this.context.state !== 'running') return;
    const pianoProgressions = [
      [261.63, 329.63, 392],
      [220, 261.63, 329.63],
      [196, 246.94, 293.66],
      [233.08, 293.66, 349.23],
    ];
    const lofiProgressions = [
      [130.81, 164.81, 196],
      [110, 130.81, 164.81],
      [98, 123.47, 146.83],
      [116.54, 146.83, 174.61],
    ];
    const progressions = type === 'piano' ? pianoProgressions : lofiProgressions;
    const chord = progressions[Math.floor(Date.now() / 4000) % progressions.length];
    chord.forEach((frequency, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      const filter = this.context!.createBiquadFilter();
      const start = this.context!.currentTime + index * (type === 'piano' ? 0.12 : 0.03);
      oscillator.type = type === 'piano' ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency * (type === 'piano' ? 2 : 1);
      filter.type = 'lowpass';
      filter.frequency.value = type === 'piano' ? 1800 : 720;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(type === 'piano' ? 0.13 : 0.07, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + (type === 'piano' ? 3.4 : 2.7));
      oscillator.connect(filter).connect(gain).connect(this.musicGain!);
      oscillator.start(start);
      oscillator.stop(start + 3.6);
    });
  }
}

export const audioEngine = new QishiAudioEngine();
